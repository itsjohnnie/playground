---
name: atelier
description: Build and maintain Johnnie's atelier (johnnies.life/art) — the World Cup 2026 generative-art practice, one piece per Argentina match. Use when making a new match piece, editing an existing piece, polishing the site chrome (index, panel, pill, transitions), or shipping any change to johnnie/public/art. Encodes the house style, the fiction's canon, the ship cycle, the verification workflow, and every hard-won technical pattern from pieces #1–#6.
---

# Johnnie's atelier — the practice

A daily generative-art practice after Zach Lieberman, curated hard. The 2026
edition: **Argentina at the World Cup, one piece per match**. After every
game, one illustration is generated in code from the match's (fictional but
internally consistent) data and made into an *object* — pressed, cast, woven,
surveyed, printed. The list is the artwork; the fiction is load-bearing.

Johnnie reviews on **mobile first** (iPhone). Desktop must also be verified —
that's your job, not his. He has granted **standing merge authority**: every
change ships commit → push → PR → squash-merge → branch resync without asking.

## Layout

```
johnnie/public/art/            the whole atelier (plain static files inside a
                               Next.js static-export shell — the pieces never
                               touch Next; they are self-contained HTML)
  index.html                   the index: one sheet, day list newest-first
  1.html … 6.html              the pieces (URL: johnnies.life/art/N — served
                               extensionless by Cloudflare Pages clean URLs)
  data-00N.js                  per-match record (window.MN), loaded by piece N
  art.js                       seed/rng/reseed helpers (ART.*), thumb mode
  frame.js                     the constant: room, panel, pill/sheet, nav,
                               view transitions, og mode. Pieces call
                               FRAME.mount({...}) and draw on F.canvas
  sketches.json                the manifest (drives index + prev/next walk)
  lib/fonts/                   Geist (chrome), InterVariable + InterVariable-alt1
  lib/crests/                  afa.svg, sfv.png (real federation marks)
  og/N.png                     1200×630 share cards (card only, no artwork)
  sketches/00N.html            redirect stubs only — the old URLs, kept alive
.claude/skills/atelier/        this skill
```

Piece pages are **one self-contained HTML file** each: inline style, inline
script, no build step, no framework. Never introduce a bundler or runtime
dependency; the medium is the constraint.

## The ship cycle (standing authority)

```
git add -A && git commit -m "art: <lowercase, narrative title>"   # from repo root!
git push -u origin claude/daily-generative-art-1cn3lq
mcp github create_pull_request  (base main, squash-merge immediately)
git fetch origin main && git checkout -B claude/daily-generative-art-1cn3lq origin/main
git push --force-with-lease -u origin claude/daily-generative-art-1cn3lq
```

- Live ~2 minutes after merge. One PR per user-visible change; don't batch
  unrelated asks.
- Commit messages are prose in the house voice ("the sheet was mailed folded
  to eighths"), body explains the why. Never mention model names in anything
  pushed.
- `cd` resets between Bash calls — scratchpad scripts run with an explicit cd;
  git always from repo root.

## Fiction canon (never contradict; extend carefully)

| # | Piece | Match | Result | Notes |
|---|-------|-------|--------|-------|
| 1 | Terreno | vs Algeria (16·06, group) | W | Messi 17' 60' 76' — first WC hat-trick, equals Klose (16) then passes |
| 2 | Sismógrafo | vs Austria (22·06, group) | W | Messi 90+5' in gold — all-time WC scoring record (18) |
| 3 | Resonancia | Jordan vs ARG (27·06, group) | W 3–1 | penalties snap Chladni figures; Al-Tamari 55' |
| 4 | Bronce | vs Cabo Verde (03·07, R32) | W | bronze plaque; Messi 29' (20) |
| 5 | Embate | vs Egypt (07·07, R16) | W | 0–x until the celeste breaks at 90+2'; Messi 83' (21) |
| 6 | Afiche | vs Switzerland (11·07, QF) | W 3–1 aet | 0–0 at 90'; Messi 97' (22), Álvarez 106', Embolo 113', Lautaro 119'. Arrowhead, KC, att 76 416, M61 |
| 7 | Umbral | ENG vs ARG (15·07, SF, Mercedes-Benz Atlanta, M102) | W 2–1 | REAL, web-verified: Gordon 55' (Rogers); E. Fernández 85' (Messi), Lautaro 90+2' (Messi, header) — Messi two assists, NO goal. HT 0–0. Att 68 239, ref Elfath (USA), possession 64–36 ARG, xG 0.91–0.54. England the team of record (subject "England vs. Argentina") |
| 8 | — | vs Spain (19·07, Final, MetLife) | upcoming | Spain beat France 2–0 in the other semi |

**The tournament is REAL** — from piece 7 on, every match fact is researched on
the live web (FIFA/ESPN/press), never invented, and unreported fields stay null.
Pieces 1–6 predate this rule; their records stand as Johnnie approved them —
don't retrofit without his word. Real semifinal XI: e. martínez; molina, romero,
l. martínez, tagliafico; de paul, paredes, mac allister, e. fernández; messi,
álvarez (lautaro came off the bench for the winner).
Standing facts: Messi's goal ledger above;
head-to-head vs Switzerland now 6-2-0; **AFA crest still has three stars**
(the fourth isn't won yet — period-correct until the final); venues/dates
follow the real 2026 US/MEX/CAN schedule. Argentina always attacks downward
on portrait pitch plans. Every stat in a data file must stay coherent with
this table — audit before shipping.

## House style

- **Concept**: every piece is an *object with a story* (a survey, a
  seismogram, a plate, a plaque, a poster mailed folded). Reference a
  nation's visual tradition, don't copy it. The arrival/entrance IS the
  narrative (the press prints, the mail unfolds).
- **Names**: Spanish, one word (Terreno, Bronce, Afiche). Country names
  UPPERCASE in artwork text; everything else sentence case. "EMPATES" caps in
  tallies. World Cup, not Mundial, in English copy.
- **Data**: all match facts live in `data-00N.js` as one literal object —
  goals with minutes/scorer/assist/xy, per-half mean positions (h1/h2) for
  the XI, possession/xg/shots, `ink` palette. The piece reads only this.
- **Randomness**: seeded only — `ART.rng(seed + "-purpose" + pull)`. Never
  `Math.random()` in artwork (confetti/interaction is exempt). Grain and
  textures get ONE seed per pull or they shimmer during animation.
- **Palettes**: press-ink fictions, hand-tuned. Celeste #75aadb, rojo
  #d52b1e, negro #221f1a, papel #f2efe8 (was creamier; Johnnie prefers
  whiter). Backs of paper #f4f2ec.
- **Wall label** (`desc` in FRAME.mount): long, narrative, present tense,
  ends by telling the viewer what interaction does ("Tap, and the eleven walk
  back to kickoff."). Update it whenever behavior changes; regenerate the OG
  image when it changes (the OG card contains the desc text).
- Easter eggs stay undocumented (the 4th-tap papelitos).

## frame.js contract

```js
const F = FRAME.mount({ num, title, subject, edition, date, stack, time,
                        desc, dark:true, open:true, gesture:true,
                        onResize(w, h, dpr) { ... } });
```

- **onResize passes DEVICE pixels** (offsetWidth×DPR). Divide by dpr for CSS
  px or everything renders 2× too big. This has bitten before.
- `open:true` = transparent art region; the piece grounds itself on the
  room's #0d0a07.
- `?og=1` renders the card only (1200×630, body padding 48px, artwork
  hidden) — regenerate `og/N.png` via the scratchpad gen-og script whenever
  title/desc change.
- The pill (mobile) morphs into the panel via same-document view transition;
  prev/next/index navigate via cross-document view transitions with
  speculation-rules prerender. The "← Art" crumb jumps home **through
  history** (`atelier-depth` counter in sessionStorage) so bfcache restores
  the index instantly.
- Manifest drives everything: nav walk uses entries **with** a `file`;
  `status:"upcoming"` + no file = dimmed non-interactive index row.

## Verification workflow (non-negotiable)

Playwright + headless Chromium (`executablePath: /opt/pw-browsers/chromium`,
`--use-gl=angle --enable-webgl`). Serve `johnnie/public/art` with a local
http server that emulates **clean URLs** (missing file + no extension → try
`+ ".html"`), and correct MIME for `.svg` (import maps and `<img>` SVGs fail
on text/plain).

- Default viewport 390×780 @2× (Johnnie's phone); always also 1280×800.
- **Look at every screenshot.** Rendering without errors is not the bar;
  "would Johnnie like this frame" is.
- Animations: capture **timelines**, not single frames. For long
  choreography build a `?ufslow=N` param into the piece that multiplies all
  durations, then screenshot at planned 1× phase times (headless screenshots
  add 300–1000ms latency each — anchor on a DOM marker, log actual capture
  times).
- Headless WebGL/rAF sims run in slow motion — burst-capture; never trust
  wall-clock timing of rAF work.
- Interactions get scripted: click/tap sequences with before/after captures
  (drift toggles, 4-tap confetti, pill morph, crumb return).
- Full-suite check before shipping structural changes: index + all pieces,
  console errors fail the run.

## Hard-won technical patterns

**Canvas / type**
- `ctx.font` readback normalizes quotes — never string-replace on `g.font`;
  assemble the font string explicitly.
- Chromium ignores `FontFace featureSettings` — to force an Inter alternate
  glyph, remap the cmap with fonttools into a second woff2 (InterVariable-alt1:
  0x31 → one.ss01) and use a distinct family name.
- Canvas `multiply` compositing **commutes** — plate order is free; put the
  animated plate last so `press(g, k)` can render "everything but" at integer k.
- Pitch plans must be drawn **proportional** (68:105) or circles become
  ellipses; compute arc-box intersections in metres (`acos(5.5/9.15)`), draw
  boxes as three-sided paths (restroking the goal line doubles it).
- Bake paper texture once into ImageData; re-composite plates over it per
  frame. Reuse offscreen canvases; never reallocate per frame.

**Paper physics (the unfold, #6)**
- For a folded packet whose outside shows the sheet's BACK (an address
  cover), the first fold must be faces-kissing; the honest unfold shows
  blank stock until one final flourish reveals the whole front. Verify every
  stage against a fold-topology storyboard with slow-mo captures.
- CSS 3D fold rig: rigid subtrees (columns → row hinges), faces with
  `backface-visibility:hidden`, back faces pre-rotated `rotateY(180deg)`,
  tiny translateZ offsets against z-fighting, faces bleed 0.51px past panels
  (background-position compensated) to kill sub-pixel seams.
- WAAPI with `fill:"both"` + delays = declarative timeline; a later
  animation on the same property must use `fill:"forwards"` or its backwards
  fill applies during its delay.
- Crease shading rides OVER the ink (printed flat, folded after); crack
  specks are paper-colored so bare stock hides them; backs carry fold wear
  along pane edges (every interior pane edge is a fold line).

**View transitions**
- Snapshots composite with **plus-lighter**: old/new opacities must stay
  complementary (equal durations) or brightness pulses. Never add an opaque
  background under the pair.
- Container morphs: clip `::view-transition-image-pair` with its own
  animated border-radius; never let snapshots' baked-in radii stretch.
- A `view-transition-name` pointing at an element the destination lacks
  animates as an orphaned group — neutralize the name right before that
  navigation.
- Cross-doc VT arrivals: page content must be complete in frame one OR
  deliberately animate within the live new-snapshot (the index staggers its
  day rows from frame one; the sheet's head never blanks).

**Motion (Emil Kowalski school)**
- Entrances ease-out, on-screen morphs strong in-out, exits ~20% faster than
  entries. UI under 300ms; theatre (once-per-visit entrances) may breathe.
- Press states scale 0.94–0.97; blur-to-sharp is the premium reveal material
  for display type; stagger 30–80ms with real travel or it reads as a blob.
- Frequency rule: first-time = full performance; repeats = shorter "encore"
  (the index: CSS vars `--day-base/--day-step` retuned by `.enc`/`.vt`
  classes). Reduced motion: fades only, clear filters/transforms explicitly.
- Analytic animation (position as closed-form f(t)) beats stateful stepping:
  interruptible, stateless, composes — the confetti and drift both work this
  way. Confetti realism = falling-leaf gait (sway phase-locked to tumble),
  creased two-half pieces, lit/shaded faces, depth tiers, ribbons as
  traveling waves; volleys stack under a hard cap, pieces free slots as they
  land.

**Web platform**
- Import-map URLs must start with `./`, `/`, or a scheme — bare paths fail
  silently-ish ("blocked by a null value").
- sessionStorage caches the manifest for synchronous index render; every
  page that fetches it re-seeds the cache.
- bfcache + `history.go(-n)` is the only truly flicker-free return; count
  steps in sessionStorage, clear on index pageshow, fall back to normal
  navigation for deep links.
- Static export = no server redirects: moved URLs keep meta-refresh stub
  files with canonical links.

## Interaction grammar

- Tap on a piece = a **state dial**, not a replay (drift retargets smoothly
  mid-flight). Drag only where the material earns it (bronze tilts; paper
  doesn't). Kill text selection/callouts on art surfaces
  (`user-select:none`, `-webkit-touch-callout:none`, `touch-action`).
- `prefers-reduced-motion`: instant final states, no theatre, party skipped.
- Every piece rests at rAF-zero when idle.

## Cadence

The practice is **match-driven**: a check-in Routine fires the morning after
each Argentina fixture (13:00 UTC next day), builds the piece from Johnnie's
result, updates the manifest (new piece + next dimmed upcoming row), and
re-arms itself for the next fixture. No daily cron. Johnnie announces
results and corrections — his facts always win; audit the whole canon when
one changes.
