// Sculpting with signed distance fields. Parts are blended with smooth
// unions so a character is one continuous lump of clay, not primitives
// pushed together. The field is sampled on a grid and turned into a mesh
// with naive surface nets, then painted and skinned per vertex.
import * as THREE from 'three';

export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
export const smax = (a, b, k) => -smin(-a, -b, k);
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

// ------------------------------------------------------------------ shapes
// Every shape returns { d(x,y,z), box, t?(x,y,z) } in model space.
export function sphere(c, r) {
  return { d: (x, y, z) => Math.hypot(x - c[0], y - c[1], z - c[2]) - r, box: [c[0] - r, c[1] - r, c[2] - r, c[0] + r, c[1] + r, c[2] + r] };
}
export function ellipsoid(c, r) {
  const m = Math.min(r[0], r[1], r[2]);
  return {
    d: (x, y, z) => (Math.hypot((x - c[0]) / r[0], (y - c[1]) / r[1], (z - c[2]) / r[2]) - 1) * m,
    box: [c[0] - r[0], c[1] - r[1], c[2] - r[2], c[0] + r[0], c[1] + r[1], c[2] + r[2]],
  };
}
// Capsule with a radius that tapers from ra to rb; t() gives 0..1 along it.
export function cone(a, b, ra, rb) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const L2 = bx * bx + by * by + bz * bz || 1e-9;
  const t = (x, y, z) => clamp01(((x - a[0]) * bx + (y - a[1]) * by + (z - a[2]) * bz) / L2);
  const r = Math.max(ra, rb);
  return {
    t,
    d: (x, y, z) => {
      const k = t(x, y, z);
      return Math.hypot(x - a[0] - bx * k, y - a[1] - by * k, z - a[2] - bz * k) - (ra + (rb - ra) * k);
    },
    box: [Math.min(a[0], b[0]) - r, Math.min(a[1], b[1]) - r, Math.min(a[2], b[2]) - r, Math.max(a[0], b[0]) + r, Math.max(a[1], b[1]) + r, Math.max(a[2], b[2]) + r],
  };
}
// Ellipsoidal cross-section capsule (flattened along z by sz).
export function flatCone(a, b, ra, rb, sz) {
  const c = cone([a[0], a[1], a[2] / sz], [b[0], b[1], b[2] / sz], ra, rb);
  return { t: (x, y, z) => c.t(x, y, z / sz), d: (x, y, z) => c.d(x, y, z / sz) * Math.min(1, sz), box: [c.box[0], c.box[1], c.box[2] * sz, c.box[3], c.box[4], c.box[5] * sz] };
}
export function torus(c, R, r, sy = 1) {
  // Ring in the xz plane around c, squashed vertically by sy.
  return {
    d: (x, y, z) => { const q = Math.hypot(x - c[0], z - c[2]) - R; return Math.hypot(q, (y - c[1]) / sy) - r; },
    box: [c[0] - R - r, c[1] - r * sy, c[2] - R - r, c[0] + R + r, c[1] + r * sy, c[2] + R + r],
  };
}
// A chain of tapered capsules through points: rolls of clay (brows, strands).
export function chain(pts, r0, r1) {
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const k0 = i / (pts.length - 1), k1 = (i + 1) / (pts.length - 1);
    segs.push(cone(pts[i], pts[i + 1], r0 + (r1 - r0) * k0, r0 + (r1 - r0) * k1));
  }
  const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const s of segs) for (let i = 0; i < 3; i++) { box[i] = Math.min(box[i], s.box[i]); box[i + 3] = Math.max(box[i + 3], s.box[i + 3]); }
  return { d: (x, y, z) => { let m = Infinity; for (const s of segs) m = Math.min(m, s.d(x, y, z)); return m; }, box };
}

// ------------------------------------------------------------------ sculpt
export class Sculpt {
  constructor() { this.parts = []; this.cuts = []; }
  // opts: k (blend radius), color (hex or fn(x,y,z,t)), bones (name or fn(t) -> [[name, w]]), ck (color edge softness)
  add(shape, opts = {}) { this.parts.push({ ...shape, k: opts.k ?? 0.02, color: opts.color ?? '#ffffff', bones: opts.bones, wk: opts.wk, coarse: opts.coarse ?? shape.coarse }); return this; }
  cut(shape, opts = {}) { this.cuts.push({ ...shape, k: opts.k ?? 0.01 }); return this; }

  // Sample, polygonize, then paint/weight each vertex.
  build(bounds, h, opts = {}) {
    const [x0, y0, z0, x1, y1, z1] = bounds;
    const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1;
    const f = new Float32Array(nx * ny * nz).fill(1e3);
    const B = 4; // coarse block size in voxels
    const fill = (p, op) => {
      const m = p.k + h * 2;
      const ix0 = Math.max(0, Math.floor((p.box[0] - m - x0) / h)), ix1 = Math.min(nx - 1, Math.ceil((p.box[3] + m - x0) / h));
      const iy0 = Math.max(0, Math.floor((p.box[1] - m - y0) / h)), iy1 = Math.min(ny - 1, Math.ceil((p.box[4] + m - y0) / h));
      const iz0 = Math.max(0, Math.floor((p.box[2] - m - z0) / h)), iz1 = Math.min(nz - 1, Math.ceil((p.box[5] + m - z0) / h));
      const at = (i, j, k) => p.d(x0 + i * h, y0 + j * h, z0 + k * h);
      if (!p.coarse) {
        for (let k = iz0; k <= iz1; k++) for (let j = iy0; j <= iy1; j++) {
          const r = k * nx * ny + j * nx;
          for (let i = ix0; i <= ix1; i++) f[r + i] = op(f[r + i], at(i, j, k), p.k);
        }
        return;
      }
      // Big smooth fields: sample a coarse lattice, evaluate voxel by voxel
      // only in blocks near the surface, and interpolate the rest.
      const far = B * h * 1.8 + p.k;
      const cx = Math.ceil((ix1 - ix0) / B) + 1, cy = Math.ceil((iy1 - iy0) / B) + 1, cz = Math.ceil((iz1 - iz0) / B) + 1;
      const cd = new Float32Array(cx * cy * cz);
      for (let c = 0; c < cz; c++) for (let b = 0; b < cy; b++) for (let a = 0; a < cx; a++) cd[a + b * cx + c * cx * cy] = at(ix0 + a * B, iy0 + b * B, iz0 + c * B);
      for (let c = 0; c < cz - 1; c++) for (let b = 0; b < cy - 1; b++) for (let a = 0; a < cx - 1; a++) {
        const q = a + b * cx + c * cx * cy, X = cx, XY = cx * cy;
        const v = [cd[q], cd[q + 1], cd[q + X], cd[q + X + 1], cd[q + XY], cd[q + XY + 1], cd[q + XY + X], cd[q + XY + X + 1]];
        let mn = Infinity, mx = -Infinity;
        for (const w of v) { if (w < mn) mn = w; if (w > mx) mx = w; }
        const exact = !(mn > far || mx < -far);
        const bi = ix0 + a * B, bj = iy0 + b * B, bk = iz0 + c * B;
        for (let kk = 0; kk <= B; kk++) {
          const k = bk + kk; if (k > iz1) break;
          const tz = kk / B;
          for (let jj = 0; jj <= B; jj++) {
            const j = bj + jj; if (j > iy1) break;
            const ty = jj / B, r = k * nx * ny + j * nx;
            for (let ii = 0; ii <= B; ii++) {
              const i = bi + ii; if (i > ix1) break;
              let d;
              if (exact) d = at(i, j, k);
              else {
                const tx = ii / B;
                const x00 = v[0] + (v[1] - v[0]) * tx, x10 = v[2] + (v[3] - v[2]) * tx, x01 = v[4] + (v[5] - v[4]) * tx, x11 = v[6] + (v[7] - v[6]) * tx;
                const y0_ = x00 + (x10 - x00) * ty, y1_ = x01 + (x11 - x01) * ty;
                d = y0_ + (y1_ - y0_) * tz;
              }
              f[r + i] = op(f[r + i], d, p.k);
            }
          }
        }
      }
    };
    // Shared block faces get filled twice; smin with itself is harmless for
    // interpolated values and exact for evaluated ones, so pre-fill a copy.
    const parts = this.parts;
    for (const p of parts) {
      if (!p.coarse) { fill(p, smin); continue; }
      const prev = f.slice();
      fill(p, (a, d) => d);
      for (let q = 0; q < f.length; q++) if (f[q] !== prev[q]) f[q] = smin(prev[q], f[q], p.k);
    }
    for (const c of this.cuts) fill(c, (a, d, k) => smax(a, -d, k));
    const geo = surfaceNets(f, nx, ny, nz, [x0, y0, z0], h);
    this.paint(geo, opts);
    return geo;
  }

  paint(geo, opts) {
    const p = geo.attributes.position, n = p.count;
    const col = new Float32Array(n * 3);
    const wantSkin = opts.skin;
    const si = wantSkin ? new Uint16Array(n * 4) : null, sw = wantSkin ? new Float32Array(n * 4) : null;
    const c = new THREE.Color(), acc = new THREE.Color();
    const ds = new Float32Array(this.parts.length);
    const ck = opts.colorK ?? 0.004, wk = opts.weightK ?? 0.02;
    const colCache = new Map();
    const toColor = (v) => { let o = colCache.get(v); if (!o) { o = new THREE.Color(v); colCache.set(v, o); } return o; };
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      let dmin = Infinity;
      for (let j = 0; j < this.parts.length; j++) {
        const pr = this.parts[j], b = pr.box, m = 0.06;
        if (x < b[0] - m || y < b[1] - m || z < b[2] - m || x > b[3] + m || y > b[4] + m || z > b[5] + m) { ds[j] = Infinity; continue; }
        ds[j] = pr.d(x, y, z);
        if (ds[j] < dmin) dmin = ds[j];
      }
      acc.setRGB(0, 0, 0);
      let wsum = 0;
      const bw = wantSkin ? new Map() : null;
      let bsum = 0;
      for (let j = 0; j < this.parts.length; j++) {
        const d = ds[j];
        if (d === Infinity) continue;
        const pr = this.parts[j];
        const w = Math.exp(-(d - dmin) / ck);
        if (w > 1e-3) {
          const cv = typeof pr.color === 'function' ? pr.color(x, y, z, pr.t ? pr.t(x, y, z) : 0) : pr.color;
          c.copy(cv.isColor ? cv : toColor(cv));
          acc.r += c.r * w; acc.g += c.g * w; acc.b += c.b * w;
          wsum += w;
        }
        if (wantSkin && pr.bones) {
          const ww = Math.exp(-(d - dmin) / (pr.wk ?? wk));
          if (ww > 1e-3) {
            const list = typeof pr.bones === 'string' ? [[pr.bones, 1]] : pr.bones(pr.t ? pr.t(x, y, z) : 0, x, y, z);
            for (const [name, v] of list) { bw.set(name, (bw.get(name) || 0) + v * ww); bsum += v * ww; }
          }
        }
      }
      col[i * 3] = acc.r / wsum; col[i * 3 + 1] = acc.g / wsum; col[i * 3 + 2] = acc.b / wsum;
      if (wantSkin) {
        const top = [...bw.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
        const s = top.reduce((a, e) => a + e[1], 0) || 1;
        top.forEach(([name, v], k) => { si[i * 4 + k] = opts.boneIndex[name] ?? 0; sw[i * 4 + k] = v / s; });
      }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (wantSkin) {
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
      geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    }
  }
}

// Segment weights for a part spanning parent -> bone -> child: the bone owns
// the middle, the ends blend into the neighbours.
export function segBones(parent, bone, child, a = 0.18, b = 0.18) {
  return (t) => {
    const out = [];
    let wb = 1;
    if (parent && t < a) { const k = 0.5 + 0.5 * (t / a); out.push([parent, 1 - k]); wb = k; }
    if (child && t > 1 - b) { const k = 0.5 * ((t - (1 - b)) / b); out.push([child, k]); wb = Math.min(wb, 1 - k); }
    out.push([bone, wb]);
    return out;
  };
}

// ------------------------------------------------------------------ meshing
// Naive surface nets: one vertex per surface cell at the average edge
// crossing, one quad per sign-changing grid edge. Indexed and smooth.
function surfaceNets(f, nx, ny, nz, o, h) {
  const sx = 1, sy = nx, sz = nx * ny;
  const vid = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const corner = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const v = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const q = i + j * sy + k * sz;
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      const cc = corner[c];
      v[c] = f[q + cc[0] * sx + cc[1] * sy + cc[2] * sz];
      if (v[c] < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let ax = 0, ay = 0, az = 0, cnt = 0;
    for (const [a, b] of edges) {
      const va = v[a], vb = v[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      const A = corner[a], B = corner[b];
      ax += A[0] + (B[0] - A[0]) * t; ay += A[1] + (B[1] - A[1]) * t; az += A[2] + (B[2] - A[2]) * t;
      cnt++;
    }
    vid[q] = pos.length / 3;
    pos.push(o[0] + (i + ax / cnt) * h, o[1] + (j + ay / cnt) * h, o[2] + (k + az / cnt) * h);
  }
  const idx = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, d, c, a, c, b); else idx.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const q = i + j * sy + k * sz;
    const inside = f[q] < 0;
    if ((f[q + sx] < 0) !== inside) quad(vid[q], vid[q - sy], vid[q - sy - sz], vid[q - sz], !inside);
    if ((f[q + sy] < 0) !== inside) quad(vid[q], vid[q - sz], vid[q - sx - sz], vid[q - sx], !inside);
    if ((f[q + sz] < 0) !== inside) quad(vid[q], vid[q - sx], vid[q - sx - sy], vid[q - sy], !inside);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Cylindrical UVs so the fingerprint normal map has somewhere to land.
  const uv = new Float32Array((pos.length / 3) * 2);
  for (let i = 0; i < pos.length / 3; i++) {
    uv[i * 2] = (Math.atan2(pos[i * 3], pos[i * 3 + 2]) / (Math.PI * 2) + 0.5) * 3;
    uv[i * 2 + 1] = pos[i * 3 + 1] * 3;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
