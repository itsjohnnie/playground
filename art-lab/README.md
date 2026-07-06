# art-lab

The studio folder for the daily generative-art practice that lives at
**[johnnies.life/art](https://johnnies.life/art/)**. Inspired by Zach Lieberman's
daily sketches (see `research/zach-lieberman.md`).

This folder is the **process**; `johnnie/public/art/` is the **work**.

## The project

One small piece of generative art per day — algorithms trying to not look like
algorithms. Gradients, dithering, ink, optics, feedback, grain. The goal of the
first month is exploration; the goal of the first ~100 is finding the bar
(which directions earn a place in the practice, which get retired).

**Phase 1 (current):** one-week experiment. Batch 001 shipped seven candidates
in seven different directions. Johnnie curates — "this I like, this I don't" —
and the practice narrows around what resonates.

## Where things live

```
art-lab/
  README.md                  ← you are here (operating manual)
  research/
    zach-lieberman.md        ← deep research: bio, philosophy, technique catalog
  log/
    batch-001.md             ← per-batch notes + curation results
johnnie/public/art/          ← the live site (johnnies.life/art)
  index.html                 ← gallery (reads sketches.json)
  sketches.json              ← manifest: one entry per sketch + status
  art.js                     ← shared kit: seeded RNG, noise, WebGL quad, chrome
  sketches/NNN.html          ← one self-contained file per piece
```

## How to make a daily sketch (for future sessions)

1. **Read first:** this file, `research/zach-lieberman.md`, the latest `log/batch-*.md`
   (for what's been liked/disliked), and 2–3 recent `sketches/NNN.html` files.
2. **Pick a direction** from the idea bank below or iterate on a liked piece —
   Lieberman's rule: *"make something new out of something old."* Remixing
   yesterday's sketch is encouraged; don't fear repetition.
3. **Write one self-contained file** `johnnie/public/art/sketches/NNN.html`
   (next number). Use `../art.js` for boilerplate:
   - `ART.seed("YYYY-MM-DD-NNN")` — date-seeded so the default view is deterministic
   - `ART.fit(canvas, onResize)`, `ART.rng(seed)`, `ART.makeNoise(seed)`,
     `ART.shader(canvas, fragSrc)` for fullscreen-quad GLSL
   - `ART.chrome({n, title, date, dark})` — caption, back link, click-to-reseed
4. **Title it** with one lowercase word or short phrase, like a diary entry.
5. **Add the manifest entry** to `sketches.json` (status: `"candidate"`).
6. **Verify it renders** (headless screenshot at 2s and 8s — no black frames,
   no console errors), then commit + push.
7. Keep it under ~an hour of effort. Post at the moment it crosses the
   threshold of interesting. K.G. — keep going.

### Presentation (don't break this)

Johnnie views the site primarily on his phone. Presentation is **mobile-first**
with **the composition always in the middle**, and since 008 every piece lives
inside **the frame** (`johnnie/public/art/frame.js`):

- A **3:4 portrait stage**, centered, with a fixed Swiss overlay: a **6×8
  hairline grid**, set in **Geist Mono** (the Geist family — Sans, Mono,
  Pixel Square — is self-hosted in `art/lib/fonts/` and @font-face'd by
  frame.js for pieces to use). Frame type is **mostly uppercase**, one small
  size, **two weights**: regular, with a bolder lead line per cell (piece
  number, score). URLs stay lowercase (`.lc`). Geist Pixel is for expressive
  moments inside pieces (e.g. minutos' giant counter), never for the frame.
- The frame holds the constants — piece number/variant, title, date, Johnnie's
  info, the data line, the tech stamp — in fixed grid slots. It never changes.
  All creativity happens on the canvas layer *behind* it.
- Usage: `FRAME.mount({n, v, title, date, data, tech, dark, noCanvas,
  onResize})` → `{stage, canvas, W, H, DPR}`. Use `ART.seed/rng/makeNoise`
  for determinism. See `sketches/008a.html` (canvas), `008b.html` (three.js —
  vendored at `art/lib/three.module.min.js`, import map included), and the
  other 008 studies for GLSL / DOM patterns.
- **Mobile is full-bleed**: on screens ≤700px the stage fills 100dvw×100dvh —
  the art IS the screen, no ground visible. Desktop stays a centered 3:4.
  Compose width-anchored: shader pieces use the design-space remap
  `q = vec2(p.x*0.75, (p.y-0.5)*0.75/aspect + 0.5)` so the composition keeps
  its proportions and the scene extends vertically on tall screens; three.js
  pieces dolly the camera back when `aspect < 0.75` (see 008b/008d).
- **Navigation lives in the frame**: the "← art" breadcrumb is a frame cell
  (top-right), and frame.js adds prev/next ‹ › affordances + swipe (touch) +
  arrow keys between pieces, ordered per the manifest. Nothing floats
  outside the stage.
- `F.setTone(dark)` re-inks the frame at runtime — for pieces that change
  register mid-life (minutos' night ending).
- Temporal replay pieces use `cycle = t % 34; clock = min(120, cycle/26*120)`;
  settle pieces animate 0→100 once and stop their rAF loop.
- Batch 001 (001–007) predates the frame and uses the legacy square
  `ART.fit`/`ART.chrome` — leave those as history.
- Gallery previews load each piece with `?thumb=1` — handled by frame.js.

### Taste profile (learned from Johnnie's curation — read before making anything)

- **2026-07-06:** Batch 001 (001–007) retired entirely — below the bar the 008
  studies set. From the 008 studies, **río, constelación, transmisión were
  retired** (the chart-adjacent / screen-effect ones). Replaced with **bruma,
  marea, aerosol**: abstract shapes composing a *scene*, gradients passed
  through dithering, poster-level confidence. Reference Johnnie shared:
  OFF/GRID internship posters (fixed Helvetica type system over wildly
  different grainy/spray/gradient backgrounds, one hot accent on black).
  Lean that way: bold figure-ground, heavy grain, few colors, composition
  over diagram.
- **2026-07-06 (later):** marea, interferencia, aerosol also retired. The
  stable signal: **crafted objects win** (tapestry, relief, plotter, glass,
  paper, tile) and calm abstractions (bruma, órbitas); screen-effects (CRT,
  spray, moiré), literal scenes, and chart-shaped pieces lose. Cultural
  motifs woven in abstractly (sol de mayo, guarda pampa) landed well.
  "Jaw-drop" bar: material realism — light, relief, shadow, imperfection.
- **Motion principle:** not everything loops. A piece may animate 0→100 —
  elements arriving, settling — and then REST as a finished composition
  (stop the rAF loop). The arrival is the performance; the final frame is
  the artwork.

### House rules (adapted from Lieberman's)

- Prefer `sin`/`cos` and seeded noise over raw randomness; motion should feel
  intentional, ideally loopable.
- Avoid the overused: Delaunay, Voronoi, reaction-diffusion, HSB rainbow cycling.
- Every piece gets a "non-digital" pass: grain, dither, paper, misregistration,
  vignette — fight the sterile-CG look.
- Palettes are hand-tuned inks or light-mixes, never `hue += 1` rainbows.
- One idea per sketch. If it needs explaining, simplify.
- Always be iterating: repetition creates the style.

## Curation

- Every sketch enters as `"status": "candidate"`.
- Johnnie reviews and says like/dislike (plus notes). Statuses move to
  `"keeper"` or `"retired"` (retired stays in the repo, hidden or dimmed in the
  gallery later — the diary is never deleted).
- Notes go into the batch log so future sessions inherit the taste profile.

## Idea bank (pull from here, cross off in batch logs)

From the research — directions not yet tried:

- Cone gradients: N moving color points, per-pixel light mixing with
  directional falloff (his most iconic series)
- Spring-loop soft-body blob, edge-distance pseudo-3D shading
- Metaball field contoured at 5+ thresholds (topographic blobs), marching squares
- Venetian-blind band study: `floor/fract` slats over drifting noise
- Neon glow via jump-flood distance field on a grid of lights
- Virtual lens SDF displacing a color field (glassy smears)
- Physarum agents (deposit/sense/steer) constrained to a letterform
- Slit-scan of a synthetic scene (no camera needed — scan a moving gradient)
- Two detuned ring gratings, moiré interference
- Endless line: turtle walk with slowly-varying steering angle, ink on paper
- Stacked circles along a path → pseudo-3D tubes/worms
- Quadtree portrait of a procedural image (subdivide where variance is high)
- Floyd–Steinberg on a slow gradient animation (CPU, embrace the shimmer)
- CMYK halftone at classic screen angles with misregistration
- Plotter-style hatching for tone, hand-wobble on every line
- Water-caustics light study (his 2024 East River obsession)
- Iridescent thin-film palette on dark ground (oil-slick)
- Blob inside blob inside blob
