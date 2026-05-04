# Truco — Design & Product Spec

A scoring app for Argentine Truco, designed for our Monday-night games where the
roster changes week to week. This document is the source of truth: visual
language, motion language, data model, screen flows, and implementation order.

It is opinionated on purpose. Any change to tokens, durations, or easings should
be made *here first*, then propagated to code.

It draws on two project skills:
- `.claude/skills/emil-design-eng` — animation framework, easing curves,
  durations, micro-interaction rules.
- `.claude/skills/frontend-design` — committing to a bold, cohesive aesthetic
  and avoiding generic AI defaults.

---

## 1. The premise

We play truco on Mondays. Different people show up. Sometimes 4, sometimes 8.
Sometimes there's a new face. The phone gets passed around the table.

The app must:

1. Let us pick whoever's at the table tonight from a saved roster.
2. Build any-vs-any teams with even sides — 1v1, 2v2, 3v3, 4v4.
3. Add a brand-new person in two taps without leaving the new-match flow.
4. Track every match in history.
5. Surface stats: matches played, wins, win rate, current streak, head-to-head.
6. Be readable on a phone in a dim room with low battery, with one hand.

Non-goals:
- Multiplayer / sync. Single device, the phone is the marker.
- Online accounts. localStorage only.
- Teaching the rules of truco. We know how to play.

---

## 2. Aesthetic direction — *Mesa de Truco*

The current direction (deep green felt, serif "Truco", suit emojis, "ARGENTINO"
eyebrow) has good bones. The problem is execution: ghost CTAs read as broken,
contrast fails, hierarchy is flat. We're not changing direction — we're
**earning it**.

Reference points:
- Café Tortoni, Bar Británico — wood, brass, warm lamp light on dark surfaces.
- Pulpería at midnight — no chrome, no Vegas, just felt and bone.
- Editorial print: *Apartamento*, *Frieze* — type-driven, generous white space,
  one strong serif moment per spread.

Anti-references (do **not** drift toward these):
- SaaS dashboard chrome. Inter on white with a purple gradient.
- Casino/poker app maximalism — gold leaf borders, neon, chip clinks.
- iOS-system-default cards floating on a light gray void.

### One sentence
Composed, refined minimalism on dark green felt — bone serif, honey accent,
deliberate motion. Earn every flourish.

---

## 3. Visual tokens

All tokens are CSS variables. No hard-coded colors, durations, or easings in
component code.

### 3.1 Color

```css
:root {
  /* Surface — deep, warm forest, not Christmas green */
  --bg:         hsl(155 30% 10%);   /* page */
  --surface:    hsl(155 26% 14%);   /* cards, dialogs */
  --surface-hi: hsl(155 22% 18%);   /* raised, hover */
  --line:       hsl(155 20% 22%);   /* hairlines, dividers */

  /* Ink — bone, not white. Warm. */
  --ink:        hsl(38 28% 92%);    /* primary text */
  --ink-muted:  hsl(38 14% 70%);    /* secondary, eyebrow */
  --ink-soft:   hsl(38 10% 52%);    /* tertiary, captions */

  /* Accent — honey gold, used sparingly (≤ 5% of any screen) */
  --accent:     hsl(38 60% 60%);
  --accent-hi:  hsl(38 72% 70%);    /* hover */
  --accent-ink: hsl(155 30% 10%);   /* text on accent fill */

  /* Suits — only on suit glyphs, never on UI */
  --suit-red:   hsl(354 62% 54%);
  --suit-black: hsl(38 10% 18%);

  /* Status — calm, never bright */
  --danger:     hsl(8 55% 50%);     /* destructive only */
  --win:        hsl(140 38% 55%);   /* match win highlight */

  /* Shadow — soft, low-spread, deep */
  --shadow-1: 0 1px 0 hsl(155 30% 6% / 0.4);
  --shadow-2: 0 8px 24px hsl(155 30% 4% / 0.45),
              0 1px 0 hsl(155 30% 6% / 0.5);
  --shadow-3: 0 24px 60px hsl(155 30% 4% / 0.55),
              0 2px 0 hsl(155 30% 6% / 0.6);
}
```

#### Contrast targets (WCAG)
| Pair                              | Min ratio | Use                      |
|-----------------------------------|-----------|--------------------------|
| `--ink` on `--bg`                 | ≥ 12:1    | Body, titles             |
| `--ink-muted` on `--bg`           | ≥ 4.5:1   | Eyebrow, secondary       |
| `--ink-soft` on `--bg`            | ≥ 3.5:1   | Captions only            |
| `--accent-ink` on `--accent`      | ≥ 7:1     | Primary CTA label        |
| `--ink` on `--surface`            | ≥ 11:1    | Card body                |

A button with `--ink-muted` label on `--bg` background is **never** a primary
CTA. The current screens fail this — primary CTAs render as ~2:1 (oxblood on
green). Fixed by `--accent` fill or `--ink` outline + label.

### 3.2 Typography

Two variable open-source fonts. Self-hosted. No FOUT.

| Role     | Family    | Weights        | Notes                                   |
|----------|-----------|----------------|-----------------------------------------|
| Display  | Fraunces  | 300, 400, 600  | `opsz` 144, `SOFT` 30, `WONK` 0         |
| Body     | Geist     | 400, 500, 600  | Variable; tabular figures for scores    |

Why these: Fraunces has soft optical sizing and real personality at large
display — it earns the "Truco" moment without being decorative-only. Geist is
distinctive enough not to read as Inter, geometric enough to stay clean as
secondary type.

#### Scale (rem, 16px base)
```
--fs-display-xl: clamp(2.75rem, 11vw, 4.5rem);  /* hero "Truco" mark */
--fs-display:    2.25rem;                       /* screen titles */
--fs-h1:         1.625rem;
--fs-h2:         1.25rem;
--fs-body:       1rem;
--fs-small:      0.875rem;
--fs-eyebrow:    0.6875rem;   /* 11px, +0.18em tracking, uppercase */

--lh-tight: 1.05;   /* display */
--lh-snug:  1.2;
--lh-body:  1.5;

--tracking-display: -0.02em;
--tracking-eyebrow:  0.18em;
```

#### Pairings & rules
- "Truco" mark: Fraunces 400, `--tracking-display`, `font-feature-settings:
  "ss01" 1`. This is the only place the soft serif gets to be a ligature.
- Screen titles ("Nueva partida", "Historial"): Fraunces 400.
- Numerical scores: Geist 600, `font-variant-numeric: tabular-nums`.
- Eyebrows ("MODALIDAD", "EQUIPOS"): Geist 500 small caps via OpenType, color
  `--ink-muted`, tracking `--tracking-eyebrow`.

### 3.3 Spacing & sizing
```
--space-1: 0.25rem;   /* 4 */
--space-2: 0.5rem;    /* 8 */
--space-3: 0.75rem;   /* 12 */
--space-4: 1rem;      /* 16 */
--space-5: 1.5rem;    /* 24 */
--space-6: 2rem;      /* 32 */
--space-7: 3rem;      /* 48 */
--space-8: 4rem;      /* 64 */

--radius-sm: 8px;     /* chips, inputs */
--radius-md: 14px;    /* buttons */
--radius-lg: 20px;    /* cards */
--radius-xl: 28px;    /* sheets, modals */

--touch-min: 44px;    /* Apple HIG minimum */
```

### 3.4 Texture

A single SVG noise overlay applied at 4–6% opacity to `--bg`. No drop shadows
on most surfaces — depth comes from `--surface-hi` plus a 1px hairline of
`--line`. Dialogs and bottom sheets get `--shadow-3`.

A tiny decorative element only on the home screen: 4 suit glyphs above the
"Truco" mark, in `--suit-red` / `--suit-black`. Nowhere else.

---

## 4. Motion tokens

```css
/* Easings (Emil's stronger curves) */
--ease-out:     cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out:  cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer:  cubic-bezier(0.32, 0.72, 0, 1);
--ease-soft:    ease;  /* for hover/color only */

/* Durations */
--dur-press:   120ms;
--dur-tooltip: 160ms;
--dur-popover: 200ms;
--dur-dialog-in:  220ms;
--dur-dialog-out: 160ms;   /* asymmetric — exit faster */
--dur-page-in:    240ms;
--dur-page-out:   160ms;
--dur-sheet:      320ms;
--dur-tally:      180ms;

/* Springs (framer-motion drag/sheet) */
--spring-sheet:  { duration: 0.5,  bounce: 0.18 };
--spring-card:   { duration: 0.32, bounce: 0.12 };
```

### 4.1 Choreography rules

These are non-negotiable. Reviewer should reject PRs that violate them.

1. **Never `scale(0)`.** Entrances start from `scale(0.96), opacity: 0, y: 6`.
2. **Buttons press.** Every pressable surface: `transform: scale(0.97)` on
   `:active`, transition `transform var(--dur-press) var(--ease-out)`.
3. **Origin matters.** Popovers/dropdowns: `transform-origin:
   var(--radix-popover-content-transform-origin)`. Dialogs: `center`.
4. **No `ease-in` on UI.** Only `--ease-out`, `--ease-in-out`, or
   `--ease-soft`.
5. **Keyboard / high-frequency actions don't animate.** A score tap is the
   primary action of this app — it happens dozens of times per match. The
   numeric value bumps via tween (180ms) but the button itself only does the
   press scale. No dialog flourish. No confetti. No bounce.
6. **Asymmetric enter/exit.** Exit is always faster than enter. See durations.
7. **Stagger ≤ 5 items, ≤ 40ms apart.** Past that the screen feels slow.
8. **Reduced motion.** All translate/scale becomes opacity-only. Stagger
   collapses to simultaneous fade. Spring becomes 200ms ease-out.
9. **Hover gated.** All hover effects wrapped in
   `@media (hover: hover) and (pointer: fine)`. Mobile is the primary target.

### 4.2 Per-interaction motion spec

| Interaction              | Property → from / to                                | Easing             | Duration           | Notes |
|--------------------------|-----------------------------------------------------|--------------------|--------------------|-------|
| Page transition (in)     | `opacity 0→1, y 8→0`                                | `--ease-out`       | `--dur-page-in`    | framer-motion `AnimatePresence mode="wait"` |
| Page transition (out)    | `opacity 1→0, y 0→-6`                               | `--ease-out`       | `--dur-page-out`   | |
| Dialog enter             | `opacity 0→1, scale 0.96→1`                         | `--ease-out`       | `--dur-dialog-in`  | `transform-origin: center` |
| Dialog exit              | `opacity 1→0, scale 1→0.97`                         | `--ease-out`       | `--dur-dialog-out` | |
| Bottom sheet open        | `transform translateY(100%)→0`                      | `--ease-drawer`    | `--dur-sheet`      | spring-friendly via framer-motion |
| Bottom sheet swipe       | follow finger; on release: spring                   | `--spring-sheet`   | —                  | velocity dismiss ≥ 0.11 |
| Button press             | `scale 1→0.97`                                      | `--ease-out`       | `--dur-press`      | applies to score buttons too |
| Score tally bump         | `opacity 0→1, y 6→0` on new digit                   | `--ease-out`       | `--dur-tally`      | uses tabular nums, no layout shift |
| Tally mark draw          | `clip-path inset(0 100% 0 0)→inset(0 0 0 0)`        | `--ease-in-out`    | 220ms              | one mark per round |
| List stagger (new match) | per-item `opacity 0→1, y 8→0`                       | `--ease-out`       | 240ms each, 40ms stride | cap at 5 |
| Player chip toggle       | `background, color`                                  | `--ease-soft`      | 140ms              | no transform |
| Tab switch (Historial)   | `clip-path` on duplicated active overlay            | `--ease-in-out`    | 240ms              | Emil's "perfect color transitions" pattern |
| Toast (errors only)      | `opacity 0→1, y 100%→0`                             | `--ease-out`       | 320ms              | exit 200ms reverse |

---

## 5. Information architecture

### 5.1 Data model

```ts
type Player = {
  id: string;            // ulid
  name: string;
  joinedAt: number;
  retiredAt?: number;    // hidden from new-match picker, kept in history
};

type Team = {
  name: string;          // default: "Nosotros" / "Ellos"
  playerIds: string[];
};

type ScoreEvent = {
  team: 'A' | 'B';
  points: number;        // 1, 2, 3, 4
  reason: ScoreReason;   // Truco, Envido, etc.
  roundMode: RoundMode;
  at: number;
};

type RoundMode = 'redondo' | 'picapica';
type ScoreReason =
  | 'truco' | 'truco_rechazado'
  | 'retruco' | 'retruco_rechazado'
  | 'vale4' | 'vale4_rechazado'
  | 'envido' | 'envido_rechazado'
  | 'real_envido' | 'real_envido_rechazado'
  | 'falta_envido' | 'falta_envido_rechazado'
  | 'manual';

type Match = {
  id: string;
  startedAt: number;
  finishedAt: number | null;
  mode: 'redondo' | 'picapica';     // initial mode — Pica-Pica gates on team count
  teamA: Team;
  teamB: Team;
  scoreA: number;
  scoreB: number;
  events: ScoreEvent[];
  winner: 'A' | 'B' | null;          // null = abandoned
  abandoned?: true;
};

type AppState = {
  schemaVersion: 2;
  roster: Player[];
  matches: Match[];
  activeMatchId: string | null;
};
```

#### Storage
- localStorage key: `truco:v2`.
- v1 → v2 migration: silent wipe (the previous schema didn't track players or
  history we want to preserve). Warn only if the old key contained an active
  unfinished game; offer a one-tap "discard" toast.

#### Derived: PlayerStats
```ts
type PlayerStats = {
  playerId: string;
  matches: number;
  wins: number;
  winRate: number;        // wins / matches
  pointsFor: number;
  pointsAgainst: number;
  longestStreak: number;
  currentStreak: { kind: 'W' | 'L'; count: number };
  recentForm: ('W' | 'L')[]; // last 5
};
```

Computed on demand from `matches`. Cached in a `useMemo` keyed on
`matches.length`.

### 5.2 Screen map

```
Home
├── (active match?) "Continuar partida"
├── "Nueva partida" ────────────────────┐
├── "Mesa" (roster)                     │
└── "Historial"                         │
                                        ▼
                                 New match flow
                                 ├── 1. Pick players (multi-select from roster, +Nuevo)
                                 ├── 2. Split into teams (tap-to-assign A/B; even-sided)
                                 └── 3. Confirm names → start
                                        │
                                        ▼
                                  Game (running)
                                  └── Score, undo, abandon, finish → Win
                                        │
                                        ▼
                                       Win
                                       └── Save → Home

Mesa
├── Player list
├── + Nuevo
└── Tap → rename / retire / restore

Historial
├── Match list (date · A vs B · score · winner)
│   └── Tap → match detail (event timeline, players, duration)
└── Tab: Estadísticas (leaderboard table)
```

---

## 6. Screen specs

ASCII wireframes are illustrative — they fix layout intent, not pixel exact.

### 6.1 Home

```
┌────────────────────────────────────────┐
│                                        │
│              ♠ ♣ ♥ ♦                   │   ← suit glyph row, 28px
│                                        │
│                                        │
│              T r u c o                 │   ← Fraunces 400, --fs-display-xl
│            A R G E N T I N O           │   ← eyebrow, --ink-muted
│                                        │
│                                        │
│   ┌──────────────────────────────┐     │
│   │     Continuar partida   →    │     │   ← only if activeMatchId, --accent fill
│   └──────────────────────────────┘     │
│                                        │
│   ┌──────────────────────────────┐     │
│   │     Nueva partida       →    │     │   ← --ink outline (or --accent if no active)
│   └──────────────────────────────┘     │
│                                        │
│   ┌─────────────┐  ┌─────────────┐     │
│   │   Mesa      │  │  Historial  │     │   ← ghost, --ink label
│   └─────────────┘  └─────────────┘     │
│                                        │
│                                        │
│   Instalá la app para llevar tu        │   ← --ink-soft, --fs-small
│   propio marcador en cada mesa.        │
└────────────────────────────────────────┘
```

Motion: page-in stagger across the 4 buttons (40ms stride), suit glyphs draw
in via clip-path 400ms once, no loop.

### 6.2 New match — step 1: Pick players

```
┌────────────────────────────────────────┐
│  ←  Volver                             │
│                                        │
│  Nueva partida                         │   ← Fraunces 400, --fs-display
│  Paso 1 de 2 · ¿Quién juega?           │   ← --ink-muted
│                                        │
│  ┌────────┐ ┌────────┐ ┌────────┐      │   ← player chips, multi-select
│  │ Rulo ✓ │ │ Nacho  │ │ Coco ✓ │      │   ← selected: --accent fill, --accent-ink
│  └────────┘ └────────┘ └────────┘      │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │ Titi ✓ │ │ Gus    │ │ Pepe ✓ │      │
│  └────────┘ └────────┘ └────────┘      │
│  ┌────────┐                            │
│  │ + Nuevo│                            │   ← opens inline input
│  └────────┘                            │
│                                        │
│  4 seleccionados · 2 vs 2              │   ← live count + parity hint
│                                        │
│                            ┌─────────┐ │
│                            │ Siguiente│ │   ← disabled until even ≥ 2
│                            └─────────┘ │
└────────────────────────────────────────┘
```

Interactions:
- Tap chip → toggle selection (140ms color transition, no transform).
- "+ Nuevo" → inline input expands above the row, autofocus, Enter saves and
  auto-selects, Esc cancels. Player persists to roster.
- Footer count updates live. "Siguiente" enabled only when count is even and
  ≥ 2. Disabled state: 0.4 opacity, no press scale.

### 6.3 New match — step 2: Build teams

```
┌────────────────────────────────────────┐
│  ←  Volver                             │
│  Paso 2 de 2 · Equipos                 │
│                                        │
│  ┌─ Nosotros ──────┐  ┌─ Ellos ──────┐ │   ← team name editable (Geist 500)
│  │                 │  │              │ │
│  │  ┌────────┐     │  │  ┌────────┐  │ │
│  │  │ Rulo ✓ │     │  │  │ Coco ✓ │  │ │   ← assigned chips
│  │  └────────┘     │  │  └────────┘  │ │
│  │  ┌────────┐     │  │  ┌────────┐  │ │
│  │  │ Titi ✓ │     │  │  │ Pepe ✓ │  │ │
│  │  └────────┘     │  │  └────────┘  │ │
│  │                 │  │              │ │
│  └─────────────────┘  └──────────────┘ │
│                                        │
│  Auto-balancear  ⇄                     │   ← random even split
│                                        │
│                          ┌───────────┐ │
│                          │ ¡A jugar! │ │   ← --accent fill
│                          └───────────┘ │
└────────────────────────────────────────┘
```

Interactions:
- Tap a chip in team A to move to team B (and vice-versa). Spring-driven layout
  transition (`layout` prop on framer-motion, --spring-card).
- "Auto-balancear" picks random even split.
- Validation: team A and B must each have ≥ 1, |A| === |B|.

### 6.4 Game (running)

```
┌────────────────────────────────────────┐
│  ⋯              ⏸ Pausa     ↶  Deshacer│   ← top bar
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  NOSOTROS                        │  │   ← team panel A
│  │  Rulo · Titi                     │  │   ← --ink-muted
│  │                                  │  │
│  │            18                    │  │   ← Geist 600, 4rem, tabular
│  │   ▌▌▌▌▌  ▌▌▌▌▌  ▌▌▌              │  │   ← palitos (5+5+3)
│  │                                  │  │
│  │            [+ sumar]             │  │   ← --accent fill, primary action
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  ELLOS                           │  │
│  │  Coco · Pepe                     │  │
│  │                                  │  │
│  │            14                    │  │
│  │   ▌▌▌▌▌  ▌▌▌▌▌  ▌▌▌▌             │  │
│  │                                  │  │
│  │            [+ sumar]             │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Ronda: Redondo                        │   ← --ink-soft, fs-small
└────────────────────────────────────────┘
```

Tap "+ sumar" → bottom sheet with score reasons:
```
─────────────────────
  ¿Por qué sumó Nosotros?
  ─────────────────────
  Truco                          +1 / +2
  Retruco                        +2 / +3
  Vale 4                         +3 / +4
  ──────────
  Envido                         +1 / +2
  Real Envido                    +2 / +3
  Falta Envido                   +n
  ──────────
  Punto manual                   −  +
```

Each row is two buttons (rechazado / ganado) with point value. Big touch
targets, separator hairlines.

### 6.5 Win

```
┌────────────────────────────────────────┐
│                                        │
│            ¡Ganaron!                   │   ← Fraunces 400, --fs-display
│                                        │
│             NOSOTROS                   │   ← eyebrow, --accent
│           30  vs  22                   │   ← Geist 600, large
│                                        │
│      Rulo, Titi  vs  Coco, Pepe        │   ← --ink-muted
│                                        │
│      Duración 24 min · 17 manos        │   ← --ink-soft
│                                        │
│  ┌──────────────────────────────────┐  │
│  │       Guardar y volver           │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │       Revancha                   │  │   ← starts new match, same teams
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

Motion: scoreboard does a single deliberate count-up over ~600ms (one-time,
not an idle loop). Reduced motion: jumps to final value.

### 6.6 Mesa (roster)

Plain list. Tap a row → bottom sheet with rename / retire. Retired players
are listed below a hairline divider, dimmed, with "Restaurar" action.

### 6.7 Historial

Two tabs: **Partidas** (default) and **Estadísticas**.

Partidas — vertical list, each row:
```
26 Mayo  ·  Nosotros 30 — 22 Ellos
Rulo, Titi  vs  Coco, Pepe                  24 min →
```

Estadísticas — leaderboard table:
```
JUGADOR        PJ   G    %    PF / PC   FORMA
Rulo           14   10  71%  412 / 332  W W L W W
Titi           12    9  75%  ...
Coco           14    4  29%  ...
```

Sortable column headers; default sort by win rate, ties broken by matches
played, ties broken by name.

---

## 7. Component patterns

### 7.1 Button

Three variants. All press to `scale(0.97)` over `--dur-press`.

| Variant   | Background       | Border             | Text              | Use                      |
|-----------|------------------|--------------------|-------------------|--------------------------|
| Primary   | `--accent`       | none               | `--accent-ink`    | one per screen, the verb |
| Outline   | transparent      | 1px `--ink` 60%    | `--ink`           | secondary action         |
| Ghost     | transparent      | 1px `--line`       | `--ink`           | tertiary, paired actions |
| Destructive | transparent    | 1px `--danger`     | `--danger`        | abandon, delete          |

Disabled: 0.4 opacity, no press scale, `cursor: not-allowed`.

### 7.2 Player chip

```
┌────────────┐    ┌────────────┐
│  Rulo      │    │  Rulo  ✓   │   ← selected
└────────────┘    └────────────┘
```

- Idle: `--surface-hi` bg, `--ink` text, 1px `--line` border, radius `--radius-sm`.
- Selected: `--accent` bg, `--accent-ink` text, no border, faint check.
- Transition: `background-color 140ms --ease-soft, color 140ms --ease-soft`.
  No transform.
- Press: `scale(0.97)` 120ms.

### 7.3 Bottom sheet

framer-motion `motion.div` with drag-y. Overlay fades 180ms, sheet animates
with `--spring-sheet`. Velocity-based dismiss (Emil's 0.11 threshold).
`transform-origin: center top` is irrelevant — sheet uses translateY.

### 7.4 Score tally bump

When score increases, the digit container does:
- old value fades out (translateY -8px, opacity 1→0, 100ms)
- new value fades in (translateY 8→0, opacity 0→1, 180ms, --ease-out)

Tabular figures on the container prevent layout shift mid-tween.

### 7.5 Palitos (tally marks)

Render as 5-mark groups with the 5th mark crossing the first 4. Each new mark
draws on with `clip-path: inset(0 100% 0 0) → inset(0 0 0 0)` over 220ms,
`--ease-in-out`.

---

## 8. Accessibility

- WCAG AA contrast everywhere. AAA where the table above demands.
- All interactive elements have `aria-label` if icon-only.
- Touch targets ≥ 44×44.
- `prefers-reduced-motion`: see motion rule 8.
- Keyboard: full nav. Tab, arrow keys for chip multi-select, Enter to confirm,
  Esc to cancel sheets.
- Focus rings: `outline: 2px solid --accent; outline-offset: 2px`. Visible on
  keyboard focus only (`:focus-visible`).
- Body language: Spanish (Argentine). Use voseo where natural ("¿Quién sumó?").

---

## 9. Implementation order

Each phase is independently shippable. After each, the build is green and the
app is usable.

1. **Tokens + base** — install fonts, write `tokens.css` + `globals.css`,
   refactor `tailwind.config.js` to reference tokens. Apply to existing screens
   so contrast is fixed even before refactor. Cost: 1 session.

2. **Data model rewrite + roster** — new `AppState`, migration helper, useGame
   replaced by `useStore`. Build Mesa screen. Cost: 1–2 sessions.

3. **New match flow** — variable-size player picker, team builder, replaces
   current SetupScreen. Cost: 1–2 sessions.

4. **Game screen polish** — apply tokens, tally bump, palitos draw-in,
   bottom-sheet score reasons. Cost: 1 session.

5. **Win + match save** — match record gets persisted to `state.matches` with
   full event log. Revancha shortcut. Cost: ½ session.

6. **Historial + Estadísticas** — list + detail + leaderboard. Sortable table.
   Cost: 1–2 sessions.

7. **Motion pass** — sweep through all screens with the motion checklist
   (§4.1). Add reduced-motion variants. Cost: ½ session.

8. **A11y audit** — keyboard pass, contrast verification, screen-reader pass.
   Cost: ½ session.

---

## 10. Definition of done (per screen)

A screen ships only when all of these are true:

- [ ] Uses only tokens — no hardcoded color, duration, or easing.
- [ ] All CTAs meet contrast targets in §3.1.
- [ ] All press surfaces have `:active` scale.
- [ ] Entrances start from `scale ≥ 0.96`, never `0`.
- [ ] No `transition: all`. Every transition names its property.
- [ ] No `ease-in` anywhere.
- [ ] Hover wrapped in `@media (hover: hover) and (pointer: fine)`.
- [ ] `prefers-reduced-motion` honored.
- [ ] Touch targets ≥ 44px.
- [ ] Keyboard navigable.
- [ ] Looks right in slow-motion playback (DevTools → animation panel → 25%).

---

## Appendix A — sources

- `.claude/skills/emil-design-eng/SKILL.md` — Emil Kowalski's design
  engineering philosophy.
- `.claude/skills/frontend-design/SKILL.md` — Anti-AI-slop frontend aesthetics.
