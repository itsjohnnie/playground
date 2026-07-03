import type { Metadata, Viewport } from "next";
import { getDiscover } from "@/lib/content";
import { asset } from "@/lib/asset";
import DiscoverGrid from "./discover-grid";

export const metadata: Metadata = {
  title: "Design Discovery Area — Designed by Johnnie Gomez",
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
          <div>Design Discovery Area</div>
        </div>
        <a data-theme-toggle href="#" className="toggle-mode" aria-label="Toggle light or dark mode">
          <div className="button-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <title>Toggle light/dark</title>
              <g fill="currentColor">
                <path
                  d="M20.25,15.418l2.357-2.357a1.5,1.5,0,0,0,0-2.121L20.25,8.583V5.25a1.5,1.5,0,0,0-1.5-1.5H15.417L13.061,1.393a1.5,1.5,0,0,0-2.122,0L8.583,3.75H5.25a1.5,1.5,0,0,0-1.5,1.5V8.583L1.393,10.94a1.5,1.5,0,0,0,0,2.121L3.75,15.418V18.75a1.5,1.5,0,0,0,1.5,1.5H8.583l2.356,2.357a1.5,1.5,0,0,0,2.122,0l2.356-2.357H18.75a1.5,1.5,0,0,0,1.5-1.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5px"
                />
                <path
                  d="M12,6.75a5.194,5.194,0,0,0-2.25.525,5.222,5.222,0,0,1,0,9.451A5.243,5.243,0,1,0,12,6.75Z"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5px"
                />
              </g>
            </svg>
          </div>
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
     putting the calc on both would compound to 2× the inset. */
  html { height: calc(100% + env(safe-area-inset-top, 0px)); }
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
/* Phones: one consistent gutter around the control bar — the same 1rem gap on
   the left, right, and toward the bottom. The bottom gap grows only as far as
   the home-indicator safe area demands (max()), so in standalone mode the bar
   hugs the bottom as closely as iOS's swipe-gesture zone allows instead of
   floating 2rem above it. */
@media (max-width: 479px) {
  .discover-comp {
    width: calc(100% - 2rem);
    bottom: max(1rem, env(safe-area-inset-bottom, 0px));
    /* Radius matches the 1rem gutter so the bar sits concentric-ish with the
       iPhone's big display corners — 4px read as a hard rectangle fighting
       the screen's curve. Desktop keeps the site's editorial 4px. */
    border-radius: 1rem;
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

/* Mobile tap-to-stage: the tapped tile, front-and-center and enlarged, over a
   dimmed backdrop with its meta beneath. Tapping anywhere dismisses it. */
.discover-stage {
  position: fixed; inset: 0; z-index: 50;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1.25rem; padding: 6vh 7vw;
  touch-action: none;   /* we drive pinch/pan/double-tap ourselves */
  /* Scrim follows the theme: dark in dark mode (default), light in light mode
     (override below), so opening an image respects light/dark. */
  background-color: rgba(8, 8, 8, .72);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
  opacity: 0; pointer-events: none;
  transition: opacity .3s ease, background-color .45s ease;
}
html:not(.is-dark) .discover-stage { background-color: rgba(255, 255, 255, .82); }
.discover-stage.is-open { opacity: 1; pointer-events: auto; }
/* fit-content so the column (and the caption beneath) is exactly as wide as the
   image, not the whole stage. */
.discover-stage_inner {
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
  width: fit-content; max-width: 92vw;
  transform: scale(.92);
  transition: transform .35s cubic-bezier(.22, 1, .36, 1);
}
.discover-stage.is-open .discover-stage_inner { transform: scale(1); }
.discover-stage .hero-image {
  display: block;
  width: auto !important; height: auto !important;
  max-width: 92vw; max-height: 64vh;
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
/* Caption matches the image width: name left, category right, space-between.
   width:0 + min-width:100% lets it fill the image width WITHOUT widening the
   fit-content column (so a long name can't stretch the stage). */
.discover-stage .hero-meta_data {
  width: 0; min-width: 100%;
  gap: 1.5rem; padding: 0;
  color: #fff; font-size: 0.875rem; line-height: 1.4;
  /* Match the control-bar logo (the full name) typeface. */
  font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
  letter-spacing: .01em;
}
.discover-stage .hero-meta_data > :first-child {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.discover-stage .hero-meta_data-lighter {
  flex: none; white-space: nowrap; opacity: .6;
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
