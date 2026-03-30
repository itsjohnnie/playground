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
const ringEl = document.getElementById('ring')
const perfEl = document.getElementById('perf')
const lineCountEl = document.getElementById('line-count')

const state = {
    mode: 'orb',
    lineHeight: 26,
    mouseX: STAGE_W / 2,
    mouseY: STAGE_H / 2,
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
    // Size & color rarely change — diff them to avoid reparsing gradient
    // strings every frame.
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

// Half-chord of a circle at vertical offset dy from center. Zero if outside.
function halfChord(r, dy) {
    const d2 = r * r - dy * dy
    return d2 > 0 ? Math.sqrt(d2) : 0
}

// Given blocked intervals on [0, STAGE_W], return the open gaps ≥ MIN_LINE_W.
// Intervals may overlap; we merge them first.
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

// ═══ MODE: Orb ══════════════════════════════════════════════════════════════
// Single sphere follows the mouse with a spring. Text parts around it on both
// sides — two layoutNextLine() calls per intersecting row.

const orbMode = {
    x: 160, y: 200, vx: 0, vy: 0,
    radius: 90,

    update(dt) {
        const k = 220, d = 18
        const decay = Math.exp(-d * dt)
        this.vx = (this.vx + (state.mouseX - this.x) * k * dt) * decay
        this.vy = (this.vy + (state.mouseY - this.y) * k * dt) * decay
        this.x += this.vx * dt
        this.y += this.vy * dt
    },

    segments(midY) {
        const r = this.radius + PADDING
        const hc = halfChord(r, midY - this.y)
        if (hc === 0) return [{ x: 0, w: STAGE_W }]
        return freeSegments([{ lo: this.x - hc, hi: this.x + hc }])
    },

    heat(x, w, midY) {
        const dist = Math.hypot(x + w / 2 - this.x, midY - this.y)
        return Math.max(0, 1 - dist / ((this.radius + PADDING) * 2.2))
    },

    paint() {
        paintOrb(getOrb(0), this.x, this.y, this.radius, 0)
        hideOrbsFrom(1)
    },
}

// ═══ MODE: Vessel ═══════════════════════════════════════════════════════════
// Text fills the INSIDE of a circle. Each line's width is the chord at that y.
// The circle breathes — its radius oscillates on a sine wave.

const vesselMode = {
    depth: 40,   // amplitude of the breathing oscillation, in px
    speed: 0.6,  // cycles per second
    t: 0,
    r: 0,        // current radius, set in update()

    update(dt) {
        this.t += dt * this.speed
        this.r = Math.min(STAGE_W, STAGE_H) / 2 - 10 + Math.sin(this.t * Math.PI * 2) * this.depth
    },

    segments(midY) {
        const hc = halfChord(this.r, midY - STAGE_H / 2)
        if (hc < MIN_LINE_W / 2) return []
        return [{ x: STAGE_W / 2 - hc, w: hc * 2 }]
    },

    heat(x, w, midY) {
        // Edge lines (short chords near poles) glow brighter.
        return Math.max(0, 1 - w / STAGE_W)
    },

    paint() {
        const d = this.r * 2
        ringEl.style.width = `${d}px`
        ringEl.style.height = `${d}px`
        ringEl.style.transform = `translate(${STAGE_W / 2 - this.r}px, ${STAGE_H / 2 - this.r}px)`
        hideOrbsFrom(0)
    },
}

// ═══ MODE: Swarm ════════════════════════════════════════════════════════════
// N orbs bounce around with simple physics and collide. Each row computes ALL
// orb chords, merges the blocked intervals, and flows text through every gap.
// This is where it gets wild — one row might have 4 text fragments threading
// between 3 orbs.

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
                r,
                color: i,
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
            // Walls
            if (o.x - o.r < 0)       { o.x = o.r;           o.vx = Math.abs(o.vx) }
            if (o.x + o.r > STAGE_W) { o.x = STAGE_W - o.r; o.vx = -Math.abs(o.vx) }
            if (o.y - o.r < 0)       { o.y = o.r;           o.vy = Math.abs(o.vy) }
            if (o.y + o.r > STAGE_H) { o.y = STAGE_H - o.r; o.vy = -Math.abs(o.vy) }
        }
        // O(n²) elastic-ish collisions — fine for ≤8 orbs.
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
                    // Swap velocity components along the collision normal.
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
}

swarmMode.init()

const modes = { orb: orbMode, vessel: vesselMode, swarm: swarmMode }

// ─── Generic render loop ────────────────────────────────────────────────────
// All three modes funnel through the same pipeline: ask the mode for the open
// segments at each row, then call layoutNextLine() once per segment. The mode
// handles geometry; this function only handles text.

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
    mode.paint()
    render(mode)

    requestAnimationFrame(tick)
}

// ─── Input ──────────────────────────────────────────────────────────────────

stage.addEventListener('pointermove', e => {
    const rect = stage.getBoundingClientRect()
    state.mouseX = e.clientX - rect.left
    state.mouseY = e.clientY - rect.top
})

document.querySelectorAll('[data-set-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
        state.mode = btn.dataset.setMode
        document.body.dataset.mode = state.mode
        document.querySelectorAll('[data-set-mode]').forEach(b => b.classList.toggle('active', b === btn))
        if (state.mode === 'swarm') swarmMode.init()
    })
})

function bindSlider(id, obj, key, onChange) {
    const el = document.getElementById(id)
    const label = document.getElementById(`${id}-val`)
    el.addEventListener('input', () => {
        obj[key] = Number(el.value)
        label.textContent = el.value
        onChange?.()
    })
}

bindSlider('lh', state, 'lineHeight')
bindSlider('orb-radius', orbMode, 'radius')
bindSlider('vessel-depth', vesselMode, 'depth')
bindSlider('vessel-speed', vesselMode, 'speed')
bindSlider('swarm-count', swarmMode, 'count', () => swarmMode.init())
bindSlider('swarm-speed', swarmMode, 'speed')

document.getElementById('swarm-kick').addEventListener('click', () => swarmMode.kick())

// ─── Boot ───────────────────────────────────────────────────────────────────

document.fonts.ready.then(() => {
    lastT = performance.now()
    requestAnimationFrame(tick)
})
