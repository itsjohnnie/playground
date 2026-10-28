// AI-built characters: concept art turned into a textured, rigged 3D model
// by Meshy (via Higgsfield). They're streamed from Higgsfield's CDN and
// fitted onto the game's skeleton at load time, so they play exactly like
// the MakeHuman-built puppets. Options > Puppets switches between these and
// the code-built versions (or add ?models=code / ?models=ai to the URL).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3HC3FxFiUcm9iyfEXhR7cCc1scA/';
export const AI_MODELS = {
  sam: CDN + 'hf_20261027_044317_beae3eae-1e82-485c-b82e-423ea6641e5d.glb',
  jensen: CDN + 'hf_20261027_044318_60423b06-d1a7-4579-a068-a3b759eceb24.glb',
};

// Face landmarks on each model, marked from front renders: [x, y, halfW,
// halfH] relative to the head joint in rig units. Eyes are the character's
// left then right; the mouth is the painted mouth's extent.
const AI_FACES = {
  sam: { eyes: [[0.108, 0.288, 0.039, 0.021], [-0.041, 0.277, 0.039, 0.02]], mouth: [0.033, 0.093, 0.07, 0.032], noseY: 0.158 },
  jensen: { eyes: [[0.06, 0.233, 0.026, 0.013], [-0.062, 0.232, 0.026, 0.013]], mouth: [0, 0.089, 0.073, 0.022], noseY: 0.144 },
};

export const MODELS_KEY = 'claymatch.models';
export function modelSource() {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('models') : null;
  if (q === 'ai' || q === 'code') return q;
  try { return localStorage.getItem(MODELS_KEY) || 'code'; } catch { return 'code'; }
}
export function useAI(id) {
  return !!AI_MODELS[id] && modelSource() === 'ai';
}

const HIP_Y = 0.41 + 0.4 + 0.085;

// The game's bones, in the order build_mh.py writes them.
export const GAME_BONES = ['root', 'spine', 'chest', 'neck', 'head'];
for (const s of 'LR') {
  GAME_BONES.push(`clav${s}`, `sh${s}`, `el${s}`, `hand${s}`, `hip${s}`, `kn${s}`, `ft${s}`);
  for (let i = 0; i < 4; i++) GAME_BONES.push(`f${s}${i}a`, `f${s}${i}b`, `f${s}${i}c`);
  GAME_BONES.push(`t${s}a`, `t${s}b`, `t${s}c`);
}
const PARENT = { root: null, spine: 'root', chest: 'spine', neck: 'chest', head: 'neck' };
const CHAIN = {};
for (const s of 'LR') {
  Object.assign(PARENT, { [`clav${s}`]: 'chest', [`sh${s}`]: `clav${s}`, [`el${s}`]: `sh${s}`, [`hand${s}`]: `el${s}`,
    [`hip${s}`]: 'root', [`kn${s}`]: `hip${s}`, [`ft${s}`]: `kn${s}`, [`t${s}a`]: `hand${s}`, [`t${s}b`]: `t${s}a`, [`t${s}c`]: `t${s}b` });
  Object.assign(CHAIN, { [`sh${s}`]: `el${s}`, [`el${s}`]: `hand${s}`, [`hip${s}`]: `kn${s}`, [`kn${s}`]: `ft${s}`,
    [`t${s}a`]: `t${s}b`, [`t${s}b`]: `t${s}c`, [`t${s}c`]: 'tip' });
  for (let i = 0; i < 4; i++) {
    Object.assign(PARENT, { [`f${s}${i}a`]: `hand${s}`, [`f${s}${i}b`]: `f${s}${i}a`, [`f${s}${i}c`]: `f${s}${i}b` });
    Object.assign(CHAIN, { [`f${s}${i}a`]: `f${s}${i}b`, [`f${s}${i}b`]: `f${s}${i}c`, [`f${s}${i}c`]: 'tip' });
  }
}
const CHAINED = new Set(Object.values(CHAIN).filter((v) => v !== 'tip'));

// Meshy's humanoid skeleton -> the game's bones.
const FOLD = {
  Hips: 'root', Spine02: 'spine', Spine01: 'chest', Spine: 'chest', neck: 'neck', Head: 'head', head_end: 'head', headfront: 'head',
  LeftShoulder: 'clavL', LeftArm: 'shL', LeftForeArm: 'elL', LeftHand: 'handL', LeftUpLeg: 'hipL', LeftLeg: 'knL', LeftFoot: 'ftL', LeftToeBase: 'ftL',
  RightShoulder: 'clavR', RightArm: 'shR', RightForeArm: 'elR', RightHand: 'handR', RightUpLeg: 'hipR', RightLeg: 'knR', RightFoot: 'ftR', RightToeBase: 'ftR',
};

const loader = new GLTFLoader();
const V = (a) => new THREE.Vector3().copy(a);

// Rest offsets in the game's convention (limbs hang along -Y) and the local
// rotations that pose that skeleton onto the mesh. Same maths as
// solve_bind() in tools/build_mh.py.
function solveBind(P, tips) {
  const Rw = {}, local = {}, bind = {};
  const down = new THREE.Vector3(0, -1, 0);
  for (const n of GAME_BONES) {
    const p = PARENT[n];
    const Rp = p ? Rw[p] : new THREE.Quaternion();
    const RpInv = Rp.clone().invert();
    const off = V(P[n]).sub(p ? P[p] : new THREE.Vector3());
    local[n] = CHAINED.has(n) ? [0, -off.length(), 0] : off.clone().applyQuaternion(RpInv).toArray();
    let W;
    if (n.startsWith('hand')) {
      // No finger bones: the hand keeps the forearm's frame, so the wrist
      // never twists between them (a separate frame pinched it to a point).
      W = Rp.clone();
    } else if (CHAIN[n]) {
      const t = CHAIN[n];
      const d = V(t === 'tip' ? tips[n] : P[t]).sub(P[n]).normalize().applyQuaternion(RpInv);
      W = Rp.clone().multiply(new THREE.Quaternion().setFromUnitVectors(down, d));
    } else W = Rp.clone();
    Rw[n] = W;
    bind[n] = RpInv.clone().multiply(W).toArray();
  }
  return { local, bind };
}

export async function loadAI(id) {
  const gltf = await new Promise((res, rej) => loader.load(AI_MODELS[id], res, undefined, rej));
  let sm = null;
  gltf.scene.traverse((o) => { if (o.isSkinnedMesh && !sm) sm = o; });
  if (!sm) return null;
  gltf.scene.updateMatrixWorld(true);
  const bones = sm.skeleton.bones;
  const J = {};
  for (const b of bones) J[b.name] = b.getWorldPosition(new THREE.Vector3());

  // Bake the bind pose into world space.
  const src = sm.geometry, n = src.attributes.position.count;
  const pos = new Float32Array(n * 3), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(src.attributes.position, i);
    sm.applyBoneTransform(i, v);
    v.applyMatrix4(sm.matrixWorld);
    pos.set([v.x, v.y, v.z], i * 3);
  }

  // Face +z with the character's left on +x, feet on the ground, hips at
  // the game's hip height.
  const flip = J.headfront && J.headfront.z < J.Head.z;
  const fix = (p) => (flip ? p.set(-p.x, p.y, -p.z) : p);
  for (const k in J) fix(J[k]);
  let minY = Infinity;
  for (let i = 0; i < n; i++) {
    if (flip) { pos[i * 3] *= -1; pos[i * 3 + 2] *= -1; }
    minY = Math.min(minY, pos[i * 3 + 1]);
  }
  const swapLR = J.LeftArm.x < J.RightArm.x;
  const hipH = (J.LeftUpLeg.y + J.RightUpLeg.y) / 2 - minY;
  const scale = HIP_Y / hipH;
  const shift = new THREE.Vector3(-J.Hips.x, -minY, -(J.LeftUpLeg.z + J.RightUpLeg.z) / 2);
  const tf = (p) => p.add(shift).multiplyScalar(scale);
  for (const k in J) tf(J[k]);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (pos[i * 3] + shift.x) * scale;
    pos[i * 3 + 1] = (pos[i * 3 + 1] + shift.y) * scale;
    pos[i * 3 + 2] = (pos[i * 3 + 2] + shift.z) * scale;
  }
  const side = (name) => (swapLR ? name.replace(/^Left|^Right/, (m) => (m === 'Left' ? 'Right' : 'Left')) : name);

  // Joint positions for the game's bones.
  const P = {}, tips = {};
  P.root = V(J.Hips).setX(0); P.root.y = (J.LeftUpLeg.y + J.RightUpLeg.y) / 2 + 0.03;
  P.spine = V(J.Spine02).setX(0); P.chest = V(J.Spine01).setX(0); P.neck = V(J.neck).setX(0); P.head = V(J.Head).setX(0);
  for (const s of 'LR') {
    const M = (b) => J[side((s === 'L' ? 'Left' : 'Right') + b)];
    P[`clav${s}`] = V(M('Shoulder')); P[`sh${s}`] = V(M('Arm')); P[`el${s}`] = V(M('ForeArm')); P[`hand${s}`] = V(M('Hand'));
    P[`hip${s}`] = V(M('UpLeg')); P[`kn${s}`] = V(M('Leg')); P[`ft${s}`] = V(M('Foot'));
    // Fingers have no weights here, but the rig still needs them placed.
    const d = V(P[`hand${s}`]).sub(P[`el${s}`]).normalize();
    for (let i = 0; i < 4; i++) {
      const o = new THREE.Vector3(0, 0, (0.026 - i * 0.017));
      P[`f${s}${i}a`] = V(P[`hand${s}`]).addScaledVector(d, 0.07).add(o);
      P[`f${s}${i}b`] = V(P[`f${s}${i}a`]).addScaledVector(d, 0.035);
      P[`f${s}${i}c`] = V(P[`f${s}${i}b`]).addScaledVector(d, 0.025);
      tips[`f${s}${i}c`] = V(P[`f${s}${i}c`]).addScaledVector(d, 0.02);
    }
    P[`t${s}a`] = V(P[`hand${s}`]).addScaledVector(d, 0.02).add(new THREE.Vector3(0, 0, 0.035));
    P[`t${s}b`] = V(P[`t${s}a`]).addScaledVector(d, 0.03);
    P[`t${s}c`] = V(P[`t${s}b`]).addScaledVector(d, 0.025);
    tips[`t${s}c`] = V(P[`t${s}c`]).addScaledVector(d, 0.02);
  }
  const { local, bind } = solveBind(P, tips);

  // Skin weights onto the game's bones (indices into GAME_BONES).
  const gi = Object.fromEntries(GAME_BONES.map((b, i) => [b, i]));
  const map = bones.map((b) => gi[FOLD[side(b.name)] ?? 'root'] ?? 0);
  const si = src.attributes.skinIndex, sw = src.attributes.skinWeight;
  const idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
  for (let i = 0; i < n * 4; i++) { idx[i] = map[si.array[i]]; wt[i] = sw.getComponent(Math.floor(i / 4), i % 4); }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (src.attributes.uv) g.setAttribute('uv', src.attributes.uv.clone());
  g.setAttribute('skinIndex', new THREE.BufferAttribute(idx, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(wt, 4));
  g.setIndex(src.index.clone());
  g.computeVertexNormals();

  // Head frame (bruises, camera framing): the head joint up to the crown.
  const hj = P.head;
  let top = hj.y, rx = 0, front = hj.z;
  for (let i = 0; i < n; i++) {
    if (idx[i * 4] !== gi.head || wt[i * 4] < 0.9) continue;
    top = Math.max(top, pos[i * 3 + 1]); rx = Math.max(rx, Math.abs(pos[i * 3])); front = Math.max(front, pos[i * 3 + 2]);
  }
  const hr = (top - hj.y) / 2;
  const head = { c: [0, hj.y + hr, hj.z], r: [Math.max(rx, hr * 0.8), hr, Math.max(front - hj.z, hr * 0.8)], eyes: { L: [0.04, hj.y + hr, front], R: [-0.04, hj.y + hr, front] }, eyeR: 0.02 };

  const map0 = sm.material.map || null;
  head.face = map0 && AI_FACES[id] ? placeFace(AI_FACES[id], P.head, pos, g.attributes.uv, n, map0, src.index.array) : null;
  if (head.face) {
    const dense = new Float32Array(n * 3), { idx: fi, d: fd } = head.face.flat;
    for (let k = 0; k < fi.length; k++) dense.set(fd.subarray(k * 3, k * 3 + 3), fi[k] * 3);
    g.morphAttributes.position = [new THREE.BufferAttribute(dense, 3)];
    // Normals of the flattened face, so it shades as smooth skin.
    const t = new THREE.BufferGeometry();
    t.setAttribute('position', new THREE.BufferAttribute(pos.map((v, i) => v + dense[i]), 3));
    t.setIndex(g.index); t.computeVertexNormals();
    const n0 = g.attributes.normal.array, n1 = t.attributes.normal.array, dn = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) dn[i] = n1[i] - n0[i];
    g.morphAttributes.normal = [new THREE.BufferAttribute(dn, 3)];
    g.morphTargetsRelative = true;
  }
  if (map0) map0.colorSpace = THREE.SRGBColorSpace;
  const rig = { bones: GAME_BONES, local, bind, hipY: P.root.y, head, chest: { front: 0.12, neck: P.neck.y - P.chest.y }, morphs: [], ai: true };
  return { mh: { geometry: g, rig, texture: map0 } };
}

// Puts the hand-marked landmarks on the surface. Builds (1) a height map of
// the face so replacement parts can hug it, (2) a copy of the texture with
// the painted mouth erased (filled from the skin around it), shown whenever
// a sculpted mouth replaces it, and (3) robust skin and lip colours.
function placeFace(F, hj, pos, uvA, n, map, index) {
  const image = map.image;
  const cv = document.createElement('canvas');
  const W = (cv.width = Math.min(1024, image.width)), H = (cv.height = Math.round(image.height * W / image.width));
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, W, H);
  const img = ctx.getImageData(0, 0, W, H), px = img.data;
  const texAt = (i) => { const x = Math.min(W - 1, Math.max(0, Math.floor(uvA.getX(i) * W))), y = Math.min(H - 1, Math.max(0, Math.floor(uvA.getY(i) * H))); const o = (y * W + x) * 4; return [px[o], px[o + 1], px[o + 2]]; };

  // Height map over the face, head-joint relative.
  const G = 96, x0 = -0.3, x1 = 0.3, y0 = -0.12, y1 = 0.48;
  const z = new Float32Array(G * G).fill(-1e9);
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3] - hj.x, y = pos[i * 3 + 1] - hj.y, zz = pos[i * 3 + 2] - hj.z;
    if (x < x0 || x > x1 || y < y0 || y > y1 || zz < 0) continue;
    const gx = Math.round(((x - x0) / (x1 - x0)) * (G - 1)), gy = Math.round(((y - y0) / (y1 - y0)) * (G - 1));
    const k = gy * G + gx; if (zz > z[k]) z[k] = zz;
  }
  for (let pass = 0; pass < 6; pass++) {
    const z2 = z.slice();
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const k = gy * G + gx; if (z[k] > -1e8) continue;
      let s = 0, c = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = gx + dx, yy = gy + dy; if (xx < 0 || yy < 0 || xx >= G || yy >= G) continue; const v = z[yy * G + xx]; if (v > -1e8) { s += v; c++; } }
      if (c) z2[k] = s / c;
    }
    z.set(z2);
  }
  const zAt = (x, y) => {
    const fx = Math.min(G - 1.001, Math.max(0, ((x - x0) / (x1 - x0)) * (G - 1))), fy = Math.min(G - 1.001, Math.max(0, ((y - y0) / (y1 - y0)) * (G - 1)));
    const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const a = z[iy * G + ix], b = z[iy * G + ix + 1], c = z[(iy + 1) * G + ix], d = z[(iy + 1) * G + ix + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };

  // Skin and lip colours: skin-like texels in a ring around each feature.
  const near = (cx, cy, rIn, rOut, pick) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3] - hj.x, y = pos[i * 3 + 1] - hj.y, zz = pos[i * 3 + 2] - hj.z;
      if (zz < 0) continue;
      const d = Math.hypot((x - cx) / rOut[0], (y - cy) / rOut[1]);
      if (d > 1 || Math.hypot((x - cx) / rIn[0], (y - cy) / rIn[1]) < 1) continue;
      if (zz < zAt(x, y) - 0.01) continue;           // front surface only
      const c = texAt(i);
      if (pick(c)) out.push(c);
    }
    return out;
  };
  const skinLike = ([r, g, b]) => r > 90 && r >= g && g >= b * 0.9 && r - b > 25 && r - b < 140;
  const median = (cs, fb) => {
    if (!cs.length) return fb;
    const L = cs.map((c) => [c[0] + c[1] + c[2], c]).sort((a, b) => a[0] - b[0]);
    const mid = L.slice(Math.floor(L.length * 0.35), Math.ceil(L.length * 0.75)).map((x) => x[1]);
    return [0, 1, 2].map((k) => mid.reduce((a, c) => a + c[k], 0) / mid.length);
  };
  const [mx, my, mw, mh] = F.mouth;
  // How far up the mouth edits may reach: most of the way to the nose.
  const up = F.noseY ? (F.noseY - my) * 0.82 : mh * 1.45;
  const faceSkin = median(near(mx, my + 0.08, [0.01, 0.01], [0.14, 0.14], skinLike), [220, 175, 150]);
  const mouthSkin = median(near(mx, my, [mw * 1.25, mh * 1.8], [mw * 1.8, mh * 3.5], skinLike), faceSkin);
  const lip = median(near(mx, my - mh * 0.9, [0.001, 0.001], [mw * 0.6, mh * 0.6], ([r, g, b]) => r > 110 && r > g * 1.25), [190, 110, 110]);
  const eyes = F.eyes.map(([x, y, w, h]) => {
    const skin = median(near(x, y, [w * 1.4, h * 1.8], [w * 2.6, h * 5], skinLike), faceSkin);
    return { c: [x, y, zAt(x, y)], w, h, skin };
  });

  // Erase the painted mouth: rasterise its triangles into a UV mask, then
  // diffuse the surrounding texels inward.
  const mask = document.createElement('canvas'); mask.width = W; mask.height = H;
  const mc = mask.getContext('2d'); mc.fillStyle = '#fff';
  const inMouth = (i) => { const x = pos[i * 3] - hj.x, y = pos[i * 3 + 1] - hj.y, zz = pos[i * 3 + 2] - hj.z; return zz > 0 && Math.hypot((x - mx) / (mw * 1.45), (y - my) / (y > my ? up * 0.92 : mh * 2.3)) < 1; };
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    if (!(inMouth(a) || inMouth(b) || inMouth(c))) continue;
    const ua = [uvA.getX(a) * W, uvA.getY(a) * H], ub = [uvA.getX(b) * W, uvA.getY(b) * H], uc = [uvA.getX(c) * W, uvA.getY(c) * H];
    if (Math.max(Math.hypot(ua[0] - ub[0], ua[1] - ub[1]), Math.hypot(ua[0] - uc[0], ua[1] - uc[1])) > W * 0.1) continue;   // UV seam
    mc.beginPath(); mc.moveTo(...ua); mc.lineTo(...ub); mc.lineTo(...uc); mc.closePath(); mc.fill();
  }
  const md = mc.getImageData(0, 0, W, H).data;
  let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (md[(y * W + x) * 4 + 3] > 0) { bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); }
  let erased = null;
  if (bx1 > bx0) {
    const pad = 3; bx0 = Math.max(1, bx0 - pad); by0 = Math.max(1, by0 - pad); bx1 = Math.min(W - 2, bx1 + pad); by1 = Math.min(H - 2, by1 + pad);
    const out = new Uint8ClampedArray(px);
    const inM = (x, y) => md[(y * W + x) * 4 + 3] > 0;
    // Start from the skin colour, then relax toward the neighbours.
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if (inM(x, y)) { const o = (y * W + x) * 4; out[o] = mouthSkin[0]; out[o + 1] = mouthSkin[1]; out[o + 2] = mouthSkin[2]; }
    for (let it = 0; it < 160; it++) {
      for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
        if (!inM(x, y)) continue;
        const o = (y * W + x) * 4;
        for (let k = 0; k < 3; k++) out[o + k] = (out[o - 4 + k] + out[o + 4 + k] + out[o - W * 4 + k] + out[o + W * 4 + k]) / 4;
      }
    }
    // A little clay grain so the patch doesn't read as airbrushed.
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
      if (!inM(x, y)) continue;
      const o = (y * W + x) * 4, nz = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1) * 6;
      for (let k = 0; k < 3; k++) out[o + k] += nz;
    }
    const ec = document.createElement('canvas'); ec.width = W; ec.height = H;
    ec.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
    erased = new THREE.CanvasTexture(ec);
    erased.flipY = map.flipY; erased.colorSpace = map.colorSpace; erased.wrapS = map.wrapS; erased.wrapT = map.wrapT;
    erased.anisotropy = map.anisotropy;
  }
  // Flatten: a morph that smooths the sculpted lips and teeth into plain
  // skin, so a replacement mouth can sit on it. Front-surface vertices in
  // an ellipse around the mouth relax toward their neighbours; the rim stays.
  // Weld vertices split along UV seams, so the surface moves as one piece.
  const weld = new Int32Array(n), keyOf = new Map();
  for (let i = 0; i < n; i++) {
    const k = Math.round(pos[i * 3] * 2e4) + ',' + Math.round(pos[i * 3 + 1] * 2e4) + ',' + Math.round(pos[i * 3 + 2] * 2e4);
    if (!keyOf.has(k)) keyOf.set(k, i);
    weld[i] = keyOf.get(k);
  }
  const nb = Array.from({ length: n }, () => []);
  for (let t = 0; t < index.length; t += 3) { const a = weld[index[t]], b = weld[index[t + 1]], c = weld[index[t + 2]]; nb[a].push(b, c); nb[b].push(a, c); nb[c].push(a, b); }
  const RX = mw * 1.7, RY = mh * 2.8;
  const wgt = new Float32Array(n), region = [];
  const outer = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const x = pos[i * 3] - hj.x, y = pos[i * 3 + 1] - hj.y, zz = pos[i * 3 + 2] - hj.z; outer[i] = zz >= 0 && zz >= zAt(x, y) - 0.006 ? 1 : 0; }
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3] - hj.x, y = pos[i * 3 + 1] - hj.y, zz = pos[i * 3 + 2] - hj.z;
    if (zz < 0) continue;
    // Reaches further down (chin) than up (the nose stays untouched).
    const d = Math.hypot((x - mx) / RX, (y - my) / (y > my ? up : RY));
    if (d >= 1 || weld[i] !== i) continue;
    region.push(i);
    wgt[i] = Math.min(1, (1 - d) / 0.3);
  }
  const P2 = Float32Array.from(pos);
  for (let it = 0; it < 160; it++) {
    const Q = P2.slice();
    for (const v of region) {
      // Only the outer face pulls: the walls of a sculpted mouth cavity
      // would drag it into a funnel. Inner vertices just follow the hole shut.
      const L = nb[v]; if (!L.length) continue;
      let sx = 0, sy = 0, sz = 0, k = L.length;
      for (const u of L) { sx += P2[u * 3]; sy += P2[u * 3 + 1]; sz += P2[u * 3 + 2]; }
      const a = 0.6 * wgt[v];
      Q[v * 3] += (sx / k - P2[v * 3]) * a; Q[v * 3 + 1] += (sy / k - P2[v * 3 + 1]) * a; Q[v * 3 + 2] += (sz / k - P2[v * 3 + 2]) * a;
    }
    P2.set(Q);
  }
  // Every split copy follows its welded vertex.
  const moved = [];
  for (let i = 0; i < n; i++) if (wgt[weld[i]] > 0) moved.push(i);
  var flatIdx = Uint32Array.from(moved), flatD = new Float32Array(moved.length * 3);
  moved.forEach((v, k) => { const w0 = weld[v]; for (let q = 0; q < 3; q++) flatD[k * 3 + q] = P2[w0 * 3 + q] - pos[w0 * 3 + q]; });
  // Parts hug the flattened face: rebuild the height map there.
  for (const v of region) {
    const gx = Math.round(((P2[v * 3] - hj.x - x0) / (x1 - x0)) * (G - 1)), gy = Math.round(((P2[v * 3 + 1] - hj.y - y0) / (y1 - y0)) * (G - 1));
    if (gx >= 0 && gy >= 0 && gx < G && gy < G) z[gy * G + gx] = -1e9;
  }
  for (const v of region) {
    const zz = P2[v * 3 + 2] - hj.z;
    const gx = Math.round(((P2[v * 3] - hj.x - x0) / (x1 - x0)) * (G - 1)), gy = Math.round(((P2[v * 3 + 1] - hj.y - y0) / (y1 - y0)) * (G - 1));
    if (gx >= 0 && gy >= 0 && gx < G && gy < G) z[gy * G + gx] = Math.max(z[gy * G + gx], zz);
  }
  for (let pass = 0; pass < 3; pass++) {
    const z2 = z.slice();
    for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
      const k = gy * G + gx; if (z[k] > -1e8) continue;
      let sm = 0, c = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = gx + dx, yy = gy + dy; if (xx < 0 || yy < 0 || xx >= G || yy >= G) continue; const vv = z[yy * G + xx]; if (vv > -1e8) { sm += vv; c++; } }
      if (c) z2[k] = sm / c;
    }
    z.set(z2);
  }
  // Texture coordinates over the face (front-most vertex per cell), so
  // patches can wear the face's own texture.
  const uvG = new Float32Array(G * G * 2).fill(-1), best = new Float32Array(G * G).fill(-1e9);
  const flatAll = Float32Array.from(pos); for (let k = 0; k < flatIdx.length; k++) for (let q = 0; q < 3; q++) flatAll[flatIdx[k] * 3 + q] += flatD[k * 3 + q];
  for (let i = 0; i < n; i++) {
    const x = flatAll[i * 3] - hj.x, y = flatAll[i * 3 + 1] - hj.y, zz = flatAll[i * 3 + 2] - hj.z;
    if (x < x0 || x > x1 || y < y0 || y > y1 || zz < 0) continue;
    const gx = Math.round(((x - x0) / (x1 - x0)) * (G - 1)), gy = Math.round(((y - y0) / (y1 - y0)) * (G - 1)), k = gy * G + gx;
    if (zz > best[k]) { best[k] = zz; uvG[k * 2] = uvA.getX(i); uvG[k * 2 + 1] = uvA.getY(i); }
  }
  const uvAt = (x, y) => {
    const gx = Math.round(Math.min(G - 1, Math.max(0, ((x - x0) / (x1 - x0)) * (G - 1)))), gy = Math.round(Math.min(G - 1, Math.max(0, ((y - y0) / (y1 - y0)) * (G - 1))));
    for (let r = 0; r < 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = gx + dx, yy = gy + dy; if (xx < 0 || yy < 0 || xx >= G || yy >= G) continue;
      const k = yy * G + xx; if (uvG[k * 2] >= 0) return [uvG[k * 2], uvG[k * 2 + 1]];
    }
    return [0, 0];
  };
  // Max-filter so parts never dip between samples.
  { const z2 = z.slice(); for (let gy = 1; gy < G - 1; gy++) for (let gx = 1; gx < G - 1; gx++) { let m = -1e9; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) m = Math.max(m, z[(gy + dy) * G + gx + dx]); z2[gy * G + gx] = m; } z.set(z2); }
  for (const e of eyes) e.c[2] = zAt(e.c[0], e.c[1]);
  // Smooth surface fits (z = quadratic in x, y) for parts to hug: the grid
  // is too coarse to bend a lip line on.
  const fit = (cx, cy, rx, ry, P, hole = 0) => {
    const A = [], bz = [];
    for (let i = 0; i < n; i++) {
      const x = P[i * 3] - hj.x, y = P[i * 3 + 1] - hj.y, zz = P[i * 3 + 2] - hj.z;
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (zz < 0 || d > 1 || d < hole || zz < zAt(x, y) - 0.012) continue;
      const u = x - cx, v = y - cy; A.push([1, u, v, u * u, u * v, v * v]); bz.push(zz);
    }
    if (A.length < 12) return null;
    // Normal equations (6x6), solved by Gaussian elimination.
    const M = Array.from({ length: 6 }, () => new Float64Array(7));
    for (let r = 0; r < A.length; r++) for (let a = 0; a < 6; a++) { for (let b = 0; b < 6; b++) M[a][b] += A[r][a] * A[r][b]; M[a][6] += A[r][a] * bz[r]; }
    for (let a = 0; a < 6; a++) M[a][a] += 1e-9;
    for (let c = 0; c < 6; c++) { let p = c; for (let r = c + 1; r < 6; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < 6; r++) { if (r === c) continue; const f = M[r][c] / M[c][c]; for (let k = c; k < 7; k++) M[r][k] -= f * M[c][k]; } }
    return [cx, cy, ...M.map((r, i) => r[6] / r[i])];
  };
  const flatPos = Float32Array.from(pos); for (let k = 0; k < flatIdx.length; k++) for (let q = 0; q < 3; q++) flatPos[flatIdx[k] * 3 + q] += flatD[k * 3 + q];
  const mouthFit = fit(mx, my, mw * 2.0, mh * 3.4, pos, 0.62);
  eyes.forEach((e) => { e.fit = fit(e.c[0], e.c[1], e.w * 2.2, e.h * 3.5, pos); });
  const fz = (F2) => (x, y) => { const u = x - F2[0], v = y - F2[1]; return F2[2] + F2[3] * u + F2[4] * v + F2[5] * u * u + F2[6] * u * v + F2[7] * v * v; };
  for (const e of eyes) if (e.fit) { e.zAt = fz(e.fit); e.c[2] = e.zAt(e.c[0], e.c[1]); } else e.zAt = zAt;
  const mzAt = mouthFit ? fz(mouthFit) : zAt;
  return { eyes, mouth: { c: [mx, my, mzAt(mx, my)], w: mw, h: mh, skin: mouthSkin, lip, zAt: mzAt }, zAt, uvAt, erased, flat: { idx: flatIdx, d: flatD } };
}
