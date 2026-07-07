# Design

> Scope: the art practice — `johnnie/public/art/` (johnnies.life/art).
> Generated from the shipped code (frame.js, index.html, the 008 studies).
> This is the visual canon; `/impeccable` commands and daily pieces read it.

## Theme

Two registers, both committed:

- **Paper** (light pieces & gallery): warm print-paper ground. This cream is
  a deliberate, five-rounds-confirmed brand token (risograph/print heritage),
  not a default — keep it.
- **Night** (dark pieces): near-black grounds with instrument lighting.

| Token | Value | Use |
|---|---|---|
| `paper` | `#e9e3d5` (stage) / `#f4f0e6` (gallery) | light grounds |
| `night` | `#0a0a0c` / `#07070b` | dark grounds |
| `ink` | `rgb(23,21,17)` | text on paper |
| `bone` | `rgb(244,240,229)` | text on night |

## Color

Hand-tuned ink families only; never HSB cycling, never purple gradients.

| Family | Values | Meaning |
|---|---|---|
| celeste | `#6cabd6` mid · `#2b6a99` deep · `#8fc6ea` light | argentina |
| ember/rojo | `#d5493c` mid · `#a82c22` deep · `#f08c64` light | cabo verde |
| gold | `#e9b32a` · `#d9a72e` | goals, cards, sol de mayo |
| bone/cream | `#e6ddc6` · `#e9e3d5` | paper, sand, warp |

Strategy: **restrained** on the product chrome (paper + ink + one accent),
**committed** inside pieces (the piece's material owns the surface).

## Typography

One family: **Geist** (self-hosted variables in `art/lib/fonts/`).

- **Geist Mono** — the frame and all product chrome. Mostly uppercase,
  letter-spacing `.075em`, size `clamp(6.5px, 1.95cqw, 12px)`, two weights:
  400 regular + **640 bold leads** (piece number, score line). URLs lowercase.
- **Geist Sans** — gallery header prose only (weights ~430/550).
- **Geist Pixel (Square)** — expressive numerals inside pieces (minutos'
  counter/score). Never in the frame.

Uppercase-with-tracking here is the committed Swiss system of the frame —
scoped to the frame's fact slots only; never as section-eyebrow scaffolding.

## Layout

- **The stage**: 3:4 portrait, centered, `max 620px` on desktop; **full-bleed
  100dvw×100dvh on ≤700px** (the art is the screen). Safe-area padded frame.
- **The frame grid**: 6 columns × 8 rows, hairlines at `rgba(ink, .07)`.
  Fixed slots: tl piece number (bold) + title; tr breadcrumb + date;
  ml author info; bl data line (bold lead); br tech stamp.
- **Design space** for shader pieces: width-anchored
  `q = vec2(p.x*0.75, (p.y-0.5)*0.75/aspect + 0.5)` — compositions keep
  proportions, scenes extend vertically on tall screens. three.js pieces
  dolly back when `aspect < 0.75`.
- Gallery: single centered column on phones → 2/3-col centered grid
  (`720px` / `1080px` breakpoints), 3:4 thumbs running live `?thumb=1`.

## Motion

- **Settle**: pieces arrive 0→100 over ~10s (`ease-out` cubic on progress),
  then the rAF loop **stops**. Exception class: inherently-moving media
  (water, orbits) idle gently (~12% time) instead of freezing.
- **Replay**: temporal pieces use `cycle = t % 34; clock = min(120, cycle/26*120)`
  or play once and rest (minutos).
- **Product chrome**: strong ease-out `cubic-bezier(0.23,1,0.32,1)`;
  entrances ≤400ms; card stagger 45ms; press states `scale(0.96–0.98)` at
  ~160ms; hover gated to `(hover:hover) and (pointer:fine)`.
- `prefers-reduced-motion`: opacity-only fallbacks; no positional entrances.

## Components

- **frame.js** — `FRAME.mount({n, v, title, date, data, tech, dark, noCanvas,
  onResize})` → `{stage, canvas, W, H, DPR, setTone}`. Owns fonts, grid,
  breadcrumb, prev/next arrows + swipe + arrow keys, tap-to-reseed,
  entrance, tone switching.
- **art.js** — seeded rng (`ART.seed/rng/makeNoise`), fullscreen-quad GLSL
  runner (`ART.shader`), thumb detection.
- **Gallery card** — 3:4 live iframe thumb + meta row (n · title / date /
  medium — tags). No borders heavier than 1px, no side-stripes.
- **Finishing pass** (every piece): grain (±2–3%), vignette, and where
  material calls for it: Bayer dither, relief light, abrash/imperfection.

## Voice

Lowercase titles, one Spanish word, diary-like (`bruma`, `tapiz`, `pileta`).
Frame facts uppercase and terse. Notes in the manifest read like catalog
wall labels: material first, data second, one sentence of poetry, period.
