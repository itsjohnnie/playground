// The plasticine look: one procedural normal map (fingerprints, tool marks,
// lumps), a standard material with a warm "subsurface" rim, lumpy geometry,
// and the per-frame "boil" jitter that sells hand animation.
import * as THREE from 'three';
import { noise3, mulberry32 } from './util.js';

let normalTex = null;

function buildHeightField(size) {
  const h = new Float32Array(size * size);
  const rnd = mulberry32(1234);
  // Soft lumps.
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      h[y * size + x] =
        noise3(u * 8, v * 8, 0.5, 7) * 0.5 +
        noise3(u * 22, v * 22, 1.5, 9) * 0.25 +
        noise3(u * 60, v * 60, 2.5, 3) * 0.08;
    }
  const add = (x, y, val) => {
    x = ((x % size) + size) % size;
    y = ((y % size) + size) % size;
    h[(y | 0) * size + (x | 0)] += val;
  };
  // Fingerprints: patches of concentric ridges.
  for (let f = 0; f < 26; f++) {
    const cx = rnd() * size, cy = rnd() * size;
    const r = 18 + rnd() * 26, sx = 0.7 + rnd() * 0.5, rot = rnd() * Math.PI;
    const c = Math.cos(rot), s = Math.sin(rot);
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const lx = (x * c - y * s) / sx, ly = x * s + y * c;
        const d = Math.sqrt(lx * lx + ly * ly * 1.3);
        if (d > r) continue;
        const fall = 1 - d / r;
        add(cx + x, cy + y, Math.sin(d * 1.15) * 0.09 * fall * fall);
      }
  }
  // Tool marks: short smeared strokes.
  for (let t = 0; t < 70; t++) {
    let x = rnd() * size, y = rnd() * size;
    const a = rnd() * Math.PI * 2, len = 10 + rnd() * 40, w = 1.5 + rnd() * 3;
    const dx = Math.cos(a), dy = Math.sin(a);
    for (let i = 0; i < len; i++) {
      for (let k = -w; k <= w; k++) add(x - dy * k, y + dx * k, -0.07 * (1 - Math.abs(k) / (w + 1)));
      x += dx; y += dy;
    }
  }
  return h;
}

export function clayNormalMap() {
  if (normalTex) return normalTex;
  const size = 256;
  const h = buildHeightField(size);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const at = (x, y) => h[((y + size) % size) * size + ((x + size) % size)];
  const strength = 3.2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  normalTex = new THREE.CanvasTexture(canvas);
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.repeat.set(2, 2);
  normalTex.colorSpace = THREE.NoColorSpace;
  return normalTex;
}

const matCache = new Map();

// Warm rim term injected into the standard shader to fake subsurface light.
function addRim(mat, rimStrength) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.rimStrength = { value: rimStrength };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float rimStrength;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float rimF = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        totalEmissiveRadiance += diffuseColor.rgb * vec3(1.0, 0.62, 0.48) * pow(rimF, 2.4) * rimStrength;`
      );
  };
  mat.customProgramCacheKey = () => 'clayrim' + rimStrength;
}

export function clayMat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (matCache.has(key)) return matCache.get(key);
  const Mat = opts.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const mat = new Mat({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.74,
    metalness: opts.metalness ?? 0,
    normalMap: opts.smooth ? null : clayNormalMap(),
    normalScale: new THREE.Vector2(opts.bumps ?? 0.45, opts.bumps ?? 0.45),
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    vertexColors: !!opts.vertexColors,
    side: opts.side ?? THREE.FrontSide,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
  });
  if (opts.physical) {
    // Satin clay: a soft velvety sheen and a whisper of clearcoat.
    mat.sheen = opts.sheen ?? 0.6;
    mat.sheenRoughness = 0.55;
    mat.sheenColor = new THREE.Color('#ffd9c4');
    mat.clearcoat = opts.clearcoat ?? 0.08;
    mat.clearcoatRoughness = 0.45;
  }
  if (!opts.noRim) addRim(mat, opts.rim ?? 0.35);
  matCache.set(key, mat);
  return mat;
}

// Push vertices along their normals by noise so primitives look hand-rolled.
export function lumpy(geo, amount = 0.02, freq = 3, seed = 1) {
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = noise3(x * freq + 10, y * freq + 20, z * freq + 30, seed) * amount;
    pos.setXYZ(i, x + nor.getX(i) * n, y + nor.getY(i) * n, z + nor.getZ(i) * n);
  }
  geo.computeVertexNormals();
  return geo;
}

let seedCounter = 1;
export function sphere(r, color, opts = {}) {
  const geo = lumpy(new THREE.SphereGeometry(r, opts.seg ?? 22, opts.seg2 ?? 16), opts.lump ?? r * 0.06, opts.freq ?? 4 / Math.max(r, 0.05) * 0.25, seedCounter++);
  return mesh(geo, color, opts);
}
export function capsule(r, len, color, opts = {}) {
  const geo = new THREE.CapsuleGeometry(r, len, 6, opts.seg ?? 14);
  lumpy(geo, opts.lump ?? r * 0.08, 5, seedCounter++);
  // Capsules hang downward from their joint by default.
  if (!opts.centered) geo.translate(0, -len / 2, 0);
  return mesh(geo, color, opts);
}
export function box(w, h, d, color, opts = {}) {
  const geo = new THREE.BoxGeometry(w, h, d, 4, 4, 4);
  // Round the corners a little by blending toward a superellipse.
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = opts.round ?? 0.25;
    const nx = v.x / (w / 2), ny = v.y / (h / 2), nz = v.z / (d / 2);
    const k = 1 - r * 0.3 * (nx * nx * ny * ny + ny * ny * nz * nz + nx * nx * nz * nz);
    pos.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  geo.computeVertexNormals();
  return mesh(geo, color, opts);
}
export function cone(r, h, color, opts = {}) {
  const geo = lumpy(new THREE.ConeGeometry(r, h, opts.seg ?? 14, 3), opts.lump ?? r * 0.06, 4, seedCounter++);
  return mesh(geo, color, opts);
}
export function cyl(rt, rb, h, color, opts = {}) {
  const geo = lumpy(new THREE.CylinderGeometry(rt, rb, h, opts.seg ?? 16, 3), opts.lump ?? Math.max(rt, rb) * 0.05, 4, seedCounter++);
  return mesh(geo, color, opts);
}
export function torus(r, tube, color, opts = {}) {
  const geo = new THREE.TorusGeometry(r, tube, 8, opts.seg ?? 24, opts.arc ?? Math.PI * 2);
  return mesh(geo, color, opts);
}

export function mesh(geo, color, opts = {}) {
  const m = new THREE.Mesh(geo, opts.material ?? clayMat(color, opts));
  m.castShadow = opts.shadow ?? true;
  m.receiveShadow = opts.receive ?? false;
  if (opts.pos) m.position.set(...opts.pos);
  if (opts.rot) m.rotation.set(...opts.rot);
  if (opts.scale) Array.isArray(opts.scale) ? m.scale.set(...opts.scale) : m.scale.setScalar(opts.scale);
  m.userData.boil = opts.boil ?? 1;
  return m;
}

// Snapshot base transforms so boil jitter never accumulates.
export function prepareBoil(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.userData.basePos = o.position.clone();
      o.userData.baseScale = o.scale.clone();
    }
  });
}

// One stop-motion frame of jitter: every clay part shifts by a hair.
export function boil(root, amount = 1) {
  root.traverse((o) => {
    if (!o.isMesh || !o.userData.basePos || !o.userData.boil) return;
    const a = amount * o.userData.boil;
    const bp = o.userData.basePos, bs = o.userData.baseScale;
    const j = 0.004 * a;
    o.position.set(bp.x + (Math.random() - 0.5) * j, bp.y + (Math.random() - 0.5) * j, bp.z + (Math.random() - 0.5) * j);
    const s = 1 + (Math.random() - 0.5) * 0.024 * a;
    o.scale.set(bs.x * s, bs.y * (1 + (Math.random() - 0.5) * 0.024 * a), bs.z * s);
  });
}
