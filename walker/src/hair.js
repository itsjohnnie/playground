// Hair cards, the way games do hair: a few hundred thin strips, each carrying
// a painted texture of many strands, lit with an anisotropic highlight that
// runs along them. Cheaper than the lock ribbons they replace and far more
// hair-like.
//
// Each card is a chain of points that settles under gravity when the body is
// built: it is combed away from the parting, keeps some stiffness near the
// root, and is pushed out of the head, neck, shoulders and back using the same
// distance fields as the smooth unions, so long hair drapes over the
// shoulders instead of being snapped onto them. Skinning carries the result;
// long ends also swing on the shared hairSwing spring.

import * as THREE from 'three';

const TAU = Math.PI * 2;
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
function hash(i, k) { const h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return h - Math.floor(h); }

// ── strand texture: four variants side by side, white strands on clear ──
let _tex = null;
function strandTexture() {
  if (_tex) return _tex;
  const W = 512, H = 1024, COLS = 4, cw = W / COLS;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.lineCap = 'round';
  for (let col = 0; col < COLS; col++) {
    const n = 170;
    for (let i = 0; i < n; i++) {
      const r = (k) => hash(col * 1000 + i, k);
      // denser in the middle of the card so its edges are soft, not cut
      const x0 = col * cw + cw * (0.5 + (r(1) - 0.5) * (r(2) < 0.7 ? 0.62 : 0.94));
      const end = H * (0.72 + 0.28 * Math.pow(r(3), 0.6)); // strands end at different lengths: tapered tips
      const wave = (r(4) - 0.5) * cw * 0.14, freq = 1 + r(5) * 2;
      const b = Math.round(150 + 105 * r(6));
      g.strokeStyle = `rgba(${b},${b},${b},${0.75 + 0.25 * r(7)})`;
      g.lineWidth = 1.4 + 2.2 * r(8);
      g.beginPath();
      for (let y = 0; y <= end; y += 16) {
        const t = y / H;
        const x = x0 + wave * Math.sin(t * Math.PI * freq + r(9) * TAU) + (r(10) - 0.5) * cw * 0.12 * t; // ends drift apart
        y === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  _tex = tex;
  return tex;
}

// numeric gradient of a distance field
function grad(f, p, out) {
  const e = 0.002;
  out.set(
    f(p.x + e, p.y, p.z) - f(p.x - e, p.y, p.z),
    f(p.x, p.y + e, p.z) - f(p.x, p.y - e, p.z),
    f(p.x, p.y, p.z + e) - f(p.x, p.y, p.z - e),
  );
  const l = out.length();
  return l > 1e-9 ? out.divideScalar(l) : out.set(0, 1, 0);
}

export function buildHairCards(s, rig, { H, fields, hairColor, hairSwing, draft = false }) {
  const L = s.c.hairLength ?? 0;
  if (L < 0.06 || typeof document === 'undefined') return null;
  const { sc, cy, cz, rx, ry, rz, CAP, skull, hairlineOf } = H;
  const fem = s.c.sex ?? 0, u = s.u;
  const long = L >= 0.35;
  const len = long ? (0.12 + 0.40 * (L - 0.35) / 0.65) * sc : (0.03 + 0.07 * (L - 0.06) / 0.29) * sc;
  const partX = (fem > 0.5 ? -1 : 1) * 0.024 * sc * (((s.c.face ?? 0.5) * 7) % 1 > 0.5 ? 1 : -1);
  const q = draft ? 0.4 : 1;
  const N = Math.round((long ? 640 : 700) * q), K = long ? 14 : 5;

  // the scalp (with its painted cap) as a field; the rest of the body as is
  const scalp = (x, y, z) => fields.head(x, y, z) - CAP * Math.min(rx, rz);
  const body = (x, y, z) => Math.min(fields.neck(x, y, z), fields.torso(x, y, z), fields.arm_left(x, y, z), fields.arm_right(x, y, z));
  const g = new THREE.Vector3(), tmp = new THREE.Vector3();

  const pos = [], nrm = [], tng = [], uv = [], colA = [], sway = [], si = [], sw = [], idx = [];
  const bi = rig.index;
  const golden = Math.PI * (3 - Math.sqrt(5));
  let cards = 0;
  for (let i = 0; i < N * 3 && cards < N; i++) {
    const r = (k) => hash(i, k);
    // roots: even over the scalp (golden spiral), where hair grows
    const yy = 1 - ((i + 0.5) / (N * 3)) * 1.6;
    const phi = Math.acos(Math.max(-1, Math.min(1, yy)));
    const a = (i * golden) % TAU;
    const p0 = skull(a, phi);
    const fn = p0.z / (p0.rr || 1);
    if (p0.y < hairlineOf(a, fn) + 0.03) continue;
    if (Math.abs(p0.X - partX) < 0.005 * sc && p0.z > -0.4 * p0.rr) continue; // the parting
    cards++;
    const layer = r(1); // 0 = against the scalp … 1 = outermost
    const off = (long ? 0.004 + 0.016 * layer : 0.003 + 0.012 * layer) * sc;
    const root = new THREE.Vector3(p0.X, cy + p0.Y, cz + p0.Z);
    grad(scalp, root, g);
    root.addScaledVector(g, -scalp(root.x, root.y, root.z) + off * 0.3);
    const n0 = g.clone();
    // combing direction: away from the parting, down and back, along the scalp
    const side = Math.sign(root.x - partX) || 1;
    let d = long ? new THREE.Vector3(side * 0.85, -0.55, -0.35) : new THREE.Vector3(side * 0.5, -0.2, -0.85);
    if (!long && root.z - cz > 0.3 * rz) d.set(side * 0.3, 0.12, -0.95); // short: the front swept up and back
    d.y -= (1 - smooth(Math.abs(root.x - partX) / (0.03 * sc))) * 0.8;
    d.addScaledVector(n0, -d.dot(n0));
    if (d.length() < 0.3) d.set(0, -1, -0.6).addScaledVector(n0, -new THREE.Vector3(0, -1, -0.6).dot(n0));
    d.normalize();
    const cardLen = len * (long ? 0.6 + 0.6 * r(2) : 0.7 + 0.5 * r(2)) * (long ? 1 : 0.25 + 0.75 * smooth((p0.y - hairlineOf(a, fn)) / 0.5));
    const seg = cardLen / K;

    // grow, then settle: gravity, segment lengths, stiffness near the root,
    // and collisions with the scalp (at this card's layer) and the body
    const P = [root.clone()];
    for (let k = 1; k <= K; k++) P.push(P[k - 1].clone().addScaledVector(d, seg));
    const stiff = (k) => (long ? (k <= 3 ? 0.45 * Math.exp(-k / 1.6) : 0) : 0.6 * Math.exp(-k / 4));
    const gstep = (long ? 0.35 : 0.06) * seg;
    const faceX = 0.088 * sc;
    for (let it = 0; it < (draft ? 14 : 48); it++) {
      for (let k = 1; k <= K; k++) {
        const p = P[k], prev = P[k - 1];
        p.y -= gstep;
        // hanging hair is drawn in toward the body's midline a little: it
        // falls down the back and chest rather than fanning out sideways
        if (long && p.y < cy - 0.6 * ry) p.x *= 0.985;
        // stiffness: near the root a card keeps its combed direction
        const dirK = k === 1 ? d : tmp.subVectors(prev, P[k - 2]).normalize();
        const want = prev.clone().addScaledVector(dirK, seg);
        p.lerp(want, stiff(k));
        // length
        tmp.subVectors(p, prev);
        p.copy(prev).addScaledVector(tmp.normalize(), seg);
        // over the crown hair lies on its layer, combed flat by its own
        // weight; below the head's widest point long hair hangs free
        const ds = scalp(p.x, p.y, p.z) - off;
        const lie = long ? smooth((p.y - (cy - 0.45 * ry)) / (0.3 * ry)) : 1;
        if (ds < 0) p.addScaledVector(grad(scalp, p, g), -ds);
        else if (lie > 0) p.addScaledVector(grad(scalp, p, g), -ds * lie);
        if (long && p.y < cy) {
          const db = body(p.x, p.y, p.z) - (0.006 + 0.012 * layer) * sc;
          if (db < 0) p.addScaledVector(grad(body, p, g), -db);
        }
        // never across the face: front hair parts to either side of it,
        // from the brows down to below the chin
        if (long && p.z > cz + 0.2 * rz && p.y < cy + 0.42 * ry && p.y > cy - 1.3 * ry && Math.abs(p.x) < faceX) p.x = Math.sign(p.x || side) * faceX;
      }
    }

    // the strip: across the strand, lying on the surface beneath it, its
    // edges curled in a touch so a card reads as a rounded clump
    const W0 = (long ? 0.034 : 0.022) * sc * (0.75 + 0.5 * r(3));
    const colU = Math.floor(r(4) * 4) / 4;
    const tone = (0.82 + 0.3 * r(5)) * (0.7 + 0.3 * layer); // inner layers darker: depth
    const base = pos.length / 3;
    for (let k = 0; k <= K; k++) {
      const p = P[k], t = k / K;
      const tan = tmp.subVectors(P[Math.min(K, k + 1)], P[Math.max(0, k - 1)]).normalize().clone();
      const field = p.y < cy - 0.5 * ry && long ? (x, y, z) => Math.min(scalp(x, y, z), body(x, y, z)) : scalp;
      const n = grad(field, p, new THREE.Vector3());
      const wv = new THREE.Vector3().crossVectors(tan, n).normalize();
      const w = W0 * (1 - 0.35 * t);
      for (const e of [-0.5, 0.5]) {
        const v = p.clone().addScaledVector(wv, e * w).addScaledVector(n, -0.12 * w);
        pos.push(v.x, v.y, v.z);
        const nn = n.clone().addScaledVector(wv, e * 0.5).normalize(); // rounded normals across the card
        nrm.push(nn.x, nn.y, nn.z);
        tng.push(tan.x, tan.y, tan.z, 1); // along the strand: the highlight's direction
        uv.push(colU + (e + 0.5) * 0.25, 1 - t); // v: 1 at the root (canvas top) … 0 at the tip
        const shade = tone * lerp(0.62, 1.05, smooth(t * 1.6)); // darker at the roots
        colA.push(shade, shade, shade);
        // skinning: the head carries the hair; hanging lengths follow the chest
        const below = long ? smooth((cy - 0.55 * ry - p.y) / (0.18 * sc)) : 0;
        si.push(bi.head, bi.spine2, 0, 0);
        sw.push(1 - 0.75 * below, 0.75 * below, 0, 0);
        sway.push((long ? 1 : 0.1) * Math.pow(t, 1.3) * (0.3 + 0.7 * below));
      }
      if (k < K) {
        const a0 = base + k * 2;
        idx.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('tangent', new THREE.Float32BufferAttribute(tng, 4));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colA, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.setAttribute('sway', new THREE.Float32BufferAttribute(sway, 1));
  geo.setIndex(idx);

  const mat = new THREE.MeshPhysicalMaterial({
    map: strandTexture(), color: hairColor.clone().multiplyScalar(1.7), vertexColors: true,
    alphaTest: 0.45, alphaToCoverage: true, side: THREE.DoubleSide,
    roughness: 0.62, metalness: 0,
    anisotropy: 0.6, anisotropyRotation: 0, // tangents run along the strands: the highlight streaks with them
    specularIntensity: 0.14, specularColor: new THREE.Color(1, 0.94, 0.86),
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.hairSwing = hairSwing;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float sway;\nuniform vec3 hairSwing;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += hairSwing * sway;');
    // a card's back face shows the same hair, lit from the same side
    sh.fragmentShader = sh.fragmentShader.replace('float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;', 'float faceDirection = 1.0;');
  };
  mat.customProgramCacheKey = () => 'walker-hair-v1';
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.name = 'hair';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}
