// ============================================================
// The three little piggies — a scroll-along ASCII storybook
// One canvas. One scroll. Ten acts, and your thumb is the wind.
// ============================================================
(() => {
'use strict';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CELL_ASPECT = 0.6;
const TUMBLE = '/-\\|,;\'`';

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function smooth01(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
function win(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }
function frac(v) { return v - Math.floor(v); }

function hash3(x, y, z) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 15), 2654435761);
    h = Math.imul(h ^ (h >>> 13), 2246822519);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// ============================================================
// the stage: one full-screen char grid
// ============================================================
const stageCanvas = document.getElementById('stage');
const ctx = stageCanvas.getContext('2d');

let COLS = 0, ROWS = 0, CELLW = 0, CELLH = 0, FONT = '';
let gridA = null, gridB = null;
let dissolveMap = null;

function makeGrid() { return { ch: new Array(COLS * ROWS).fill(' '), co: new Array(COLS * ROWS).fill('') }; }
function gclear(g) { g.ch.fill(' '); g.co.fill(''); }
function gset(g, x, y, ch, col) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    const i = y * COLS + x;
    g.ch[i] = ch; g.co[i] = col;
}
function gtext(g, x, y, str, col) {
    for (let i = 0; i < str.length; i++) if (str[i] !== ' ') gset(g, x + i, y, str[i], col);
}
function speech(g, text, cx, y, col) {
    const x = clamp(Math.round(cx - text.length / 2), 1, Math.max(1, COLS - text.length - 1));
    // overwrite the whole strip, spaces included, so scenery doesn't bleed through
    for (let i = -1; i <= text.length; i++) gset(g, x + i, y, ' ', '');
    gtext(g, x, y, text, col);
}

let lastW = 0, lastH = 0;
function stageResize(force) {
    const w = window.innerWidth, h = window.innerHeight;
    if (!force && w === lastW && Math.abs(h - lastH) < 140) return;
    lastW = w; lastH = h;
    COLS = w < 520 ? 46 : w < 900 ? 74 : 110;
    CELLW = w / COLS;
    CELLH = CELLW / CELL_ASPECT;
    ROWS = Math.ceil(h / CELLH) + 1;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    stageCanvas.width = Math.round(w * dpr);
    stageCanvas.height = Math.round(h * dpr);
    stageCanvas.style.width = w + 'px';
    stageCanvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    FONT = `${CELLH * 0.92}px "IBM Plex Mono", monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    gridA = makeGrid(); gridB = makeGrid();
    dissolveMap = new Float32Array(COLS * ROWS);
    for (let i = 0; i < dissolveMap.length; i++) dissolveMap[i] = hash3(i % COLS, (i / COLS) | 0, 99);
    measureActs();
    dirty = true;
}

function stageRender(g) {
    ctx.clearRect(0, 0, lastW, lastH);
    ctx.font = FONT;
    let last = null;
    for (let y = 0; y < ROWS; y++) {
        const py = (y + 0.5) * CELLH;
        for (let x = 0; x < COLS; x++) {
            const i = y * COLS + x;
            const c = g.ch[i];
            if (c === ' ') continue;
            const col = g.co[i] || '#ff9ecd';
            if (col !== last) { ctx.fillStyle = col; last = col; }
            ctx.fillText(c, (x + 0.5) * CELLW, py);
        }
    }
}

// ============================================================
// sound: a few gentle bleeps, off until invited
// ============================================================
const Sound = {
    ctx: null, on: false, windGain: null, windSrc: null,
    ensure() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) this.ctx = new AC();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
    },
    tone(freq, dur = 0.1, type = 'square', vol = 0.05, glideTo = null, delay = 0) {
        if (!this.on) return;
        const c = this.ensure(); if (!c) return;
        const t0 = c.currentTime + delay;
        const o = c.createOscillator(), gn = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t0);
        if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
        gn.gain.setValueAtTime(vol, t0);
        gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(gn).connect(c.destination);
        o.start(t0); o.stop(t0 + dur + 0.02);
    },
    noiseBurst(dur = 0.3, vol = 0.08, freqHz = 1600) {
        if (!this.on) return;
        const c = this.ensure(); if (!c) return;
        const len = Math.max(1, (c.sampleRate * dur) | 0);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource(); src.buffer = buf;
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freqHz;
        const gn = c.createGain();
        gn.gain.setValueAtTime(vol, c.currentTime);
        gn.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
        src.connect(f).connect(gn).connect(c.destination);
        src.start();
    },
    oink() {
        this.tone(340, 0.08, 'sawtooth', 0.05, 170);
        this.tone(300, 0.1, 'sawtooth', 0.05, 150, 0.11);
    },
    splash() { this.noiseBurst(0.4, 0.1, 2400); this.tone(480, 0.35, 'sine', 0.05, 120); },
    yelp() { this.tone(700, 0.09, 'sawtooth', 0.06, 1500); this.tone(1400, 0.16, 'sawtooth', 0.06, 500, 0.1); },
    lastWind: -1,
    setWind(level) {
        if (!this.on) { level = 0; }
        if (!this.ctx) { if (level <= 0) return; this.ensure(); }
        const c = this.ctx; if (!c) return;
        if (level === this.lastWind) return;
        this.lastWind = level;
        if (!this.windSrc) {
            const len = c.sampleRate * 2;
            const buf = c.createBuffer(1, len, c.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            const src = c.createBufferSource();
            src.buffer = buf; src.loop = true;
            const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 0.6;
            const gn = c.createGain(); gn.gain.value = 0;
            src.connect(f).connect(gn).connect(c.destination);
            src.start();
            this.windSrc = src; this.windGain = gn;
        }
        const target = clamp(level, 0, 1) * 0.07;
        this.windGain.gain.setTargetAtTime(target, c.currentTime, 0.12);
    }
};

const soundBtn = document.getElementById('sound-btn');
soundBtn.addEventListener('click', () => {
    Sound.on = !Sound.on;
    soundBtn.textContent = Sound.on ? '♪ on' : '♪ off';
    soundBtn.classList.toggle('on', Sound.on);
    if (Sound.on) { Sound.ensure(); Sound.oink(); }
    else Sound.setWind(0);
});

// ============================================================
// palette
// ============================================================
const pink  = a => `rgba(255,158,205,${a.toFixed(2)})`;
const rose  = a => `rgba(255,122,184,${a.toFixed(2)})`;
const gold  = a => `rgba(255,210,63,${a.toFixed(2)})`;
const straw = a => `rgba(240,200,90,${a.toFixed(2)})`;
const wood  = a => `rgba(217,154,91,${a.toFixed(2)})`;
const brick = a => `rgba(255,107,74,${a.toFixed(2)})`;
const slate = a => `rgba(176,186,200,${a.toFixed(2)})`;
const grass = a => `rgba(124,196,124,${a.toFixed(2)})`;
const cream = a => `rgba(248,243,233,${a.toFixed(2)})`;
const skyc  = a => `rgba(143,216,232,${a.toFixed(2)})`;
const ember = a => `rgba(255,169,49,${a.toFixed(2)})`;

// ============================================================
// pieces: parse art into stampable chars
// ============================================================
const R = String.raw;

function parsePiece(art) {
    const lines = art.split('\n');
    const out = [];
    lines.forEach((ln, dy) => {
        for (let dx = 0; dx < ln.length; dx++)
            if (ln[dx] !== ' ') out.push({ ch: ln[dx], dx, dy });
    });
    out.w = Math.max(...lines.map(l => l.length));
    out.h = lines.length;
    return out;
}

function stampArt(g, art, x, y, col, alpha = 1) {
    const lines = art.split('\n');
    const c = col(alpha);
    for (let dy = 0; dy < lines.length; dy++) {
        const ln = lines[dy];
        for (let dx = 0; dx < ln.length; dx++)
            if (ln[dx] !== ' ') gset(g, x + dx, y + dy, ln[dx], c);
    }
}

// ============================================================
// the cast, drawn programmatically so poses stay in sync
// ============================================================
const HAT = { sunny: '  ,;;;;,  ', twiggy: '  /====\\  ', bricky: '  [####]  ', none: null };

function pigLines(pose, step) {
    const ears = '  /)  (\\  ';
    let eyes = ' (  ..  ) ';
    let snout = ' ( (oo) ) ';
    let arms = ' /(    )\\ ';
    let legs = step ? '  u    u  ' : '   u  u   ';
    if (pose === 'cheer' || pose === 'dance1') { eyes = ' (  ^^  ) '; arms = '\\(      )/'; }
    if (pose === 'dance2') { eyes = ' (  ^^  ) '; arms = ' /(    )\\ '; legs = step ? '   u  u   ' : '  u    u  '; }
    if (pose === 'scared') { eyes = ' (  OO  ) '; legs = '  u u  u  '; }
    if (pose === 'sleep') return ['   /)  (\\  ', '  (  --  ) ', '  ( (oo) ) ', ' (________)'];
    return [ears, eyes, snout, arms, legs];
}

// x,y anchor the pig's feet (bottom-left of the art)
function drawPig(g, x, y, hat, pose, time, col = pink, alpha = 1) {
    const step = ((time * 6) | 0) % 2 === 1;
    const lines = pigLines(pose, step);
    const hatLn = HAT[hat];
    const all = hatLn && pose !== 'sleep' ? [hatLn, ...lines] : lines;
    const top = y - all.length + 1;
    const c = col(alpha);
    all.forEach((ln, i) => {
        for (let dx = 0; dx < ln.length; dx++)
            if (ln[dx] !== ' ') gset(g, x + dx, top + i, ln[dx], c);
    });
}
const PIG_W = 10, PIG_H = 6;

function wolfLines(pose, step) {
    let head = '   /\\___/\\   ';
    let eyes = '  ( o , o )  ';
    let mouth = '  (  \\_/  )  ';
    let body = ' __(     )__ ';
    let hips = '   |     |   ';
    let legs = step ? '  w |   | w  ' : '   w|   |w   ';
    if (pose === 'inhale') { eyes = '  ((O , O))  '; mouth = '  ((  o  ))  '; body = ' __((   ))__ '; }
    if (pose === 'blow')   { eyes = '  ( >   < )  '; mouth = '  (  ooo  )  '; }
    if (pose === 'dizzy')  { eyes = '  ( @ , @ )  '; mouth = '  (  ~_~  )  '; }
    if (pose === 'yelp')   { eyes = '  ( O ! O )  '; mouth = '  (  AAA  )  '; body = ' __(  !  )__ '; }
    if (pose === 'climb')  return [head, eyes, mouth, '   /|   |\\   '];
    if (pose === 'sneak')  return [head, '  ( o , o )> ', mouth, ' __(     )__ ', legs];
    return [head, eyes, mouth, body, hips, legs];
}

function drawWolf(g, x, y, pose, time, alpha = 1, clipY = 1e9) {
    const step = ((time * 7) | 0) % 2 === 1;
    const lines = wolfLines(pose, step);
    const top = y - lines.length + 1;
    const c = slate(alpha);
    lines.forEach((ln, i) => {
        if (top + i > clipY) return;
        for (let dx = 0; dx < ln.length; dx++)
            if (ln[dx] !== ' ') gset(g, x + dx, top + i, ln[dx], c);
    });
    if (pose === 'dizzy') {
        const a = time * 2.5;
        for (let k = 0; k < 3; k++) {
            const th = a + k * 2.1;
            gset(g, x + 6 + Math.cos(th) * 4 / CELL_ASPECT * 0.5, y - lines.length - 1 + Math.sin(th), '*', gold(0.5 + 0.3 * Math.sin(a * 3 + k)));
        }
    }
}
const WOLF_W = 13, WOLF_H = 6;

// ============================================================
// houses
// ============================================================
const HOUSE_STRAW = parsePiece(R`    ,;;;;;,
   ;;;;;;;;;
  ;;;;;;;;;;;
 ;;;;;;;;;;;;;
 |;;;;;;;;;;;|
 |;;; __ ;;;;|
 |;;;|  |;;;;|`);

const HOUSE_STICKS = parsePiece(R`      /\
     /||\
    /=||=\
   /======\
  /========\
 /==========\
 |/\/|--|\/\|
 ||__|[]|__||`);

const HOUSE_BRICK = parsePiece(R`      ___
     |___|
  ___|___|______
 /______________\
|__|__|__|__|__|_|
|_|__|__|__|__|__|
|__|__.--.__|__|_|
|_|___|  |___|__|
|__|__|__|__|__|_|`);

// stamp a fully-built house, feet at (x, groundY)
function drawHouse(g, piece, x, groundY, col, alpha = 1) {
    const top = groundY - piece.h + 1;
    for (const p of piece) {
        const h = hash3(p.dx, p.dy, 7);
        gset(g, x + p.dx, top + p.dy, p.ch, col(alpha * (0.75 + h * 0.25)));
    }
}

// scroll-scrubbed assembly; mode: 'swirl' | 'fall' | 'course'
// (coefficients must satisfy: a reaches 1 before t does, for every char —
//  i.e. t-coefficient > 1 + max total stagger)
function drawAssembly(g, piece, x, groundY, col, t, mode) {
    const top = groundY - piece.h + 1;
    for (const p of piece) {
        const h = hash3(p.dx, p.dy, 11);
        const tx = x + p.dx, ty = top + p.dy;
        let a;
        if (mode === 'course') {
            const rowFrac = (piece.h - 1 - p.dy) / piece.h;
            a = clamp(t * 2.15 - rowFrac * 0.7 - h * 0.12, 0, 1);
        } else {
            a = clamp(t * 1.85 - h * 0.55, 0, 1);
        }
        if (a <= 0) continue;
        const e = smooth01(a);
        let px = tx, py = ty;
        if (mode === 'swirl') {
            const ang = h * 2.2 - 0.6;
            px = lerp(tx + Math.cos(ang) * (26 + h * 34), tx, e) + Math.sin(e * 7 + h * 20) * (1 - e) * 3;
            py = lerp(ty - Math.sin(ang) * (10 + h * 22), ty, e);
        } else if (mode === 'fall') {
            py = lerp(ty - 14 - h * 26, ty, e * e);
            px = tx + Math.sin(h * 40 + e * 5) * (1 - e) * 2;
        } else {
            px = tx + (p.dy % 2 === 0 ? -1 : 1) * (1 - e) * (16 + h * 14);
        }
        const settled = a >= 1;
        const chr = settled ? p.ch : TUMBLE[((h * 5 + e * 6) | 0) % TUMBLE.length];
        gset(g, px, py, chr, col((0.35 + 0.65 * e) * (0.75 + h * 0.25)));
    }
    return t >= 0.88;
}

// scroll-scrubbed demolition: chars shear away to the right
function drawBlowApart(g, piece, x, groundY, col, w0) {
    const top = groundY - piece.h + 1;
    for (const p of piece) {
        const h = hash3(p.dx, p.dy, 13);
        const colFrac = p.dx / piece.w;
        const w = clamp(w0 * 1.6 - h * 0.4 - colFrac * 0.2, 0, 1);
        const tx = x + p.dx, ty = top + p.dy;
        if (w <= 0) {
            gset(g, tx, ty, p.ch, col(0.75 + h * 0.25));
            continue;
        }
        const disp = (1 - Math.exp(-3 * w)) / 3;
        const px = tx + disp * (34 + h * 52);
        const py = ty - disp * (8 + h * 20) + w * w * 16;
        const alpha = (1 - w * 0.9) * (0.75 + h * 0.25);
        if (alpha < 0.06) continue;
        const chr = w < 0.06 ? p.ch : TUMBLE[((h * 6 + w * 10) | 0) % TUMBLE.length];
        gset(g, px, py, chr, col(alpha));
    }
}

// ============================================================
// scenery
// ============================================================
let windSkew = 0;   // horizontal drags bend the wind

// the build → huff → chimney acts cross-dissolve into each other, so they must
// all anchor the house at the same fraction of the grid for it to read as one building
const HOUSE_X = 0.52;

function groundRow(x, phase) {
    return ROWS * 0.8 + Math.sin(x * 0.11 + phase) * 1.6;
}

function drawMeadow(g, time, phase, day) {
    const farCol = grass(0.1 + day * 0.12);
    const lineCol = grass(0.2 + day * 0.25);
    const tuftCol = grass(0.25 + day * 0.35);
    // far hills
    for (let x = 0; x < COLS; x++) {
        const y1 = ROWS * 0.66 + Math.sin(x * 0.07 + phase * 0.35 + 2) * 2.4;
        if (hash3(x, 3, 21) > 0.45) gset(g, x, y1, '~', farCol);
    }
    // near ground line + tufts
    for (let x = 0; x < COLS; x++) {
        const gy = groundRow(x, phase);
        gset(g, x, gy, '_', lineCol);
        const h = hash3(x, 9, 21);
        if (h > 0.72) {
            const sway = Math.sin(time * 1.8 + x * 0.8) > 0.4 ? ',' : '"';
            gset(g, x, gy - 1, sway, tuftCol);
        }
        if (h < 0.12) gset(g, x, gy + 2 + ((h * 40) | 0) % 3, '.', farCol);
    }
}

function drawSky(g, time, day, sunFrac) {
    // stars come out as the day dims
    const starAmt = clamp(1 - day * 1.6, 0, 1);
    if (starAmt > 0.02) {
        const n = (COLS * ROWS * 0.02 * starAmt) | 0;
        for (let i = 0; i < n; i++) {
            const x = (hash3(i, 0, 31) * COLS) | 0;
            const y = (hash3(i, 1, 31) * ROWS * 0.55) | 0;
            const tw = 0.5 + 0.5 * Math.sin(time * (0.6 + hash3(i, 2, 31) * 2.4) + i * 1.7);
            if (tw < 0.3) continue;
            gset(g, x, y, tw > 0.8 ? '✦' : '·', cream(clamp(0.12 + tw * 0.5 * starAmt, 0, 0.7)));
        }
    }
    // the sun (day) or the moon (night) rides the story
    const sx = lerp(6, COLS - 8, sunFrac);
    const sy = ROWS * 0.32 - Math.sin(sunFrac * Math.PI) * ROWS * 0.22;
    if (day > 0.35) {
        const a = clamp(day, 0, 1);
        stampArt(g, R`  \ | /
 - (o) -
  / | \ `, sx - 4, sy - 1, gold, a * (0.75 + 0.15 * Math.sin(time * 2)));
    } else {
        stampArt(g, R` _..
(
(
 '--`, sx - 1, sy - 1, cream, 0.7);
    }
    // drifting cloud puffs
    for (let i = 0; i < 3; i++) {
        const cx = (hash3(i, 5, 41) * COLS * 1.6 + time * (1.2 + i * 0.5)) % (COLS + 20) - 10;
        const cy = ROWS * (0.12 + hash3(i, 6, 41) * 0.2);
        gtext(g, cx, cy, '(~~~~)', cream(0.06 + day * 0.1));
        gtext(g, cx + 2, cy - 1, '(~~)', cream(0.05 + day * 0.08));
    }
}

// streaming wind, left → right
function drawWind(g, time, intensity, fromY = 0.2, toY = 0.85) {
    if (intensity <= 0.01) return;
    const n = (COLS * intensity * 1.6) | 0;
    for (let i = 0; i < n; i++) {
        const h = hash3(i, 0, 71), h2 = hash3(i, 1, 71);
        const speed = 14 + h * 30 * (0.5 + intensity);
        const x = (h2 * COLS * 2 + time * speed) % (COLS + 12) - 6;
        const y = ROWS * lerp(fromY, toY, h) + Math.sin(time * 2.4 + h * 9) * 1.6 + windSkew * (x / COLS - 0.5) * 6;
        const a = clamp(intensity * (0.25 + h2 * 0.5), 0, 0.8);
        gset(g, x, y, h > 0.6 ? '≈' : '~', skyc(a));
        if (intensity > 0.55 && h2 > 0.7) gset(g, x - 1, y, '-', skyc(a * 0.6));
    }
}

// little hearts and sparks where you tap
const bursts = [];
function renderBursts(g, now) {
    for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        const age = now - b.t0;
        if (age > 0.85) { bursts.splice(i, 1); continue; }
        const r = age * 22;
        const alpha = clamp(1 - age / 0.85, 0, 1);
        const steps = Math.max(8, r * 4) | 0;
        for (let s = 0; s < steps; s++) {
            const a = s / steps * Math.PI * 2;
            if (hash3(s, b.seed, 17) < 0.5) continue;
            const x = b.x + Math.cos(a) * r / CELL_ASPECT;
            const y = b.y + Math.sin(a) * r;
            gset(g, x, y, alpha > 0.5 ? '*' : '·', pink(alpha * 0.8));
        }
        gset(g, b.x, b.y - age * 6, '♥', rose(alpha));
    }
}

// ============================================================
// SCENES — render(g, t, time), t owned by the scroll
// ============================================================

// ---- once: dawn over the meadow; the DOM title floats above ----
function sceneOnce(g, t, time) {
    const day = lerp(0.1, 0.5, t);
    drawSky(g, time, day, lerp(0.02, 0.12, t));
    drawMeadow(g, time, 0, day);
    const gy = groundRow(COLS * 0.5, 0) | 0;
    // mama's cottage, off to the side
    drawHouse(g, HOUSE_BRICK, COLS * 0.08, gy, brick, 0.4 + t * 0.2);
    // three pigs, fast asleep in a row
    for (let i = 0; i < 3; i++) {
        const px = COLS * (0.38 + i * 0.17);
        drawPig(g, px, gy, 'none', 'sleep', time, pink, 0.75);
        const zi = (time * 1.5 + i * 0.6) % 3;
        gset(g, px + 9 + zi * 0.7, gy - 4 - zi, zi > 1.5 ? 'Z' : 'z', cream(clamp(0.6 - zi * 0.18, 0, 0.6)));
    }
    // fireflies drifting up as dawn comes
    for (let i = 0; i < 10; i++) {
        const h = hash3(i, 4, 81);
        const x = h * COLS + Math.sin(time * 0.7 + i) * 3;
        const y = ROWS * (0.5 + hash3(i, 5, 81) * 0.3) - frac(time * 0.05 + h) * ROWS * 0.2;
        const tw = 0.5 + 0.5 * Math.sin(time * 3 + i * 2.4);
        if (tw > 0.5) gset(g, x, y, '·', gold(tw * 0.5 * (1 - t * 0.7)));
    }
}

// ---- setout: the journey; the world slides by ----
function sceneSetout(g, t, time) {
    const day = 0.75;
    drawSky(g, time, day, lerp(0.15, 0.3, t));
    const phase = t * 16;
    drawMeadow(g, time, phase, day);
    // passing bushes and trees give the road its motion
    for (let i = 0; i < 7; i++) {
        const h = hash3(i, 2, 91);
        const x = ((h * COLS * 2 - t * COLS * 1.8) % (COLS * 2) + COLS * 2) % (COLS * 2) - COLS * 0.5;
        const gy = groundRow(x, phase) | 0;
        if (h > 0.5) {
            stampArt(g, R` (##)
(####)
  ||`, x, gy - 3, grass, 0.35);
        } else {
            stampArt(g, '(::)', x, gy - 1, grass, 0.3);
        }
    }
    // mama waves goodbye, sliding away with home
    const mx = lerp(COLS * 0.06, -18, smooth01(t * 1.4));
    if (mx > -14) {
        const gy = groundRow(mx + 5, phase) | 0;
        drawPig(g, mx, gy, 'none', 'cheer', time, rose, 0.85);
        if (t < 0.35) speech(g, '"build strong, little ones!"', mx + 14, gy - 8, cream(0.7 * (1 - t / 0.35)));
    }
    // the three pigs trot in place while the world moves
    const hats = ['sunny', 'twiggy', 'bricky'];
    for (let i = 0; i < 3; i++) {
        const px = COLS * (0.34 + i * 0.16);
        const gy = groundRow(px + 5, phase) | 0;
        const bob = Math.sin(time * 6 + i * 1.2) > 0.5 ? -1 : 0;
        drawPig(g, px, gy + bob, hats[i], 'walk', time + i * 0.11, pink, 0.95);
    }
}

// ---- house-building acts share one shape ----
function makeBuildScene(piece, colFn, mode, hat, doneLine) {
    return (g, t, time) => {
        const day = 0.85;
        drawSky(g, time, day, 0.4);
        drawMeadow(g, time, 0, day);
        const hx = COLS * HOUSE_X;
        const gy = groundRow(hx + piece.w / 2, 0) | 0;
        const done = drawAssembly(g, piece, hx, gy, colFn, t, mode);
        // the builder pig, hopping with excitement as it finishes
        const px = hx - PIG_W - 4;
        const pgy = groundRow(px + 5, 0) | 0;
        const hop = done && Math.sin(time * 8) > 0.3 ? -1 : 0;
        drawPig(g, px, pgy + hop, hat, done ? 'cheer' : 'walk', done ? 0 : time, pink, 1);
        if (done) speech(g, doneLine, px + 5, pgy - 8, cream(0.75));
        // loose material swirling in on the breeze
        drawWind(g, time, clamp(0.25 - Math.abs(t - 0.4), 0, 0.22), 0.25, 0.7);
    };
}

const sceneStraw  = makeBuildScene(HOUSE_STRAW,  straw, 'swirl',  'sunny',  '"ta-da!"');
const sceneSticks = makeBuildScene(HOUSE_STICKS, wood,  'fall',   'twiggy', '"nailed it!"');
const sceneBricks = makeBuildScene(HOUSE_BRICK,  brick, 'course', 'bricky', '"solid."');

// ---- the huffs: wolf in, dialogue, and the wind is your thumb ----
function makeHuffScene(piece, colFn, pigsHats, doorEyes, { holds = false } = {}) {
    return (g, t, time) => {
        const day = holds ? lerp(0.7, 0.42, t) : 0.8;
        drawSky(g, time, day, holds ? 0.75 : 0.55);
        drawMeadow(g, time, 0, day);
        const hx = COLS * HOUSE_X;
        const gy = groundRow(hx + piece.w / 2, 0) | 0;
        const top = gy - piece.h + 1;

        // the wolf arrives (and, beaten by bricks, staggers off again)
        const wolfIn = smooth01(win(t, 0, 0.2));
        let wx = lerp(-WOLF_W - 2, COLS * 0.12, wolfIn);
        if (holds) wx = lerp(wx, -WOLF_W - 2, smooth01(win(t, 0.92, 1)));
        const wgy = groundRow(wx + 6, 0) | 0;

        const inhale = win(t, 0.44, 0.56);
        const blowT = win(t, 0.56, 1);
        let pose = 'walk';
        if (t > 0.2) pose = 'idle';
        if (inhale > 0 && blowT <= 0) pose = 'inhale';
        if (blowT > 0) pose = 'blow';

        // suction: loose leaves spiral INTO the wolf as he inhales
        if (pose === 'inhale') {
            for (let i = 0; i < 14; i++) {
                const h = hash3(i, 3, 51);
                const rr = (1 - frac(time * 0.6 + h)) * 22;
                const th = h * 6.28 + time * 0.8;
                gset(g, wx + 8 + Math.cos(th) * rr / CELL_ASPECT * 0.7, wgy - 3 + Math.sin(th) * rr * 0.4, ',', grass(0.5 * (1 - rr / 22)));
            }
        }

        const wind = blowT > 0 ? clamp(Math.sin(Math.min(blowT * 1.3, 1) * Math.PI * 0.5) + 0.2, 0, 1) : 0;
        windLevel = Math.max(windLevel, wind * (holds ? 1 : 0.85));
        drawWind(g, time, wind, 0.25, 0.8);

        // the house
        if (holds) {
            // the brick house shivers... and stays
            const jit = wind * (REDUCED ? 0 : 1.4);
            for (const p of piece) {
                const h = hash3(p.dx, p.dy, 7);
                const jx = jit > 0.1 ? (hash3(p.dx, p.dy, (time * 14) | 0) - 0.5) * jit : 0;
                gset(g, hx + p.dx + jx, top + p.dy, p.ch, colFn(0.75 + h * 0.25));
            }
            if (t > 0.84) pose = 'dizzy';
        } else {
            drawBlowApart(g, piece, hx, gy, colFn, blowT);
        }

        // the pigs: hiding inside (two eyes at the door), bursting out when they must
        const fleeT = holds ? 0 : smooth01(win(t, 0.64, 0.94));
        const cheer = holds && t > 0.8;
        if (fleeT <= 0 && !cheer) {
            if (holds || blowT < 0.2) {
                const eye = wind > 0.3 || inhale > 0 ? 'O' : 'o';
                gset(g, hx + doorEyes.dx, top + doorEyes.dy, eye, pink(0.95));
                gset(g, hx + doorEyes.dx + 1, top + doorEyes.dy, eye, pink(0.95));
            }
        } else if (cheer) {
            const gap = COLS < 60 ? 8 : PIG_W + 2;
            pigsHats.forEach((hat, i) => {
                const px = hx - (i + 1) * gap + 4;
                const pgy = groundRow(px + 5, 0) | 0;
                drawPig(g, px, pgy, hat, 'cheer', time * 1.6, pink, 1);
            });
        } else {
            pigsHats.forEach((hat, i) => {
                const px = lerp(hx + 2 + i * 6, COLS + 6 + i * 12, fleeT);
                const pgy = groundRow(px + 5, 0) | 0;
                drawPig(g, px, pgy, hat, 'scared', time * 1.6, pink, 1);
            });
        }

        drawWolf(g, wx, wgy, pose, time, clamp(wolfIn * 1.4, 0, 1));

        // dialogue last, so it always reads over the scenery
        if (t > 0.14 && t < 0.3) speech(g, '"little pigs, let me in!"', wx + 16, wgy - WOLF_H - 3, slate(0.85));
        if (t > 0.28 && t < 0.42) speech(g, '"not by our chinny chin chins!"', hx + 6, top - 2, pink(0.9));
        if (t > 0.4 && t < 0.52) speech(g, '"then I\'ll HUFF and I\'ll PUFF!"', wx + 16, wgy - WOLF_H - 3, slate(0.95));
        if (holds && t > 0.72 && t < 0.9) speech(g, 'the bricks: "...is that all?"', hx + piece.w / 2, top - 2, brick(0.9));
    };
}

const sceneHuff1 = makeHuffScene(HOUSE_STRAW, straw, ['sunny'], { dx: 6, dy: 6 });
const sceneHuff2 = makeHuffScene(HOUSE_STICKS, wood, ['twiggy', 'sunny'], { dx: 6, dy: 7 });
const sceneHuff3 = makeHuffScene(HOUSE_BRICK, brick, ['bricky', 'twiggy', 'sunny'], { dx: 7, dy: 7 }, { holds: true });

// ---- chimney: night falls, and the wolf tries one last trick ----
let chimLastT = 0;
function sceneChimney(g, t, time) {
    const day = 0.06;
    drawSky(g, time, day, 0.25);
    drawMeadow(g, time, 0, 0.25);
    const hx = COLS * HOUSE_X;
    const gy = groundRow(hx + HOUSE_BRICK.w / 2, 0) | 0;
    const top = gy - HOUSE_BRICK.h + 1;
    drawHouse(g, HOUSE_BRICK, hx, gy, brick, 0.9);
    const chimX = hx + 6, chimTopY = top;

    // the soup pot glows through the doorway
    const flick = 0.7 + 0.3 * Math.sin(time * 7 + Math.sin(time * 13));
    gtext(g, hx + 6, gy - 1, '\\~~/', ember(0.8 * flick));
    gtext(g, hx + 7, gy, '\\/', ember(0.6 * flick));
    if (frac(time * 0.8) < 0.5) gset(g, hx + 7 + ((time * 3) | 0) % 2, gy - 2, 'o', skyc(0.5));
    // smoke curling from the chimney before he arrives
    if (t < 0.55) {
        for (let i = 0; i < 4; i++) {
            const s = frac(time * 0.25 + i * 0.27);
            gset(g, chimX + 1 + Math.sin(s * 9 + i) * 1.5, chimTopY - 1 - s * 7, s < 0.4 ? 'o' : '·', cream(0.35 * (1 - s)));
        }
    }

    // pigs watching from beside the house
    const pigGap = COLS < 60 ? 8 : PIG_W + 2;
    ['bricky', 'twiggy', 'sunny'].forEach((hat, i) => {
        const px = hx - (i + 1) * pigGap + 4;
        const pgy = groundRow(px + 5, 0) | 0;
        const cheer = t > 0.78;
        drawPig(g, px, pgy, hat, cheer ? 'cheer' : 'idle', time, pink, 0.95);
    });

    // the wolf's route, owned entirely by your scroll
    const sneak = win(t, 0, 0.18);
    const climb = win(t, 0.18, 0.4);
    const creep = win(t, 0.4, 0.52);
    const drop  = win(t, 0.6, 0.7);
    const boom  = win(t, 0.7, 0.74);
    const fly   = win(t, 0.74, 1);

    if (t < 0.18) {
        const wx = lerp(-WOLF_W - 2, hx - WOLF_W - 1, smooth01(sneak));
        drawWolf(g, wx, groundRow(wx + 6, 0) | 0, 'sneak', time);
    } else if (t < 0.4) {
        const wy = lerp(gy, top + 2, smooth01(climb));
        drawWolf(g, hx - 8, wy, 'climb', time);
    } else if (t < 0.52) {
        const wx = lerp(hx - 8, chimX - 4, smooth01(creep));
        drawWolf(g, wx, top + 1, 'climb', time);
        speech(g, '"hee hee... the chimney!"', wx + 6, top - 4, slate(0.85));
    } else if (t < 0.6) {
        drawWolf(g, chimX - 4, top - 1 + Math.round(Math.sin(time * 3) * 0.5), 'climb', time);
    } else if (t < 0.7) {
        // down he goes, swallowed by the chimney
        const wy = lerp(top - 2, top + 5, drop);
        drawWolf(g, chimX - 4, wy, 'climb', time, 1, chimTopY + 1);
    } else if (t < 0.74) {
        // SPLASH!
        const b = 1 - boom;
        for (let k = 0; k < 30; k++) {
            const h = hash3(k, 2, 61);
            const th = h * 6.28;
            const rr = boom * (4 + h * 8);
            gset(g, hx + 8 + Math.cos(th) * rr / CELL_ASPECT, gy - 2 + Math.sin(th) * rr * 0.6, h > 0.5 ? '*' : '≈', k % 3 === 0 ? ember(0.5 + b * 0.5) : skyc(0.4 + b * 0.5));
        }
        speech(g, 'S P L A S H !', hx + 8, top - 3, cream(0.95));
    } else {
        // out of the pot like a rocket, gone over the hills
        const wx = lerp(chimX - 4, -WOLF_W - 4, fly);
        const wy = top - 2 - Math.sin(fly * Math.PI) * ROWS * 0.34 + fly * (gy - top);
        drawWolf(g, wx, wy, 'yelp', time);
        for (let k = 1; k < 5; k++) {
            const tr = fly - k * 0.05;
            if (tr < 0) continue;
            const tx = lerp(chimX - 4, -WOLF_W - 4, tr) + 8;
            const ty = top - 2 - Math.sin(tr * Math.PI) * ROWS * 0.34 + tr * (gy - top);
            gset(g, tx, ty, k < 2 ? '!' : '·', ember(0.6 - k * 0.12));
        }
        if (fly < 0.5) speech(g, '"YEOWWW!"', wx + 8, wy - WOLF_H - 1, slate(0.95));
        if (fly > 0.55) speech(g, 'and he never, ever came back', COLS / 2, ROWS * 0.28, cream(0.6 * win(fly, 0.55, 0.8)));
    }

    // sound cues fire as your thumb crosses the moment
    if (t > 0.7 && chimLastT <= 0.7) Sound.splash();
    if (t > 0.75 && chimLastT <= 0.75) Sound.yelp();
    chimLastT = t;
}

// ---- ever after: a dance under fireworks ----
function sceneEverAfter(g, t, time) {
    drawSky(g, time, 0.1, 0.3);
    drawMeadow(g, time, 0, 0.3);
    const hx = COLS * 0.62;
    const gy = groundRow(hx + HOUSE_BRICK.w / 2, 0) | 0;
    drawHouse(g, HOUSE_BRICK, hx, gy, brick, 0.85);

    // fireworks, cycling with time and fed by the scroll
    const nB = 3 + (t * 4 | 0);
    for (let i = 0; i < nB; i++) {
        const h = hash3(i, 7, 77);
        const k = frac(time * (0.32 + h * 0.2) + h * 3);
        const bx = COLS * (0.12 + hash3(i, 8, 77) * 0.76);
        const by = ROWS * (0.12 + hash3(i, 9, 77) * 0.26);
        if (k < 0.12) {
            gset(g, bx, by + (0.12 - k) * 40, '|', cream(0.5));
        } else if (k < 0.75) {
            const kk = (k - 0.12) / 0.63;
            const rr = smooth01(kk) * (5 + h * 6);
            const droop = kk * kk * 4;
            const colFn = i % 3 === 0 ? pink : i % 3 === 1 ? gold : skyc;
            const steps = (10 + rr * 4) | 0;
            for (let s = 0; s < steps; s++) {
                const th = s / steps * Math.PI * 2;
                if (hash3(s, i, 19) < 0.35) continue;
                gset(g, bx + Math.cos(th) * rr / CELL_ASPECT, by + Math.sin(th) * rr * 0.8 + droop, kk < 0.5 ? '*' : '·', colFn((1 - kk) * 0.9));
            }
        }
    }

    // the dance
    const hats = ['sunny', 'twiggy', 'bricky'];
    for (let i = 0; i < 3; i++) {
        const px = COLS * (0.06 + i * 0.17);
        const pgy = groundRow(px + 5, 0) | 0;
        const beat = ((time * 3 + i) | 0) % 2 === 0;
        const hop = Math.sin(time * 6 + i * 2) > 0.6 ? -1 : 0;
        drawPig(g, px, pgy + hop, hats[i], beat ? 'dance1' : 'dance2', time, pink, 1);
        if (hash3(i, (time * 1.5) | 0, 87) > 0.6) {
            gset(g, px + 4 + Math.sin(time * 2 + i) * 3, pgy - PIG_H - 2 - frac(time * 0.7 + i * 0.3) * 5, i % 2 ? '♥' : '♪', i % 2 ? rose(0.7) : gold(0.7));
        }
    }

    if (t > 0.45) {
        const a = win(t, 0.45, 0.7);
        speech(g, 'T H E   E N D', COLS / 2, ROWS * 0.4, cream(a * 0.95));
        speech(g, '~ almost ~', COLS / 2, ROWS * 0.4 + 2, pink(a * 0.6 * (0.6 + 0.4 * Math.sin(time * 2))));
    }
}

// ---- afterglow, behind the credits ----
function sceneAfterglow(g, t, time) {
    drawSky(g, time, 0.05, 0.3);
    for (let i = 0; i < 6; i++) {
        const h = hash3(i, 4, 97);
        const x = h * COLS + Math.sin(time * 0.5 + i) * 4;
        const y = ROWS * (0.3 + hash3(i, 5, 97) * 0.5);
        const tw = 0.5 + 0.5 * Math.sin(time * 2.2 + i * 2.7);
        if (tw > 0.55) gset(g, x, y, '·', gold(tw * 0.4));
    }
}

// ============================================================
// scroll engine
// ============================================================
const SCENES = [
    { id: 'once',      render: sceneOnce,      act: '✦',        cap: 'a bedtime story in characters · <em>scroll slowly</em>' },
    { id: 'setout',    render: sceneSetout,    act: 'ch 01·09', cap: 'once upon a time, three little piggies set out to build their own homes' },
    { id: 'straw',     render: sceneStraw,     act: 'ch 02·09', cap: 'Sunny builds in straw — <em>your scroll is stacking it</em>' },
    { id: 'huff1',     render: sceneHuff1,     act: 'ch 03·09', cap: '"I\'ll huff, and I\'ll puff, and I\'ll blow your house in!" — <em>your thumb is the big bad wind</em>' },
    { id: 'sticks',    render: sceneSticks,    act: 'ch 04·09', cap: 'Twiggy builds in sticks — they fall right into place' },
    { id: 'huff2',     render: sceneHuff2,     act: 'ch 05·09', cap: 'the wolf huffed... and puffed... and TWO piggies ran squealing' },
    { id: 'bricks',    render: sceneBricks,    act: 'ch 06·09', cap: 'Bricky builds in bricks — <em>brick by brick by brick</em>' },
    { id: 'huff3',     render: sceneHuff3,     act: 'ch 07·09', cap: 'huff and puff all you like — <em>the bricks don\'t care</em>' },
    { id: 'chimney',   render: sceneChimney,   act: 'ch 08·09', cap: 'down the chimney... <em>straight into the soup</em>' },
    { id: 'everafter', render: sceneEverAfter, act: 'ch 09·09', cap: 'happily ever after · <em>keep scrolling for the credits</em>' },
    { id: 'epilogue',  render: sceneAfterglow, act: 'fin',      cap: '' },
];

let acts = [];
let scrollMax = 1;
function measureActs() {
    acts = [];
    document.querySelectorAll('.act, .epilogue').forEach(el => {
        acts.push({ top: el.offsetTop, height: el.offsetHeight });
    });
    scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
}

function sceneAt(scrollY) {
    let k = 0;
    for (let i = 0; i < acts.length; i++) if (scrollY >= acts[i].top) k = i;
    const a = acts[k];
    const t = a ? clamp((scrollY - a.top) / Math.max(1, a.height), 0, 1) : 0;
    return { k: Math.min(k, SCENES.length - 1), t };
}

// ============================================================
// input: taps oink, horizontal drags bend the wind
// ============================================================
let pDown = false, pX = 0, pY = 0, pMoved = 0, pT = 0;

document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.epilogue, .hud-sound')) return;
    pDown = true; pX = e.clientX; pY = e.clientY; pMoved = 0; pT = performance.now();
});
document.addEventListener('pointermove', (e) => {
    if (!pDown) return;
    const dx = e.clientX - pX, dy = e.clientY - pY;
    pMoved += Math.abs(dx) + Math.abs(dy);
    pX = e.clientX; pY = e.clientY;
    windSkew = clamp(windSkew + dx * 0.01, -2.5, 2.5);
    dirty = true;
});
document.addEventListener('pointerup', (e) => {
    if (!pDown) return;
    pDown = false;
    if (pMoved < 10 && performance.now() - pT < 400 && !e.target.closest('.epilogue, .hud-sound')) {
        bursts.push({
            x: e.clientX / CELLW, y: e.clientY / CELLH,
            t0: performance.now() / 1000, seed: (Math.random() * 1e4) | 0
        });
        Sound.oink();
        dirty = true;
    }
});
document.addEventListener('pointercancel', () => { pDown = false; });

// ============================================================
// HUD + captions
// ============================================================
const titleEl = document.getElementById('title');
const capEl = document.getElementById('caption');
const actEl = document.getElementById('hud-act');
const barEl = document.getElementById('hud-progress');
let capScene = -1, capTimer = 0, lastRatio = '';

function updateHud(k, scrollY) {
    const ratio = clamp(scrollY / scrollMax, 0, 1).toFixed(3);
    if (ratio !== lastRatio) {
        lastRatio = ratio;
        barEl.style.transform = `scaleX(${ratio})`;
    }
    if (k !== capScene) {
        capScene = k;
        actEl.textContent = SCENES[k].act;
        capEl.classList.remove('on');
        clearTimeout(capTimer);
        capTimer = setTimeout(() => {
            const c = SCENES[k].cap;
            if (c) { capEl.innerHTML = c; capEl.classList.add('on'); }
        }, 350);
    }
}

// ============================================================
// main loop
// ============================================================
let dirty = true, lastFrame = 0;
let windLevel = 0;
const FROZEN_TIME = 42;

function loop(nowMs) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    if (nowMs - lastFrame < 1000 / 30) return;
    const scrollY = window.scrollY;
    const { k, t } = sceneAt(scrollY);
    if (REDUCED && !dirty && k === capScene) return;   // scrub-only when motion is reduced
    lastFrame = nowMs;
    frame(nowMs, scrollY, k, t);
}

function frame(nowMs, scrollY, k, t) {
    dirty = false;
    const time = REDUCED ? FROZEN_TIME + t * 4 : nowMs / 1000;

    windLevel = 0;
    windSkew *= 0.94;
    gclear(gridA);
    SCENES[k].render(gridA, t, time);
    // glyph-dissolve into the next act
    if (t > 0.86 && k < SCENES.length - 1) {
        const blend = (t - 0.86) / 0.14;
        gclear(gridB);
        SCENES[k + 1].render(gridB, 0, time);
        for (let i = 0; i < gridA.ch.length; i++) {
            if (dissolveMap[i] < blend) {
                gridA.ch[i] = gridB.ch[i]; gridA.co[i] = gridB.co[i];
            }
        }
    }
    renderBursts(gridA, nowMs / 1000);
    stageRender(gridA);
    updateHud(k, scrollY);
    Sound.setWind(windLevel);
    // the title rides the first act, then hands the sky back
    if (titleEl) {
        const vis = k === 0 ? clamp(1 - (t - 0.55) / 0.3, 0, 1) : 0;
        titleEl.style.opacity = vis.toFixed(3);
        titleEl.style.transform = `translateX(-50%) translateY(${(-t * 70).toFixed(1)}px)`;
        titleEl.style.visibility = vis > 0.01 ? 'visible' : 'hidden';
    }
    if (bursts.length) dirty = true;
}

// ============================================================
// the credits' toys
// ============================================================
class Mini {
    constructor(canvas, cols, rows) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cols = cols; this.rows = rows;
        this.ch = new Array(cols * rows).fill(' ');
        this.co = new Array(cols * rows).fill('');
        this.visible = false;
        this._resize();
        if ('ResizeObserver' in window)
            new ResizeObserver(() => { this._resize(); this.render(); }).observe(canvas.parentElement);
        new IntersectionObserver(es => es.forEach(e => { this.visible = e.isIntersecting; }),
            { rootMargin: '60px' }).observe(canvas);
    }
    _resize() {
        const w = this.canvas.clientWidth || this.canvas.parentElement.clientWidth;
        if (!w) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        this.cw = w / this.cols;
        this.chh = this.cw / CELL_ASPECT;
        const h = this.chh * this.rows;
        this.canvas.style.height = h + 'px';
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.font = `${this.chh * 0.92}px "IBM Plex Mono", monospace`;
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
    }
    clear() { this.ch.fill(' '); this.co.fill(''); }
    set(x, y, c, col) {
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
        this.ch[y * this.cols + x] = c;
        this.co[y * this.cols + x] = col;
    }
    render() {
        const { ctx: c } = this;
        if (!this.cw) return;
        c.clearRect(0, 0, this.canvas.width, this.canvas.height);
        c.font = this.font;
        let last = null;
        for (let y = 0; y < this.rows; y++) {
            const py = (y + 0.5) * this.chh;
            for (let x = 0; x < this.cols; x++) {
                const i = y * this.cols + x;
                if (this.ch[i] === ' ') continue;
                const col = this.co[i] || '#ff9ecd';
                if (col !== last) { c.fillStyle = col; last = col; }
                c.fillText(this.ch[i], (x + 0.5) * this.cw, py);
            }
        }
    }
}

const minis = [];

// huff it yourself: hold to blow, release to rebuild
(() => {
    const el = document.getElementById('d-huff');
    if (!el) return;
    const narrow = window.innerWidth < 520;
    const s = new Mini(el, narrow ? 46 : 64, narrow ? 15 : 16);
    let level = 0, holding = false, lastT = 0;
    const btn = document.getElementById('huff-btn');
    const down = (e) => { e.preventDefault(); holding = true; btn.classList.add('holding'); };
    const up = () => { holding = false; btn.classList.remove('holding'); };
    btn.addEventListener('pointerdown', down);
    addEventListener('pointerup', up);
    addEventListener('pointercancel', up);
    btn.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); holding = true; btn.classList.add('holding'); } });
    btn.addEventListener('keyup', up);

    const hx = (s.cols * 0.52) | 0;
    const gy = s.rows - 3;

    minis.push({ s, fps: 24, last: 0, frame(time) {
        const dt = clamp(time - lastT, 0.01, 0.1); lastT = time;
        level = clamp(level + (holding ? 0.85 : -0.6) * dt, 0, 1);
        s.clear();
        // ground
        for (let x = 0; x < s.cols; x++) {
            s.set(x, gy + 1, '_', grass(0.25));
            if (hash3(x, 1, 23) > 0.75) s.set(x, gy, '"', grass(0.3));
        }
        // wind streaks
        if (level > 0.04) {
            const n = (s.cols * level) | 0;
            for (let i = 0; i < n; i++) {
                const h = hash3(i, 0, 73), h2 = hash3(i, 1, 73);
                const x = (h2 * s.cols * 2 + time * (12 + h * 26)) % (s.cols + 8) - 4;
                const y = s.rows * (0.15 + h * 0.65) + Math.sin(time * 3 + h * 9);
                s.set(x, y, h > 0.6 ? '≈' : '~', skyc(level * (0.3 + h2 * 0.4)));
            }
        }
        // the wolf, putting his lungs into it
        const pose = level > 0.5 ? 'blow' : level > 0.03 ? 'inhale' : 'idle';
        const lines = wolfLines(pose, ((time * 7) | 0) % 2 === 1);
        lines.forEach((ln, i) => {
            const yy = gy + 1 - lines.length + 1 + i;
            for (let dx = 0; dx < ln.length; dx++)
                if (ln[dx] !== ' ') s.set(1 + dx, yy, ln[dx], slate(0.9));
        });
        // the straw house, coming and going with your grip
        const top = gy - HOUSE_STRAW.h + 1;
        for (const p of HOUSE_STRAW) {
            const h = hash3(p.dx, p.dy, 13);
            const w = clamp(level * 1.6 - h * 0.45 - (p.dx / HOUSE_STRAW.w) * 0.2, 0, 1);
            const tx = hx + p.dx, ty = top + p.dy;
            if (w <= 0) { s.set(tx, ty, p.ch, straw(0.75 + h * 0.25)); continue; }
            const disp = (1 - Math.exp(-3 * w)) / 3;
            const px = tx + disp * (20 + h * 30);
            const py = ty - disp * (5 + h * 12) + w * w * 9;
            const alpha = (1 - w * 0.85) * (0.75 + h * 0.25);
            if (alpha < 0.06) continue;
            s.set(px, py, w < 0.06 ? p.ch : TUMBLE[((h * 6 + w * 10) | 0) % TUMBLE.length], straw(alpha));
        }
    } });
})();

// write in bricks
(() => {
    const el = document.getElementById('d-bricks');
    if (!el) return;
    const narrow = window.innerWidth < 520;
    const s = new Mini(el, narrow ? 46 : 64, narrow ? 14 : 16);
    const W = s.cols, H = s.rows;
    let mask = new Uint8Array(W * H);
    const off = document.createElement('canvas');
    const octx = off.getContext('2d', { willReadFrequently: true });

    function buildMask(text) {
        text = (text || '').trim() || '···';
        off.width = W; off.height = H;
        octx.clearRect(0, 0, W, H);
        octx.save();
        octx.translate(W / 2, H / 2 + 1);
        octx.scale(1, CELL_ASPECT);
        try { octx.letterSpacing = '3px'; } catch (e) { /* older browsers */ }
        let fs = (H - 4) / CELL_ASPECT * 0.62;
        octx.font = `600 ${fs}px "IBM Plex Mono", monospace`;
        const w = octx.measureText(text).width;
        if (w > W - 6) { fs *= (W - 6) / w; octx.font = `600 ${fs}px "IBM Plex Mono", monospace`; }
        octx.textAlign = 'center'; octx.textBaseline = 'middle';
        octx.fillStyle = '#fff';
        octx.fillText(text, 0, 0);
        octx.restore();
        const img = octx.getImageData(0, 0, W, H).data;
        const m = new Uint8Array(W * H);
        for (let i = 0; i < m.length; i++) m[i] = img[i * 4 + 3] > 70 ? 1 : 0;
        mask = m;
    }
    const input = document.getElementById('bricks-input');
    buildMask(input ? input.value : 'BRICKY');
    let deb = 0;
    input?.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => buildMask(input.value), 120); });

    minis.push({ s, fps: 16, last: 0, frame(time) {
        s.clear();
        const gustX = (time * 15) % (W + 30) - 15;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                if (!mask[y * W + x]) continue;
                const seam = (y % 3 === 0) || ((x + ((y / 3 | 0) % 2) * 3) % 6 === 0);
                const h = hash3(x, y, 29);
                let px = x;
                const nearGust = Math.abs(x - gustX) < 2;
                if (nearGust) px = x + (hash3(x, y, (time * 12) | 0) > 0.5 ? 1 : 0);
                s.set(px, y, seam ? '=' : '#', seam ? brick(0.35 + h * 0.15) : brick(0.6 + h * 0.35));
            }
        }
        // the gust itself, sliding by, achieving nothing
        for (let y = 1; y < H - 1; y += 2) {
            const yy = y + Math.sin(time * 3 + y) * 0.8;
            s.set(gustX - 3 + hash3(y, 3, 33) * 2, yy, '~', skyc(0.25 + hash3(y, 4, 33) * 0.2));
        }
    } });
})();

function miniLoop(nowMs) {
    requestAnimationFrame(miniLoop);
    if (document.hidden) return;
    for (const m of minis) {
        if (!m.s.visible) continue;
        if (nowMs - m.last < 1000 / m.fps) continue;
        m.frame(nowMs / 1000);
        m.s.render();
        m.last = nowMs;
        if (REDUCED) m.s.visible = false;   // one still frame each
    }
}

// ============================================================
// go
// ============================================================
stageResize(true);

// headless single-frame hook for automated verification: /?debug
if (new URLSearchParams(location.search).has('debug')) {
    window.__step = (scrollY, timeS) => {
        window.scrollTo(0, scrollY);
        const { k, t } = sceneAt(scrollY);
        frame((timeS ?? 42) * 1000, scrollY, k, t);
        return { scene: SCENES[k].id, k, t: +t.toFixed(3) };
    };
    window.__minis = minis;
}

addEventListener('resize', () => {
    clearTimeout(stageResize._t);
    stageResize._t = setTimeout(() => stageResize(false), 250);
});
addEventListener('scroll', () => { dirty = true; }, { passive: true });
setTimeout(measureActs, 800);
addEventListener('load', measureActs);

requestAnimationFrame(loop);
requestAnimationFrame(miniLoop);

console.log(
    '%c\n   ♥ the three little piggies · a scroll-along storybook ♥\n' +
    '   every huff was your thumb. the bricks never cared.\n',
    'color:#ff9ecd;font-family:monospace;font-size:12px;line-height:1.6');

})();
