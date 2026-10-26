// Clay puppet builder. Bodies, hands and heads are sculpted as signed
// distance fields whose parts melt together with smooth unions (see sdf.js),
// so each is one continuous lump of clay. Body and hands are skinned to a
// skeleton of THREE.Bones, fingers included; the head rides the head bone
// with set-in eyes, lids, brows and teeth like a real stop-motion puppet.
import * as THREE from 'three';
import { Sculpt, smax as smaxS, sphere as sphereS, ellipsoid as ellipsoidS, cone as cones, chain as chainS, torus as torusS, segBones } from './sdf.js';
import { sphere, capsule, box, cone, cyl, torus, mesh, clayMat, prepareBoil } from './clay.js';
import { noise3, mulberry32, DEG, clamp, lerp } from './util.js';
import { JOINTS } from './poses.js';
import { getCharacter } from './assets.js';

const BUILDS = {
  slim:    { sh: 0.195, arm: 0.046, leg: 0.065, chest: 0.165, waist: 0.13,  hip: 0.15,  depth: 0.12,  belly: 0,    scale: 1,    head: 0.31 },
  average: { sh: 0.22,  arm: 0.056, leg: 0.076, chest: 0.19,  waist: 0.158, hip: 0.165, depth: 0.135, belly: 0.012, scale: 1.02, head: 0.31 },
  muscle:  { sh: 0.3,   arm: 0.088, leg: 0.096, chest: 0.27,  waist: 0.175, hip: 0.18,  depth: 0.18,  belly: 0,    scale: 1.06, head: 0.3 },
  heavy:   { sh: 0.25,  arm: 0.07,  leg: 0.09,  chest: 0.235, waist: 0.24,  hip: 0.21,  depth: 0.19,  belly: 0.075, scale: 1.04, head: 0.31 },
  giant:   { sh: 0.31,  arm: 0.092, leg: 0.105, chest: 0.29,  waist: 0.225, hip: 0.215, depth: 0.2,   belly: 0.03, scale: 1.3,  head: 0.29 },
};

const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const gauss = (x, m, s) => Math.exp(-((x - m) * (x - m)) / (2 * s * s));
const C = (hex) => new THREE.Color(hex);
const darken = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

const THIGH = 0.41, SHIN = 0.4, FOOT = 0.085;
const SPINE_Y = 0.08, CHEST_Y = 0.22, NECK_Y = 0.22, HEAD_Y = 0.07;
const UPPER = 0.29, FORE = 0.26;

// ------------------------------------------------------------------ head
function sculptFn(h) {
  return (x, y, z) => {
    let X = x * h.W, Y = y * h.H, Z = z * h.D;
    const front = Math.max(0, z);
    const low = smooth(0.08, -0.9, y);
    X *= lerp(1, lerp(h.jaw, 1, 0.35), low);
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
    // Caricature controls: a longer lower face, a domed skull, jowls.
    if (y < 0) Y *= (h.faceLen ?? 1) * 0.86;
    const dome = h.dome ?? 0;
    if (dome) { Y += dome * 0.4 * smooth(0.05, 1, y); X *= 1 + dome * 0.12 * smooth(0, 0.8, y); Z *= 1 + dome * 0.08 * smooth(0, 0.8, y); }
    const jowl = h.jowl ?? 0;
    if (jowl && x !== 0) X += Math.sign(x) * jowl * gauss(y, -0.55, 0.2) * smooth(-0.4, 0.3, z);
    return new THREE.Vector3(X, Y + h.H * 0.94, Z);
  };
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

// ------------------------------------------------------------------ head
// The skull is a star-shaped distance field built from the sculpt function:
// for each direction from the skull centre we tabulate the surface radius.
function skullSDF(h, R) {
  const f = sculptFn(h);
  const cy = h.H * 0.94;
  const NT = 64, NP = 128;
  const lut = new Float32Array((NT + 1) * (NP + 1));
  const u = new THREE.Vector3(), n = new THREE.Vector3(), s = new THREE.Vector3(), sd = new THREE.Vector3();
  for (let i = 0; i <= NT; i++) for (let j = 0; j <= NP; j++) {
    const th = (i / NT) * Math.PI, ph = (j / NP) * Math.PI * 2 - Math.PI;
    u.set(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
    n.set(u.x / h.W, u.y / h.H, u.z / h.D).normalize();
    // Find the sphere direction whose sculpted point lies along u.
    for (let it = 0; it < 5; it++) {
      s.copy(f(n.x, n.y, n.z)); s.y -= cy;
      sd.copy(s).normalize();
      n.add(sd.subVectors(u, sd)).normalize();
    }
    s.copy(f(n.x, n.y, n.z)); s.y -= cy;
    lut[i * (NP + 1) + j] = s.length();
  }
  const radius = (px, py, pz, r) => {
    const th = (Math.acos(Math.max(-1, Math.min(1, py / r))) / Math.PI) * NT;
    const ph = ((Math.atan2(px, pz) + Math.PI) / (Math.PI * 2)) * NP;
    const i = Math.min(NT - 1, th | 0), j = Math.min(NP - 1, ph | 0);
    const a = th - i, b = ph - j, q = i * (NP + 1) + j;
    return (lut[q] * (1 - b) + lut[q + 1] * b) * (1 - a) + (lut[q + NP + 1] * (1 - b) + lut[q + NP + 2] * b) * a;
  };
  const raw = (x, y, z) => {
    const px = x / R, py = y / R - cy, pz = z / R;
    const r = Math.hypot(px, py, pz);
    if (r < 1e-5) return -R;
    return (r - radius(px, py, pz, r)) * R * 0.9;
  };
  const dir = (x, y, z) => { const px = x / R, py = y / R - cy, pz = z / R; const r = Math.hypot(px, py, pz) || 1; return [px / r, py / r, pz / r]; };
  const e = 1.12 * R * Math.max(h.W, h.H, h.D);
  return { d: raw, dir, coarse: true, box: [-e, cy * R - e * 1.1, -e, e, cy * R + e, e] };
}

// Hair, beards and stubble: a layer of clay over the skull wherever the
// mask is positive, thinning to nothing at its edge so it melts into skin.
function shellPart(sk, R, mask, thick, lump = 0.012, maxT = 0.2) {
  return {
    coarse: true,
    d: (x, y, z) => {
      const ds = sk.d(x, y, z);
      if (ds > (maxT + 0.05) * R || ds < -0.06 * R) return 1e3;
      const [ux, uy, uz] = sk.dir(x, y, z);
      const t = (typeof thick === 'function' ? thick(ux, uy, uz) : thick) + noise3(ux * 7, uy * 7, uz * 7, 3) * lump;
      const m = mask(ux, uy, uz);
      return smaxS(ds - t * R, -m * R * 0.5, R * 0.03);
    },
    box: sk.box.map((v, i) => v + (i < 3 ? -1 : 1) * maxT * R),
  };
}

const headCache = new Map();

function sculptHead(def, R, at, geo) {
  const h = def.head, skin = def.skin;
  const S = new Sculpt();
  const sk = skullSDF(h, R);
  S.add(sk, { k: 0, color: skin });
  // Neck stub melting into the jaw.
  const nk = def.build === 'muscle' || def.build === 'giant' ? 1.25 : 1;
  S.add(cones([0, -0.1, -0.015], [0, R * 0.55, -0.03], 0.066 * nk, 0.062 * nk), { k: R * 0.18, color: skin });
  // Ears.
  const es = (h.ear ?? 1) * R;
  for (const sx of [1, -1]) {
    const p = at(sx, -0.02, -0.08, -0.04);
    S.add(ellipsoidS([p.x + sx * es * 0.03, p.y, p.z], [es * 0.075, es * 0.2, es * 0.13]), { k: R * 0.06, color: skin });
    S.cut(sphereS([p.x + sx * es * 0.1, p.y + es * 0.01, p.z + es * 0.02], es * 0.075), { k: R * 0.03 });
  }
  // Nose: bridge melting into a bulb with nostril wings.
  const n = h.nose || {};
  const nW = R * 0.12 * (n.w ?? 1), nT = R * 0.13 * (n.tip ?? 1);
  const root = at(0, 0.1, 1, -0.02), tip = at(0, -0.18, 1, 0.12 * (n.len ?? 1));
  S.add(cones(root.toArray(), tip.toArray(), nW * 0.42 * (n.bridge ?? 1), nW * 0.72), { k: R * 0.1, color: skin });
  S.add(ellipsoidS(tip.toArray(), [nT * 1.02, nT * 0.86, nT * 0.92]), { k: R * 0.06, color: skin });
  for (const sx of [1, -1]) {
    S.add(sphereS([tip.x + sx * nW * 0.85, tip.y - nT * 0.32, tip.z - nT * 0.5], nT * 0.68), { k: R * 0.05, color: skin });
    S.cut(sphereS([tip.x + sx * nW * 0.42, tip.y - nT * 0.8, tip.z - nT * 0.28], nT * 0.24), { k: R * 0.01 });
  }
  // Eye sockets for the eyeballs to nest in.
  for (const e of geo.eyes) S.cut(sphereS(e.c, e.r * 1.06), { k: R * 0.045 });
  // Mouth: an open grimace carved between two rolls of lip.
  const m = geo.mouth;
  S.cut(ellipsoidS(m.c, [m.mw * 0.95, m.lip * 1.25, m.mw * 0.6]), { k: R * 0.025 });
  S.add(chainS(m.upper, m.lip, m.lip), { k: R * 0.045, color: m.color });
  S.add(chainS(m.lower, m.lip * 1.15, m.lip * 1.15), { k: R * 0.045, color: m.color });
  hairParts(S, def, R, sk, at);
  // Bounds: the skull plus whatever hangs off it.
  const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of S.parts) {
    if (p.box[1] < -0.5 || p.box[4] > 2) continue;
    for (let i = 0; i < 3; i++) { box[i] = Math.min(box[i], p.box[i]); box[i + 3] = Math.max(box[i + 3], p.box[i + 3]); }
  }
  box[1] = Math.max(box[1], -0.42 * R - 0.12);
  return S.build(box.map((v, i) => v + (i < 3 ? -0.02 : 0.02)), R * 0.029);
}

function buildHead(headBone, def, R, headGeo) {
  const h = def.head;
  const skin = def.skin;
  const face = { R };
  const f = sculptFn(h);
  const at = (x, y, z, out = 0) => { const n = new THREE.Vector3(x, y, z).normalize(); const v = f(n.x, n.y, n.z).multiplyScalar(R); return v.addScaledVector(n, out * R); };
  face.at = at;
  const ey = h.eye || {};
  const eR = R * 0.135 * (ey.size ?? 1);
  const eg = 0.34 * (ey.gap ?? 1);
  const blender = !!headGeo;
  const eyeCenters = [1, -1].map((sx) => at(sx * eg, 0.1, 0.94).add(new THREE.Vector3(0, 0, -eR * 0.6)));
  const mo = h.mouth || {};
  const mw = R * 0.33 * (mo.w ?? 1), lip = R * 0.05 * (mo.lip ?? 1), smile = mo.smile ?? 0.3;
  const mc = at(0, -0.45, 1, 0.045);
  const lipColor = def.lips || '#' + new THREE.Color(skin).multiply(new THREE.Color(0.86, 0.6, 0.6)).getHexString();
  const curveLip = (y, up, k) => [-1, -0.5, 0, 0.5, 1].map((u) => [mc.x + u * mw * k, mc.y + y + (Math.abs(u) ** 2) * up, mc.z - (Math.abs(u) ** 2) * mw * 0.55]);

  const key = def.id + ':' + R;
  let geo = headGeo || headCache.get(key);
  if (!geo) {
    geo = sculptHead(def, R, at, {
      eyes: eyeCenters.map((c) => ({ c: c.toArray(), r: eR })),
      mouth: { c: mc.toArray(), mw, lip, color: lipColor, upper: curveLip(lip * 1.55, smile * lip * 1.8, 1), lower: curveLip(-lip * 1.65, smile * lip * 1.4, 0.92) },
    });
    headCache.set(key, geo);
  }
  const head = new THREE.Mesh(geo, clayMat('#ffffff', { vertexColors: true, physical: true, roughness: def.shiny ? 0.4 : 0.55, bumps: 0.05, rim: 0.28 }));
  head.castShadow = true;
  head.userData.boil = 0.4;
  headBone.add(head);
  face.skull = head;

  // Eyes set into the sockets.
  face.eyes = [];
  [1, -1].forEach((sx, i) => {
    const eye = new THREE.Group();
    eye.position.copy(eyeCenters[i]);
    headBone.add(eye);
    const ball = new THREE.Group();
    eye.add(ball);
    ball.add(sphere(eR, def.allClay ? '#d8dce4' : '#f7f5ef', { lump: 0.0015, roughness: 0.25, rim: 0.05, boil: 0.2 }));
    const iris = new THREE.Group();
    iris.position.z = eR * 0.84;
    ball.add(iris);
    const irisCol = new THREE.Color(ey.iris || '#4a3524');
    iris.add(sphere(eR * 0.62, '#' + irisCol.clone().multiplyScalar(0.55).getHexString(), { scale: [1, 1, 0.38], lump: 0.0008, roughness: 0.2, boil: 0.2, smooth: true }));
    iris.add(sphere(eR * 0.52, ey.iris || '#4a3524', { scale: [1, 1, 0.4], pos: [0, 0, eR * 0.02], lump: 0.0008, roughness: 0.2, boil: 0.2, smooth: true, emissive: ey.glow ? ey.iris : undefined, emissiveIntensity: ey.glow ? 2.5 : 1 }));
    iris.add(sphere(eR * 0.28, '#050404', { scale: [1, 1, 0.4], pos: [0, 0, eR * 0.1], lump: 0.0008, roughness: 0.1, boil: 0.2, smooth: true }));
    // Two glints: they make clay eyes feel alive.
    iris.add(sphere(eR * 0.13, '#ffffff', { pos: [eR * 0.18, eR * 0.2, eR * 0.2], lump: 0, roughness: 0.05, boil: 0, rim: 0, smooth: true, emissive: '#ffffff', emissiveIntensity: 1.2 }));
    iris.add(sphere(eR * 0.06, '#ffffff', { pos: [-eR * 0.14, -eR * 0.16, eR * 0.2], lump: 0, roughness: 0.05, boil: 0, rim: 0, smooth: true, emissive: '#ffffff', emissiveIntensity: 1.0 }));
    // Lids: shells of skin that close over the eyeball.
    const lidGeo = new THREE.SphereGeometry(eR * 1.12, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const upper = new THREE.Group();
    upper.add(mesh(lidGeo, skin, { bumps: 0.04, physical: true, roughness: 0.58 }));
    eye.add(upper);
    const lowerGeo = new THREE.SphereGeometry(eR * 1.1, 22, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
    const lower = new THREE.Group();
    lower.add(mesh(lowerGeo, skin, { bumps: 0.04, physical: true, roughness: 0.58 }));
    eye.add(lower);
    // Lash line along the lid edge, with a flick at the outer corner.
    upper.add(torus(eR * 1.12, eR * 0.085, '#1c1412', { arc: Math.PI, rot: [Math.PI / 2 + 0.05, 0, 0], boil: 0.3, roughness: 0.4, smooth: true }));
    upper.add(curveTube([new THREE.Vector3(sx * eR * 1.05, 0, eR * 0.25), new THREE.Vector3(sx * eR * 1.32, eR * 0.12, eR * 0.12), new THREE.Vector3(sx * eR * 1.45, eR * 0.3, 0)], eR * 0.06, '#1c1412', { seg: 6, smooth: true }));
    // Brows: a tapered roll of clay following the brow ridge.
    const bw = R * 0.25, bt = R * 0.05 * (def.brows?.thick ?? 1), arch = def.brows?.arch ?? 0.2;
    const brow = new THREE.Group();
    const bp = at(sx * eg, 0.33, 0.9, 0.025);
    brow.position.copy(bp);
    brow.add(curveTube([
      new THREE.Vector3(-sx * bw * 0.55, -bt * 0.2, -0.01),
      new THREE.Vector3(-sx * bw * 0.1, bt * (0.4 + arch), 0.006),
      new THREE.Vector3(sx * bw * 0.35, bt * (0.3 + arch * 1.2), 0),
      new THREE.Vector3(sx * bw * 0.6, -bt * 0.6, -0.025),
    ], bt * 0.85, def.brows?.color || '#2a2018', { seg: 16, bumps: 0.6 }));
    headBone.add(brow);
    face.eyes.push({ eye, ball, iris, upper, lower, brow, sx, browY: bp.y });
  });

  // Mouth. Blender heads get a cartoon mouth sitting on the face: a closed
  // smirk line at rest, and an open shape (teeth, tongue, lip rim) that
  // stretches for yells, hits and laughs. SDF heads keep their carved one.
  const mouth = new THREE.Group();
  headBone.add(mouth);
  const toothCol = def.allClay ? '#9aa0aa' : '#fbf8f0';
  if (blender) {
    mouth.position.copy(at(0, -0.47, 1, 0.03));
    mouth.lookAt(mouth.position.clone().add(new THREE.Vector3(0, -0.15, 1)));
    const mwc = mw * 0.72, mh = mw * 0.62;
    const wrap = (u) => -(u * u) * mwc * 0.16;
    const line = curveTube([-1, -0.5, 0, 0.5, 1].map((u) => new THREE.Vector3(u * mwc, smile * Math.abs(u) ** 1.6 * mh * 0.35 - (1 - Math.abs(u)) * mh * 0.03, wrap(u))), R * 0.026, '#3a1418', { seg: 16, smooth: true, roughness: 0.5 });
    // Corner dimples sell the smirk.
    for (const sx of [1, -1]) line.add(sphere(R * 0.024, '#3a1418', { pos: [sx * mwc * 1.02, smile * mh * 0.36, wrap(1)], smooth: true }));
    mouth.add(line);
    const open = new THREE.Group();
    open.position.z = R * 0.03;
    mouth.add(open);
    const ring = (k, z) => Array.from({ length: 20 }, (_, i) => { const a = (i / 20) * Math.PI * 2; const u = Math.cos(a); return new THREE.Vector3(u * mwc * k, Math.sin(a) * mh * 0.5 * k + smile * u * u * mh * 0.12, wrap(u) + z); });
    const cav = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(ring(1, 0).map((p) => new THREE.Vector2(p.x, p.y)))), clayMat('#3a0a10', { smooth: true, roughness: 0.8, side: THREE.DoubleSide }));
    { const pp = cav.geometry.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, wrap(pp.getX(i) / mwc) - 0.002); }
    open.add(cav);
    open.add(curveTube(ring(1.02, 0.002), R * 0.017, lipColor, { closed: true, seg: 40, radial: 8, taper: false, smooth: true, physical: true, roughness: 0.5 }));
    const teethTop = box(mwc * 1.5, mh * 0.2, R * 0.03, toothCol, { pos: [0, mh * 0.34, -R * 0.005], round: 0.8, smooth: true, roughness: 0.25, rim: 0.05 });
    const teethBot = box(mwc * 1.3, mh * 0.16, R * 0.03, toothCol, { pos: [0, -mh * 0.33, -R * 0.008], round: 0.8, smooth: true, roughness: 0.25, rim: 0.05 });
    for (const t of [teethTop, teethBot]) { const pp = t.geometry.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, pp.getZ(i) + wrap(clamp(pp.getX(i) / mwc, -1, 1))); t.geometry.computeVertexNormals(); }
    open.add(teethTop, teethBot);
    const tongue = sphere(mwc * 0.42, '#c8545e', { scale: [1, 0.4, 0.4], pos: [0, -mh * 0.16, -R * 0.02], smooth: true, roughness: 0.4 });
    open.add(tongue);
    face.mouth = { group: mouth, line, open, teethTop, teethBot, tongue, mh, cartoon: true, lip, mw };
  } else {
    mouth.position.copy(mc);
    mouth.add(mesh(new THREE.SphereGeometry(mw * 0.92, 20, 12), '#3a1216', { scale: [1, 0.55, 0.45], pos: [0, -lip * 0.3, -mw * 0.55], boil: 0.3 }));
    const tW = mw * 1.6, tH = lip * 1.8;
    const curve = (row, w) => { const pp = row.geometry.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i); pp.setZ(i, pp.getZ(i) - (x / (w / 2)) ** 2 * mw * 0.45); } row.geometry.computeVertexNormals(); };
    const topRow = box(tW, tH, lip * 1.1, toothCol, { pos: [0, tH * 0.48, lip * 0.05], round: 0.6, roughness: 0.3, rim: 0.05, boil: 0.3 });
    curve(topRow, tW);
    mouth.add(topRow);
    const jaw = new THREE.Group();
    mouth.add(jaw);
    const botRow = box(tW * 0.94, tH * 0.9, lip * 1.1, toothCol, { pos: [0, -tH * 0.42, 0], round: 0.6, roughness: 0.3, rim: 0.05, boil: 0.3 });
    curve(botRow, tW * 0.94);
    jaw.add(botRow);
    face.mouth = { group: mouth, jaw, lip, mw };
  }

  buildGlasses(headBone, def, R, at, eg, eR);
  if (def.hair?.style === 'antenna') {
    const p = at(0, 1, 0, 0);
    headBone.add(cyl(R * 0.03, R * 0.03, R * 0.5, '#6a6e78', { pos: [p.x, p.y + R * 0.25, p.z] }));
    headBone.add(sphere(R * 0.08, '#3af0ff', { pos: [p.x, p.y + R * 0.55, p.z], emissive: '#3af0ff', emissiveIntensity: 3 }));
  }
  if (def.allClay) {
    headBone.add(curveTube([at(-0.6, 0.45, 0.8, 0.01), at(0, 0.5, 1, 0.02), at(0.6, 0.45, 0.8, 0.01)], R * 0.02, '#3af0ff', { emissive: '#3af0ff', emissiveIntensity: 3, taper: true }));
  }
  headBone.userData.r = R;
  headBone.userData.at = at;
  return face;
}

function hairParts(S, def, R, sk, at) {
  const hs = def.hair || {};
  const c = hs.color, c2 = hs.color2 || darken(c, 0.85);
  // Hairline: high at the forehead, down to the nape, lifting around the ears.
  const line = (front, back, side = 0.14) => (x, y, z) => {
    const b = (1 - z) / 2;
    let lim = lerp(front, back, smooth(0.05, 1, b));
    lim = Math.max(lim, side * smooth(0.6, 0.85, Math.abs(x)) * smooth(-0.55, -0.3, z) - (1 - smooth(-0.55, -0.3, z)));
    return y - lim;
  };
  const shell = (mask, t, maxT = 0.2, lump = 0.012, color = c) => S.add(shellPart(sk, R, mask, t, lump, maxT), { k: R * 0.02, color });
  const rnd = mulberry32(def.id.length * 977 + 3);
  const randDir = (mask, min = 0) => {
    for (let i = 0; i < 200; i++) {
      const u = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
      if (u.lengthSq() > 1 || u.lengthSq() < 0.05) continue;
      u.normalize();
      if (mask(u.x, u.y, u.z) > min) return u;
    }
    return null;
  };
  const blobs = (count, rMin, rMax, out, mask, color = c) => {
    for (let i = 0; i < count; i++) {
      const u = randDir(mask);
      if (!u) break;
      S.add(sphereS(at(u.x, u.y, u.z, out + rnd() * 0.03).toArray(), R * lerp(rMin, rMax, rnd())), { k: R * 0.04, color });
    }
  };
  const strands = (count, mask, outFn, flow, len, rad, colors) => {
    for (let i = 0; i < count; i++) {
      const u = randDir(mask, 0.1);
      if (!u) break;
      const pts = [], v = u.clone(), L = len * (0.7 + rnd() * 0.6);
      for (let k = 0; k < 4; k++) { pts.push(at(v.x, v.y, v.z, outFn(v.x, v.y, v.z)).toArray()); v.add(flow(v).multiplyScalar(L / 3)).normalize(); }
      const r = R * rad * (0.8 + rnd() * 0.5);
      S.add(chainS(pts, r, r * 0.55), { k: R * 0.008, color: colors[i % colors.length] });
    }
  };
  const roll = (pts, r0, r1, color, k = 0.03) => S.add(chainS(pts.map((p) => p.toArray()), R * r0, R * r1), { k: R * k, color });
  const back = (v) => new THREE.Vector3(v.x * 0.15, v.z > 0.1 ? 0.45 : -0.35, -1);
  switch (hs.style) {
    case 'short': {
      const fr = hs.fringe ?? 0.4;
      const th = (x, y, z) => 0.045 + 0.05 * smooth(0.2, 0.9, y) + 0.03 * fr * smooth(0.4, 0.9, z) * smooth(0.3, 0.6, y);
      shell(line(0.5, -0.35), th);
      strands(50, line(0.5, -0.35), (x, y, z) => th(x, y, z) + 0.004, back, 0.55, 0.045, [c, c2, darken(c, 0.8)]);
      strands(8 + fr * 12, (x, y, z) => (z > 0.55 ? line(0.5, -0.35)(x, y, z) - 0.05 : -1), (x, y, z) => th(x, y, z) - 0.02, (v) => new THREE.Vector3(v.x * 0.4, -0.7, 0.8), 0.18 + fr * 0.15, 0.045, [c, c2]);
      break;
    }
    case 'receding':
      shell(line(0.6, -0.35), 0.035, 0.08, 0.006);
      strands(34, line(0.6, -0.35), () => 0.035, back, 0.35, 0.028, [c, c2]);
      break;
    case 'curly':
      shell(line(0.42, -0.4), 0.06);
      blobs(140, 0.085, 0.13, 0.07, line(0.38, -0.35), c);
      blobs(70, 0.07, 0.11, 0.14, line(0.46, -0.2), c2);
      break;
    case 'tightcurls':
      shell(line(0.46, -0.4), 0.045);
      blobs(160, 0.05, 0.075, 0.04, line(0.44, -0.35), c);
      blobs(60, 0.045, 0.07, 0.065, line(0.5, -0.1), c2);
      break;
    case 'swept': {
      const sw = (x, y, z) => 0.05 + 0.09 * smooth(0.3, 0.95, y) * smooth(-0.2, 0.7, z);
      shell(line(0.5, -0.35), sw);
      strands(44, line(0.5, -0.35), (x, y, z) => sw(x, y, z) + 0.004, back, 0.7, 0.045, [c, c2]);
      for (let i = -3; i <= 3; i++) {
        const xx = i * 0.12;
        roll([at(xx, 0.62, 0.75, 0.12), at(xx * 1.05, 0.92, 0.25, 0.13), at(xx * 1.1, 0.75, -0.55, 0.07)], 0.06, 0.04, i % 2 ? c2 : c);
      }
      break;
    }
    case 'sidepart': {
      const spT = (x, y, z) => 0.05 + 0.05 * smooth(0.3, 0.9, y);
      shell(line(0.5, -0.35), spT);
      strands(40, line(0.5, -0.35), (x, y, z) => spT(x, y, z) + 0.004, (v) => new THREE.Vector3(v.x > 0.38 ? 0.6 : -0.8, -0.15, v.z > 0.3 ? 0.1 : -0.6), 0.5, 0.032, [c, c2]);
      roll([at(0.35, 0.75, 0.6, 0.09), at(0.05, 0.62, 0.85, 0.07), at(-0.35, 0.55, 0.85, 0.06), at(-0.65, 0.5, 0.55, 0.05)], 0.09, 0.06, c2);
      break;
    }
    case 'long': {
      shell(line(0.45, -0.6, 0.0), (x, y, z) => 0.05 + 0.04 * smooth(0.3, 0.9, y));
      for (let i = 0; i < 11; i++) {
        const a = Math.PI - 0.3 + i * ((Math.PI + 0.6) / 10);
        const x0 = Math.cos(a), z0 = Math.sin(a);
        const top = at(x0 * 0.9, 0.35, z0 * 0.9 - 0.15, 0.04);
        roll([top, at(x0 * 1.05, -0.3, z0 - 0.2, 0.1), new THREE.Vector3(top.x * 1.15, -R * 0.15, top.z * 1.1 - R * 0.1)], 0.12, 0.07, i % 2 ? c : c2, 0.06);
      }
      for (const sx of [1, -1]) roll([at(sx * 0.3, 0.6, 0.85, 0.07), at(sx * 0.7, 0.4, 0.55, 0.09), at(sx * 0.95, 0.1, 0.05, 0.07)], 0.08, 0.06, c2);
      break;
    }
    case 'balding':
      shell((x, y, z) => Math.min(y + 0.35, 0.38 - y, 0.25 - z, Math.abs(x) > 0.75 && z > -0.45 ? y - 0.15 : 1), 0.035, 0.08);
      break;
    default:
      break;
  }
  // Facial hair.
  const fh = def.facial || {};
  const jawline = (lim) => (x, y, z) => {
    if (z < -0.2 || (Math.abs(x) > 0.8 && y > -0.35 && z < 0.1)) return -1;
    const mouthHole = Math.min(0.3 - Math.abs(x), y + 0.62, -0.28 - y, z - 0.6);
    return Math.min(lim - 0.18 * (1 - Math.abs(x)) - y, -mouthHole);
  };
  if (fh.stubble) shell(jawline(-0.36), 0.012, 0.03, 0.003, fh.stubble);
  if (fh.beardShort) shell(jawline(-0.34), 0.026, 0.05, 0.01, fh.beardShort);
  if (fh.beard) shell(jawline(-0.3), (x, y) => 0.03 + 0.045 * smooth(-0.4, -0.95, y), 0.1, 0.018, fh.beard);
  if (fh.mustache) for (const sx of [1, -1]) roll([at(0, -0.33, 1, 0.03), at(sx * 0.18, -0.36, 0.98, 0.03), at(sx * 0.3, -0.46, 0.93, 0.02)], 0.04, 0.025, fh.mustache, 0.02);
}

function buildGlasses(headBone, def, R, at, eg, eR, eyeCenters) {
  const gl = def.glasses;
  if (!gl) return;
  const col = gl.color;
  const g = new THREE.Group();
  headBone.add(g);
  const lensMat = new THREE.MeshStandardMaterial({ color: gl.type === 'aviator' ? '#4a3a1a' : '#cfe4ff', transparent: true, opacity: gl.type === 'aviator' ? 0.75 : 0.18, roughness: 0.05, metalness: 0.3 });
  const centers = eyeCenters || [1, -1].map((sx) => at(sx * eg, 0.1, 0.94, 0.11));
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
  const bridge = eyeCenters ? centers[0].clone().add(centers[1]).multiplyScalar(0.5).add(new THREE.Vector3(0, hh * 0.3, w * 0.25)) : at(0, 0.18, 1, 0.13);
  g.add(curveTube([centers[0].clone().add(new THREE.Vector3(-w * 0.95, hh * 0.3, 0)), bridge, centers[1].clone().add(new THREE.Vector3(w * 0.95, hh * 0.3, 0))], R * 0.014, col, { taper: false, seg: 8, radial: 5, metalness: 0.3 }));
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

export function setGrip(hand, grip) {
  if (!hand || hand.grip === grip) return;
  const g = GRIPS[grip] || GRIPS.fist;
  hand.grip = grip;
  hand.fingers.forEach(([a, b, c], i) => {
    a.rotation.set(0, 0, -hand.sx * g.f[i][0]);
    b.rotation.set(0, 0, -hand.sx * g.f[i][1]);
    c.rotation.set(0, 0, -hand.sx * g.f[i][1] * 0.75);
  });
  // MakeHuman thumbs rest along the index finger; fold them over the palm.
  if (hand.mh) hand.thumb[0].rotation.set(g.t[0] * 0.95, 0, -hand.sx * g.t[0] * 0.25);
  else hand.thumb[0].rotation.set(-0.5 - g.t[0] * 0.3, 0, -hand.sx * g.t[0]);
  hand.thumb[1].rotation.set(0, 0, -hand.sx * g.t[1]);
  hand.thumb[2].rotation.set(0, 0, -hand.sx * g.t[1] * 0.6);
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

// ------------------------------------------------------------------ body
const bodyCache = new Map();

// Torso, neck, arms, legs and shoes sculpted as one blended piece of clay in
// the bind pose, then weighted to the bones each part belongs to.
function sculptBody(def, b, W, hipY, boneIndex) {
  const col = outfitColors(def, b);
  const S = new Sculpt();
  const c = new THREE.Color();
  const torsoCol = (x, y, z) => { col.torso(c, 0, y - hipY, x, z); return c.clone(); };
  const head = W('head');
  const ySpine = hipY + SPINE_Y, yChest = ySpine + CHEST_Y, yNeck = yChest + NECK_Y;
  // Torso bones blend by height.
  const tj = [['root', -9], ['spine', ySpine], ['chest', yChest], ['neck', yNeck]];
  const torsoBones = (t, x, y) => {
    for (let i = 1; i < tj.length; i++) {
      if (Math.abs(y - tj[i][1]) < 0.07) { const w = smooth(tj[i][1] - 0.07, tj[i][1] + 0.07, y); return [[tj[i - 1][0], 1 - w], [tj[i][0], w]]; }
    }
    let k = 0;
    for (let i = 0; i < tj.length; i++) if (y >= tj[i][1]) k = i;
    return [[tj[k][0], 1]];
  };
  const T = { color: torsoCol, bones: torsoBones, wk: 0.03 };
  const muscle = def.build === 'muscle' || def.build === 'giant';
  S.add(ellipsoidS([0, hipY - 0.01, -0.005], [b.hip, 0.12, b.depth * 0.95]), { ...T, k: 0.05 });
  S.add(ellipsoidS([0, hipY + 0.17, b.belly * 0.5], [b.waist, 0.14, b.depth * 0.86 + b.belly]), { ...T, k: 0.08 });
  S.add(ellipsoidS([0, hipY + 0.35, 0.006], [b.chest, 0.15, b.depth]), { ...T, k: 0.08 });
  S.add(ellipsoidS([0, yChest + 0.13, -0.006], [b.sh * 0.96, 0.075, b.depth * 0.8]), { ...T, k: 0.07 });
  if (muscle) for (const sx of [1, -1]) S.add(ellipsoidS([sx * b.chest * 0.45, hipY + 0.4, b.depth * 0.55], [b.chest * 0.5, 0.075, 0.06]), { ...T, k: 0.05 });
  // Neck rising into the head.
  const nk = muscle ? 1.25 : 1;
  S.add(cones([0, yNeck - 0.06, -0.004], [0, head.y + 0.05, -0.012], 0.07 * nk, 0.062 * nk), { k: 0.06, color: def.skin, bones: segBones('chest', 'neck', 'head', 0.35, 0.25) });
  // Collars, hoods, zips: clay pressed around the neck.
  const top = def.top;
  const ring = (y, R0, r, sy, color, dz = 0) => S.add(torusS([0, y, dz], R0, r, sy), { k: 0.012, color, bones: 'chest' });
  if (top.type === 'tee' || top.type === 'vneck') ring(yNeck - 0.01, 0.07 * nk, 0.013, 1, top.color);
  if (top.type === 'hoodie') ring(yNeck - 0.035, 0.105, 0.045, 1.2, top.inner || top.color, -0.03);
  if (top.type === 'quarterzip') ring(yNeck + 0.005, 0.078 * nk, 0.024, 2.0, top.color);
  if (['blazer', 'leather'].includes(top.type)) ring(yNeck - 0.015, 0.085 * nk, 0.022, 1.6, top.type === 'leather' ? '#0a0a0c' : darken(top.color, 0.8), -0.012);
  if (top.type === 'vest') ring(yNeck - 0.01, 0.075 * nk, 0.018, 1.6, top.inner || '#fff');

  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    const sh = W('sh' + side), el = W('el' + side), wr = W('hand' + side);
    const ar = b.arm;
    // Sleeve colour by distance along the (tilted) arm, shoulder to wrist.
    const ad = wr.clone().sub(sh), aL2 = ad.lengthSq();
    const armCol = (x, y, z) => { col.arm(c, clamp(((x - sh.x) * ad.x + (y - sh.y) * ad.y + (z - sh.z) * ad.z) / aL2, 0, 1)); return c.clone(); };
    // Deltoid cap blending the arm into the shoulder.
    S.add(sphereS([sh.x - sx * 0.01, sh.y + 0.005, sh.z], ar * 1.45), { k: 0.06, color: armCol, bones: () => [['chest', 0.3], ['sh' + side, 0.7]], wk: 0.03 });
    S.add(cones(sh.toArray(), el.toArray(), ar * 1.2, ar * 0.9), { k: 0.04, color: armCol, bones: segBones('clav' + side, 'sh' + side, 'el' + side, 0.12, 0.18), wk: 0.015 });
    const mid = sh.clone().lerp(el, 0.42), fmid = el.clone().lerp(wr, 0.3);
    S.add(sphereS([mid.x, mid.y, mid.z + ar * 0.2], ar * 1.12), { k: 0.05, color: armCol, bones: 'sh' + side, wk: 0.015 });
    S.add(cones(el.toArray(), [wr.x, wr.y + 0.01, wr.z], ar * 0.98, ar * 0.62), { k: 0.035, color: armCol, bones: segBones('sh' + side, 'el' + side, 'hand' + side, 0.18, 0.12), wk: 0.015 });
    S.add(sphereS(fmid.toArray(), ar * 1.02), { k: 0.05, color: armCol, bones: 'el' + side, wk: 0.015 });
    // Legs.
    const hp = W('hip' + side), kn = W('kn' + side), ft = W('ft' + side);
    const lr = b.leg;
    const ld = ft.clone().sub(hp), lL2 = ld.lengthSq();
    const legCol = (x, y, z) => { col.leg(c, clamp(((x - hp.x) * ld.x + (y - hp.y) * ld.y + (z - hp.z) * ld.z) / lL2, 0, 1)); return c.clone(); };
    S.add(cones([hp.x, hp.y + 0.04, hp.z], kn.toArray(), lr * 1.45, lr * 0.95), { k: 0.03, color: legCol, bones: segBones('root', 'hip' + side, 'kn' + side, 0.2, 0.15), wk: 0.015 });
    S.add(cones(kn.toArray(), [ft.x, ft.y + 0.02, ft.z], lr * 0.95, lr * 0.62), { k: 0.04, color: legCol, bones: segBones('hip' + side, 'kn' + side, 'ft' + side, 0.15, 0.15), wk: 0.015 });
    S.add(ellipsoidS([kn.x, kn.y - 0.13, kn.z - 0.015], [lr * 1.02, 0.13, lr * 1.05]), { k: 0.04, color: legCol, bones: 'kn' + side, wk: 0.015 });
    // Shoes: a rounded upper on a flat sole.
    const shoe = def.shoes || { color: '#222', sole: '#eee' };
    S.add(ellipsoidS([ft.x, ft.y - 0.032, ft.z + 0.05], [lr * 1.0, 0.055, 0.135]), { k: 0.03, color: shoe.color, bones: 'ft' + side, wk: 0.01 });
    S.add(ellipsoidS([ft.x, ft.y - 0.07, ft.z + 0.052], [lr * 1.1, 0.024, 0.148]), { k: 0.01, color: shoe.sole, bones: 'ft' + side, wk: 0.01 });
  }
  // Bounds from the parts themselves (the arms are out in the bind pose).
  const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (const p of S.parts) for (let i = 0; i < 3; i++) { box[i] = Math.min(box[i], p.box[i] - p.k); box[i + 3] = Math.max(box[i + 3], p.box[i + 3] + p.k); }
  return S.build(box.map((v, i) => v + (i < 3 ? -0.02 : 0.02)), 0.0105, { skin: true, boneIndex, colorK: 0.003, weightK: 0.02 });
}

// A clay hand: palm, two-joint fingers and a thumb melted together.
function sculptHand(def, b, W, side, hk, boneIndex) {
  const S = new Sculpt();
  const skin = def.skin;
  const hd = W('hand' + side);
  const F = (i, s) => W(`f${side}${i}${s}`);
  S.add(cones([hd.x, hd.y + 0.035, hd.z], [hd.x, hd.y - 0.01, hd.z], b.arm * 0.62, b.arm * 0.6), { k: 0.01, color: skin, bones: (t) => [['el' + side, 1 - t], ['hand' + side, t]] });
  S.add(ellipsoidS([hd.x, hd.y - 0.038 * hk, hd.z + 0.004 * hk], [0.016 * hk, 0.042 * hk, 0.036 * hk]), { k: 0.012 * hk, color: skin, bones: 'hand' + side });
  for (let i = 0; i < 4; i++) {
    const a = F(i, 'a'), m = F(i, 'b'), tip = F(i, 'c');
    const r = 0.0088 * hk;
    S.add(cones(a.toArray(), m.toArray(), r, r * 0.95), { k: 0.004 * hk, color: skin, bones: segBones('hand' + side, `f${side}${i}a`, `f${side}${i}b`, 0.35, 0.2) });
    S.add(cones(m.toArray(), tip.toArray(), r * 0.95, r * 0.85), { k: 0.004 * hk, color: skin, bones: segBones(`f${side}${i}a`, `f${side}${i}b`, null, 0.25, 0) });
  }
  const t1 = W(`t${side}a`), t2 = W(`t${side}b`), t3 = W(`t${side}c`);
  S.add(cones(t1.toArray(), t2.toArray(), 0.011 * hk, 0.0105 * hk), { k: 0.01 * hk, color: skin, bones: segBones('hand' + side, `t${side}a`, `t${side}b`, 0.4, 0.2) });
  S.add(cones(t2.toArray(), t3.toArray(), 0.0105 * hk, 0.0095 * hk), { k: 0.004 * hk, color: skin, bones: segBones(`t${side}a`, `t${side}b`, null, 0.25, 0) });
  const box = [hd.x - 0.05 * hk, hd.y - 0.16 * hk, hd.z - 0.05 * hk, hd.x + 0.05 * hk, hd.y + 0.045, hd.z + 0.07 * hk];
  return S.build(box, 0.0032 * hk, { skin: true, boneIndex, weightK: 0.004 });
}

export function buildFighterModel(def) {
  const b = BUILDS[def.build] || BUILDS.slim;
  const g = new THREE.Group();
  const J = {};
  const bone = (name, parent, x, y, z) => { const o = new THREE.Bone(); o.name = name; o.position.set(x, y, z); (parent || g).add(o); J[name] = o; return o; };
  let hipY = THIGH + SHIN + FOOT;
  bone('root', null, 0, hipY, 0);
  bone('spine', J.root, 0, SPINE_Y, 0);
  bone('chest', J.spine, 0, CHEST_Y, 0);
  bone('neck', J.chest, 0, NECK_Y, 0);
  bone('head', J.neck, 0, HEAD_Y, 0);
  const shY = 0.15;
  const hk = clamp(b.arm / 0.05, 0.9, 1.6) * 1.15;
  const FL = [[0.034, 0.028], [0.038, 0.03], [0.035, 0.028], [0.028, 0.022]];
  const hands = {};
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    bone('clav' + side, J.chest, sx * 0.05, shY, 0);
    bone('sh' + side, J['clav' + side], sx * (b.sh - 0.05), 0, 0);
    bone('el' + side, J['sh' + side], 0, -UPPER, 0);
    bone('hand' + side, J['el' + side], 0, -FORE, 0);
    bone('hip' + side, J.root, sx * b.hip * 0.55, -0.03, 0);
    bone('kn' + side, J['hip' + side], 0, -THIGH, 0);
    bone('ft' + side, J['kn' + side], 0, -SHIN, 0);
    // Finger bones: palm hangs down, palm facing the body.
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const a = bone(`f${side}${i}a`, J['hand' + side], 0, -0.072 * hk, (0.026 - i * 0.017) * hk);
      const c = bone(`f${side}${i}b`, a, 0, -(FL[i][0] + 0.004) * hk, 0);
      const tip = bone(`f${side}${i}c`, c, 0, -FL[i][1] * hk, 0);
      fingers.push([a, c, tip]);
    }
    const t1 = bone(`t${side}a`, J['hand' + side], -sx * 0.012 * hk, -0.02 * hk, 0.035 * hk);
    t1.rotation.set(-0.5, 0, 0);
    const t2 = bone(`t${side}b`, t1, 0, -0.032 * hk, 0);
    const t3 = bone(`t${side}c`, t2, 0, -0.024 * hk, 0);
    hands[side] = { sx, fingers, thumb: [t1, t2, t3], grip: null };
  }
  // MakeHuman characters bring their own proportions.
  const asset = getCharacter(def.id);
  const rig = asset?.mh?.rig;
  if (rig) {
    for (const n of rig.bones) J[n].position.fromArray(rig.local[n]);
    hipY = rig.hipY;
    hands.L.mh = hands.R.mh = true;
  }
  const W = (n) => { const v = new THREE.Vector3(); J[n].getWorldPosition(v); return v; };
  const boneNames = Object.keys(J).filter((k) => J[k].isBone);
  const boneIndex = Object.fromEntries(boneNames.map((n, i) => [n, i]));
  const mat = clayMat('#ffffff', { vertexColors: true, roughness: def.top.type === 'leather' ? 0.4 : 0.72, bumps: 0.25 });
  const skinMat = clayMat('#ffffff', { vertexColors: true, roughness: 0.6, bumps: 0.12 });
  const skin = (geo, m) => {
    const sm = new THREE.SkinnedMesh(geo, m);
    sm.castShadow = true;
    sm.frustumCulled = false;
    g.add(sm);
    // Each mesh binds to its own Skeleton over the shared bones, so hands and
    // body can use different bind poses.
    sm.bind(new THREE.Skeleton(boneNames.map((n) => J[n])));
    return sm;
  };
  const aPose = (on) => {
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      J['sh' + s].rotation.z = on ? sx * 0.75 : 0;
      J['hip' + s].rotation.z = on ? sx * 0.12 : 0;
    }
    g.updateMatrixWorld(true);
  };
  if (rig) {
    let geo = bodyCache.get('mh:' + def.id);
    if (!geo) {
      geo = asset.mh.geometry.clone();
      const si = geo.attributes.skinIndex, remap = rig.bones.map((n) => boneIndex[n]);
      for (let i = 0; i < si.array.length; i++) si.array[i] = remap[si.array[i]];
      bodyCache.set('mh:' + def.id, geo);
    }
    // Bind in the pose it was modelled in, then rest with limbs hanging.
    for (const n of rig.bones) J[n].quaternion.fromArray(rig.bind[n]);
    g.updateMatrixWorld(true);
    const m = clayMat('#ffffff', { vertexColors: true, physical: true, roughness: def.top.type === 'leather' ? 0.42 : 0.6, smooth: true, rim: 0.2 });
    J.torsoMesh = skin(geo, m);
    for (const n of rig.bones) J[n].quaternion.identity();
    g.updateMatrixWorld(true);
  } else {
    let parts = bodyCache.get(def.id) || {};
    // Hands are sculpted and bound with the arms hanging straight down...
    g.updateMatrixWorld(true);
    if (!parts.hands) parts.hands = ['L', 'R'].map((s) => sculptHand(def, b, W, s, hk, boneIndex));
    for (const h of parts.hands) skin(h, skinMat);
    // ...the body in an A-pose, so arms and legs don't fuse to the torso.
    aPose(true);
    if (!parts.body) parts.body = sculptBody(def, b, W, hipY, boneIndex);
    bodyCache.set(def.id, parts);
    J.torsoMesh = skin(parts.body, mat);
    aPose(false);
  }

  // Neck column hidden inside the body's neck (the taffy finisher stretches it).
  J.neck.add(capsule((rig ? 0.045 : 0.05) * (b.arm > 0.06 ? 1.25 : 1), 0.05, def.skin, { centered: true, pos: [0, 0.04, -0.006] }));

  const face = rig ? mhFace(J.head, def, rig, J.torsoMesh) : buildHead(J.head, def, b.head * (def.head.size ?? 1), asset?.head);
  face.bias = def.face || {};
  for (const s of ['L', 'R']) setGrip(hands[s], 'fist');

  // Wardrobe details on the chest bone.
  const top = def.top;
  const chestZ = rig ? rig.chest.front : b.depth * 1.02;
  const nY = rig ? rig.chest.neck : NECK_Y;
  const C2 = J.chest;
  if (top.type === 'hoodie') {
    for (const sx of [1, -1]) C2.add(capsule(0.006, 0.12, '#f2f2f2', { pos: [sx * 0.035, nY - 0.04, chestZ * 0.9], rot: [0.1, 0, 0] }));
    C2.add(box(0.2, 0.09, 0.03, darken(top.color, 0.85), { pos: [0, -0.12, chestZ * 0.92] }));
  }
  if (top.type === 'quarterzip') C2.add(box(0.02, 0.035, 0.012, '#c8c8d0', { pos: [0, nY - 0.06, chestZ * 0.95], metalness: 0.7, roughness: 0.3 }));
  if (top.type === 'sweater' && !rig) {
    for (const sx of [1, -1]) C2.add(cone(0.035, 0.08, top.inner, { pos: [sx * 0.045, nY - 0.03, chestZ * 0.6], rot: [-0.6, 0, sx * 2.4], scale: [1, 1, 0.35] }));
  }
  if (top.type === 'leather') C2.add(box(0.012, 0.3, 0.01, '#c8c8d0', { pos: [0.05, -0.04, chestZ * 0.98], metalness: 0.8, roughness: 0.3 }));
  if (top.type === 'vest') for (let i = 0; i < 3; i++) J.spine.add(sphere(0.008, '#2a2a2a', { pos: [0.03, 0.06 + i * 0.07, b.depth * 0.95] }));
  if (top.logo === 'triangle') {
    const tri = new THREE.Shape(); tri.moveTo(-0.045, -0.035); tri.lineTo(0.045, -0.035); tri.lineTo(0, 0.04); tri.closePath();
    const m = mesh(new THREE.ExtrudeGeometry(tri, { depth: 0.006, bevelEnabled: false }), '#f4f4f4', { smooth: true, rim: 0, boil: 0.3 });
    m.position.set(0, -0.0, chestZ * 1.02);
    C2.add(m);
  }
  if (top.logo === 'spark') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      C2.add(capsule(0.008, 0.035, '#f4ede4', { centered: true, pos: [Math.sin(a) * 0.022, Math.cos(a) * 0.022, chestZ * 1.03], rot: [0, 0, -a], boil: 0.3 }));
    }
  }
  if (def.acc.includes('chain')) C2.add(torus(0.1, 0.012, '#e8b830', { pos: [0, nY - 0.06, 0.05], rot: [1.15, 0, 0], scale: [1.1, 1.5, 1], metalness: 0.85, roughness: 0.25 }));
  if (def.acc.includes('tie')) {
    C2.add(box(0.045, 0.22, 0.015, def.tie || '#c23838', { pos: [0, 0.02, chestZ * 1.0], round: 0.5 }));
    C2.add(box(0.05, 0.035, 0.02, def.tie || '#c23838', { pos: [0, nY - 0.075, chestZ * 0.9] }));
  }
  if (def.acc.includes('bowtie')) {
    for (const sx of [1, -1]) C2.add(cone(0.035, 0.07, '#111114', { pos: [sx * 0.032, nY - 0.06, chestZ * 0.88], rot: [0, 0, sx * Math.PI / 2] }));
    C2.add(sphere(0.018, '#111114', { pos: [0, nY - 0.06, chestZ * 0.92] }));
  }
  if (def.acc.includes('core')) {
    C2.add(sphere(0.07, '#3af0ff', { pos: [0, 0.05, chestZ * 0.98], scale: [1, 1, 0.4], emissive: '#3af0ff', emissiveIntensity: 3 }));
    for (let i = 0; i < 5; i++) C2.add(box(0.3, 0.008, 0.01, '#6a6e78', { pos: [0, -0.15 + i * 0.035 - (i > 2 ? 0.15 : 0), chestZ * 0.97] }));
  }

  const build = { ...b, scale: b.scale * (rig ? 1 : def.height ?? 1) };
  g.scale.setScalar(build.scale);
  prepareBoil(g);
  setExpression(face, 'idle');
  return { group: g, joints: J, face, build, hipY, hands };
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
// MakeHuman faces: expressions are blends of facial morph targets.
const MH_EXPR = {
  idle:  { smile: 0.2 },
  grit:  { browDown: 0.7, teeth: 0.9, jaw: 0.12, squint: 0.35 },
  angry: { browDown: 1, teeth: 1, jaw: 0.3, squint: 0.5, frown: 0.3 },
  open:  { browUp: 0.7, jaw: 0.75, wide: 0.3 },
  hurt:  { blink: 0.85, browSad: 1, jaw: 0.45, frown: 0.7, teeth: 0.5 },
  smile: { smile: 1.1, squint: 0.35, jaw: 0.12, browUp: 0.2 },
  ko:    { blink: 1, browSad: 0.6, jaw: 0.6 },
  shock: { wide: 1, browUp: 1, jaw: 1 },
  blink: { blink: 1 },
};

function mhFace(headBone, def, rig, mesh) {
  // The head bone sits where the spine chain ends; head-local = rest - that.
  const hw = ['root', 'spine', 'chest', 'neck', 'head'].reduce((v, n) => v.add(new THREE.Vector3().fromArray(rig.local[n])), new THREE.Vector3());
  const c = new THREE.Vector3().fromArray(rig.head.c).sub(hw), r = rig.head.r;
  const at = (x, y, z, out = 0) => { const n = new THREE.Vector3(x, y, z).normalize(); return new THREE.Vector3(c.x + n.x * r[0] * (1 + out), c.y + n.y * r[1] * (1 + out), c.z + n.z * r[2] * (1 + out)); };
  headBone.userData.r = r[0];
  headBone.userData.at = at;
  const eR = rig.head.eyeR;
  const eyes = ['L', 'R'].map((s) => new THREE.Vector3().fromArray(rig.head.eyes[s]).sub(hw));
  // Catchlights: what makes clay eyes look alive.
  const glints = new THREE.Group();
  headBone.add(glints);
  for (const e of eyes) {
    glints.add(sphere(eR * 0.2, '#ffffff', { pos: [e.x + eR * 0.3, e.y + eR * 0.32, e.z + eR * 0.9], lump: 0, roughness: 0.05, boil: 0, rim: 0, smooth: true, emissive: '#ffffff', emissiveIntensity: 1.3 }));
    glints.add(sphere(eR * 0.09, '#ffffff', { pos: [e.x - eR * 0.25, e.y - eR * 0.2, e.z + eR * 0.95], lump: 0, roughness: 0.05, boil: 0, rim: 0, smooth: true, emissive: '#ffffff', emissiveIntensity: 1 }));
  }
  if (def.glasses) buildGlasses(headBone, def, r[0], at, 0, eR, eyes.map((e) => e.clone().add(new THREE.Vector3(0, 0, eR * 1.5))));
  if (def.hair?.style === 'antenna') {
    const p = at(0, 1, 0, 0);
    headBone.add(cyl(r[0] * 0.03, r[0] * 0.03, r[0] * 0.5, '#6a6e78', { pos: [p.x, p.y + r[0] * 0.25, p.z] }));
    headBone.add(sphere(r[0] * 0.08, '#3af0ff', { pos: [p.x, p.y + r[0] * 0.55, p.z], emissive: '#3af0ff', emissiveIntensity: 3 }));
  }
  return { R: r[0], mh: true, mesh, idx: Object.fromEntries(rig.morphs.map((m, i) => [m, i])), eyes: [], glints };
}

function setMHExpression(face, expr) {
  const w = { ...(MH_EXPR[expr] || MH_EXPR.idle) };
  const bias = face.bias || {};
  if (bias.lid > 0) w.blink = Math.min(1, (w.blink || 0) + bias.lid * 0.6);
  if (bias.lid < 0) w.wide = Math.min(1, (w.wide || 0) - bias.lid);
  if (bias.open) w.jaw = Math.max(w.jaw || 0, bias.open);
  const inf = face.mesh.morphTargetInfluences;
  for (const k in face.idx) inf[face.idx[k]] = w[k] || 0;
  face.glints.visible = (w.blink || 0) < 0.6;
}

export function setExpression(face, expr) {
  if (face.mh) return setMHExpression(face, expr);
  const m = face.mouth;
  let lidU = 0.35, lidL = 0.15, brow = 0.0, browY = 0, open = 0, look = 0, squint = 0;
  let teeth = false;
  switch (expr) {
    case 'idle': lidU = 0.1; brow = 0.12; open = 0; break;
    case 'grit': lidU = 0.25; brow = 0.35; open = 0.3; teeth = true; break;
    case 'angry': lidU = 0.4; lidL = 0.25; brow = 0.55; open = 0.35; teeth = true; break;
    case 'open': lidU = 0.15; brow = -0.15; browY = 0.04; open = 1; break;
    case 'hurt': lidU = 1.0; lidL = 0.5; brow = -0.4; browY = 0.02; open = 0.7; squint = 1; break;
    case 'smile': lidU = 0.45; lidL = 0.35; brow = -0.1; open = 0.25; break;
    case 'ko': lidU = 0.3; brow = -0.35; browY = 0.04; open = 0.85; look = 1; break;
    case 'shock': lidU = -0.15; lidL = 0.0; brow = -0.45; browY = 0.07; open = 1.25; break;
    case 'blink': lidU = 1.25; lidL = 0.5; break;
    default: break;
  }
  // Each character's resting face: heavier lids, a wider grin, a dropped jaw.
  const bias = face.bias || {};
  lidU += bias.lid ?? 0;
  lidL += bias.lower ?? 0;
  open = Math.max(open, bias.open ?? 0);
  for (const e of face.eyes) {
    // Lid shells rotate down over the ball (x tilts toward +z).
    e.upper.rotation.x = -0.62 + lidU * 1.15;
    e.upper.rotation.z = -e.sx * brow * 0.25;
    e.lower.rotation.x = 0.62 - lidL * 0.7;
    e.brow.rotation.z = -e.sx * brow * 0.5;
    e.brow.position.y = e.browY + browY * face.R * 1.2 - Math.max(0, brow) * face.R * 0.04;
    e.ball.rotation.set(look ? -0.6 : 0, look ? e.sx * 0.5 : 0, 0);
  }
  if (m.cartoon) {
    // Closed smirk line, or an open mouth stretched by how open it is.
    const o = teeth ? Math.max(open, 0.32) : open;
    const show = o > 0.12;
    m.line.visible = !show;
    m.open.visible = show;
    m.open.scale.set(1 - o * 0.1, Math.min(1.3, 0.5 + o * 1.1), 1);
    m.teethBot.position.y = -m.mh * (teeth ? 0.2 : 0.33);
    m.tongue.visible = !teeth;
  } else {
    m.jaw.rotation.x = open * 0.42;
    m.jaw.position.y = -open * m.lip * 1.2;
  }
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
