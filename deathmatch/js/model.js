// Builds a clay puppet from a character definition: a joint hierarchy of
// Groups (so poses are just joint rotations) dressed with lumpy primitives.
import * as THREE from 'three';
import { sphere, capsule, box, cone, cyl, torus, mesh, clayMat, prepareBoil } from './clay.js';

const BUILDS = {
  slim:   { sh: 0.19, arm: 0.05, leg: 0.065, chestW: 0.4, chestD: 0.24, hipW: 0.3, head: 0.31, scale: 1, belly: 0 },
  curvy:  { sh: 0.17, arm: 0.043, leg: 0.064, chestW: 0.34, chestD: 0.23, hipW: 0.32, head: 0.31, scale: 0.95, belly: 0 },
  muscle: { sh: 0.25, arm: 0.075, leg: 0.085, chestW: 0.54, chestD: 0.3, hipW: 0.34, head: 0.3, scale: 1.06, belly: 0 },
  heavy:  { sh: 0.23, arm: 0.068, leg: 0.085, chestW: 0.5, chestD: 0.34, hipW: 0.38, head: 0.31, scale: 1, belly: 0.2 },
  giant:  { sh: 0.3, arm: 0.1, leg: 0.11, chestW: 0.66, chestD: 0.42, hipW: 0.46, head: 0.25, scale: 1.32, belly: 0.16 },
};

const darken = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

export function buildFighterModel(def) {
  const b = BUILDS[def.build] || BUILDS.slim;
  const g = new THREE.Group();
  const J = {};
  const top = def.top, bot = def.bottom;
  const skin = def.skin;
  const armsCovered = ['suit', 'hoodie', 'tracksuit'].includes(top.style);
  const legsCovered = bot.style === 'pants';

  const thigh = 0.4, shin = 0.4, foot = 0.08;
  const hipY = thigh + shin + foot;
  J.root = new THREE.Group();
  J.root.position.y = hipY;
  g.add(J.root);

  // Pelvis.
  const pelvisColor = top.style === 'dress' ? top.color : bot.color;
  J.root.add(sphere(b.hipW / 2, pelvisColor, { scale: [1, 0.78, 0.8], pos: [0, 0.02, 0] }));

  J.spine = new THREE.Group();
  J.spine.position.y = 0.06;
  J.root.add(J.spine);
  // Torso: waist + chest.
  const topColor = top.style === 'shirtless' ? skin : top.color;
  J.spine.add(sphere(b.hipW * 0.46, topColor, { scale: [1, 0.9, 0.85], pos: [0, 0.1, 0] }));
  J.spine.add(sphere(b.chestW / 2, topColor, { scale: [1, 0.66 / b.chestW * 0.62, b.chestD / b.chestW], pos: [0, 0.32, 0] }));
  if (b.belly) J.spine.add(sphere(b.belly, topColor, { pos: [0, 0.14, b.chestD * 0.28], scale: [1.1, 1, 0.9] }));
  if (def.female) {
    J.spine.add(sphere(0.058, topColor, { pos: [0.07, 0.34, b.chestD * 0.36], scale: [1, 0.9, 0.8] }));
    J.spine.add(sphere(0.058, topColor, { pos: [-0.07, 0.34, b.chestD * 0.36], scale: [1, 0.9, 0.8] }));
  }
  if (def.build === 'muscle' || def.build === 'giant') {
    // Pecs + abs read as lumps of clay pressed on.
    J.spine.add(sphere(b.chestW * 0.2, topColor, { pos: [0.1 * b.scale, 0.38, b.chestD * 0.3], scale: [1.2, 0.8, 0.7] }));
    J.spine.add(sphere(b.chestW * 0.2, topColor, { pos: [-0.1 * b.scale, 0.38, b.chestD * 0.3], scale: [1.2, 0.8, 0.7] }));
  }
  // Necklines and trims.
  if (top.style === 'tank' || top.style === 'dress') {
    J.spine.add(sphere(b.chestW * 0.22, skin, { pos: [0, 0.47, b.chestD * 0.26], scale: [1.1, 0.7, 0.5] }));
    if (top.trim) J.spine.add(torus(b.chestW * 0.22, 0.012, top.trim, { pos: [0, 0.46, b.chestD * 0.28], rot: [1.3, 0, 0], scale: [1.1, 0.7, 1] }));
  }
  if (top.style === 'dress') {
    J.spine.add(sphere(0.035, top.trim || '#eee', { pos: [0.11, 0.33, b.chestD * 0.47], scale: [1, 1, 0.5] }));
  }
  if (top.style === 'suit') {
    // Lapels + shirt.
    J.spine.add(cone(0.09, 0.26, top.trim === '#c23838' ? '#f2f2f2' : top.trim || '#fff', { pos: [0, 0.36, b.chestD * 0.42], rot: [Math.PI, 0, 0], scale: [1, 1, 0.3] }));
  }
  if (top.style === 'hoodie') {
    J.spine.add(torus(0.14, 0.05, top.trim, { pos: [0, 0.5, -0.03], rot: [Math.PI / 2 + 0.3, 0, 0] }));
    J.spine.add(box(0.22, 0.1, 0.05, top.trim, { pos: [0, 0.12, b.chestD * 0.42] }));
  }
  if (top.style === 'tracksuit') {
    J.spine.add(box(0.02, 0.4, 0.02, top.trim, { pos: [0, 0.28, b.chestD * 0.45] }));
  }
  if (def.facepaint) {
    J.spine.add(sphere(0.03, '#a0a0a8', { pos: [0.16, 0.48, 0.05] }));
  }

  // Neck + head.
  J.neck = new THREE.Group();
  J.neck.position.y = 0.5;
  J.spine.add(J.neck);
  J.neck.add(capsule(0.065 * (b.arm > 0.06 ? 1.3 : 1), 0.08, skin, { centered: true, pos: [0, 0.05, 0] }));
  J.head = new THREE.Group();
  J.head.position.y = 0.09;
  J.neck.add(J.head);
  const face = buildHead(J.head, def, b.head);

  // Arms.
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    const sh = new THREE.Group();
    sh.position.set(sx * b.sh, 0.42, 0);
    J.spine.add(sh);
    const upper = 0.29, fore = 0.27;
    const upperColor = armsCovered ? top.color : skin;
    sh.add(sphere(b.arm * 1.35, top.style === 'tee' || armsCovered || top.style === 'suit' ? top.color : (top.style === 'shirtless' ? skin : skin), {}));
    if (top.style === 'tee') sh.add(cyl(b.arm * 1.45, b.arm * 1.35, 0.12, top.color, { pos: [0, -0.06, 0] }));
    sh.add(capsule(b.arm, upper, upperColor));
    if (def.build === 'muscle' || def.build === 'giant') sh.add(sphere(b.arm * 1.15, upperColor, { pos: [0, -0.13, 0.025] }));
    const el = new THREE.Group();
    el.position.y = -upper;
    sh.add(el);
    el.add(capsule(b.arm * 0.92, fore, armsCovered ? top.color : skin));
    if (armsCovered && top.trim) el.add(cyl(b.arm * 1.05, b.arm * 1.05, 0.03, top.style === 'tracksuit' ? top.trim : top.color, { pos: [0, -fore + 0.02, 0] }));
    if (top.style === 'tracksuit') el.add(box(0.012, fore, 0.012, top.trim, { pos: [sx * b.arm * 0.95, -fore / 2, 0] }));
    const hand = new THREE.Group();
    hand.position.y = -fore - 0.05;
    el.add(hand);
    // Oversized clay fists with a thumb.
    const handR = 0.07 * (b.arm > 0.06 ? 1.25 : 1);
    hand.add(sphere(handR, skin, { scale: [0.9, 1.05, 1] }));
    hand.add(sphere(handR * 0.42, skin, { pos: [-sx * handR * 0.4, 0.02, handR * 0.7] }));
    if (side === 'R' && def.acc.includes('bracelet')) el.add(torus(b.arm * 1.15, 0.012, '#d8d8e0', { pos: [0, -fore + 0.02, 0], rot: [Math.PI / 2, 0, 0], metalness: 0.6, roughness: 0.3 }));
    J['sh' + side] = sh;
    J['el' + side] = el;
    J['hand' + side] = hand;
  }

  // Legs.
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? 1 : -1;
    const hip = new THREE.Group();
    hip.position.set(sx * b.hipW * 0.32, -0.02, 0);
    J.root.add(hip);
    const thighColor = legsCovered ? bot.color : skin;
    hip.add(capsule(b.leg, thigh, thighColor));
    if (bot.style === 'shorts') hip.add(cyl(b.leg * 1.35, b.leg * 1.25, 0.18, bot.color, { pos: [0, -0.08, 0] }));
    const kn = new THREE.Group();
    kn.position.y = -thigh;
    hip.add(kn);
    kn.add(capsule(b.leg * 0.86, shin, legsCovered ? bot.color : skin));
    const ft = new THREE.Group();
    ft.position.y = -shin;
    kn.add(ft);
    ft.add(box(b.leg * 2.1, 0.09, 0.24, def.shoes, { pos: [0, -0.03, 0.06], round: 0.6 }));
    J['hip' + side] = hip;
    J['kn' + side] = kn;
    J['ft' + side] = ft;
  }
  if (bot.style === 'skirt') {
    J.root.add(cyl(b.hipW * 0.5, b.hipW * 0.72, 0.36, top.color, { pos: [0, -0.15, 0] }));
  }

  // Accessories on the body.
  if (def.acc.includes('chain-gold') || def.acc.includes('chain-silver')) {
    const gold = def.acc.includes('chain-gold');
    const c = gold ? '#e6b830' : '#d6d8de';
    J.spine.add(torus(0.13, 0.018, c, { pos: [0, 0.44, b.chestD * 0.2], rot: [1.2, 0, 0], metalness: 0.7, roughness: 0.28, scale: [1, 1.5, 1] }));
    if (gold) J.spine.add(cyl(0.07, 0.07, 0.025, c, { pos: [0, 0.29, b.chestD * 0.47], rot: [Math.PI / 2, 0, 0], metalness: 0.7, roughness: 0.3 }));
  }
  if (def.acc.includes('necklace')) {
    for (let i = 0; i < 11; i++) {
      const a = (i / 10) * Math.PI - Math.PI;
      J.spine.add(sphere(0.016, '#e8e8f0', { pos: [Math.cos(a) * 0.1, 0.47 + Math.sin(a) * 0.07, b.chestD * 0.33], metalness: 0.5, roughness: 0.3, boil: 0.5 }));
    }
  }
  if (def.acc.includes('bowtie')) {
    for (const sx of [1, -1]) J.spine.add(cone(0.05, 0.1, '#111114', { pos: [sx * 0.045, 0.47, b.chestD * 0.42], rot: [0, 0, sx * Math.PI / 2] }));
    J.spine.add(sphere(0.025, '#111114', { pos: [0, 0.47, b.chestD * 0.45] }));
  }
  if (def.acc.includes('tie')) {
    J.spine.add(box(0.05, 0.26, 0.02, top.trim, { pos: [0, 0.31, b.chestD * 0.47] }));
  }
  if (def.acc.includes('spikes')) {
    for (const sx of [1, -1]) for (let i = 0; i < 3; i++)
      J['sh' + (sx > 0 ? 'L' : 'R')].add(cone(0.022, 0.07, '#b8b8c0', { pos: [sx * 0.04, 0.04, -0.03 + i * 0.03], rot: [0, 0, -sx * 0.9], metalness: 0.6, roughness: 0.3 }));
  }

  g.scale.setScalar(b.scale);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  prepareBoil(g);
  return { group: g, joints: J, face, build: b, hipY };
}

function buildHead(head, def, r) {
  const skin = def.skin;
  const face = {};
  // Cranium + long jaw: the caricature skull.
  const cranium = sphere(r, skin, { scale: [0.92, 1.08, 0.98], pos: [0, r * 1.05, 0], seg: 28, seg2: 22 });
  head.add(cranium);
  head.add(sphere(r * 0.74, skin, { scale: [0.98, 0.78, 0.92], pos: [0, r * 0.55, r * 0.2] }));
  // Ears.
  for (const sx of [1, -1]) head.add(sphere(r * 0.17, skin, { pos: [sx * r * 0.9, r * 0.98, 0], scale: [0.6, 1, 0.8] }));
  if (def.acc.includes('earrings')) for (const sx of [1, -1]) head.add(sphere(r * 0.07, '#e8d070', { pos: [sx * r * 0.92, r * 0.78, 0.01], metalness: 0.7, roughness: 0.3 }));
  if (def.acc.includes('stubble')) head.add(sphere(r * 0.76, darken(skin, 0.78), { scale: [0.99, 0.74, 0.9], pos: [0, r * 0.5, r * 0.2], bumps: 1 }));

  // Eyes with heavy half-closed lids, the signature look.
  const eyeY = r * 1.08, eyeX = r * 0.34, eyeZ = r * 0.76;
  face.eyes = [];
  for (const sx of [1, -1]) {
    const eye = new THREE.Group();
    eye.position.set(sx * eyeX, eyeY, eyeZ);
    eye.rotation.y = sx * 0.28;
    head.add(eye);
    eye.add(sphere(r * 0.26, def.allClay ? '#c8c2b8' : '#f6f4ee', { scale: [1.15, 0.85, 0.6], lump: 0.002, roughness: 0.35, rim: 0.05 }));
    const iris = new THREE.Group();
    iris.position.z = r * 0.125;
    eye.add(iris);
    iris.add(sphere(r * 0.13, def.iris, { scale: [1, 1, 0.45], lump: 0.001, roughness: 0.3, boil: 0.3 }));
    iris.add(sphere(r * 0.06, '#0a0808', { scale: [1, 1, 0.45], pos: [0, 0, r * 0.03], lump: 0.001, roughness: 0.2, boil: 0.3 }));
    iris.add(sphere(r * 0.022, '#ffffff', { pos: [r * 0.03, r * 0.04, r * 0.06], lump: 0, roughness: 0.1, boil: 0, rim: 0 }));
    const lidColor = def.eyeshadow || (def.facepaint ? '#1a1418' : darken(skin, 0.94));
    const lidGeo = new THREE.SphereGeometry(r * 0.28, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const lid = mesh(lidGeo, lidColor, {});
    lid.scale.set(1.15, 0.9, 0.66);
    const lidPivot = new THREE.Group();
    lidPivot.add(lid);
    lidPivot.rotation.x = 0.2;
    eye.add(lidPivot);
    const lowerLid = mesh(new THREE.SphereGeometry(r * 0.245, 18, 8, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), def.facepaint ? '#1a1418' : skin, {});
    lowerLid.scale.set(1.15, 0.9, 0.66);
    eye.add(lowerLid);
    if (def.female) {
      // Lashes as a dark rim on the lid edge.
      const lash = mesh(new THREE.TorusGeometry(r * 0.24, r * 0.018, 6, 16, Math.PI), '#1a1210', {});
      lash.rotation.set(-0.1, 0, 0);
      lash.scale.set(1.15, 0.6, 1);
      lash.position.z = r * 0.06;
      lidPivot.add(lash);
    }
    if (def.facepaint) eye.add(sphere(r * 0.3, '#16121a', { scale: [1.2, 1.3, 0.3], pos: [0, -r * 0.02, -r * 0.05] }));
    const brow = capsule(r * 0.055, r * 0.34, def.brows, { centered: true, rot: [0, 0, Math.PI / 2] });
    const browPivot = new THREE.Group();
    browPivot.position.set(sx * eyeX * 1.02, eyeY + r * 0.29, eyeZ + r * 0.04);
    browPivot.add(brow);
    browPivot.rotation.y = sx * 0.28;
    head.add(browPivot);
    face.eyes.push({ eye, iris, lid: lidPivot, brow: browPivot, sx });
  }
  // Nose.
  head.add(sphere(r * 0.13, skin, { pos: [0, r * 0.88, r * 0.96], scale: [0.75, 1.5, 1.1] }));
  head.add(sphere(r * 0.12, skin, { pos: [0, r * 0.74, r * 1.02], scale: [1.15, 0.85, 0.9] }));
  if (def.freckles) for (let i = 0; i < 14; i++) {
    const sx = i % 2 ? 1 : -1;
    head.add(sphere(r * 0.016, darken(skin, 0.72), { pos: [sx * r * (0.2 + Math.random() * 0.2), r * (0.78 + Math.random() * 0.12), r * 0.86], lump: 0, boil: 0.3 }));
  }
  if (def.facepaint) {
    for (const sx of [1, -1]) head.add(cone(r * 0.05, r * 0.4, '#16121a', { pos: [sx * eyeX, eyeY - r * 0.35, eyeZ - 0.005], rot: [Math.PI, 0, 0], scale: [1, 1, 0.3] }));
  }

  // Mouth: lips + a row of gritted teeth, the classic grimace.
  const mouth = new THREE.Group();
  mouth.position.set(0, r * 0.47, r * 0.86);
  head.add(mouth);
  const lipR = r * (def.female ? 0.085 : 0.065);
  const mouthW = r * (def.acc.includes('bigteeth') ? 0.62 : 0.5);
  const upper = capsule(lipR, mouthW, def.lips, { centered: true, rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.8] });
  upper.position.y = r * 0.08;
  const lower = capsule(lipR * 1.08, mouthW * 0.92, def.lips, { centered: true, rot: [0, 0, Math.PI / 2], scale: [1, 1, 0.8] });
  lower.position.y = -r * 0.1;
  const inside = sphere(r * 0.18, '#3a1418', { scale: [1.5, 0.7, 0.4], pos: [0, -r * 0.01, -r * 0.05], boil: 0.3 });
  const toothColor = def.acc.includes('goldteeth') ? '#e8c040' : def.allClay ? '#b8b2a8' : '#f8f6ee';
  const teethTop = box(mouthW * 1.1, r * 0.1, r * 0.08, toothColor, { pos: [0, r * 0.025, r * 0.0], round: 0.5, roughness: 0.3, rim: 0.05, metalness: def.acc.includes('goldteeth') ? 0.6 : 0 });
  const teethBot = box(mouthW * 1.0, r * 0.09, r * 0.08, toothColor, { pos: [0, -r * 0.06, -r * 0.005], round: 0.5, roughness: 0.3, rim: 0.05 });
  // Tooth gaps as thin dark lines.
  for (let i = -2; i <= 2; i++) teethTop.add(box(0.004, r * 0.1, r * 0.081, '#c8c0b0', { pos: [i * mouthW * 0.2, 0, 0.001], boil: 0 }));
  mouth.add(inside, teethTop, teethBot, upper, lower);
  face.mouth = { group: mouth, upper, lower, teethTop, teethBot, inside, r };

  if (def.acc.includes('mustache')) {
    for (const sx of [1, -1]) head.add(capsule(r * 0.07, r * 0.26, def.hair.color === 'none' ? '#3a2a20' : def.brows, { centered: true, pos: [sx * r * 0.14, r * 0.6, r * 0.98], rot: [0, 0, sx * 1.2] }));
  }
  // Hair.
  buildHair(head, def, r);

  // Glasses.
  if (def.acc.includes('sunglasses')) {
    const gl = new THREE.Group();
    gl.position.set(0, eyeY + r * 0.02, eyeZ + r * 0.16);
    for (const sx of [1, -1]) gl.add(box(r * 0.5, r * 0.28, r * 0.06, '#0e0e12', { pos: [sx * eyeX, 0, 0], rot: [0, sx * 0.25, 0], roughness: 0.12, metalness: 0.4, round: 0.7, rim: 0.05 }));
    gl.add(box(r * 0.25, r * 0.05, r * 0.04, '#0e0e12', { pos: [0, r * 0.06, 0] }));
    head.add(gl);
    face.shades = true;
  }
  if (def.acc.includes('glasses')) {
    for (const sx of [1, -1]) head.add(torus(r * 0.21, r * 0.022, '#2a2a2e', { pos: [sx * eyeX, eyeY, eyeZ + r * 0.15], rot: [0, sx * 0.25, 0], scale: [1.15, 0.9, 1] }));
    head.add(box(r * 0.2, r * 0.03, r * 0.03, '#2a2a2e', { pos: [0, eyeY, eyeZ + r * 0.2] }));
  }
  if (def.allClay) {
    // Thumb gouges on the unfinished sculpture.
    for (let i = 0; i < 6; i++) head.add(sphere(r * 0.12, '#86827a', { pos: [(Math.random() - 0.5) * r * 1.4, r * (1.3 + Math.random() * 0.6), (Math.random() - 0.2) * r * 0.8], scale: [1, 0.6, 0.4] }));
  }
  head.userData.r = r;
  return face;
}

function hairCap(r, color, cover = 0.52, scale = [0.97, 1.12, 1.04], tilt = -0.32) {
  const geo = new THREE.SphereGeometry(r * 1.06, 26, 14, 0, Math.PI * 2, 0, Math.PI * cover);
  const m = mesh(geo, color, { bumps: 0.9 });
  m.scale.set(...scale);
  m.rotation.x = tilt;
  return m;
}

function buildHair(head, def, r) {
  const h = def.hair, c = h.color, cy = r * 1.05;
  const at = (m, y = cy, z = 0) => { m.position.set(0, y, z); head.add(m); return m; };
  switch (h.style) {
    case 'long': {
      at(hairCap(r, c, 0.56));
      // Curtains that fall past the shoulders.
      for (const sx of [1, -1]) {
        head.add(box(r * 0.3, r * 1.9, r * 0.9, c, { pos: [sx * r * 0.82, r * 0.35, -r * 0.25], rot: [0.08, 0, sx * 0.08], bumps: 1 }));
        if (h.streak) head.add(box(r * 0.08, r * 1.6, r * 0.5, h.streak, { pos: [sx * r * 0.97, r * 0.42, -r * 0.1], rot: [0.08, 0, sx * 0.08] }));
      }
      head.add(box(r * 1.6, r * 2.1, r * 0.35, c, { pos: [0, r * 0.25, -r * 0.82], rot: [0.12, 0, 0], bumps: 1 }));
      break;
    }
    case 'bun': {
      at(hairCap(r, c, 0.56));
      head.add(sphere(r * 0.42, c, { pos: [0, r * 1.25, -r * 0.95], bumps: 1 }));
      // Loose curls at the back like the reference updo.
      for (let i = 0; i < 5; i++) head.add(sphere(r * 0.18, h.streak || c, { pos: [(i - 2) * r * 0.22, r * 0.75, -r * 0.95], bumps: 1 }));
      for (const sx of [1, -1]) head.add(capsule(r * 0.07, r * 0.6, c, { pos: [sx * r * 0.78, r * 1.1, r * 0.3], rot: [0, 0, sx * 0.1] }));
      break;
    }
    case 'spiky': {
      at(hairCap(r, h.streak || c, 0.48));
      for (let i = 0; i < 11; i++) {
        const a = (i / 11) * Math.PI * 2;
        const rr = i < 1 ? 0 : 0.5;
        const sp = cone(r * 0.2, r * 0.6, c, { pos: [Math.cos(a) * r * rr, cy + r * 0.88, Math.sin(a) * r * rr + r * 0.1] });
        sp.rotation.set(Math.sin(a) * 0.6 + 0.3, 0, -Math.cos(a) * 0.6);
        head.add(sp);
      }
      break;
    }
    case 'slick': {
      at(hairCap(r, c, 0.5, [0.99, 1.14, 1.06], -0.45));
      head.add(sphere(r * 0.42, c, { pos: [r * 0.1, cy + r * 0.8, r * 0.48], scale: [1.6, 0.7, 0.9], bumps: 0.9 }));
      for (let i = 0; i < 4; i++) head.add(box(r * 0.03, r * 0.02, r * 1.3, darken(c, 0.8), { pos: [(i - 1.5) * r * 0.22, cy + r * 1.02, -r * 0.1], rot: [-0.3, 0, 0], boil: 0.5 }));
      break;
    }
    case 'buzz': {
      at(hairCap(r * 0.97, c, 0.5, [0.99, 1.12, 1.03], -0.4));
      break;
    }
    case 'balding': {
      const geo = new THREE.TorusGeometry(r * 0.88, r * 0.15, 8, 20, Math.PI * 1.25);
      const m = mesh(geo, c, { bumps: 1 });
      m.rotation.set(Math.PI / 2, 0, -Math.PI * 0.125 + Math.PI);
      m.scale.set(1.04, 1.12, 1);
      m.position.set(0, cy - r * 0.05, -r * 0.05);
      head.add(m);
      break;
    }
    case 'cornrows': {
      at(hairCap(r * 0.98, c, 0.52, [0.98, 1.12, 1.04], -0.35));
      for (let i = -3; i <= 3; i++) {
        const t = torus(r * 1.05, r * 0.045, c, { arc: Math.PI * 0.95, pos: [i * r * 0.13, cy, -r * 0.05], rot: [0, Math.PI / 2, Math.PI * 0.05] });
        t.scale.set(1.08, 1.06, 1);
        head.add(t);
      }
      break;
    }
    default:
      break;
  }
}

// Facial expressions are just lid/brow/mouth tweaks.
export function setExpression(face, expr) {
  const m = face.mouth, r = m.r;
  let lid = 0.2, brow = 0.32, browY = 0, open = 0, look = 0;
  switch (expr) {
    case 'grit': lid = 0.22; brow = 0.36; open = 0.25; break;
    case 'angry': lid = 0.42; brow = 0.55; open = 0.35; break;
    case 'open': lid = 0.0; brow = -0.1; browY = 0.04; open = 1; break;
    case 'hurt': lid = 1.0; brow = -0.35; browY = 0.02; open = 0.9; break;
    case 'smile': lid = 0.3; brow = -0.05; open = 0.15; break;
    case 'ko': lid = 0.05; brow = -0.3; browY = 0.04; open = 0.8; look = 1; break;
    case 'shock': lid = -0.3; brow = -0.4; browY = 0.06; open = 1.2; break;
    default: break;
  }
  for (const e of face.eyes) {
    e.lid.rotation.x = lid;
    e.lid.rotation.z = -e.sx * (brow * 0.25);
    e.brow.rotation.z = -e.sx * brow;
    e.brow.position.y = e.brow.userData.baseY ?? (e.brow.userData.baseY = e.brow.position.y);
    e.brow.position.y += browY * r * 3;
    e.iris.position.y = look ? r * 0.12 : 0;
    e.iris.rotation.z = look ? e.sx : 0;
  }
  m.lower.position.y = -r * 0.1 - open * r * 0.16;
  m.teethBot.position.y = -r * 0.06 - open * r * 0.14;
  m.upper.position.y = r * 0.08 + open * r * 0.02;
  m.inside.scale.y = 0.7 + open * 0.9;
  for (const p of [m.lower, m.teethBot, m.upper]) if (p.userData.basePos) p.userData.basePos.copy(p.position);
  if (m.inside.userData.baseScale) m.inside.userData.baseScale.copy(m.inside.scale);
}

// Lump of clay used for bruises.
export function addBruise(head, color) {
  const r = head.userData.r;
  const a = Math.random() * Math.PI * 1.6 - Math.PI * 0.8;
  const y = r * (0.7 + Math.random() * 0.8);
  const m = sphere(r * (0.09 + Math.random() * 0.06), color, { scale: [1, 1, 0.45] });
  m.position.set(Math.sin(a) * r * 0.9, y, Math.cos(a) * r * 0.86);
  m.lookAt(m.position.clone().multiplyScalar(2).setY(y));
  head.add(m);
  m.userData.basePos = m.position.clone();
  m.userData.baseScale = m.scale.clone();
  return m;
}

export { clayMat };
