// Procedural body: one skinned mesh lofted around the rig from anatomical
// cross-sections. Every part is a stack of rings (superellipses) whose size
// and offset follow the spec, so creator sliders reshape a continuous body
// instead of scaling primitives. Joints blend weights across a zone, so a
// knee bends like a knee rather than a hinge between two cylinders.

import * as THREE from 'three';
import { boneLayout } from './proportions.js';

const TAU = Math.PI * 2;
// build quality: 1 = full; a draft (~0.45) rebuilds fast enough to follow a slider drag
let Q = 1;
const qn = (n, min = 6) => Math.max(min, Math.round(n * Q));
// surface kinds: each gets its own roughness, sheen and micro-detail in the shader
const MAT = { skin: 0, cloth: 1, hair: 2, shoe: 3, sole: 4, eye: 5 };
const smooth = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// Catmull-Rom through [x, ...values] keys, x ascending
function profile(keys) {
  return (x) => {
    const n = keys.length;
    if (x <= keys[0][0]) return keys[0].slice(1);
    if (x >= keys[n - 1][0]) return keys[n - 1].slice(1);
    let i = 0;
    while (keys[i + 1][0] < x) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(n - 1, i + 2)];
    const t = (x - k1[0]) / (k2[0] - k1[0]);
    const out = [];
    for (let j = 1; j < k1.length; j++) {
      const m1 = ((k2[j] - k0[j]) / (k2[0] - k0[0] || 1)) * (k2[0] - k1[0]);
      const m2 = ((k3[j] - k1[j]) / (k3[0] - k1[0] || 1)) * (k2[0] - k1[0]);
      const t2 = t * t, t3 = t2 * t;
      out.push((2 * t3 - 3 * t2 + 1) * k1[j] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * k2[j] + (t3 - t2) * m2);
    }
    return out;
  };
}

// superellipse point: angle a (0 = +Z front, increasing toward +X), radii, exponent
function se(a, rx, rz, e) {
  const c = Math.cos(a), s = Math.sin(a);
  const pz = Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
  const px = Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
  return [px * rx, pz * rz];
}

class Builder {
  constructor(boneIndex) {
    this.pos = []; this.col = []; this.si = []; this.sw = []; this.idx = []; this.hair = []; this.mat = []; this.brow = []; this.blink = []; this.sway = [];
    this.bi = boneIndex;
    this.parts = [];
    this.fields = {}; // extra distance fields parts register for smooth unions
    this.unions = {}; // and which neighbours they blend with
  }
  // tag the vertices that follow as one body part (for the smooth-union pass)
  mark(name) { this.parts.push({ name, start: this.pos.length / 3 }); }
  vert(x, y, z, color, weights, hair = -1, mat = MAT.cloth, brow = -1, blink = 0, sway = 0) {
    this.pos.push(x, y, z);
    this.sway.push(sway);
    this.hair.push(hair);
    this.brow.push(brow);
    this.blink.push(blink);
    this.mat.push(mat);
    this.col.push(color.r, color.g, color.b);
    // keep the 4 strongest influences, normalised (allocation-free top-4)
    const ib = this._ib || (this._ib = new Int32Array(4)), wb = this._wb || (this._wb = new Float64Array(4));
    let n = 0;
    for (const key in weights) {
      const v = weights[key];
      if (!(v > 1e-4)) continue;
      let j = n < 4 ? n++ : 4;
      if (j === 4) { if (v <= wb[3]) continue; j = 3; }
      while (j > 0 && wb[j - 1] < v) { wb[j] = wb[j - 1]; ib[j] = ib[j - 1]; j--; }
      wb[j] = v; ib[j] = this.bi[key];
    }
    let sum = 0;
    for (let i = 0; i < n; i++) sum += wb[i];
    sum = sum || 1;
    for (let i = 0; i < 4; i++) {
      this.si.push(i < n ? ib[i] : 0);
      this.sw.push(i < n ? wb[i] / sum : 0);
    }
    return this.pos.length / 3 - 1;
  }
  // rings: [{ pts: [[x,y,z]...], color(i)|Color, weights(x,y,z) }], all rings the same length
  loft(rings, { capStart = false, capEnd = false, flip = false } = {}) {
    const N = rings[0].pts.length;
    const base = [];
    for (const r of rings) {
      if (r.mark) this.mark(r.mark);
      const start = this.pos.length / 3;
      r.pts.forEach((p, i) => {
        const c = typeof r.color === 'function' ? r.color(i, p) : r.color;
        const mt = r.mat === undefined ? MAT.cloth : typeof r.mat === 'function' ? r.mat(i, p) : r.mat;
        this.vert(p[0], p[1], p[2], c, r.weights(p[0], p[1], p[2]), r.hair ? r.hair[i] : -1, mt, r.brow ? r.brow[i] : -1, r.blink ? r.blink[i] : 0, r.sway ? r.sway[i] : 0);
      });
      base.push(start);
    }
    for (let j = 0; j < rings.length - 1; j++) {
      for (let i = 0; i < N; i++) {
        const a = base[j] + i, b = base[j] + ((i + 1) % N), c = base[j + 1] + i, d = base[j + 1] + ((i + 1) % N);
        if (flip) this.idx.push(a, b, c, b, d, c);
        else this.idx.push(a, c, b, b, c, d);
      }
    }
    const cap = (ring, start, end) => {
      const cx = ring.pts.reduce((s, p) => s + p[0], 0) / N;
      const cy = ring.pts.reduce((s, p) => s + p[1], 0) / N;
      const cz = ring.pts.reduce((s, p) => s + p[2], 0) / N;
      const c = typeof ring.color === 'function' ? ring.color(0, [cx, cy, cz]) : ring.color;
      const cm = ring.mat === undefined ? MAT.cloth : typeof ring.mat === 'function' ? ring.mat(0, [cx, cy, cz]) : ring.mat;
      const ci = this.vert(cx, cy, cz, c, ring.weights(cx, cy, cz), ring.hair ? ring.hair.reduce((a, b) => a + b, 0) / N : -1, cm);
      for (let i = 0; i < N; i++) {
        const a = start + i, b = start + ((i + 1) % N);
        if (end !== flip) this.idx.push(a, ci, b); else this.idx.push(a, b, ci);
      }
    };
    if (capStart) cap(rings[0], base[0], false);
    if (capEnd) cap(rings[rings.length - 1], base[rings.length - 1], true);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setAttribute('hairD', new THREE.Float32BufferAttribute(this.hair, 1));
    g.setAttribute('matId', new THREE.Float32BufferAttribute(this.mat, 1));
    g.setAttribute('browD', new THREE.Float32BufferAttribute(this.brow, 1));
    g.setAttribute('sway', new THREE.Float32BufferAttribute(this.sway, 1));
    // blink: lids close by moving skin forward over the eyeballs (a relative morph)
    const blink = new Float32Array(this.pos.length);
    for (let i = 0; i < this.blink.length; i++) blink[i * 3 + 2] = this.blink[i];
    g.morphAttributes.position = [new THREE.Float32BufferAttribute(blink, 3)];
    g.morphTargetsRelative = true;
    g.setIndex(this.idx);
    g.computeVertexNormals();
    return g;
  }
}

export function buildRig(spec) {
  const layout = boneLayout(spec);
  const bones = {};
  const list = [];
  for (const b of layout) {
    const bone = new THREE.Bone();
    bone.name = b.name;
    bone.userData.rest = new THREE.Vector3(...b.pos);
    if (b.parent) {
      bones[b.parent].add(bone);
      bone.position.copy(bone.userData.rest).sub(bones[b.parent].userData.rest);
    } else bone.position.copy(bone.userData.rest);
    bones[b.name] = bone;
    list.push(bone);
  }
  // eye bones at the eyeball centres, so the gaze can move
  const H = headModel(spec);
  for (const e of H.eyes) {
    const bone = new THREE.Bone();
    bone.name = e.k > 0 ? 'leftEye' : 'rightEye';
    bone.userData.rest = new THREE.Vector3(e.x, H.cy + e.y, H.cz + e.z);
    bones.head.add(bone);
    bone.position.copy(bone.userData.rest).sub(bones.head.userData.rest);
    bones[bone.name] = bone;
    list.push(bone);
  }
  return { bones, list, index: Object.fromEntries(list.map((b, i) => [b.name, i])) };
}

// The body's cross-sections, shared by the mesh and by the gait solver's
// collision checks, so clearance is measured against the real surface.
//   torso(y)     → [halfWidth, halfDepth, zCentre, exponent] at rest height y
//   leg(t)       → [rx, rz, zc] in metres, t = 0 hip joint … 1 ankle
export function bodyShape(spec) {
  const c = spec.c, u = spec.u;
  const g = c.build, m = c.muscle, f = c.sex ?? 0;
  const kneeT = spec.thigh / spec.legLen;
  const torsoKeys = [
    // y,                         halfW,                      halfD,           zc,      exp
    [spec.hipJointY - 0.075 * u, 0.060 * g,                  0.058 * g,       -0.006, 2.2],
    [spec.hipJointY - 0.035 * u, 0.125 * g * c.hips,         0.086 * g,       -0.008, 2.5],
    [spec.hipJointY + 0.005 * u, 0.166 * g * c.hips,         0.102 * g,       -0.010, 2.6],
    [spec.hipsY + 0.040 * u,     0.160 * g * c.hips,         0.106 * g,       -0.006, 2.6],
    [spec.spineY + 0.050 * u,    0.142 * g * lerp(c.hips, c.shoulders, 0.4), 0.100 * g, 0.004, 2.4],
    [spec.spine1Y + 0.010 * u,   0.150 * g * lerp(1, c.shoulders, 0.6), 0.108 * g, 0.004, 2.3],
    [spec.spine2Y - 0.010 * u,   0.165 * c.shoulders * lerp(1, g, 0.7), (0.116 + 0.008 * m) * g, 0.014, 2.3],
    [spec.shoulderY - 0.085 * u, 0.200 * c.shoulders * lerp(1, g, 0.6), (0.114 + 0.006 * m) * g, 0.008, 2.4],
    [spec.shoulderY - 0.030 * u, 0.222 * c.shoulders * lerp(1, g, 0.5), 0.098 * g,       -0.004, 2.6],
    [spec.shoulderY + 0.006 * u, 0.192 * c.shoulders * lerp(1, g, 0.5), 0.078 * g,       -0.016, 2.45], // a little rounder on top
    [spec.shoulderY + 0.024 * u, 0.098 * lerp(1, g, 0.5),    0.068 * g,       -0.018, 2.3], // trapezius
    [spec.neckY + 0.012 * u,     0.068 * lerp(1, g, 0.5),    0.062 * lerp(1, g, 0.5), -0.018, 2.0],
  ].map(([y, w, d, z, e], i) => {
    // female: narrower waist and upper torso, fuller hips and glutes
    const wf = [1, 1.02, 1.03, 1, 0.87, 0.94, 0.95, 0.95, 0.96, 0.97, 0.97, 0.9][i] ?? 1;
    const df = [1, 1.07, 1.08, 1.03, 0.97, 1, 1, 1, 1, 1, 1, 0.9][i] ?? 1;
    const zf = [0, -0.006, -0.010, -0.004, 0, 0, 0, 0, 0, 0, 0, 0][i] ?? 0;
    return [y, w * u * lerp(1, wf, f), d * u * lerp(1, df, f), (z + zf * f) * u, e];
  });
  const legKeys = [
    // the top of the thigh carries the buttock, so hip flows into leg
    [-0.07, 0.070, 0.088, -0.022],
    [-0.02, 0.086, 0.104, -0.026],
    [0.06, 0.088, 0.097, -0.012],
    [0.20, 0.078, 0.080, 0.010],
    [0.36, 0.066, 0.068, 0.010],
    [kneeT - 0.02, 0.056, 0.058, 0.010],
    [kneeT + 0.06, 0.053, 0.057, 0.000],
    [kneeT + 0.16, 0.055 + 0.006 * m, 0.060 + 0.004 * m, -0.010],
    [0.80, 0.050, 0.052, -0.004],
    [0.97, 0.050, 0.053, 0.000],
    [1.0, 0.051, 0.054, 0.000],
  ];
  const legRaw = profile(legKeys);
  // arms: t from the shoulder joint (0) to the wrist (1)
  const elbowT = spec.upperArm / (spec.upperArm + spec.foreArm);
  const armKeys = [
    // t (0 shoulder → 1 wrist), rx, rz, zc
    [0.02, (0.055 + 0.006 * m) * g, (0.056 + 0.004 * m) * g, 0.002],
    [0.17, (0.048 + 0.006 * m) * g, (0.052 + 0.003 * m) * g, 0.004],
    [0.33, (0.042 + 0.003 * m) * g, (0.046 + 0.004 * m) * g, 0.006],
    [elbowT - 0.04, 0.035 * g, 0.038 * g, 0.000],
    [elbowT + 0.02, 0.036 * g, 0.039 * g, -0.002],
    [elbowT + 0.12, (0.037 + 0.003 * m) * g, 0.039 * g, 0.002],
    [0.86, 0.025 * lerp(1, g, 0.6), 0.030 * lerp(1, g, 0.6), 0.000],
    [0.95, 0.0208 * lerp(1, g, 0.45), 0.0283 * lerp(1, g, 0.45), 0.000], // eases into the wrist
    [1.0, 0.020 * lerp(1, g, 0.4), 0.028 * lerp(1, g, 0.4), 0.000],
  ];
  const armRaw = profile(armKeys);
  const sleeveT = 0.36;
  const legGirth = (t) => (t < kneeT + 0.1 ? g : lerp(g, 1, 0.4)) * (1 + f * (t < 0.3 ? 0.05 * (1 - t / 0.3) : t > kneeT + 0.05 ? -0.08 : 0));
  return {
    torsoKeys,
    torso: profile(torsoKeys),
    legRaw,
    legGirth,
    leg: (t) => { const [rx, rz, zc] = legRaw(t); const gg = legGirth(t); return [rx * u * gg, rz * u * gg, zc * u]; },
    armRaw, elbowT, sleeveT,
    arm: (t) => {
      const [rx, rz, zc] = armRaw(t);
      const puff = t < sleeveT ? 0.004 * u : 0;
      return [rx * u * (1 - 0.12 * f) + puff, rz * u * (1 - 0.1 * f) + puff, zc * u];
    },
    // neck: t from its base (0, inside the chest) to the skull (1)
    neckY0: spec.neckY - 0.02 * u, neckY1: spec.headY + 0.035 * u,
    neck: (t) => {
      const base = 1 + 0.22 * Math.pow(1 - t, 3); // flares into the shoulders
      return [(0.056 - 0.006 * t) * base * u * lerp(1, g, 0.5) * (1 - 0.14 * f),
              (0.058 - 0.004 * t) * (1 + 0.08 * Math.pow(1 - t, 3)) * u * lerp(1, g, 0.5) * (1 - 0.1 * f),
              -0.022 * u + 0.018 * u * t]; // leans forward
    },
    kneeT,
  };
}

export function buildBody(spec, rig, { draft = false } = {}) {
  Q = draft ? 0.45 : 1;
  const c = spec.c, u = spec.u;
  const B = new Builder(rig.index);
  B.su = u; // unions registered in metres are stored relative to the body scale
  const col = {
    skin: new THREE.Color(c.skin), hair: new THREE.Color(c.hair), shirt: new THREE.Color(c.shirt),
    pants: new THREE.Color(c.pants), shoes: new THREE.Color(c.shoes),
  };
  col.sole = col.shoes.clone().multiplyScalar(0.55).lerp(new THREE.Color('#3a3530'), 0.5);
  col.lace = col.shoes.clone().multiplyScalar(0.82);
  col.skinShade = col.skin.clone().multiplyScalar(0.86);
  col.lip = col.skin.clone().lerp(new THREE.Color('#9a4a40'), 0.35);
  col.brow = col.hair.clone().lerp(col.skin, 0.35);
  col.eye = new THREE.Color('#2a211c');
  col.flush = col.skin.clone().lerp(new THREE.Color('#c0544a'), 0.22);
  col.nostril = col.skin.clone().multiplyScalar(0.62);
  col.lash = col.hair.clone().lerp(new THREE.Color('#120d0a'), 0.6);
  col.iris = new THREE.Color(c.eyes || '#5b4030');
  col.irisInner = col.iris.clone().lerp(new THREE.Color('#c79a4a'), 0.35);
  col.pupil = new THREE.Color('#070606');
  col.sclera = new THREE.Color('#ddd4c6'); // never pure white: eyes are wet, warm and shadowed by the lids
  col.scleraEdge = new THREE.Color('#c9ab9c');
  col.collar = col.shirt.clone().multiplyScalar(0.8);
  col.belt = col.pants.clone().multiplyScalar(0.6);
  const g = c.build;           // girth
  const m = c.muscle;          // 0 … 1
  const f = c.sex ?? 0;        // 0 male … 1 female
  const SEG = qn(56, 16);

  // ── torso ─────────────────────────────────────────────────────────────
  B.mark('torso');
  const shirtEnd = spec.hipsY + 0.035 * u;
  const shape = bodyShape(spec);
  const torsoKeys = shape.torsoKeys;
  const torsoP = shape.torso;
  const torsoW = (x, y) => torsoWeights(spec, x, y);
  const y0 = torsoKeys[0][0], y1 = torsoKeys[torsoKeys.length - 1][0];
  const rings = [];
  const NR = qn(84, 24);
  const collarY = spec.neckY - 0.004 * u;
  // colour edges get a doubled ring so hems are crisp, not smeared
  const edges = [shirtEnd - 0.022 * u, shirtEnd, collarY, collarY + 0.012 * u];
  const ys = [];
  for (let j = 0; j <= NR; j++) ys.push(lerp(y0, y1, j / NR));
  for (const e of edges) ys.push(e - 0.0004 * u, e + 0.0004 * u);
  ys.sort((a, b) => a - b);
  for (const y of ys) {
    const [hw, hd, zc, e] = torsoP(y);
    const pts = [];
    for (let i = 0; i < SEG; i++) {
      const a = (i / SEG) * TAU;
      let [px, pz] = se(a, hw, hd, e);
      // shoulder blades and a hint of chest
      const back = Math.max(0, -Math.cos(a));
      const front = Math.max(0, Math.cos(a));
      const blade = Math.exp(-Math.pow((y - (spec.shoulderY - 0.1 * u)) / (0.07 * u), 2));
      pz -= back * blade * 0.012 * u * Math.pow(Math.abs(Math.sin(a)), 0.5);
      const pec = Math.exp(-Math.pow((y - (spec.shoulderY - 0.11 * u)) / (0.05 * u), 2)) * (0.002 + 0.005 * m);
      pz += front * pec * Math.pow(Math.abs(Math.sin(a * 1)), 0.6) * u * (1 - f);
      // bust: two soft volumes with a gentle cleavage, falling off faster above
      if (f > 0) {
        const by = y - (spec.shoulderY - 0.16 * u);
        const vy = Math.exp(-Math.pow(by / ((by > 0 ? 0.065 : 0.04) * u), 2));
        const lobe = Math.exp(-Math.pow((Math.abs(px) - 0.055 * u) / (0.068 * u), 2)); // soft, not a deep crease
        pz += f * 0.034 * u * vy * lobe * Math.pow(front, 1.3) * lerp(1, g, 0.5);
      }
      // spine groove
      pz += back * Math.exp(-Math.pow(Math.sin(a) / 0.12, 2)) * 0.006 * u * (y > spec.hipsY ? 1 : 0);
      pts.push([px, y, pz + zc]);
    }
    const isShirt = y > shirtEnd;
    rings.push({
      pts,
      mat: (i, p) => (p[1] > collarY + 0.012 * u ? MAT.skin : MAT.cloth),
      color: (i, p) => {
        if (p[1] > collarY) return p[1] > collarY + 0.012 * u ? col.skin : col.collar;
        if (!isShirt) return p[1] > shirtEnd - 0.022 * u ? col.belt : col.pants;
        return col.shirt;
      },
      weights: torsoW,
    });
  }
  B.loft(rings, { capStart: true, capEnd: true, flip: true }); // rings run upward; closed at the collar

  // ── neck ──────────────────────────────────────────────────────────────
  B.mark('neck');
  {
    const r = [];
    const n0 = shape.neckY0, n1 = shape.neckY1;
    const NN = qn(14, 5);
    for (let j = 0; j <= NN; j++) {
      const t = j / NN, y = lerp(n0, n1, t);
      const [rx, rz, zc] = shape.neck(t);
      const pts = [];
      for (let i = 0; i < SEG; i++) {
        const [px, pz] = se((i / SEG) * TAU, rx, rz, 2);
        pts.push([px, y, pz + zc]);
      }
      r.push({ pts, mat: MAT.skin, color: col.skin, weights: () => ({ neck: 1 - smooth(t * 1.2 - 0.2), head: smooth(t * 1.2 - 0.2) }) });
    }
    B.loft(r, { flip: true });
  }

  // ── head ──────────────────────────────────────────────────────────────
  B.mark('head');
  buildHead(B, spec, col);
  B.mark('other');
  if (c.hairLength >= 0.35) buildHairFall(B, spec, c.hairLength * 0.55); // inner volume, ending well above the lock tips

  // ── arms ──────────────────────────────────────────────────────────────
  for (const [side, k] of [['left', 1], ['right', -1]]) {
    const x0 = k * spec.armX, z0 = -0.008 * u;
    const top = spec.shoulderY - 0.012 * u;
    const ua = spec.upperArm, fa = spec.foreArm, total = ua + fa;
    const elbowT = ua / total;
    const sleeveT = 0.36;
    const P = shape.armRaw;
    B.mark(`arm_${side}`);
    const r = [];
    const ts = [];
    const NA = qn(72, 20);
    for (let j = 0; j <= NA; j++) ts.push(lerp(0.045, 1.0, j / NA));
    // the top of the arm closes in a smooth dome standing on its first ring
    // (same width, matching slope), so the tube has no rim to show on the
    // shoulder; the torso's shoulder covers it and the unions blend the rest
    {
      const tj = 0.045, d = tj * total;
      const [rx0, rz0, zc0] = P(tj);
      const puff = 0.004 * u;
      const sx = rx0 * u * (1 - 0.12 * f) + puff, sz = rz0 * u * (1 - 0.1 * f) + puff;
      const h = 0.4 * Math.max(sx, sz); // a low cap that stays under the torso's shoulder
      const NC = qn(12, 5);
      const w = armWeights(side, 0.0, elbowT);
      for (let j = 1; j <= NC; j++) {
        const th = (1 - j / (NC + 1)) * Math.PI / 2; // 0 at the ring … π/2 at the pole
        const c = Math.cos(th);
        const pts = [];
        for (let i = 0; i < SEG; i++) {
          const [qx, qz] = se((i / SEG) * TAU, sx * c, sz * c, 2.1);
          pts.push([x0 + qx, top - d + h * Math.sin(th), z0 + qz + zc0 * u]);
        }
        r.unshift({ pts, mat: MAT.cloth, color: col.shirt, weights: () => w });
      }
      r.reverse(); // pole first, ring last
    }
    for (const t of ts) {
      const [rx, rz, zc] = P(t);
      const sleeve = t < sleeveT;
      const puff = sleeve ? 0.004 * u : 0;
      const y = top - t * total;
      const pts = [];
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * TAU;
        const [px, pz] = se(a, rx * u * (1 - 0.12 * f) + puff, rz * u * (1 - 0.1 * f) + puff, 2.1); // = shape.arm(t)
        pts.push([x0 + px, y, z0 + pz + zc * u]);
      }
      const w = armWeights(side, t, elbowT);
      r.push({ pts, mat: sleeve ? MAT.cloth : MAT.skin, color: sleeve ? (t > sleeveT - 0.03 ? col.collar : col.shirt) : col.skin, weights: () => w });
    }
    // the palm continues the same loft: one surface from shoulder to knuckles
    const hand = buildHand(B, spec, col, side, k, x0, top - total, z0, SEG);
    r.push(...hand.rings);
    B.loft(r, { capStart: true, capEnd: true });
    B.mark('other');
    hand.digits();
  }

  // ── legs ──────────────────────────────────────────────────────────────
  for (const [side, k] of [['left', 1], ['right', -1]]) {
    const x0 = k * spec.hipSep * 0.5;
    const L = spec.legLen;
    const kneeT = spec.thigh / L;
    // trousers: anatomy underneath, cloth on top (never tighter than a
    // straight-leg cut below the knee)
    const P = shape.legRaw;
    B.mark(`leg_${side}`);
    const r = [];
    const NL = qn(84, 24);
    for (let j = 0; j <= NL; j++) {
      const t = lerp(-0.07, 1.0, j / NL); // starts below the shirt hem
      const [rx, rz, zc] = P(t);
      const gg = shape.legGirth(t);
      const y = spec.hipJointY - t * L;
      const pts = [];
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * TAU;
        let [px, pz] = se(a, rx * u * gg, rz * u * gg, 2.1);
        // inner thighs flatter where they meet
        if (px * k < 0 && t < 0.25) px *= lerp(0.86, 1, smooth(t / 0.25));
        pts.push([x0 + px, y, pz + zc * u]);
      }
      const w = legWeights(side, t, kneeT);
      const hem = t > 0.975;
      r.push({ pts, color: hem ? col.pants.clone().multiplyScalar(0.8) : col.pants, weights: () => w });
    }
    B.loft(r, { capEnd: true });
    B.mark('other');
    buildShoe(B, spec, col, side, k, x0);
  }

  const geo = B.geometry();
  smoothUnions(geo, B.parts, spec, shape, B);
  geo.computeVertexNormals();
  // One physical material; each surface kind (skin, cloth, hair, shoe, sole)
  // gets its own roughness, sheen and micro-detail in the shader, driven by
  // a per-vertex tag and the rest-pose position (so detail sticks to the body).
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.8, metalness: 0,
    sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.16, 0.16, 0.16),
  });
  const hairColor = { value: col.hair.clone() };
  const browColor = { value: col.hair.clone().lerp(col.skin, 0.12).multiplyScalar(0.85) };
  const hairSwing = { value: new THREE.Vector3() };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.hairColor = hairColor;
    sh.uniforms.hairSwing = hairSwing;
    sh.uniforms.browColor = browColor;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float hairD;\nattribute float matId;\nattribute float browD;\nattribute float sway;\nuniform vec3 hairSwing;\nvarying float vBrowD;\nvarying float vHairD;\nvarying float vMat;\nvarying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed += hairSwing * sway; // long hair lags the head\nvHairD = hairD;\nvBrowD = browD;\nvMat = matId;\nvRest = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 hairColor;
        uniform vec3 browColor;
        varying float vBrowD;
        varying float vHairD;
        varying float vMat;
        varying vec3 vRest;
        float wHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float wNoise(vec3 x) {
          vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(wHash(i), wHash(i + vec3(1,0,0)), f.x), mix(wHash(i + vec3(0,1,0)), wHash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(wHash(i + vec3(0,0,1)), wHash(i + vec3(1,0,1)), f.x), mix(wHash(i + vec3(0,1,1)), wHash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        // fade a pattern of the given frequency out before it can alias
        float wDetail(float freq) { return clamp(1.5 - length(fwidth(vRest)) * freq * 1.2, 0.0, 1.0); }
        float wMask(float id) { return clamp(1.0 - abs(vMat - id), 0.0, 1.0); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float hw = max(fwidth(vHairD), 1e-4) * 0.8;
        float hairM = max(smoothstep(-hw, hw, vHairD), wMask(2.0));
        float skinM = wMask(0.0) * (1.0 - hairM), clothM = wMask(1.0), shoeM = wMask(3.0), soleM = wMask(4.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, hairColor, hairM);
        // eyebrows: crisp edge from the distance field, broken up into hairs
        float bw = max(fwidth(vBrowD), 1e-5) * 1.2;
        float browM = smoothstep(-bw, bw, vBrowD) * (1.0 - hairM);
        float bhair = wNoise(vec3(vRest.x * 2600.0, vRest.y * 900.0, vRest.z * 2600.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, browColor * (0.92 + 0.16 * bhair * wDetail(2600.0)), browM * 0.85);
        float eyeM = wMask(5.0);
        // cloth: soft tonal drift plus a fine knit
        float knit = wNoise(vRest * vec3(900.0, 1300.0, 900.0));
        float drift = wNoise(vRest * 18.0);
        diffuseColor.rgb *= 1.0 + clothM * ((drift - 0.5) * 0.08 + (knit - 0.5) * 0.10 * wDetail(900.0));
        // hair: strands running down the head
        float strand = wNoise(vec3(vRest.x * 520.0, vRest.y * 26.0, vRest.z * 520.0));
        float clump = wNoise(vec3(vRest.x * 90.0, vRest.y * 8.0, vRest.z * 90.0));
        diffuseColor.rgb *= 1.0 + hairM * ((strand - 0.5) * 0.6 * wDetail(520.0) + (clump - 0.5) * 0.25);
        // skin: barely-there tone variation, warmer where blood is close
        diffuseColor.rgb *= 1.0 + skinM * (wNoise(vRest * 70.0) - 0.5) * 0.05;
        // shoes: a faint mesh texture on the upper
        diffuseColor.rgb *= 1.0 + shoeM * (wNoise(vRest * 1400.0) - 0.5) * 0.08 * wDetail(1400.0);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = skinM * 0.58 + clothM * 0.92 + hairM * 0.62 + shoeM * 0.58 + soleM * 0.78 + eyeM * 0.06;
        roughnessFactor += hairM * (strand - 0.5) * 0.3 * wDetail(520.0);`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        #ifdef USE_SHEEN
          // fabric's velvety rim; on skin a warm one, the cheap cousin of
          // subsurface scattering that keeps faces from reading as masks
          material.sheenColor = material.sheenColor * clothM + vec3(0.30, 0.09, 0.06) * skinM;
          material.sheenRoughness = mix(material.sheenRoughness, 0.35, skinM);
        #endif
        material.specularColor *= 1.0 - 0.75 * clothM - 0.35 * skinM;`);
  };
  mat.customProgramCacheKey = () => 'walker-body-v4';
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.userData.hairSwing = hairSwing;
  mesh.add(rig.list[0]);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(rig.list));
  return mesh;
}

function torsoWeights(s, x, y) {
  // piecewise-linear blend through the spine chain by height
  const stops = [
    ['hips', s.hipsY - 0.02 * s.u],
    ['spine', (s.spineY + s.spine1Y) / 2],
    ['spine1', (s.spine1Y + s.spine2Y) / 2],
    ['spine2', (s.spine2Y + s.neckY) / 2 + 0.02 * s.u],
    ['neck', s.neckY + 0.02 * s.u],
  ];
  const w = {};
  if (y <= stops[0][1]) w.hips = 1;
  else if (y >= stops[stops.length - 1][1]) w.neck = 1;
  else {
    for (let i = 0; i < stops.length - 1; i++) {
      const [a, ya] = stops[i], [b, yb] = stops[i + 1];
      if (y >= ya && y <= yb) {
        const t = smooth((y - ya) / (yb - ya));
        w[a] = 1 - t; w[b] = t;
      }
    }
  }
  // shoulders ride on the clavicles
  const ax = Math.abs(x);
  if (y > s.shoulderY - 0.12 * s.u) {
    const t = smooth((ax - 0.09 * s.u) / (0.08 * s.u)) * smooth((y - (s.shoulderY - 0.12 * s.u)) / (0.08 * s.u)) * 0.85;
    const side = x > 0 ? 'leftShoulder' : 'rightShoulder';
    for (const key in w) w[key] *= 1 - t;
    w[side] = (w[side] || 0) + t;
    // the deltoid cap swings with the upper arm
    const dt = smooth((ax - (s.armX - 0.035 * s.u)) / (0.04 * s.u)) * smooth((y - (s.shoulderY - 0.13 * s.u)) / (0.05 * s.u)) * 0.6;
    if (dt > 0) {
      const arm = x > 0 ? 'leftArm' : 'rightArm';
      for (const key in w) w[key] *= 1 - dt;
      w[arm] = (w[arm] || 0) + dt;
    }
  }
  // hips and buttocks follow the thighs a little
  if (y < s.hipJointY + 0.06 * s.u) {
    const t = smooth((s.hipJointY + 0.06 * s.u - y) / (0.12 * s.u)) * smooth((ax - 0.01 * s.u) / (0.09 * s.u)) * 0.45;
    const side = x > 0 ? 'leftUpLeg' : 'rightUpLeg';
    for (const key in w) w[key] *= 1 - t;
    w[side] = (w[side] || 0) + t;
  }
  return w;
}

function armWeights(side, t, elbowT) {
  const w = {};
  const sh = `${side}Shoulder`, ua = `${side}Arm`, fa = `${side}ForeArm`, hd = `${side}Hand`;
  if (t < 0.06) {
    const a = smooth((t + 0.1) / 0.16);
    w[sh] = 1 - a; w[ua] = a;
  } else if (t < elbowT - 0.045) w[ua] = 1;
  else if (t < elbowT + 0.045) {
    const a = smooth((t - (elbowT - 0.045)) / 0.09);
    w[ua] = 1 - a; w[fa] = a;
  } else if (t < 0.9) w[fa] = 1;
  else { const a = smooth((t - 0.9) / 0.1); w[fa] = 1 - a * 0.5; w[hd] = a * 0.5; } // a wide wrist: the bend spreads, no fold
  return w;
}

function legWeights(side, t, kneeT) {
  const w = {};
  const ul = `${side}UpLeg`, l = `${side}Leg`, f = `${side}Foot`;
  if (t < 0.04) {
    const a = smooth((t + 0.07) / 0.11);
    w.hips = (1 - a) * 0.85; w[ul] = 1 - w.hips;
  } else if (t < kneeT - 0.05) w[ul] = 1;
  else if (t < kneeT + 0.05) {
    const a = smooth((t - (kneeT - 0.05)) / 0.1);
    w[ul] = 1 - a; w[l] = a;
  } else if (t < 0.93) w[l] = 1;
  else { const a = smooth((t - 0.93) / 0.07); w[l] = 1 - a * 0.2; w[f] = a * 0.2; } // the hem hangs from the shin, not the foot
  return w;
}

// Face proportions for one character: standard adult values (metres, for a
// 1.75 m head scale), shifted by sex and by the "face" slider, which walks
// through smooth, independent variations so dragging it morphs one face
// into the next rather than jumping.
export function faceParams(c) {
  const f = c.sex ?? 0, t = (c.face ?? 0.5) * 10;
  const r = (k) => Math.sin(t * (1.3 + k * 0.71) + k * 2.17) * 0.6 + Math.sin(t * (0.53 + k * 0.29) + k * 4.1) * 0.4;
  const st = c.style ?? 0.7; // 0 realistic … 1 stylised (appeal over likeness)
  return {
    eyeX: 0.0315 * (1 + 0.04 * r(1)) * (1 + 0.05 * st),
    eyeY: 0.004 - 0.005 * st, // eyes a little lower reads younger and kinder
    eyeW: 0.0154 * (1 + 0.05 * f + 0.04 * r(2)) * (1 + 0.16 * st),
    eyeH: 0.0055 * (1 + 0.08 * f + 0.05 * r(3)) * (1 + 0.22 * st), // a relaxed eye: lids overlap the iris
    lidDrop: 0.0011 * (1 - 0.4 * st),
    eyeTilt: 0.10 + 0.08 * r(4) + 0.05 * f,
    browY: 0.0195 + 0.003 * f,
    browArch: 0.0035 + 0.0025 * f + 0.001 * r(5),
    browThick: 0.0098 * (1 - 0.3 * f) * (1 + 0.12 * r(6)),
    ridge: 0.0022 * (1 - 0.7 * f) * (1 + 0.3 * r(7)) * (1 - 0.8 * st),
    noseLen: 0.045 * (1 - 0.08 * f) * (1 + 0.08 * r(8)) * (1 - 0.2 * st),
    noseProj: 0.0175 * (1 - 0.12 * f) * (1 + 0.12 * r(9)) * (1 - 0.35 * st),
    noseW: 0.0170 * (1 - 0.10 * f) * (1 + 0.12 * r(10)) * (1 - 0.1 * st),
    // the mouth hangs from the nose base: a fixed upper-lip length (~22 mm in
    // men, ~20 in women, shorter when stylised) whatever the nose does
    mouthY: (0.004 - 0.005 * st + 0.004) - 0.045 * (1 - 0.08 * f) * (1 + 0.08 * r(8)) * (1 - 0.2 * st) * 0.82 - 0.011 - (0.0225 - 0.0025 * f - 0.003 * st),
    mouthW: 0.0245 * (1 + 0.07 * r(11)) * (1 - 0.08 * st),
    lips: (1.0 + 0.4 * f) * (1 + 0.15 * r(12)) * (1 - 0.45 * st), // stylised: colour, not sculpture
    chin: 0.0055 * (1 - 0.3 * f) * (1 + 0.4 * r(13)) * (1 - 0.5 * st),
    cheek: 0.003 * (1 + 0.3 * r(14)) * (1 + 0.2 * f) * (1 - 0.6 * st),
    st,
  };
}

const G2 = (x, y, sx, sy) => Math.exp(-(x * x) / (sx * sx) - (y * y) / (sy * sy));

// Non-uniform sampling: put the head's vertices where the face is.
function warp(n, density) {
  const N = 2000, cum = [0];
  for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + density((i - 0.5) / N));
  const tot = cum[N], out = [];
  let k = 0;
  for (let j = 0; j < n; j++) {
    const target = (j / n) * tot;
    while (cum[k + 1] < target) k++;
    out.push((k + (target - cum[k]) / (cum[k + 1] - cum[k])) / N);
  }
  return out;
}

// half-width of the lower face (fraction of the head's half-width) at depth
// t = −y below the head's centre (0 … 1)
const JAW = [profile([[0, 1], [0.35, 0.925], [0.62, 0.81], [0.82, 0.585], [0.94, 0.40], [1, 0.28]]),
             profile([[0, 1], [0.35, 0.915], [0.62, 0.765], [0.82, 0.54], [0.94, 0.37], [1, 0.26]])];
const JAW_SOFT = profile([[0, 1], [0.35, 0.95], [0.62, 0.86], [0.82, 0.68], [0.94, 0.48], [1, 0.34]]);
function jawWidth(t, fem, st = 0) {
  // a spline, so the outline has no ripples where the keys join; stylised = rounder
  return lerp(lerp(JAW[0](t)[0], JAW[1](t)[0], fem), JAW_SOFT(t)[0], st * 0.7);
}

// The head's measurements: skull, facial relief and where the eyes sit.
// Shared by the mesh (buildHead) and the rig (eye bones), cached per spec.
const _heads = new WeakMap();
export function headModel(s) {
  if (_heads.has(s)) return _heads.get(s);
  const u = s.u, hs = s.c.head, sc = u * hs;
  const F = faceParams(s.c), fem = s.c.sex ?? 0, st = s.c.style ?? 0.7;
  const cy = s.headY + 0.094 * sc, cz = 0.026 * u; // skull sits forward of the neck
  const rx = 0.080 * sc, ry = 0.116 * sc, rz = 0.101 * sc;
  const re = 0.0118 * sc * (1 + 0.16 * st); // eyeball radius; a stylised face carries bigger eyes
  const L = s.c.hairLength ?? 0;
  const CAP = L < 0.06 ? 0.05 : 0.03; // scalp hair thickness under the locks
  // hairline: a real forehead (~5–6 cm above the brows); short hair recedes a
  // little at the temples. fn: −1 back … 1 front, normalised height y.
  const hairlineOf = (a, fn) => {
    const longish = smooth(L / 0.6);
    const temple = 0.05 * (1 - longish) * Math.exp(-Math.pow((Math.abs(Math.sin(a)) - 0.45) / 0.28, 2));
    return lerp(-0.42, lerp(0.64, 0.58, longish), smooth((fn + 1) / 2)) - 0.16 * Math.pow(Math.abs(Math.sin(a)), 3) * smooth(fn + 0.2) + temple * smooth(fn);
  };

  // base skull + jaw (no facial features), normalised sphere angles in
  function skull(a, phi) {
    const rr = Math.sin(phi);
    let x = Math.sin(a) * rr, z = Math.cos(a) * rr, y = Math.cos(phi);
    const jaw = smooth((-y - 0.05) / 0.9);
    // lower face: an explicit width profile (cheek → jaw → mandible angle →
    // broad chin) instead of the sphere's own taper, which reads as a V
    if (y < 0) {
      const target = jawWidth(-y, fem, st);
      x *= Math.min(1.7, target / Math.max(rr, 0.2));
    }
    z *= 1 - 0.04 * jaw;
    if (z > 0) z *= 1 - 0.05 - 0.05 * smooth((y - 0.45) / 0.55);
    // fill the forehead forward between brow and hairline: a sphere's curve
    // there reads as a sloping, ape-like brow; a human forehead stands upright
    if (z > 0 && y > 0) z *= 1 + 0.07 * smooth(y / 0.45) * (1 - smooth((y - 0.6) / 0.35)) * Math.pow(Math.max(0, Math.cos(a)), 2);
    z += 0.42 * Math.pow(Math.max(0, Math.cos(a)), 1.5) * smooth((-y - 0.1) / 0.75);
    if (z < 0) z *= 1 + 0.03 * smooth(y + 0.2);
    const fb = Math.cos(a); // front/back by azimuth: stable at the bottom pole, where z/rr is not
    // only the back of the underside tucks up toward the neck; the sides stay
    // down so the jaw keeps a square angle instead of a V
    y += 0.34 * smooth(-y) * smooth((-fb + 0.15) / 0.7) * smooth(-y - 0.1);
    return { x, y, z, rr, X: x * rx, Y: y * ry, Z: z * rz };
  }

  // facial relief in standard metres at face coords (X, Y), toward +Z
  function relief(X, Y) {
    const ax = Math.sqrt(X * X + 0.0025 * 0.0025); // smooth |X|: no crease down the midline
    let d = 0;
    const exo = ax - F.eyeX, eyo = Y - F.eyeY;
    const soft = 1 - 0.75 * F.st; // stylised faces lose creases and hollows
    d -= 0.0054 * (1 - 0.45 * F.st) * G2(exo, eyo, 0.018, 0.0125); // orbits
    d += F.ridge * G2(0, Y - F.browY + 0.002, 1, 0.0075) * smooth((0.06 - ax) / 0.02); // brow ridge
    d -= 0.0010 * G2(X, Y - F.eyeY - 0.006, 0.012, 0.007);     // nasion
    d -= 0.0015 * soft * G2(ax - 0.066, Y - 0.022, 0.014, 0.02); // temples
    d += F.cheek * G2(ax - 0.046, Y + 0.010, 0.017, 0.013);    // cheekbones
    d += (0.0026 + 0.0014 * fem + 0.003 * F.st) * G2(ax - 0.034, Y + 0.034, 0.022, 0.02); // soft malar pads under them
    d -= 0.0022 * soft * (1 - 0.6 * fem) * lerp(1.1, 0.4, smooth((s.c.build - 0.8) / 0.5)) * G2(ax - 0.044, Y + 0.050, 0.016, 0.018); // cheek hollows
    // nose: a ridge growing from the nasion to the tip, then the columella
    const yN = F.eyeY + 0.004, yT = yN - F.noseLen * 0.82, yS = yT - 0.011;
    if (Y < yN + 0.004 && Y > yS - 0.004) {
      const tt = clamp01((yN - Y) / (yN - yT));
      let proj = F.noseProj * (0.12 + 0.88 * Math.pow(tt, 1.25));
      if (Y < yT) proj *= smooth((Y - yS) / (yT - yS)) * 0.85 + 0.15 * smooth((Y - yS + 0.004) / 0.004);
      const w = lerp(0.0095, F.noseW * 0.45, Math.pow(tt, 1.2)); // a soft bridge, not a blade
      const q = Math.max(0, 1 - Math.pow(ax / w, 2));
      d += proj * Math.pow(q, 1.2) * smooth((Y - yS + 0.004) / 0.004);
    }
    d += 0.0035 * G2(X, Y - yT, 0.0075, 0.0075);               // tip bulb
    d += 0.0105 * (1 - 0.4 * F.st) * G2(ax - F.noseW * 0.5, Y - yT + 0.004, 0.0062, 0.0062); // alae
    d -= 0.0014 * soft * G2(ax - F.noseW * 0.72, Y - yT + 0.012, 0.0035, 0.014) * smooth((Y - F.mouthY) / 0.02); // alar crease
    // nasolabial folds
    const nlT = clamp01((yT - 0.004 - Y) / (yT - 0.004 - F.mouthY));
    d -= 0.0006 * soft * (1 - 0.5 * fem) * Math.exp(-Math.pow((ax - lerp(F.noseW * 0.75, F.mouthW * 1.25, nlT)) / 0.0045, 2)) * smooth((yT - Y) / 0.004) * smooth((Y - F.mouthY + 0.006) / 0.004);
    // philtrum and lips
    d -= 0.0011 * soft * G2(X, 0, 0.0035, 1) * smooth((yS - Y) / 0.003) * smooth((Y - F.mouthY - 0.004) / 0.003);
    const lw = (yy, w) => Math.max(0, 1 - Math.pow(ax / w, 2.2)) * G2(0, yy, 1, 1);
    d += 0.0040 * F.lips * lw((Y - F.mouthY - 0.0045) / 0.0048, F.mouthW);
    d += 0.0046 * F.lips * lw((Y - F.mouthY + 0.0055) / 0.0055, F.mouthW * 0.88);
    d -= 0.0014 * G2(0, Y - F.mouthY - 0.0022 * Math.pow(ax / F.mouthW, 2), 1, 0.0011) * smooth((F.mouthW * 1.05 - ax) / 0.004);  // mouth line, corners up a touch
    d -= 0.0026 * soft * G2(X, Y - F.mouthY + 0.017, 0.018, 0.005); // mentolabial sulcus
    // keep the mouth behind the nose-to-chin line (the orthodontists' E-line):
    // a forward mouth is a muzzle, and reads as ape rather than human
    d -= (0.0068 + 0.0035 * fem) * G2(X, Y - F.mouthY + 0.001, 0.032, 0.016);
    d += F.chin * G2(X, Y + 0.098, 0.022, 0.013);             // chin
    return d;
  }

  // where the eyeballs sit: just under the hollowed orbit surface
  const eyes = [1, -1].map((k) => {
    const ex = k * F.eyeX * sc, ey = F.eyeY * sc;
    // find the skull+relief surface depth at the eye position
    let best = null;
    for (let i = -40; i <= 40; i++) for (let j = 0; j <= 60; j++) {
      const a = (i / 40) * 0.9, phi = 0.9 + (j / 60) * 0.9;
      const p = skull(a, phi);
      const dd = Math.hypot(p.X - ex, p.Y - ey);
      if (!best || dd < best.dd) best = { dd, Z: p.Z + relief(p.X / sc, p.Y / sc) * sc };
    }
    return { k, x: ex, y: ey, z: best.Z + 0.0012 * sc - re };
  });
  const H = { u, hs, sc, F, fem, st, cy, cz, rx, ry, rz, re, L, CAP, hairlineOf, skull, relief, eyes };
  _heads.set(s, H);
  return H;
}

function buildHead(B, s, col) {
  const { u, hs, sc, F, fem, st, cy, cz, rx, ry, rz, re, L, CAP, hairlineOf, skull, relief, eyes } = headModel(s);
  const eyeAt = (X) => eyes[X > 0 ? 0 : 1];

  // sampling: dense across the face, sparse over the back of the skull
  // extra rows through the brow/eye band so thin brows never alias into dashes
  const vs = warp(qn(124, 40), (v) => 1 + 2.2 * Math.exp(-Math.pow((v - 0.56) / 0.17, 2)) + 1.6 * Math.exp(-Math.pow((v - 0.45) / 0.05, 2)));
  const as = warp(qn(152, 48), (t) => { const dd = Math.min(t, 1 - t); return 1 + 3.2 * Math.exp(-Math.pow(dd / 0.13, 2)); });
  const rings = [];
  for (let j = 1; j < vs.length; j++) {
    const phi = vs[j] * Math.PI;
    const pts = [], colors = [], hair = [], brow = [], blink = [];
    for (let i = 0; i < as.length; i++) {
      const a = as[i] * TAU;
      const p = skull(a, phi);
      let { X, Y, Z } = p;
      const { x, y, z, rr } = p;
      // face detail lives on the face; it fades under the chin, where every
      // azimuth converges on one point and a forward push would tear a notch
      const front = smooth((Math.cos(a) - 0.15) / 0.5) * (phi < Math.PI / 2 ? 1 : smooth((Math.sin(phi) - 0.12) / 0.33));
      const Xs = X / sc, Ys = Y / sc;
      Z += relief(Xs, Ys) * sc * front;
      // eyes: an almond opening where the skin sits behind the eyeball, lids
      // wrapping its curve; the blink morph closes the lids over it
      let Zc = Z, lash = 0, lid = 0, crease = 0;
      if (front > 0.5) {
        const e = eyeAt(X);
        const dx = (X - e.x) / sc, dy = (Y - e.y) / sc;
        const ldx = dx * e.k; // + toward the outer corner
        const dyT = dy + F.lidDrop - F.eyeTilt * ldx; // outer corner a little higher; opening sits low on the ball
        const hh = F.eyeH * (dyT > 0 ? 1 : 0.8); // symmetric: the iris sits centred in the opening
        const q = Math.pow(dx / F.eyeW, 2) + Math.pow(dyT / hh, 2);
        const ballZ = e.z + Math.sqrt(Math.max(0, re * re - Math.pow(X - e.x, 2) - Math.pow(Y - e.y, 2)));
        if (q < 2.9) {
          // lids: skin that follows the ball's curve, a touch proud of it
          const rim = 1 - smooth(Math.min(1, (q - 1) / 1.0));
          const lidZ = ballZ + (dyT > 0 ? 0.0016 : 0.0009) * sc;
          const face = Z + (Math.max(Z, lidZ) - Z) * rim;
          // inside the opening the skin slips behind the ball; blended over a
          // band so the lid edge is a smooth curve, not a vertex staircase
          const open = 1 - smooth((q - 0.78) / 0.44);
          Z = face + (Math.min(face, ballZ - 0.0028 * sc) - face) * open;
          Zc = Math.max(face, ballZ + 0.0011 * sc * (0.5 + 0.5 * open));
          if (q < 1.6) { lash = dyT > 0 ? 1 - smooth((q - 0.95) / 0.6) : 0.3 * (1 - smooth((q - 0.95) / 0.3)); lid = 1; }
          // upper lid crease: a soft fold a few mm above the lash line
          if (dyT > 0) { crease = Math.exp(-Math.pow((q - 2.3) / 0.45, 2)); Z -= 0.0007 * sc * crease; Zc -= 0.0007 * sc * crease; }
        }
        if (q < 1) lid = 1;
      }
      const fn = z / (rr || 1);
      const hairline = hairlineOf(a, fn);
      const hairT = smooth((y - hairline) / 0.16 + 0.5);
      if (hairT > 0) {
        // the cap is the dense underlayer; locks on top give the silhouette
        const fh = 1 + hairT * CAP * smooth((y - hairline) / 0.45);
        X *= fh; Z *= fh; Zc *= fh; Y += 0.006 * u * smooth(y);
      }
      pts.push([X, cy + Y, cz + Z]);
      blink.push(Zc - Z);
      hair.push(y - hairline);
      // eyebrows as a distance field: thick at the head, tapering and arching
      const bt = (Math.abs(Xs) - 0.011) / 0.047;
      const by = F.browY + 0.0012 * (1 - clamp01(bt)) + F.browArch * Math.sin(Math.PI * clamp01(bt) * 0.8) - 0.0035 * bt * bt; // relaxed: inner heads never dip
      // rounded head at the inner end, tapering to a fine tail
      const bth = Math.max(0.0024, F.browThick * (1 - 0.45 * clamp01(bt)) * 0.5) * (0.35 + 0.65 * smooth((bt + 0.04) / 0.14)) * (0.3 + 0.7 * smooth((1.04 - bt) / 0.22));
      // continuous everywhere (a jump would smear brow colour down the face)
      brow.push(bth - Math.abs(Ys - by) - 0.05 * (Math.max(0, -bt) + Math.max(0, bt - 1)) - 0.05 * (1 - front));
      // colour: lips, a little warmth on nose and cheeks, lash lines, nostrils
      let c = col.skin.clone();
      if (front > 0.3) {
        const ax = Math.abs(Xs);
        const upper = Math.max(0, 1 - Math.pow(ax / F.mouthW, 2.4)) * smooth(1 - Math.abs(Ys - F.mouthY - 0.0045) / (0.0055 * Math.sqrt(F.lips)));
        const lower = Math.max(0, 1 - Math.pow(ax / (F.mouthW * 0.9), 2.4)) * smooth(1 - Math.abs(Ys - F.mouthY + 0.0055) / (0.0065 * Math.sqrt(F.lips)));
        c.lerp(col.lip, Math.min(1, (upper + lower) * 1.4) * 0.75);
        // a defined mouth line, curving up a touch at the corners
        const ml = Math.exp(-Math.pow((Ys - F.mouthY - 0.0022 * Math.pow(ax / F.mouthW, 2)) / 0.0010, 2)) * smooth((F.mouthW * 1.02 - ax) / 0.003);
        c.lerp(col.lip.clone().multiplyScalar(0.5), ml * 0.8);
        const yT = F.eyeY + 0.004 - F.noseLen * 0.82;
        c.lerp(col.flush, 0.5 * G2(ax - 0.045, Ys + 0.03, 0.02, 0.018) + 0.35 * G2(Xs, Ys - yT, 0.01, 0.01));
        const nostril = G2(ax - F.noseW * 0.24, Ys - yT + 0.0105, 0.0032, 0.0022) * (1 - 0.6 * st);
        c.lerp(col.nostril, Math.min(1, nostril * 1.3));
        if (lash > 0) c.lerp(col.lash, Math.min(1, lash * 0.95));
        if (crease > 0) c.lerp(col.flush.clone().multiplyScalar(0.78), crease * 0.35);
        else if (lid) c.multiplyScalar(0.92);
      }
      colors.push(c);
    }
    rings.push({ pts, hair, brow, blink, mat: MAT.skin, color: (i) => colors[i], weights: () => ({ head: 1 }) });
  }
  B.loft(rings, { capStart: true, capEnd: true });
  B.mark('other');

  // eyeballs: sclera, iris, pupil; glossy so they catch the light
  for (const e of eyes) {
    const look = new THREE.Vector3(0, -0.04, 1).normalize(); // rest gaze; the eye bones move it
    const eyeBone = e.k > 0 ? 'leftEye' : 'rightEye';
    const irisR = 0.55 + 0.1 * st, pupilR = 0.16 + 0.05 * st;
    // the catch-light: the window reflection that makes an eye read as alive
    const glint = new THREE.Vector3(-0.30, 0.34, 1).normalize(); // gaze a little down, slightly converged
    const qL = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), look);
    const R = qn(40, 14), S = qn(56, 16), er = [];
    for (let j = 1; j < R; j++) {
      const th = (j / R) * Math.PI;
      const pts = [], cols = [];
      for (let i = 0; i < S; i++) {
        const a = (i / S) * TAU;
        const v = new THREE.Vector3(Math.sin(th) * Math.sin(a), Math.sin(th) * Math.cos(a), Math.cos(th));
        // bulge of the cornea over the iris
        const ang = Math.acos(Math.min(1, v.z));
        const cornea = 1 + 0.06 * Math.max(0, Math.cos(Math.min(Math.PI / 2, ang * 2.6)));
        v.multiplyScalar(re * cornea).applyQuaternion(qL);
        pts.push([e.x + v.x, cy + e.y + v.y, cz + e.z + v.z]);
        let cc;
        const vl = v.clone().applyQuaternion(qL.clone().invert()).normalize();
        if (Math.acos(Math.min(1, vl.dot(glint))) < 0.11 + 0.05 * st) cc = new THREE.Color(2.2, 2.2, 2.1);
        else if (ang < pupilR) cc = col.pupil;
        else if (ang < irisR) cc = col.iris.clone().lerp(col.irisInner, smooth((0.42 - ang) / 0.2) * 0.6);
        else if (ang < irisR + 0.05) cc = col.iris.clone().multiplyScalar(0.55).lerp(col.sclera, smooth((ang - irisR) / 0.05) * 0.4); // soft limbal ring
        else cc = col.sclera.clone().lerp(col.scleraEdge, smooth((ang - 1.2) / 0.8));
        cols.push(cc);
      }
      er.push({ pts, mat: MAT.eye, color: (i) => cols[i], weights: () => ({ [eyeBone]: 1 }) });
    }
    // rings run from the front pole backward; flip to keep normals outward
    B.loft(er, { capStart: true, capEnd: true, flip: true });
  }

  // ears, unless long hair covers them
  if ((s.c.hairLength ?? 0) < 0.4) for (const k of [1, -1]) buildEar(B, s, col, k, cy, cz, skull, sc);
  if (L >= 0.06) buildHairLocks(B, s, col, { skull, hairlineOf, sc, cy, cz, rx, ry, rz, CAP });
}

// An ear: a thin shell with a rolled rim (helix), a hollow bowl (concha) and
// a soft lobe, set flat against the side of the head and tilted back.
// An ear: a flat shell set on the side of the head and tilted back, with a
// rolled rim (helix) around the top and back, a ridge inside it (antihelix),
// a hollow bowl (concha) in front of that, and a soft lobe. Its front edge is
// sunk into the head and blended there, so it grows out of the skull.
function buildEar(B, s, col, k, cy, cz, skull, sc) {
  let side = 0;
  for (let i = 0; i <= 60; i++) { const p = skull(k * Math.PI / 2 + (i / 60 - 0.5) * 0.6, Math.PI * 0.55); side = Math.max(side, Math.abs(p.X)); }
  const H = 0.062 * sc, W = 0.032 * sc, T = 0.016 * sc;
  const ec = new THREE.Vector3(k * (side - 0.001 * sc), cy - 0.02 * sc, cz - 0.016 * sc);
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.24);
  const flare = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), k * 0.5); // stands off the head toward the back
  const q = tilt.clone().premultiply(flare);
  const R = qn(22, 8), S = qn(36, 12), rings = [];
  // outline: a in [0, 2π) from the top, round the back, the lobe, up the front
  const outline = (a) => {
    const c = Math.cos(a), sn = Math.sin(a);
    let y = c * (c > 0 ? 1 : 0.86);           // fuller top, a smaller lobe
    let z = -sn * (sn > 0 ? 1 : 0.55);         // the back bulges, the front edge is near straight
    if (c < -0.4) z *= 0.78 + 0.22 * smooth((c + 1) / 0.6); // narrow lobe
    return [y * H * 0.5, z * W * 0.5 + 0.12 * W];
  };
  for (let j = 1; j < R; j++) {
    const th = (j / R) * Math.PI; // 0 outer face … π inner face
    const radial = Math.sin(th), outer = Math.cos(th) > 0;
    const pts = [], cols = [];
    for (let i = 0; i < S; i++) {
      const a = (i / S) * TAU;
      const [oy, oz] = outline(a);
      const back = Math.max(0, Math.sin(a)), up = Math.max(0, Math.cos(a));
      let ox;
      if (outer) {
        const rim = smooth((radial - 0.78) / 0.18) * (0.5 + 0.5 * Math.max(back, up));   // helix roll
        const ridge = Math.exp(-Math.pow((radial - 0.6) / 0.1, 2)) * (0.4 + 0.6 * back);  // antihelix
        const bowl = Math.exp(-Math.pow(radial / 0.42, 2)) * (0.4 + 0.6 * Math.max(0, -Math.cos(a) + 0.3)); // concha
        ox = 0.25 + 0.75 * rim + 0.35 * ridge - 0.55 * bowl;
      } else {
        ox = -0.45 * (0.6 + 0.4 * smooth((radial - 0.5) / 0.4)); // back of the ear: flat, thicker at the rim
      }
      const front = Math.max(0, -Math.sin(a)); // the front edge sinks into the head
      const v = new THREE.Vector3(k * (ox * T * 0.5 - front * radial * 0.35 * T), oy * radial, oz * radial).applyQuaternion(q);
      pts.push([ec.x + v.x, ec.y + v.y, ec.z + v.z]);
      const bowlShade = outer ? Math.exp(-Math.pow(radial / 0.5, 2)) : 0;
      cols.push(col.skin.clone().lerp(col.flush, 0.28 + 0.22 * smooth(radial - 0.6)).multiplyScalar(1 - 0.16 * bowlShade));
    }
    rings.push({ pts, mat: MAT.skin, color: (i) => cols[i], weights: () => ({ head: 1 }) });
  }
  const name = `ear_${k > 0 ? 'l' : 'r'}`;
  B.mark(name);
  B.loft(rings, { capStart: true, capEnd: true, flip: k > 0 });
  B.mark('other');
  // blend the ear's root into the head
  const inv = q.clone().invert();
  B.fields[name] = (x, y, z) => {
    const v = new THREE.Vector3(x - ec.x, y - ec.y, z - ec.z).applyQuaternion(inv);
    return (Math.hypot(v.x / (T * 0.5), v.y / (H * 0.5), (v.z - 0.12 * W) / (W * 0.5)) - 1) * T * 0.5;
  };
  const nearRoot = (x, y, z) => Math.hypot(x - ec.x, y - ec.y, z - ec.z) < 0.04 * sc;
  B.unions[name] = [['head', 0.012 / (B.su || 1), nearRoot]];
  B.unions.head = [...(B.unions.head || []), [name, 0.012 / (B.su || 1), nearRoot]];
}

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ── smooth unions ─────────────────────────────────────────────────────────
// The body is lofted part by part; where two parts meet they would cross at a
// hard crease and read as shapes stuck together. This pass gives every
// junction a fillet, as a sculptor's smooth union would: each vertex near a
// neighbouring part is pushed out onto smin(own surface, neighbour), using the
// same cross-sections the parts were lofted from as distance fields (rest pose).
function ellipseDist(x, z, rx, rz, e = 2) {
  const rho = Math.pow(Math.pow(Math.abs(x / rx), e) + Math.pow(Math.abs(z / rz), e), 1 / e);
  return Math.hypot(x, z) * (1 - 1 / Math.max(rho, 1e-6));
}
function partFields(s, sh) {
  const keys = sh.torsoKeys, ty0 = keys[0][0], ty1 = keys[keys.length - 1][0];
  const capped = (d, over) => (over > 0 ? Math.hypot(Math.max(d, 0), over) : d);
  const torso = (x, y, z) => {
    const yy = clamp(y, ty0, ty1);
    const [hw, hd, zc, e] = sh.torso(yy);
    return capped(ellipseDist(x, z - zc, hw, hd, e), Math.abs(y - yy));
  };
  const leg = (k) => (x, y, z) => {
    const t0 = (s.hipJointY - y) / s.legLen, t = clamp(t0, -0.07, 1);
    const [rx, rz, zc] = sh.leg(t);
    return capped(ellipseDist(x - k * s.hipSep * 0.5, z - zc, rx, rz, 2.1), Math.abs(t0 - t) * s.legLen);
  };
  const top = s.shoulderY - 0.012 * s.u, total = s.upperArm + s.foreArm;
  const arm = (k) => (x, y, z) => {
    const t0 = (top - y) / total, t = clamp(t0, 0.045, 1); // above: the ball-joint dome, as a capped end
    const [rx, rz, zc] = sh.arm(t);
    return capped(ellipseDist(x - k * s.armX, z - (-0.008 * s.u + zc), rx, rz, 2.1), Math.abs(t0 - t) * total);
  };
  const neck = (x, y, z) => {
    const t0 = (y - sh.neckY0) / (sh.neckY1 - sh.neckY0), t = clamp(t0, 0, 1);
    const [rx, rz, zc] = sh.neck(t);
    return capped(ellipseDist(x, z - zc, rx, rz), Math.abs(t0 - t) * (sh.neckY1 - sh.neckY0));
  };
  const H = headModel(s);
  const head = (x, y, z) => {
    const ex = x / H.rx, ey = (y - H.cy) / H.ry, ez = (z - H.cz) / H.rz;
    const rho = Math.hypot(ex, ey, ez);
    return (rho - 1) * Math.min(H.rx, H.ry, H.rz) * 0.95;
  };
  return { torso, neck, head, leg_left: leg(1), leg_right: leg(-1), arm_left: arm(1), arm_right: arm(-1) };
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
// which parts blend into which, how wide the fillet is (m, at 1.75 m), and
// where on this part a junction can be at all: parts that merely lie close in
// the rest pose (a hanging arm beside the hip) must not grow lumps
function unionsFor(s) {
  const top = s.shoulderY - 0.012 * s.u, total = s.upperArm + s.foreArm;
  const armT = (y) => (top - y) / total, legT = (y) => (s.hipJointY - y) / s.legLen;
  // only the outer shoulder blends into the arm; the chest and back stay as they are
  const nearShoulder = (x, y) => y > s.shoulderY - 0.12 * s.u && Math.abs(x) > s.armX - 0.045 * s.u;
  const nearHip = (x, y) => y < s.hipJointY + 0.1 * s.u;
  return {
    torso: [['neck', 0.02, (x, y) => y > s.shoulderY - 0.04 * s.u], ['arm_left', 0.065, (x, y) => x > 0 && nearShoulder(x, y)], ['arm_right', 0.065, (x, y) => x < 0 && nearShoulder(x, y)], ['leg_left', 0.05, nearHip], ['leg_right', 0.05, nearHip]],
    neck: [['torso', 0.02, () => true], ['head', 0.05, (x, y) => y > s.headY - 0.05 * s.u]],
    // the jaw's sides and back flow into the neck; under the chin there is a
    // real undercut, so the front stays clear
    head: [['neck', 0.045, (x, y, z) => y < s.headY + 0.05 * s.u && z < headModel(s).cz - 0.004 * s.u]],
    arm_left: [['torso', 0.065, (x, y) => armT(y) < 0.16]], arm_right: [['torso', 0.065, (x, y) => armT(y) < 0.16]],
    leg_left: [['torso', 0.05, (x, y) => legT(y) < 0.16], ['leg_right', 0.016, (x, y) => legT(y) < 0.14]],
    leg_right: [['torso', 0.05, (x, y) => legT(y) < 0.16], ['leg_left', 0.016, (x, y) => legT(y) < 0.14]],
  };
}
function smoothUnions(geo, parts, s, sh, B) {
  if (Q < 0.6) return; // drafts skip it: they only need to follow the slider
  const F = { ...partFields(s, sh), ...B.fields }, U = unionsFor(s);
  for (const name in B.unions) U[name] = [...(U[name] || []), ...B.unions[name]];
  geo.computeVertexNormals();
  const P = geo.attributes.position.array, N = geo.attributes.normal.array;
  const n = P.length / 3;
  const push = new Float32Array(n);
  const partOf = new Int16Array(n).fill(-1);
  for (let pi = 0; pi < parts.length; pi++) {
    const { name, start } = parts[pi];
    const end = pi + 1 < parts.length ? parts[pi + 1].start : n;
    const nb = U[name];
    if (!nb) continue;
    for (let i = start; i < end; i++) {
      partOf[i] = pi;
      const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
      let best = 0;
      for (const [other, k0, zone] of nb) {
        if (!zone(x, y, z)) continue;
        const k = k0 * s.u;
        const d = F[other](x, y, z);
        if (d <= 0 || d >= k) continue; // inside the other part (hidden) or too far to matter
        const h = (k - d) / k;
        best = Math.max(best, k * h * h * 0.25); // polynomial smin: how far the union surface sits outside
      }
      push[i] = best;
    }
  }
  // smooth the push over the mesh so fillets flow rather than step ring by ring
  const idx = geo.index.array, sum = new Float32Array(n), cnt = new Uint16Array(n);
  for (let it = 0; it < 6; it++) {
    sum.fill(0); cnt.fill(0);
    for (let t = 0; t < idx.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = idx[t + e], b = idx[t + (e + 1) % 3];
        if (partOf[a] < 0 || partOf[a] !== partOf[b]) continue;
        sum[a] += push[b]; cnt[a]++; sum[b] += push[a]; cnt[b]++;
      }
    }
    for (let i = 0; i < n; i++) if (cnt[i]) push[i] = 0.4 * push[i] + 0.6 * sum[i] / cnt[i];
  }
  for (let i = 0; i < n; i++) {
    const q = push[i];
    if (q > 1e-6) { P[i * 3] += N[i * 3] * q; P[i * 3 + 1] += N[i * 3 + 1] * q; P[i * 3 + 2] += N[i * 3 + 2] * q; }
  }
  geo.attributes.position.needsUpdate = true;
}
function vhash(x, y, z) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); }
function vnoise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = smooth(x - ix), fy = smooth(y - iy), fz = smooth(z - iz);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => vhash(ix + dx, iy + dy, iz + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), fx), L(c(0, 1, 0), c(1, 1, 0), fx), fy), L(L(c(0, 0, 1), c(1, 0, 1), fx), L(c(0, 1, 1), c(1, 1, 1), fx), fy), fz);
}

// Hair as locks: tapered ribbons grown from roots on the scalp, combed away
// from a parting, kept off the skull, bent by gravity, draped over the
// shoulders when long. Each lock gets its own tone; a sway weight lets the
// shader swing long hair with the walk.
function buildHairLocks(B, s, col, H) {
  const { skull, hairlineOf, sc, cy, cz, rx, ry, rz, CAP } = H;
  const u = s.u, L = s.c.hairLength ?? 0, fem = s.c.sex ?? 0;
  const long = L >= 0.35;
  const len = long ? (0.10 + 0.40 * (L - 0.35) / 0.65) * sc : (0.022 + 0.06 * (L - 0.06) / 0.29) * sc;
  const partX = (fem > 0.5 ? -1 : 1) * 0.024 * sc * (((s.c.face ?? 0.5) * 7) % 1 > 0.5 ? 1 : -1);
  const c = new THREE.Vector3(0, cy, cz);
  const rnd = (i, k) => vhash(i * 1.37, k * 7.1, 3.3);
  const N = qn(long ? 560 : 900, 160), K = qn(long ? 16 : 6, 4), RING = 5;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const neckR = 0.068 * sc, shoulderY = s.shoulderY + 0.03 * u;
  const grav = new THREE.Vector3(0, -1, 0);
  for (let i = 0; i < N; i++) {
    // even roots over the sphere (golden spiral), kept where hair grows
    const yy = 1 - (i + 0.5) / N * 1.6; // skip the very bottom of the sphere
    const phi = Math.acos(Math.max(-1, Math.min(1, yy)));
    const a = (i * golden) % TAU;
    const p0 = skull(a, phi);
    const fn = p0.z / (p0.rr || 1);
    if (p0.y < hairlineOf(a, fn) + 0.04) continue;
    if (L >= 0.06 && Math.abs(p0.X - (fem > 0.5 ? -1 : 1) * 0.024 * sc * (((s.c.face ?? 0.5) * 7) % 1 > 0.5 ? 1 : -1)) < 0.006 * sc && p0.z > -0.4 * p0.rr) continue; // the parting itself, front to crown
    const layer = 1 + CAP * 0.9 + 0.035 * rnd(i, 1); // roots inside the cap, at mixed depths
    const p = new THREE.Vector3(p0.X * layer, cy + p0.Y * layer, cz + p0.Z * layer);
    const off = long ? (CAP + 0.02 + 0.05 * rnd(i, 2)) * 1.2 : CAP + 0.004 + 0.012 * rnd(i, 2); // how far the lock floats over the skull
    // short hair shortens toward its hairline so nothing dangles at the nape
    const lockLen = len * (long ? 0.55 + 0.75 * Math.pow(rnd(i, 3), 0.8) : 0.75 + 0.5 * rnd(i, 3)) * (long ? 1 : 0.2 + 0.8 * smooth((p0.y - hairlineOf(a, fn)) / 0.5));
    const W0 = (long ? 0.017 : 0.011) * sc * (0.75 + 0.5 * rnd(i, 4));
    const TH = (long ? 0.0032 : 0.0022) * sc;
    const tone = long ? 0.8 + 0.32 * rnd(i, 5) : 0.95 + 0.08 * rnd(i, 5);
    const normalAt = (q) => new THREE.Vector3((q.x - c.x) / (rx * rx), (q.y - c.y) / (ry * ry), (q.z - c.z) / (rz * rz)).normalize();
    // combing: away from the part, down and back; long hair to the sides
    const side = Math.sign(p.x - partX) || 1;
    const nearPart = 1 - smooth(Math.abs(p.x - partX) / (0.03 * sc)); // close to the part: fall, don't fan
    let d = long ? new THREE.Vector3(side * 0.9, -0.5, -0.35) : new THREE.Vector3(side * 0.55, -0.25, -0.75);
    if (!long && p.z - cz > 0.3 * rz) d.set(side * 0.35, 0.15, -0.9); // short: front swept up and back
    d.y -= nearPart * 0.8; d.normalize();
    {
      // combed along the scalp; where the comb points almost straight out of
      // it (the crown), fall back to down-and-back so no lock shoots off
      const n0 = normalAt(p);
      d.addScaledVector(n0, -d.dot(n0));
      if (d.length() < 0.35) d.set(0, -1, -0.6).addScaledVector(n0, -new THREE.Vector3(0, -1, -0.6).dot(n0));
      d.normalize();
    }
    const path = [];
    for (let k = 0; k <= K; k++) {
      const t = k / K;
      const n = normalAt(p);
      if (k > 0) {
        // gravity takes over once the lock leaves the top of the head
        const g = long ? (p.y > cy - 0.15 * ry ? 0.25 : 0.9) : 0.05;
        d.addScaledVector(grav, g).normalize();
        p.addScaledVector(d, lockLen / K);
        // over the crown hair lies on its layer (combed flat by its own
        // weight); below the widest point it hangs free but never inside
        const e = new THREE.Vector3((p.x - c.x) / (rx * (1 + off)), (p.y - c.y) / (ry * (1 + off)), (p.z - c.z) / (rz * (1 + off)));
        const rho = e.length();
        const onTop = p.y > cy - 0.15 * ry;
        if ((rho < 1 && p.y > cy - 0.7 * ry) || (onTop && rho > 1)) {
          e.multiplyScalar(1 / rho);
          p.set(c.x + e.x * rx * (1 + off), c.y + e.y * ry * (1 + off), c.z + e.z * rz * (1 + off));
          d.addScaledVector(n, -d.dot(n)).normalize();
        }
        if (long) {
          // never across the face; around the neck; over the shoulders
          if (p.z > cz + 0.15 * rz && p.y < cy + 0.25 * ry && Math.abs(p.x) < 0.082 * sc) p.x = Math.sign(p.x || side) * 0.082 * sc;
          if (p.y < cy - 0.6 * ry) {
            const nx = p.x, nz = p.z - (cz - 0.02 * sc);
            const nr = Math.hypot(nx, nz);
            if (nr < neckR + 0.01 * sc) { p.x = nx / nr * (neckR + 0.01 * sc); p.z = cz - 0.02 * sc + nz / nr * (neckR + 0.01 * sc); }
          }
          const top = shoulderY - 0.22 * Math.max(0, Math.abs(p.x) - 0.06 * u);
          // meets the shoulder: eases down the back or onto the chest, each
          // lock at its own distance so the ends don't stack into a ledge
          const zc0 = cz - 0.02 * sc, depth = (0.105 + 0.03 * rnd(i, 7)) * u;
          if (p.y < top + 0.02 * u && Math.abs(p.z - zc0) < depth) {
            const back = p.z < zc0 + (rnd(i, 8) - 0.5) * 0.02 * u;
            const want = zc0 + (back ? -1 : 1) * depth;
            p.z += (want - p.z) * 0.55;
            p.y = Math.min(p.y, top + 0.02 * u);
            d.set(d.x * 0.4, -1, (back ? -1 : 1) * (0.1 + 0.15 * rnd(i, 9))).normalize();
          }
        }
      }
      const pp = p.clone();
      if (long && t > 0.8) pp.addScaledVector(normalAt(p), -0.006 * sc * smooth((t - 0.8) / 0.2)); // ends turn in a touch
      path.push({ p: pp, d: d.clone(), n: normalAt(p), t });
    }
    // ribbon rings: wide across the lock, thin off the scalp, tapering to a tip
    const rings = [];
    for (const { p: q, d: dd, n, t } of path) {
      const nn = n.clone().addScaledVector(dd, -n.dot(dd)).normalize();
      const xx = new THREE.Vector3().crossVectors(nn, dd);
      const w = W0 * (1 - 0.88 * Math.pow(t, long ? 1.25 : 1.6)), th = TH * (1 - 0.6 * t);
      const pts = [];
      for (let r = 0; r < RING; r++) {
        const ang = (r / RING) * TAU;
        pts.push([q.x + xx.x * w * Math.sin(ang) + nn.x * th * Math.cos(ang), q.y + xx.y * w * Math.sin(ang) + nn.y * th * Math.cos(ang), q.z + xx.z * w * Math.sin(ang) + nn.z * th * Math.cos(ang)]);
      }
      const below = smooth((cy - 0.55 * ry - q.y) / (0.2 * sc));
      const wh = 1 - 0.7 * below;
      const shade = col.hair.clone().multiplyScalar(tone * (0.86 + 0.22 * t));
      rings.push({
        pts, hair: new Array(RING).fill(1), mat: MAT.hair, color: shade,
        sway: new Array(RING).fill((long ? 1 : 0.15) * Math.pow(t, 1.3) * (0.4 + 0.6 * below)),
        weights: () => (wh >= 0.999 ? { head: 1 } : { head: wh, spine2: 1 - wh }),
      });
    }
    B.loft(rings, { capEnd: true });
  }
}

// Hair that falls below the skull: a thin shell, open at the face, hanging
// from the crown to the shoulders. Drawn as hair by the same shader flag.
function buildHairFall(B, s, len) {
  const u = s.u, hs = s.c.head;
  const cy = s.headY + 0.094 * u * hs, cz = 0.026 * u;
  const rx = 0.080 * u * hs, rz = 0.101 * u * hs;
  const y0 = cy + 0.02 * u, y1 = cy - (0.07 + 0.2 * len) * u;
  const A0 = (78 * Math.PI) / 180; // where the fall parts around the face
  const M = qn(36, 12), rings = [];
  const ones = new Array(M * 2).fill(1);
  const NF = qn(24, 8);
  for (let j = 0; j <= NF; j++) {
    const t = j / NF, y = lerp(y0, y1, t);
    // follows the skull at the top, then hangs straight and flares a little
    const sk = Math.sqrt(Math.max(0, 1 - Math.pow((y - cy) / (0.12 * u * hs), 2)));
    const wide = lerp(1.07, 1.0, smooth(t * 3)) * Math.max(sk, 0.92) + 0.10 * t * t;
    const pts = [];
    for (const k of [0, 1]) {
      for (let i = 0; i < M; i++) {
        const q = k === 0 ? i / (M - 1) : 1 - i / (M - 1);
        const a = lerp(A0, TAU - A0, q);
        const edge = smooth(Math.min(q, 1 - q) / 0.08); // thin out toward the parting edges
        const rr = (k ? wide - 0.16 * (0.35 + 0.65 * edge) : wide) * (1 + 0.025 * (vnoise3(a * 3, y * 40, 0) - 0.5) * (k ? 0 : 1));
        pts.push([Math.sin(a) * rx * rr * 1.04, y, cz + Math.cos(a) * rz * rr - 0.004 * u * t]);
      }
    }
    const wh = 1 - 0.55 * smooth(t);
    rings.push({ pts, hair: ones, mat: MAT.hair, color: new THREE.Color(1, 1, 1), weights: () => ({ head: wh, neck: 1 - wh }) });
  }
  B.loft(rings);
}

// the wrist end of the forearm: [half-thickness X, half-width Z]
function shapeArmEnd(s) {
  const [rx, rz] = bodyShape(s).arm(1);
  return [rx, rz];
}

// a finger or thumb: its own part with a capsule-chain distance field, so its
// root blends into the palm instead of butting onto it
function addDigit(B, name, palm, path, N, ring, k) {
  B.mark(name);
  tubeAlong(B, path, N, ring);
  B.mark('other');
  const seg = (px, py, pz, a, b) => {
    const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
    const t = clamp(((px - a[0]) * abx + (py - a[1]) * aby + (pz - a[2]) * abz) / (abx * abx + aby * aby + abz * abz || 1), 0, 1);
    return Math.hypot(px - a[0] - abx * t, py - a[1] - aby * t, pz - a[2] - abz * t) - lerp(a[3], b[3], t);
  };
  B.fields[name] = (x, y, z) => { let d = Infinity; for (let i = 0; i + 1 < path.length; i++) d = Math.min(d, seg(x, y, z, path[i], path[i + 1])); return d; };
  const root = path[0], reach = k * 3;
  const nearRoot = (x, y, z) => Math.hypot(x - root[0], y - root[1], z - root[2]) < reach + 0.02;
  B.unions[name] = [[palm, k / (B.su || 1), (x, y, z) => nearRoot(x, y, z)]];
  (B.unions[palm] = B.unions[palm] || []).push([name, k / (B.su || 1), (x, y, z) => nearRoot(x, y, z)]);
}

// A tube along a polyline: rings carried by parallel-transported frames, so a
// finger curls smoothly through its knuckles. `path` is [[x,y,z,r], ...];
// the far end closes in a rounded tip.
function tubeAlong(B, path, N, ring) {
  const P = path.map((q) => new THREE.Vector3(q[0], q[1], q[2]));
  const tan = P.map((_, i) => new THREE.Vector3().subVectors(P[Math.min(i + 1, P.length - 1)], P[Math.max(i - 1, 0)]).normalize());
  // start frame: any normal perpendicular to the first tangent, then transport
  let n = new THREE.Vector3(0, 0, 1);
  if (Math.abs(n.dot(tan[0])) > 0.9) n.set(1, 0, 0);
  n.addScaledVector(tan[0], -n.dot(tan[0])).normalize();
  const rings = [];
  const push = (c, t, nn, r) => {
    const x = new THREE.Vector3().crossVectors(nn, t); // x × n = t keeps the loft's outward winding
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      pts.push([c.x + r * (Math.sin(a) * x.x + Math.cos(a) * nn.x), c.y + r * (Math.sin(a) * x.y + Math.cos(a) * nn.y), c.z + r * (Math.sin(a) * x.z + Math.cos(a) * nn.z)]);
    }
    rings.push({ pts, ...ring });
  };
  for (let i = 0; i < P.length; i++) {
    if (i > 0) { // transport the normal along the bend
      const q = new THREE.Quaternion().setFromUnitVectors(tan[i - 1], tan[i]);
      n.applyQuaternion(q).addScaledVector(tan[i], -n.dot(tan[i])).normalize();
    }
    push(P[i], tan[i], n, path[i][3]);
  }
  // rounded tip
  const end = P[P.length - 1], t = tan[tan.length - 1], r = path[path.length - 1][3];
  for (const a of [0.35, 0.65, 0.88]) push(end.clone().addScaledVector(t, r * Math.sin(a * Math.PI / 2) * 0.9), t, n, r * Math.cos(a * Math.PI / 2));
  B.loft(rings, { capEnd: true });
}

// A relaxed hand hanging at the side: palm toward the thigh (−k·X), thumb
// forward (+Z), the fingers in the gentle cascade of a resting hand, the
// little finger the most curled.
function buildHand(B, s, col, side, k, x0, wristY, z0, SEG) {
  const u = s.u, L = s.hand, hsc = L / 0.189;
  const f = s.c.sex ?? 0, gw = lerp(1, s.c.build, 0.4) * (1 - 0.08 * f);
  const hand = `${side}Hand`, fore = `${side}ForeArm`;
  const ring = { color: col.skin, mat: MAT.skin, weights: () => ({ [hand]: 1 }) };
  const palmLen = 0.46 * L;
  // the forearm's last ring, so the palm starts exactly where the wrist is
  const [wx, wz] = shapeArmEnd(s);
  // palm: from the wrist's own cross-section, widening to the knuckles, thin
  // across X, slightly cupped; the far end rounds into the knuckles
  const keys = [
    // t (wrist → knuckles), halfThick, halfWidth, cup (toward palm), zc
    [0.00, wx / (u * gw), wz / (u * gw), 0.000, 0.000],
    [0.12, wx / (u * gw), wz / (u * gw) * 1.04, 0.0003, 0.0005], // level with the wrist: no corner
    [0.3, 0.0166, 0.036, 0.0015, 0.002],
    [0.55, 0.0152, 0.0405, 0.003, 0.001],
    [0.86, 0.0136, 0.0415, 0.005, 0.000],
    [1.00, 0.0118, 0.039, 0.006, 0.000],
  ];
  const P = profile(keys);
  const palmY = (t) => wristY + 0.004 * u - t * (palmLen + 0.004 * u);
  const palmAt = (t) => { const [hx, hz, cup, zc] = P(clamp01(t)); return [hx * u * gw, hz * u * gw, cup * u, zc * u]; };
  const r = [];
  const NP = qn(18, 7), NPa = SEG; // same ring size as the forearm it continues
  const ts = [];
  for (let j = 0; j <= NP; j++) ts.push(j / NP);
  for (const e of [0.4, 0.75]) ts.push(1 + e * 0.07); // the end tucks in under the finger roots
  ts.shift(); // t = 0 is the forearm's own last ring
  for (const t of ts) {
    const over = Math.max(0, t - 1) / 0.07;
    const shrink = 1 - 0.3 * over * over;
    const [hx, hz, cup, zc] = palmAt(t);
    const y = t <= 1 ? palmY(t) : palmY(1) - over * 0.006 * u;
    const pts = [];
    for (let i = 0; i < NPa; i++) {
      const a = (i / NPa) * TAU;
      let [px, pz] = se(a, hx * shrink, hz * (0.85 + 0.15 * shrink), lerp(2.1, 2.15, smooth(t / 0.3))); // rounded, not a box
      // toward the knuckles the section turns into four finger roots: the palm
      // flows into the fingers instead of ending in a flat face
      const sc4 = smooth((t - 0.78) / 0.3);
      if (sc4 > 0) {
        const lane = (pz / (hz || 1)) * 2; // −2 … 2 across the hand → finger lanes
        const roots = 0.5 + 0.5 * Math.cos(Math.PI * (lane + 1)); // 1 on a finger, 0 between
        px *= 1 - 0.32 * sc4 * (1 - roots);
        pz *= 1 - 0.06 * sc4;
      }
      // back of the hand gently domed; palm side hollow in the middle with a
      // fleshy thumb pad (thenar) near the thumb and a heel near the wrist
      const ease = smooth(t / 0.35); // features grow out of the wrist, never step at it
      if (px * k > 0) px *= 1 + 0.12 * ease * Math.exp(-Math.pow(pz / (0.025 * u), 2));
      else {
        px *= 1 - 0.2 * Math.exp(-Math.pow(pz / (0.018 * u), 2)) * smooth((t - 0.25) / 0.35);
        px *= 1 + 0.25 * Math.exp(-Math.pow((pz - 0.022 * u) / (0.013 * u), 2) - Math.pow((t - 0.3) / 0.25, 2)); // thenar
        px *= 1 + 0.1 * ease * Math.exp(-Math.pow((t - 0.2) / 0.14, 2)); // heel of the palm
      }
      pts.push([x0 + px - k * cup, y, z0 + pz + zc]);
    }
    // the wrist bends: the first part of the palm shares the forearm
    const wf = 1 - smooth(t / 0.4);
    r.push({ pts, ...ring, mark: r.length === 0 ? `palm_${side}` : undefined, weights: () => (wf > 0.001 ? { [fore]: 0.5 * wf, [hand]: 1 - 0.5 * wf } : { [hand]: 1 }) });
  }
  B.fields[`palm_${side}`] = (x, y, z) => {
    const t = (palmY(0) - y) / (palmY(0) - palmY(1));
    const tc = clamp(t, 0, 1);
    const [hx, hz, cup, zc] = palmAt(tc);
    return Math.hypot(Math.max(0, ellipseDist(x - x0 + k * cup, z - z0 - zc, hx, hz, 2.6)), Math.abs(t - tc) * palmLen);
  };
  B.unions[`palm_${side}`] = [];

  const digits = () => {

  // fingers: [z across the palm, knuckle height offset, length scale, radius, extra curl, splay]
  const fingers = [
    [0.027, 0.000, 0.96, 0.0094, 0, 4],
    [0.009, -0.004, 1.0, 0.0098, 5, 1],
    [-0.009, -0.001, 0.94, 0.0092, 10, -2],
    [-0.026, 0.008, 0.77, 0.0082, 16, -6],
  ];
  const seg = [0.047, 0.029, 0.021];
  const curl = [16, 30, 16];
  let fi = 0;
  for (const [fz, dy, ls, rad, extra, splay] of fingers) {
    const path = [];
    let p = new THREE.Vector3(x0 - k * 0.002 * u, wristY - palmLen * 0.8 + dy * u, z0 + fz * u * gw);
    let d = new THREE.Vector3(0, -1, 0).applyAxisAngle(new THREE.Vector3(k, 0, 0), splay * Math.PI / 180 * k);
    const palmward = new THREE.Vector3(-k, 0, 0);
    for (let sgi = 0; sgi < 3; sgi++) {
      // bend at the joint toward the palm
      const ang = ((curl[sgi] + extra * (sgi === 0 ? 0.5 : 1)) * Math.PI) / 180;
      const bperp = palmward.clone().addScaledVector(d, -palmward.dot(d)).normalize();
      d = d.clone().multiplyScalar(Math.cos(ang)).addScaledVector(bperp, Math.sin(ang)).normalize();
      const len = seg[sgi] * ls * hsc;
      const r0 = rad * u * gw * (1 - 0.1 * sgi), r1 = rad * u * gw * (1 - 0.1 * (sgi + 1));
      for (let j = 0; j < 5; j++) {
        const t = j / 5;
        const knuckle = 1 + (sgi === 0 ? 0.22 : 0.07) * Math.exp(-Math.pow(t / 0.22, 2)); // knuckles fuller, the first most
        path.push([p.x + d.x * len * t, p.y + d.y * len * t, p.z + d.z * len * t, lerp(r0, r1, t) * knuckle]);
      }
      p = p.clone().addScaledVector(d, len);
    }
    path.push([p.x, p.y, p.z, rad * u * gw * 0.68]);
    addDigit(B, `finger_${side}_${fi++}`, `palm_${side}`, path, qn(16, 8), ring, 0.024 * u);
  }

  // thumb: from the heel of the palm, forward and down, curling toward the index
  {
    const path = [];
    let p = new THREE.Vector3(x0 - k * 0.006 * u, wristY - 0.10 * L, z0 + 0.024 * u * gw);
    let d = new THREE.Vector3(-k * 0.28, -0.72, 0.62).normalize();
    const toward = new THREE.Vector3(-k * 0.6, -0.2, -0.75).normalize();
    const segT = [0.040, 0.032, 0.026], ang = [10, 20, 18];
    for (let sgi = 0; sgi < 3; sgi++) {
      const a = (ang[sgi] * Math.PI) / 180;
      const bperp = toward.clone().addScaledVector(d, -toward.dot(d)).normalize();
      d = d.clone().multiplyScalar(Math.cos(a)).addScaledVector(bperp, Math.sin(a)).normalize();
      const len = segT[sgi] * hsc;
      const r0 = (0.0135 - 0.0013 * sgi) * u * gw, r1 = (0.0135 - 0.0013 * (sgi + 1)) * u * gw;
      for (let j = 0; j < 5; j++) {
        const t = j / 5;
        path.push([p.x + d.x * len * t, p.y + d.y * len * t, p.z + d.z * len * t, lerp(r0, r1, t) * (sgi === 0 ? 1 + 0.25 * Math.sin(Math.PI * t) : 1)]);
      }
      p = p.clone().addScaledVector(d, len);
    }
    path.push([p.x, p.y, p.z, 0.0085 * u * gw]);
    addDigit(B, `thumb_${side}`, `palm_${side}`, path, qn(16, 8), ring, 0.028 * u);
  }
  };
  return { rings: r, digits };
}

// Sneaker: a midsole slab with an outsole stripe, toe spring and a bevelled
// heel; a rounded upper with a toe box, a padded collar dipping under the
// ankle bones, and a lace panel.
function buildShoe(B, s, col, side, k, x0) {
  const u = s.u;
  const foot = `${side}Foot`, toe = `${side}ToeBase`;
  const z0 = s.heelZ - 0.018 * u, z1 = s.toeZ + 0.016 * u;
  const L = z1 - z0;
  const wt = (z) => smooth((z - (s.ballZ - 0.02 * u)) / (0.04 * u));
  const weights = (z) => ({ [foot]: 1 - wt(z), [toe]: wt(z) });
  // outline half-width along the foot (fraction of length → m at 1.75 m)
  const outline = profile([[0, 0.022], [0.06, 0.034], [0.2, 0.039], [0.42, 0.040], [0.66, 0.050], [0.82, 0.047], [0.94, 0.036], [1, 0.012]]);
  const spring = (z) => 0.013 * u * Math.pow(smooth((z - s.ballZ) / (z1 - s.ballZ)), 1.6) + 0.006 * u * Math.pow(smooth((z0 + 0.03 * u - z) / (0.03 * u)), 1.5);
  const midsole = col.shoes.clone().lerp(new THREE.Color('#f4f1ea'), 0.65);
  // ── sole ──
  {
    const r = [], NZ = qn(56, 16), NA = qn(40, 12), SH = 0.026 * u;
    for (let j = 0; j <= NZ; j++) {
      const z = lerp(z0, z1, j / NZ);
      const hw = (outline([(z - z0) / L])[0] + 0.004) * u;
      const yb = spring(z);
      const pts = [], colors = [];
      for (let i = 0; i < NA; i++) {
        const a = (i / NA) * TAU;
        const [px, py] = se(a, hw, SH / 2, 6);
        const y = yb + SH / 2 + py;
        pts.push([x0 + px * (px * k < 0 ? 0.93 : 1.04), y, z]);
        colors.push(y - yb < SH * 0.32 ? col.sole : midsole);
      }
      r.push({ pts, mat: MAT.sole, color: (i) => colors[i], weights: () => weights(z) });
    }
    B.loft(r, { capStart: true, capEnd: true });
  }
  // ── upper ──
  {
    const height = profile([[0, 0.060], [0.05, 0.088], [0.16, 0.102], [0.3, 0.108], [0.45, 0.092], [0.62, 0.070], [0.78, 0.056], [0.92, 0.046], [1, 0.030]]);
    const r = [], NZ = qn(60, 16), NA = qn(44, 12);
    for (let j = 0; j <= NZ; j++) {
      const z = lerp(z0 + 0.004 * u, z1 - 0.005 * u, j / NZ);
      const f = (z - z0) / L;
      const hw = outline([f])[0] * u * 0.97;
      const top = height([f])[0] * u;
      const yb = spring(z) + 0.018 * u;
      const hh = top - yb + spring(z) * 0.6;
      const pts = [], colors = [];
      for (let i = 0; i < NA; i++) {
        const a = (i / NA) * TAU; // 0 = top, around through the lateral side
        let [px, py] = se(a, hw, hh / 2, 2.7);
        let y = yb + hh / 2 + py;
        y = Math.max(y, yb);
        // collar dips under the ankle bones at the sides
        const side = Math.abs(Math.sin(a));
        if (py > 0) y -= 0.016 * u * Math.pow(side, 2) * Math.exp(-Math.pow((z - 0.005 * u) / (0.035 * u), 2));
        pts.push([x0 + px * (px * k < 0 ? 0.93 : 1.04), y, z]);
        const lace = py > hh * 0.36 && z > 0.012 * u && z < s.ballZ * 0.95 && Math.abs(px) < hw * 0.32;
        const laceRow = lace && Math.sin((z / (0.012 * u)) * Math.PI) > 0.2;
        colors.push(laceRow ? col.lace.clone().multiplyScalar(0.9) : lace ? col.lace : col.shoes);
      }
      r.push({ pts, mat: MAT.shoe, color: (i) => colors[i], weights: () => weights(z) });
    }
    B.loft(r, { capStart: true, capEnd: true });
  }
}
