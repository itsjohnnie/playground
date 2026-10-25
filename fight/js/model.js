// Clay puppet builder. A real skeleton of THREE.Bones; the torso, arms and
// legs are single smooth SkinnedMeshes weighted across their joints, so
// elbows, knees and waists bend without seams. Heads are sculpted from a
// dense sphere (jaw, chin, cheekbones, brow ridge, eye sockets) and dressed
// with set-in eyes, lids, brows, nose, lips, teeth, ears, hair and glasses.
// Hands have jointed fingers that form fists, open palms and points.
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { sphere, capsule, box, cone, cyl, torus, mesh, clayMat, prepareBoil } from './clay.js';
import { noise3, mulberry32, DEG, clamp, lerp } from './util.js';
import { JOINTS } from './poses.js';

const BUILDS = {
  slim:    { sh: 0.205, arm: 0.05,  leg: 0.07,  chest: 0.175, waist: 0.14,  hip: 0.155, depth: 0.125, belly: 0,    scale: 1,    head: 0.31 },
  average: { sh: 0.22,  arm: 0.056, leg: 0.076, chest: 0.19,  waist: 0.158, hip: 0.165, depth: 0.135, belly: 0.012, scale: 1.02, head: 0.31 },
  muscle:  { sh: 0.265, arm: 0.07,  leg: 0.086, chest: 0.235, waist: 0.165, hip: 0.172, depth: 0.155, belly: 0,    scale: 1.06, head: 0.3 },
  heavy:   { sh: 0.24,  arm: 0.064, leg: 0.084, chest: 0.215, waist: 0.2,   hip: 0.19,  depth: 0.165, belly: 0.045, scale: 1.04, head: 0.31 },
  giant:   { sh: 0.31,  arm: 0.092, leg: 0.105, chest: 0.29,  waist: 0.225, hip: 0.215, depth: 0.2,   belly: 0.03, scale: 1.3,  head: 0.29 },
};

const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const gauss = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
const C = (hex) => new THREE.Color(hex);
const darken = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

const THIGH = 0.41, SHIN = 0.4, FOOT = 0.085;
const SPINE_Y = 0.08, CHEST_Y = 0.22, NECK_Y = 0.22, HEAD_Y = 0.07;
const UPPER = 0.29, FORE = 0.26;

// ------------------------------------------------------------------ skinning
// Weight for a point at axial coordinate s along a chain of joints. Around
// each joint the two neighbouring bones are blended with a smoothstep.
function chainWeights(s, joints, blend) {
  let k = 0;
  for (let i = 0; i < joints.length; i++) if (s >= joints[i].s) k = i;
  for (let i = 1; i < joints.length; i++) {
    const j = joints[i];
    if (Math.abs(s - j.s) < blend) {
      const w = smooth(j.s - blend, j.s + blend, s);
      return [[i - 1, 1 - w], [i, w]];
    }
  }
  return [[k, 1]];
}

// A closed, lumpy tube around a vertical axis. profile(t) gives the
// cross-section; colorAt paints clothing; weights drive the skin.
function skinTube({ yA, yB, rings = 36, radial = 22, cx = 0, cz = 0, profile, colorAt, weights, seed = 1, lump = 0.006 }) {
  const pos = [], col = [], si = [], sw = [], idx = [];
  const c = new THREE.Color();
  const push = (x, y, z, t, a) => {
    pos.push(x, y, z);
    colorAt(c, t, y, x - cx, z - cz, a);
    col.push(c.r, c.g, c.b);
    const w = weights(y);
    const ii = [0, 0, 0, 0], ww = [0, 0, 0, 0];
    w.forEach(([b, v], k) => { ii[k] = b; ww[k] = v; });
    si.push(...ii); sw.push(...ww);
  };
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    const y = lerp(yA, yB, t);
    const p = profile(t);
    const n = p.n ?? 2;
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      // Superellipse cross-section: squarer chests, rounder limbs.
      const ex = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / n), ez = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / n);
      let rx = p.rx, rz = sa >= 0 ? p.rzF : p.rzB;
      const nz = noise3(ca * 2 + seed, y * 9, sa * 2, seed) * lump;
      const x = cx + ex * (rx + nz), z = cz + (p.dz || 0) + ez * (rz + nz);
      push(x, y, z, t, a);
    }
  }
  // Poles.
  const top = pos.length / 3; push(cx, yA + (yA > yB ? 0.004 : -0.004), cz + (profile(0).dz || 0), 0, 0);
  const bot = pos.length / 3; push(cx, yB + (yB > yA ? 0.004 : -0.004), cz + (profile(1).dz || 0), 1, 0);
  const flip = yA > yB;
  for (let i = 0; i < rings; i++) for (let j = 0; j < radial; j++) {
    const a = i * radial + j, b = i * radial + ((j + 1) % radial), c2 = (i + 1) * radial + j, d = (i + 1) * radial + ((j + 1) % radial);
    if (flip) idx.push(a, c2, b, b, c2, d); else idx.push(a, b, c2, b, d, c2);
  }
  for (let j = 0; j < radial; j++) {
    const a = j, b = (j + 1) % radial;
    const la = rings * radial + j, lb = rings * radial + ((j + 1) % radial);
    if (flip) { idx.push(top, a, b); idx.push(bot, lb, la); } else { idx.push(top, b, a); idx.push(bot, la, lb); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function skinned(geo, bones, opts = {}) {
  const m = new THREE.SkinnedMesh(geo, clayMat('#ffffff', { vertexColors: true, roughness: opts.roughness ?? 0.72, bumps: opts.bumps ?? 0.5 }));
  m.castShadow = true;
  m.frustumCulled = false;
  m.userData.skinnedBones = bones;
  return m;
}

// ------------------------------------------------------------------ head
function sculptFn(h) {
  return (x, y, z) => {
    let X = x * h.W, Y = y * h.H, Z = z * h.D;
    const front = Math.max(0, z);
    const low = smooth(0.08, -0.9, y);
    X *= lerp(1, h.jaw, low);
    Z *= lerp(1, 0.94, low);
    Z += h.chin * gauss(y, -0.72, 0.22) * front * front * 1.6;
    Y -= h.chinLen * gauss(y, -0.82, 0.25) * front;
    X += Math.sign(x) * h.cheek * gauss(y, -0.1, 0.2) * gauss(z, 0.5, 0.32);
    Z += h.brow * gauss(y, 0.24, 0.08) * Math.pow(front, 3) * gauss(x, 0, 0.5);
    const eg = 0.34 * (h.eye?.gap ?? 1);
    for (const sx of [1, -1]) {
      const d2 = (x - sx * eg) ** 2 + (y - 0.1) ** 2 * 1.3;
      Z -= h.socket * Math.exp(-d2 / 0.02) * front;
    }
    Z += h.muzzle * gauss(y, -0.42, 0.18) * gauss(x, 0, 0.32) * front;
    if (z < 0) Z -= 0.05 * gauss(y, 0.25, 0.35) * -z;
    if (y > 0) Y *= h.forehead;
    Y *= 1 - 0.05 * smooth(0.7, 1, y);
    return new THREE.Vector3(X, Y + h.H * 0.94, Z);
  };
}

function headGeometry(R, h, seg = 96) {
  let g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const unit = new Float32Array(p.count * 3);
  const f = sculptFn(h);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    unit[i * 3] = x; unit[i * 3 + 1] = y; unit[i * 3 + 2] = z;
    const v = f(x, y, z).multiplyScalar(R);
    const n = noise3(x * 3 + 5, y * 3, z * 3, 11) * R * 0.012;
    p.setXYZ(i, v.x + x * n, v.y + y * n, v.z + z * n);
  }
  g.computeVertexNormals();
  g.userData.unit = unit;
  return g;
}

// A shell over the region of the head where mask(unit) is true, pushed
// outward: hair caps, stubble, beards.
function headShell(headGeo, R, mask, thick, opts = {}) {
  const p = headGeo.attributes.position, nrm = headGeo.attributes.normal, unit = headGeo.userData.unit, ix = headGeo.index;
  // Masks return a signed margin (>0 inside). The shell thins to nothing and
  // sinks under the skin near the edge, so hairlines read as smooth curves.
  const marg = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const m = mask(unit[i * 3], unit[i * 3 + 1], unit[i * 3 + 2]);
    marg[i] = typeof m === 'number' ? m : m ? 1 : -1;
  }
  const keep = (i) => marg[i] > -0.07;
  const map = new Map(), pos = [], idx = [];
  const add = (i) => {
    if (map.has(i)) return map.get(i);
    const ux = unit[i * 3], uy = unit[i * 3 + 1], uz = unit[i * 3 + 2];
    const full = (typeof thick === 'function' ? thick(ux, uy, uz) : thick) + noise3(ux * (opts.freq ?? 7), uy * (opts.freq ?? 7), uz * (opts.freq ?? 7), opts.seed ?? 3) * (opts.lump ?? 0.012);
    const k = smooth(-0.05, opts.edge ?? 0.07, marg[i]);
    const t = lerp(-0.012, full, k);
    pos.push(p.getX(i) + nrm.getX(i) * t * R, p.getY(i) + nrm.getY(i) * t * R, p.getZ(i) + nrm.getZ(i) * t * R);
    map.set(i, pos.length / 3 - 1);
    return pos.length / 3 - 1;
  };
  for (let k = 0; k < ix.count; k += 3) {
    const a = ix.getX(k), b = ix.getX(k + 1), c = ix.getX(k + 2);
    if (keep(a) || keep(b) || keep(c)) if (marg[a] > -0.2 && marg[b] > -0.2 && marg[c] > -0.2) idx.push(add(a), add(b), add(c));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function curveTube(points, r, color, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(points, !!opts.closed);
  const g = new THREE.TubeGeometry(curve, opts.seg ?? 24, r, opts.radial ?? 8, !!opts.closed);
  // Taper the ends so brows and lips look pinched from clay.
  if (opts.taper !== false && !opts.closed) {
    const p = g.attributes.position, n = (opts.radial ?? 8) + 1, segs = (opts.seg ?? 24) + 1;
    for (let i = 0; i < segs; i++) {
      const t = i / (segs - 1), k = 0.35 + 0.65 * Math.sin(t * Math.PI);
      const c = curve.getPointAt(t);
      for (let j = 0; j < n; j++) {
        const vi = i * n + j;
        p.setXYZ(vi, c.x + (p.getX(vi) - c.x) * k, c.y + (p.getY(vi) - c.y) * k, c.z + (p.getZ(vi) - c.z) * k);
      }
    }
    g.computeVertexNormals();
  }
  return mesh(g, color, opts);
}

function buildHead(headBone, def, R) {
  const h = def.head;
  const skin = def.skin;
  const face = { R };
  const f = sculptFn(h);
  const at = (x, y, z, out = 0) => { const n = new THREE.Vector3(x, y, z).normalize(); const v = f(n.x, n.y, n.z).multiplyScalar(R); return v.addScaledVector(n, out * R); };
  const headGeo = headGeometry(R, h);
  const head = mesh(headGeo, skin, { roughness: def.shiny ? 0.45 : 0.7, bumps: 0.35 });
  headBone.add(head);
  face.skull = head;
  face.at = at;

  // Ears.
  const es = (h.ear ?? 1) * R;
  for (const sx of [1, -1]) {
    const p = at(sx, -0.02, -0.08);
    const ear = new THREE.Group();
    ear.position.copy(p);
    ear.rotation.y = sx * 0.35;
    ear.add(sphere(es * 0.2, skin, { scale: [0.38, 1, 0.72] }));
    ear.add(torus(es * 0.11, es * 0.035, darken(skin, 0.92), { pos: [sx * es * 0.04, 0, 0], rot: [0, Math.PI / 2, 0], scale: [1, 1.5, 1] }));
    headBone.add(ear);
  }

  // Eyes set into the sockets.
  const ey = h.eye || {};
  const eR = R * 0.15 * (ey.size ?? 1);
  const eg = 0.34 * (ey.gap ?? 1);
  face.eyes = [];
  for (const sx of [1, -1]) {
    const surf = at(sx * eg, 0.1, 0.94);
    const eye = new THREE.Group();
    eye.position.copy(surf).add(new THREE.Vector3(0, 0, -eR * 0.42));
    headBone.add(eye);
    const ball = new THREE.Group();
    eye.add(ball);
    ball.add(sphere(eR, def.allClay ? '#d8dce4' : '#f7f5ef', { lump: 0.0015, roughness: 0.25, rim: 0.05, boil: 0.2 }));
    const iris = new THREE.Group();
    iris.position.z = eR * 0.84;
    ball.add(iris);
    iris.add(sphere(eR * 0.52, ey.iris || '#4a3524', { scale: [1, 1, 0.42], lump: 0.001, roughness: 0.25, boil: 0.2, emissive: ey.glow ? ey.iris : undefined, emissiveIntensity: ey.glow ? 2.5 : 1 }));
    iris.add(sphere(eR * 0.26, '#080606', { scale: [1, 1, 0.4], pos: [0, 0, eR * 0.1], lump: 0.001, roughness: 0.15, boil: 0.2 }));
    iris.add(sphere(eR * 0.1, '#ffffff', { pos: [eR * 0.15, eR * 0.18, eR * 0.2], lump: 0, roughness: 0.1, boil: 0, rim: 0, emissive: '#ffffff', emissiveIntensity: 0.6 }));
    // Lids: shells of skin that rotate over the eyeball.
    const lidGeo = new THREE.SphereGeometry(eR * 1.12, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const upper = new THREE.Group();
    upper.add(mesh(lidGeo, skin, { bumps: 0.3 }));
    eye.add(upper);
    const lowerGeo = new THREE.SphereGeometry(eR * 1.1, 22, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
    const lower = new THREE.Group();
    lower.add(mesh(lowerGeo, skin, { bumps: 0.3 }));
    eye.add(lower);
    // Lid crease and lashes.
    upper.add(torus(eR * 1.1, eR * 0.06, darken(skin, 0.78), { arc: Math.PI, rot: [Math.PI / 2 + 0.05, 0, 0], pos: [0, 0, 0], boil: 0.3 }));
    // Brows: a tapered roll of clay following the brow ridge.
    const bw = R * 0.25, bt = R * 0.05 * (def.brows?.thick ?? 1), arch = def.brows?.arch ?? 0.2;
    const brow = new THREE.Group();
    const bp = at(sx * eg, 0.33, 0.9, 0.03);
    brow.position.copy(bp);
    brow.add(curveTube([
      new THREE.Vector3(-sx * bw * 0.55, -bt * 0.2, -0.01),
      new THREE.Vector3(-sx * bw * 0.1, bt * (0.4 + arch), 0.006),
      new THREE.Vector3(sx * bw * 0.35, bt * (0.3 + arch * 1.2), 0),
      new THREE.Vector3(sx * bw * 0.6, -bt * 0.6, -0.025),
    ], bt, def.brows?.color || '#2a2018', { seg: 16, bumps: 1 }));
    headBone.add(brow);
    face.eyes.push({ eye, ball, iris, upper, lower, brow, sx, browY: bp.y });
  }

  // Nose: bridge, tip and nostril wings.
  const n = h.nose || {};
  const nL = R * 0.3 * (n.len ?? 1), nW = R * 0.12 * (n.w ?? 1), nT = R * 0.13 * (n.tip ?? 1);
  const root = at(0, 0.08, 1);
  const tip = at(0, -0.18, 1, 0.12 * (n.len ?? 1));
  const nose = new THREE.Group();
  headBone.add(nose);
  // The bridge widens into the tip so the nose reads as one lump of clay.
  const bridgeGeo = new THREE.LatheGeometry([0, 0.25, 0.5, 0.75, 1].map((u) => new THREE.Vector2(nW * (0.5 + 0.35 * u) * (n.bridge ?? 1), u)), 14);
  const bridge = mesh(bridgeGeo, skin, { bumps: 0.3 });
  const dir = tip.clone().sub(root);
  bridge.scale.set(1, dir.length(), 0.8);
  bridge.position.copy(root).add(new THREE.Vector3(0, 0, -0.012));
  bridge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  nose.add(bridge);
  nose.add(sphere(nT, skin, { pos: tip.toArray(), scale: [1.05, 0.9, 0.95], bumps: 0.3 }));
  for (const sx of [1, -1]) nose.add(sphere(nT * 0.7, skin, { pos: [tip.x + sx * nW * 0.85, tip.y - nT * 0.3, tip.z - nT * 0.5], scale: [0.9, 0.8, 1], bumps: 0.3 }));
  for (const sx of [1, -1]) nose.add(sphere(nT * 0.22, darken(skin, 0.45), { pos: [tip.x + sx * nW * 0.45, tip.y - nT * 0.72, tip.z - nT * 0.2], scale: [1, 0.6, 1], boil: 0.2 }));
  face.noseLen = nL;

  // Mouth: lips around a row of teeth; the jaw group opens.
  const mo = h.mouth || {};
  const mw = R * 0.33 * (mo.w ?? 1), lip = R * 0.05 * (mo.lip ?? 1), smile = mo.smile ?? 0.3;
  const mc = at(0, -0.45, 1, 0.045);
  const mouth = new THREE.Group();
  mouth.position.copy(mc);
  headBone.add(mouth);
  const lipColor = def.lips || '#' + new THREE.Color(skin).multiply(new THREE.Color(0.86, 0.6, 0.6)).getHexString();
  const curveLip = (y, up, k) => [-1, -0.5, 0, 0.5, 1].map((u) => new THREE.Vector3(u * mw * k, y + (Math.abs(u) ** 2) * up, -(Math.abs(u) ** 2) * mw * 0.55));
  mouth.add(mesh(new THREE.SphereGeometry(mw * 0.92, 20, 12), '#3a1216', { scale: [1, 0.5, 0.4], pos: [0, -lip * 0.3, -mw * 0.62], boil: 0.3 }));
  const tW = mw * 1.6, tH = lip * 1.8;
  const teeth = new THREE.Group();
  const toothCol = def.allClay ? '#9aa0aa' : '#f8f5ec';
  const topRow = box(tW, tH, lip * 1.1, toothCol, { pos: [0, tH * 0.48, lip * 0.05], round: 0.6, roughness: 0.3, rim: 0.05, boil: 0.3 });
  for (let i = -3; i <= 3; i++) if (i) topRow.add(box(0.0025, tH * 0.9, lip * 1.12, '#d6cfbf', { pos: [i * tW / 7, 0, 0.0005 - (i / 3.5) ** 2 * mw * 0.45], boil: 0 }));
  teeth.add(topRow);
  mouth.add(teeth);
  // Teeth rows curve with the mouth.
  for (const row of [topRow]) { const pp = row.geometry.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i); pp.setZ(i, pp.getZ(i) - (x / (tW / 2)) ** 2 * mw * 0.45); } row.geometry.computeVertexNormals(); }
  const upperLip = curveTube(curveLip(lip * 1.55, smile * lip * 1.8, 1), lip, lipColor, { seg: 20, bumps: 0.4 });
  mouth.add(upperLip);
  const jaw = new THREE.Group();
  mouth.add(jaw);
  const botRow = box(tW * 0.94, tH * 0.9, lip * 1.1, toothCol, { pos: [0, -tH * 0.42, 0], round: 0.6, roughness: 0.3, rim: 0.05, boil: 0.3 });
  { const pp = botRow.geometry.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i); pp.setZ(i, pp.getZ(i) - (x / (tW / 2)) ** 2 * mw * 0.45); } botRow.geometry.computeVertexNormals(); }
  for (let i = -3; i <= 3; i++) if (i) botRow.add(box(0.0025, tH * 0.8, lip * 1.12, '#d6cfbf', { pos: [i * tW / 8, 0, 0.0005 - (i / 4) ** 2 * mw * 0.4], boil: 0 }));
  jaw.add(botRow);
  const lowerLip = curveTube(curveLip(-lip * 1.65, smile * lip * 1.4, 0.92), lip * 1.2, lipColor, { seg: 20, bumps: 0.4 });
  jaw.add(lowerLip);
  face.mouth = { group: mouth, jaw, teeth, upperLip, lowerLip, lip, mw };

  // Facial hair: shells hugging the jaw.
  const fh = def.facial || {};
  const notMouth = (x, y, z) => !(Math.abs(x) < 0.3 && y > -0.62 && y < -0.28 && z > 0.6);
  // Beards follow the jawline: chin and lower cheeks, up the sides to the ears.
  const jawline = (lim) => (x, y, z) => {
    if (z < -0.2 || (Math.abs(x) > 0.8 && y > -0.35 && z < 0.1)) return -1;
    const mouthHole = Math.min(0.3 - Math.abs(x), y + 0.62, -0.28 - y, z - 0.6);
    return Math.min(lim - 0.18 * (1 - Math.abs(x)) - y, -mouthHole);
  };
  if (fh.stubble) headBone.add(mesh(headShell(headGeo, R, jawline(-0.36), 0.012, { lump: 0.003 }), fh.stubble, { bumps: 1.6, roughness: 0.92 }));
  if (fh.beardShort) headBone.add(mesh(headShell(headGeo, R, jawline(-0.34), 0.024, { lump: 0.01, freq: 14 }), fh.beardShort, { bumps: 1.7, roughness: 0.95 }));
  if (fh.beard) headBone.add(mesh(headShell(headGeo, R, jawline(-0.3), (x, y) => 0.03 + 0.04 * smooth(-0.4, -0.95, y), { lump: 0.018, freq: 12 }), fh.beard, { bumps: 1.8, roughness: 0.95 }));
  if (fh.mustache) {
    for (const sx of [1, -1]) headBone.add(curveTube([at(0, -0.33, 1, 0.03), at(sx * 0.18, -0.36, 0.98, 0.03), at(sx * 0.3, -0.46, 0.93, 0.02)], R * 0.035, fh.mustache, { seg: 10, bumps: 1.2 }));
  }

  buildHair(headBone, def, R, headGeo, at);
  buildGlasses(headBone, def, R, at, eg, eR);

  if (def.allClay) {
    // The AGI: a glowing seam across the forehead.
    headBone.add(curveTube([at(-0.6, 0.45, 0.8, 0.01), at(0, 0.5, 1, 0.02), at(0.6, 0.45, 0.8, 0.01)], R * 0.02, '#3af0ff', { emissive: '#3af0ff', emissiveIntensity: 3, taper: true }));
  }
  headBone.userData.r = R;
  headBone.userData.at = at;
  return face;
}

function buildHair(headBone, def, R, headGeo, at) {
  const hs = def.hair || {};
  const c = hs.color, c2 = hs.color2 || darken(c, 0.85);
  const hairMat = { bumps: 1.3, roughness: 0.85 };
  // Hairline: high at the forehead, down to the nape, clear of the ears.
  const line = (front, back, side = 0.14) => (x, y, z) => {
    const b = (1 - z) / 2;
    let lim = lerp(front, back, smooth(0.05, 1, b));
    // Lift the line around the ears.
    lim = Math.max(lim, side * smooth(0.6, 0.85, Math.abs(x)) * smooth(-0.55, -0.3, z) - (1 - smooth(-0.55, -0.3, z)));
    return y - lim;
  };
  const shell = (mask, t, o) => mesh(headShell(headGeo, R, mask, t, o), c, hairMat);
  const rnd = mulberry32(def.id.length * 977 + 3);
  const blobs = (count, rMin, rMax, out, filter, color = c, flatten = 1) => {
    const geos = [];
    for (let i = 0; i < count * 6 && geos.length < count; i++) {
      const u = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
      if (u.lengthSq() > 1 || u.lengthSq() < 0.05) continue;
      u.normalize();
      if (!(filter(u.x, u.y, u.z) > 0)) continue;
      const r = R * lerp(rMin, rMax, rnd());
      const g = new THREE.IcosahedronGeometry(r, 2);
      g.scale(1, flatten, 1);
      const p = at(u.x, u.y, u.z, out + rnd() * 0.03);
      g.translate(p.x, p.y, p.z);
      geos.push(g);
    }
    const m = mesh(mergeGeometries(geos), color, hairMat);
    return m;
  };
  // Sculpted strands: tool-drawn rolls of clay lying on the hair mass.
  const strands = (count, mask, outFn, flow, len, rad, colors) => {
    const sets = colors.map(() => []);
    for (let i = 0, made = 0; i < count * 8 && made < count; i++) {
      const u = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
      if (u.lengthSq() > 1 || u.lengthSq() < 0.05) continue;
      u.normalize();
      if (!(mask(u.x, u.y, u.z) > 0.1)) continue;
      const pts = [];
      const v = u.clone();
      const L = len * (0.7 + rnd() * 0.6);
      for (let k = 0; k < 5; k++) {
        pts.push(at(v.x, v.y, v.z, outFn(v.x, v.y, v.z)));
        v.add(flow(v).multiplyScalar(L / 4)).normalize();
      }
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, R * rad * (0.7 + rnd() * 0.6), 5, false);
      sets[made % colors.length].push(geo);
      made++;
    }
    sets.forEach((geos, k) => { if (geos.length) headBone.add(mesh(mergeGeometries(geos), colors[k], hairMat)); });
  };
  const back = (v) => new THREE.Vector3(v.x * 0.15, v.z > 0.1 ? 0.45 : -0.35, -1);
  switch (hs.style) {
    case 'short': {
      const fr = hs.fringe ?? 0.4;
      const th = (x, y, z) => 0.045 + 0.05 * smooth(0.2, 0.9, y) + 0.03 * fr * smooth(0.4, 0.9, z) * smooth(0.3, 0.6, y);
      headBone.add(shell(line(0.5, -0.35), th, { lump: 0.02, freq: 9 }));
      strands(55, line(0.5, -0.35), (x, y, z) => th(x, y, z) + 0.005, back, 0.55, 0.032, [c, c2, darken(c, 0.8)]);
      // A tousled fringe breaking the hairline.
      strands(10 + fr * 14, (x, y, z) => (z > 0.55 ? line(0.5, -0.35)(x, y, z) - 0.05 : -1), (x, y, z) => th(x, y, z), (v) => new THREE.Vector3(v.x * 0.4, -0.7, 0.8), 0.18 + fr * 0.15, 0.04, [c, c2]);
      break;
    }
    case 'receding': {
      headBone.add(shell(line(0.6, -0.35), 0.03, { lump: 0.008, freq: 12 }));
      strands(40, line(0.6, -0.35), () => 0.03, back, 0.35, 0.02, [c, c2]);
      break;
    }
    case 'curly': {
      headBone.add(shell(line(0.42, -0.4), 0.05, { lump: 0.02 }));
      headBone.add(blobs(150, 0.085, 0.13, 0.08, line(0.38, -0.35), c));
      headBone.add(blobs(80, 0.07, 0.11, 0.15, line(0.46, -0.2), c2));
      break;
    }
    case 'tightcurls': {
      headBone.add(shell(line(0.46, -0.4), 0.04, { lump: 0.015 }));
      headBone.add(blobs(170, 0.05, 0.075, 0.045, line(0.44, -0.35), c));
      headBone.add(blobs(70, 0.045, 0.07, 0.07, line(0.5, -0.1), c2));
      break;
    }
    case 'swept': {
      const sw = (x, y, z) => 0.05 + 0.09 * smooth(0.3, 0.95, y) * smooth(-0.2, 0.7, z);
      headBone.add(shell(line(0.5, -0.35), sw, { lump: 0.02, freq: 6 }));
      strands(50, line(0.5, -0.35), (x, y, z) => sw(x, y, z) + 0.004, back, 0.7, 0.03, [c, c2]);
      // Swept-back ridges.
      for (let i = -3; i <= 3; i++) {
        const xx = i * 0.12;
        headBone.add(curveTube([at(xx, 0.62, 0.75, 0.13), at(xx * 1.05, 0.92, 0.25, 0.14), at(xx * 1.1, 0.75, -0.55, 0.08)], R * 0.06, i % 2 ? c2 : c, { seg: 12, bumps: 1.2 }));
      }
      break;
    }
    case 'sidepart': {
      const spT = (x, y, z) => 0.05 + 0.05 * smooth(0.3, 0.9, y);
      headBone.add(shell(line(0.5, -0.35), spT, { lump: 0.015 }));
      strands(45, line(0.5, -0.35), (x, y, z) => spT(x, y, z) + 0.004, (v) => new THREE.Vector3(v.x > 0.38 ? 0.6 : -0.8, -0.15, v.z > 0.3 ? 0.1 : -0.6), 0.5, 0.03, [c, c2]);
      // Fringe swept across the forehead from the part.
      headBone.add(curveTube([at(0.35, 0.75, 0.6, 0.1), at(0.05, 0.62, 0.85, 0.08), at(-0.35, 0.55, 0.85, 0.07), at(-0.65, 0.5, 0.55, 0.06)], R * 0.09, c2, { seg: 14, bumps: 1.2 }));
      headBone.add(curveTube([at(0.38, 0.6, 0.75, 0.04), at(0.38, 0.95, 0.2, 0.12), at(0.35, 0.7, -0.6, 0.06)], R * 0.015, darken(c, 0.6), { seg: 10 }));
      break;
    }
    case 'long': {
      headBone.add(shell(line(0.45, -0.6, 0.0), (x, y, z) => 0.05 + 0.04 * smooth(0.3, 0.9, y), { lump: 0.02 }));
      // Curtains down to the shoulders, tucked behind the ears.
      for (let i = 0; i < 11; i++) {
        const a = Math.PI - 0.3 + i * ((Math.PI + 0.6) / 10);
        const x0 = Math.cos(a), z0 = Math.sin(a);
        const top = at(x0 * 0.9, 0.35, z0 * 0.9 - 0.15, 0.06);
        headBone.add(curveTube([top, at(x0 * 1.05, -0.3, z0 - 0.2, 0.12), new THREE.Vector3(top.x * 1.15, -R * 0.15, top.z * 1.1 - R * 0.1)], R * 0.13, i % 2 ? c : c2, { seg: 12, bumps: 1.4, taper: true }));
      }
      for (const sx of [1, -1]) headBone.add(curveTube([at(sx * 0.3, 0.6, 0.85, 0.08), at(sx * 0.7, 0.4, 0.55, 0.1), at(sx * 0.95, 0.1, 0.05, 0.08)], R * 0.08, c2, { seg: 12, bumps: 1.3 }));
      break;
    }
    case 'antenna': {
      const p = at(0, 1, 0, 0);
      headBone.add(cyl(R * 0.03, R * 0.03, R * 0.5, '#6a6e78', { pos: [p.x, p.y + R * 0.25, p.z] }));
      headBone.add(sphere(R * 0.08, '#3af0ff', { pos: [p.x, p.y + R * 0.55, p.z], emissive: '#3af0ff', emissiveIntensity: 3 }));
      break;
    }
    case 'bald':
    default: {
      if (hs.style === 'balding') {
        headBone.add(shell((x, y, z) => y > -0.35 && y < 0.38 && z < 0.25 && !(Math.abs(x) > 0.75 && y < 0.15 && z > -0.45), 0.03, { lump: 0.015 }));
      }
      break;
    }
  }
}

function buildGlasses(headBone, def, R, at, eg, eR) {
  const gl = def.glasses;
  if (!gl) return;
  const col = gl.color;
  const g = new THREE.Group();
  headBone.add(g);
  const lensMat = new THREE.MeshStandardMaterial({ color: gl.type === 'aviator' ? '#4a3a1a' : '#cfe4ff', transparent: true, opacity: gl.type === 'aviator' ? 0.75 : 0.18, roughness: 0.05, metalness: 0.3 });
  const centers = [1, -1].map((sx) => at(sx * eg, 0.1, 0.94, 0.11));
  const w = eR * (gl.type === 'rect' ? 1.55 : gl.type === 'aviator' ? 1.5 : 1.35), hh = eR * (gl.type === 'rect' ? 1.15 : gl.type === 'aviator' ? 1.35 : 1.3);
  centers.forEach((c, i) => {
    const sx = i ? -1 : 1;
    let pts;
    if (gl.type === 'round') pts = Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * w, Math.sin(a) * hh, 0); });
    else if (gl.type === 'aviator') pts = Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * Math.PI * 2; const s = Math.sin(a); return new THREE.Vector3(Math.cos(a) * w * (s < 0 ? 0.85 + 0.15 * sx * Math.cos(a) : 1), s * hh * (s < 0 ? 1.2 : 0.75), 0); });
    else pts = [[-1, -0.8], [-0.95, 0.85], [0, 1], [0.95, 0.85], [1, -0.8], [0, -1]].map(([x, y]) => new THREE.Vector3(x * w, y * hh, 0));
    const ring = new THREE.Group();
    ring.position.copy(c);
    ring.rotation.y = sx * 0.12;
    if (gl.type !== 'rimless') ring.add(curveTube(pts, R * (gl.type === 'rect' ? 0.024 : 0.016), col, { closed: true, seg: 32, radial: 6, taper: false, roughness: 0.35, metalness: gl.type === 'aviator' ? 0.7 : 0.2, boil: 0.3 }));
    const lens = new THREE.Mesh(new THREE.CircleGeometry(1, 24), lensMat);
    lens.scale.set(w, hh, 1);
    ring.add(lens);
    g.add(ring);
    // Temple arm back to the ear.
    const ear = at(sx, 0.05, -0.05, 0.04);
    g.add(curveTube([c.clone().add(new THREE.Vector3(sx * w, hh * 0.5, -0.01)), ear.clone().add(new THREE.Vector3(0, 0.0, 0.02))], R * 0.012, col, { taper: false, seg: 4, radial: 5, metalness: 0.3 }));
  });
  g.add(curveTube([centers[0].clone().add(new THREE.Vector3(-w * 0.95, hh * 0.3, 0)), at(0, 0.18, 1, 0.13), centers[1].clone().add(new THREE.Vector3(w * 0.95, hh * 0.3, 0))], R * 0.014, col, { taper: false, seg: 8, radial: 5, metalness: 0.3 }));
}

// ------------------------------------------------------------------ hands
const GRIPS = {
  fist:  { f: [[1.45, 1.7], [1.5, 1.7], [1.55, 1.7], [1.6, 1.7]], t: [0.9, 0.9] },
  open:  { f: [[0.15, 0.15], [0.12, 0.12], [0.15, 0.15], [0.2, 0.2]], t: [0.1, 0.2] },
  relax: { f: [[0.45, 0.5], [0.55, 0.6], [0.6, 0.65], [0.7, 0.7]], t: [0.4, 0.3] },
  point: { f: [[0.0, 0.05], [1.5, 1.7], [1.55, 1.7], [1.6, 1.7]], t: [0.9, 0.9] },
  horns: { f: [[0.0, 0.05], [1.5, 1.7], [1.55, 1.7], [0.05, 0.05]], t: [0.9, 0.9] },
  grip:  { f: [[1.2, 1.3], [1.25, 1.35], [1.3, 1.4], [1.35, 1.4]], t: [0.7, 0.6] },
};

function buildHand(handBone, side, def, armR) {
  const sx = side === 'L' ? 1 : -1;
  const skin = def.skin;
  const k = clamp(armR / 0.05, 0.9, 1.6);
  const hand = new THREE.Group();
  hand.scale.setScalar(k * 1.15);
  handBone.add(hand);
  // Palm hangs down (-y), palm facing the body (-x for the left hand).
  hand.add(box(0.034, 0.075, 0.07, skin, { pos: [0, -0.035, 0], round: 0.9 }));
  const fingers = [];
  const lens = [[0.034, 0.028], [0.038, 0.03], [0.035, 0.028], [0.028, 0.022]];
  for (let i = 0; i < 4; i++) {
    const zz = 0.026 - i * 0.017;
    const b1 = new THREE.Group();
    b1.position.set(0, -0.072, zz);
    hand.add(b1);
    b1.add(capsule(0.0095, lens[i][0], skin, { seg: 8, lump: 0.0008 }));
    const b2 = new THREE.Group();
    b2.position.y = -lens[i][0] - 0.004;
    b1.add(b2);
    b2.add(capsule(0.0088, lens[i][1], skin, { seg: 8, lump: 0.0008 }));
    fingers.push([b1, b2]);
  }
  const t1 = new THREE.Group();
  t1.position.set(-sx * 0.012, -0.02, 0.035);
  t1.rotation.set(-0.5, 0, 0);
  hand.add(t1);
  t1.add(capsule(0.011, 0.028, skin, { seg: 8, lump: 0.0008 }));
  const t2 = new THREE.Group();
  t2.position.y = -0.032;
  t1.add(t2);
  t2.add(capsule(0.01, 0.022, skin, { seg: 8, lump: 0.0008 }));
  return { sx, fingers, thumb: [t1, t2], grip: null, root: hand };
}

export function setGrip(hand, grip) {
  if (!hand || hand.grip === grip) return;
  const g = GRIPS[grip] || GRIPS.fist;
  hand.grip = grip;
  hand.fingers.forEach(([a, b], i) => {
    a.rotation.set(0, 0, -hand.sx * g.f[i][0]);
    b.rotation.set(0, 0, -hand.sx * g.f[i][1]);
  });
  hand.thumb[0].rotation.set(-0.5 - g.t[0] * 0.3, 0, -hand.sx * g.t[0]);
  hand.thumb[1].rotation.set(0, 0, -hand.sx * g.t[1]);
}

// ------------------------------------------------------------------ body
function outfitColors(def, b) {
  const top = def.top, skin = C(def.skin), shirt = C(top.color), inner = C(top.inner || top.color), pants = C(def.bottom.color), belt = C(darken(def.bottom.color, 0.55));
  const neckOpen = { tee: 0.505, vneck: 0.47, sweater: 0.46, hoodie: 0.52, quarterzip: 0.54, blazer: 0.5, leather: 0.5, vest: 0.5, shirtless: -1 }[top.type] ?? 0.5;
  return {
    torso: (c, t, y, x, z) => {
      if (y < 0.035) { c.copy(Math.abs(y - 0.028) < 0.012 ? belt : pants); return; }
      if (top.type === 'shirtless') { c.copy(skin); return; }
      const front = z > 0;
      // Open-front jackets show the shirt underneath in a V.
      if (['blazer', 'leather', 'vest'].includes(top.type) && front && Math.abs(x) < 0.015 + (y - 0.05) * (top.type === 'vest' ? 0.3 : 0.2) && y > 0.05) {
        c.copy(y > 0.52 ? skin : inner);
        // Lapel edge: a darker roll of clay along the opening.
        if (top.type !== 'vest' && Math.abs(x) > 0.015 + (y - 0.05) * 0.2 - 0.012) c.copy(shirt).multiplyScalar(0.6);
        return;
      }
      if (top.type === 'vest' && y > 0.4 && y < neckOpen + 0.03) { c.copy(inner); return; }
      if (top.type === 'sweater' && front && Math.abs(x) < (y - 0.3) * 0.45 && y > 0.3) { c.copy(y > 0.47 && Math.abs(x) < 0.035 ? skin : inner); return; }
      if (top.type === 'vneck' && front && Math.abs(x) < (y - 0.38) * 0.55 && y > 0.38) { c.copy(skin); return; }
      if (y > neckOpen + 0.03) { c.copy(skin); return; }
      if (top.type === 'quarterzip' && front && Math.abs(x) < 0.008 && y > 0.3) { c.copy(C('#9a9aa2')); return; }
      if (top.type === 'leather') { c.copy(shirt); return; }
      c.copy(shirt);
      // A hem ridge at the bottom of the shirt.
      if (y < 0.06) c.multiplyScalar(0.85);
    },
    arm: (c, t) => {
      const sleeve = { tee: 0.32, vneck: 0.32, shirtless: -1, vest: 0.92 }[top.type] ?? 0.93;
      const sleeveCol = top.type === 'vest' ? inner : shirt;
      if (t < sleeve) c.copy(t > sleeve - 0.035 ? sleeveCol.clone().multiplyScalar(0.85) : sleeveCol);
      else c.copy(skin);
    },
    leg: (c, t) => {
      const cuff = 0.97;
      c.copy(t < cuff ? pants : skin);
      if (t > cuff - 0.03 && t < cuff) c.multiplyScalar(0.8);
    },
  };
}

export function buildFighterModel(def) {
  const b = BUILDS[def.build] || BUILDS.slim;
  const g = new THREE.Group();
  const J = {};
  const bone = (name, parent, x, y, z) => { const o = new THREE.Bone(); o.name = name; o.position.set(x, y, z); (parent || g).add(o); J[name] = o; return o; };
  const hipY = THIGH + SHIN + FOOT;
  bone('root', null, 0, hipY, 0);
  bone('spine', J.root, 0, SPINE_Y, 0);
  bone('chest', J.spine, 0, CHEST_Y, 0);
  bone('neck', J.chest, 0, NECK_Y, 0);
  bone('head', J.neck, 0, HEAD_Y, 0);
  const shY = 0.15;
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    bone('clav' + side, J.chest, sx * 0.05, shY, 0);
    bone('sh' + side, J['clav' + side], sx * (b.sh - 0.05), 0, 0);
    bone('el' + side, J['sh' + side], 0, -UPPER, 0);
    bone('hand' + side, J['el' + side], 0, -FORE, 0);
    bone('hip' + side, J.root, sx * b.hip * 0.55, -0.03, 0);
    bone('kn' + side, J['hip' + side], 0, -THIGH, 0);
    bone('ft' + side, J['kn' + side], 0, -SHIN, 0);
  }
  g.updateMatrixWorld(true);
  const col = outfitColors(def, b);
  const seed = def.id.length * 13;

  // Torso: hips to neck in one skinned piece.
  const yA = -0.13, yB = SPINE_Y + CHEST_Y + NECK_Y + 0.03;
  const prof = [
    // t, rx, rzF, rzB, dz, n
    [0.0, 0.06, 0.05, 0.05, 0, 2],
    [0.05, b.hip * 0.82, b.depth * 0.82, b.depth * 0.9, 0, 2.2],
    [0.16, b.hip, b.depth * 0.95, b.depth * 1.05, -0.005, 2.3],
    [0.32, b.waist, b.depth * 0.85 + b.belly, b.depth * 0.85, b.belly * 0.4, 2.2],
    [0.55, b.chest * 0.96, b.depth * 0.98, b.depth * 0.9, 0.006, 2.5],
    [0.72, b.chest, b.depth * 1.02, b.depth * 0.95, 0.008, 2.6],
    [0.83, b.sh * 0.98, b.depth * 0.88, b.depth * 0.9, 0, 2.8],
    [0.9, b.sh * 0.72, b.depth * 0.7, b.depth * 0.78, -0.004, 2.3],
    [0.96, 0.068 * (b.arm > 0.06 ? 1.3 : 1), 0.06, 0.065, 0, 2],
    [1.0, 0.062 * (b.arm > 0.06 ? 1.3 : 1), 0.055, 0.06, 0, 2],
  ];
  const profAt = (rows) => (t) => {
    let i = 0;
    while (i < rows.length - 2 && t > rows[i + 1][0]) i++;
    const [t0, ...a] = rows[i], [t1, ...c] = rows[i + 1];
    const k = smooth(0, 1, (t - t0) / (t1 - t0));
    return { rx: lerp(a[0], c[0], k), rzF: lerp(a[1], c[1], k), rzB: lerp(a[2], c[2], k), dz: lerp(a[3], c[3], k), n: lerp(a[4], c[4], k) };
  };
  const torsoJoints = [{ s: -9 }, { s: SPINE_Y }, { s: SPINE_Y + CHEST_Y }, { s: SPINE_Y + CHEST_Y + NECK_Y }];
  const torso = skinned(skinTube({ yA, yB, rings: 44, radial: 26, profile: profAt(prof), colorAt: col.torso, weights: (y) => chainWeights(y, torsoJoints, 0.07), seed }), [J.root, J.spine, J.chest, J.neck], { roughness: def.top.type === 'leather' ? 0.38 : 0.72 });
  torso.position.y = hipY;
  // Tube is in root space; shift so it lines up in model space.
  torso.geometry.translate(0, 0, 0);

  // Limbs.
  const limbs = [];
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    const shW = new THREE.Vector3(); J['sh' + side].getWorldPosition(shW);
    const ar = b.arm;
    const armProf = [
      [0.0, ar * 0.9, ar * 0.9, ar * 0.9, 0, 2],
      [0.06, ar * 1.35, ar * 1.25, ar * 1.25, 0, 2],
      [0.22, ar * 1.12, ar * 1.12, ar * 1.05, 0, 2],
      [0.38, ar * 1.08, ar * 1.12, ar * 1.0, 0.002, 2],
      [0.52, ar * 0.84, ar * 0.84, ar * 0.84, 0, 2],
      [0.66, ar * 0.98, ar * 0.92, ar * 0.98, 0, 2],
      [0.92, ar * 0.66, ar * 0.62, ar * 0.62, 0, 2],
      [1.0, ar * 0.5, ar * 0.5, ar * 0.5, 0, 2],
    ];
    const top = 0.05, len = UPPER + FORE + top;
    const armJ = [{ s: -9 }, { s: 0 }, { s: UPPER }, { s: UPPER + FORE }];
    const ag = skinTube({ yA: shW.y + top, yB: shW.y - UPPER - FORE - 0.01, cx: shW.x, cz: shW.z, rings: 34, radial: 16, profile: profAt(armProf), colorAt: (c, t) => col.arm(c, t), weights: (y) => chainWeights(shW.y - y, armJ, 0.055), seed: seed + (sx > 0 ? 1 : 2) });
    limbs.push(skinned(ag, [J.chest, J['sh' + side], J['el' + side], J['hand' + side]], { roughness: def.top.type === 'leather' ? 0.38 : 0.72 }));
    const hpW = new THREE.Vector3(); J['hip' + side].getWorldPosition(hpW);
    const lr = b.leg;
    const legProf = [
      [0.0, lr * 1.1, lr * 1.1, lr * 1.1, 0, 2],
      [0.08, lr * 1.38, lr * 1.32, lr * 1.42, 0, 2],
      [0.3, lr * 1.22, lr * 1.25, lr * 1.18, 0.004, 2],
      [0.5, lr * 0.92, lr * 0.98, lr * 0.9, 0.006, 2],
      [0.66, lr * 1.0, lr * 0.95, lr * 1.08, -0.004, 2],
      [0.9, lr * 0.74, lr * 0.74, lr * 0.74, 0, 2],
      [1.0, lr * 0.66, lr * 0.66, lr * 0.66, 0, 2],
    ];
    const legJ = [{ s: -9 }, { s: 0 }, { s: THIGH }, { s: THIGH + SHIN }];
    const lg = skinTube({ yA: hpW.y + 0.07, yB: hpW.y - THIGH - SHIN - 0.02, cx: hpW.x, cz: hpW.z, rings: 34, radial: 18, profile: profAt(legProf), colorAt: (c, t) => col.leg(c, t), weights: (y) => chainWeights(hpW.y - y, legJ, 0.06), seed: seed + (sx > 0 ? 3 : 4) });
    limbs.push(skinned(lg, [J.root, J['hip' + side], J['kn' + side], J['ft' + side]]));
  }
  // Torso was built in root-local coordinates; rebuild it in model space.
  torso.geometry.translate(0, hipY, 0);
  torso.position.y = 0;
  for (const m of [torso, ...limbs]) {
    g.add(m);
    const sk = new THREE.Skeleton(m.userData.skinnedBones);
    m.bind(sk);
  }
  J.torsoMesh = torso;

  // Neck column (rigid, so the taffy finisher can stretch it).
  J.neck.add(capsule(0.064 * (b.arm > 0.06 ? 1.25 : 1), 0.06, def.skin, { centered: true, pos: [0, 0.04, -0.006] }));

  // Head.
  const face = buildHead(J.head, def, b.head);

  // Hands + feet.
  const hands = {};
  for (const side of ['L', 'R']) {
    hands[side] = buildHand(J['hand' + side], side, def, b.arm);
    setGrip(hands[side], 'fist');
    const sh = def.shoes || { color: '#222', sole: '#eee' };
    const ft = J['ft' + side];
    const fw = b.leg * 1.6;
    ft.add(box(fw * 1.05, 0.04, 0.27, sh.sole, { pos: [0, -0.065, 0.055], round: 0.8 }));
    ft.add(sphere(1, sh.color, { scale: [fw * 0.5, 0.055, 0.13], pos: [0, -0.03, 0.06] }));
    ft.add(sphere(1, sh.color, { scale: [fw * 0.48, 0.07, 0.08], pos: [0, -0.01, -0.02] }));
    for (let i = 0; i < 3; i++) ft.add(box(fw * 0.5, 0.006, 0.012, sh.sole, { pos: [0, 0.018 - i * 0.012, 0.09 + i * 0.03], rot: [0.5, 0, 0], boil: 0.3 }));
  }

  // Wardrobe details on the chest bone.
  const top = def.top;
  const chestZ = b.depth * 1.02;
  const C2 = J.chest;
  if (top.type === 'tee' || top.type === 'vneck') C2.add(torus(0.075 * (b.arm > 0.06 ? 1.3 : 1), 0.012, top.color, { pos: [0, NECK_Y - 0.005, 0.0], rot: [Math.PI / 2 + 0.25, 0, 0], scale: [1.1, 1, 1] }));
  if (top.type === 'hoodie') {
    C2.add(torus(0.12, 0.05, top.inner || top.color, { pos: [0, NECK_Y - 0.03, -0.04], rot: [Math.PI / 2 + 0.5, 0, 0], scale: [1.05, 1.2, 1] }));
    for (const sx of [1, -1]) C2.add(capsule(0.006, 0.12, '#f2f2f2', { pos: [sx * 0.035, NECK_Y - 0.04, chestZ * 0.9], rot: [0.1, 0, 0] }));
    C2.add(box(0.2, 0.09, 0.03, darken(top.color, 0.85), { pos: [0, -0.12, chestZ * 0.92] }));
  }
  if (top.type === 'quarterzip') {
    C2.add(torus(0.08 * (b.arm > 0.06 ? 1.3 : 1), 0.028, top.color, { pos: [0, NECK_Y + 0.0, 0], rot: [Math.PI / 2 + 0.15, 0, 0], scale: [1.15, 1.05, 1.4] }));
    C2.add(box(0.02, 0.035, 0.012, '#c8c8d0', { pos: [0, NECK_Y - 0.06, chestZ * 0.95], metalness: 0.7, roughness: 0.3 }));
  }
  if (top.type === 'sweater') {
    // Shirt collar points poking out of the sweater.
    for (const sx of [1, -1]) C2.add(cone(0.035, 0.08, top.inner, { pos: [sx * 0.045, NECK_Y - 0.03, chestZ * 0.6], rot: [-0.6, 0, sx * 2.4], scale: [1, 1, 0.35] }));
  }
  if (['blazer', 'leather', 'vest'].includes(top.type)) {
    const lap = top.type === 'leather' ? '#0a0a0c' : darken(top.color, 0.8);
    // Collar ring standing up around the neck.
    C2.add(torus(0.085 * (b.arm > 0.06 ? 1.3 : 1), 0.022, top.type === 'vest' ? (top.inner || '#fff') : lap, { pos: [0, NECK_Y - 0.01, -0.012], rot: [Math.PI / 2 + 0.35, 0, 0], scale: [1.15, 1.1, 1.3], roughness: top.type === 'leather' ? 0.3 : 0.7 }));
    if (top.type === 'leather') {
      C2.add(box(0.012, 0.3, 0.01, '#c8c8d0', { pos: [0.05, -0.04, chestZ * 0.98], metalness: 0.8, roughness: 0.3 }));
      for (const sx of [1, -1]) C2.add(box(0.1, 0.07, 0.03, '#0a0a0c', { pos: [sx * 0.11, NECK_Y - 0.04, -0.02], rot: [0.4, 0, sx * 0.5], roughness: 0.3 }));
    }
    if (top.type === 'vest') for (let i = 0; i < 3; i++) J.spine.add(sphere(0.008, '#2a2a2a', { pos: [0.03, 0.06 + i * 0.07, b.depth * 0.95] }));
  }
  if (top.logo === 'triangle') {
    const tri = new THREE.Shape(); tri.moveTo(-0.045, -0.035); tri.lineTo(0.045, -0.035); tri.lineTo(0, 0.04); tri.closePath();
    const m = mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.006, bevelEnabled: false }), '#f4f4f4', { smooth: true, rim: 0, boil: 0.3 });
    m.position.set(0, -0.0, chestZ * 1.02);
    C2.add(m);
  }
  if (top.logo === 'spark') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const ray = capsule(0.008, 0.035, '#f4ede4', { centered: true, pos: [Math.sin(a) * 0.022, Math.cos(a) * 0.022, chestZ * 1.03], rot: [0, 0, -a], boil: 0.3 });
      C2.add(ray);
    }
  }
  if (def.acc.includes('chain')) {
    C2.add(torus(0.1, 0.012, '#e8b830', { pos: [0, NECK_Y - 0.06, 0.05], rot: [1.15, 0, 0], scale: [1.1, 1.5, 1], metalness: 0.85, roughness: 0.25 }));
  }
  if (def.acc.includes('tie')) {
    C2.add(box(0.045, 0.22, 0.015, def.tie || '#c23838', { pos: [0, 0.02, chestZ * 1.0], round: 0.5 }));
    C2.add(box(0.05, 0.035, 0.02, def.tie || '#c23838', { pos: [0, NECK_Y - 0.075, chestZ * 0.9] }));
  }
  if (def.acc.includes('bowtie')) {
    for (const sx of [1, -1]) C2.add(cone(0.035, 0.07, '#111114', { pos: [sx * 0.032, NECK_Y - 0.06, chestZ * 0.88], rot: [0, 0, sx * Math.PI / 2] }));
    C2.add(sphere(0.018, '#111114', { pos: [0, NECK_Y - 0.06, chestZ * 0.92] }));
  }
  if (def.acc.includes('core')) {
    C2.add(sphere(0.07, '#3af0ff', { pos: [0, 0.05, chestZ * 0.98], scale: [1, 1, 0.4], emissive: '#3af0ff', emissiveIntensity: 3 }));
    for (let i = 0; i < 5; i++) C2.add(box(0.3, 0.008, 0.01, '#6a6e78', { pos: [0, -0.15 + i * 0.035 - (i > 2 ? 0.15 : 0), chestZ * 0.97] }));
  }

  g.scale.setScalar(b.scale);
  prepareBoil(g);
  setExpression(face, 'grit');
  return { group: g, joints: J, face, build: b, hipY, hands };
}

// ------------------------------------------------------------------ posing
// Applies a pose (degrees per logical joint) to the rig. Spine and neck
// rotations are spread over two bones each; collarbones shrug automatically
// when an arm goes overhead.
export function applyRigPose(m, p, jitter = 0) {
  const J = m.joints, d = DEG;
  const jr = () => (Math.random() - 0.5) * jitter;
  const set = (bone, x, y, z) => bone.rotation.set(x * d + jr(), y * d + jr(), z * d + jr());
  set(J.spine, p.spine[0] * 0.55, p.spine[1] * 0.5, p.spine[2] * 0.5);
  set(J.chest, p.spine[0] * 0.45 + (p.chest?.[0] || 0), p.spine[1] * 0.5, p.spine[2] * 0.5);
  set(J.neck, p.neck[0] * 0.55, p.neck[1] * 0.5, p.neck[2] * 0.5);
  set(J.head, p.neck[0] * 0.45, p.neck[1] * 0.5, p.neck[2] * 0.5);
  for (const s of ['L', 'R']) {
    const sh = p['sh' + s], sx = s === 'L' ? 1 : -1;
    const over = clamp((-sh[0] - 110) / 70, 0, 1) + clamp((sx * sh[2] - 70) / 60, 0, 1);
    set(J['clav' + s], 0, 0, sx * over * 14);
    set(J['sh' + s], sh[0], sh[1], sh[2]);
    set(J['el' + s], p['el' + s][0], p['el' + s][1], p['el' + s][2]);
    set(J['hip' + s], p['hip' + s][0], p['hip' + s][1], p['hip' + s][2]);
    set(J['kn' + s], p['kn' + s][0], p['kn' + s][1], p['kn' + s][2]);
    set(J['ft' + s], p['ft' + s][0], p['ft' + s][1], p['ft' + s][2]);
    set(J['hand' + s], (p['wr' + s]?.[0] || 0), 0, (p['wr' + s]?.[2] || 0));
  }
  J.root.rotation.set(p.root[0] * d, p.root[1] * d, p.root[2] * d);
  J.root.position.set(p.rootSide, m.hipY + p.rootY, p.rootFwd);
  if (m.hands) {
    const gp = p.grip || ['fist', 'fist'];
    setGrip(m.hands.L, gp[0]);
    setGrip(m.hands.R, gp[1]);
  }
}

// Bones captured in replay snapshots.
export const SNAP_BONES = ['spine', 'chest', 'neck', 'head', 'clavL', 'clavR', 'shL', 'elL', 'handL', 'shR', 'elR', 'handR', 'hipL', 'knL', 'ftL', 'hipR', 'knR', 'ftR'];

// ------------------------------------------------------------------ face
export function setExpression(face, expr) {
  const m = face.mouth;
  let lidU = 0.35, lidL = 0.15, brow = 0.0, browY = 0, open = 0, look = 0, squint = 0;
  switch (expr) {
    case 'grit': lidU = 0.3; brow = 0.3; open = 0.1; break;
    case 'angry': lidU = 0.62; lidL = 0.3; brow = 0.5; open = 0.3; break;
    case 'open': lidU = 0.15; brow = -0.15; browY = 0.04; open = 1; break;
    case 'hurt': lidU = 1.0; lidL = 0.5; brow = -0.4; browY = 0.02; open = 0.7; squint = 1; break;
    case 'smile': lidU = 0.45; lidL = 0.35; brow = -0.1; open = 0.25; break;
    case 'ko': lidU = 0.3; brow = -0.35; browY = 0.04; open = 0.85; look = 1; break;
    case 'shock': lidU = -0.15; lidL = 0.0; brow = -0.45; browY = 0.07; open = 1.25; break;
    case 'blink': lidU = 1.25; lidL = 0.5; break;
    default: break;
  }
  for (const e of face.eyes) {
    // Lid shells rotate down over the ball (x tilts toward +z).
    e.upper.rotation.x = -0.62 + lidU * 1.15;
    e.upper.rotation.z = -e.sx * brow * 0.25;
    e.lower.rotation.x = 0.62 - lidL * 0.7;
    e.brow.rotation.z = -e.sx * brow * 0.5;
    e.brow.position.y = e.browY + browY * face.R * 1.2 - Math.max(0, brow) * face.R * 0.04;
    e.ball.rotation.set(look ? -0.6 : 0, look ? e.sx * 0.5 : 0, 0);
  }
  m.jaw.rotation.x = open * 0.42;
  m.jaw.position.y = -open * m.lip * 1.2;
  for (const o of [m.jaw, m.lowerLip]) if (o.userData.basePos) o.userData.basePos.copy(o.position);
}

export function lookAt(face, x, y) {
  for (const e of face.eyes) { e.iris.position.x = x * face.R * 0.03; e.iris.position.y = y * face.R * 0.03; }
}

// Lump of darker clay pressed onto the skull: a bruise.
export function addBruise(head, color) {
  const R = head.userData.r, at = head.userData.at;
  const a = Math.random() * Math.PI * 1.4 - Math.PI * 0.7;
  const y = -0.4 + Math.random() * 0.9;
  const p = at(Math.sin(a), y, Math.cos(a), 0.0);
  const m = sphere(R * (0.08 + Math.random() * 0.05), color, { scale: [1, 1, 0.4] });
  m.position.copy(p);
  m.lookAt(p.clone().multiplyScalar(2));
  head.add(m);
  m.userData.basePos = m.position.clone();
  m.userData.baseScale = m.scale.clone();
  return m;
}

export { clayMat, JOINTS };
