// On-screen controls for phones and tablets: a virtual stick and buttons
// per player that press the same keys as the keyboard, so every move,
// combo, double-tap run and special works unchanged.
import { virtualKey } from './input.js';

export const IS_TOUCH = typeof matchMedia !== 'undefined' && (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window);

const MAPS = {
  p1: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', punch: 'KeyJ', kick: 'KeyK', grab: 'KeyL', block: 'KeyI', special: 'KeyU' },
  p2: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', punch: 'Comma', kick: 'Period', grab: 'Slash', block: 'Semicolon', special: 'Quote' },
};
const BUTTONS = [['punch', 'PUNCH'], ['kick', 'KICK'], ['grab', 'GRAB'], ['block', 'BLOCK'], ['special', 'SPECIAL']];

function stick(el, map) {
  const knob = el.querySelector('.knob');
  let id = null, held = new Set();
  const set = (dirs) => {
    for (const d of ['up', 'down', 'left', 'right']) {
      const on = dirs.has(d);
      if (on && !held.has(d)) virtualKey(map[d], true);
      if (!on && held.has(d)) virtualKey(map[d], false);
    }
    held = dirs;
  };
  const move = (e) => {
    const r = el.getBoundingClientRect(), R = r.width / 2;
    let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    knob.style.transform = `translate(${x * R * 0.55}px, ${y * R * 0.55}px)`;
    const dirs = new Set();
    if (len > 0.3) {
      // Eight-way: a direction counts when the stick leans within 67.5° of it.
      const a = Math.atan2(-y, x);
      if (Math.sin(a) > 0.38) dirs.add('up');
      if (Math.sin(a) < -0.38) dirs.add('down');
      if (Math.cos(a) > 0.38) dirs.add('right');
      if (Math.cos(a) < -0.38) dirs.add('left');
    }
    set(dirs);
  };
  const end = (e) => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; set(new Set()); };
  el.addEventListener('pointerdown', (e) => { id = e.pointerId; el.setPointerCapture(id); move(e); e.preventDefault(); });
  el.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  return () => set(new Set());
}

function button(el, code) {
  const down = (e) => { el.setPointerCapture(e.pointerId); el.classList.add('on'); virtualKey(code, true); e.preventDefault(); navigator.vibrate?.(8); };
  const up = () => { el.classList.remove('on'); virtualKey(code, false); };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
}

function pad(player) {
  const map = MAPS[player];
  const el = document.createElement('div');
  el.className = `tpad ${player}`;
  el.innerHTML = `<div class="tstick"><div class="knob"></div></div><div class="tbtns">${BUTTONS.map(([b, l]) => `<button class="tb ${b}" data-b="${b}">${l}</button>`).join('')}</div>`;
  const release = stick(el.querySelector('.tstick'), map);
  el.querySelectorAll('.tb').forEach((b) => button(b, map[b.dataset.b]));
  return { el, release };
}

export function initTouch(game) {
  if (!IS_TOUCH) return;
  document.body.classList.add('touch');
  const root = document.createElement('div');
  root.id = 'touch';
  const p1 = pad('p1'), p2 = pad('p2');
  const pause = document.createElement('button');
  pause.className = 'tpause'; pause.textContent = 'II'; pause.setAttribute('aria-label', 'Pause');
  pause.addEventListener('pointerdown', (e) => { e.preventDefault(); virtualKey('Escape', true); setTimeout(() => virtualKey('Escape', false), 60); });
  root.append(p1.el, p2.el, pause);
  document.body.appendChild(root);
  // Shown only while fighting; the second pad only when a human plays P2.
  let shown = null;
  const tick = () => {
    const on = game.ui?.isShown('hud') && !game.paused;
    const two = !!game.controllers?.[1]?.keymaps;
    const state = on ? (two ? 2 : 1) : 0;
    if (state !== shown) {
      shown = state;
      root.classList.toggle('show', state > 0);
      root.classList.toggle('two', state === 2);
      if (!state) { p1.release(); p2.release(); }
    }
    requestAnimationFrame(tick);
  };
  tick();
}
