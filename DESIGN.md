# Design

> Scope: the art practice — `johnnie/public/art/` (johnnies.life/art).
> Generated from the shipped code (frame.js, index.html, the 008 studies).
> This is the visual canon; `/impeccable` commands and daily pieces read it.
> Sixth curation (07·07): the presentation became **the atelier sheet**,
> from Johnnie's own mock. The uppercase-mono Swiss overlay is retired.

## Theme

The atelier: a dark room, white catalog sheets, the artwork as the plate.

| Token | Value | Use |
|---|---|---|
| `room` | `#0d0a07` | page ground, gallery ground |
| `sheet` | `#f2f1ee` | the catalog page, gallery prints |
| `card` | `#ffffff` | the spec table inset |
| `ink` | `#16130f` | text on the sheet |
| `bone` | `#f2ece1` | text on the room (gallery header/footer) |
| `paper` | `#e9e3d5` | light grounds **inside** artworks |
| `night` | `#0a0a0c` | dark grounds **inside** artworks |

## Color

Hand-tuned ink families only; never HSB cycling, never purple gradients.

| Family | Values | Meaning |
|---|---|---|
| celeste | `#6cabd6` mid · `#2b6a99` deep · `#8fc6ea` light | argentina |
| ember/rojo | `#d5493c` mid · `#a82c22` deep · `#f08c64` light | cabo verde |
| gold | `#e9b32a` · `#d9a72e` | goals, sol de mayo |
| bone/cream | `#e6ddc6` · `#e9e3d5` | paper, sand, warp |

Strategy: **restrained** on the sheet (gray-white + ink, no accent),
**committed** inside the artwork (the piece's material owns its surface).

## Typography

One family: **Geist Sans** (self-hosted variable in `art/lib/fonts/`),
sentence case throughout the product chrome.

- **Header**: "JOHNNIE'S ATELIER" is the only uppercase moment (12px-ish,
  weight 560, tracked slightly); everything else regular 430.
- **Headline**: the day's subject, `clamp(34px, 6.6cqi, 64px)`, weight 460,
  letter-spacing −0.022em.
- **Prose**: 15–16.5px / 1.8, weight 430, max 66ch.
- **Spec labels**: uppercase 11–12px, weight 520, dim ink — scoped to the
  spec card only.
- **Geist Mono / Geist Pixel** still load for use **inside artworks**
  (annotations, counters); never on the sheet.

## Layout

**The sheet** (frame.js — the constant): white catalog page, `max 960px`,
radius up to 36px, generous `--pad` (7cqi), on the espresso room. Full-width
edge-to-edge on ≤700px phones. Order: header (atelier / practice / date·num)
→ **artwork slot** → reseed caption → subject headline → prose description →
spec card (Title / Edition / Stack / Time spent, hairline dividers) →
← → navigation.

**The artwork slot**: `ratio` (width/height) is per-piece — 0.75 portrait
default, landscape allowed (terreno: 1.6); `bleed: true` runs it to the
sheet's edges. Pieces compose for their declared ratio and must tolerate
the slot resizing.

**Gallery**: dark room; cards are small sheets (radius 14, padding 10) each
holding the live artwork (`?thumb=1`, per-piece ratio) and one label line —
`#004 · Terreno` + date. 1-col phone, 2-col ≥720, 3-col ≥1080.

## Motion

- **Settle**: pieces arrive 0→100 over ~10s, then the rAF loop **stops**.
  Inherently-moving media (water) may idle at ~12% instead. Play-once
  pieces (minutos, terreno) run once and rest.
- **Product chrome**: ease-out `cubic-bezier(0.23,1,0.32,1)`; sheet entrance
  ≤420ms; card stagger 45ms; press `scale(0.98)`; hover gated to
  `(hover:hover) and (pointer:fine)`.
- `prefers-reduced-motion`: opacity-only fallbacks.

## Components

- **frame.js** — `FRAME.mount({num, edition, subject, title, date, stack,
  time, desc, ratio, bleed, dark, noCanvas, onResize})` →
  `{stage, canvas, W, H, DPR, setTone}`. Owns fonts, the sheet, navigation
  (← → + swipe on the artwork + arrow keys; extensionless-safe matching),
  tap-to-reseed on the artwork with caption disclosure.
- **art.js** — seeded rng (`ART.seed/rng/makeNoise`), fullscreen-quad GLSL
  runner (`ART.shader`), thumb detection.
- **Finishing pass** (every piece): grain, directional light, relief,
  imperfection — fight sterile CG.

## Voice

Titles are one Spanish word, sentence case (`Bruma`, `Tapiz`, `Pileta`).
The subject headline is plain and factual ("Argentina vs. Cabo Verde").
Descriptions read like catalog wall labels: material first, data second,
one sentence of poetry, period. Editions are `day/31`.
