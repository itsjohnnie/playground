// ============================================================
// Terminal Animation — The Fable Edition
// Sixteen live ASCII simulations. One engine. Zero images.
// ============================================================
(() => {
'use strict';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- palettes ----------
const RAMP      = ' ·:;=+*#%@';
const RAMP_SOFT = ' ·:░▒▓█';

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

// Build a 64-step color LUT from gradient stops [[t, r, g, b], ...]
function makeLUT(stops) {
    const lut = [];
    for (let i = 0; i < 64; i++) {
        const t = i / 63;
        let a = stops[0], b = stops[stops.length - 1];
        for (let s = 0; s < stops.length - 1; s++) {
            if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
        }
        const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
        lut.push(`rgb(${lerp(a[1], b[1], f) | 0},${lerp(a[2], b[2], f) | 0},${lerp(a[3], b[3], f) | 0})`);
    }
    return lut;
}

const HEAT = makeLUT([          // ember → amber → white-hot
    [0.00,  40,  16,  12], [0.25, 140,  44,  16], [0.50, 235, 110,  40],
    [0.75, 250, 180,  90], [1.00, 255, 246, 224]
]);
const NEBULA_LUT = makeLUT([    // cold gas → violet → rose core
    [0.00,  24,  40,  60], [0.35,  70, 130, 160], [0.60, 130,  90, 170],
    [0.82, 220, 120, 160], [1.00, 255, 220, 210]
]);

// ---------- value noise (3D, hash lattice) ----------
function hash3(x, y, z) {
    let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 15), 2654435761);
    h = Math.imul(h ^ (h >>> 13), 2246822519);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function smooth(t) { return t * t * (3 - 2 * t); }
function noise3(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
    let v = 0;
    // trilinear blend of the 8 lattice corners
    for (let c = 0; c < 8; c++) {
        const cx = c & 1, cy = (c >> 1) & 1, cz = (c >> 2) & 1;
        const w = (cx ? xf : 1 - xf) * (cy ? yf : 1 - yf) * (cz ? zf : 1 - zf);
        v += w * hash3(xi + cx, yi + cy, zi + cz);
    }
    return v;
}
function fbm3(x, y, z, oct) {
    let v = 0, amp = 0.5, f = 1;
    for (let o = 0; o < oct; o++) {
        v += amp * noise3(x * f, y * f, z * f);
        amp *= 0.5; f *= 2.03;
    }
    return v;
}

// ---------- the screen: char grid → canvas ----------
const CELL_ASPECT = 0.6; // width / height of one cell

class Screen {
    constructor(canvas, cols, rows) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.cols = cols; this.rows = rows;
        this.chars = new Array(cols * rows).fill(' ');
        this.colors = new Array(cols * rows).fill('');
        this.defaultColor = '#f5a542';
        this._resize();
        if ('ResizeObserver' in window) {
            new ResizeObserver(() => { this._resize(); this.render(); })
                .observe(canvas.parentElement);
        }
    }
    _resize() {
        const w = this.canvas.parentElement.clientWidth;
        if (!w) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        this.cellW = w / this.cols;
        this.cellH = this.cellW / CELL_ASPECT;
        const h = this.cellH * this.rows;
        this.canvas.style.height = h + 'px';
        this.canvas.width = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.fontSize = this.cellH;
        this.ctx.font = `${this.fontSize * 0.92}px "IBM Plex Mono", monospace`;
        this.ctx.textBaseline = 'middle';
        this.ctx.textAlign = 'center';
    }
    clear() {
        this.chars.fill(' ');
        this.colors.fill('');
    }
    set(x, y, ch, color) {
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
        const i = y * this.cols + x;
        this.chars[i] = ch;
        if (color) this.colors[i] = color;
    }
    text(x, y, str, color) {
        for (let i = 0; i < str.length; i++) this.set(x + i, y, str[i], color);
    }
    render() {
        const { ctx, cols, rows, cellW, cellH } = this;
        if (!cellW) return;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.font = `${this.fontSize * 0.92}px "IBM Plex Mono", monospace`;
        let last = null;
        for (let y = 0; y < rows; y++) {
            const py = (y + 0.5) * cellH;
            for (let x = 0; x < cols; x++) {
                const i = y * cols + x;
                const ch = this.chars[i];
                if (ch === ' ') continue;
                const col = this.colors[i] || this.defaultColor;
                if (col !== last) { ctx.fillStyle = col; last = col; }
                ctx.fillText(ch, (x + 0.5) * cellW, py);
            }
        }
    }
}

// braille pixel buffer riding on a Screen: 2×4 dots per cell
class Braille {
    constructor(screen) {
        this.s = screen;
        this.w = screen.cols * 2;
        this.h = screen.rows * 4;
        this.pix = new Float32Array(this.w * this.h);
        this.col = new Array(this.w * this.h).fill('');
    }
    fade(f) {
        for (let i = 0; i < this.pix.length; i++) this.pix[i] *= f;
    }
    clear() { this.pix.fill(0); }
    plot(x, y, v, color) {
        x |= 0; y |= 0;
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        const i = y * this.w + x;
        if (v >= this.pix[i]) { this.pix[i] = v; if (color) this.col[i] = color; }
        else this.pix[i] = Math.min(1.5, this.pix[i] + v * 0.3);
    }
    // dot bit layout: col0 = 0x01,0x02,0x04,0x40 · col1 = 0x08,0x10,0x20,0x80
    static DOTS = [[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]];
    blit(threshold = 0.14) {
        const { s } = this;
        s.clear();
        for (let cy = 0; cy < s.rows; cy++) {
            for (let cx = 0; cx < s.cols; cx++) {
                let bits = 0, best = 0, bestCol = '';
                for (let dy = 0; dy < 4; dy++) {
                    for (let dx = 0; dx < 2; dx++) {
                        const i = (cy * 4 + dy) * this.w + cx * 2 + dx;
                        const v = this.pix[i];
                        if (v > threshold) {
                            bits |= Braille.DOTS[dy][dx];
                            if (v > best) { best = v; bestCol = this.col[i]; }
                        }
                    }
                }
                if (bits) s.set(cx, cy, String.fromCharCode(0x2800 | bits), bestCol);
            }
        }
    }
}

// ---------- demo runner ----------
const demos = [];

function demo(id, cols, rows, fps, setup) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    const screen = new Screen(canvas, cols, rows);
    const d = { screen, fps, last: 0, visible: false, frame: setup(screen) };
    demos.push(d);
    const io = new IntersectionObserver(es =>
        es.forEach(e => { d.visible = e.isIntersecting; }), { rootMargin: '80px' });
    io.observe(canvas);
    if (REDUCED) { // one still frame, then dormant forever
        requestAnimationFrame(() => { d.frame(2.4, 0.04); screen.render(); });
        d.visible = false;
    }
}

function mainLoop(now) {
    if (!document.hidden) {
        for (const d of demos) {
            if (!d.visible) continue;
            const step = 1000 / d.fps;
            if (now - d.last >= step) {
                d.frame(now / 1000, Math.min(0.1, (now - d.last) / 1000) || step / 1000);
                d.screen.render();
                d.last = now;
            }
        }
    }
    requestAnimationFrame(mainLoop);
}

// ============================================================
// HERO — the black hole
// Geodesics traced once at load; disk re-shaded per frame.
// ============================================================
demo('d-blackhole', 122, 32, 24, (s) => {
    const COLS = s.cols, ROWS = s.rows;
    const R_IN = 2.55, R_OUT = 7.6;
    // camera slightly above the disk plane, looking at the hole
    const cam = [0, 1.55, -13.5];
    const fwd = normalize([-cam[0], -cam[1], -cam[2]]);
    const right = normalize(crossV([0, 1, 0], fwd) ? cross3(fwd, [0, 1, 0]) : [1, 0, 0]);
    const up = cross3(right, fwd);
    // field of view scaled so the disk fills the frame; x compressed by cell aspect
    const SU = 0.62, SV = SU * (ROWS / (COLS * CELL_ASPECT));

    function cross3(a, b) {
        return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }
    function crossV(a, b) { const c = cross3(a, b); return c[0] || c[1] || c[2]; }
    function normalize(v) {
        const l = Math.hypot(v[0], v[1], v[2]) || 1;
        return [v[0] / l, v[1] / l, v[2] / l];
    }

    // per-cell result of the one-time trace
    // kind: 0 captured · 1 escaped(starfield) · 2 disk hit(s)
    const cells = new Array(COLS * ROWS);

    function trace(u, v) {
        let px = cam[0], py = cam[1], pz = cam[2];
        let d = normalize([
            fwd[0] + right[0] * u + up[0] * v,
            fwd[1] + right[1] * u + up[1] * v,
            fwd[2] + right[2] * u + up[2] * v]);
        let vx = d[0], vy = d[1], vz = d[2];
        const hx = py * vz - pz * vy, hy = pz * vx - px * vz, hz = px * vy - py * vx;
        const h2 = hx * hx + hy * hy + hz * hz;
        const hits = [];
        let minR2 = 1e9;
        for (let step = 0; step < 160; step++) {
            const r2 = px * px + py * py + pz * pz;
            if (r2 < minR2) minR2 = r2;
            if (r2 < 1) return { kind: 0, minR2 };
            if (r2 > 280) return { kind: hits.length ? 2 : 1, hits, dir: [vx, vy, vz], minR2 };
            const dt = clamp(Math.sqrt(r2) * 0.055, 0.035, 0.32);
            const a = -1.5 * h2 / Math.pow(r2, 2.5);
            vx += px * a * dt; vy += py * a * dt; vz += pz * a * dt;
            const ny = py + vy * dt;
            // crossing the equatorial plane?
            if ((py > 0) !== (ny > 0) && hits.length < 2) {
                const f = py / (py - ny);
                const ix = px + vx * dt * f, iz = pz + vz * dt * f;
                const r = Math.hypot(ix, iz);
                if (r >= R_IN && r <= R_OUT) hits.push({ r, phi: Math.atan2(iz, ix), x: ix });
            }
            px += vx * dt; py = ny; pz += vz * dt;
        }
        return { kind: hits.length ? 2 : 0, hits, minR2 }; // trapped near photon sphere
    }

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const u = (x - COLS / 2) / (COLS / 2) * SU;
            const v = -(y - ROWS / 2) / (ROWS / 2) * SV;
            cells[y * COLS + x] = trace(u, v);
        }
    }

    const hud = document.getElementById('hero-hud');
    let frames = 0, hudLast = 0, hudTime = 0;

    return (t) => {
        s.clear();
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const c = cells[y * COLS + x];
                if (c.kind === 0) continue; // the shadow stays black
                if (c.kind === 1) {
                    // lensed background starfield, twinkling
                    const d = c.dir;
                    const st = hash3((d[0] * 47) | 0, (d[1] * 47) | 0, (d[2] * 47) | 0);
                    if (st > 0.982) {
                        const tw = 0.5 + 0.5 * Math.sin(t * (1 + st * 4) + st * 40);
                        if (tw > 0.35) s.set(x, y, tw > 0.8 ? '·' : '·', 'rgba(143,216,232,' + (0.25 + tw * 0.4).toFixed(2) + ')');
                    }
                    continue;
                }
                // disk: shade every cached crossing, front image dominant
                let b = 0, rHit = 0;
                for (let k = 0; k < c.hits.length; k++) {
                    const h = c.hits[k];
                    const w = k === 0 ? 1 : 0.45;
                    const omega = 1.4 * Math.pow(h.r, -1.5);
                    const phi = h.phi - omega * t;
                    const heat = Math.pow(R_IN / h.r, 0.9);
                    const turb = 0.72 + 0.34 * Math.sin(3 * phi + h.r * 1.8)
                                       + 0.18 * Math.sin(7 * phi - h.r * 3.1 + 1.7);
                    const beam = 1.12 + 0.48 * (h.x / h.r);
                    b += w * heat * turb * beam;
                    rHit = rHit || h.r;
                }
                // photon-ring boost: rays that grazed the photon sphere
                if (c.minR2 < 2.9) b += (2.9 - c.minR2) * 0.55;
                b = clamp(b * 0.85, 0, 1);
                if (b < 0.02) continue;
                const ch = RAMP[clamp((Math.pow(b, 0.8) * RAMP.length) | 0, 1, RAMP.length - 1)];
                s.set(x, y, ch, HEAT[(b * 63) | 0]);
            }
        }
        // hud: live fps readout
        frames++;
        if (hud && t - hudTime > 0.5) {
            const fps = Math.round(frames / (t - hudTime));
            if (fps > 0 && fps < 200 && t - hudLast > 0.9) { hud.textContent = '● ' + Math.min(24, fps) + ' fps'; hudLast = t; }
            frames = 0; hudTime = t;
        }
    };
});

// ============================================================
// 01 — interference field
// ============================================================
demo('d-signal', 78, 16, 30, (s) => {
    const srcs = [
        { r: 9, sp: 0.31, ph: 0.0, f: 0.85 },
        { r: 12, sp: -0.22, ph: 2.1, f: 0.62 },
        { r: 7, sp: 0.17, ph: 4.2, f: 1.05 }
    ];
    return (t) => {
        s.clear();
        const cx = s.cols / 2, cy = s.rows / 2;
        const pts = srcs.map(o => [
            cx + Math.cos(t * o.sp + o.ph) * o.r * 2.2,
            cy + Math.sin(t * o.sp * 1.3 + o.ph) * o.r * 0.55
        ]);
        for (let y = 0; y < s.rows; y++) {
            for (let x = 0; x < s.cols; x++) {
                let v = 0;
                for (let k = 0; k < 3; k++) {
                    const dx = (x - pts[k][0]) * CELL_ASPECT, dy = y - pts[k][1];
                    v += Math.sin(Math.hypot(dx, dy) * srcs[k].f - t * 2.4);
                }
                const b = clamp((v + 3) / 6, 0, 1);
                if (b < 0.18) continue;
                const ch = RAMP[(b * (RAMP.length - 1)) | 0];
                const col = b > 0.82 ? '#f8f3e9' : b > 0.55 ? '#f5a542' : '#8a6a3a';
                s.set(x, y, ch, col);
            }
        }
    };
});

// ============================================================
// 03 — the torus
// ============================================================
demo('d-torus', 52, 22, 30, (s) => {
    return (t) => {
        s.clear();
        const A = t * 0.9, B = t * 0.6;
        const cosA = Math.cos(A), sinA = Math.sin(A), cosB = Math.cos(B), sinB = Math.sin(B);
        const R1 = 1, R2 = 2, K2 = 5;
        const K1 = s.cols * K2 * 3 / (8 * (R1 + R2)) * 0.66;
        const zbuf = new Float32Array(s.cols * s.rows);
        // light stays viewer-side; the highlight swings across the surface
        const L = [Math.cos(t * 0.5) * 0.8, 0.4 + Math.sin(t * 0.35) * 0.4, -1.1];
        const ll = Math.hypot(L[0], L[1], L[2]);
        for (let th = 0; th < 6.28; th += 0.07) {
            const ct = Math.cos(th), st = Math.sin(th);
            for (let ph = 0; ph < 6.28; ph += 0.02) {
                const cp = Math.cos(ph), sp = Math.sin(ph);
                const circx = R2 + R1 * ct, circy = R1 * st;
                const x = circx * (cosB * cp + sinA * sinB * sp) - circy * cosA * sinB;
                const y = circx * (sinB * cp - sinA * cosB * sp) + circy * cosA * cosB;
                const z = K2 + cosA * circx * sp + circy * sinA;
                const ooz = 1 / z;
                const xp = (s.cols / 2 + K1 * ooz * x) | 0;
                const yp = (s.rows / 2 - K1 * ooz * y / (1 / CELL_ASPECT) * 0.85) | 0;
                if (xp < 0 || xp >= s.cols || yp < 0 || yp >= s.rows) continue;
                const idx = yp * s.cols + xp;
                if (ooz <= zbuf[idx]) continue;
                zbuf[idx] = ooz;
                // surface normal, same rotations
                const nx = ct * (cosB * cp + sinA * sinB * sp) - st * cosA * sinB;
                const ny = ct * (sinB * cp - sinA * cosB * sp) + st * cosA * cosB;
                const nz = cosA * ct * sp + st * sinA;
                const lum = (nx * L[0] + ny * L[1] + nz * L[2]) / ll;
                // ambient keeps the whole surface legible; the light adds relief
                const li = 0.16 + 0.84 * Math.pow(Math.max(0, lum), 1.2);
                const ch = RAMP[clamp((li * RAMP.length) | 0, 1, RAMP.length - 1)];
                s.set(xp, yp, ch, HEAT[(6 + li * 57) | 0]);
            }
        }
    };
});

// ============================================================
// 03 — the planet
// ============================================================
demo('d-planet', 52, 24, 24, (s) => {
    const SEED = 7.3;
    return (t) => {
        s.clear();
        const cx = s.cols / 2, cy = s.rows / 2;
        const R = Math.min(s.cols * CELL_ASPECT, s.rows) * 0.44;
        const spin = t * 0.22;
        const cs = Math.cos(spin), sn = Math.sin(spin);
        // the sun swings across the near side, dragging the terminator
        // (never fully behind: the planet stays watchable)
        const sunA = t * 0.16;
        const sx = Math.sin(sunA) * 0.9, sz2 = 0.35 + 0.5 * (0.5 + 0.5 * Math.cos(sunA));
        const sl = Math.hypot(sx, 0.3, sz2);
        const sun = [sx / sl, 0.3 / sl, sz2 / sl];
        for (let y = 0; y < s.rows; y++) {
            for (let x = 0; x < s.cols; x++) {
                const dx = (x - cx) * CELL_ASPECT, dy = y - cy;
                const d2 = dx * dx + dy * dy;
                if (d2 > R * R) {
                    // thin atmosphere on the limb
                    if (d2 < R * R * 1.18 && d2 > R * R * 1.0) {
                        const g = hash3(x, y, 3);
                        if (g > 0.6) s.set(x, y, '·', 'rgba(143,216,232,0.28)');
                    }
                    continue;
                }
                // point on the sphere (orthographic)
                const nz = Math.sqrt(R * R - d2) / R;
                const nx = dx / R, ny = -dy / R;
                // rotate around the vertical axis: the planet turns
                const rx = nx * cs + nz * sn;
                const rz = -nx * sn + nz * cs;
                const land = fbm3(rx * 2.3 + SEED, ny * 2.3, rz * 2.3, 4);
                const lat = Math.abs(ny);
                let lit = nx * sun[0] + ny * sun[1] + nz * sun[2];
                lit = clamp(lit, 0, 1);
                const glow = clamp(Math.pow(lit, 0.7) + 0.1, 0, 1);   // faint ambient
                let ch, col;
                if (lat > 0.82 - land * 0.12) {          // polar ice
                    ch = glow > 0.6 ? '@' : glow > 0.3 ? '#' : ':';
                    col = `rgba(230,240,248,${0.35 + glow * 0.6})`;
                } else if (land > 0.54) {                 // continents
                    const hgt = (land - 0.54) / 0.2;
                    ch = RAMP[clamp(((0.25 + glow * 0.75) * RAMP.length) | 0, 1, RAMP.length - 1)];
                    col = hgt > 0.75 ? `rgba(200,170,120,${0.3 + glow * 0.7})`
                                     : `rgba(150,170,90,${0.28 + glow * 0.7})`;
                } else {                                  // ocean
                    ch = glow > 0.75 ? '≈' : glow > 0.45 ? '~' : glow > 0.18 ? ':' : '·';
                    col = `rgba(80,150,190,${0.22 + glow * 0.68})`;
                }
                if (ch !== ' ') s.set(x, y, ch, col);
            }
        }
    };
});

// ============================================================
// 03 — warp field
// ============================================================
demo('d-warp', 52, 22, 30, (s) => {
    const N = 380;
    const stars = [];
    for (let i = 0; i < N; i++) {
        stars.push({
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
            z: Math.random() * 0.95 + 0.05
        });
    }
    const TAIL = ['#', '+', ':', '·', '·'];
    return (t, dt) => {
        s.clear();
        const cx = s.cols / 2, cy = s.rows / 2;
        // throttle breathes: cruise → warp → cruise
        const throttle = Math.pow(0.5 + 0.5 * Math.sin(t * 0.45), 3);
        const speed = 0.08 + throttle * 1.6;
        const focal = 14;
        for (const st of stars) {
            st.z -= speed * dt;
            if (st.z <= 0.03) {
                st.x = (Math.random() - 0.5) * 2;
                st.y = (Math.random() - 0.5) * 2;
                st.z = 1;
            }
            const trail = 1 + (throttle * 4.5) | 0;
            for (let k = trail - 1; k >= 0; k--) {
                const zk = st.z + speed * dt * k * 2.2;
                if (zk <= 0.02 || zk > 1) continue;
                const sx = cx + st.x / zk * focal * 0.62;
                const sy = cy + st.y / zk * focal * CELL_ASPECT * 0.62;
                const near = 1 - zk;
                const ch = k === 0
                    ? (near > 0.75 ? '#' : near > 0.5 ? '+' : near > 0.25 ? ':' : '·')
                    : TAIL[Math.min(TAIL.length - 1, k)];
                const warm = near > 0.7;
                const a = clamp(near * 1.2 - k * 0.16, 0.08, 1);
                s.set(sx, sy, ch, warm
                    ? `rgba(248,243,233,${a})`
                    : `rgba(143,216,232,${a * 0.9})`);
            }
        }
    };
});

// ============================================================
// 04 — nebula
// ============================================================
demo('d-nebula', 52, 22, 20, (s) => {
    const GAS = ' ··:;*oO&%@';
    return (t) => {
        s.clear();
        const sc = 0.16;
        for (let y = 0; y < s.rows; y++) {
            for (let x = 0; x < s.cols; x++) {
                const px = x * sc * CELL_ASPECT, py = y * sc;
                const q = fbm3(px, py, t * 0.10, 3);
                const d = fbm3(px + 1.9 * q, py + 9.2, t * 0.06 + 4.4, 4);
                const v = clamp((d - 0.22) * 2.0, 0, 1);
                if (v < 0.1) {
                    // stars shine through thin gas
                    const st = hash3(x, y, 5);
                    if (st > 0.955) {
                        const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + st * 3) + st * 30);
                        s.set(x, y, '·', `rgba(248,243,233,${(0.2 + tw * 0.55).toFixed(2)})`);
                    }
                    continue;
                }
                const ch = GAS[clamp((Math.pow(v, 1.5) * GAS.length) | 0, 1, GAS.length - 1)];
                s.set(x, y, ch, NEBULA_LUT[(v * 63) | 0]);
            }
        }
    };
});

// ============================================================
// 04 — solar surface (doom fire)
// ============================================================
demo('d-fire', 52, 22, 24, (s) => {
    const W = s.cols, H = s.rows + 2;      // two hidden molten rows
    const heat = new Float32Array(W * H);
    return (t) => {
        // molten base with slow surges
        for (let x = 0; x < W; x++) {
            const surge = 0.75 + 0.25 * Math.sin(x * 0.3 + t * 1.7) * Math.sin(t * 0.9 + x);
            heat[(H - 1) * W + x] = 36 * surge;
            heat[(H - 2) * W + x] = 36 * surge;
        }
        // propagate upward with cooling + wind
        for (let y = 0; y < H - 2; y++) {
            for (let x = 0; x < W; x++) {
                const src = (y + 1) * W + ((x + ((Math.random() * 3) | 0) - 1 + W) % W);
                const cool = Math.random() * 2.4;
                heat[y * W + x] = Math.max(0, heat[src] - cool);
            }
        }
        s.clear();
        for (let y = 0; y < s.rows; y++) {
            for (let x = 0; x < W; x++) {
                const v = clamp(heat[y * W + x] / 36, 0, 1);
                if (v < 0.04) continue;
                const ch = RAMP[clamp((v * RAMP.length) | 0, 1, RAMP.length - 1)];
                s.set(x, y, ch, HEAT[(v * 63) | 0]);
            }
        }
    };
});

// ============================================================
// 05 — Lorenz attractor (braille)
// ============================================================
demo('d-lorenz', 52, 24, 30, (s) => {
    const br = new Braille(s);
    const SIGMA = 10, RHO = 28, BETA = 8 / 3;
    const COLS3 = ['#8fd8e8', '#f5a542', '#e88fb0'];
    const parts = [0, 1, 2].map(i => ({ x: 0.9 + i * 0.002, y: 1, z: 20 }));
    return (t) => {
        br.fade(0.965);
        const ca = Math.cos(t * 0.25), sa = Math.sin(t * 0.25);
        for (let p = 0; p < 3; p++) {
            const o = parts[p];
            for (let sub = 0; sub < 40; sub++) {
                const dx = SIGMA * (o.y - o.x);
                const dy = o.x * (RHO - o.z) - o.y;
                const dz = o.x * o.y - BETA * o.z;
                const h = 0.0035;
                o.x += dx * h; o.y += dy * h; o.z += dz * h;
                // orbit the camera about the vertical axis
                const rx = o.x * ca + o.y * sa;
                const px = br.w / 2 + rx * (br.w / 46);
                const py = br.h - (o.z * (br.h / 55)) - 2;
                br.plot(px, py, 1, COLS3[p]);
            }
        }
        br.blit(0.1);
    };
});

// ============================================================
// 05 — galaxy survey (braille)
// ============================================================
demo('d-galaxy', 52, 24, 24, (s) => {
    const br = new Braille(s);
    const N = 6000;
    const stars = [];
    for (let i = 0; i < N; i++) {
        const core = Math.random() < 0.22;
        const r = core
            ? Math.pow(Math.random(), 2) * 0.16 + 0.01
            : Math.pow(Math.random(), 0.7) * 0.95 + 0.05;
        stars.push({
            r,
            th0: Math.random() * Math.PI * 2,
            arm: core ? -1 : (Math.random() < 0.5 ? 0 : 1),
            jitter: (Math.random() - 0.5) * (core ? 6 : 0.55),
            b: core ? 0.5 + Math.random() * 0.5 : 0.25 + Math.random() * 0.75
        });
    }
    return (t) => {
        br.clear();
        const cx = br.w / 2, cy = br.h / 2;
        const scale = br.w * 0.46;
        const tilt = 0.52;
        for (const st of stars) {
            let th;
            if (st.arm < 0) {
                th = st.th0 + t * 0.9;                       // bulge tumbles
            } else {
                const wind = Math.log(st.r * 8 + 1) * 2.6;   // spiral winding
                th = st.th0 * 0.12 + st.arm * Math.PI + wind + st.jitter
                   + t * 0.55 * Math.pow(st.r, -0.85) * 0.28;
            }
            const px = cx + Math.cos(th) * st.r * scale;
            const py = cy + Math.sin(th) * st.r * scale * tilt;
            br.plot(px, py, st.b, st.r < 0.2
                ? 'rgba(255,232,200,0.95)'
                : st.r < 0.55 ? 'rgba(207,224,255,0.85)' : 'rgba(143,184,255,0.7)');
        }
        // core glow
        br.plot(cx, cy, 1.4, '#fff6e0');
        br.plot(cx + 1, cy, 1.4, '#fff6e0');
        br.blit(0.2);
    };
});

// ============================================================
// 06 — supernova
// ============================================================
demo('d-supernova', 78, 22, 30, (s) => {
    const CYCLE = 18;
    const N = 600;
    const parts = [];
    let seededFor = -1;
    const phaseEl = document.getElementById('sn-phase');
    let lastPhase = '';

    function seed(cycle) {
        parts.length = 0;
        for (let i = 0; i < N; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 2.5 + Math.pow(Math.random(), 1.6) * 22;
            parts.push({
                x: 0, y: 0,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp * CELL_ASPECT,
                heat: 0.75 + Math.random() * 0.25,
                cool: 0.986 - Math.random() * 0.012
            });
        }
        seededFor = cycle;
    }

    function setPhase(p) {
        if (phaseEl && p !== lastPhase) { phaseEl.textContent = p; lastPhase = p; }
    }

    return (t, dt) => {
        s.clear();
        const cx = s.cols / 2, cy = s.rows / 2;
        const ct = t % CYCLE;
        const cycle = Math.floor(t / CYCLE);

        if (ct < 5) {
            // ---- quiescence: a star breathes ----
            setPhase('quiescence');
            const pulse = 0.8 + 0.2 * Math.sin(ct * 2.1);
            drawStar(cx, cy, 2.6 * pulse, 1);
        } else if (ct < 6.4) {
            // ---- collapse ----
            setPhase('collapse');
            const f = (ct - 5) / 1.4;
            const r = 2.6 * (1 - f * 0.75);
            const jit = f * 0.7;
            drawStar(cx + (Math.random() - 0.5) * jit, cy + (Math.random() - 0.5) * jit, r, 1 + f * 1.5);
        } else if (ct < 6.75) {
            // ---- detonation flash ----
            setPhase('detonation');
            if (seededFor !== cycle) seed(cycle);
            const f = (ct - 6.4) / 0.35;
            for (let y = 0; y < s.rows; y++)
                for (let x = 0; x < s.cols; x++) {
                    const d = Math.hypot((x - cx) * CELL_ASPECT, y - cy);
                    const b = clamp(1.4 - f - d * 0.04, 0, 1);
                    if (b > 0.1) s.set(x, y, RAMP[clamp((b * RAMP.length) | 0, 1, RAMP.length - 1)], HEAT[(b * 63) | 0]);
                }
        } else {
            // ---- remnant: debris + shockwave + pulsar ----
            setPhase(ct < 13 ? 'remnant' : 'cooling');
            if (seededFor !== cycle) seed(cycle);
            const et = ct - 6.75;
            for (const p of parts) {
                p.vx *= 0.988; p.vy *= 0.988;
                p.x += p.vx * dt; p.y += p.vy * dt;
                p.heat *= p.cool;
                if (p.heat < 0.03) continue;
                const b = clamp(p.heat, 0, 1);
                const ch = RAMP[clamp((b * RAMP.length) | 0, 1, RAMP.length - 1)];
                s.set(cx + p.x, cy + p.y, ch, HEAT[(b * 63) | 0]);
            }
            // shockwave ring, thinning as it grows
            const sr = et * 11;
            if (sr < s.cols * 0.75) {
                const alpha = clamp(1 - sr / (s.cols * 0.72), 0, 1) * 0.8;
                const steps = Math.max(24, sr * 6) | 0;
                for (let i = 0; i < steps; i++) {
                    const a = i / steps * Math.PI * 2;
                    const rx = cx + Math.cos(a) * sr / 1;
                    const ry = cy + Math.sin(a) * sr * CELL_ASPECT;
                    if (hash3(i, cycle, 1) > 0.35)
                        s.set(rx, ry, alpha > 0.5 ? ':' : '·', `rgba(143,216,232,${alpha.toFixed(2)})`);
                }
            }
            // the pulsar left behind
            if (et > 1.2) {
                const beat = (t * 2.4) % 1;
                if (beat < 0.22) {
                    s.set(cx, cy, '✦', '#f8f3e9');
                    if (beat < 0.1) {
                        s.set(cx - 2, cy, '–', 'rgba(143,216,232,0.5)');
                        s.set(cx + 2, cy, '–', 'rgba(143,216,232,0.5)');
                    }
                } else {
                    s.set(cx, cy, '·', 'rgba(248,243,233,0.5)');
                }
            }
        }

        function drawStar(x0, y0, r, boost) {
            for (let y = 0; y < s.rows; y++)
                for (let x = 0; x < s.cols; x++) {
                    const d = Math.hypot((x - x0) * CELL_ASPECT, y - y0);
                    if (d > r + 2.5) continue;
                    let b = clamp((1 - d / (r + 1)) * boost, 0, 1);
                    // flickering corona
                    if (d > r * 0.6) b *= 0.6 + 0.4 * noise3(x * 0.5, y * 0.5, t * 3);
                    if (b < 0.08) continue;
                    const ch = RAMP[clamp((b * RAMP.length) | 0, 1, RAMP.length - 1)];
                    s.set(x, y, ch, HEAT[(b * 63) | 0]);
                }
        }
    };
});

// ============================================================
// 07 — small rituals
// ============================================================

// spinner → orbit
demo('d-orbit', 30, 9, 30, (s) => {
    return (t) => {
        s.clear();
        const cx = 15, cy = 4;
        s.set(cx, cy, '@', '#f5a542');
        s.set(cx - 1, cy, '(', 'rgba(245,165,66,0.4)');
        s.set(cx + 1, cy, ')', 'rgba(245,165,66,0.4)');
        // moon + fading trail
        for (let k = 0; k < 7; k++) {
            const a = t * 2.6 - k * 0.22;
            const mx = cx + Math.cos(a) * 9;
            const my = cy + Math.sin(a) * 2.6;
            const ch = k === 0 ? '●' : k < 3 ? '·' : '·';
            const alpha = k === 0 ? 1 : 0.5 - k * 0.06;
            s.set(mx, my, ch, `rgba(143,216,232,${alpha.toFixed(2)})`);
        }
        s.text(10, 7, 'loading', 'rgba(168,159,143,0.8)');
        const dots = ((t * 2) | 0) % 4;
        s.text(17, 7, '...'.slice(0, dots), 'rgba(168,159,143,0.8)');
    };
});

// progress → launch
demo('d-launch', 30, 9, 30, (s) => {
    return (t) => {
        s.clear();
        const T = 6;
        const f = (t % T) / T;
        const ease = f < 0.85 ? Math.pow(f / 0.85, 1.6) : 1;
        const x = 2 + ease * 25;
        // exhaust
        for (let k = 1; k < 9; k++) {
            const ex = x - k;
            if (ex < 1) break;
            const ch = k < 2 ? '≋' : k < 4 ? '=' : k < 6 ? '~' : '·';
            const b = clamp(1 - k * 0.13, 0.1, 1);
            s.set(ex, 3, ch, HEAT[(b * 63) | 0]);
        }
        s.set(x, 3, '▸', '#f8f3e9');
        // the bar underneath
        const filled = (ease * 22) | 0;
        s.text(2, 6, '[' + '█'.repeat(filled) + '░'.repeat(22 - filled) + ']', 'rgba(245,165,66,0.75)');
        const pct = (ease * 100) | 0;
        s.text(26, 6, String(pct).padStart(3) + '%', '#e6ded0');
    };
});

// counter → pulsar
demo('d-pulsar', 30, 9, 30, (s) => {
    const wave = new Float32Array(30);
    let count = 0, lastBeat = -1;
    return (t) => {
        // scroll the trace
        for (let i = 0; i < 29; i++) wave[i] = wave[i + 1];
        const phase = (t * 1.4) % 1;
        const beatN = Math.floor(t * 1.4);
        wave[29] = phase < 0.12 ? 1 : phase < 0.2 ? -0.4 : (Math.random() - 0.5) * 0.12;
        if (beatN !== lastBeat) { count++; lastBeat = beatN; }
        s.clear();
        for (let x = 0; x < 30; x++) {
            const v = wave[x];
            const y = 3 - Math.round(v * 2.4);
            const hot = Math.abs(v) > 0.5;
            s.set(x, clamp(y, 0, 6), hot ? '█' : '─', hot ? '#8fd8e8' : 'rgba(143,216,232,0.35)');
        }
        s.text(2, 7, 'PSR B1919+21', 'rgba(168,159,143,0.7)');
        s.text(19, 7, 'n=' + String(count).padStart(5, '0'), '#f5a542');
    };
});

// reveal → decrypt
demo('d-decrypt', 30, 9, 24, (s) => {
    const MSG = 'hello, universe';
    const GLYPHS = '!<>-_\\/[]{}~=+*^?#$%&@';
    return (t) => {
        s.clear();
        const T = 6.5;
        const f = ((t % T) / T) * 1.35;
        const solved = clamp(f * MSG.length | 0, 0, MSG.length);
        s.text(2, 3, '> ', '#f5a542');
        for (let i = 0; i < MSG.length; i++) {
            if (i < solved) {
                s.set(4 + i, 3, MSG[i], '#e6ded0');
            } else if (i < solved + 3) {
                const g = GLYPHS[(hash3(i, (t * 14) | 0, 2) * GLYPHS.length) | 0];
                s.set(4 + i, 3, g, 'rgba(143,216,232,0.75)');
            }
        }
        if (solved >= MSG.length) {
            if (((t * 2) | 0) % 2) s.set(4 + MSG.length + 1, 3, '▍', '#f5a542');
        }
        s.text(2, 6, solved >= MSG.length ? 'signal decoded' : 'decrypting…', 'rgba(109,103,92,0.9)');
    };
});

// marquee → comet
demo('d-comet', 30, 9, 30, (s) => {
    const TAIL = '≈≈=~~--··';
    return (t) => {
        s.clear();
        const span = 44;
        const x = span - ((t * 9) % span);
        const y = 2 + Math.sin(t * 0.8) * 1.2;
        for (let k = 0; k < TAIL.length + 4; k++) {
            const tx = x + 1 + k;
            const ty = y + k * 0.1;
            if (tx < 0 || tx > 29) continue;
            const ch = k < TAIL.length ? TAIL[k] : '·';
            const a = clamp(1 - k * 0.09, 0.08, 1);
            s.set(tx, ty, ch, k < 3 ? HEAT[45] : `rgba(143,216,232,${a.toFixed(2)})`);
        }
        if (x >= 0 && x <= 29) s.set(x, y, '@', '#f8f3e9');
        // sparse background stars
        for (let i = 0; i < 12; i++) {
            const sx = (hash3(i, 0, 7) * 30) | 0, sy = (hash3(i, 1, 7) * 8) | 0;
            const tw = 0.5 + 0.5 * Math.sin(t * 2 + i * 2.4);
            if (tw > 0.5) s.set(sx, sy, '·', 'rgba(230,222,208,0.25)');
        }
        s.text(2, 7, 'periodic · returns in 76y', 'rgba(109,103,92,0.85)');
    };
});

// blink → eclipse
demo('d-eclipse', 30, 9, 24, (s) => {
    return (t) => {
        s.clear();
        const cx = 15, cy = 3.6, R = 2.8;
        // phase: the terminator sweeps across the disk
        const ph = (t * 0.35) % 2;               // 0..2
        const term = Math.cos(ph * Math.PI);     // 1 → -1 → 1
        const waning = ph > 1;
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 30; x++) {
                const dx = (x - cx) * CELL_ASPECT, dy = y - cy;
                const d2 = dx * dx + dy * dy;
                if (d2 > R * R) continue;
                const nx = dx / R;                       // -1 .. 1 across the disk
                const nz = Math.sqrt(Math.max(0, 1 - (d2 / (R * R))));
                const bright = (waning ? -nx : nx) > term * nz;
                if (bright) {
                    const sh = 0.55 + 0.45 * nz;
                    s.set(x, y, sh > 0.85 ? '@' : sh > 0.6 ? '#' : '+', `rgba(230,222,208,${sh.toFixed(2)})`);
                } else {
                    s.set(x, y, '·', 'rgba(109,103,92,0.35)');
                }
            }
        }
        const names = ['new', 'waxing', 'first quarter', 'gibbous', 'full', 'gibbous', 'last quarter', 'waning'];
        const idx = ((ph / 2) * 8) | 0;
        s.text(2, 8 - 1, ('phase: ' + names[idx % 8]).padEnd(26), 'rgba(109,103,92,0.9)');
    };
});

// ============================================================
// footer signature — drifting dust
// ============================================================
demo('d-signature', 60, 5, 16, (s) => {
    return (t) => {
        s.clear();
        for (let i = 0; i < 40; i++) {
            const x = (hash3(i, 0, 11) * 60 + t * (0.4 + hash3(i, 2, 11) * 1.2)) % 60;
            const y = (hash3(i, 1, 11) * 5) | 0;
            const tw = 0.5 + 0.5 * Math.sin(t * (1 + hash3(i, 3, 11) * 2) + i);
            if (tw > 0.4) s.set(x, y, tw > 0.85 ? '✦' : '·', `rgba(230,222,208,${(tw * 0.5).toFixed(2)})`);
        }
        s.text(24, 2, '~ fable ~', 'rgba(245,165,66,0.8)');
    };
});

// ============================================================
// background sky (static, drawn once)
// ============================================================
(function sky() {
    const c = document.getElementById('sky');
    if (!c) return;
    const draw = () => {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        c.width = innerWidth * dpr; c.height = innerHeight * dpr;
        const ctx = c.getContext('2d');
        ctx.scale(dpr, dpr);
        for (let i = 0; i < 160; i++) {
            const x = Math.random() * innerWidth, y = Math.random() * innerHeight;
            const r = Math.random();
            ctx.fillStyle = r > 0.9 ? 'rgba(245,165,66,0.5)' : `rgba(230,235,245,${0.1 + r * 0.35})`;
            ctx.fillRect(x, y, r > 0.95 ? 2 : 1, r > 0.95 ? 2 : 1);
        }
    };
    draw();
    let tmo;
    addEventListener('resize', () => { clearTimeout(tmo); tmo = setTimeout(draw, 200); });
})();

// ============================================================
// chrome: nav, scroll spy, reveals
// ============================================================
const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');
let menuOpen = false;

function closeMenu() {
    menuOpen = false;
    document.body.classList.remove('menu-open');
    nav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
}

menuToggle?.addEventListener('click', () => {
    menuOpen = !menuOpen;
    document.body.classList.toggle('menu-open', menuOpen);
    nav.classList.toggle('open', menuOpen);
    menuToggle.setAttribute('aria-expanded', String(menuOpen));
});

document.addEventListener('click', (e) => {
    if (menuOpen && !nav.contains(e.target) && !menuToggle.contains(e.target)) closeMenu();
});

const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelector(link.getAttribute('href'))
            ?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
        if (menuOpen) closeMenu();
    });
});

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); revealObserver.unobserve(en.target); } });
}, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.section, .pattern-item').forEach(el => revealObserver.observe(el));

const spy = new IntersectionObserver((entries) => {
    entries.forEach(en => {
        if (!en.isIntersecting) return;
        const id = en.target.id;
        navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
    });
}, { rootMargin: '-25% 0px -65% 0px' });
document.querySelectorAll('.section[id]').forEach(sec => spy.observe(sec));

document.querySelector('.scroll-indicator')?.addEventListener('click', () => {
    document.querySelector('.section')?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
});

// go
if (!REDUCED) requestAnimationFrame(mainLoop);

// console signature
console.log(
    '%c\n   ✦ terminal animation · the fable edition ✦\n' +
    '   sixteen live simulations · zero images\n' +
    '   the black hole is real ray tracing — view source\n',
    'color:#f5a542;font-family:monospace;font-size:12px;line-height:1.6');

})();
