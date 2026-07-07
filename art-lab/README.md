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

0. **Impeccable governs design work.** The repo has the `impeccable` skill
   installed (`.claude/skills/impeccable/`). `PRODUCT.md` and `DESIGN.md` at
   the repo root are the strategic + visual canon for the art project — read
   both before designing anything. New pieces follow the `/impeccable craft`
   discipline (shape the idea against PRODUCT.md's principles, build to
   DESIGN.md's tokens, verify like an art director); product-UI changes
   (gallery, frame) go through the matching `/impeccable` command
   (`polish`, `audit`, `critique`, …). The design hook auto-reviews UI
   edits — fix real findings, and only waive with recorded reasons
   (`.impeccable/config.json`). Geist is a user-confirmed waiver.
1. **Read first:** this file, `PRODUCT.md`, `DESIGN.md`,
   `research/zach-lieberman.md`, the latest `log/batch-*.md`
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
   Array order doesn't matter: the gallery and the piece-to-piece nav both
   sort by **date (newest first), then `n` ascending within a date** — that
   sort is the display convention, not the array.
6. **Verify it renders** (headless screenshot at 2s and 8s — no black frames,
   no console errors), then commit + push.
7. Keep it under ~an hour of effort. Post at the moment it crosses the
   threshold of interesting. K.G. — keep going.

### Presentation (don't break this)

Johnnie views the site primarily on his phone. Since the sixth curation
(07·07, from Johnnie's own mock) every piece is presented as **the atelier
sheet** (`johnnie/public/art/frame.js`):

- A **white catalog page on a near-black room**, set in **Geist Sans**,
  sentence case. Order: header (JOHNNIE'S ATELIER / ← Art · Daily Practice /
  johnnies.life/art · date / #num) → **the artwork slot** → reseed caption →
  the day's subject as a headline → a short wall-label description → a white
  spec card (Title / Edition / Stack / Time spent) → big ← → navigation.
  The sheet never changes; the artwork is the only variable.
- Usage: `FRAME.mount({num, edition, subject, title, date, stack, time,
  desc, ratio, bleed, dark, noCanvas, onResize})` → `{stage, canvas, W, H,
  DPR}`. `stage` IS the artwork slot. `ratio` is slot width/height —
  **per-piece**: 0.75 portrait default, 1.6 landscape (terreno),
  `bleed: true` runs to the sheet edges (resonancia). `dark` sets the slot's
  ground while loading. Use `ART.seed/rng/makeNoise` for determinism;
  three.js is vendored at `art/lib/three.module.min.js`.
- **Compose for your declared ratio** and tolerate resize: the slot follows
  the sheet width (~320–825px). Shader pieces keep the design-space remap
  habit (anchor composition to width, extend scenery on the other axis);
  three.js pieces dolly to fit.
- **Navigation lives in the sheet**: ← Art breadcrumb top-left, big ← →
  arrows at the foot, swipe on the artwork, arrow keys. Ordered by the
  manifest sort (date desc, n asc). URL matching strips `.html`
  (production serves extensionless).
- Tap on the artwork = reseed (disclosed in the caption). `r` key too.
- Temporal replay pieces use `cycle = t % 34; clock = min(120, cycle/26*120)`;
  settle pieces animate 0→100 once and stop their rAF loop.
- Batch 001 (001–007) predates the sheet and uses the legacy square
  `ART.fit`/`ART.chrome` — leave those as history.
- Gallery previews load each piece with `?thumb=1` — frame.js then renders
  the artwork alone, filling the iframe; the gallery card supplies the
  label. Cards honor a per-piece `ratio` field in `sketches.json`.
- Geist Mono / Geist Pixel remain available for use **inside** artworks
  (annotations, counters) — never on the sheet.

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
- **2026-07-07 (sixth):** Johnnie supplied his own Figma mock and the
  presentation became the atelier sheet (see Presentation above). Verdicts:
  bruma **not up to standard, replace**; 64.478 "maybe has something,
  still kinda lame" — improve hard; organismo **laggy/choppy** — performance
  is part of craft; terreno "very interesting" → black ground, white
  topography, landscape, play once; resonancia — square inset felt awkward,
  bleed it to the edges; tapiz regressed ("looked better before") — realism
  is the bar, revisit; pileta — caustics cool, **ripples unrealistic**;
  minutos still lame, improve a lot; órbitas **replace entirely**.
  Lessons: performance jank reads as broken craft; a crop that fights the
  medium (square plate in a portrait slot) reads as awkward; realism
  regressions are noticed immediately.

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
