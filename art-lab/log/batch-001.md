# Batch 001 — 2026-07-06 — seven candidates, seven directions

The opening move of the practice: instead of one sketch, seven — each probing a
different corner of the Lieberman-adjacent space, so curation has something to
bite on. All live at [johnnies.life/art](https://johnnies.life/art/).

| # | title | direction probed | technique |
|---|-------|-----------------|-----------|
| 001 | pool | soft color fields / pigment blending | GLSL gaussian color fields, multiply-style absorption on paper |
| 002 | hills | dithering / 1-bit print look | fbm ridge terrain → 8×8 Bayer ordered dither |
| 003 | misregistration | riso / moiré / print artifacts | two warped stripe layers, multiply inks, drifting registration |
| 004 | lenses | optics / dot grids | canvas 2D dot grid + wandering bulge lenses (lissajous) |
| 005 | plume | flow fields / additive light | 900 particles on fbm flow, `lighter` trails on near-black |
| 006 | wash | watercolor / layering / grain | 110 noise-deformed translucent discs, multiply, edge pooling, grain pass |
| 007 | taffy | feedback / smear | canvas self-drawImage feedback (zoom+rotate) + 3 orbiting lights |

Craft notes:
- Everything is date-seeded (`?seed=` overrides; click reseeds) — the default
  view of a piece is the same for everyone, forever.
- Light pieces (004, 005, 007) sit on near-black, print pieces (001, 002, 003,
  006) on warm paper (#f4f0e6-ish). Two registers, like Zach's.
- Grain/vignette pass on all the paper pieces; none of them should read as
  "screenshot of a shader."

## Curation — awaiting Johnnie

For each: keep / retire / iterate (+ any notes on why).

- [ ] 001 pool —
- [ ] 002 hills —
- [ ] 003 misregistration —
- [ ] 004 lenses —
- [ ] 005 plume —
- [ ] 006 wash —
- [ ] 007 taffy —

## Next up (don't wait for curation to keep the streak)

Daily cadence continues from 008. Pull from the idea bank in `../README.md` —
cone gradients and the venetian-blind band study are the most Lieberman-core
directions not yet tried.
