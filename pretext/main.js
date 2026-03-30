import { prepareWithSegments, layoutNextLine } from './lib/layout.js'

// ─── Config ─────────────────────────────────────────────────────────────────

const STAGE_W = 720
const STAGE_H = 640
const FONT = '18px Georgia, serif'
const MIN_LINE_W = 40

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

// ─── State ──────────────────────────────────────────────────────────────────

const state = {
    orbX: 160,
    orbY: 200,
    radius: 90,
    padding: 16,
    lineHeight: 26,
    velX: 0,
    velY: 0,
    targetX: 160,
    targetY: 200,
    dragging: false,
    dirty: true,
}

// ─── DOM refs & setup ───────────────────────────────────────────────────────

const stage = document.getElementById('stage')
const textLayer = document.getElementById('text-layer')
const orbEl = document.getElementById('orb')
const perfEl = document.getElementById('perf')
const lineCountEl = document.getElementById('line-count')

const prepared = prepareWithSegments(TEXT, FONT)

// Pooled line nodes. We track last-written values to skip redundant DOM writes
// (textContent assignment forces a text-node replacement even when unchanged).
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
    if (slot.text !== text) {
        slot.el.textContent = text
        slot.text = text
    }
    if (slot.x !== x || slot.y !== y) {
        slot.el.style.transform = `translate(${x}px, ${y}px)`
        slot.x = x
        slot.y = y
    }
    if (slot.heat !== heat) {
        slot.el.style.color = heat > 0.05
            ? `rgb(${196 + heat * 59}, ${200 + heat * 40}, ${212 + heat * 43})`
            : '#c4c8d4'
        slot.heat = heat
    }
}

function hideLine(slot) {
    if (slot.y !== -9999) {
        slot.el.style.transform = 'translate(-9999px, -9999px)'
        slot.x = -9999
        slot.y = -9999
    }
}

// ─── Core: two-sided text flow around the orb ───────────────────────────────
//
// layoutNextLine() is just an iterator over the word stream — it doesn't know
// or care where the line will be drawn. That means we can call it twice on the
// same row: once for the gap left of the orb, once for the gap right of it.
// Reading order stays correct (left fragment → right fragment → next row).

function render() {
    const t0 = performance.now()

    const r = state.radius + state.padding
    const cx = state.orbX
    const cy = state.orbY

    let cursor = { segmentIndex: 0, graphemeIndex: 0 }
    let lineIndex = 0
    let done = false

    // Closure so emit() doesn't need 9 positional args.
    function emit(x, width, y, midY) {
        const line = layoutNextLine(prepared, cursor, width)
        if (line === null) { done = true; return }
        const dist = Math.hypot(x + line.width / 2 - cx, midY - cy)
        const heat = Math.max(0, 1 - dist / (r * 2.2))
        writeLine(getLine(lineIndex++), line.text, x, y, heat)
        cursor = line.end
    }

    for (let y = 0; y < STAGE_H && !done; y += state.lineHeight) {
        const midY = y + state.lineHeight / 2
        const dy = midY - cy

        if (Math.abs(dy) >= r) {
            emit(0, STAGE_W, y, midY)
            continue
        }

        const halfChord = Math.sqrt(r * r - dy * dy)
        const orbLeft = cx - halfChord
        const orbRight = cx + halfChord

        if (orbLeft >= MIN_LINE_W) emit(0, orbLeft, y, midY)
        if (!done && STAGE_W - orbRight >= MIN_LINE_W) emit(Math.max(0, orbRight), STAGE_W - orbRight, y, midY)
        // If neither gap is wide enough, the row stays empty — orb fully blocks it.
    }

    for (let i = lineIndex; i < linePool.length; i++) hideLine(linePool[i])

    const elapsed = performance.now() - t0
    perfEl.textContent = `${elapsed.toFixed(3)} ms`
    lineCountEl.textContent = lineIndex
}

// ─── Orb: frame-rate-independent spring ─────────────────────────────────────

// Per-second stiffness/damping so 60Hz and 120Hz feel identical. The classic
// velocity-verlet-ish spring, scaled by dt. damp is applied as a per-second
// decay via Math.pow so it's stable across refresh rates.
const SPRING_K = 220    // stiffness (higher = snappier)
const SPRING_D = 18     // damping (per second, as half-life-ish factor)
const SETTLE_EPS = 0.05 // px of combined vel+offset below which we stop

function updateOrbSize() {
    const d = state.radius * 2
    orbEl.style.width = `${d}px`
    orbEl.style.height = `${d}px`
}

function updateOrbPosition() {
    orbEl.style.transform = `translate(${state.orbX - state.radius}px, ${state.orbY - state.radius}px)`
}

let lastT = performance.now()

function tick(now) {
    const dt = Math.min((now - lastT) / 1000, 1 / 30) // clamp for tab-switch stalls
    lastT = now

    const dx = state.targetX - state.orbX
    const dy = state.targetY - state.orbY
    const decay = Math.exp(-SPRING_D * dt)

    state.velX = (state.velX + dx * SPRING_K * dt) * decay
    state.velY = (state.velY + dy * SPRING_K * dt) * decay
    state.orbX += state.velX * dt
    state.orbY += state.velY * dt

    const moving =
        Math.abs(state.velX) + Math.abs(state.velY) +
        Math.abs(dx) + Math.abs(dy) > SETTLE_EPS

    if (moving || state.dirty) {
        updateOrbPosition()
        render()
        state.dirty = false
    }

    requestAnimationFrame(tick)
}

// ─── Input ──────────────────────────────────────────────────────────────────

function pointerPos(e) {
    const rect = stage.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

orbEl.addEventListener('pointerdown', e => {
    state.dragging = true
    orbEl.classList.add('dragging')
    orbEl.setPointerCapture(e.pointerId)
})

window.addEventListener('pointermove', e => {
    if (!state.dragging) return
    const { x, y } = pointerPos(e)
    state.targetX = x
    state.targetY = y
})

window.addEventListener('pointerup', () => {
    state.dragging = false
    orbEl.classList.remove('dragging')
})

function bindSlider(id, key) {
    const el = document.getElementById(id)
    const label = document.getElementById(`${id}-val`)
    el.addEventListener('input', () => {
        state[key] = Number(el.value)
        label.textContent = el.value
        state.dirty = true
    })
}

bindSlider('radius', 'radius')
bindSlider('padding', 'padding')
bindSlider('lh', 'lineHeight')

document.getElementById('radius').addEventListener('input', updateOrbSize)

// ─── Boot ───────────────────────────────────────────────────────────────────

document.fonts.ready.then(() => {
    updateOrbSize()
    lastT = performance.now()
    requestAnimationFrame(tick)
})
