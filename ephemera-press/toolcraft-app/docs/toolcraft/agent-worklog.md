# Implementation Worklog

This file records product decisions and the evidence behind them. Keep it short, factual, and current. Update it after schema, renderer, timeline, layer, export, performance, or acceptance decisions.

## Status

Mode: product

Ephemera Press: a generator of printed ephemera on one portrait sheet, built from the owner's print-ephemera moodboard. Five piece families — concrete poems (four scatter arrangements), typewriter ring mandalas and stitched circles, minimal tour bills (three layouts), repeated-word texture sheets, and circular calculating wheels (four instrument faces) — set in two inks on paper, deterministic per seed, with PNG delivery through the runtime image export pipeline and a Copy SVG clipboard action.

## Automatic Delivery Lifecycle

Keep this worklog human-shaped. For the first product delivery, record the request, decisions, state/output mapping, reference evidence, rejected alternatives, and known risks; one bare `npm run verify:delivery` derives complete contract proof, one build, full functional acceptance, and no measured performance. For later `functional-targeted` delivery, record only the new intent and decisions; the same bare command derives exact ownership-required proof from protected state.

Classifier output establishes complaint authority only and never path localization. A localized performance complaint adds the domain authority below, then one bare `npm run verify:delivery` runs one targeted iteration. If localization remains unresolved regardless of classifier result, ask one user-facing question naming visible operations and offering targeted diagnosis or a complete review; record neither `performance-iteration` intent nor canonical path authority until the answer supplies exact localization evidence. Never ask the user to choose internal path IDs. A broad or honestly unlocalizable problem may present that single choice with a recommendation for complete review, but the user still chooses. A direct complete-review request needs no further clarification. The full audit remains separate and requires an explicit operator request or accepted offer before `npm run verify:perf` may run. Protected receipts own changed files, plans, checks, reports, measurements, and pass/fail evidence.

When `canvas.renderScale` is enabled, record the renderer decision to preserve selected backing quality and map it to functional `renderScaleCoverage` for interaction and steady state, plus playback when timeline is enabled. The worklog may name the protected `canvas-render-scale-backing` recipe, but it cannot claim its evidence or turn a quality failure into performance authority.

## Performance Iteration Entry Contract

For high-confidence ordinary work, record `Performance intent: ordinary-product-work`. For unresolved localization, whether classification returned high-confidence `performance-iteration` or `needs-agent-judgment`, record the unresolved visible operation but no `Performance intent: performance-iteration` field or `Performance paths` until the user's one clarification provides exact localization. For a localized performance complaint or post-clarification targeted choice, record exactly these domain fields in the latest iteration:

```md
- Performance intent: performance-iteration
- Performance request evidence: "<verbatim exact Request quote>"
- Performance paths: ["performance-path:%5B...%5D"]
- Verification: One bare `npm run verify:delivery` will derive and run the protected proof.
```

The quoted evidence must be an exact nontrivial raw substring of `Request` with identical whitespace and Unicode code units. `Performance paths` must be a non-empty unique JSON array of canonical path IDs. Do not record command arguments, changed-file inventory, executed checks, reports, or measurements; the protected planner and receipt own that machine evidence. Each localized complaint or post-clarification targeted choice authorizes one bounded iteration; after it passes, return the app and wait for user evaluation. Classifier output or complaint evidence alone never supplies path localization or authorizes full certification. The separate operator command is permitted only after the user explicitly requests a complete audit or explicitly accepts the agent's offer; the user does not need to name the command.

## Decision Trail

### Iteration 1 — Ephemera Press: the moodboard generator

- Request: "Create a generator that can create all the pieces shown in this image please. There has to be frameworks or libraries that can help with this probably. I want to create a generator. Use the same UI (Toolcraft.sh) used in the Orb Grid slider please."
- Task type: New generated app assembly from the dot-grid studio scaffold; schema/controls; custom Canvas 2D renderer; image export; clipboard action; acceptance and performance modeling.
- User-visible result: A Toolcraft app on a 1080x1350 portrait sheet with five Piece tabs. Poem sets an editable poem as a Drift cloud, a Rain column with accent line numbers, a Gaps measure with interior whitespace, or an uppercase Constellation. Rings sets editable words around overlapping circles (Typewriter), thin stitched circles with accent stitch dots (Stitched), or hand-dotted orbits (Orbits). Tour sets an editable artist and show list as a Diagonal stair with a rule, an Orbit date circle, or a centred Ledger with accent dates. Sheet fills a cell grid with editable repeated words as a Weave, a numbered Ledger chart, or word Patches. Wheel prints a calculating-instrument face: a numbered wire Gauge, a Knitting stitch gauge with an accent band and needle holes, a log-scale Dose calculator with an accent spiral, or a scribbled Dial. Two inks plus the paper color drive every family; Export PNG delivers PNG/JPG at 2K/4K/8K; Copy SVG puts the identical composition on the clipboard as vectors.
- Source/reference checked: The provided moodboard image (concrete poetry pages, typewriter circle compositions, Solange/Kali Malone-style tour posters, repeated-word textile sheets, wire/knitting/dose calculating wheels); the owner's dot-grid studio app (`/Users/johnnie/Downloads/dot-grid-studio/toolcraft-app`) as the scaffold and compliance template.
- Reference inputs: The moodboard image supplied with the request (a static collage — not a runtime to clone, so `appTransferMode.mode: "new-toolcraft-app"`); the dot-grid studio product files as structural templates.
- Docs/contracts read: `workflow.md`; Plan phase `core/runtime-boundary.md`, `assembly-workflow.md`, `core/control-selection.md`, `core/layout.md`, `core/setup-export.md`, `core/performance.md`; Implementation phase `schema-reference.md`, `decision-contract.md`, `component-rules.md`, `renderer-technique.md`, `performance.md`; Verification phase `acceptance-testing.md`.
- Contract rules applied: `runtime-shell-required`, `canvas-no-app-ui`, `canvas-surface-preserved`, `infinity-canvas-scene-bounds`, `controls-product-coverage`, `controls-section-inventory-required`, `controls-component-layout-invariants`, `output-export-required`, `renderer-technique-inventory`, `renderer-view-interaction`, `acceptance-product-observable`, `performance-coverage-levels`, `persistence-policy-explicit`, `workflow-required`.
- View interaction intent: `non-spatial` — every family renders a flat two-dimensional print composition on an artboard; nothing orbits and no orientation gizmo target exists.
- Interaction ownership: All operations are panel-owned schema controls; the canvas carries product output only (pointer-transparent), so no operation could plausibly live on both surfaces and `interactionOwnership` is empty. Canvas pan/zoom remain runtime-owned viewport interactions.
- Animation intent: none — the compositions are static prints. No timeline, no autonomous motion, no animation controls; the renderer draws only on committed state changes, so exports and the preview are the same pure function of state.
- Decision: One display-list architecture (`src/app/ephemera/ops.ts`): every generator compiles committed state into typed print primitives (text runs, dots, rules, circles, arcs, polylines); one Canvas 2D painter rasterizes the list for preview and export at CSS x devicePixelRatio x renderScale backing, and one serializer writes the identical list as standalone SVG for the Copy SVG action. Generators live in `engine.ts` (mulberry32-seeded, all layout math metric-free so the engine is a pure function testable in Node); value mapping in `params.ts`; the finite artboard defaults to a 1080x1350 portrait sheet and the infinite-mode product scene is that constant centred rect. Typography is baked into each family (typewriter mono, poster grotesk, book serif system stacks) as part of the piece designs rather than exposed as typography controls. Section structure separates typesetting entities from source material: Verse/Verse Text, Billing/Itinerary, with mode-gated sections titled by entity (Verse, Circles, Billing, Itinerary, Texture, Instrument) rather than by branch value, and the two multiline editors isolated in single-control sections because `code` is a standalone-layout control.
- Alternatives rejected: SVG/DOM rendering for the preview (thousands of positioned text nodes thrash layout on slider drags; the display list preserves vector output through Copy SVG instead — recorded as `intentionalRasterizationReason`); WebGL (no per-frame animation, no fidelity gain for fillText/arc workloads); a `fontPicker` typography control (the piece families own their typography as design identity; exposing family/weight/size would break the moodboard fidelity and split typography ownership across five generators); per-mode separate apps (the request is one generator with one UI); canvas text measurement for layout (breaks Node determinism; estimated advance widths suffice for scatter collision); porting the dot-grid's autonomous animation (prints are static).
- State/output mapping: All product settings live at runtime value targets (`piece.*`, `ink.*`, `poem.*`, `rings.*`, `tour.*`, `sheet.*`, `wheel.*`, `appearance.background`, `export.includeBackground`, `export.image.*`). `readEphemeraParams(state.values, W, H)` feeds the pure engine; `computePiece` returns the display list plus deterministic text/mark counts written to `data-piece-texts/marks/mode` for test diagnostics; the same list paints the preview, the export frame, and the Copy SVG payload; `getEphemeraSceneRect(state)` returns the constant sheet rect for infinite mode.
- Renderer quality: The preview keeps exact CSS x devicePixelRatio x selected `canvas.renderScale` backing in interaction and steady state; `renderScaleCoverage` targets `canvas.renderScale` with the protected `canvas-render-scale-backing` recipe.
- Input boundaries: Poem text clamps at 1600 characters, single-line word fields at 120 characters, itineraries at 36 shows, and the sheet grid at 20000 slots, so user text never scales renderer work unbounded.
- Performance intent: ordinary-product-work
- Verification: One bare `npm run verify:delivery` will derive and run the protected proof.
- Delivery-state note: Executed: `npm run typecheck`; the full Vitest gate (`npx vitest run src` — all 434 product and framework tests pass); the docs, integrity, and code-health checks; a production build; a live browser smoke of all five modes and all four wheel faces; and — beyond the dot-grid precedent — the registered product browser suite itself (`playwright test` minus perf/kernel): every product spec passes, including applicability-case evidence across mode and sibling-selector branches, live slider drags, decoded 4K PNG export with bounds and pixel proof, clipboard SVG, render-scale backing, infinity-canvas restoration and crop, and persistence reload. The only remaining browser failures are framework self-tests on synthetic fixtures that fail identically in the untouched dot-grid original (see Risks). The protected `verify:delivery` receipt itself has not run.
- Risks: See Risks below.

### Iteration 2 — Reference-fidelity pass with overlay proofs

- Request: "I want you to try again. This time really try. Make sure that they look and feel amazing, and can be copied and pasted (or added as an avg). Most here are lacking. When you think you're done, compare side by side and overlapping with low opacity so that we can nail it. Understand the physics and logic Of each one will also greatly help."
- Task type: Engine redesign for reference fidelity; comparison-harness verification; SVG-parity verification.
- User-visible result: Every generator was rebuilt against the actual moodboard pixels (recovered from the request and cropped into seventeen reference plates). The wire gauge now cuts a scalloped silhouette whose slot widths follow the real AWG progression (0.8905 per gauge), with terminal drill holes, radial-spoke numerals that flip on the left half, counterclockwise numbering from half-past-four, and the stamped block offset lower-left like the №283. The knitting wheel is a proper volvelle: a punched second-ink band with curved lettering, sector cell rings, and a dark banner crossing the whole wheel with knockout number windows and a grommet. The dose calculator carries a genuine 1-2-5 logarithmic ring, a pale accent disc with a time scale (1HR…1YR), a comb of logarithmic-spiral isodose curves, and the stacked radial START/EXPOSURE arrow. The dial sets big numerals (one always missing), hand-drawn per-gap connectors (arrows, waves, zigzags, loop-de-loops, Chaikin-smoothed) and one looping doodle. Poems: the drift cloud gained the reference's diamond envelope and larger italic serif; rain became the typed staircase with its parallel number column and caption; gaps gained a bold centred title, staircase indents, one interior gap per line, and bold floating refrains detected from repeated lines. Rings: typewriter is now a repeating pattern of typed circle-units with word gaps, centre word stacks, and dotted guide arcs; stitched is red running-stitch circles with French-knot dots; orbits are halftone nests of dotted circles. Tours: the diagonal bill moved into the lower-right quadrant with the letterspaced lowercase artist and a rule running past both ends; orbit became the circle-with-vertical-rule layout with alternating show blocks; ledger became wandering centred accent blocks with underlined region headers parsed from single-field lines. Sheets: weave lays token bands with a rotated selvedge column; ledger sets inline-numbered entries with circled section heads.
- Source/reference checked: The original moodboard image, recovered at full resolution from the session transcript and cropped into per-piece reference plates; each plate studied for its mechanics before coding.
- Reference inputs: seventeen reference crops (wire gauge, Boye wheel, dose calculator, exposure disc, clock drawing, typed mandala, embroidery sampler, two Solange posters, Kali Malone itinerary and poem page, typed staircase page, word chart, textile swatches, and others).
- Docs/contracts read: routing docs previously read this delivery govern; no new surfaces were added.
- Contract rules applied: unchanged from Iteration 1 (engine-only changes inside existing acceptance structure).
- View interaction intent: unchanged `non-spatial`.
- Interaction ownership: unchanged (panel-only).
- Decision: Verification by overlay: a comparison harness drives the real app, captures each generated piece (typing the reference's own public-domain or factual text where that sharpens registration), and renders side-by-side and 45%-multiply overlay sheets against the reference plates; three rounds of overlay-driven refinement were applied. SVG delivery was proven by a parity harness that clicks the real Copy SVG action, renders the clipboard document, and overlays it on the canvas raster — registration is exact (text rotation, tracking, weights, and geometry).
- Alternatives rejected: measuring live glyph metrics for layout (breaks the pure Node-testable engine; estimated advances remained sufficient at overlay scale); reproducing reference wordmarks or artist names as defaults (the defaults stay original — SOLSTICE, THE COUNTING, Ephemera Press — while users may type anything).
- State/output mapping: unchanged targets; the new `box` primitive (filled rectangle) joins the display list for the volvelle banner and windows, and text gains a 300 weight for light numerals.
- Performance intent: ordinary-product-work
- Verification: One bare `npm run verify:delivery` will derive and run the protected proof.
- Risks: See Risks below.

## Decisions

### Renderer

- Decision: Canvas 2D preview and export, one custom pipeline (`ephemera-canvas-2d-v1`) with an interaction-frequency `render-piece` composite pass and a batch `export-frame` pass; no animation loop.
- Reason: The workload is a few thousand fillText/arc calls recomposed per interaction; Canvas 2D repaints it in one pass, while DOM/SVG would relayout thousands of text nodes per slider step. Vector delivery is preserved through the Copy SVG serializer over the same display list.
- Evidence: `assessToolcraftRenderPlan` passes with no structural errors (asserted in `app-performance.test.ts`); the interaction-frequency pass avoids the high-frequency benchmark comparison because nothing renders per frame.

### View Interaction

- Decision: `non-spatial`.
- Reason: Flat two-dimensional print compositions; no visible 3D scene or model, nothing to orbit.
- Evidence: `appProductReadiness.viewInteraction` with a concrete reason; no `orientationGizmo` targets exist.

### Interaction Ownership

- Decision: Panel-only product operations; empty `interactionOwnership`.
- Reason: The canvas shows output only (pointer-events none); no operation is mirrored across surfaces.
- Evidence: No canvas handles or custom interactions are declared.

### Timeline

- Decision: No timeline and no animation.
- Reason: The products are static prints; image-only export intent; nothing plays back.
- Evidence: `panels.timeline` omitted; `appTransferMode` declares no `animationIntent` because no animation controls or autonomous motion exist.

### Layers

- Decision: No layers.
- Reason: Single-output composition; no multiple editable objects, media, or visibility workflow.
- Evidence: `panels.layers` omitted; no `selectedLayer.*` targets.

### Controls

- Decision: Ten authored sections: Background (source pair consumed into Setup), Piece (mode tabs + seed), Inks (primary + accent colors), Verse (arrangement/spread/leading/type size), Verse Text (the poem, one `code` editor), Circles (style/words/count/size/gather/marks), Billing (artist/layout/leading), Itinerary (the show list, one `code` editor), Texture (words/pattern/cell/void/emphasis), Instrument (face/divisions/rings/notches), plus Image Export and the sticky Export actions. Mode-gated sections use conditional applicability on `piece.mode`; `rings.words` adds a second predicate on `rings.style` because only the Typewriter style sets words; every control declares explicit applicability and a performance role.
- Reason: Entity-first grouping with sections titled by the edited entity, never by the gating branch value (the dependency-group validator enforces this); `tabs` is the exact owner for the finite mode choice that replaces the workflow below; `code` is a standalone-layout control, so each multiline editor is its own single-control section whose editor is that entity's complete editable surface (mirroring the dot-grid's SVG Source pattern); `text` owns the short single-line word fields; two plain half-width colors form the Inks entity with distinct role labels.
- Evidence: `appControlSectionInventory` with stable entity ids; slider domains chosen from the moodboard compositions (seed 1-9999, spread/void/emphasis/gather 0-1, leading 1-2.4 and 0.8-1.8, type size 0.5-1.6, ring count 1-12 discrete, ring size 0.2-0.9, cell 10-44px, divisions 16-96, rings 1-6 discrete); all framework layout/naming/applicability meta-tests pass.

### Export

- Decision: Image-only delivery (`toolcraft-default`); `Image Export` format/resolution selects (PNG/JPG at 2K/4K/8K, defaults png/4k) in one inline row; sticky `Export PNG` action with `role: "export-image"`; one shared deterministic `exportRenderer` frame; an additional sticky `Copy SVG` clipboard action serializing the same display list.
- Reason: The request names a generator of print pieces — still images; nothing requested video. Copy SVG is additional clipboard delivery (like the dot-grid's Copy dots) and does not change the recorded artifact intent.
- Evidence: `productReadiness.exportIntent` image `toolcraft-default`, video `not-requested`; artifact acceptance decodes real bytes, file types, and 2048/4096/8192 long edges.

### Performance

- Decision: Three numeric workload dimensions — `sheet-cell` (schema target `sheet.cell`, minimum boundary 10px, direct mapping: smaller cells quadratically add word slots), `wheel-divisions` (schema target `wheel.divisions`, maximum boundary 96, direct mapping), and `export-longest-edge` (discrete `export.image.resolution` mapped 2k/4k/8k to 2048/4096/8192, quadratic batch mapping). One scenario per canonical derived path (initial-render, control-change, control-drag, viewport-drag, viewport-zoom, export) with path ids from `deriveToolcraftPerformancePaths`. Viewport drag/zoom invalidate nothing (runtime transforms own them). All other visible controls are `responsiveness` with recorded reasons: text inputs are clamped to fixed budgets, ring counts are bounded at twelve, and color/leading/spread/style controls reposition or repaint the same bounded op list.
- Reason: The sheet grid and the wheel scale resolution are the two real interactive magnitudes; export pixels scale with the selected long edge; everything else is constant-cost recomposition.
- Evidence: `src/app/app-performance.ts` envelope, fixture adapters (continuous sliders, exhaustive-discrete resolution), pipeline registration shared by composition and assessment; `src/app/app-verification-impact.json` maps every product module with pass ownership. First delivery runs functional proof only; no measured performance was run.

### Persistence

- Decision: Default runtime localStorage workspace persistence (values/canvas/panels).
- Reason: The contract default fits a local creative tool; the composition should survive reloads.
- Evidence: `persistence.reload` acceptance row with slices equal to the resolved plan; the protected reload browser proof.

## Evidence

- Source reviewed: the moodboard image supplied with the request; the complete dot-grid studio product source as the structural template; local Toolcraft docs per the routing table.
- Contract applied: `new-toolcraft-app` transfer mode (the moodboard is a static image, not a runtime to clone, so no reference study or feature inventory applies); product readiness names the requested behavior verbatim.

## Verification

Protected receipts own changed files, the derived plan, commands, selectors, reports, measurements, and pass/fail evidence. Decision Trail iterations record only one bare `npm run verify:delivery` narrative.

## Risks

- Risk: The protected `verify:delivery` receipt has not been executed; the equivalent functional evidence was gathered directly (full Vitest gate plus the registered product browser suite, all passing).
- Risk: `scripts/toolcraft-product-control-boundary.test.mjs` (a framework self-test on synthetic fixtures) fails on this machine because filesystem enumeration ordering differs from the authors' environment; `scripts/toolcraft-port.test.mjs` also fails inside sandboxed shells that deny localhost binds. Both are environment issues unrelated to product code and predate this app (they reproduce in the dot-grid original).
- Risk: Five framework-owned browser self-tests fail identically in this app and in the untouched dot-grid original — `app-browser-runtime-requirements` (its bare-id expectation contradicts the state-suffixed requirements the signed derivation emits for `renderScaleCoverage` rows) and the synthetic orientation/model-appearance fixture specs (this product has no models or orientation). They are upstream framework issues, not product regressions, and are excluded from the product evidence claim.
- Risk: Canvas text layout uses estimated advance widths (not measured glyph metrics), so scatter collision margins are approximate; extreme type-size plus spread combinations can let long words graze each other. This is accepted as part of the typewriter aesthetic.
- Risk: The system font stacks (Courier New, Helvetica Neue, Times New Roman) render slightly differently across platforms, so exported pixels are platform-dependent even though the display list is deterministic. The SVG payload embeds the same stacks with generic fallbacks.
- Risk: The `esbuild -> esbuild-wasm` npm override (inherited from the scaffold) works around this machine's binary-authorization block; builds and tests are slower than with the native binary.
