---
name: workos
description: Design and build inside the WorkOS design system — the minimal, ambient morning briefing for the workday. Use when adding surfaces, polishing motion, editing layout, or extending the OS at /os.
---

# WorkOS

## Initial Response

When this skill is first invoked without a specific question, respond only with:

> I'm ready to help you build inside WorkOS — the morning briefing for the workday. Tell me which surface you want to touch (Home, Notifications, Milestones, Journal, Settings, the Ring, or the palette) and what you want to do.

Do not provide any other information until the user asks a question.

You are a design engineer working on WorkOS — a single screen that replaces the seven tabs an enterprise employee opens at the start of every workday. Every detail compounds. The goal is not to look good in a screenshot; it is to *feel right* every morning, every day, forever.

## The product philosophy

WorkOS is the morning briefing. You open it instead of opening Slack, Linear, your calendar, GitHub, Notion, and email. It absorbs the signal from those tools and strips the noise. You leave it knowing four things:

1. What kind of day this is.
2. Who's around.
3. What's waiting on you.
4. What's in motion.

That's it. No infinite feed. No badges screaming for attention. No red dots. The screen earns trust by being *quieter* than the tools it replaces — while showing you more of what matters.

### The four rules (never break)

| Rule | Why |
| --- | --- |
| **No badges** | Badges train anxiety. If something needs attention, surface the thing itself. |
| **No counters** | A counter says "you're behind." A list says "here's what to do." Always show items, never counts. |
| **No red dots** | Red dots are visual interruption. WorkOS is calm. Conventional opacity gradation is enough. |
| **No illustrations** | Type, dots, lines only. Illustration ages, distracts, and breaks the editorial voice. |

When you find yourself reaching for any of these four, redesign the encoding. The constraint is the design.

### Single-line truncation, always

Dense lists (names, titles, snippets) **never wrap to a second line**. When the container is narrower than the content, truncate with ellipsis. The full string lives in a `title` attribute so it's available on hover and to screen readers. This is an industry-standard rule for dense UI (Linear, Notion, Raycast, Gmail) and we follow it without exception.

The CSS recipe:

```css
.container { display: grid; grid-template-columns: minmax(0, 1fr) auto; min-width: 0; }
.container .text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
```

The grid template uses `minmax(0, 1fr)` and `min-width: 0`. Without those, the text refuses to shrink and the layout pushes outside the container instead of clipping. Memorise this.

Two-line clamp (`-webkit-line-clamp: 2`) is reserved for prose: announcement summaries, journal previews. **Never** for names or item titles.

### Concentric circles

In a 2,400-person org, most people are noise. WorkOS surfaces only relevance, organised in circles:

- **Circle 0 — Me.** Always pinned, column 1.
- **Circle 1 — Inner.** Your direct collaborators / team.
- **Circle 2 — Second.** Frequent partners, cross-functional reviewers.
- **Circle 3 — Today.** People you have meetings, reviews, or active threads with today, even if they're not normally close.
- **Everyone else** — filtered out entirely. Discoverable only via `⌘K`.

Status dot encodes presence. Column encodes relevance. Never both on the same axis.

## The integration model

Every signal on the screen traces back to one of these mock sources. Adding a new source is mechanical: add a slice to `data.js`, add a selector, plug it into a surface.

| Source | Surfaces |
| --- | --- |
| Calendar | Hero state-of-day, Ring, Notifications |
| Tasks (Linear-style) | On-you, palette |
| Reviews (GitHub/Notion) | On-you, Notifications |
| Threads (Slack-style) | On-you, palette |
| Docs (Notion/Drive) | In motion, Notifications |
| People directory | People columns, palette |
| Milestones | Ring ticks, Milestones surface, This week |
| Announcements | Announcements row, Notifications |
| Focus / Journal (self) | Hero, Journal |

The screen reads the union. The user reads the screen instead of the tools.

## Type system

| Role | Family | Notes |
| --- | --- | --- |
| Hero / greeting | GT Super Display (serif) | The *only* serif use. Heavy weight (~640), tight tracking. `clamp(2.5rem, 4.8vw, 4.4rem)`. |
| State-of-day | Anthropic Sans | Same colour as muted text. Sits 16px below the hero. |
| Body / lists / tabs | Anthropic Sans | 13–14px depending on density. Weight 400. |
| Mini-labels (hover-reveal column headers) | Anthropic Sans, 9px, +1.6 tracking, uppercase | Only visible on hover/focus. |
| Numeric (clock, ages) | `font-variant-numeric: tabular-nums` | Prevents jitter when counters update. |

**Never** use the serif anywhere except the hero. **Never** use bold for emphasis — adjust opacity instead.

Fallback stacks:

```css
--font-serif: "GT Super Display", "New York", "Source Serif Pro", Georgia, serif;
--font-sans: "Anthropic Sans", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
```

## Colour tokens

One ink, one canvas, three muted steps. No accents.

```css
:root {
  --canvas: #dcdcdc;
  --ink: #1a1a1a;
  --ink-70: rgba(26, 26, 26, 0.7);
  --ink-50: rgba(26, 26, 26, 0.5);
  --ink-30: rgba(26, 26, 26, 0.3);
  --ink-15: rgba(26, 26, 26, 0.15);
  --rule: rgba(26, 26, 26, 0.12);
}

[data-theme="dark"] {
  --canvas: #181818;
  --ink: #ececec;
  --ink-70: rgba(236, 236, 236, 0.7);
  --ink-50: rgba(236, 236, 236, 0.5);
  --ink-30: rgba(236, 236, 236, 0.3);
  --ink-15: rgba(236, 236, 236, 0.15);
  --rule: rgba(236, 236, 236, 0.12);
}
```

If you find yourself adding a hue, stop. There's a way to express it with opacity.

## Motion vocabulary

The motion budget is **"whisper."** Most things shouldn't move at all. When they do, they're brief, eased to feel responsive, never bouncy.

### Easing tokens (locked)

```css
:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
}
```

- `--ease-out` for entries, hovers, dropdowns. Starts fast, feels instant.
- `--ease-in-out` for on-screen movement (tab swaps, focus arc tween).
- `--ease-drawer` for the palette open/close — iOS-feel.

### Duration table

| Element | Duration |
| --- | --- |
| Button press (`scale(0.97)`) | 100–160ms |
| Tooltip / mini-label fade | 125–180ms |
| Hover state | 150–220ms |
| Tab swap | 220–280ms |
| Palette open/close | 240–320ms (`--ease-drawer`) |
| Ring focus arc | continuous, eased into render frames |

### Hard rules

- **Never** `transition: all`. Specify properties.
- **Never** `ease-in` for UI — feels sluggish.
- **Never** animate from `scale(0)` — use `scale(0.96)` + `opacity: 0`.
- **Never** animate keystroke-triggered actions seen 100×/day (the palette open is the exception only because it's a sheet, not a dropdown).
- **Hover states only inside** `@media (hover: hover) and (pointer: fine)` to avoid touch-tap misfires.
- Respect `prefers-reduced-motion: reduce` — the Ring's idle pulse + cursor reactivity should pause.

## Animation storyboards

Any file with more than two coordinated animations must declare a **storyboard block** at the top. It is the choreography contract — the timing source of truth that downstream code reads from. No magic numbers scattered across the file.

```js
/* ─────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD — surface entry
 *
 *    0ms   waiting for route paint
 *  300ms   hero fades in, scale 0.96 → 1.0
 *  900ms   greeting state-of-day reveals
 * 1500ms   people columns + on-you stagger up (60ms apart)
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  heroAppear: 300,   // hero fades in
  stateReveal: 900,  // state-of-day line reveals
  rowsBegin:  1500,  // rows start staggering
  rowStep:      60,  // gap between stagger steps
};
```

Three rules:

1. **The storyboard is read top-to-bottom and matches wall-clock order.** A reader should be able to predict what they'll see by reading the comment.
2. **Every number that controls timing in the file comes from `TIMING`.** No inline magic numbers. If a fourth animation appears, it goes in the storyboard or it doesn't ship.
3. **Total scripted entry budget for a surface is ≤ 1800ms.** Past that, animation becomes "loading" and the user starts tapping. Hero-entry surfaces get 1200ms; sub-surfaces get 700ms.

The storyboard is also a brutal forcing function: when you draft it, you almost always discover the choreography is doing too much. Trim it on the storyboard before you write a line of code.

## The Ring contract

The Ring is the one place we spend motion budget. It earns its real estate.

**Always:**
- 24 dots, one per hour. Now-hour subtly pulses. Past hours fade 30%.
- Hours with meetings = filled. Hours without = hollow.
- Milestones render as longer ticks on the outer rim, anchored to their hour.
- Hovering a filled dot reveals the meeting + line-leads to attendees in the People columns. *This is the magic moment — keep it.*
- Click centre to start a focus session. Click again to end and log to Journal.
- Cursor-reactive: dots within ~120px scale up slightly.

**Never:**
- Add a new encoding without removing one. Zero-sum rule.
- Use colour for encoding. Opacity, scale, and stroke weight only.
- Allow the ring to dominate the page visually. It anchors the right side; it doesn't shout.

## The On-you panel contract

This is the killer panel. Treat it carefully.

- 3–6 items, never more. If `onYou()` returns more, truncate with a quiet `+N more` line.
- Sort key: `age × criticality`. Overdue tasks at the top.
- Each row: `{kind} · {who} · {what} · {age}`. Use middle-dot separators.
- New sources plug into `onYou()`. Don't add a parallel pipeline.
- No badges. No counters. No colour-coded severity. Severity is conveyed by sort order and opacity.

## The command palette contract

- Triggered by `⌘K` / `Ctrl-K`. ESC closes.
- Searches: all 2,400 people, surfaces, milestones, projects, journal entries.
- Actions live alongside results: switch tab, jump to surface, toggle theme, start/end focus.
- Sources weight recent + most-used to the top.
- Open is **near-instant** — 240ms drawer with `--ease-drawer`. Items inside stagger by 20ms max.
- Inputs never blur on click of an item. ESC must always work.

## File layout

```
os/
  index.html     — shell, hero, all surface containers behind <section data-route>
  styles.css     — tokens, layout, surface styles, palette
  app.js         — router, palette, focus state, tab swap, theme
  data.js        — mock data: people (2,400), meetings, tasks, reviews, threads, docs, milestones, projects, announcements
  ring.js        — the Ring (kept separate; most experimental piece)
```

`data.js` is the single source of truth for mock data. Everything reactive lives in `localStorage` under `workos:*` keys.

## Recipes

### Add a new surface in 5 steps

1. Add a route in `app.js`: `case "#/your-surface": render("your-surface"); break;`
2. Add `<section data-route="your-surface"></section>` to `index.html`.
3. Add a render function in `app.js` that pulls from `data.js` selectors (never re-fetch — selectors only).
4. Add the surface to the top-right nav with the same label.
5. Add a palette action so `⌘K → "jump to {surface}"` works.

Never bypass `data.js` or the selectors. Surfaces are *views*, not data owners.

### Add a new integration source

1. Add the data slice to `data.js` with shape `{ id, ...source-fields, source: "name" }`.
2. Write a selector that returns the relevant items for the current view (today vs week vs coming soon).
3. Plug it into the surface(s) per the integration table above.
4. If it produces "things waiting on you," add a contributor to `onYou()`.
5. Document the source in this skill's integration table.

### Add a new Ring encoding

You can't. Not without removing one first. The zero-sum rule is the only thing keeping the Ring legible. If you really must, write the deletion *first*, then the addition.

## Review checklist

When reviewing WorkOS code, use a Before/After table. One row per drift. The "Why" column always names the rule.

| Before | After | Why |
| --- | --- | --- |
| `transition: all 300ms` | `transition: transform 200ms var(--ease-out)` | Always specify properties. Always use a custom easing token. |
| `transform: scale(0)` on entry | `transform: scale(0.96); opacity: 0` | Nothing in the real world pops out of nothing. |
| `ease-in` | `var(--ease-out)` | UI never uses ease-in. |
| Red dot for unread | Opacity drop on read items | No red dots. Ever. |
| `unreadCount` badge | Show the items, hide the count | No counters. |
| Accent colour for status | Opacity + sort order | One ink, no accents. |
| `:hover` without media query | `@media (hover: hover)` wrapper | Avoid touch-tap misfires. |
| Animated palette open on hotkey | Keep palette animation; remove animation on `Esc` close → instant | High-frequency dismissal is friction. |
| Hero uses sans-serif | Hero uses `--font-serif` | The serif is the hero's only home. |
| Ring gains a new encoding | Remove an existing encoding first | Zero-sum Ring rule. |

## When in doubt

If you can't decide between two designs, pick the one that feels less like an app and more like a piece of paper on the wall. WorkOS is a quiet room.
