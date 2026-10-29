import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { DEFAULT_CHARACTER, makeSpec } from './proportions.js';
import { buildRig, buildBody } from './body.js';
import { Walker, DEFAULT_GAIT, applyPose } from './gait.js';
import { REF } from './reference.js';

// ── state ────────────────────────────────────────────────────────────────
const STORE = 'walker:v1';
const saved = (() => { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; } })();
const character = { ...DEFAULT_CHARACTER, ...(saved.character || {}) };
const gait = { ...DEFAULT_GAIT, ...(saved.gait || {}) };
const view = { skeleton: false, footprints: true, arcs: false, graph: false, ao: innerWidth > 720, ...(saved.view || {}) };
const persist = () => { try { localStorage.setItem(STORE, JSON.stringify({ character, gait, view })); } catch {} };

// ── renderer, scene ──────────────────────────────────────────────────────
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const GROUND = new THREE.Color('#e7e2d8');
const scene = new THREE.Scene();
scene.background = GROUND;
// fog only fades the far floor when zoomed out; it starts well behind the
// character (camera sits 30 m away) so it never greys the body
scene.fog = new THREE.Fog(GROUND, 37, 52);

// true isometric: 45° around, arctan(1/√2) ≈ 35.26° down
const ELEV = Math.atan(1 / Math.SQRT2);
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
const camState = { lookY: 0.5, elev: ELEV, az: Math.PI / 4, azTarget: Math.PI / 4, size: 1.45, sizeTarget: 1.45, target: new THREE.Vector3() };

scene.add(new THREE.HemisphereLight('#fffaf2', '#b8ab96', 1.15));
const sun = new THREE.DirectionalLight('#fff1dc', 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.5, far: 20 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.025;
scene.add(sun, sun.target);
// ambient occlusion: contact darkening in the armpits, collar, between the
// legs and under the feet, which is most of what makes a body sit in a scene
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, cam));
const gtao = new GTAOPass(scene, cam, 1, 1);
gtao.blendIntensity = 0.9;
gtao.updateGtaoMaterial({ radius: 0.16, distanceExponent: 1.6, thickness: 0.6, scale: 1.0, samples: 16, distanceFallOff: 1.0 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
composer.addPass(gtao);
composer.addPass(new OutputPass());
// soft fill from the camera's side, as in portrait lighting: faces would
// otherwise sit in the key light's shadow from the isometric angle
const fill = new THREE.DirectionalLight('#fff4ea', 0.55);
scene.add(fill, fill.target);
const rim = new THREE.DirectionalLight('#dfe8ff', 0.55);
scene.add(rim, rim.target);

// ground: a tile texture, the plane hops in whole tiles so it never ends
const TILE = 1;
const ground = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#e7e2d8';
  g.fillRect(0, 0, 512, 512);
  // a little paper grain so the floor reads as a surface, not a void
  const img = g.getImageData(0, 0, 512, 512);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 7;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = 'rgba(80, 66, 48, 0.16)';
  g.lineWidth = 2;
  g.strokeRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(80, 66, 48, 0.06)';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.moveTo(0, 256); g.lineTo(512, 256); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const N = 90;
  tex.repeat.set(N, N);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(N * TILE, N * TILE), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  scene.add(m);
  return m;
})();

// ── character ────────────────────────────────────────────────────────────
let spec = makeSpec(character);
let rig = buildRig(spec);
let body = buildBody(spec, rig);
scene.add(body);
const walker = new Walker(spec, gait);
let skeletonHelper = null;

function rebuild(draft = false) {
  spec = makeSpec(character);
  scene.remove(body);
  body.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  rig = buildRig(spec);
  body = buildBody(spec, rig, { draft });
  scene.add(body);
  walker.setSpec(spec);
  setSkeleton(view.skeleton);
  clearOverlays();
}
// While a slider moves, rebuild a light draft each frame (~40 ms) so the body
// follows the drag; once it settles, rebuild at full quality.
let rebuildQueued = false, fullTimer = 0;
const queueRebuild = () => {
  if (!rebuildQueued) {
    rebuildQueued = true;
    requestAnimationFrame(() => { rebuildQueued = false; rebuild(true); });
  }
  clearTimeout(fullTimer);
  fullTimer = setTimeout(() => rebuild(false), 250);
};

function setSkeleton(on) {
  if (skeletonHelper) { scene.remove(skeletonHelper); skeletonHelper.dispose?.(); skeletonHelper = null; }
  if (!on) return;
  skeletonHelper = new THREE.SkeletonHelper(body);
  skeletonHelper.material.depthTest = false;
  skeletonHelper.material.transparent = true;
  skeletonHelper.renderOrder = 10;
  scene.add(skeletonHelper);
  body.material.transparent = true;
  body.material.opacity = 0.35;
}

// ── footprints ───────────────────────────────────────────────────────────
const prints = (() => {
  const s = new THREE.Shape();
  // sole outline in the foot's frame (x across, y along the foot), heel at 0
  const pts = [[0, 0.0], [0.03, 0.01], [0.038, 0.06], [0.034, 0.12], [0.045, 0.19], [0.042, 0.24], [0.02, 0.275], [-0.008, 0.28], [-0.035, 0.255], [-0.04, 0.19], [-0.026, 0.12], [-0.03, 0.06], [-0.024, 0.01]];
  s.moveTo(...pts[0]);
  for (const p of pts.slice(1)) s.lineTo(...p);
  const geo = new THREE.ShapeGeometry(s);
  geo.rotateX(Math.PI / 2); // outline +y → world +Z (seen from above: double-sided)
  const pool = [];
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#5a4b3a', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    m.visible = false;
    m.renderOrder = 1;
    scene.add(m);
    pool.push({ m, age: 99 });
  }
  let next = 0;
  return {
    add(plant, yaw, sign) {
      const p = pool[next++ % pool.length];
      const sc = spec.footLen / 0.266;
      p.m.position.set(plant.x, 0.002, plant.z);
      p.m.position.addScaledVector(new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)), -0.016 * sc);
      p.m.rotation.set(0, yaw, 0);
      p.m.scale.set(sign * sc, 1, sc);
      p.age = 0;
      p.m.visible = view.footprints;
    },
    update(dt) {
      for (const p of pool) {
        if (p.age > 12) { p.m.visible = false; continue; }
        p.age += dt;
        const fadeIn = Math.min(1, p.age / 0.25);
        p.m.material.opacity = 0.13 * fadeIn * Math.max(0, 1 - p.age / 12);
        p.m.visible = view.footprints;
      }
    },
    shift(dz) { for (const p of pool) p.m.position.z -= dz; },
    clear() { for (const p of pool) { p.age = 99; p.m.visible = false; } },
  };
})();

// ── motion arcs: where joints actually travel ─────────────────────────────
const arcs = (() => {
  const N = 110; // samples at 90 Hz of sim time ≈ the last 1.2 s
  const make = (color) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85, depthTest: false }));
    l.renderOrder = 11;
    l.frustumCulled = false;
    scene.add(l);
    return { l, n: 0 };
  };
  const tracks = {
    lToe: make('#c2603a'), rToe: make('#c2603a'),
    lHand: make('#3d6f8f'), rHand: make('#3d6f8f'),
    head: make('#1d1b18'), hips: make('#1d1b18'),
  };
  const v = new THREE.Vector3();
  return {
    push(pt) {
      for (const k in tracks) {
        const t = tracks[k];
        const a = t.l.geometry.attributes.position;
        a.array.copyWithin(3, 0, (N - 1) * 3);
        v.copy(pt[k]);
        a.array[0] = v.x; a.array[1] = v.y; a.array[2] = v.z;
        t.n = Math.min(N, t.n + 1);
        if (t.n < N) for (let i = t.n; i < N; i++) { a.array[i * 3] = v.x; a.array[i * 3 + 1] = v.y; a.array[i * 3 + 2] = v.z; }
        a.needsUpdate = true;
        t.l.visible = view.arcs;
      }
    },
    shift(dz) { for (const k in tracks) { const a = tracks[k].l.geometry.attributes.position; for (let i = 2; i < a.array.length; i += 3) a.array[i] -= dz; a.needsUpdate = true; } },
    clear() { for (const k in tracks) tracks[k].n = 0; },
    show(on) { for (const k in tracks) { tracks[k].l.visible = on; if (on) tracks[k].n = 0; } },
  };
})();
function clearOverlays() { prints.clear(); arcs.clear(); }

// ── gait graph ───────────────────────────────────────────────────────────
const graph = (() => {
  const fig = document.getElementById('graph');
  const c = fig.querySelector('canvas');
  const g = c.getContext('2d');
  const BINS = 100;
  const live = { hip: new Float32Array(BINS).fill(NaN), knee: new Float32Array(BINS).fill(NaN), ankle: new Float32Array(BINS).fill(NaN) };
  const rows = [['hip', 'Hip', -25, 35], ['knee', 'Knee', -5, 70], ['ankle', 'Ankle', -25, 22]];
  return {
    record(phase, d) {
      const i = Math.min(BINS - 1, Math.floor(phase * BINS));
      // fill any bins a slow frame skipped, so the trace stays continuous
      if (this.last !== undefined && this.prev) {
        const gap = (i - this.last + BINS) % BINS;
        if (gap > 1 && gap < 20) for (let j = 1; j < gap; j++) {
          const b = (this.last + j) % BINS, t = j / gap;
          for (const k in live) live[k][b] = this.prev[k] + (d[k] - this.prev[k]) * t;
        }
      }
      for (const k in live) live[k][i] = d[k];
      this.last = i;
      this.prev = { hip: d.hip, knee: d.knee, ankle: d.ankle };
    },
    draw(phase) {
      if (fig.hidden) return;
      const W = c.width, H = c.height, padL = 54, padR = 10, rowH = H / 3;
      g.clearRect(0, 0, W, H);
      g.font = '500 20px "Instrument Sans", sans-serif';
      rows.forEach(([key, label, lo, hi], r) => {
        const top = r * rowH + 8, h = rowH - 18;
        const X = (p) => padL + p * (W - padL - padR);
        const Y = (v) => top + h - ((v - lo) / (hi - lo)) * h;
        g.fillStyle = '#6b665d'; g.textBaseline = 'middle';
        g.fillText(label, 0, top + h / 2);
        g.strokeStyle = 'rgba(29,27,24,0.08)'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(1), Y(0)); g.stroke();
        // reference band ±5°
        const ref = REF[key];
        g.fillStyle = 'rgba(29,27,24,0.10)';
        g.beginPath();
        ref.forEach((v, i) => { const x = X(i / 20), y = Y(v + 5); i ? g.lineTo(x, y) : g.moveTo(x, y); });
        for (let i = ref.length - 1; i >= 0; i--) g.lineTo(X(i / 20), Y(ref[i] - 5));
        g.fill();
        // live
        g.strokeStyle = '#c2603a'; g.lineWidth = 3; g.lineJoin = 'round';
        g.beginPath();
        let pen = false;
        for (let i = 0; i < BINS; i++) {
          const v = live[key][i];
          if (Number.isNaN(v)) { pen = false; continue; }
          const x = X((i + 0.5) / BINS), y = Y(v);
          pen ? g.lineTo(x, y) : g.moveTo(x, y);
          pen = true;
        }
        g.stroke();
      });
      // playhead + stance/swing marks
      const x = padL + phase * (W - padL - padR);
      g.strokeStyle = 'rgba(29,27,24,0.45)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x, 4); g.lineTo(x, H - 4); g.stroke();
      const duty = walker.pose.timing?.duty ?? 0.62;
      g.fillStyle = 'rgba(29,27,24,0.35)'; g.font = '500 17px "JetBrains Mono", monospace';
      g.textBaseline = 'alphabetic';
      g.fillText('stance', padL + 4, H - 2);
      g.fillText('swing', padL + duty * (W - padL - padR) + 4, H - 2);
    },
    show(on) { fig.hidden = !on; },
    clear() { for (const k in live) live[k].fill(NaN); },
  };
})();

// ── camera ───────────────────────────────────────────────────────────────
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  const a = w / h;
  // on narrow screens, keep the character above the bottom sheet
  const s = camState.size * (a < 0.8 ? 1.4 : 1);
  cam.left = -s * a; cam.right = s * a; cam.top = s; cam.bottom = -s;
  cam.updateProjectionMatrix();
}
addEventListener('resize', resize);

function updateCamera(dt) {
  const k = 1 - Math.exp(-dt / 0.35);
  camState.az += (camState.azTarget - camState.az) * k;
  const sk = 1 - Math.exp(-dt / 0.15);
  if (Math.abs(camState.sizeTarget - camState.size) > 1e-4) { camState.size += (camState.sizeTarget - camState.size) * sk; resize(); }
  // follow the body's steady progression, not its bob or sway: the camera
  // should be a calm observer, never a passenger
  const t = camState.target;
  t.set(0, spec.H * camState.lookY, walker.dist);
  if (camState.focus && rig.bones[camState.focus]) rig.bones[camState.focus].getWorldPosition(t); // debug: frame one bone
  const narrow = innerWidth < 720;
  const D = 30;
  cam.position.set(
    t.x + D * Math.cos(camState.elev) * Math.sin(camState.az),
    t.y + D * Math.sin(camState.elev),
    t.z + D * Math.cos(camState.elev) * Math.cos(camState.az),
  );
  cam.lookAt(t);
  if (narrow) { cam.updateMatrixWorld(); cam.position.addScaledVector(new THREE.Vector3(0, -1, 0).applyQuaternion(cam.quaternion), camState.size * 0.35); }
  else if (innerWidth > 900) { cam.updateMatrixWorld(); cam.position.addScaledVector(new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion), camState.size * 0.28); }
  ground.position.set(Math.round(t.x / TILE) * TILE, 0, Math.round(t.z / TILE) * TILE);
  sun.position.set(t.x - 2.2, 6, t.z + 3.2);
  sun.target.position.set(t.x, 0.4, t.z);
  fill.position.copy(cam.position).add(new THREE.Vector3(0, 4, 0));
  fill.target.position.set(t.x, t.y, t.z);
  rim.position.set(t.x + 3, 2.5, t.z - 4);
  rim.target.position.set(t.x, 1, t.z);
}

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  camState.sizeTarget = THREE.MathUtils.clamp(camState.sizeTarget * Math.exp(e.deltaY * 0.0012), 0.6, 6);
}, { passive: false });

// drag to orbit, pinch to zoom
const pointers = new Map();
let pinch0 = 0, size0 = 0;
canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
canvas.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId);
  if (!p) return;
  if (pointers.size === 1) {
    camState.azTarget -= (e.clientX - p.x) * 0.006;
    camState.az = camState.azTarget;
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (!pinch0) { pinch0 = d; size0 = camState.sizeTarget; }
    camState.sizeTarget = THREE.MathUtils.clamp(size0 * (pinch0 / Math.max(1, d)), 0.6, 6);
  }
  p.x = e.clientX; p.y = e.clientY;
});
const up = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch0 = 0; };
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);

// ── time ─────────────────────────────────────────────────────────────────
let rate = 1, paused = false, stepOnce = false;
const playBtn = document.getElementById('play');
function setPaused(p) {
  paused = p;
  playBtn.textContent = p ? '▶' : '❚❚';
  playBtn.setAttribute('aria-label', p ? 'Play' : 'Pause');
  playBtn.title = p ? 'Play (space)' : 'Pause (space)';
}
playBtn.onclick = () => setPaused(!paused);
document.getElementById('step').onclick = () => { setPaused(true); stepOnce = true; };
document.querySelectorAll('[data-rate]').forEach((b) => {
  b.onclick = () => {
    rate = +b.dataset.rate;
    document.querySelectorAll('[data-rate]').forEach((x) => x.classList.toggle('on', x === b));
  };
});
const rot = (d) => { camState.azTarget += d * Math.PI / 2; };
document.getElementById('rotL').onclick = () => rot(-1);
document.getElementById('rotR').onclick = () => rot(1);
addEventListener('keydown', (e) => {
  if (e.target.closest('input')) return;
  if (e.code === 'Space') { e.preventDefault(); setPaused(!paused); }
  else if (e.key === '.') { setPaused(true); stepOnce = true; }
  else if (e.key === 'q' || e.key === 'Q') rot(-1);
  else if (e.key === 'e' || e.key === 'E') rot(1);
});

// ── UI ───────────────────────────────────────────────────────────────────
const CHAR_SLIDERS = [
  ['height', 'Height', 1.5, 2.05, 0.01, (v) => `${v.toFixed(2)}m`],
  ['legs', 'Legs', 0.88, 1.12, 0.01, pct],
  ['shoulders', 'Shoulders', 0.85, 1.2, 0.01, pct],
  ['hips', 'Hips', 0.85, 1.25, 0.01, pct],
  ['build', 'Build', 0.8, 1.35, 0.01, pct],
  ['muscle', 'Muscle', 0, 1, 0.01, pct],
  ['head', 'Head', 0.88, 1.12, 0.01, pct],
  ['sex', 'Sex', 0, 1, 0.01, (v) => (v < 0.15 ? 'male' : v > 0.85 ? 'female' : `${Math.round(v * 100)}`)],
  ['hairLength', 'Hair', 0, 1, 0.01, (v) => (v < 0.05 ? 'short' : pct(v))],
  ['face', 'Face', 0, 1, 0.005, (v) => `${Math.round(v * 100)}`],
  ['style', 'Style', 0, 1, 0.01, (v) => (v < 0.2 ? 'real' : v > 0.8 ? 'toon' : `${Math.round(v * 100)}`)],
];
const GAIT_SLIDERS = [
  ['speed', 'Speed', 0.5, 2.0, 0.01, (v) => `${v.toFixed(2)}`],
  ['armSwing', 'Arm swing', 0, 1.8, 0.01, pct],
  ['bounce', 'Bounce', 0.3, 1.6, 0.01, pct],
  ['sway', 'Hip action', 0, 2, 0.01, pct],
  ['stepWidth', 'Step width', 0.4, 2, 0.01, pct],
  ['toeOut', 'Toe-out', 0, 18, 0.5, (v) => `${v.toFixed(0)}°`],
  ['posture', 'Posture', -1, 1, 0.01, (v) => (v < -0.15 ? 'tired' : v > 0.15 ? 'proud' : 'easy')],
  ['variation', 'Variation', 0, 2, 0.01, pct],
];
function pct(v) { return `${Math.round(v * 100)}`; }

const inputs = {};
function slider(host, obj, [key, label, min, max, step, fmt], onInput) {
  const row = document.createElement('div');
  row.className = 'row';
  const id = `s-${key}`;
  row.innerHTML = `<label for="${id}">${label}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}"><output for="${id}"></output>`;
  const input = row.querySelector('input'), out = row.querySelector('output');
  const sync = () => {
    input.value = obj[key];
    out.textContent = fmt(+obj[key]);
    input.style.setProperty('--fill', `${((obj[key] - min) / (max - min)) * 100}%`);
  };
  input.addEventListener('input', () => { obj[key] = +input.value; sync(); onInput(); persist(); });
  sync();
  inputs[key] = sync;
  host.append(row);
}
const charHost = document.getElementById('character');
CHAR_SLIDERS.forEach((d) => slider(charHost, character, d, queueRebuild));
const gaitHost = document.getElementById('gait');
GAIT_SLIDERS.forEach((d) => slider(gaitHost, gait, d, () => walker.setGait(gait)));

const COLORS = [['skin', 'Skin'], ['hair', 'Hair'], ['eyes', 'Eyes'], ['shirt', 'Top'], ['pants', 'Pants'], ['shoes', 'Shoes']];
const colorHost = document.getElementById('colors');
for (const [key, label] of COLORS) {
  const el = document.createElement('label');
  el.className = 'swatch';
  el.innerHTML = `<input type="color" aria-label="${label} colour"><span>${label}</span>`;
  const input = el.querySelector('input');
  input.value = character[key];
  input.addEventListener('input', () => { character[key] = input.value; queueRebuild(); persist(); });
  inputs[key] = () => { input.value = character[key]; };
  colorHost.append(el);
}

// two-way choices under the colours: pants and shoes
function choice(key, label, opts, after) {
  const row = document.createElement('div');
  row.className = 'actions';
  row.setAttribute('role', 'radiogroup');
  row.setAttribute('aria-label', label);
  const btns = opts.map(([v, text]) => {
    const b = document.createElement('button');
    b.className = 'toggle';
    b.textContent = text;
    b.setAttribute('role', 'radio');
    b.onclick = () => { character[key] = v; sync(); queueRebuild(); persist(); };
    return [v, b];
  });
  const sync = () => btns.forEach(([v, b]) => { b.setAttribute('aria-pressed', character[key] === v); b.setAttribute('aria-checked', character[key] === v); });
  btns.forEach(([, b]) => row.append(b));
  after.after(row);
  inputs[key] = sync;
  sync();
  return row;
}
const pantsRow = choice('pantsStyle', 'Pants', [['jeans', 'Jeans'], ['leggings', 'Leggings']], colorHost);
choice('shoeStyle', 'Shoes', [['sneaker', 'Sneakers'], ['boot', 'Boots']], pantsRow);

const TOGGLES = [['footprints', 'Footprints'], ['arcs', 'Motion arcs'], ['skeleton', 'Skeleton'], ['graph', 'Gait graph'], ['ao', 'Occlusion']];
const toggleHost = document.getElementById('toggles');
function applyView() {
  setSkeleton(view.skeleton);
  if (!view.skeleton) { body.material.transparent = false; body.material.opacity = 1; }
  arcs.show(view.arcs);
  graph.show(view.graph);
}
for (const [key, label] of TOGGLES) {
  const b = document.createElement('button');
  b.className = 'toggle';
  b.textContent = label;
  b.setAttribute('aria-pressed', view[key]);
  b.onclick = () => { view[key] = !view[key]; b.setAttribute('aria-pressed', view[key]); applyView(); persist(); };
  toggleHost.append(b);
}

const EYES = ['#3b2a1e', '#5b4030', '#6b5a3a', '#4f6a52', '#4a6a8a', '#7a8a9a'];
const SKINS = ['#f1d3bd', '#e5b896', '#c99678', '#a8714f', '#7d4f35', '#5a3825'];
const HAIRS = ['#1d1612', '#3a2618', '#6b4426', '#a8763f', '#d9c08a', '#8c8a86'];
const OUTFITS = [
  ['#3d5a73', '#2b2b30', '#e8e4dc'], ['#b5462f', '#3a3f4a', '#f0ece4'], ['#e9e4d8', '#4a5a3f', '#5a3d2b'],
  ['#2f2f33', '#8a7d6b', '#1f1f22'], ['#7c8f6a', '#e3dccd', '#c9a27a'], ['#d9a63a', '#2d3a55', '#efefea'],
  ['#5d6b8c', '#c9bfae', '#3a2e26'], ['#f2efe9', '#1e2a3a', '#b8442e'],
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
// starting points, not stereotypes: every value stays on its slider
const PRESETS = {
  man: { shoeStyle: 'boot', pantsStyle: 'jeans', face: 0.5, eyes: '#4a3424', height: 1.78, legs: 1.0, shoulders: 1.04, hips: 0.97, build: 1.04, muscle: 0.6, head: 1.0, sex: 0, hairLength: 0.22,
    skin: '#c99678', hair: '#2a1d16', shirt: '#3d5a73', pants: '#33425c', shoes: '#9a6a42' },
  woman: { shoeStyle: 'sneaker', pantsStyle: 'leggings', face: 0.27, eyes: '#4f6a52', height: 1.65, legs: 1.02, shoulders: 1.0, hips: 1.0, build: 0.96, muscle: 0.35, head: 1.0, sex: 1, hairLength: 0.75,
    skin: '#e2b593', hair: '#5a3620', shirt: '#b5462f', pants: '#2d3a55', shoes: '#efefea' },
};
function applyPreset(name) {
  Object.assign(character, PRESETS[name]);
  for (const k in inputs) inputs[k]();
  queueRebuild(); persist();
}
document.getElementById('man').onclick = () => applyPreset('man');
document.getElementById('woman').onclick = () => applyPreset('woman');
document.getElementById('random').onclick = () => {
  const [shirt, pants, shoes] = pick(OUTFITS);
  const broad = Math.random();
  const fem = Math.random() < 0.5 ? 1 : 0;
  Object.assign(character, {
    face: +Math.random().toFixed(3), eyes: pick(EYES), pantsStyle: fem && Math.random() < 0.5 ? 'leggings' : 'jeans', shoeStyle: Math.random() < 0.4 ? 'boot' : 'sneaker',
    sex: fem, hairLength: +(fem ? rnd(0.3, 1) : rnd(0, 0.25)).toFixed(2),
    height: +(fem ? rnd(1.54, 1.78) : rnd(1.64, 1.96)).toFixed(2), legs: +rnd(0.94, 1.06).toFixed(2),
    shoulders: +(0.9 + broad * 0.22).toFixed(2), hips: +(1.12 - broad * 0.2 + rnd(-0.05, 0.05)).toFixed(2),
    build: +rnd(0.86, 1.22).toFixed(2), muscle: +rnd(0.1, 0.9).toFixed(2), head: +rnd(0.95, 1.05).toFixed(2),
    skin: pick(SKINS), hair: pick(HAIRS), shirt, pants, shoes,
  });
  for (const k in inputs) inputs[k]();
  queueRebuild(); persist();
};
document.getElementById('copy').onclick = async (e) => {
  const text = JSON.stringify({ character, gait }, null, 2);
  try { await navigator.clipboard.writeText(text); flash(e.target, 'Copied'); } catch { flash(e.target, 'Blocked'); }
};
document.getElementById('paste').onclick = async (e) => {
  try {
    const data = JSON.parse(await navigator.clipboard.readText());
    if (data.character) for (const k in DEFAULT_CHARACTER) if (k in data.character) character[k] = data.character[k];
    if (data.gait) for (const k in DEFAULT_GAIT) if (k in data.gait) gait[k] = data.gait[k];
    for (const k in inputs) inputs[k]();
    walker.setGait(gait); queueRebuild(); persist(); flash(e.target, 'Loaded');
  } catch { flash(e.target, 'No preset'); }
};
function flash(btn, text) {
  const t = btn.textContent; btn.textContent = text;
  setTimeout(() => { btn.textContent = t; }, 1200);
}
const panel = document.getElementById('panel');
document.getElementById('grip').onclick = () => {
  const c = panel.classList.toggle('collapsed');
  document.getElementById('grip').setAttribute('aria-expanded', !c);
};
if (innerWidth < 720) { panel.classList.add('collapsed'); document.getElementById('grip').setAttribute('aria-expanded', 'false'); }

const readout = document.getElementById('readout');
function updateReadout() {
  const t = walker.pose.timing;
  if (!t) return;
  readout.textContent = `${t.v.toFixed(2)} m/s · ${(t.v * 3.6).toFixed(1)} km/h\n${Math.round(t.cadence)} steps/min · step ${t.step.toFixed(2)} m`;
}

// ── loop ─────────────────────────────────────────────────────────────────
const REBASE = 100; // metres; keeps float precision on an endless walk
let last = performance.now(), readoutT = 0, arcClock = 0;
const pts = { lToe: new THREE.Vector3(), rToe: new THREE.Vector3(), lHand: new THREE.Vector3(), rHand: new THREE.Vector3(), head: new THREE.Vector3(), hips: new THREE.Vector3() };

// long hair: a damped spring (≈1.6 Hz) driven by the head's acceleration, so
// the ends lag, bounce with each step and swing with the sway
const hair = { prev: null, vel: new THREE.Vector3(), x: new THREE.Vector3(), v: new THREE.Vector3(), hp: new THREE.Vector3() };
function updateHairSwing(dt) {
  const u = body.userData.hairSwing;
  if (!u || dt <= 0) return;
  body.updateMatrixWorld(true);
  rig.bones.head.getWorldPosition(hair.hp);
  if (!hair.prev) { hair.prev = hair.hp.clone(); return; }
  const vel = hair.hp.clone().sub(hair.prev).divideScalar(dt);
  const acc = vel.clone().sub(hair.vel).divideScalar(dt);
  hair.prev.copy(hair.hp); hair.vel.copy(vel);
  const w = 2 * Math.PI * 1.6, zeta = 0.22;
  acc.clampLength(0, 30);
  const f = hair.x.clone().multiplyScalar(-w * w).addScaledVector(hair.v, -2 * zeta * w).addScaledVector(acc, -1);
  hair.v.addScaledVector(f, dt);
  hair.x.addScaledVector(hair.v, dt).clampLength(0, 0.035);
  u.value.copy(hair.x);
}

function sampleArcs() {
  if (!view.arcs) return;
  applyPose(walker.pose, rig.bones);
  body.updateMatrixWorld(true);
  const b = rig.bones;
  b.leftToeBase.getWorldPosition(pts.lToe); b.rightToeBase.getWorldPosition(pts.rToe);
  b.leftHand.getWorldPosition(pts.lHand); b.rightHand.getWorldPosition(pts.rHand);
  b.head.getWorldPosition(pts.head); pts.head.y += 0.1 * spec.u;
  b.hips.getWorldPosition(pts.hips);
  arcs.push(pts);
}

function frame(now) {
  const real = Math.min(0.05, (now - last) / 1000);
  last = now;
  let dt = paused ? 0 : real * rate;
  if (stepOnce) { dt = 1 / 60 * rate; stepOnce = false; }
  if (dt > 0) {
    // fixed sub-steps so slow motion and frame stepping stay exact
    const n = Math.max(1, Math.ceil(dt / (1 / 120)));
    for (let i = 0; i < n; i++) {
      walker.update(dt / n);
      for (const f of walker.feet) if (f.justPlanted) prints.add(f.plant, f.yaw, f.sign);
      arcClock += dt / n;
      if (arcClock >= 1 / 90) { arcClock %= 1 / 90; sampleArcs(); }
    }
    if (walker.dist > REBASE) {
      walker.rebase(REBASE);
      prints.shift(REBASE);
      arcs.shift(REBASE);
    }
    applyPose(walker.pose, rig.bones);
    if (body.morphTargetInfluences) body.morphTargetInfluences[0] = walker.pose.blink || 0;
    updateHairSwing(dt);
    prints.update(dt);
    graph.record(walker.pose.phase, walker.pose.diag.right);
  }
  updateCamera(real);
  readoutT -= real;
  if (readoutT <= 0) { updateReadout(); readoutT = 0.25; }
  graph.draw(walker.pose.phase);
  if (view.ao) composer.render(); else renderer.render(scene, cam);
  requestAnimationFrame(frame);
}

walker.update(1 / 120);
applyPose(walker.pose, rig.bones);
resize();
applyView();
requestAnimationFrame(frame);

// console handle for poking at the rig: walkerApp.walker.pose, .character …
window.walkerApp = { scene, gtao, composer, applyPreset, walker, character, gait, view, camState, setPaused, get body() { return body; }, get spec() { return spec; } };
