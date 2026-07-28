// ============================================================
// Terminal Animation — an ASCII odyssey
// One canvas. One scroll. Nine acts, computed live.
// ============================================================
(() => {
'use strict';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const CELL_ASPECT = 0.6;
const RAMP = ' ·:;=+*#%@';
const GLYPHS = '!<>-_\\/[]{}~=+*^?#$%&@';

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function smooth01(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

function hash3(x, y, z) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 15), 2654435761);
    h = Math.imul(h ^ (h >>> 13), 2246822519);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const sx = x - xi, sy = y - yi, sz = z - zi;
    const fx = sx * sx * (3 - 2 * sx), fy = sy * sy * (3 - 2 * sy), fz = sz * sz * (3 - 2 * sz);
    let v = 0;
    for (let c = 0; c < 8; c++) {
        const cx = c & 1, cy = (c >> 1) & 1, cz = (c >> 2) & 1;
        const w = (cx ? fx : 1 - fx) * (cy ? fy : 1 - fy) * (cz ? fz : 1 - fz);
        v += w * hash3(xi + cx, yi + cy, zi + cz);
    }
    return v;
}
function fbm3(x, y, z, oct) {
    let v = 0, amp = 0.5, f = 1;
    for (let o = 0; o < oct; o++) { v += amp * noise3(x * f, y * f, z * f); amp *= 0.5; f *= 2.03; }
    return v;
}
function makeLUT(stops) {
    const lut = [];
    for (let i = 0; i < 64; i++) {
        const t = i / 63;
        let a = stops[0], b = stops[stops.length - 1];
        for (let s = 0; s < stops.length - 1; s++)
            if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
        const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
        lut.push(`rgb(${lerp(a[1], b[1], f) | 0},${lerp(a[2], b[2], f) | 0},${lerp(a[3], b[3], f) | 0})`);
    }
    return lut;
}
const HEAT = makeLUT([
    [0.00, 40, 16, 12], [0.25, 140, 44, 16], [0.50, 235, 110, 40],
    [0.75, 250, 180, 90], [1.00, 255, 246, 224]
]);
const NEBULA_LUT = makeLUT([
    [0.00, 24, 40, 60], [0.35, 70, 130, 160], [0.60, 130, 90, 170],
    [0.82, 220, 120, 160], [1.00, 255, 220, 210]
]);

// ============================================================
// the stage: one full-screen char grid
// ============================================================
const stageCanvas = document.getElementById('stage');
const ctx = stageCanvas.getContext('2d');

let COLS = 0, ROWS = 0, CELLW = 0, CELLH = 0, FONT = '';
let gridA = null, gridB = null;
const resizeHooks = [];

function makeGrid() { return { ch: new Array(COLS * ROWS).fill(' '), co: new Array(COLS * ROWS).fill('') }; }
function gclear(g) { g.ch.fill(' '); g.co.fill(''); }
function gset(g, x, y, ch, col) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    const i = y * COLS + x;
    g.ch[i] = ch; g.co[i] = col;
}
function gtext(g, x, y, str, col) {
    for (let i = 0; i < str.length; i++) gset(g, x + i, y, str[i], col);
}

let lastW = 0, lastH = 0;
function stageResize(force) {
    const w = window.innerWidth, h = window.innerHeight;
    // ignore the mobile URL-bar breathing; rebuild only on real changes
    if (!force && w === lastW && Math.abs(h - lastH) < 140) return;
    lastW = w; lastH = h;
    COLS = w < 520 ? 44 : w < 900 ? 72 : 108;
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
    for (const fn of resizeHooks) fn();
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
            const col = g.co[i] || '#f5a542';
            if (col !== last) { ctx.fillStyle = col; last = col; }
            ctx.fillText(c, (x + 0.5) * CELLW, py);
        }
    }
}

// shared background stars, used by several scenes
function drawStars(g, time, density, bright) {
    const n = (COLS * ROWS * density) | 0;
    for (let i = 0; i < n; i++) {
        const x = (hash3(i, 0, 51) * COLS) | 0;
        const y = (hash3(i, 1, 51) * ROWS) | 0;
        const tw = 0.5 + 0.5 * Math.sin(time * (0.6 + hash3(i, 2, 51) * 2.4) + i * 1.7);
        const b = tw * bright;
        if (b < 0.12) continue;
        gset(g, x, y, b > 0.75 ? '✦' : '·',
            `rgba(${b > 0.6 ? '248,243,233' : '143,216,232'},${(0.15 + b * 0.55).toFixed(2)})`);
    }
}

// ============================================================
// SCENES
// ============================================================

// ---- arrival: open space; the DOM title floats above this ----
const arrival = (g, t, time) => {
    drawStars(g, time, 0.022, clamp(0.3 + t * 2.2, 0, 0.9));
    // a slow drift of dust, so the dark is never still
    for (let i = 0; i < 26; i++) {
        const x = (hash3(i, 0, 61) * COLS + time * (0.3 + hash3(i, 2, 61))) % COLS;
        const y = (hash3(i, 1, 61) * ROWS) | 0;
        const tw = 0.5 + 0.5 * Math.sin(time * (0.7 + hash3(i, 3, 61)) + i * 2.2);
        if (tw > 0.55) gset(g, x, y, '·', `rgba(168,159,143,${(tw * 0.3).toFixed(2)})`);
    }
};

// ---- velocity: starfield to warp ----
const velocity = (() => {
    const N = 420;
    const stars = [];
    for (let i = 0; i < N; i++)
        stars.push({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() * 0.95 + 0.05 });
    let drawN = N;
    resizeHooks.push(() => { drawN = clamp((COLS * ROWS / 8) | 0, 160, N); });
    const TAIL = ['#', '+', ':', '·', '·', '·'];
    let lastTime = 0;

    return (g, t, time) => {
        const dt = clamp(time - lastTime, 0.01, 0.08); lastTime = time;
        const cx = COLS / 2, cy = ROWS / 2;
        const speed = 0.06 + Math.pow(smooth01(t), 1.5) * 2.8;
        const focal = Math.min(COLS * CELL_ASPECT, ROWS) * 0.62;
        for (let si = 0; si < drawN; si++) {
            const st = stars[si];
            st.z -= speed * dt;
            if (st.z <= 0.03) { st.x = (Math.random() - 0.5) * 2; st.y = (Math.random() - 0.5) * 2; st.z = 1; }
            const trail = 1 + (speed * 2.2) | 0;
            for (let k = trail - 1; k >= 0; k--) {
                const zk = st.z + speed * dt * k * 2.2;
                if (zk <= 0.02 || zk > 1) continue;
                const sx = cx + st.x / zk * focal / CELL_ASPECT * 0.6;
                const sy = cy + st.y / zk * focal * 0.6;
                const near = 1 - zk;
                const chr = k === 0
                    ? (near > 0.75 ? '#' : near > 0.5 ? '+' : near > 0.25 ? ':' : '·')
                    : TAIL[Math.min(TAIL.length - 1, k)];
                const a = clamp(near * 1.2 - k * 0.15, 0.08, 1);
                if (a < 0.14) continue;
                gset(g, sx, sy, chr, near > 0.7
                    ? `rgba(248,243,233,${a.toFixed(2)})`
                    : `rgba(143,216,232,${(a * 0.9).toFixed(2)})`);
            }
        }
    };
})();

// ---- the wheel: a spiral galaxy in braille ----
const galaxy = (() => {
    const N = 6000;
    const stars = [];
    for (let i = 0; i < N; i++) {
        const core = Math.random() < 0.22;
        const r = core ? Math.pow(Math.random(), 2) * 0.16 + 0.01
                       : Math.pow(Math.random(), 0.7) * 0.95 + 0.05;
        stars.push({
            r, th0: Math.random() * Math.PI * 2,
            arm: core ? -1 : (Math.random() < 0.5 ? 0 : 1),
            jit: (Math.random() - 0.5) * (core ? 6 : 0.55),
            b: core ? 0.5 + Math.random() * 0.5 : 0.25 + Math.random() * 0.75
        });
    }
    const DOTS = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];
    let pix = null, col = null, pw = 0, ph = 0;
    resizeHooks.push(() => {
        pw = COLS * 2; ph = ROWS * 4;
        pix = new Float32Array(pw * ph);
        col = new Array(pw * ph).fill('');
    });

    return (g, t, time) => {
        if (!pix) return;
        pix.fill(0);
        const cx = pw / 2, cy = ph / 2;
        const zoom = lerp(0.6, 1.55, smooth01(t));
        const tilt = lerp(0.75, 0.4, t);
        const scale = Math.min(pw * 0.46, ph * 0.8) * zoom;
        for (const st of stars) {
            let th;
            if (st.arm < 0) th = st.th0 + time * 0.9;
            else {
                const wind = Math.log(st.r * 8 + 1) * 2.6;
                th = st.th0 * 0.12 + st.arm * Math.PI + wind + st.jit
                   + time * 0.55 * Math.pow(st.r, -0.85) * 0.28;
            }
            const px = cx + Math.cos(th) * st.r * scale;
            const py = cy + Math.sin(th) * st.r * scale * tilt;
            if (px < 0 || py < 0 || px >= pw || py >= ph) continue;
            const i = (py | 0) * pw + (px | 0);
            if (st.b > pix[i]) {
                pix[i] = st.b;
                col[i] = st.r < 0.2 ? 'rgba(255,232,200,0.95)'
                       : st.r < 0.55 ? 'rgba(207,224,255,0.85)' : 'rgba(143,184,255,0.7)';
            }
        }
        pix[(cy | 0) * pw + (cx | 0)] = 1.4; col[(cy | 0) * pw + (cx | 0)] = '#fff6e0';
        // pack braille
        for (let ry = 0; ry < ROWS; ry++) {
            for (let rx = 0; rx < COLS; rx++) {
                let bits = 0, best = 0, bc = '';
                for (let dy = 0; dy < 4; dy++)
                    for (let dx = 0; dx < 2; dx++) {
                        const i = (ry * 4 + dy) * pw + rx * 2 + dx;
                        const v = pix[i];
                        if (v > 0.2) { bits |= DOTS[dy][dx]; if (v > best) { best = v; bc = col[i]; } }
                    }
                if (bits) gset(g, rx, ry, String.fromCharCode(0x2800 | bits), bc);
            }
        }
    };
})();

// ---- the nursery: a nebula, flown through ----
const nebula = (() => {
    const GAS = ' ··:;*oO&%@';
    return (g, t, time) => {
        const sc = 0.16;
        const fly = t * 9;
        const den = lerp(0.85, 1.25, t);
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const px = x * sc * CELL_ASPECT, py = (y + fly) * sc * 0.6;
                const q = fbm3(px, py, time * 0.10, 3);
                const d = fbm3(px + 1.9 * q, py + 9.2, time * 0.06 + 4.4, 4);
                const v = clamp((d - 0.22) * 2.0 * den, 0, 1);
                if (v < 0.1) {
                    const st = hash3(x, y, 5);
                    if (st > 0.955) {
                        const tw = 0.5 + 0.5 * Math.sin(time * (1.5 + st * 3) + st * 30);
                        gset(g, x, y, '·', `rgba(248,243,233,${(0.2 + tw * 0.5).toFixed(2)})`);
                    }
                    continue;
                }
                const chI = clamp((Math.pow(v, 1.5) * GAS.length) | 0, 1, GAS.length - 1);
                gset(g, x, y, GAS[chI], NEBULA_LUT[(v * 63) | 0]);
            }
        }
    };
})();

// ---- worldfall: a planet resolves out of the dark ----
const worldfall = (() => {
    const SEED = 7.3;
    return (g, t, time) => {
        drawStars(g, time, 0.015, 0.7);
        const cx = COLS / 2, cy = ROWS * 0.46;
        const R = lerp(0.16, 0.68, smooth01(t)) * Math.min(COLS * CELL_ASPECT, ROWS) * 0.72;
        const spin = time * 0.22;
        const cs = Math.cos(spin), sn = Math.sin(spin);
        const sunA = lerp(-1.6, 0.9, t);   // scroll drags the dawn across the world
        const sx0 = Math.sin(sunA) * 0.95, sz0 = 0.3 + 0.6 * (0.5 + 0.5 * Math.cos(sunA));
        const sl = Math.hypot(sx0, 0.28, sz0);
        const sun = [sx0 / sl, 0.28 / sl, sz0 / sl];
        const x0 = Math.max(0, cx - R / CELL_ASPECT - 2) | 0, x1 = Math.min(COLS, cx + R / CELL_ASPECT + 2) | 0;
        const yA = Math.max(0, cy - R - 2) | 0, yB = Math.min(ROWS, cy + R + 2) | 0;
        for (let y = yA; y < yB; y++) {
            for (let x = x0; x < x1; x++) {
                const dx = (x - cx) * CELL_ASPECT, dy = y - cy;
                const d2 = dx * dx + dy * dy;
                if (d2 > R * R) {
                    if (d2 < R * R * 1.18 && hash3(x, y, 3) > 0.6)
                        gset(g, x, y, '·', 'rgba(143,216,232,0.3)');
                    continue;
                }
                const nz = Math.sqrt(R * R - d2) / R;
                const nx = dx / R, ny = -dy / R;
                const rx = nx * cs + nz * sn, rz = -nx * sn + nz * cs;
                const land = fbm3(rx * 2.3 + SEED, ny * 2.3, rz * 2.3, 4);
                const lat = Math.abs(ny);
                const lit = clamp(nx * sun[0] + ny * sun[1] + nz * sun[2], 0, 1);
                const glow = clamp(Math.pow(lit, 0.7) + 0.08, 0, 1);
                let ch, col;
                if (lat > 0.82 - land * 0.12) {
                    ch = glow > 0.6 ? '@' : glow > 0.3 ? '#' : ':';
                    col = `rgba(230,240,248,${(0.3 + glow * 0.65).toFixed(2)})`;
                } else if (land > 0.54) {
                    const hgt = (land - 0.54) / 0.2;
                    ch = RAMP[clamp(((0.25 + glow * 0.75) * RAMP.length) | 0, 1, RAMP.length - 1)];
                    col = hgt > 0.75 ? `rgba(200,170,120,${(0.28 + glow * 0.7).toFixed(2)})`
                                     : `rgba(150,170,90,${(0.26 + glow * 0.7).toFixed(2)})`;
                } else {
                    ch = glow > 0.75 ? '≈' : glow > 0.45 ? '~' : glow > 0.18 ? ':' : '·';
                    col = `rgba(80,150,190,${(0.2 + glow * 0.68).toFixed(2)})`;
                }
                gset(g, x, y, ch, col);
            }
        }
    };
})();

// ---- the forge: descent into fire ----
const forge = (() => {
    let heat = null, W = 0, H = 0;
    resizeHooks.push(() => { W = COLS; H = ROWS + 2; heat = new Float32Array(W * H); });

    return (g, t, time) => {
        if (!heat) return;
        drawStars(g, time, 0.012, clamp(1 - t * 2, 0, 0.6));
        const rise = smooth01(clamp(t * 1.7, 0, 1));
        const amp = lerp(8, 36, rise);
        const coolBase = lerp(5, Math.max(0.9, 70 / ROWS), rise);
        for (let x = 0; x < W; x++) {
            const surge = 0.75 + 0.25 * Math.sin(x * 0.3 + time * 1.7) * Math.sin(time * 0.9 + x);
            heat[(H - 1) * W + x] = amp * surge;
            heat[(H - 2) * W + x] = amp * surge;
        }
        for (let y = 0; y < H - 2; y++) {
            for (let x = 0; x < W; x++) {
                const src = (y + 1) * W + ((x + ((Math.random() * 3) | 0) - 1 + W) % W);
                heat[y * W + x] = Math.max(0, heat[src] - Math.random() * coolBase);
            }
        }
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < W; x++) {
                const v = clamp(heat[y * W + x] / 36, 0, 1);
                if (v < 0.04) continue;
                gset(g, x, y, RAMP[clamp((v * RAMP.length) | 0, 1, RAMP.length - 1)], HEAT[(v * 63) | 0]);
            }
        }
    };
})();

// ---- dissolution: the supernova, scrubbed by scroll ----
const supernova = (() => {
    const N = 650;
    return (g, t, time) => {
        drawStars(g, time, 0.02, 0.7);
        const cx = COLS / 2, cy = ROWS * 0.45;
        const S = Math.min(COLS * CELL_ASPECT, ROWS) * 0.62;
        if (t < 0.2) {
            // collapse: the star tightens and whitens
            const f = t / 0.2;
            const r = lerp(S * 0.42, S * 0.12, smooth01(f));
            const boost = 1 + f * 1.4;
            for (let y = 0; y < ROWS; y++)
                for (let x = 0; x < COLS; x++) {
                    const d = Math.hypot((x - cx) * CELL_ASPECT, y - cy);
                    if (d > r + 3) continue;
                    let b = clamp((1 - d / (r + 1.5)) * boost, 0, 1);
                    if (d > r * 0.55) b *= 0.6 + 0.4 * noise3(x * 0.5, y * 0.5, time * 3);
                    if (b < 0.07) continue;
                    gset(g, x, y, RAMP[clamp((b * RAMP.length) | 0, 1, RAMP.length - 1)], HEAT[(b * 63) | 0]);
                }
        } else if (t < 0.28) {
            // the flash
            const f = (t - 0.2) / 0.08;
            for (let y = 0; y < ROWS; y++)
                for (let x = 0; x < COLS; x++) {
                    const d = Math.hypot((x - cx) * CELL_ASPECT, y - cy);
                    const b = clamp(1.5 - f * 0.8 - d / S * 0.9, 0, 1);
                    if (b < 0.1) continue;
                    gset(g, x, y, RAMP[clamp((b * RAMP.length) | 0, 1, RAMP.length - 1)], HEAT[(b * 63) | 0]);
                }
        } else {
            // ballistic debris: pure closed form, so the scroll owns time
            const tau = (t - 0.28) / 0.72;
            const disp = (1 - Math.exp(-2.8 * tau)) / 2.8;
            for (let i = 0; i < N; i++) {
                const a = hash3(i, 1, 13) * Math.PI * 2;
                const sp = (0.25 + Math.pow(hash3(i, 2, 13), 1.4)) * 3.4;
                const wob = 1 + (hash3(i, 3, 13) - 0.5) * 0.3;
                const d = disp * sp * S * wob;
                const px = cx + Math.cos(a) * d / CELL_ASPECT;
                const py = cy + Math.sin(a) * d;
                const heatV = Math.pow(1 - tau, 1.15) * (0.45 + hash3(i, 4, 13) * 0.55);
                if (heatV < 0.05) continue;
                gset(g, px, py, RAMP[clamp((heatV * RAMP.length) | 0, 1, RAMP.length - 1)], HEAT[(heatV * 63) | 0]);
            }
            // the shockwave ring
            const sr = tau * S * 1.5;
            const alpha = clamp(1 - tau * 1.1, 0, 1) * 0.8;
            if (alpha > 0.05) {
                const steps = Math.max(30, sr * 7) | 0;
                for (let i = 0; i < steps; i++) {
                    const a = i / steps * Math.PI * 2;
                    if (hash3(i, 9, 13) < 0.4) continue;
                    gset(g, cx + Math.cos(a) * sr / CELL_ASPECT, cy + Math.sin(a) * sr,
                        alpha > 0.5 ? ':' : '·', `rgba(143,216,232,${alpha.toFixed(2)})`);
                }
            }
            // the remnant pulsar
            if (tau > 0.35) {
                const beat = (time * 2.4) % 1;
                if (beat < 0.22) {
                    gset(g, cx, cy, '✦', '#f8f3e9');
                    gset(g, cx - 2, cy, '–', 'rgba(143,216,232,0.5)');
                    gset(g, cx + 2, cy, '–', 'rgba(143,216,232,0.5)');
                } else gset(g, cx, cy, '·', 'rgba(248,243,233,0.5)');
            }
        }
    };
})();

// ---- gravity: the black hole, ray-traced, orbitable ----
let gravity_drag = null;   // assigned inside the gravity closure below
const gravity = (() => {
    const R_IN = 2.55, R_OUT = 7.6, DIST = 13.6;
    let cells = null, SU = 0, SV = 0;
    let az = 0, elOff = 0, needTrace = 0, lastTraceMs = 0, lastEl = -1;
    let cam, fwd, rightV, upV, camXZ;

    function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function norm3(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

    function buildCamera(el) {
        cam = [DIST * Math.cos(el) * Math.sin(az), DIST * Math.sin(el), -DIST * Math.cos(el) * Math.cos(az)];
        fwd = norm3([-cam[0], -cam[1], -cam[2]]);
        rightV = norm3(cross3(fwd, [0, 1, 0]));
        upV = cross3(rightV, fwd);
        const l = Math.hypot(cam[0], cam[2]) || 1;
        camXZ = [cam[0] / l, cam[2] / l];
    }

    function trace(u, v, maxSteps, dts) {
        let px = cam[0], py = cam[1], pz = cam[2];
        const d = norm3([
            fwd[0] + rightV[0] * u + upV[0] * v,
            fwd[1] + rightV[1] * u + upV[1] * v,
            fwd[2] + rightV[2] * u + upV[2] * v]);
        let vx = d[0], vy = d[1], vz = d[2];
        const hx = py * vz - pz * vy, hy = pz * vx - px * vz, hz = px * vy - py * vx;
        const h2 = hx * hx + hy * hy + hz * hz;
        const hits = [];
        let minR2 = 1e9;
        for (let s = 0; s < maxSteps; s++) {
            const r2 = px * px + py * py + pz * pz;
            if (r2 < minR2) minR2 = r2;
            if (r2 < 1) return { k: 0, minR2 };
            if (r2 > 280) return { k: hits.length ? 2 : 1, hits, dir: [vx, vy, vz], minR2 };
            const dt = clamp(Math.sqrt(r2) * 0.055, 0.035, 0.32) * dts;
            const a = -1.5 * h2 / Math.pow(r2, 2.5);
            vx += px * a * dt; vy += py * a * dt; vz += pz * a * dt;
            const ny = py + vy * dt;
            if ((py > 0) !== (ny > 0) && hits.length < 2) {
                const f = py / (py - ny);
                const ix = px + vx * dt * f, iz = pz + vz * dt * f;
                const r = Math.hypot(ix, iz);
                if (r >= R_IN && r <= R_OUT)
                    hits.push({ r, phi: Math.atan2(iz, ix), bd: (-iz / r) * camXZ[0] + (ix / r) * camXZ[1] });
            }
            px += vx * dt; py = ny; pz += vz * dt;
        }
        return { k: hits.length ? 2 : 0, hits, minR2 };
    }

    function retrace(el, quality) {
        buildCamera(el);
        const steps = quality ? 150 : 90, dts = quality ? 1 : 1.5;
        for (let y = 0; y < ROWS; y++)
            for (let x = 0; x < COLS; x++) {
                const u = (x - COLS / 2) / (COLS / 2) * SU;
                const v = -(y - ROWS / 2) / (ROWS / 2) * SV;
                cells[y * COLS + x] = trace(u, v, steps, dts);
            }
        lastEl = el;
    }

    resizeHooks.push(() => {
        SU = 0.62;
        SV = SU * (ROWS / (COLS * CELL_ASPECT));
        cells = new Array(COLS * ROWS);
        needTrace = 2; lastEl = -1;
    });

    // horizontal drags orbit; wired from the global pointer handlers below
    gravity_drag = (dx, dy, isTouch) => {
        az += dx * 0.006;
        if (!isTouch) elOff = clamp(elOff - dy * 0.003, -0.2, 0.3);
        needTrace = 1;
    };

    return (g, t, time) => {
        if (!cells) return;
        const elScroll = lerp(0.6, 0.115, smooth01(clamp(t * 1.2, 0, 1)));
        const el = clamp(elScroll + elOff, 0.05, 0.7);
        const bIn = smooth01(clamp(t * 2.4, 0, 1));  // the disk ignites as you arrive
        const nowMs = performance.now();
        if ((Math.abs(el - lastEl) > 0.012 || needTrace) && nowMs - lastTraceMs > 70) {
            retrace(el, needTrace === 2);
            needTrace = 0; lastTraceMs = nowMs;
        }
        for (let y = 0; y < ROWS; y++)
            for (let x = 0; x < COLS; x++) {
                const c = cells[y * COLS + x];
                if (!c || c.k === 0) continue;
                if (c.k === 1) {
                    const d = c.dir;
                    const st = hash3((d[0] * 47) | 0, (d[1] * 47) | 0, (d[2] * 47) | 0);
                    if (st > 0.982) {
                        const tw = 0.5 + 0.5 * Math.sin(time * (1 + st * 4) + st * 40);
                        if (tw > 0.35) gset(g, x, y, '·', `rgba(143,216,232,${(0.25 + tw * 0.4).toFixed(2)})`);
                    }
                    continue;
                }
                let b = 0;
                for (let k = 0; k < c.hits.length; k++) {
                    const h = c.hits[k];
                    const w = k === 0 ? 1 : 0.45;
                    const omega = 1.4 * Math.pow(h.r, -1.5);
                    const phi = h.phi - omega * time;
                    const ht = Math.pow(R_IN / h.r, 0.9);
                    const turb = 0.72 + 0.34 * Math.sin(3 * phi + h.r * 1.8)
                                       + 0.18 * Math.sin(7 * phi - h.r * 3.1 + 1.7);
                    const beam = 1.12 + 0.48 * h.bd;
                    b += w * ht * turb * beam;
                }
                if (c.minR2 < 2.9) b += (2.9 - c.minR2) * 0.55;
                b = clamp(b * 0.85, 0, 1) * bIn;
                if (b < 0.02) continue;
                gset(g, x, y, RAMP[clamp((Math.pow(b, 0.8) * RAMP.length) | 0, 1, RAMP.length - 1)], HEAT[(b * 63) | 0]);
            }
    };
})();

// ---- afterglow: behind the epilogue ----
function afterglow(g, t, time) {
    drawStars(g, time, 0.014, 0.5);
}

// ============================================================
// scroll engine
// ============================================================
const SCENES = [
    { id: 'arrival',   render: arrival,   act: '✦',        cap: 'an odyssey in characters · <em>scroll</em>' },
    { id: 'velocity',  render: velocity,  act: 'act 01·07', cap: 'velocity · four hundred stars, divided by their own depth' },
    { id: 'galaxy',    render: galaxy,    act: 'act 02·07', cap: 'the wheel · six thousand suns on spiral rails' },
    { id: 'nebula',    render: nebula,    act: 'act 03·07', cap: 'the nursery · noise, warped by more of itself' },
    { id: 'worldfall', render: worldfall, act: 'act 04·07', cap: 'worldfall · one ray per cell makes a world' },
    { id: 'forge',     render: forge,     act: 'act 05·07', cap: 'the forge · fire borrowed from 1993' },
    { id: 'supernova', render: supernova, act: 'act 06·07', cap: 'dissolution · <em>your thumb is scrubbing the explosion</em>' },
    { id: 'gravity',   render: gravity,   act: 'act 07·07', cap: 'gravity · light on bent rails · <em>drag to orbit</em>' },
    { id: 'epilogue',  render: afterglow, act: 'fin',       cap: '' },
];

let acts = [];
function measureActs() {
    acts = [];
    document.querySelectorAll('.act, .epilogue').forEach(el => {
        acts.push({ top: el.offsetTop, height: el.offsetHeight });
    });
}

function sceneAt(scrollY) {
    let k = 0;
    for (let i = 0; i < acts.length; i++) if (scrollY >= acts[i].top) k = i;
    const a = acts[k];
    const t = a ? clamp((scrollY - a.top) / Math.max(1, a.height), 0, 1) : 0;
    return { k: Math.min(k, SCENES.length - 1), t };
}

// ============================================================
// taps spark everywhere
// ============================================================
const bursts = [];
function renderBursts(g, now) {
    for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        const age = now - b.t0;
        if (age > 0.85) { bursts.splice(i, 1); continue; }
        const r = age * 26;
        const alpha = clamp(1 - age / 0.85, 0, 1);
        const steps = Math.max(10, r * 5) | 0;
        for (let s = 0; s < steps; s++) {
            const a = s / steps * Math.PI * 2;
            if (hash3(s, b.seed, 17) < 0.45) continue;
            const x = b.x + Math.cos(a) * r / CELL_ASPECT;
            const y = b.y + Math.sin(a) * r;
            gset(g, x, y, alpha > 0.6 ? '*' : alpha > 0.3 ? ':' : '·',
                `rgba(143,216,232,${(alpha * 0.8).toFixed(2)})`);
        }
        gset(g, b.x, b.y, alpha > 0.5 ? '✦' : '·', `rgba(248,243,233,${alpha.toFixed(2)})`);
    }
}

// ============================================================
// input: taps + drags
// ============================================================
let pDown = false, pX = 0, pY = 0, pMoved = 0, pT = 0, curScene = 0;

document.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.epilogue')) return;
    pDown = true; pX = e.clientX; pY = e.clientY; pMoved = 0; pT = performance.now();
    if (SCENES[curScene].id === 'gravity') stageCanvas.classList.add('grabbing');
});
document.addEventListener('pointermove', (e) => {
    if (!pDown) return;
    const dx = e.clientX - pX, dy = e.clientY - pY;
    pMoved += Math.abs(dx) + Math.abs(dy);
    pX = e.clientX; pY = e.clientY;
    if (SCENES[curScene].id === 'gravity' && gravity_drag) {
        gravity_drag(dx, dy, e.pointerType === 'touch');
        dirty = true;
    }
});
document.addEventListener('pointerup', (e) => {
    stageCanvas.classList.remove('grabbing');
    if (!pDown) return;
    pDown = false;
    if (pMoved < 10 && performance.now() - pT < 400 && !e.target.closest('.epilogue')) {
        bursts.push({
            x: e.clientX / CELLW, y: e.clientY / CELLH,
            t0: performance.now() / 1000, seed: (Math.random() * 1e4) | 0
        });
        dirty = true;
    }
});
document.addEventListener('pointercancel', () => { pDown = false; stageCanvas.classList.remove('grabbing'); });

// ============================================================
// HUD + captions
// ============================================================
const titleEl = document.getElementById('title');
const capEl = document.getElementById('caption');
const actEl = document.getElementById('hud-act');
const barEl = document.getElementById('hud-progress');
let capScene = -1, capTimer = 0;

function updateHud(k, scrollY) {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    barEl.style.transform = `scaleX(${clamp(scrollY / max, 0, 1).toFixed(3)})`;
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
const FROZEN_TIME = 42;

function loop(nowMs) {
    requestAnimationFrame(loop);
    if (document.hidden) return;
    if (nowMs - lastFrame < 1000 / 30) return;
    const scrollY = window.scrollY;
    const { k, t } = sceneAt(scrollY);
    curScene = k;
    if (REDUCED && !dirty && k === capScene) return;   // scrub-only when motion is reduced
    lastFrame = nowMs;
    dirty = false;
    const time = REDUCED ? FROZEN_TIME + t * 4 : nowMs / 1000;

    gclear(gridA);
    SCENES[k].render(gridA, t, time);
    // glyph-dissolve into the next act
    if (t > 0.86 && k < SCENES.length - 1) {
        const blend = (t - 0.86) / 0.14;
        gclear(gridB);
        SCENES[k + 1].render(gridB, 0, time);
        for (let i = 0; i < gridA.ch.length; i++) {
            if (hash3(i % COLS, (i / COLS) | 0, 99) < blend) {
                gridA.ch[i] = gridB.ch[i]; gridA.co[i] = gridB.co[i];
            }
        }
    }
    renderBursts(gridA, nowMs / 1000);
    stageRender(gridA);
    updateHud(k, scrollY);
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
// epilogue: write in fire + the mirror
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
    text(x, y, str, col) { for (let i = 0; i < str.length; i++) this.set(x + i, y, str[i], col); }
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
                const col = this.co[i] || '#f5a542';
                if (col !== last) { c.fillStyle = col; last = col; }
                c.fillText(this.ch[i], (x + 0.5) * this.cw, py);
            }
        }
    }
}

const minis = [];

// write in fire
(() => {
    const el = document.getElementById('d-firetext');
    if (!el) return;
    const narrow = window.innerWidth < 520;
    const s = new Mini(el, narrow ? 46 : 64, narrow ? 15 : 16);
    const W = s.cols, H = s.rows + 2;
    const heat = new Float32Array(W * H);
    let mask = new Uint8Array(W * s.rows), bandTop = 0, bandBot = s.rows;
    const off = document.createElement('canvas');
    const octx = off.getContext('2d', { willReadFrequently: true });

    function buildMask(text) {
        text = (text || '').trim() || '···';
        off.width = W; off.height = s.rows;
        octx.clearRect(0, 0, W, s.rows);
        octx.save();
        octx.translate(W / 2, s.rows / 2 + 1);
        octx.scale(1, CELL_ASPECT);
        try { octx.letterSpacing = '3px'; } catch (e) { /* older browsers */ }
        let fs = (s.rows - 4) / CELL_ASPECT * 0.62;
        octx.font = `700 ${fs}px "IBM Plex Mono", monospace`;
        const w = octx.measureText(text).width;
        if (w > W - 6) { fs *= (W - 6) / w; octx.font = `700 ${fs}px "IBM Plex Mono", monospace`; }
        octx.textAlign = 'center'; octx.textBaseline = 'middle';
        octx.fillStyle = '#fff';
        octx.fillText(text, 0, 0);
        octx.restore();
        const img = octx.getImageData(0, 0, W, s.rows).data;
        const m = new Uint8Array(W * s.rows);
        bandTop = s.rows; bandBot = 0;
        for (let i = 0; i < m.length; i++) {
            m[i] = img[i * 4 + 3] > 70 ? 1 : 0;
            if (m[i]) { const r = (i / W) | 0; if (r < bandTop) bandTop = r; if (r > bandBot) bandBot = r; }
        }
        mask = m;
    }
    const input = document.getElementById('firetext-input');
    buildMask(input ? input.value : 'FABLE');
    let deb = 0;
    input?.addEventListener('input', () => { clearTimeout(deb); deb = setTimeout(() => buildMask(input.value), 120); });

    minis.push({ s, fps: 24, last: 0, frame(time) {
        for (let y = 0; y < H - 2; y++)
            for (let x = 0; x < W; x++) {
                const src = (y + 1) * W + ((x + ((Math.random() * 3) | 0) - 1 + W) % W);
                heat[y * W + x] = Math.max(0, heat[src] - Math.random() * 3.6);
            }
        for (let y = 0; y < s.rows; y++)
            for (let x = 0; x < W; x++)
                if (mask[y * W + x]) heat[y * W + x] = 36 * (0.82 + 0.18 * noise3(x * 0.4, y * 0.4, time * 4));
        for (let x = 0; x < W; x++) {
            const surge = 3 + 2 * Math.sin(x * 0.4 + time * 2.1);
            heat[(H - 1) * W + x] = surge; heat[(H - 2) * W + x] = surge;
        }
        s.clear();
        for (let y = 0; y < s.rows; y++) {
            const inBand = y >= bandTop && y <= bandBot;
            for (let x = 0; x < W; x++) {
                let v = clamp(heat[y * W + x] / 36, 0, 1);
                if (inBand && !mask[y * W + x]) v *= 0.17;
                if (v < 0.05) continue;
                s.set(x, y, RAMP[clamp((v * RAMP.length) | 0, 1, RAMP.length - 1)], HEAT[(v * 63) | 0]);
            }
        }
    } });
})();

// the mirror
(() => {
    const el = document.getElementById('d-mirror');
    if (!el) return;
    const narrow = window.innerWidth < 520;
    const s = new Mini(el, narrow ? 44 : 64, narrow ? 20 : 26);
    const W = s.cols, H = s.rows;
    const vcan = document.createElement('canvas');
    const vctx = vcan.getContext('2d', { willReadFrequently: true });
    vcan.width = W; vcan.height = H;
    let video = null, stream = null, state = 'off', msg = '';
    const btn = document.getElementById('mirror-btn');

    function stop() {
        stream?.getTracks().forEach(tr => tr.stop());
        stream = null; video = null; state = 'off';
        if (btn) btn.textContent = 'start camera';
    }
    btn?.addEventListener('click', async () => {
        if (state === 'on') { stop(); return; }
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 320 } }, audio: false });
            video = document.createElement('video');
            video.playsInline = true; video.muted = true;
            video.srcObject = stream;
            await video.play();
            state = 'on';
            if (btn) btn.textContent = 'stop camera';
        } catch (e) { state = 'err'; msg = 'camera unavailable'; }
    });
    addEventListener('pagehide', stop);

    minis.push({ s, fps: 15, last: 0, frame(time) {
        s.clear();
        if (state !== 'on' || !video || video.readyState < 2) {
            const scan = ((time * 6) | 0) % H;
            for (let x = 0; x < W; x += 2) s.set(x, scan, '·', 'rgba(245,165,66,0.12)');
            const m1 = state === 'err' ? msg : 'the mirror is dark';
            s.text((W - m1.length) >> 1, (H >> 1), m1, 'rgba(230,222,208,0.55)');
            return;
        }
        const targetAspect = (W * CELL_ASPECT) / H;
        const va = video.videoWidth / video.videoHeight;
        let sw = video.videoWidth, sh = video.videoHeight, sx = 0, sy = 0;
        if (va > targetAspect) { sw = sh * targetAspect; sx = (video.videoWidth - sw) / 2; }
        else { sh = sw / targetAspect; sy = (video.videoHeight - sh) / 2; }
        vctx.save(); vctx.scale(-1, 1);
        vctx.drawImage(video, sx, sy, sw, sh, -W, 0, W, H);
        vctx.restore();
        const img = vctx.getImageData(0, 0, W, H).data;
        for (let y = 0; y < H; y++)
            for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4;
                const lum = (img[i] * 0.2126 + img[i + 1] * 0.7152 + img[i + 2] * 0.0722) / 255;
                const gm = Math.pow(lum, 1.15);
                if (gm < 0.06) continue;
                s.set(x, y, RAMP[clamp((gm * RAMP.length) | 0, 1, RAMP.length - 1)], HEAT[(gm * 63) | 0]);
            }
    } });
})();

function miniLoop(nowMs) {
    requestAnimationFrame(miniLoop);
    if (document.hidden) return;
    for (const m of minis) {
        if (!m.s.visible && !REDUCED) continue;
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
addEventListener('resize', () => {
    clearTimeout(stageResize._t);
    stageResize._t = setTimeout(() => stageResize(false), 250);
});
addEventListener('scroll', () => { dirty = true; }, { passive: true });
// re-measure once fonts and epilogue layout settle
setTimeout(measureActs, 800);
addEventListener('load', measureActs);

requestAnimationFrame(loop);
requestAnimationFrame(miniLoop);

console.log(
    '%c\n   ✦ terminal animation · an ascii odyssey ✦\n' +
    '   nine acts, computed live from characters\n' +
    '   the field guide has the source walkthrough → ./guide\n',
    'color:#f5a542;font-family:monospace;font-size:12px;line-height:1.6');

})();
