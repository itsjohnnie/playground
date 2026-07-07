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

## Third curation pass — Johnnie, night of 2026-07-06

- **Retired:** 008c marea, 008e interferencia, 008g aerosol. With earlier
  retirements the pattern is now unmistakable: crafted OBJECTS and calm
  abstractions stay; screen-effects, literal scenes, and diagram-adjacent
  pieces go.
- **Replacements — a trilogy of materials, all settle-and-rest:**
  - [x] 008c **vitral** — stained glass; leaded panes 64/36, five rose-window
    roundels at the goal minutes, the own goal in clear glass; light rises once
  - [x] 008e **papel** — torn-paper collage; five hand-torn shapes (og torn as
    a ring), white torn rims, real shadows, 38 confetti shots
  - [x] 008g **mosaico** — sidewalk mosaic read as the match clock; shards by
    possession share, gold shards at the goals, the own goal unglazed
- **008f bufanda → tapiz** ("should be tapestry... improve until my jaw
  drops"): carved relief lighting (motifs stand proud and catch light),
  two-lobe yarn twist + plied dye, cloth undulation with fold shading, top
  edge sagging between hanging loops, wooden rod, and the ball medallion
  replaced with a woven **sol de mayo** — the tapestry now reads as an
  abstracted argentine flag. Lesson recorded: when a motif turns to mush at
  knot resolution, swap it for a bolder cultural symbol rather than adding
  detail.

## Fourth curation pass — Johnnie, late night 2026-07-06

- **Direction:** 8a "too circular — make it fluid"; 8c/8e/8g/8j "replace or
  massively improve. MIT level. 3d models, svg paths, textures, filters."
- **008a bruma** — kept, made fluid: a nested domain warp melts the five
  pigments into tongues and filaments, ink in slow water.
- **008c → organismo** — real two-species physarum simulation (32k agents,
  Jones algorithm): argentina (64%, celeste) vs cabo verde (36%, ember)
  competing for five food nodes at the goal minutes. Key finding: freeze
  mid-consolidation (~8s) — the braided mesh is the beautiful state.
- **008e → resonancia** — chladni plate: true sand grains migrating through
  five resonance modes (one per goal), 8% residue per mode (the plate
  remembers), machined steel, corner bolts.
- **008g → pileta** — night pool caustics over depth, refracted tile floor,
  five standing ripple rings at the goal clock (og = double ring), gold
  glint; settles to a 12% gentle idle (frozen water reads wrong).
- **008j órbitas** — massively improved: tilted 3D Kepler system, inclined
  elliptical shells, depth-graded trails, glowing torus, standing bells.
- Taste addendum: "MIT level" = simulations and instruments with real
  physics/algorithms behind them, photographed-experiment finishing.

## Sexta curaduría — 2026-07-07

Johnnie supplied a Figma mock: the presentation becomes **the atelier sheet**
(white catalog page on a dark room, Geist Sans, artwork slot + headline +
wall-label prose + spec card + ← → nav). frame.js rewritten; all ten studies
migrated; gallery restyled to the dark room with white prints. Catalog
numbering begins: #001–#010 = 008a–008j, edition 02/31.

Piece verdicts (recorded in README taste profile): replace bruma (#001) and
órbitas (#010); improve 64.478 (#002) and minutos (#009) substantially; fix
organismo's lag (#003); terreno (#004) → black ground / white topography /
landscape 1.6 / play once; resonancia (#005) → bleed to the sheet edges;
tapiz (#006) → recover the realism it lost; pileta (#007) → real ripples.
sismógrafo (#008) untouched.

Also this morning: first impeccable critique (18/40) — found the P0 that
production never had piece navigation (extensionless URLs vs .html matching).
Fixed along with error states, contrast floors, scoped reseed, immutable lib
caching, and GL-context recycling in the gallery.

## Séptima curaduría — 2026-07-07 (the restructure)

The practice reorganizes around **Argentina's Mundial 2026 run — one piece per
match**. Verified results (Wikipedia Group J / FIFA / Yahoo):

- #001 · 16·06 · Argentina 3–0 Algeria (Arrowhead, KC; Messi 17' 60' 76' — his
  first WC hat-trick; att 69,045; ref Marciniak) → **Terreno** adapted
- #002 · 22·06 · Argentina 2–0 Austria (AT&T, Dallas; Messi 38', 90+5' — the
  all-time WC scoring record; yellows Medina 76', Paredes 90+2'; att 70,649)
  → **Sismógrafo** adapted
- #003 · 27·06 · Jordan 1–3 Argentina (AT&T; Lo Celso 19', Lautaro 31' pen,
  Messi 80'; att 70,649) → **Resonancia** adapted (four modes)
- #004 · 03·07 · Argentina 3–2 Cabo Verde aet (Hard Rock, Miami; the existing
  researched dataset) → **Bronce** (new: sand-cast plaque)
- #005 · 07·07 · Argentina vs. Egypt, R16, Atlanta — played TODAY; the piece
  is made tonight with the real result (something new).

Everything else removed from the codebase per Johnnie: batch 001 legacy
(001–008.html) and the other studies (bruma/sello, 64.478, organismo, tapiz,
pileta, minutos, órbitas → sello & bronce survive as adapted/kept pieces only
in git history where replaced). Also this round: artworks sit OVER the room —
no boxes (`open` mount mode; terreno + resonancia float directly on #0d0a07);
click no longer reseeds (r key only); organismo retired for lag.
