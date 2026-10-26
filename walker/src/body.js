// Procedural body: one skinned mesh lofted around the rig from anatomical
// cross-sections. Every part is a stack of rings (superellipses) whose size
// and offset follow the spec, so creator sliders reshape a continuous body
// instead of scaling primitives. Joints blend weights across a zone, so a
// knee bends like a knee rather than a hinge between two cylinders.

import * as THREE from 'three';
import { boneLayout } from './proportions.js';

const TAU = Math.PI * 2;
// surface kinds: each gets its own roughness, sheen and micro-detail in the shader
const MAT = { skin: 0, cloth: 1, hair: 2, shoe: 3, sole: 4 };
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
    this.pos = []; this.col = []; this.si = []; this.sw = []; this.idx = []; this.hair = []; this.mat = [];
    this.bi = boneIndex;
  }
  vert(x, y, z, color, weights, hair = -1, mat = MAT.cloth) {
    this.pos.push(x, y, z);
    this.hair.push(hair);
    this.mat.push(mat);
    this.col.push(color.r, color.g, color.b);
    // keep the 4 strongest influences, normalised
    const w = Object.entries(weights).filter(([, v]) => v > 1e-4).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const sum = w.reduce((a, [, v]) => a + v, 0) || 1;
    for (let i = 0; i < 4; i++) {
      this.si.push(w[i] ? this.bi[w[i][0]] : 0);
      this.sw.push(w[i] ? w[i][1] / sum : 0);
    }
    return this.pos.length / 3 - 1;
  }
  // rings: [{ pts: [[x,y,z]...], color(i)|Color, weights(x,y,z) }], all rings the same length
  loft(rings, { capStart = false, capEnd = false, flip = false } = {}) {
    const N = rings[0].pts.length;
    const base = [];
    for (const r of rings) {
      const start = this.pos.length / 3;
      r.pts.forEach((p, i) => {
        const c = typeof r.color === 'function' ? r.color(i, p) : r.color;
        const mt = r.mat === undefined ? MAT.cloth : typeof r.mat === 'function' ? r.mat(i, p) : r.mat;
        this.vert(p[0], p[1], p[2], c, r.weights(p[0], p[1], p[2]), r.hair ? r.hair[i] : -1, mt);
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
    [spec.hipJointY - 0.075 * u, 0.085 * g,                  0.075 * g,       -0.012, 2.2],
    [spec.hipJointY - 0.035 * u, 0.150 * g * c.hips,         0.104 * g,       -0.016, 2.5],
    [spec.hipJointY + 0.005 * u, 0.172 * g * c.hips,         0.118 * g,       -0.020, 2.6],
    [spec.hipsY + 0.040 * u,     0.160 * g * c.hips,         0.106 * g,       -0.006, 2.6],
    [spec.spineY + 0.050 * u,    0.142 * g * lerp(c.hips, c.shoulders, 0.4), 0.100 * g, 0.004, 2.4],
    [spec.spine1Y + 0.010 * u,   0.150 * g * lerp(1, c.shoulders, 0.6), 0.108 * g, 0.004, 2.3],
    [spec.spine2Y - 0.010 * u,   0.165 * c.shoulders * lerp(1, g, 0.7), (0.116 + 0.008 * m) * g, 0.014, 2.3],
    [spec.shoulderY - 0.085 * u, 0.186 * c.shoulders * lerp(1, g, 0.6), (0.114 + 0.006 * m) * g, 0.008, 2.4],
    [spec.shoulderY - 0.030 * u, 0.206 * c.shoulders * lerp(1, g, 0.5), 0.098 * g,       -0.004, 2.6],
    [spec.shoulderY + 0.006 * u, 0.180 * c.shoulders * lerp(1, g, 0.5), 0.078 * g,       -0.016, 2.6],
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
    [-0.07, 0.066, 0.076, -0.010],
    [-0.04, 0.080, 0.088, -0.008],
    [0.06, 0.088, 0.090, 0.004],
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
  const legGirth = (t) => (t < kneeT + 0.1 ? g : lerp(g, 1, 0.4)) * (1 + f * (t < 0.3 ? 0.05 * (1 - t / 0.3) : t > kneeT + 0.05 ? -0.08 : 0));
  return {
    torsoKeys,
    torso: profile(torsoKeys),
    legRaw,
    legGirth,
    leg: (t) => { const [rx, rz, zc] = legRaw(t); const gg = legGirth(t); return [rx * u * gg, rz * u * gg, zc * u]; },
    kneeT,
  };
}

export function buildBody(spec, rig) {
  const c = spec.c, u = spec.u;
  const B = new Builder(rig.index);
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
  col.collar = col.shirt.clone().multiplyScalar(0.8);
  col.belt = col.pants.clone().multiplyScalar(0.6);
  const g = c.build;           // girth
  const m = c.muscle;          // 0 … 1
  const f = c.sex ?? 0;        // 0 male … 1 female
  const SEG = 56;

  // ── torso ─────────────────────────────────────────────────────────────
  const shirtEnd = spec.hipsY + 0.035 * u;
  const shape = bodyShape(spec);
  const torsoKeys = shape.torsoKeys;
  const torsoP = shape.torso;
  const torsoW = (x, y) => torsoWeights(spec, x, y);
  const y0 = torsoKeys[0][0], y1 = torsoKeys[torsoKeys.length - 1][0];
  const rings = [];
  const NR = 84;
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
  B.loft(rings, { capStart: true, flip: true }); // rings run upward

  // ── neck ──────────────────────────────────────────────────────────────
  {
    const r = [];
    const n0 = spec.neckY - 0.02 * u, n1 = spec.headY + 0.035 * u;
    for (let j = 0; j <= 14; j++) {
      const t = j / 14, y = lerp(n0, n1, t);
      const rx = (0.057 - 0.007 * t) * u * lerp(1, g, 0.5) * (1 - 0.14 * f), rz = (0.059 - 0.004 * t) * u * lerp(1, g, 0.5) * (1 - 0.1 * f);
      const pts = [];
      for (let i = 0; i < SEG; i++) {
        const [px, pz] = se((i / SEG) * TAU, rx, rz, 2);
        pts.push([px, y, pz - 0.022 * u + 0.018 * u * t]); // neck leans forward
      }
      r.push({ pts, mat: MAT.skin, color: col.skin, weights: () => ({ neck: 1 - smooth(t * 1.2 - 0.2), head: smooth(t * 1.2 - 0.2) }) });
    }
    B.loft(r, { flip: true });
  }

  // ── head ──────────────────────────────────────────────────────────────
  buildHead(B, spec, col);
  if (c.hairLength > 0.02) buildHairFall(B, spec, c.hairLength);

  // ── arms ──────────────────────────────────────────────────────────────
  for (const [side, k] of [['left', 1], ['right', -1]]) {
    const x0 = k * spec.armX, z0 = -0.008 * u;
    const top = spec.shoulderY - 0.012 * u;
    const ua = spec.upperArm, fa = spec.foreArm, total = ua + fa;
    const elbowT = ua / total;
    const sleeveT = 0.36;
    const keys = [
      // t (0 shoulder → 1 wrist), rx, rz, zc
      [-0.025, 0.026, 0.030, 0.000], // the arm's top sits inside the shoulder
      [-0.008, 0.042, 0.047, 0.000],
      [0.02, (0.055 + 0.006 * m) * g, (0.056 + 0.004 * m) * g, 0.002],
      [0.17, (0.048 + 0.006 * m) * g, (0.052 + 0.003 * m) * g, 0.004],
      [0.33, (0.042 + 0.003 * m) * g, (0.046 + 0.004 * m) * g, 0.006],
      [elbowT - 0.04, 0.035 * g, 0.038 * g, 0.000],
      [elbowT + 0.02, 0.036 * g, 0.039 * g, -0.002],
      [elbowT + 0.12, (0.037 + 0.003 * m) * g, 0.039 * g, 0.002],
      [0.86, 0.025 * lerp(1, g, 0.6), 0.030 * lerp(1, g, 0.6), 0.000],
      [1.0, 0.020 * lerp(1, g, 0.4), 0.028 * lerp(1, g, 0.4), 0.000],
    ];
    const P = profile(keys);
    const r = [];
    const ts = [];
    for (let j = 0; j <= 72; j++) ts.push(lerp(-0.025, 1.0, j / 72));
    ts.push(sleeveT - 0.0001, sleeveT + 0.0001);
    ts.sort((a, b) => a - b);
    for (const t of ts) {
      const [rx, rz, zc] = P(t);
      const sleeve = t < sleeveT;
      const puff = sleeve ? 0.004 * u : 0;
      const y = top - t * total;
      const pts = [];
      for (let i = 0; i < SEG; i++) {
        const a = (i / SEG) * TAU;
        const [px, pz] = se(a, rx * u * (1 - 0.12 * f) + puff, rz * u * (1 - 0.1 * f) + puff, 2.1);
        pts.push([x0 + px, y, z0 + pz + zc * u]);
      }
      const w = armWeights(side, t, elbowT);
      r.push({ pts, mat: sleeve ? MAT.cloth : MAT.skin, color: sleeve ? (t > sleeveT - 0.03 ? col.collar : col.shirt) : col.skin, weights: () => w });
    }
    B.loft(r, { capStart: true });
    buildHand(B, spec, col, side, k, x0, top - total, z0);
  }

  // ── legs ──────────────────────────────────────────────────────────────
  for (const [side, k] of [['left', 1], ['right', -1]]) {
    const x0 = k * spec.hipSep * 0.5;
    const L = spec.legLen;
    const kneeT = spec.thigh / L;
    // trousers: anatomy underneath, cloth on top (never tighter than a
    // straight-leg cut below the knee)
    const P = shape.legRaw;
    const r = [];
    for (let j = 0; j <= 84; j++) {
      const t = lerp(-0.07, 1.0, j / 84); // starts below the shirt hem
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
    buildShoe(B, spec, col, side, k, x0);
  }

  const geo = B.geometry();
  // One physical material; each surface kind (skin, cloth, hair, shoe, sole)
  // gets its own roughness, sheen and micro-detail in the shader, driven by
  // a per-vertex tag and the rest-pose position (so detail sticks to the body).
  const mat = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.8, metalness: 0,
    sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.16, 0.16, 0.16),
  });
  const hairColor = { value: col.hair.clone() };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.hairColor = hairColor;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float hairD;\nattribute float matId;\nvarying float vHairD;\nvarying float vMat;\nvarying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHairD = hairD;\nvMat = matId;\nvRest = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 hairColor;
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
        roughnessFactor = skinM * 0.5 + clothM * 0.92 + hairM * 0.62 + shoeM * 0.58 + soleM * 0.78;
        roughnessFactor += hairM * (strand - 0.5) * 0.3 * wDetail(520.0);`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
        #ifdef USE_SHEEN
          material.sheenColor *= clothM; // only fabric has that velvety rim
        #endif
        material.specularColor *= 1.0 - 0.75 * clothM;`);
  };
  mat.customProgramCacheKey = () => 'walker-body-v2';
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
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
  } else if (t < 0.97) w[fa] = 1;
  else { const a = smooth((t - 0.97) / 0.03); w[fa] = 1 - a * 0.5; w[hd] = a * 0.5; }
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

function buildHead(B, s, col) {
  const u = s.u, hs = s.c.head;
  const cy = s.headY + 0.094 * u * hs, cz = 0.026 * u; // skull sits forward of the neck
  const rx = 0.080 * u * hs, ry = 0.116 * u * hs, rz = 0.101 * u * hs;
  const R = 60, SEGH = 76;
  const rings = [];
  for (let j = 1; j < R; j++) {
    const v = j / R; // 0 top → 1 bottom
    const phi = v * Math.PI;
    const yl = Math.cos(phi);       // 1 … −1
    const rr = Math.sin(phi);
    const pts = [], colors = [], hair = [];
    for (let i = 0; i < SEGH; i++) {
      const a = (i / SEGH) * TAU;
      let x = Math.sin(a) * rr, z = Math.cos(a) * rr, y = yl;
      // cranium wider at the back-top; face narrower toward the jaw
      const jaw = smooth((-y - 0.05) / 0.9);
      x *= 1 - (0.20 + 0.08 * s.c.sex) * jaw;
      z *= 1 - 0.04 * jaw;
      // profile: forehead slopes back a little, chin comes forward, so the
      // face plane is upright rather than tipped toward the floor
      if (z > 0) z *= 1 - 0.05 - 0.12 * smooth((y - 0.45) / 0.55);
      // chin: carry the lower face forward to sit just behind the nose line
      z += 0.42 * Math.pow(Math.max(0, Math.cos(a)), 1.5) * smooth((-y - 0.1) / 0.75);
      if (z < 0) z *= 1 + 0.03 * smooth(y + 0.2);  // occiput
      // jaw line: the back of the underside tucks up toward the ears, so the
      // chin, not the skull, is the lowest point and sits ahead of the neck
      const fb = z / (rr || 1);
      y += 0.32 * smooth(-y) * (1 - smooth((fb + 1) / 2)) * smooth(-y - 0.1);
      let X = x * rx, Y = y * ry, Z = z * rz;
      // nose
      const nose = Math.exp(-Math.pow(X / (0.012 * u), 2) - Math.pow((Y + 0.012 * u) / (0.026 * u), 2));
      Z += Math.max(0, Math.cos(a)) * nose * 0.020 * u * hs;
      // brow ridge
      const brow = Math.exp(-Math.pow((Y - 0.030 * u * hs) / (0.012 * u), 2)) * Math.pow(Math.max(0, Math.cos(a)), 3);
      Z += brow * 0.006 * u * (1 - 0.7 * s.c.sex);
      // ears
      const ear = Math.exp(-Math.pow(Z / (0.016 * u), 2) - Math.pow((Y - 0.0 * u) / (0.026 * u), 2));
      X += Math.sign(x) * ear * 0.014 * u * Math.pow(Math.abs(Math.sin(a)), 4) * (1 - 0.8 * smooth(s.c.hairLength * 4)); // tucked under long hair
      // hair: a cap with a hairline at the brow and down to the nape
      const fn = z / (rr || 1); // −1 back … 1 front
      const hairline = lerp(-0.42, 0.40, smooth((fn + 1) / 2)) - 0.14 * Math.pow(Math.abs(Math.sin(a)), 3) * smooth(fn + 0.2);
      const hairT = smooth((y - hairline) / 0.16 + 0.5) * (1 - smooth((ear - 0.25) / 0.2));
      const isHair = hairT > 0.5;
      if (hairT > 0) {
        const f = 1 + 0.04 * hairT * smooth((y - hairline) / 0.25);
        X *= f; Z *= f; Y += 0.006 * u * smooth(y);
      }
      pts.push([X, cy + Y, cz + Z]);
      // face: eyes as soft dark sockets, a darker lip line, brows
      // the hairline itself is drawn per pixel from this signed distance
      hair.push(y - hairline - 3 * Math.max(0, ear - 0.15));
      let c = col.skin.clone();
      if (hairT < 0.5 && z > 0) {
        const ex = Math.abs(X) - 0.030 * u * hs, ey = Y - 0.012 * u * hs;
        const eye = Math.exp(-(ex * ex) / Math.pow(0.010 * u, 2) - (ey * ey) / Math.pow(0.006 * u, 2));
        const browC = Math.exp(-(ex * ex) / Math.pow(0.016 * u, 2) - Math.pow((Y - 0.032 * u * hs) / (0.0045 * u), 2));
        const lip = Math.exp(-(X * X) / Math.pow(0.018 * u, 2) - Math.pow((Y + 0.058 * u * hs) / (0.006 * u), 2));
        c = c.lerp(col.eye, Math.min(1, eye * 0.75)).lerp(col.brow, browC * 0.9).lerp(col.lip, lip * 0.8);
      }
      colors.push(c);
    }
    rings.push({ pts, hair, mat: MAT.skin, color: (i) => colors[i], weights: () => ({ head: 1 }) });
  }
  // close top and bottom with the loft caps
  B.loft(rings, { capStart: true, capEnd: true });
}

// Hair that falls below the skull: a thin shell, open at the face, hanging
// from the crown to the shoulders. Drawn as hair by the same shader flag.
function buildHairFall(B, s, len) {
  const u = s.u, hs = s.c.head;
  const cy = s.headY + 0.094 * u * hs, cz = 0.026 * u;
  const rx = 0.080 * u * hs, rz = 0.101 * u * hs;
  const y0 = cy + 0.02 * u, y1 = cy - (0.07 + 0.2 * len) * u;
  const A0 = (78 * Math.PI) / 180; // where the fall parts around the face
  const M = 36, rings = [];
  const ones = new Array(M * 2).fill(1);
  for (let j = 0; j <= 24; j++) {
    const t = j / 24, y = lerp(y0, y1, t);
    // follows the skull at the top, then hangs straight and flares a little
    const sk = Math.sqrt(Math.max(0, 1 - Math.pow((y - cy) / (0.12 * u * hs), 2)));
    const wide = lerp(1.07, 1.0, smooth(t * 3)) * Math.max(sk, 0.92) + 0.10 * t * t;
    const pts = [];
    for (const k of [0, 1]) {
      for (let i = 0; i < M; i++) {
        const q = k === 0 ? i / (M - 1) : 1 - i / (M - 1);
        const a = lerp(A0, TAU - A0, q);
        const rr = k ? wide - 0.11 : wide; // ~9 mm thick
        pts.push([Math.sin(a) * rx * rr * 1.04, y, cz + Math.cos(a) * rz * rr - 0.004 * u * t]);
      }
    }
    const wh = 1 - 0.55 * smooth(t);
    rings.push({ pts, hair: ones, mat: MAT.hair, color: new THREE.Color(1, 1, 1), weights: () => ({ head: wh, neck: 1 - wh }) });
  }
  B.loft(rings);
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
function buildHand(B, s, col, side, k, x0, wristY, z0) {
  const u = s.u, L = s.hand, hsc = L / 0.189;
  const f = s.c.sex ?? 0, gw = lerp(1, s.c.build, 0.4) * (1 - 0.08 * f);
  const hand = `${side}Hand`;
  const ring = { color: col.skin, mat: MAT.skin, weights: () => ({ [hand]: 1 }) };
  const palmLen = 0.46 * L;
  // palm: thin across X, wide along Z, slightly cupped toward the palm
  const keys = [
    // t (wrist → knuckles), halfThick, halfWidth, cup (toward palm), zc
    [0.00, 0.0175, 0.027, 0.000, 0.000],
    [0.25, 0.0170, 0.036, 0.001, 0.002],
    [0.60, 0.0160, 0.041, 0.003, 0.001],
    [0.92, 0.0145, 0.043, 0.006, 0.000],
    [1.00, 0.0130, 0.042, 0.007, 0.000],
  ];
  const P = profile(keys);
  const r = [];
  for (let j = 0; j <= 16; j++) {
    const t = j / 16;
    const [hx, hz, cup, zc] = P(t);
    const y = wristY + 0.014 * u - t * (palmLen + 0.014 * u); // starts inside the forearm: no crack at the wrist
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      let [px, pz] = se(a, hx * u * gw, hz * u * gw, 2.6);
      // palm side a little hollow in the middle, thenar pad near the thumb
      if (px * k < 0) px *= 1 - 0.18 * Math.exp(-Math.pow(pz / (0.02 * u), 2)) * smooth((t - 0.2) / 0.4);
      pts.push([x0 + px - k * cup * u, y, z0 + pz + zc * u]);
    }
    r.push({ pts, ...ring });
  }
  B.loft(r, { capEnd: true });

  // fingers: [z across the palm, knuckle height offset, length scale, radius, extra curl, splay]
  const fingers = [
    [0.027, 0.000, 0.96, 0.0094, 0, 4],
    [0.009, -0.004, 1.0, 0.0098, 5, 1],
    [-0.009, -0.001, 0.94, 0.0092, 10, -2],
    [-0.026, 0.008, 0.77, 0.0082, 16, -6],
  ];
  const seg = [0.047, 0.029, 0.021];
  const curl = [16, 30, 16];
  for (const [fz, dy, ls, rad, extra, splay] of fingers) {
    const path = [];
    let p = new THREE.Vector3(x0 - k * 0.004 * u, wristY - palmLen * 0.9 + dy * u, z0 + fz * u * gw);
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
        const knuckle = 1 + 0.07 * Math.exp(-Math.pow(t / 0.18, 2)); // joints a touch fuller
        path.push([p.x + d.x * len * t, p.y + d.y * len * t, p.z + d.z * len * t, lerp(r0, r1, t) * knuckle]);
      }
      p = p.clone().addScaledVector(d, len);
    }
    path.push([p.x, p.y, p.z, rad * u * gw * 0.68]);
    tubeAlong(B, path, 16, ring);
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
    tubeAlong(B, path, 16, ring);
  }
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
    const r = [], NZ = 56, NA = 40, SH = 0.026 * u;
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
    const r = [], NZ = 60, NA = 44;
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
