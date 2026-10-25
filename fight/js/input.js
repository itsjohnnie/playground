// Keyboard + gamepad controllers. Each produces one frame of intent:
// a world-space move direction plus held/pressed buttons.
import * as THREE from 'three';
import { SCREEN_UP, SCREEN_RIGHT } from './camera.js';

const BUTTONS = ['punch', 'kick', 'grab', 'block', 'special', 'run'];

const KEYMAPS = {
  p1: {
    up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
    punch: ['KeyJ'], kick: ['KeyK'], grab: ['KeyL'], block: ['KeyI'], special: ['KeyU'], run: ['ShiftLeft'],
  },
  p2: {
    up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
    punch: ['Numpad1', 'Comma'], kick: ['Numpad2', 'Period'], grab: ['Numpad3', 'Slash'], block: ['Numpad5', 'Semicolon'], special: ['Numpad4', 'Quote'], run: ['Numpad0', 'ShiftRight'],
  },
};

export const keys = new Set();
const pressedThisFrame = new Set();
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys.add(e.code);
  pressedThisFrame.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

export function endFrame() { pressedThisFrame.clear(); prevPads = padStates(); }

let prevPads = [];
function padStates() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  return pads.map((p) => ({ b: p.buttons.map((b) => b.pressed), ax: [...p.axes] }));
}
function padNow(i) {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  const p = pads[i];
  if (!p) return null;
  return { b: p.buttons.map((b) => b.pressed), ax: [...p.axes] };
}
const PAD_MAP = { punch: [2], kick: [0], grab: [1], special: [3], block: [5, 7], run: [4, 6] };

export class Controller {
  constructor(keymaps, padIndex) {
    this.keymaps = keymaps; // array of keymap objects
    this.padIndex = padIndex;
    this.frame = { dir: new THREE.Vector2(), held: {}, pressed: {}, anyPressed: false, doubleTap: false };
    this.lastDirKey = null; this.lastDirT = 0; this.wasNeutral = true; this.clock = 0;
  }

  poll(dt) {
    this.clock += dt;
    const f = this.frame;
    let x = 0, y = 0;
    const held = {}, pressed = {};
    const any = (codes) => codes.some((c) => keys.has(c));
    const anyP = (codes) => codes.some((c) => pressedThisFrame.has(c));
    for (const km of this.keymaps) {
      if (any(km.up)) y += 1;
      if (any(km.down)) y -= 1;
      if (any(km.left)) x -= 1;
      if (any(km.right)) x += 1;
      for (const b of BUTTONS) { held[b] = held[b] || any(km[b]); pressed[b] = pressed[b] || anyP(km[b]); }
    }
    const pad = this.padIndex != null ? padNow(this.padIndex) : null;
    if (pad) {
      const prev = prevPads[this.padIndex];
      const ax = pad.ax[0] || 0, ay = pad.ax[1] || 0;
      if (Math.hypot(ax, ay) > 0.3) { x += ax; y -= ay; }
      if (pad.b[12]) y += 1;
      if (pad.b[13]) y -= 1;
      if (pad.b[14]) x -= 1;
      if (pad.b[15]) x += 1;
      for (const b of BUTTONS) for (const i of PAD_MAP[b]) {
        if (pad.b[i]) held[b] = true;
        if (pad.b[i] && !(prev && prev.b[i])) pressed[b] = true;
      }
    }
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    // Screen-space stick -> world ground direction.
    f.dir.set(SCREEN_RIGHT.x * x + SCREEN_UP.x * y, SCREEN_RIGHT.y * x + SCREEN_UP.y * y);
    f.held = held;
    f.pressed = pressed;
    f.anyPressed = BUTTONS.some((b) => pressed[b]);
    // Double-tap a direction to run.
    f.doubleTap = false;
    const neutral = len < 0.3;
    if (!neutral && this.wasNeutral) {
      const key = Math.round(Math.atan2(y, x) / (Math.PI / 4));
      if (this.lastDirKey === key && this.clock - this.lastDirT < 0.28) f.doubleTap = true;
      this.lastDirKey = key;
      this.lastDirT = this.clock;
    }
    this.wasNeutral = neutral;
    if (f.doubleTap) this.runLatch = true;
    if (neutral) this.runLatch = false;
    if (this.runLatch) f.held.run = true;
    return f;
  }
}

// Menu navigation from any keyboard or pad.
export function menuInput() {
  const p = (codes) => codes.some((c) => pressedThisFrame.has(c));
  const out = {
    up: p(['ArrowUp', 'KeyW']), down: p(['ArrowDown', 'KeyS']), left: p(['ArrowLeft', 'KeyA']), right: p(['ArrowRight', 'KeyD']),
    confirm: p(['Enter', 'Space', 'KeyJ', 'NumpadEnter']), back: p(['Escape', 'Backspace']), pause: p(['Escape', 'KeyP']),
    p2: { up: p(['ArrowUp']), down: p(['ArrowDown']), left: p(['ArrowLeft']), right: p(['ArrowRight']), confirm: p(['Enter', 'Numpad1', 'Comma', 'NumpadEnter']) },
    p1: { up: p(['KeyW']), down: p(['KeyS']), left: p(['KeyA']), right: p(['KeyD']), confirm: p(['KeyJ', 'Space']) },
    any: pressedThisFrame.size > 0,
  };
  const pads = padStates();
  pads.forEach((pad, i) => {
    const prev = prevPads[i];
    const e = (b) => pad.b[b] && !(prev && prev.b[b]);
    const axE = (a, s) => Math.sign(pad.ax[a] || 0) === s && Math.abs(pad.ax[a]) > 0.6 && !(prev && Math.abs(prev.ax[a]) > 0.6 && Math.sign(prev.ax[a]) === s);
    const t = i === 0 ? out.p1 : out.p2;
    const set = (k, v) => { if (v) { out[k] = true; t[k] = true; } };
    set('up', e(12) || axE(1, -1)); set('down', e(13) || axE(1, 1));
    set('left', e(14) || axE(0, -1)); set('right', e(15) || axE(0, 1));
    set('confirm', e(0) || e(9));
    if (e(1)) out.back = true;
    if (e(9)) out.pause = true;
    if (pad.b.some((b, k) => b && !(prev && prev.b[k]))) out.any = true;
  });
  return out;
}

export function makeControllers(mode) {
  if (mode === 'pvp') return [new Controller([KEYMAPS.p1], 0), new Controller([KEYMAPS.p2], 1)];
  return [new Controller([KEYMAPS.p1, KEYMAPS.p2], 0), null];
}

export { KEYMAPS };
