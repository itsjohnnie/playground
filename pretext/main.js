import { prepareWithSegments, layoutNextLine } from './lib/layout.js'

// ─── Config ─────────────────────────────────────────────────────────────────

const STAGE_W = 720
const STAGE_H = 640
const FONT = '18px Georgia, serif'
const MIN_LINE_W = 40 // below this, skip the line entirely (orb fully blocks it)

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
    // spring physics for the orb (adds a bit of life)
    velX: 0,
    velY: 0,
    targetX: 160,
    targetY: 200,
    dragging: false,
}

// ─── DOM refs & setup ───────────────────────────────────────────────────────

const stage = document.getElementById('stage')
const textLayer = document.getElementById('text-layer')
const orbEl = document.getElementById('orb')
const perfEl = document.getElementById('perf')
const lineCountEl = document.getElementById('line-count')

// Prepare text ONCE. This is the "expensive" ~ms-scale call that segments
// the text, measures each word on canvas, and caches everything.
const prepared = prepareWithSegments(TEXT, FONT)

// Pool of line divs — reuse DOM nodes across frames instead of recreating.
const linePool = []
function getLine(i) {
    if (!linePool[i]) {
        const el = document.createElement('div')
        el.className = 'line'
        textLayer.appendChild(el)
        linePool[i] = el
    }
    return linePool[i]
}

// ─── Core: variable-width text flow ─────────────────────────────────────────

function render() {
    const t0 = performance.now()

    const r = state.radius + state.padding
    const cx = state.orbX
    const cy = state.orbY

    let cursor = { segmentIndex: 0, graphemeIndex: 0 }
    let y = 0
    let lineIndex = 0

    while (y < STAGE_H) {
        // Find the intersection of the orb's circle with this row's vertical band.
        // We check the line's mid-point for a clean reading.
        const dy = y + state.lineHeight / 2 - cy
        let leftEdge = 0
        let available = STAGE_W

        if (Math.abs(dy) < r) {
            // Half-chord of the circle at this y. Basic Pythagoras.
            const halfChord = Math.sqrt(r * r - dy * dy)
            const orbLeft = cx - halfChord
            const orbRight = cx + halfChord

            if (orbLeft <= 0) {
                // Orb spills past the left edge → text starts after the orb.
                leftEdge = Math.min(STAGE_W, orbRight)
                available = STAGE_W - leftEdge
            } else if (orbRight >= STAGE_W) {
                // Orb spills past the right edge → text ends before the orb.
                available = Math.max(0, orbLeft)
            } else {
                // Orb is mid-column. Pick the wider side so reading order
                // stays sane (no mid-line jumps across the sphere).
                const leftGap = orbLeft
                const rightGap = STAGE_W - orbRight
                if (rightGap > leftGap) {
                    leftEdge = orbRight
                    available = rightGap
                } else {
                    available = leftGap
                }
            }
        }

        // Row is too cramped — leave it blank and move down.
        // The orb fully occupies this band.
        if (available < MIN_LINE_W) {
            y += state.lineHeight
            continue
        }

        const line = layoutNextLine(prepared, cursor, available)
        if (line === null) break // text exhausted

        const el = getLine(lineIndex++)
        el.textContent = line.text
        el.style.transform = `translate(${leftEdge}px, ${y}px)`

        // Proximity glow: lines near the orb warm up.
        const dist = Math.hypot(leftEdge + line.width / 2 - cx, y - cy)
        const heat = Math.max(0, 1 - dist / (r * 2.2))
        el.style.color = heat > 0.05
            ? `rgb(${196 + heat * 59}, ${200 + heat * 40}, ${212 + heat * 43})`
            : '#c4c8d4'

        cursor = line.end
        y += state.lineHeight
    }

    // Hide unused pooled lines from previous frames.
    for (let i = lineIndex; i < linePool.length; i++) {
        linePool[i].style.transform = 'translate(-9999px, -9999px)'
    }

    const elapsed = performance.now() - t0
    perfEl.textContent = `${elapsed.toFixed(3)} ms`
    lineCountEl.textContent = lineIndex
}

// ─── Orb: spring-follow the pointer ─────────────────────────────────────────

function updateOrbSize() {
    const d = state.radius * 2
    orbEl.style.width = `${d}px`
    orbEl.style.height = `${d}px`
}

function updateOrbPosition() {
    orbEl.style.transform = `translate(${state.orbX - state.radius}px, ${state.orbY - state.radius}px)`
}

function tick() {
    // Critically-damped-ish spring so the orb feels alive but settles fast.
    const k = 0.18
    const damp = 0.72
    state.velX = (state.velX + (state.targetX - state.orbX) * k) * damp
    state.velY = (state.velY + (state.targetY - state.orbY) * k) * damp
    state.orbX += state.velX
    state.orbY += state.velY

    updateOrbPosition()
    render()
    requestAnimationFrame(tick)
}

// ─── Input ──────────────────────────────────────────────────────────────────

function pointerPos(e) {
    const rect = stage.getBoundingClientRect()
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
    }
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

// Controls
function bindSlider(id, key) {
    const el = document.getElementById(id)
    const label = document.getElementById(`${id}-val`)
    el.addEventListener('input', () => {
        state[key] = Number(el.value)
        label.textContent = el.value
    })
}

bindSlider('radius', 'radius')
bindSlider('padding', 'padding')
bindSlider('lh', 'lineHeight')

document.getElementById('radius').addEventListener('input', updateOrbSize)

// ─── Boot ───────────────────────────────────────────────────────────────────

// Ensure the font is loaded before measuring, otherwise prepare() measures
// the fallback font and line breaks will be subtly wrong.
document.fonts.ready.then(() => {
    updateOrbSize()
    tick()
})
