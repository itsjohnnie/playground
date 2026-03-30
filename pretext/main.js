import { prepareWithSegments, layoutNextLine } from './lib/layout.js'

// ─── Config ─────────────────────────────────────────────────────────────────

const STAGE_W = 720
const STAGE_H = 640
const FONT = '18px Georgia, serif'
const MIN_LINE_W = 40
const PADDING = 14

const TEXT = `The orb moves through the paragraph the way a stone moves through water. \
Each line measures the distance to its surface and retreats exactly that far — no more, no less. \
There is no negotiation with the DOM here. The browser is not asked where things should go. \
Pretext has already weighed every word on a canvas scale, and now the math runs clean: \
radius squared minus delta-y squared, square root, done. \
Drag the sphere anywhere. The text does not "reflow" in the way you know reflow — \
no layout thrash, no style recalculation, no purple bars in the profiler. \
It simply recomputes the available width at each y-coordinate and asks the line-breaker for the next slice. \
The words you are reading right now were segmented once, measured once, cached once. \
Everything after that is arithmetic. This is what it feels like when text layout becomes a pure function: \
you can call it a thousand times a frame and the page will not flinch. \
Move the orb into the margin and watch the column heal itself; pull it through the center and watch the lines part. \
The shape of the void is a circle, but it could be anything — a blob, a spline, the silhouette of a hand. \
All the line-breaker needs is a number: how wide is this row allowed to be? \
You provide the number. Pretext provides the line.`

const ORB_PALETTE = [
    { base: '80, 120, 255', glow: '100, 150, 255' },
    { base: '255, 100, 180', glow: '255, 140, 200' },
    { base: '100, 220, 160', glow: '140, 255, 200' },
    { base: '255, 180, 80', glow: '255, 210, 130' },
    { base: '180, 120, 255', glow: '200, 160, 255' },
]

// ─── Shared state & DOM ─────────────────────────────────────────────────────

const prepared = prepareWithSegments(TEXT, FONT)

const stage = document.getElementById('stage')
const textLayer = document.getElementById('text-layer')
const orbLayer = document.getElementById('orb-layer')
const liquidCanvas = document.getElementById('liquid-canvas')
const perfEl = document.getElementById('perf')
const lineCountEl = document.getElementById('line-count')

liquidCanvas.width = STAGE_W
liquidCanvas.height = STAGE_H
const liquidCtx = liquidCanvas.getContext('2d')

const state = {
    mode: 'static',
    lineHeight: 26,
    mouseX: STAGE_W / 2,
    mouseY: STAGE_H / 2,
    mouseIn: false,
}

// ─── Line pool with diffed writes ───────────────────────────────────────────

const linePool = []
function getLine(i) {
    let slot = linePool[i]
    if (!slot) {
        const el = document.createElement('div')
        el.className = 'line'
        textLayer.appendChild(el)
        slot = linePool[i] = { el, text: '', x: 0, y: 0, heat: -1 }
    }
    return slot
}

function writeLine(slot, text, x, y, heat) {
    if (slot.text !== text) { slot.el.textContent = text; slot.text = text }
    if (slot.x !== x || slot.y !== y) {
        slot.el.style.transform = `translate(${x}px, ${y}px)`
        slot.x = x; slot.y = y
    }
    if (slot.heat !== heat) {
        slot.el.style.color = heat > 0.02
            ? `rgb(${196 + heat * 59}, ${200 + heat * 40}, ${212 + heat * 43})`
            : '#c4c8d4'
        slot.heat = heat
    }
}

function hideLine(slot) {
    if (slot.y !== -9999) {
        slot.el.style.transform = 'translate(-9999px, -9999px)'
        slot.x = slot.y = -9999
    }
}

// ─── Orb pool ───────────────────────────────────────────────────────────────

const orbPool = []
function getOrb(i) {
    let slot = orbPool[i]
    if (!slot) {
        const el = document.createElement('div')
        el.className = 'orb'
        orbLayer.appendChild(el)
        slot = orbPool[i] = { el, r: -1, color: -1, hidden: false }
    }
    return slot
}

function paintOrb(slot, x, y, r, colorIdx) {
    if (slot.r !== r || slot.color !== colorIdx) {
        const c = ORB_PALETTE[colorIdx % ORB_PALETTE.length]
        const d = r * 2
        slot.el.style.width = `${d}px`
        slot.el.style.height = `${d}px`
        slot.el.style.background = `radial-gradient(circle at 35% 35%, rgba(${c.glow}, 0.9), rgba(${c.base}, 0.55) 40%, rgba(${c.base}, 0.2) 70%, transparent)`
        slot.el.style.boxShadow = `0 0 40px 10px rgba(${c.glow}, 0.35), 0 0 80px 20px rgba(${c.base}, 0.18), inset -20px -20px 40px rgba(0, 0, 20, 0.4)`
        slot.r = r
        slot.color = colorIdx
    }
    if (slot.hidden) { slot.el.style.display = ''; slot.hidden = false }
    slot.el.style.transform = `translate(${x - r}px, ${y - r}px)`
}

function hideOrbsFrom(i) {
    for (; i < orbPool.length; i++) {
        const slot = orbPool[i]
        if (!slot.hidden) { slot.el.style.display = 'none'; slot.hidden = true }
    }
}

// ─── Geometry helpers ───────────────────────────────────────────────────────

function halfChord(r, dy) {
    const d2 = r * r - dy * dy
    return d2 > 0 ? Math.sqrt(d2) : 0
}

// Given blocked intervals on [0, STAGE_W], return the open gaps ≥ MIN_LINE_W.
function freeSegments(blocked) {
    if (blocked.length === 0) return [{ x: 0, w: STAGE_W }]

    blocked.sort((a, b) => a.lo - b.lo)
    const merged = [{ lo: blocked[0].lo, hi: blocked[0].hi }]
    for (let i = 1; i < blocked.length; i++) {
        const prev = merged[merged.length - 1]
        const cur = blocked[i]
        if (cur.lo <= prev.hi) prev.hi = Math.max(prev.hi, cur.hi)
        else merged.push({ lo: cur.lo, hi: cur.hi })
    }

    const gaps = []
    let cursor = 0
    for (const { lo, hi } of merged) {
        const w = lo - cursor
        if (w >= MIN_LINE_W) gaps.push({ x: cursor, w })
        cursor = hi
    }
    const tail = STAGE_W - cursor
    if (tail >= MIN_LINE_W) gaps.push({ x: cursor, w: tail })
    return gaps
}

// Shared: single-orb segment calculation (used by static + follow).
function orbSegments(x, y, r, midY) {
    const hc = halfChord(r + PADDING, midY - y)
    if (hc === 0) return [{ x: 0, w: STAGE_W }]
    return freeSegments([{ lo: x - hc, hi: x + hc }])
}

function orbHeat(ox, oy, r, x, w, midY) {
    const dist = Math.hypot(x + w / 2 - ox, midY - oy)
    return Math.max(0, 1 - dist / ((r + PADDING) * 2.2))
}

// ═══ MODE: Static ═══════════════════════════════════════════════════════════
// Orb stays where you put it. Drag to move. No springs, no physics — just the
// geometry on display.

const staticMode = {
    x: STAGE_W / 2, y: STAGE_H / 2,
    radius: 90,
    dragging: false,
    dragDX: 0, dragDY: 0,
    dirty: true,

    update() {}, // nothing moves on its own

    segments(midY) { return orbSegments(this.x, this.y, this.radius, midY) },
    heat(x, w, midY) { return orbHeat(this.x, this.y, this.radius, x, w, midY) },

    paint() {
        paintOrb(getOrb(0), this.x, this.y, this.radius, 0)
        hideOrbsFrom(1)
    },

    get animated() { return false },
}

// ═══ MODE: Follow ═══════════════════════════════════════════════════════════
// Orb drifts toward the cursor on a soft spring. The whole point here is how
// unhurried it feels — low stiffness, heavy damping.

const followMode = {
    x: STAGE_W / 2, y: STAGE_H / 2, vx: 0, vy: 0,
    radius: 90,

    // Very low stiffness and near-critical damping for a slow, dreamy drift.
    update(dt) {
        const k = 18, d = 6
        const decay = Math.exp(-d * dt)
        this.vx = (this.vx + (state.mouseX - this.x) * k * dt) * decay
        this.vy = (this.vy + (state.mouseY - this.y) * k * dt) * decay
        this.x += this.vx * dt
        this.y += this.vy * dt
    },

    segments(midY) { return orbSegments(this.x, this.y, this.radius, midY) },
    heat(x, w, midY) { return orbHeat(this.x, this.y, this.radius, x, w, midY) },

    paint() {
        paintOrb(getOrb(0), this.x, this.y, this.radius, 4)
        hideOrbsFrom(1)
    },

    get animated() { return true },
}

// ═══ MODE: Swarm ════════════════════════════════════════════════════════════
// N orbs bounce and collide. Each row merges all orb chords into blocked
// intervals, then threads text through the gaps.

const swarmMode = {
    orbs: [],
    count: 3,
    speed: 1.0,

    init() {
        this.orbs = []
        for (let i = 0; i < this.count; i++) {
            const r = 45 + Math.random() * 35
            this.orbs.push({
                x: r + Math.random() * (STAGE_W - r * 2),
                y: r + Math.random() * (STAGE_H - r * 2),
                vx: (Math.random() - 0.5) * 200,
                vy: (Math.random() - 0.5) * 200,
                r, color: i,
            })
        }
    },

    kick() {
        for (const o of this.orbs) {
            o.vx += (Math.random() - 0.5) * 400
            o.vy += (Math.random() - 0.5) * 400
        }
    },

    update(dt) {
        const s = this.speed
        for (const o of this.orbs) {
            o.x += o.vx * dt * s
            o.y += o.vy * dt * s
            if (o.x - o.r < 0)       { o.x = o.r;           o.vx = Math.abs(o.vx) }
            if (o.x + o.r > STAGE_W) { o.x = STAGE_W - o.r; o.vx = -Math.abs(o.vx) }
            if (o.y - o.r < 0)       { o.y = o.r;           o.vy = Math.abs(o.vy) }
            if (o.y + o.r > STAGE_H) { o.y = STAGE_H - o.r; o.vy = -Math.abs(o.vy) }
        }
        for (let i = 0; i < this.orbs.length; i++) {
            for (let j = i + 1; j < this.orbs.length; j++) {
                const a = this.orbs[i], b = this.orbs[j]
                const dx = b.x - a.x, dy = b.y - a.y
                const dist = Math.hypot(dx, dy)
                const minDist = a.r + b.r
                if (dist < minDist && dist > 0) {
                    const nx = dx / dist, ny = dy / dist
                    const overlap = (minDist - dist) / 2
                    a.x -= nx * overlap; a.y -= ny * overlap
                    b.x += nx * overlap; b.y += ny * overlap
                    const avn = a.vx * nx + a.vy * ny
                    const bvn = b.vx * nx + b.vy * ny
                    a.vx += (bvn - avn) * nx; a.vy += (bvn - avn) * ny
                    b.vx += (avn - bvn) * nx; b.vy += (avn - bvn) * ny
                }
            }
        }
    },

    segments(midY) {
        const blocked = []
        for (const o of this.orbs) {
            const hc = halfChord(o.r + PADDING, midY - o.y)
            if (hc > 0) blocked.push({ lo: o.x - hc, hi: o.x + hc })
        }
        return freeSegments(blocked)
    },

    heat(x, w, midY) {
        let h = 0
        for (const o of this.orbs) {
            const dist = Math.hypot(x + w / 2 - o.x, midY - o.y)
            h = Math.max(h, 1 - dist / ((o.r + PADDING) * 2))
        }
        return Math.max(0, h)
    },

    paint() {
        let i = 0
        for (const o of this.orbs) paintOrb(getOrb(i++), o.x, o.y, o.r, o.color)
        hideOrbsFrom(i)
    },

    get animated() { return true },
}

swarmMode.init()

// ═══ MODE: Liquid ═══════════════════════════════════════════════════════════
// SPH fluid simulation — ~150 particles with density pressure and near-
// pressure forces, adapted from the /liquid demo. Gravity pulls toward the
// cursor. Each particle blocks text as a small circle; freeSegments() merges
// them into one organic mass so the text flows around the whole blob, not
// individual droplets.

const SPH = {
    COUNT: 150,
    INTERACT_R: 22,
    INTERACT_R2: 22 * 22,
    REST_DENSITY: 3,
    K: 0.08,       // pressure stiffness
    K_NEAR: 0.12,  // near-pressure (keeps particles from stacking)
    GRAVITY: 900,
    DAMP: 3.5,     // velocity decay /s
    BLOCK_R: 20,   // radius each particle blocks text with (> visual r so the cloud reads as one mass)
}

const liquidMode = {
    particles: [],
    gx: 0, gy: SPH.GRAVITY, // smoothed gravity vector

    init() {
        this.particles = []
        const cx = STAGE_W / 2, cy = STAGE_H / 2
        for (let i = 0; i < SPH.COUNT; i++) {
            const a = Math.random() * Math.PI * 2
            const r = Math.sqrt(Math.random()) * 80
            this.particles.push({
                x: cx + Math.cos(a) * r,
                y: cy + Math.sin(a) * r,
                vx: 0, vy: 0,
                px: 0, py: 0, // previous position, for Verlet-ish velocity derivation
            })
        }
        this.gx = 0
        this.gy = SPH.GRAVITY
    },

    update(dt) {
        dt = Math.min(dt, 1 / 60) // fluid sims hate big steps
        const P = this.particles

        // Gravity direction eases toward the cursor when the mouse is inside.
        let tgx = 0, tgy = SPH.GRAVITY
        if (state.mouseIn) {
            const dx = state.mouseX - STAGE_W / 2
            const dy = state.mouseY - STAGE_H / 2
            const len = Math.hypot(dx, dy) || 1
            tgx = (dx / len) * SPH.GRAVITY
            tgy = (dy / len) * SPH.GRAVITY
        }
        // Very slow easing so tilt changes feel heavy.
        const ease = 1 - Math.exp(-2 * dt)
        this.gx += (tgx - this.gx) * ease
        this.gy += (tgy - this.gy) * ease

        // 1. Apply gravity + damping, save old position, integrate.
        const decay = Math.exp(-SPH.DAMP * dt)
        for (const p of P) {
            p.vx = (p.vx + this.gx * dt) * decay
            p.vy = (p.vy + this.gy * dt) * decay
            p.px = p.x; p.py = p.y
            p.x += p.vx * dt
            p.y += p.vy * dt
        }

        // 2. Double-density relaxation (Clavet et al. 2005). O(n²) — fine at 150.
        for (let i = 0; i < P.length; i++) {
            const a = P[i]
            let density = 0, nearDensity = 0
            // neighbours + their kernel weights, collected once
            const nbs = []
            for (let j = 0; j < P.length; j++) {
                if (i === j) continue
                const b = P[j]
                const dx = b.x - a.x, dy = b.y - a.y
                const d2 = dx * dx + dy * dy
                if (d2 >= SPH.INTERACT_R2) continue
                const d = Math.sqrt(d2)
                const q = 1 - d / SPH.INTERACT_R
                density += q * q
                nearDensity += q * q * q
                nbs.push({ b, dx, dy, d, q })
            }
            const pressure = SPH.K * (density - SPH.REST_DENSITY)
            const nearPressure = SPH.K_NEAR * nearDensity
            for (const { b, dx, dy, d, q } of nbs) {
                if (d === 0) continue
                const disp = (pressure * q + nearPressure * q * q) * 0.5
                const nx = dx / d, ny = dy / d
                a.x -= nx * disp; a.y -= ny * disp
                b.x += nx * disp; b.y += ny * disp
            }
        }

        // 3. Walls + derive velocity from position delta.
        const wall = 4
        for (const p of P) {
            if (p.x < wall) p.x = wall
            else if (p.x > STAGE_W - wall) p.x = STAGE_W - wall
            if (p.y < wall) p.y = wall
            else if (p.y > STAGE_H - wall) p.y = STAGE_H - wall
            p.vx = (p.x - p.px) / dt
            p.vy = (p.y - p.py) / dt
        }
    },

    segments(midY) {
        const blocked = []
        for (const p of this.particles) {
            const hc = halfChord(SPH.BLOCK_R, midY - p.y)
            if (hc > 0) blocked.push({ lo: p.x - hc, hi: p.x + hc })
        }
        return freeSegments(blocked)
    },

    heat(x, w, midY) {
        let minD2 = Infinity
        const cx = x + w / 2
        for (const p of this.particles) {
            const dx = cx - p.x, dy = midY - p.y
            const d2 = dx * dx + dy * dy
            if (d2 < minD2) minD2 = d2
        }
        return Math.max(0, 1 - Math.sqrt(minD2) / 80)
    },

    paint() {
        hideOrbsFrom(0)
        const ctx = liquidCtx
        ctx.clearRect(0, 0, STAGE_W, STAGE_H)

        // Soft blobs: overdrawn radial gradients on a lighter blend give
        // a cheap metaball look without a WebGL pass.
        ctx.globalCompositeOperation = 'lighter'
        for (const p of this.particles) {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16)
            g.addColorStop(0, 'rgba(120, 200, 255, 0.25)')
            g.addColorStop(1, 'rgba(120, 200, 255, 0)')
            ctx.fillStyle = g
            ctx.beginPath()
            ctx.arc(p.x, p.y, 16, 0, Math.PI * 2)
            ctx.fill()
        }
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = 'rgba(200, 240, 255, 0.9)'
        for (const p of this.particles) {
            ctx.beginPath()
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
            ctx.fill()
        }
    },

    get animated() { return true },
}

liquidMode.init()

const modes = { static: staticMode, follow: followMode, swarm: swarmMode, liquid: liquidMode }

// ─── Generic render loop ────────────────────────────────────────────────────
// Every mode answers the same question: "what segments are open at this y?"
// render() walks rows, asks, and feeds each segment to layoutNextLine().

function render(mode) {
    const t0 = performance.now()

    let cursor = { segmentIndex: 0, graphemeIndex: 0 }
    let lineIndex = 0
    let done = false

    for (let y = 0; y < STAGE_H && !done; y += state.lineHeight) {
        const midY = y + state.lineHeight / 2
        const segs = mode.segments(midY)

        for (const seg of segs) {
            if (done) break
            const line = layoutNextLine(prepared, cursor, seg.w)
            if (line === null) { done = true; break }

            const heat = mode.heat(seg.x, line.width, midY)
            writeLine(getLine(lineIndex++), line.text, seg.x, y, heat)
            cursor = line.end
        }
    }

    for (let i = lineIndex; i < linePool.length; i++) hideLine(linePool[i])

    perfEl.textContent = `${(performance.now() - t0).toFixed(3)} ms`
    lineCountEl.textContent = lineIndex
}

let lastT = performance.now()
function tick(now) {
    const dt = Math.min((now - lastT) / 1000, 1 / 30)
    lastT = now

    const mode = modes[state.mode]
    mode.update(dt)

    // Static mode only repaints when dragged; others animate continuously.
    if (mode.animated || staticMode.dirty) {
        mode.paint()
        render(mode)
        staticMode.dirty = false
    }

    requestAnimationFrame(tick)
}

// ─── Input ──────────────────────────────────────────────────────────────────

function stagePos(e) {
    const r = stage.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
}

stage.addEventListener('pointermove', e => {
    const { x, y } = stagePos(e)
    state.mouseX = x
    state.mouseY = y

    if (staticMode.dragging) {
        staticMode.x = x + staticMode.dragDX
        staticMode.y = y + staticMode.dragDY
        staticMode.dirty = true
    }
})

stage.addEventListener('pointerenter', () => { state.mouseIn = true })
stage.addEventListener('pointerleave', () => { state.mouseIn = false })

stage.addEventListener('pointerdown', e => {
    if (state.mode !== 'static') return
    const { x, y } = stagePos(e)
    const dist = Math.hypot(x - staticMode.x, y - staticMode.y)
    if (dist <= staticMode.radius) {
        staticMode.dragging = true
        staticMode.dragDX = staticMode.x - x
        staticMode.dragDY = staticMode.y - y
        stage.setPointerCapture(e.pointerId)
        stage.classList.add('grabbing')
    }
})

window.addEventListener('pointerup', () => {
    staticMode.dragging = false
    stage.classList.remove('grabbing')
})

function setMode(m) {
    state.mode = m
    document.body.dataset.mode = m
    document.querySelectorAll('[data-set-mode]').forEach(b =>
        b.classList.toggle('active', b.dataset.setMode === m))
    liquidCanvas.style.display = m === 'liquid' ? 'block' : 'none'
    if (m === 'liquid') liquidMode.init()
    else liquidCtx.clearRect(0, 0, STAGE_W, STAGE_H)
    if (m === 'swarm') swarmMode.init()
    staticMode.dirty = true
}

document.querySelectorAll('[data-set-mode]').forEach(btn =>
    btn.addEventListener('click', () => setMode(btn.dataset.setMode)))

function bindSlider(id, obj, key, onChange) {
    const el = document.getElementById(id)
    const label = document.getElementById(`${id}-val`)
    el.addEventListener('input', () => {
        obj[key] = Number(el.value)
        label.textContent = el.value
        onChange?.()
    })
}

bindSlider('lh', state, 'lineHeight', () => { staticMode.dirty = true })
bindSlider('static-radius', staticMode, 'radius', () => { staticMode.dirty = true })
bindSlider('follow-radius', followMode, 'radius')
bindSlider('swarm-count', swarmMode, 'count', () => swarmMode.init())
bindSlider('swarm-speed', swarmMode, 'speed')

document.getElementById('swarm-kick').addEventListener('click', () => swarmMode.kick())
document.getElementById('liquid-reset').addEventListener('click', () => liquidMode.init())

// ─── Boot ───────────────────────────────────────────────────────────────────

document.fonts.ready.then(() => {
    setMode('static')
    lastT = performance.now()
    requestAnimationFrame(tick)
})
