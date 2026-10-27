// The set: ring, ropes, ringside, bleachers full of clay fans, the lighting
// rig and a giant video screen. Built like a miniature studio set.
import * as THREE from 'three';
import { clayMat, clayNormalMap, box, cyl, sphere, mesh } from './clay.js';
import { RING, RING_H, POST, FLOOR } from './fighter.js';
import { rand, pick, mulberry32 } from './util.js';

export const LOGO_TOP = 'SILICON VALLEY';
export const LOGO_BOTTOM = 'CLAYMATCH';

// The badge logo drawn on a canvas, used on the mat, screen and apron.
export function drawLogo(ctx, cx, cy, w, opts = {}) {
  const h = w * 0.42;
  ctx.save();
  ctx.translate(cx, cy);
  const r = h * 0.22;
  const rr = (x, y, ww, hh, rad) => {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + ww, y, x + ww, y + hh, rad);
    ctx.arcTo(x + ww, y + hh, x, y + hh, rad);
    ctx.arcTo(x, y + hh, x, y, rad);
    ctx.arcTo(x, y, x + ww, y, rad);
    ctx.closePath();
  };
  // Silver frame.
  const silver = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  silver.addColorStop(0, '#f4f6fa'); silver.addColorStop(0.45, '#9aa3b4'); silver.addColorStop(0.55, '#d8dde6'); silver.addColorStop(1, '#6c7484');
  rr(-w / 2, -h / 2, w, h, r);
  ctx.fillStyle = silver; ctx.fill();
  const blue = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  blue.addColorStop(0, '#2f5fd0'); blue.addColorStop(1, '#13307a');
  const inset = w * 0.025;
  rr(-w / 2 + inset, -h / 2 + inset, w - inset * 2, h - inset * 2, r * 0.8);
  ctx.fillStyle = blue; ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chrome = ctx.createLinearGradient(0, -h * 0.35, 0, h * 0.35);
  chrome.addColorStop(0, '#ffffff'); chrome.addColorStop(0.48, '#c8d0dc'); chrome.addColorStop(0.52, '#7c8698'); chrome.addColorStop(1, '#e6eaf0');
  ctx.lineJoin = 'round';
  for (const [txt, y, size] of [[LOGO_TOP, -h * 0.17, h * 0.34], [LOGO_BOTTOM, h * 0.19, h * 0.3]]) {
    ctx.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
    const tw = ctx.measureText(txt).width;
    const sx = Math.min(1, (w * 0.84) / tw);
    ctx.save();
    ctx.scale(sx, 1);
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = '#0a1a44';
    ctx.strokeText(txt, 0, y);
    ctx.fillStyle = chrome;
    ctx.fillText(txt, 0, y);
    ctx.restore();
  }
  if (opts.badge !== false) {
    ctx.font = `900 ${h * 0.16}px "Arial Black", sans-serif`;
    ctx.fillStyle = '#ffd94a';
    ctx.strokeStyle = '#0a1a44';
    ctx.lineWidth = h * 0.04;
    ctx.strokeText('TV', -w * 0.44, -h * 0.36);
    ctx.fillText('TV', -w * 0.44, -h * 0.36);
  }
  ctx.restore();
}

function matTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d9d5ce';
  ctx.fillRect(0, 0, 1024, 1024);
  // Scuffs and stains: a mat that has seen some fights.
  const rnd = mulberry32(42);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = `rgba(${120 + rnd() * 60},${110 + rnd() * 50},${100 + rnd() * 40},${0.03 + rnd() * 0.05})`;
    ctx.beginPath();
    ctx.ellipse(rnd() * 1024, rnd() * 1024, 4 + rnd() * 30, 3 + rnd() * 18, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(40,60,120,0.25)';
  ctx.lineWidth = 10;
  ctx.strokeRect(40, 40, 944, 944);
  ctx.globalAlpha = 0.9;
  drawLogo(ctx, 512, 512, 400);
  ctx.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function apronTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 96;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 96);
  g.addColorStop(0, '#1c3a9c'); g.addColorStop(1, '#0d1d5a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 96);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = '900 54px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${LOGO_TOP} ★ ${LOGO_BOTTOM}`, 512, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function signTexture(text, bg, fg) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = fg;
  ctx.font = '900 44px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  lines.forEach((l, i) => ctx.fillText(l, 128, 64 + (i - (lines.length - 1) / 2) * 46, 236));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Minimal merge for indexed geometries with matching attributes.
function merge(geos) {
  const pos = [], nor = [], idx = [];
  let off = 0;
  for (const g of geos) {
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); }
    const ix = g.index;
    for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off);
    off += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}

const SIDES = [
  { axis: 'x', sign: 1 }, { axis: 'x', sign: -1 }, { axis: 'z', sign: 1 }, { axis: 'z', sign: -1 },
];
const ROPE_H = [0.42, 0.82, 1.22];

export class Arena {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.excitement = 0.2;
    this.time = 0;
    this.buildLights();
    this.buildFloor();
    this.buildRing();
    this.buildRails();
    this.buildDesk();
    this.buildCrowd();
    this.buildRig();
    this.buildScreen();
    this.buildLEDs();
  }

  buildLights() {
    const s = this.scene;
    s.background = new THREE.Color('#060918');
    s.fog = new THREE.Fog('#060918', 26, 62);
    this.hemi = new THREE.HemisphereLight('#6f85ff', '#1a1630', 0.5);
    s.add(this.hemi);
    // Warm key over the ring: the miniature-studio light that casts shadows.
    const key = new THREE.SpotLight('#ffe6c8', 760, 0, 0.5, 0.7, 2);
    key.position.set(4, 16, 6);
    key.target.position.set(0, RING_H, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 8;
    key.shadow.camera.far = 30;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 4;
    s.add(key, key.target);
    this.key = key;
    // Cool rim from behind for separation, soft fill from camera side.
    // Two coloured rims from behind, broadcast-style.
    const rim = new THREE.DirectionalLight('#7ab8ff', 1.6);
    rim.position.set(-8, 10, -9);
    s.add(rim);
    const rim2 = new THREE.DirectionalLight('#ff6ad8', 1.1);
    rim2.position.set(9, 7, -7);
    s.add(rim2);
    const fill = new THREE.DirectionalLight('#ffd8c0', 0.45);
    fill.position.set(9, 6, 9);
    s.add(fill);
    // Blue wash on the crowd.
    const crowdA = new THREE.PointLight('#4a62ff', 60, 30, 1.6);
    crowdA.position.set(-12, 7, -12);
    const crowdB = new THREE.PointLight('#5a4aff', 40, 26, 1.6);
    crowdB.position.set(12, 6, -10);
    s.add(crowdA, crowdB);
    // Sweeping intro spotlights.
    this.sweep = [];
    for (let i = 0; i < 2; i++) {
      const sp = new THREE.SpotLight(i ? '#ff6ad0' : '#6ad0ff', 0, 0, 0.16, 0.5, 1.5);
      sp.position.set(i ? 8 : -8, 14, -6);
      s.add(sp, sp.target);
      this.sweep.push(sp);
    }
  }

  buildFloor() {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), clayMat('#141a30', { bumps: 0.3 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.root.add(floor);
    // Padded ringside mats.
    const pad = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR * 2 + 0.8, FLOOR * 2 + 0.8), clayMat('#22357a', { bumps: 0.6 }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.01;
    pad.receiveShadow = true;
    this.root.add(pad);
  }

  buildRing() {
    const R = 3.75;
    const g = new THREE.Group();
    this.root.add(g);
    // Platform with apron skirts.
    const apronTex = apronTexture();
    const skirtMat = new THREE.MeshStandardMaterial({ map: apronTex, roughness: 0.8, normalMap: clayNormalMap(), normalScale: new THREE.Vector2(0.3, 0.3) });
    const capMat = clayMat('#1a2e80');
    const matMat = new THREE.MeshStandardMaterial({ map: matTexture(), roughness: 0.86, normalMap: clayNormalMap(), normalScale: new THREE.Vector2(0.25, 0.25) });
    const plat = new THREE.Mesh(new THREE.BoxGeometry(R * 2, RING_H, R * 2), [skirtMat, skirtMat, matMat, capMat, skirtMat, skirtMat]);
    plat.position.y = RING_H / 2;
    plat.receiveShadow = true;
    plat.castShadow = true;
    g.add(plat);
    // Posts and turnbuckle pads.
    const padColors = ['#d23030', '#2050d0', '#e8e8ee', '#e8e8ee'];
    let i = 0;
    this.posts = [];
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      const post = cyl(0.09, 0.09, 1.7, '#2a2e38', { metalness: 0.6, roughness: 0.35, pos: [sx * POST, RING_H + 0.85, sz * POST] });
      g.add(post);
      const col = padColors[(sx > 0 ? 0 : 1) + (sz > 0 ? 0 : 2) === 3 ? 1 : i % 4];
      for (const h of ROPE_H) {
        const p = box(0.24, 0.26, 0.24, col, { pos: [sx * (POST - 0.12), RING_H + h, sz * (POST - 0.12)], rot: [0, Math.PI / 4, 0], round: 0.9 });
        g.add(p);
      }
      this.posts.push(post);
      i++;
    }
    // Ropes.
    this.ropeMat = clayMat('#eef0f4', { bumps: 0.4, roughness: 0.5 });
    this.ropes = SIDES.map((sd) => ({ ...sd, off: 0, vel: 0, meshes: ROPE_H.map((h) => { const m = new THREE.Mesh(undefined, this.ropeMat); m.castShadow = true; g.add(m); return m; }), dirty: true }));
    this.ropes.forEach((r) => this.rebuildRope(r));
    // Steps on two corners.
    for (const [sx, sz] of [[1, -1], [-1, 1]]) {
      for (let k = 0; k < 3; k++) {
        // Three stacked treads, tallest against the apron.
        const h = 0.2 * (3 - k);
        const st = box(0.42, h, 0.9, '#2a3a7a', { pos: [sx * (R + 0.21 + k * 0.42), h / 2, sz * (R - 0.6)], round: 0.3 });
        st.receiveShadow = true;
        g.add(st);
      }
    }
  }

  rebuildRope(r) {
    const P = POST;
    const o = r.off;
    r.meshes.forEach((m, i) => {
      const h = RING_H + ROPE_H[i];
      const k = 1 - i * 0.12;
      let a, b, c;
      if (r.axis === 'x') {
        a = new THREE.Vector3(r.sign * P, h, -P); b = new THREE.Vector3(r.sign * P, h, P);
        c = new THREE.Vector3(r.sign * (P + o * k * 2), h - Math.abs(o) * 0.2, 0);
      } else {
        a = new THREE.Vector3(-P, h, r.sign * P); b = new THREE.Vector3(P, h, r.sign * P);
        c = new THREE.Vector3(0, h - Math.abs(o) * 0.2, r.sign * (P + o * k * 2));
      }
      const curve = new THREE.QuadraticBezierCurve3(a, c, b);
      m.geometry?.dispose();
      m.geometry = new THREE.TubeGeometry(curve, 24, 0.04, 6, false);
    });
  }

  bumpRope(axis, sign, amt) {
    const r = this.ropes.find((x) => x.axis === axis && x.sign === sign);
    if (r) r.vel += amt * 6;
  }

  buildRails() {
    const L = FLOOR + 0.45;
    const mat = clayMat('#5a6070', { metalness: 0.5, roughness: 0.45 });
    for (const sd of SIDES) {
      for (let s = -L; s < L - 0.1; s += 1.6) {
        const seg = new THREE.Group();
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.08), mat);
        bar.position.y = 1.05;
        const bar2 = bar.clone(); bar2.position.y = 0.2;
        seg.add(bar, bar2);
        for (let k = -3; k <= 3; k++) {
          const v = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.85, 0.035), mat);
          v.position.set(k * 0.21, 0.62, 0);
          seg.add(v);
        }
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.7), mat);
        foot.position.set(0.7, 0.03, 0);
        seg.add(foot);
        seg.traverse((o) => { o.castShadow = true; });
        if (sd.axis === 'x') { seg.position.set(sd.sign * L, 0, s + 0.8); seg.rotation.y = Math.PI / 2; }
        else seg.position.set(s + 0.8, 0, sd.sign * L);
        this.root.add(seg);
      }
    }
  }

  buildDesk() {
    // Commentary desk past the far rail.
    const g = new THREE.Group();
    g.position.set(-1.2, 0, -(FLOOR + 1.45));
    this.root.add(g);
    const top = box(3.6, 0.1, 1.0, '#1a1a22', { pos: [0, 1.02, 0] });
    const front = box(3.6, 0.95, 0.12, '#14246a', { pos: [0, 0.5, 0.45] });
    g.add(top, front);
    const c = document.createElement('canvas'); c.width = 512; c.height = 160;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#14246a'; ctx.fillRect(0, 0, 512, 160);
    drawLogo(ctx, 256, 80, 330, { badge: false });
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.68), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
    panel.position.set(0, 0.52, 0.52);
    g.add(panel);
    // Monitors on the desk.
    for (const x of [-0.9, 0.9]) g.add(box(0.5, 0.32, 0.06, '#0a0a0e', { pos: [x, 1.25, 0.1], rot: [-0.25, 0, 0] }));
    this.desk = g;
    this.deskSeats = [new THREE.Vector3(-2.05, 0, -(FLOOR + 2.15)), new THREE.Vector3(-0.35, 0, -(FLOOR + 2.15))];
  }

  buildCrowd() {
    const rnd = mulberry32(7);
    const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.42, 4, 8);
    const headGeo = new THREE.SphereGeometry(0.19, 12, 10);
    const armL = new THREE.CapsuleGeometry(0.06, 0.4, 3, 6); armL.rotateZ(-0.35); armL.translate(0.22, 0.25, 0);
    const armR = new THREE.CapsuleGeometry(0.06, 0.4, 3, 6); armR.rotateZ(0.35); armR.translate(-0.22, 0.25, 0);
    const armsGeo = merge([armL, armR]);
    const hairGeo = new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const seats = [];
    const benches = new THREE.Group();
    const benchMat = clayMat('#121838');
    for (const sd of SIDES) {
      const nearCam = sd.sign > 0; // +x and +z face the camera
      const rows = nearCam ? 3 : 11;
      for (let r = 0; r < rows; r++) {
        const D = 9.2 + r * 0.82, H = r * 0.52;
        const L = D + 0.2;
        const bench = new THREE.Mesh(new THREE.BoxGeometry(L * 2, H + 0.4, 0.82), benchMat);
        bench.receiveShadow = true;
        if (sd.axis === 'x') { bench.position.set(sd.sign * (D + 0.1), (H + 0.4) / 2 - 0.0, 0); bench.rotation.y = Math.PI / 2; }
        else bench.position.set(0, (H + 0.4) / 2, sd.sign * (D + 0.1));
        benches.add(bench);
        for (let s = -L + 0.3; s < L - 0.3; s += 0.58 + rnd() * 0.12) {
          if (rnd() < 0.06) continue;
          const jitter = (rnd() - 0.5) * 0.12;
          const p = sd.axis === 'x' ? new THREE.Vector3(sd.sign * (D + jitter), H + 0.4, s) : new THREE.Vector3(s, H + 0.4, sd.sign * (D + jitter));
          seats.push({ p, face: Math.atan2(-p.x, -p.z), phase: rnd() * Math.PI * 2, rate: 6 + rnd() * 5, fan: rnd() });
        }
      }
    }
    this.root.add(benches);
    const n = seats.length;
    const bodyMat = clayMat('#ffffff', { bumps: 0.6, rim: 0.2 });
    const headMat = clayMat('#ffffff', { bumps: 0.5, rim: 0.25 });
    this.crowdBody = new THREE.InstancedMesh(bodyGeo, bodyMat, n);
    this.crowdHead = new THREE.InstancedMesh(headGeo, headMat, n);
    this.crowdHair = new THREE.InstancedMesh(hairGeo, headMat, n);
    this.crowdArms = new THREE.InstancedMesh(armsGeo, bodyMat, n);
    const shirts = ['#c84a4a', '#3a6ac8', '#e8e0d0', '#2a2a32', '#5aa05a', '#d8a040', '#8a4ab0', '#e06a9a', '#4ab0b0', '#6a6a7a'];
    const skins = ['#f1c6a6', '#d9a07a', '#a86e4a', '#7a4e34', '#e8b892', '#f6d6c0'];
    const hairs = ['#1a1410', '#3a2414', '#6a4a2a', '#c8a050', '#8a8a90', '#a03a1a'];
    const tint = new THREE.Color('#6676b8');
    const col = new THREE.Color();
    seats.forEach((s, i) => {
      col.set(pick(shirts)).multiply(tint); this.crowdBody.setColorAt(i, col); this.crowdArms.setColorAt(i, col);
      col.set(pick(skins)).multiply(tint); this.crowdHead.setColorAt(i, col);
      col.set(pick(hairs)).multiply(tint); this.crowdHair.setColorAt(i, col);
    });
    for (const m of [this.crowdBody, this.crowdHead, this.crowdArms, this.crowdHair]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      this.root.add(m);
    }
    this.seats = seats;
    this.updateCrowd(0);
    // Signs held by fans.
    const texts = [['AGI\nWHEN?', '#ffd94a', '#1a1a1a'], ['SHIP\nIT!', '#ffffff', '#c82a2a'], ['LGTM', '#e8e8f0', '#2050d0'], ['TEAM\nDARIO', '#d97757', '#1a1a1a'], ['RATIO', '#5af0a0', '#1a1a1a'], ['404\nMERCY', '#ffffff', '#1a1a1a'], ['GPU\nPLZ', '#76b900', '#0a0a0a'], ['HIRE\nME!', '#ff8ad0', '#1a1a1a']];
    this.signs = [];
    for (let k = 0; k < 14; k++) {
      const s = seats[Math.floor(rnd() * seats.length)];
      if (s.p.x > 7 || s.p.z > 7) continue;
      const [t, bg, fg] = texts[k % texts.length];
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshStandardMaterial({ map: signTexture(t, bg, fg), roughness: 0.9, side: THREE.DoubleSide }));
      sign.position.copy(s.p).add(new THREE.Vector3(0, 1.45, 0));
      sign.rotation.y = s.face;
      sign.userData.base = sign.position.y;
      sign.userData.phase = rnd() * 6;
      this.root.add(sign);
      this.signs.push(sign);
    }
    // Camera flashes.
    const fpos = [];
    for (let k = 0; k < 70; k++) { const s = seats[Math.floor(rnd() * seats.length)]; fpos.push(s.p.x, s.p.y + 1.1, s.p.z); }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fpos, 3));
    fg.setAttribute('color', new THREE.Float32BufferAttribute(new Array(fpos.length).fill(0), 3));
    this.flashes = new THREE.Points(fg, new THREE.PointsMaterial({ size: 0.9, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, map: flashSprite() }));
    this.root.add(this.flashes);
  }

  updateCrowd(t) {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    const pos = new THREE.Vector3();
    const ex = this.excitement;
    const hide = new THREE.Vector3(0, 0, 0);
    this.seats.forEach((s, i) => {
      const fan = s.fan < 0.25 + ex * 0.75;
      const jump = fan ? Math.max(0, Math.sin(t * s.rate + s.phase)) * (0.06 + ex * 0.22) : Math.sin(t * 1.3 + s.phase) * 0.01;
      const stand = ex > 0.55 && s.fan < ex ? 0.22 : 0;
      q.setFromAxisAngle(up, s.face + Math.sin(t * 0.7 + s.phase) * 0.15);
      pos.set(s.p.x, s.p.y + 0.42 + jump + stand, s.p.z);
      m4.compose(pos, q, sc);
      this.crowdBody.setMatrixAt(i, m4);
      const armsUp = ex > 0.4 && s.fan < ex * 0.9;
      m4.compose(pos.clone().setY(pos.y + 0.1 + (armsUp ? 0.05 : 0)), q, armsUp ? sc : hide);
      this.crowdArms.setMatrixAt(i, m4);
      pos.y += 0.52;
      m4.compose(pos, q, sc);
      this.crowdHead.setMatrixAt(i, m4);
      pos.y += 0.03;
      m4.compose(pos, q, sc);
      this.crowdHair.setMatrixAt(i, m4);
    });
    for (const m of [this.crowdBody, this.crowdHead, this.crowdArms, this.crowdHair]) m.instanceMatrix.needsUpdate = true;
  }

  buildRig() {
    // Overhead truss with lamp housings and faint light cones.
    const mat = clayMat('#3a3e4a', { metalness: 0.5, roughness: 0.5 });
    const y = 10.5, S = 5.2;
    const g = new THREE.Group();
    for (const sd of SIDES) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(S * 2 + 0.4, 0.35, 0.35), mat);
      if (sd.axis === 'x') { beam.position.set(sd.sign * S, y, 0); beam.rotation.y = Math.PI / 2; }
      else beam.position.set(0, y, sd.sign * S);
      g.add(beam);
    }
    const coneMat = new THREE.MeshBasicMaterial({ color: '#fff2d8', transparent: true, opacity: 0.01, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(a) * S * 1.05, z = Math.sin(a) * S * 1.05;
      const lamp = cyl(0.25, 0.32, 0.5, '#20232a', { pos: [x, y - 0.4, z], metalness: 0.4 });
      g.add(lamp);
      const len = y - 1.2;
      const coneGeo = new THREE.ConeGeometry(2.2, len, 24, 1, true);
      coneGeo.translate(0, -len / 2, 0);
      const c = new THREE.Mesh(coneGeo, coneMat);
      c.position.set(x, y - 0.6, z);
      c.lookAt(x * 0.15, 0, z * 0.15);
      c.rotateX(-Math.PI / 2);
      g.add(c);
    }
    this.root.add(g);
  }

  buildScreen() {
    // A big video wall that shows a low "TV camera" angle of the fight.
    this.tvTarget = new THREE.WebGLRenderTarget(512, 288);
    this.tvTarget.texture.colorSpace = THREE.SRGBColorSpace;
    this.tvCam = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 60);
    const g = new THREE.Group();
    const frame = box(9.2, 5.4, 0.4, '#16181e', {});
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 4.84), new THREE.MeshBasicMaterial({ map: this.tvTarget.texture, toneMapped: false }));
    screen.position.z = 0.21;
    g.add(frame, screen);
    g.position.set(-12.5, 9.5, -12.5);
    g.lookAt(0, 6, 0);
    this.root.add(g);
    this.screen = g;
    // Logo panel on the other side of the wall.
    const c = document.createElement('canvas'); c.width = 1024; c.height = 400;
    drawLogo(c.getContext('2d'), 512, 200, 900);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, color: '#b8c4e8' }));
    banner.position.set(0, 10, -20);
    this.root.add(banner);
    const banner2 = banner.clone();
    banner2.position.set(-20, 10, 0);
    banner2.rotation.y = Math.PI / 2;
    this.root.add(banner2);
  }

  // Scrolling LED ribbon boards along the stands, glowing strips on the
  // apron, and lamps on the posts: emissive, so the bloom pass catches them.
  buildLEDs() {
    const c = document.createElement('canvas');
    c.width = 2048; c.height = 64;
    const ctx = c.getContext('2d');
    const draw = () => {
      ctx.fillStyle = '#04060f'; ctx.fillRect(0, 0, 2048, 64);
      const items = ['SILICON VALLEY CLAYMATCH', 'AGI WHEN?', 'SHIP IT', 'LIVE ON CCM', 'MOVE FAST, BREAK FACES', 'TOKENS PER SECOND: ∞', 'NO REFUNDS', 'SCALING LAWS STILL HOLDING'];
      const cols = ['#3af0ff', '#ff4ad0', '#ffd94a', '#ffffff', '#ff8a3a', '#7aff6a', '#ff4a4a', '#9a8aff'];
      ctx.font = '900 40px "Arial Black", Impact, sans-serif';
      ctx.textBaseline = 'middle';
      let x = 20;
      items.forEach((t, i) => { ctx.fillStyle = cols[i % cols.length]; ctx.fillText(t, x, 34); x += ctx.measureText(t).width + 40; ctx.fillStyle = '#ffffff'; ctx.fillText('★', x - 30, 34); });
    };
    draw();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(2, 1);
    this.ledTex = tex;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) });
    for (const sd of SIDES) {
      if (sd.sign > 0) continue;
      const D = 9.0, L = 20;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.5), mat);
      if (sd.axis === 'x') { m.position.set(sd.sign * D, 0.45, 0); m.rotation.y = Math.PI / 2; }
      else m.position.set(0, 0.45, sd.sign * D);
      this.root.add(m);
    }
    // Apron light strips, cyan and magenta.
    const R = 3.75;
    this.strips = [];
    SIDES.forEach((sd, i) => {
      const col = new THREE.Color(i % 2 ? '#ff3ad0' : '#3ae0ff').multiplyScalar(2.2);
      const sm = new THREE.MeshBasicMaterial({ color: col, toneMapped: false });
      const m = new THREE.Mesh(new THREE.BoxGeometry(R * 2 + 0.02, 0.035, 0.02), sm);
      if (sd.axis === 'x') { m.position.set(sd.sign * (R + 0.012), RING_H - 0.03, 0); m.rotation.y = Math.PI / 2; }
      else m.position.set(0, RING_H - 0.03, sd.sign * (R + 0.012));
      this.root.add(m);
      const m2 = m.clone(); m2.position.y = 0.04; this.root.add(m2);
      this.strips.push(sm);
    });
    // Post-top lamps.
    for (const p of this.posts) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(2.5), toneMapped: false }));
      l.position.copy(p.position).add(new THREE.Vector3(0, 0.9, 0));
      this.root.add(l);
    }
  }

  renderTV(renderer, scene, focus) {
    const cam = this.tvCam;
    const t = this.time * 0.15;
    cam.position.set(focus.x + Math.sin(t) * 6.5, RING_H + 1.4, focus.z + Math.cos(t) * 6.5 + 1);
    cam.lookAt(focus.x, RING_H + 1.2, focus.z);
    const prev = renderer.getRenderTarget();
    const sv = this.screen.visible;
    this.screen.visible = false;
    renderer.setRenderTarget(this.tvTarget);
    renderer.render(scene, cam);
    renderer.setRenderTarget(prev);
    this.screen.visible = sv;
  }

  excite(a) { this.excitement = Math.min(1, this.excitement + a); }

  setIntro(on) {
    this.introOn = on;
    for (const s of this.sweep) s.intensity = on ? 420 : 0;
  }

  update(dt) {
    this.time += dt;
    this.excitement = Math.max(0.15, this.excitement - dt * 0.12);
    // Rope springs.
    for (const r of this.ropes) {
      r.vel += (-120 * r.off - 6 * r.vel) * dt;
      r.off += r.vel * dt;
      if (Math.abs(r.off) > 0.002 || Math.abs(r.vel) > 0.01) { this.rebuildRope(r); r.rest = false; }
      else if (!r.rest) { r.off = 0; r.vel = 0; this.rebuildRope(r); r.rest = true; }
    }
    if (this.introOn) {
      this.sweep.forEach((s, i) => {
        const a = this.time * (i ? 1.3 : 1.7) + i * 2;
        s.target.position.set(Math.sin(a) * 4, RING_H, Math.cos(a * 0.8) * 4);
      });
    }
    if (this.ledTex) this.ledTex.offset.x = (this.ledTex.offset.x + dt * 0.04) % 1;
    if (this.strips) this.strips.forEach((m, i) => { const k = 1.6 + Math.sin(this.time * 3 + i) * 0.4 + this.excitement * 1.5; m.color.set(i % 2 ? '#ff3ad0' : '#3ae0ff').multiplyScalar(k); });
    // Flashbulbs pop with the excitement.
    const c = this.flashes.geometry.attributes.color;
    for (let i = 0; i < c.count; i++) {
      const on = Math.random() < this.excitement * 0.03 ? 1 : c.getX(i) * 0.6;
      c.setXYZ(i, on, on, on * 0.95);
    }
    c.needsUpdate = true;
  }

  animTick() {
    this.updateCrowd(this.time);
    for (const s of this.signs) s.position.y = s.userData.base + Math.max(0, Math.sin(this.time * 6 + s.userData.phase)) * 0.15 * (0.3 + this.excitement);
  }
}

function flashSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.2, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}
