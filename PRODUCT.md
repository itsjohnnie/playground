# Product

> Scope: this file covers **the art practice** — `johnnie/public/art/`
> (live at johnnies.life/art) and its studio folder `art-lab/`. Other
> playground subprojects are out of scope.

## Register

brand

## Users

- **Johnnie** — the curator. Views on his phone, full-bleed, one piece at a
  time, swiping between them. Curates hard: keep / retire / iterate. His
  verdicts are recorded in `art-lab/` and are binding precedent.
- **Visitors** — people Johnnie shares pieces with. Also phone-first. They
  arrive at a single piece or the gallery index; no onboarding, no chrome
  beyond the frame.

## Product Purpose

A daily generative-art practice after Zach Lieberman: one piece per day,
each built from real data about that day's subject, rendered as code
(GLSL / canvas / three.js / DOM). The gallery is the archive; the frame is
the constant; the piece is the day's entry. Success = a piece that stops
your thumb and survives curation — museum-grade, not feed-grade.

## Brand Personality

**Precise · observational · quiet.** The register of a laboratory or a
museum vitrine: instruments, experiments, specimens — photographed, labeled,
left to rest. Argentine cultural motifs (sol de mayo, guarda pampa, celeste)
appear woven in abstractly; the voice stays the instrument's, never the
flag's. Confidence through restraint and material truth, not volume.

## Anti-references

Confirmed by five curation rounds of retirements:

- SaaS-cream dashboard aesthetics; hero-metric templates
- CRT / glitch / VHS screen effects; spray-paint poster loudness
- Chart-shaped data viz presented as art (axes, scatter plots, timelines
  that read as diagrams)
- Cartoon-flat illustration; clip-art materials (glass/tile/paper that
  looks drawn rather than photographed)

Plus the full generic-AI ban list, enforced strictly: purple gradients,
gradient text, glassmorphism-by-default, identical card grids, tracked
uppercase eyebrow labels as scaffolding, side-stripe borders.
(The frame's uppercase Geist Mono system is a deliberate committed brand
system — the ban targets reflex scaffolding, not this.)

## Design Principles

1. **Instruments, not effects.** Every piece reads as a physical experiment,
   crafted object, or living simulation — something that could sit on a
   bench or a wall. If it reads as "a shader," it fails.
2. **Real data, real algorithms.** Counts are exact; simulations are genuine
   (real physarum, real Chladni physics, real Kepler orbits). Approximations
   are seeded, minimal, and documented in the file header.
3. **Arrive once, then rest.** Motion is arrival: 0→100 over ~10s, then the
   final frame IS the artwork (render loops stop; water may idle at ~12%).
4. **The frame is the constant.** 3:4 stage (full-bleed on phones), 6×8
   hairline grid, Geist Mono, uppercase with bold leads, fixed fact slots.
   All creativity happens behind it; the frame never changes per piece.
5. **Photographed, not rendered.** Grain, directional light, relief, shadow,
   imperfection — every surface gets a finishing pass that fights sterile CG.

## Accessibility & Inclusion

- `prefers-reduced-motion`: settle pieces should jump to (or quickly fade
  into) their final composition; no positional animation.
- Frame text keeps ≥4.5:1 contrast against both grounds (paper and night);
  `F.setTone()` exists so pieces that change register keep the frame legible.
- Touch targets (crumb, prev/next) ≥ 40px effective; swipe is assistive, not
  exclusive — arrows and links always exist.
- No strobe or flash sequences; goal "flashes" stay under gentle amplitude.
