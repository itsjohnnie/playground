---
target: johnnie/public/art/index.html
total_score: 18
p0_count: 1
p1_count: 2
timestamp: 2026-07-07T11-52-57Z
slug: johnnie-public-art-index-html
---
# Critique — johnnie/public/art/index.html (johnnies.life/art)

Method: dual-agent (A: design-director review, live screenshots phone/desktop + piece page, Nielsen/personas/emotional journey · B: CLI detector + injected detect.js + browser instrumentation, console/network/render evidence)

Date: 2026-07-07 · First critique for this target.

## AI-slop / anti-patterns verdict

**No — a stranger would not say "AI made this."** The cream+mono+uppercase composite pattern-matches AI-cream at a squint, but execution earns the tokens: a real 6×8 Swiss frame repeated as a genuine brand constant, thumbnails that ARE the live artworks, lowercase Spanish diary titles, self-hosted Geist. Reads as a person's print-heritage catalog.

Detector (B): exit 0 with config — clean. (10 Geist findings appear only with --no-config; all user-confirmed waivers.) Injected detect.js: 3 hits — wide-tracking on `#batch` (0.08em label — judged false positive), line-length ~93ch on the footer's first paragraph (real, fix), cream-palette on body (committed brand token per PRODUCT/DESIGN — keep, waive).

Near-misses pulling generic (A): the white `#fff` card chrome (1px border + hover-lift + shadow — the one SaaS accent in a print world; `#fff` isn't in DESIGN.md's tokens); header prose cadence ("Gradients, dither, ink, optics, feedback." — em-dash noun-list rhythm); structural card sameness ×10 (defensible as contact-sheet).

## Nielsen heuristics — 18/40

| # | Heuristic | /4 | Key issue |
|---|---|---|---|
| 1 | System status | 2 | Thumbs are opacity-0 over dark #111015 until loaded; no progress affordance during ~10s settles |
| 2 | Match to real world | 3 | Catalog language coherent; jargon correct for audience |
| 3 | Control & freedom | 1 | Prev/next/swipe/arrow-keys dead on live (P0); reseed has no undo |
| 4 | Consistency | 2 | Two date formats + two number formats on every card |
| 5 | Error prevention | 2 | Whole surface is a reseed trigger; stray taps discard the canonical render |
| 6 | Recognition vs recall | 1 | Every interaction invisible; the only visible affordances (‹ ›) never render live |
| 7 | Flexibility | 2 | Multi-modal nav designed but half dead in production |
| 8 | Aesthetic/minimalist | 3 | Restrained; docked for double labeling (micro-frame + meta row repeat the same facts ×10) |
| 9 | Error recovery | 0 | index.html fetch has no .catch (blank page on failure); frame.js .catch(()=>{}) swallowed the P0 |
| 10 | Help & docs | 2 | One footer line; nothing on piece pages; swipe documented nowhere |

## P0 root cause (verified live by both assessors)

Production serves extensionless URLs. frame.js:124-127 compares `location.pathname` basename ("008f") against manifest basenames ("008f.html") → `indexOf` = -1 → the entire nav block silently bails. Verified in live DOM: `navCount: 0`. Arrows, swipe, arrow keys — the product's primary loop per PRODUCT.md — do not exist in production. Hidden by the silent catch; local verification used .html URLs so screenshots never caught it.

## Strengths

1. Thumbs are the real artworks (?thumb=1 live iframes) — the archive never lies; each card carries actual material. Genuinely distinctive.
2. The frame system is a working brand — same grid/type/slots from card to full piece; gallery→piece feels like lifting a print from a drawer. prefers-reduced-motion respected in both layers.
3. Typographic discipline — one family, three cuts, uppercase scoped to the frame, lowercase URLs; Geist Sans header prose vs mono chrome is a well-judged register shift.
4. (B) Zero console errors across all 10 pieces; 10/10 iframes render non-blank; servers/GL contexts torn down clean at current scale.

## Priority issues

1. **[P0] Piece-to-piece navigation is dead in production.** Extensionless rewrite breaks the indexOf match; arrows/swipe/keys never mount. Fix: strip `.html` on both sides (`p.split("/").pop().replace(/\.html$/,"")`), and make the catch visible (log/fallback) so this failure class can't ship silently again.
2. **[P1] No error or empty state on the gallery.** index.html:163 fetch has no .catch — flaky 3G or a deploy hiccup renders header + void. Fix: on-voice failure line in the grid slot + empty state.
3. **[P1] Declared ≥4.5:1 contrast not met.** --ink-faint ≈3.3:1 at 11-12px (dates, batch, footer); frame .dim ≈3.9:1; nav arrows resting 38% ≈1.9:1 and they're interactive. PRODUCT.md commits frame text to ≥4.5:1. Fix: raise faint tiers to ~0.66+ alpha; arrows resting ≥3:1 (UI component minimum).
4. **[P2] Reseed is destructive, invisible, whole-surface.** Any stray tap replaces the day's canonical render; nothing discloses it; with swipe broken, taps are what phone users do. Fix: scope tap target to the canvas interior + one dim frame line ("tap · reseed").
5. **[P2] Archive ordering convention is undocumented and half-wrong.** Manifest is j→a, gallery reverses to a→j; the "newest first" comment is false. Works today (one batch, one date); the day 009 ships, its position depends on which end gets appended. Fix: document the convention (append newest at END of manifest → gallery reverse shows it first), fix the comment, or sort by (date, n) explicitly.

## Persona red flags

- **Casey (distracted mobile, slow 3G):** long scroll of black rectangles before thumbs load (page body is 7KB but fonts 375KB + three.js ~750KB gate paint); her designed gesture (swipe) does nothing; her fallback (tap) silently reseeds the art.
- **Jordan (first-timer):** header onboarding is the best copy on the page, but "click it and it's reborn" lives where it's false (gallery) and is absent where it's true (pieces); ‹ › teaching affordances absent live and 38%-alpha when present. Jordan sees one piece and leaves — the ten-study sequence goes unread.
- **Sam (screen reader/keyboard):** good bones (real links, iframe titles, aria-labels, per-piece document.title) but arrow-key traversal is dead (P0), `r` is undiscoverable, the artwork has no accessible description (frame facts describe the match, not the image), no heading on piece pages, lang="en" wraps Spanish titles.

## Minor observations

- Frame date 06·07·2026 vs meta 2026-07-06; "008 — F" vs "008f" on the same card.
- (B) three.module.min.js (365KB) + three.core.min.js (385KB) each fetched twice — 008b and 008d iframes don't share the fetch; ~1.99MB total gallery weight is dominated by this.
- (B) footer first paragraph measures ~93ch — over the ~75ch line-length ceiling.
- Thumb letterbox #111015 flashes dark under light pieces while loading.
- 008b settles to a near-black void at gallery scale — curation note.
- Favicon pink/blue circles are off-canon (neither in DESIGN.md ink families).
- .meta b is font-weight 400 — semantic bold that isn't bold.
- Desktop 3-col leaves an orphan card + a large void before the footer.
- Scale ceiling: ~10 live GL contexts today; browsers cap ~8-16 — two more batches and thumbs start black-boxing. Plan static captures or offscreen unloading before it's an incident.

## Provocative questions

1. Why do the cards float when everything else is printed? What would the contact-sheet version look like — thumbs sunk into the paper, hairline rule, no elevation, meta as a wall label?
2. In a thumbnail, is the frame still the constant — or noise? Should ?thumb=1 drop the frame and let the artwork alone be the specimen?
3. What does this archive look like at 60 pieces — do batches become rooms, and do settled pieces earn a static print of themselves?
