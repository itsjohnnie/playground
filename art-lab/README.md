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
