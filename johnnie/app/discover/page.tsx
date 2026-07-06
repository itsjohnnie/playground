import type { Metadata, Viewport } from "next";
import { getDiscover } from "@/lib/content";
import { asset } from "@/lib/asset";
import DiscoverGrid from "./discover-grid";

export const metadata: Metadata = {
  title: "Discovery Area — Designed by Johnnie Gomez",
  // Web app manifest: iOS 26 deprecated the apple-mobile-web-app-* metas; the
  // manifest's display:"standalone" is what current Add to Home Screen reads
  // to run the page as a true full-screen web app. The metas below stay for
  // older iOS. (The manifest is baked into the web clip at add-time — icons
  // added before this shipped keep their old chrome until re-added.)
  manifest: asset("/discover.webmanifest"),
  // Home-screen (Add to Home Screen) label — iOS uses this instead of the
  // page <title>, which stays the long form for tabs/search. capable and
  // statusBarStyle MUST be re-declared here: this object replaces the layout's
  // appleWebApp wholesale, and omitting statusBarStyle makes Next emit
  // "default", which shoves the standalone webview below the status bar
  // (the top-bar regression this comment exists to prevent).
  appleWebApp: {
    capable: true,
    title: "Discovery",
    statusBarStyle: "black-translucent",
  },
};

// Discover-only: paint edge-to-edge into the iOS safe areas so the gallery
// fills the whole device (behind the translucent Safari chrome / notch / home
// indicator) instead of being boxed into the area between the bars.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function DiscoverPage() {
  const items = getDiscover();

  return (
    <>
      {/* Floating control bar: home link, page label, light/dark toggle. */}
      <div className="discover-comp">
        <a href={asset("/")} className="discover-logo">
          <div>Johnnie Gómez Álzaga ®</div>
        </a>
        <div className="discover-text">
          <div>Discovery Area</div>
        </div>
        <a data-theme-toggle href="#" className="toggle-mode" aria-label="Toggle light or dark mode">
          {/* Sun/moon morph: a disc that masks into a crescent (moon) while
              eight rays fold in; back out to a smaller disc + rays (sun).
              Pure CSS, state-driven by html.is-dark — styles below. */}
          <span className="button-icon sunmoon" aria-hidden="true">
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
          </span>
        </a>
      </div>

      {/* The draggable, infinitely-wrapping gallery. Items below are the source
          pool; the client script clones them into a torus grid. */}
      <div className="hero">
        <div className="hero-list-wrapper">
          <div role="list" className="hero-list">
            {items.map((it) => (
              <div role="listitem" className="hero-item" key={it.image}>
                <img
                  src={asset(it.image)}
                  loading="eager"
                  alt=""
                  className="hero-image"
                />
                <div className="hero-meta_data">
                  <div>{it.name}</div>
                  <div className="hero-meta_data-lighter">{it.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="hero-gradient cc-white"></div>

      <DiscoverGrid />

      {/* Discover-only styles: the grid layout (the source site shipped these
          from JS; here they're plain CSS) plus the native dark theme. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
/* Full-screen document so the absolutely-positioned grid below can reach the
   true screen edges. html/body fill the screen and the grid is absolute.
   <body> is the positioning root (relative) so every absolute layer sizes to
   the document box we control below — NOT the initial containing block, which
   iOS sizes short in standalone mode. */
html, body { overflow: hidden; height: 100%; margin: 0; }
body { position: relative; }
.hero { position: absolute; inset: 0; overflow: hidden; }

/* iOS standalone (Add to Home Screen): WebKit resolves the 100%-height
   document as (screen minus the status bar) but paints it from the very TOP
   of the screen — so the layout ends a status-bar-height short of the BOTTOM,
   leaving a page-coloured bar above the home indicator. Grow the document by
   the top inset so its bottom edge lands on the true screen bottom, and pin
   the page's fixed layers (vignette, control bar, stage) to that corrected
   document instead of the short standalone viewport. */
@media (display-mode: standalone), (display-mode: fullscreen) {
  /* Only <html> gets the extra inset — <body> is height:100% OF html, so
     putting the calc on both would compound to 2× the inset.
     The extension is capped by --vp-shortfall (screen height minus
     innerHeight, set pre-paint in the head script): iOS has shipped THREE
     standalone geometries — legacy black-translucent (viewport at screen
     top, short by the status bar: env-top 62 / shortfall 62 → extend),
     default-chrome (webview below the status bar: env-top 0 → don't), and
     manifest-standalone (full viewport: shortfall 0 → don't, or the bar
     would push below the screen). min() picks correctly in all three. */
  html { height: calc(100% + min(env(safe-area-inset-top, 0px), var(--vp-shortfall, 0px))); }
  .hero-gradient.cc-white,
  .discover-comp,
  .discover-stage { position: absolute; }
  /* The vignette's base class sets height:100dvh, which beats inset:0 —
     let inset:0 govern so it covers the extended document. */
  .hero-gradient.cc-white { height: auto; }
}

/* Unified light/dark transition. Every themed surface eases on the SAME timing
   so backgrounds, text, borders, shadows and the toggle icon all change in
   lockstep — previously each had a different transition (or none), so they
   shifted at different speeds. An explicit light background-color on <body>
   gives the body a real value to ease from. */
body { background-color: #fff; }
body,
.discover-comp,
.discover-logo,
.discover-text,
.toggle-mode,
.hero-image,
.hero-item {
  transition: background-color .45s ease, color .45s ease,
    border-color .45s ease, outline-color .45s ease, box-shadow .45s ease !important;
}
/* Press feedback on the control-bar buttons. Re-declared after the theme rule
   above (which sets their transition !important without transform) so the
   colour eases stay AND a quick transform ease is added — otherwise the press
   would snap. */
.discover-logo,
.toggle-mode {
  transition: background-color .45s ease, color .45s ease, box-shadow .45s ease,
    transform .16s var(--ease-out) !important;
}
.discover-logo:active,
.toggle-mode:active { transform: scale(.95); }
@media (prefers-reduced-motion: reduce) {
  .discover-logo:active, .toggle-mode:active { transform: none; }
}
/* The icon fills via currentColor, so it already follows .toggle-mode's color
   transition. Giving the SVG its OWN color transition made it chase an already-
   animating value and finish ~twice as late — so it has none of its own. */

/* Sun/moon morph icon. The disc is ::before; a radial-gradient mask carves a
   bite out of it. Sun (light mode): the bite parks off-disc (full circle),
   the disc shrinks, rays extend. Moon (dark): the bite slides to the top-right
   for a crescent, the disc grows, rays fold into the centre. mask-position and
   transform are both animatable, so the whole change is one smooth morph.
   Geometry: element 12px; mask image 24px with a 5px hole at its centre, so
   mask-position (x,y) puts the bite centre at (x+12, y+12). */
.sunmoon {
  position: relative; display: flex; align-items: center; justify-content: center;
  /* Uniform shrink of the whole glyph (disc + rays) — full-size it crowded
     the button. Scaling the container keeps the morph geometry intact. */
  transform: scale(.8);
}
.sunmoon::before {
  content: ""; display: block;
  width: 12px; height: 12px; border-radius: 50%;
  background: currentColor;
  -webkit-mask-image: radial-gradient(circle 5px at 30px 30px, transparent 4.5px, #000 5px);
  mask-image: radial-gradient(circle 5px at 30px 30px, transparent 4.5px, #000 5px);
  /* The mask tile must keep covering the whole disc at BOTH positions —
     anything outside the tile is masked out (no-repeat), which ate the disc
     when the tile was element-sized. 60px gives the bite room to travel. */
  -webkit-mask-size: 60px 60px; mask-size: 60px 60px;
  -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat;
  /* Inverted state mapping: the glyph previews the mode you'd switch TO —
     light mode shows the moon, dark mode shows the sun. */
  -webkit-mask-position: -21px -27px; mask-position: -21px -27px;
  transform: scale(1);
  transition: transform .5s var(--ease-out),
    -webkit-mask-position .5s var(--ease-out);
  transition: transform .5s var(--ease-out),
    mask-position .5s var(--ease-out),
    -webkit-mask-position .5s var(--ease-out);
}
html.is-dark .sunmoon::before {
  transform: scale(.72);
  -webkit-mask-position: -4px -40px; mask-position: -4px -40px;
}
.sunmoon .ray {
  position: absolute; left: 50%; top: 50%;
  width: 2px; height: 4px; margin: -2px 0 0 -1px;
  border-radius: 1px;
  background: currentColor;
  transform: rotate(var(--a)) translateY(0) scale(0);
  opacity: 0;
  transition: transform .5s var(--ease-out), opacity .3s ease;
}
.sunmoon .ray:nth-child(1) { --a: 0deg; }
.sunmoon .ray:nth-child(2) { --a: 45deg; }
.sunmoon .ray:nth-child(3) { --a: 90deg; }
.sunmoon .ray:nth-child(4) { --a: 135deg; }
.sunmoon .ray:nth-child(5) { --a: 180deg; }
.sunmoon .ray:nth-child(6) { --a: 225deg; }
.sunmoon .ray:nth-child(7) { --a: 270deg; }
.sunmoon .ray:nth-child(8) { --a: 315deg; }
html.is-dark .sunmoon .ray {
  transform: rotate(var(--a)) translateY(-7.5px) scale(1);
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .sunmoon::before, .sunmoon .ray { transition: opacity .2s ease; }
}

/* Vignette edge colour as REGISTERED custom properties so the fade can be
   ANIMATED — a raw background-image gradient can't transition, so it used to
   snap while everything else eased. These ride the exact same .45s ease, so the
   edges change in unison with the rest. --vig0 is the inner (transparent) stop,
   colour-matched to --vig so there's no gray fringe mid-transition. */
@property --vig { syntax: "<color>"; inherits: true; initial-value: #ffffff; }
@property --vig0 { syntax: "<color>"; inherits: true; initial-value: rgba(255, 255, 255, 0); }
html {
  --vig: #ffffff; --vig0: rgba(255, 255, 255, 0);
  transition: --vig .45s ease, --vig0 .45s ease;
}
html.is-dark { --vig: #080808; --vig0: rgba(8, 8, 8, 0); }
.hero-gradient.cc-white {
  background-image: radial-gradient(circle closest-corner at 50% 50%, var(--vig0) 60%, var(--vig) 98%);
}

.hero-list-wrapper {
  /* Absolute (not fixed) so it fills the full-height document — reaching under
     the iOS home indicator in standalone instead of being clipped at the safe
     area. inset:0 spans the full-screen .hero; the extra bottom overshoot is a
     belt-and-suspenders guarantee against any residual safe-area inset. */
  position: absolute; inset: 0;
  bottom: calc(0px - env(safe-area-inset-bottom, 0px));
  overflow: hidden; cursor: grab; contain: layout paint;
  opacity: 0; transition: opacity .6s ease-out;
}
/* Keep the floating control bar clear of the iOS home indicator now that the
   canvas extends into the bottom safe area. */
.discover-comp {
  bottom: calc(2rem + env(safe-area-inset-bottom));
}
/* Quieter page label: smaller than the 1rem it inherited (site.css sets
   .925rem under 480px; this later sheet wins at equal specificity). */
.discover-text { font-size: .9rem; }
@media (max-width: 479px) {
  .discover-text { font-size: .85rem; }
}

/* Phones: one consistent gutter around the control bar — the same 1rem gap on
   the left, right, and toward the bottom. The bottom gap grows only as far as
   the home-indicator safe area demands (max()), so in standalone mode the bar
   hugs the bottom as closely as iOS's swipe-gesture zone allows instead of
   floating 2rem above it. */
@media (max-width: 479px) {
  .discover-comp {
    /* A tad wider than the grid tiles (80vw on phones), well clear of the
       screen edges — full-bleed-minus-2rem read too wide in standalone.
       Fixed 2rem gutters (not 8vw) so the frame is an even 32px, not 32.2. */
    width: calc(100% - 4rem);
    /* Bottom gap matches the 2rem side gaps so the bar floats with even
       spacing all around; the max() keeps it clear of the home-indicator
       zone in standalone, which is within a couple px of the sides anyway. */
    bottom: max(2rem, env(safe-area-inset-bottom, 0px));
    /* Rounder than the site's editorial 4px so the bar doesn't read as a hard
       rectangle against the iPhone's curved display corners, but shy of the
       old 1rem — at 1rem the curve cut into the rows' text padding. */
    border-radius: 10px;
  }
}
.hero-list-wrapper.ready { opacity: 1; }
.hero-list-wrapper.dragging { cursor: grabbing; }

.hero-list {
  position: relative; width: 100%; height: 100%;
  padding: 0; grid-template-columns: none; display: block;
  contain: layout style;
}

.hero-item {
  position: absolute; top: 0; left: 0;
  width: auto; max-width: none; height: auto;
  will-change: transform; contain: layout style paint;
  backface-visibility: hidden; pointer-events: none; user-select: none;
  /* Placeholder tint shown under an image while it decodes. */
  background-color: rgba(0, 0, 0, .05); border-radius: 4px;
}
html.is-dark .hero-item { background-color: rgba(255, 255, 255, .06); }
.hero-item .hero-image {
  pointer-events: none; user-select: none; -webkit-user-drag: none;
  width: 100%; height: 100%; object-fit: cover; aspect-ratio: auto;
  /* Blur-up: each tile eases from a soft blur to sharp as it decodes, instead
     of popping in. Per-image and brief, so it stays light on the GPU. */
  opacity: 0; filter: blur(14px);
  transition: opacity .55s var(--ease-out), filter .55s var(--ease-out);
}
.hero-item .hero-image.is-loaded { opacity: 1; filter: blur(0); }
/* Phones: sharper corners on the (unstaged) website tiles. Desktop keeps 4px. */
@media (max-width: 767px) {
  .hero-item, .hero-item .hero-image { border-radius: 2px; }
}
.hero-item .hero-meta_data { pointer-events: none; }

/* Native dark mode. The .is-dark class lives on <html> (set pre-paint by the
   head script + managed by the toggle), so target the body for the page fill. */
html.is-dark, html.is-dark body { background-color: #080808 !important; color: #fff; }
html.is-dark .hero-image { outline-color: #ffffff14; }
html.is-dark .discover-logo,
html.is-dark .discover-text,
html.is-dark .toggle-mode {
  background-color: rgba(24, 24, 24, .6); color: #fff;
}
html.is-dark .discover-logo:hover,
html.is-dark .toggle-mode:hover { background-color: rgba(36, 36, 36, .72); }
html.is-dark .discover-text { border-color: #ffffff14; }
html.is-dark .discover-comp { box-shadow: 0 0 0 1px #ffffff14, 0 2px 4px #00000052; }

/* While the stage is open the grid scene recedes: the vignette and control
   bar fade out so the flying image never pops in front of layers the tile was
   sitting behind (it starts under the gradient/bar, but the stage paints above
   them). They fade back in under the return flight, so the tile lands already
   dimmed by the restored vignette. The .discover-comp transition re-declares
   the theme eases !important + opacity — the theme block's own !important
   shorthand (above) would otherwise drop the opacity ease. */
.discover-comp {
  /* The bar moves as a FINISHED, solid, frosted object — no opacity fade and
     no frost state changes, ever (mixing motion with material changes is what
     read as smears/pops). These timings are the RETURN (class removed on
     close): it WAITS for the image to land (.45s flight), then glides back up
     on a long, soft ease. */
  transition: background-color .45s ease, color .45s ease,
    border-color .45s ease, outline-color .45s ease, box-shadow .45s ease,
    transform .55s var(--ease-out) .45s !important;
}
html.stage-open .discover-comp {
  /* Slide clean off the bottom edge (keep the centring -50% X); include the
     bar's own offset + home-indicator inset so no sliver survives. */
  transform: translate(-50%, calc(100% + 3rem + env(safe-area-inset-bottom, 0px)));
  pointer-events: none;
  /* Departure is snappier than the return — it must clear the scene during
     the first third of the image's .5s flight. */
  transition: background-color .45s ease, color .45s ease,
    border-color .45s ease, outline-color .45s ease, box-shadow .45s ease,
    transform .25s var(--ease-out) !important;
}
/* Vignette sequencing on close: the flying copy travels ABOVE the gradient,
   so it always lands undimmed — restoring the vignette during the flight made
   the handover jump (bright copy → suddenly-dimmed tile). The return
   therefore WAITS for the landing swap (~.46s), then blooms over the whole
   static grid — a lighting change, never a layer crossing. Departure stays
   immediate. */
.hero-gradient.cc-white { transition: opacity .4s ease .5s; }
html.stage-open .hero-gradient.cc-white { opacity: 0; transition: opacity .18s ease; }

/* The frost is PERMANENT and ONE SHEET — a single blur layer spanning the
   whole bar (clipped by its radius), with the segments contributing only
   their translucent tints on top. Per-segment frost patches met at 1px
   negative-margin seams where rounding + double blur sampling left odd
   unfrosted hairlines; one glass sheet has no seams, reads as one object,
   and renders cheaper. The rows' own backdrop-filter (site.css) stays off. */
.discover-comp::before {
  content: ""; position: absolute; inset: 0; z-index: -1;
  -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
  pointer-events: none;
}
.discover-logo, .discover-text, .toggle-mode {
  -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
}

/* Pane dividers as gradient hairlines that fade at their ends — the solid
   1px borders read as hard seams cutting the glass; an etched line that
   dissolves before reaching the edges keeps the panes separate while still
   reading as one sheet. Solid borders and their -1px overlap margins go. */
.discover-text {
  border-left: none !important; border-right: none !important;
  margin-left: 0 !important; margin-right: 0 !important;
}
/* Vertical divider: text ↔ toggle (all widths). */
.discover-text::after {
  content: ""; position: absolute; top: 0; bottom: 0; right: 0; width: 1px;
  background: linear-gradient(180deg, transparent, #0000001f 30%, #0000001f 70%, transparent);
  pointer-events: none;
}
html.is-dark .discover-text::after {
  background: linear-gradient(180deg, transparent, #ffffff1f 30%, #ffffff1f 70%, transparent);
}
/* Vertical divider: logo ↔ text (desktop pill only — rows stack on phones). */
.discover-text::before {
  content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 1px;
  background: linear-gradient(180deg, transparent, #0000001f 30%, #0000001f 70%, transparent);
  pointer-events: none;
}
html.is-dark .discover-text::before {
  background: linear-gradient(180deg, transparent, #ffffff1f 30%, #ffffff1f 70%, transparent);
}
@media (max-width: 479px) {
  .discover-text::before { display: none; }
  /* Horizontal divider: logo row ↔ text row. */
  .discover-logo { border-bottom: none !important; position: relative; top: auto; right: auto; bottom: auto; left: auto; }
  .discover-logo::after {
    content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1px;
    background: linear-gradient(90deg, transparent, #0000001f 12%, #0000001f 88%, transparent);
    pointer-events: none;
  }
  html.is-dark .discover-logo::after {
    background: linear-gradient(90deg, transparent, #ffffff1f 12%, #ffffff1f 88%, transparent);
  }
}

/* Mobile tap-to-stage: the tapped tile, front-and-center and enlarged, over a
   dimmed backdrop with its meta beneath. Tapping anywhere dismisses it. */
.discover-stage {
  position: fixed; inset: 0; z-index: 50;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1.25rem; padding: 6vh 7vw;
  touch-action: none;   /* we drive pinch/pan/double-tap ourselves */
  /* The container itself never fades — fading it faded the flying image with
     it, which read as a NEW element appearing instead of the tapped tile
     travelling. Only the scrim (::before below) fades; visibility flips after
     the close fade so nothing lingers. */
  pointer-events: none;
  visibility: hidden;
  /* The delay must outlast the close animations: .45s reverse flight +
     landing swap. */
  transition: visibility 0s .5s;
}
.discover-stage::before {
  content: ""; position: absolute; inset: 0;
  /* Scrim follows the theme: dark in dark mode (default), light in light mode
     (override below), so opening an image respects light/dark. */
  background-color: rgba(8, 8, 8, .72);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  opacity: 0;
  transition: opacity .35s ease, background-color .45s ease;
}
html:not(.is-dark) .discover-stage::before { background-color: rgba(255, 255, 255, .82); }
.discover-stage.is-open { visibility: visible; pointer-events: auto; transition: none; }
.discover-stage.is-open::before { opacity: 1; }
/* The staged image never fades IN (it IS the tapped tile, already on screen —
   the script hides the source tile the same frame); it only fades on close,
   covering the swap back to the grid. */
.discover-stage .hero-image { opacity: 0; transition: opacity .25s ease; }
.discover-stage.is-open .hero-image { opacity: 1; transition: none; }
/* fit-content so the column is exactly as wide as the image, not the whole
   stage. No transform of its own — the entrance is the image's shared-element
   flight (set inline by the script), so a parent scale would fight it. */
.discover-stage_inner {
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
  width: fit-content; max-width: 92vw;
}
.discover-stage .hero-image {
  display: block;
  width: auto !important; height: auto !important;
  max-width: 92vw; max-height: 70vh;
  aspect-ratio: auto !important; object-fit: contain !important;
  border-radius: 2px; box-shadow: 0 24px 60px rgba(0, 0, 0, .5);
  outline: none;
  will-change: transform;   /* smooth double-tap / pinch / pan */
}
/* Softer, less harsh shadow on the light scrim (same smooth blur, lower
   opacity + a gentle near layer so the falloff is gradual, not a hard halo). */
html:not(.is-dark) .discover-stage .hero-image {
  box-shadow: 0 24px 60px rgba(0, 0, 0, .15), 0 6px 16px rgba(0, 0, 0, .07);
}
/* Caption: pinned bottom-centre of the stage (the script moves it out of the
   image column), name on the first line, category beneath, both centred. It
   stays put while the image zooms/pans; taps fall through to the backdrop. */
.discover-stage .hero-meta_data {
  position: absolute; left: 0; right: 0;
  bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
  display: flex; flex-direction: column; align-items: center;
  gap: .3rem; padding: 0;
  text-align: center; pointer-events: none;
  color: #fff; font-size: 0.875rem; line-height: 1.4;
  /* Match the control-bar logo (the full name) typeface. */
  font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  letter-spacing: .01em;
  /* Entrance: a subtle rise + fade that starts once the image is landing
     (the .18s delay below); exits with the stage fade, no delay. */
  opacity: 0; transform: translateY(8px);
  transition: opacity .35s ease, transform .5s var(--ease-out);
}
.discover-stage.is-open .hero-meta_data {
  opacity: 1; transform: none;
  transition-delay: .18s, .18s;
}
@media (prefers-reduced-motion: reduce) {
  .discover-stage .hero-meta_data { transform: none; transition: opacity .25s ease; }
}
.discover-stage .hero-meta_data > :first-child {
  max-width: 84vw; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.discover-stage .hero-meta_data-lighter {
  white-space: nowrap; opacity: .6;
}
/* Light mode: dark caption text so it stays legible on the light scrim — a
   strong primary (name) and a lighter-but-AA-legible grey secondary (category).
   The secondary uses a solid grey rather than the dark-mode opacity trick so it
   keeps enough contrast on the pale backdrop. */
html:not(.is-dark) .discover-stage .hero-meta_data { color: #1b1b1b; }
html:not(.is-dark) .discover-stage .hero-meta_data-lighter { color: #565656; opacity: 1; }
`,
        }}
      />
    </>
  );
}
