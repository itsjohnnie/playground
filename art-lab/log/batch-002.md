# Batch 002 — week of 2026-07-06

## 008 · diez estudios — 2026-07-06 — the frame is born

Johnnie reframed the practice mid-day: not one answer per day but — for this
match — **ten competing studies**, as if ten different engineers each turned
the same data into art with different stacks. And a new constant: **the
frame** — 3:4 stage, 6×8 Swiss hairline grid, Fragment Mono, one weight, one
small size, fixed slots for number/date/info/data/tech. See README →
Presentation. The original square `008 miami` was rebuilt as study `a`.

| v | title | stack | idea |
|---|-------|-------|------|
| a | río | canvas 2d | two riso inks share the page; boundary = match balance |
| b | 64.478 | three.js points | every attendee as a gpu point; goals ripple the crowd |
| c | constelación | three.js sprites | 38 shots as a star chart on a time axis |
| d | terreno | three.js relief | pressure topography, contour ink on paper |
| e | interferencia | glsl | two wave systems (freq=shots, amp=possession) interfere; goals scar the phase |
| f | bufanda | glsl | the match woven as a fan scarf; goals = pulled threads |
| g | transmisión | glsl feedback | slit-scan broadcast; goals leave hot scars |
| h | sismógrafo | canvas plotter | 120 stacked traces; goals spike off the chart |
| i | minutos | dom kinetic type | the match told only in typography |
| j | órbitas | canvas gravity | shots orbit the goalmouth; goals ring the bell |

All ten share `sketches/data-008.js` — single source of truth.

### Original notes (study a inherits these)

Argentina 3–2 Cabo Verde (a.e.t.), World Cup 2026 Round of 32, Hard Rock
Stadium, 3 July 2026. Johnnie asked for a piece about the match built from
real data points. Rendered as two risograph inks (celeste / red) sharing one
river across 120 minutes; the piece redraws itself in 26 seconds, a replay.

**Real data encoded** (FotMob, Sofascore, Opta, xGscore — retrieved 2026-07-06):

- Goals with minutes: 29' Messi (assist Lisandro Martínez), 59' Deroy Duarte,
  92' (91:57) Lisandro Martínez, 103' Sidny Lopes Cabral, 111' Diney Borges og
  (hollow circle) — the first match-deciding extra-time own goal in WC history.
- River boundary = blend of full-match possession (64–36) and per-phase xG
  share (ARG 0.46/1.31/0.58 vs CPV 0.08/0.23/0.45 across 1H/2H/ET); goals
  bump the boundary toward the conceding side.
- Shot stitches: 22 vs 16, distributed per phase ∝ phase xG (counts exact,
  in-phase placement seeded); solid = on target (10 vs 5).
- Yellow cards 69' (CPV) and 115' (ARG); hydration breaks 26' and 73' as
  paper slits; period lines at 45/90/105.
- Footer: possession, xG, shots; Messi 83 touches, Vozinha 8 saves,
  attendance 64,478.

**Known source discrepancies** (chosen value first): L. Martínez goal 92'
(91:57) vs 93'; Duarte 59' vs 60'; Lopes Cabral 103' vs 104'; winner 111' vs
109'/110'; xG 2.16–0.45 (FotMob/Opta) vs 2.26–0.47 vs 2.35–0.76 (xGscore);
Montiel yellow 115' vs 117'. Distance-run data wasn't published for this
match, so it isn't encoded.

Craft notes: double-printed ribbons ~1.5px off register; goal beams behind
the river; grain pass; Spanish captions (it's a love letter). Direction probed:
**data art** — new to the practice, not from the idea bank.

## Curation — Johnnie, 2026-07-06 evening

- **Retired:** batch 001 in its entirety (001–007), plus 008a río,
  008c constelación, 008g transmisión — "not up to standard." Files stay in
  git history; gone from the gallery.
- **Direction given:** beautiful abstract shapes → beautiful composition,
  gradients + dithering, "creating a beautiful scene." Reference: OFF/GRID
  posters (fixed type system, expressive grainy backgrounds, hot accent on
  black). And: animation need not loop — 0→100, then the settled composition
  IS the piece.
- **Replacements shipped same day:**
  - [x] 008a **bruma** — five dithered gradient forms (goals; og = hollow ring)
    settle on warm paper; halftone only where the pigment is
  - [x] 008c **marea** — dusk shoreline; ridge silhouettes = per-phase xG,
    gold sun at minute 111; dithered travel-poster palette
  - [x] 008g **aerosol** — one spray stroke around the match clock, 64/36
    celeste/rose, goal bursts, the 111' og drips; sprayed once, then finished
- Remaining studies (b, d, e, f, h, i, j) stay as candidates pending verdicts.

## Second curation pass — Johnnie, later that evening

- **008f bufanda → matra**: liked the rug association ("like Argentine rugs")
  but "not realistic enough." Rebuilt as a hand-knotted pampa wall rug:
  guarda-pampa diamond bands at the five goal minutes, gold card rows,
  stepped ball medallion, 64/36 possession speckle; knot domes, heathered
  yarn, abrash rows, selvedge, fringe, wall shadow; weaves itself bottom-up
  on a bare warp, then hangs still. Lesson: intricate CRAFT patterns beat
  simulated cloth; motifs may reference the day's subject abstractly.
- **008i minutos**: "large time going up is attractive… the ending is
  lacking." Ending rebuilt: goal slams get a team-color wash; at 120' night
  falls (stage floods dark, frame re-inks via F.setTone), the score lands as
  giant Geist Pixel numerals, ledger in team inks — and the piece RESTS
  (plays once, no loop).
- **System**: mobile now full-bleed (the art is the screen); breadcrumb baked
  into the frame; swipe/arrows/‹ › navigation between pieces; Geist family
  everywhere (Mono frame, Pixel for expressive numerals).
- Gallery now holds only the 008 studies — batch 001 removed earlier stands.
