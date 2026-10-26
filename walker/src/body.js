// Procedural body: one skinned mesh lofted around the rig from anatomical
// cross-sections. Every part is a stack of rings (superellipses) whose size
// and offset follow the spec, so creator sliders reshape a continuous body
// instead of scaling primitives. Joints blend weights across a zone, so a
// knee bends like a knee rather than a hinge between two cylinders.

import * as THREE from 'three';
import { boneLayout } from './proportions.js';

const TAU = Math.PI * 2;
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
    this.pos = []; this.col = []; this.si = []; this.sw = []; this.idx = []; this.hair = [];
    this.bi = boneIndex;
  }
  vert(x, y, z, color, weights, hair = -1) {
    this.pos.push(x, y, z);
    this.hair.push(hair);
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
        this.vert(p[0], p[1], p[2], c, r.weights(p[0], p[1], p[2]), r.hair ? r.hair[i] : -1);
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
      const ci = this.vert(cx, cy, cz, c, ring.weights(cx, cy, cz), ring.hair ? ring.hair.reduce((a, b) => a + b, 0) / N : -1);
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
  const SEG = 28;

  // ── torso ─────────────────────────────────────────────────────────────
  const shirtEnd = spec.hipsY + 0.035 * u;
  const torsoKeys = [
    // y,                         halfW,                      halfD,           zc,      exp
    [spec.hipJointY - 0.075 * u, 0.085 * g,                  0.075 * g,       -0.012, 2.2],
    [spec.hipJointY - 0.035 * u, 0.150 * g * c.hips,         0.104 * g,       -0.016, 2.5],
    [spec.hipJointY + 0.005 * u, 0.172 * g * c.hips,         0.118 * g,       -0.020, 2.6],
    [spec.hipsY + 0.040 * u,     0.160 * g * c.hips,         0.106 * g,       -0.006, 2.6],
    [spec.spineY + 0.050 * u,    0.142 * g * lerp(c.hips, c.shoulders, 0.4), 0.100 * g, 0.004, 2.4],
    [spec.spine1Y + 0.010 * u,   0.150 * g * lerp(1, c.shoulders, 0.6), 0.108 * g, 0.004, 2.3],
    [spec.spine2Y - 0.010 * u,   0.165 * c.shoulders * lerp(1, g, 0.7), (0.116 + 0.008 * m) * g, 0.014, 2.3],
    [spec.shoulderY - 0.085 * u, 0.178 * c.shoulders * lerp(1, g, 0.6), (0.114 + 0.006 * m) * g, 0.008, 2.4],
    [spec.shoulderY - 0.030 * u, 0.190 * c.shoulders * lerp(1, g, 0.5), 0.098 * g,       -0.004, 2.6],
    [spec.shoulderY + 0.006 * u, 0.162 * c.shoulders * lerp(1, g, 0.5), 0.078 * g,       -0.016, 2.6],
    [spec.shoulderY + 0.024 * u, 0.098 * lerp(1, g, 0.5),    0.068 * g,       -0.018, 2.3], // trapezius
    [spec.neckY + 0.012 * u,     0.068 * lerp(1, g, 0.5),    0.062 * lerp(1, g, 0.5), -0.018, 2.0],
  ].map(([y, w, d, z, e]) => [y, w * u, d * u, z * u, e]);
  const torsoP = profile(torsoKeys);
  const torsoW = (x, y) => torsoWeights(spec, x, y);
  const y0 = torsoKeys[0][0], y1 = torsoKeys[torsoKeys.length - 1][0];
  const rings = [];
  const NR = 34;
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
      pz += front * pec * Math.pow(Math.abs(Math.sin(a * 1)), 0.6) * u;
      // spine groove
      pz += back * Math.exp(-Math.pow(Math.sin(a) / 0.12, 2)) * 0.006 * u * (y > spec.hipsY ? 1 : 0);
      pts.push([px, y, pz + zc]);
    }
    const isShirt = y > shirtEnd;
    rings.push({
      pts,
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
    for (let j = 0; j <= 6; j++) {
      const t = j / 6, y = lerp(n0, n1, t);
      const rx = (0.057 - 0.007 * t) * u * lerp(1, g, 0.5), rz = (0.059 - 0.004 * t) * u * lerp(1, g, 0.5);
      const pts = [];
      for (let i = 0; i < SEG; i++) {
        const [px, pz] = se((i / SEG) * TAU, rx, rz, 2);
        pts.push([px, y, pz - 0.022 * u + 0.018 * u * t]); // neck leans forward
      }
      r.push({ pts, color: col.skin, weights: () => ({ neck: 1 - smooth(t * 1.2 - 0.2), head: smooth(t * 1.2 - 0.2) }) });
    }
    B.loft(r, { flip: true });
  }

  // ── head ──────────────────────────────────────────────────────────────
  buildHead(B, spec, col);

  // ── arms ──────────────────────────────────────────────────────────────
  for (const [side, k] of [['left', 1], ['right', -1]]) {
    const x0 = k * spec.armX, z0 = -0.008 * u;
    const top = spec.shoulderY - 0.012 * u;
    const ua = spec.upperArm, fa = spec.foreArm, total = ua + fa;
    const elbowT = ua / total;
    const sleeveT = 0.36;
    const keys = [
      // t (0 shoulder → 1 wrist), rx, rz, zc
      [-0.045, 0.022, 0.026, 0.000],
      [-0.025, 0.040, 0.046, 0.000],
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
    for (let j = 0; j <= 30; j++) ts.push(lerp(-0.045, 1.0, j / 30));
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
        const [px, pz] = se(a, rx * u + puff, rz * u + puff, 2.1);
        pts.push([x0 + px, y, z0 + pz + zc * u]);
      }
      const w = armWeights(side, t, elbowT);
      r.push({ pts, color: sleeve ? (t > sleeveT - 0.03 ? col.collar : col.shirt) : col.skin, weights: () => w });
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
    const keys = [
      [-0.12, 0.074, 0.088, -0.016],
      [-0.04, 0.090, 0.098, -0.010],
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
    const P = profile(keys);
    const r = [];
    for (let j = 0; j <= 34; j++) {
      const t = lerp(-0.12, 1.0, j / 34);
      const [rx, rz, zc] = P(t);
      const gg = t < kneeT + 0.1 ? g : lerp(g, 1, 0.4);
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
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  // hair: crisp, anti-aliased hairline from an interpolated distance field
  const hairColor = { value: col.hair.clone() };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.hairColor = hairColor;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float hairD;\nvarying float vHairD;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHairD = hairD;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 hairColor;\nvarying float vHairD;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float hw = max(fwidth(vHairD), 1e-4) * 0.8;
        float hm = smoothstep(-hw, hw, vHairD);
        diffuseColor.rgb = mix(diffuseColor.rgb, hairColor, hm);`);
  };
  mat.customProgramCacheKey = () => 'walker-body';
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
    const a = smooth((t + 0.12) / 0.16);
    w.hips = (1 - a) * 0.6; w[ul] = 1 - w.hips;
  } else if (t < kneeT - 0.05) w[ul] = 1;
  else if (t < kneeT + 0.05) {
    const a = smooth((t - (kneeT - 0.05)) / 0.1);
    w[ul] = 1 - a; w[l] = a;
  } else if (t < 0.93) w[l] = 1;
  else { const a = smooth((t - 0.93) / 0.07); w[l] = 1 - a * 0.65; w[f] = a * 0.65; }
  return w;
}

function buildHead(B, s, col) {
  const u = s.u, hs = s.c.head;
  const cy = s.headY + 0.094 * u * hs, cz = 0.026 * u; // skull sits forward of the neck
  const rx = 0.080 * u * hs, ry = 0.116 * u * hs, rz = 0.101 * u * hs;
  const R = 34, SEGH = 44;
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
      x *= 1 - 0.20 * jaw;
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
      Z += brow * 0.006 * u;
      // ears
      const ear = Math.exp(-Math.pow(Z / (0.016 * u), 2) - Math.pow((Y - 0.0 * u) / (0.026 * u), 2));
      X += Math.sign(x) * ear * 0.014 * u * Math.pow(Math.abs(Math.sin(a)), 4);
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
    rings.push({ pts, hair, color: (i) => colors[i], weights: () => ({ head: 1 }) });
  }
  // close top and bottom with the loft caps
  B.loft(rings, { capStart: true, capEnd: true });
}

function buildHand(B, s, col, side, k, x0, wristY, z0) {
  const u = s.u, L = s.hand;
  const hand = `${side}Hand`;
  // palm faces the thigh: thin in X, wide in Z; fingers curl toward the palm
  const keys = [
    // t (0 wrist → 1 fingertips), halfThick(X), halfWidth(Z), curl(X toward palm), zc
    [0.00, 0.018, 0.026, 0.000, 0.000],
    [0.15, 0.017, 0.036, 0.000, 0.002],
    [0.45, 0.015, 0.041, 0.002, 0.000],
    [0.60, 0.013, 0.039, 0.006, -0.002],
    [0.80, 0.011, 0.034, 0.016, -0.004],
    [1.00, 0.008, 0.026, 0.030, -0.006],
  ];
  const P = profile(keys);
  const r = [];
  for (let j = 0; j <= 10; j++) {
    const t = j / 10;
    const [hx, hz, curl, zc] = P(t);
    const y = wristY - t * L * 0.92 + Math.pow(t, 2) * 0.01 * u;
    const pts = [];
    for (let i = 0; i < 18; i++) {
      const [px, pz] = se((i / 18) * TAU, hx * u, hz * u, 2.4);
      pts.push([x0 + px - k * curl * u, y, z0 + pz + zc * u]);
    }
    r.push({ pts, color: col.skin, weights: () => ({ [hand]: 1 }) });
  }
  B.loft(r, { capEnd: true });
  // thumb: from the palm's front edge, down and toward the palm
  const tr = [];
  for (let j = 0; j <= 5; j++) {
    const t = j / 5;
    const y = wristY - (0.18 + 0.38 * t) * L;
    const zz = z0 + (0.034 - 0.006 * t) * u;
    const xx = x0 - k * (0.004 + 0.012 * t) * u;
    const rad = (0.011 - 0.003 * t) * u;
    const pts = [];
    for (let i = 0; i < 12; i++) {
      const [px, pz] = se((i / 12) * TAU, rad, rad * 1.1, 2);
      pts.push([xx + px, y, zz + pz]);
    }
    tr.push({ pts, color: col.skin, weights: () => ({ [hand]: 1 }) });
  }
  B.loft(tr, { capEnd: true });
}

function buildShoe(B, s, col, side, k, x0) {
  const u = s.u;
  const foot = `${side}Foot`, toe = `${side}ToeBase`;
  const z0 = s.heelZ - 0.016 * u, z1 = s.toeZ + 0.014 * u;
  const keys = [
    // z,           halfW,  height, (toe-out of the sole outline handled by bones)
    [z0, 0.026, 0.060],
    [z0 + 0.012 * u, 0.036, 0.085],
    [s.heelZ + 0.02 * u, 0.040, 0.098],
    [0.0, 0.041, 0.106],
    [s.ballZ * 0.45, 0.044, 0.088],
    [s.ballZ, 0.050, 0.064],
    [s.ballZ + (s.toeZ - s.ballZ) * 0.55, 0.046, 0.050],
    [z1 - 0.012 * u, 0.034, 0.040],
    [z1, 0.016, 0.028],
  ];
  const P = profile(keys);
  const r = [];
  const NZ = 22, NA = 22;
  for (let j = 0; j <= NZ; j++) {
    const z = lerp(z0, z1, j / NZ);
    const [hw, hh] = P(z);
    const pts = [], colors = [];
    for (let i = 0; i < NA; i++) {
      // ring in the XY plane; start at the top, go around
      const a = (i / NA) * TAU;
      const [px, py] = se(a, hw * u, hh * u * 0.5, 3.2);
      const y = Math.max(0, hh * u * 0.5 + py);
      // medial side straighter, lateral side rounder
      const x = x0 + px * (px * k < 0 ? 0.92 : 1.05) + k * 0.004 * u;
      pts.push([x, y, z]);
      const sole = y < 0.016 * u;
      const lace = !sole && py > hh * u * 0.42 && z > 0.01 * u && z < s.ballZ * 0.9 && Math.abs(px) < hw * u * 0.35;
      colors.push(sole ? col.sole : lace ? col.lace : col.shoes);
    }
    const wt = smooth((z - (s.ballZ - 0.02 * u)) / (0.04 * u));
    r.push({ pts, color: (i) => colors[i], weights: () => ({ [foot]: 1 - wt, [toe]: wt }) });
  }
  B.loft(r, { capStart: true, capEnd: true });
}
