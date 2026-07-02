import type { Metadata, Viewport } from "next";
import { getDiscover } from "@/lib/content";
import { asset } from "@/lib/asset";
import DiscoverGrid from "./discover-grid";

export const metadata: Metadata = {
  title: "Design Discovery Area — Designed by Johnnie Gomez",
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
          <div>Johnnie Gómez Alzaga ®</div>
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
.hero { overflow: hidden; }
html, body { overflow: hidden; }

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
  /* Fill the whole screen, top through the home-indicator area. In iOS
     standalone/PWA a bottom-anchored fixed element (bottom:0 / inset:0) pins to
     the safe-area boundary and leaves a strip of bare background at the very
     bottom. Sizing from top:0 by an explicit HEIGHT avoids that anchoring: use
     the dynamic viewport height (full screen under viewport-fit=cover) and add
     the bottom inset so it always reaches — or slightly overshoots — the true
     screen edge. In the browser the inset is 0, so it's just 100dvh. */
  position: fixed; top: 0; left: 0; right: 0;
  height: calc(100vh + env(safe-area-inset-bottom, 0px));
  height: calc(100dvh + env(safe-area-inset-bottom, 0px));
  overflow: hidden; cursor: grab; contain: layout paint;
  opacity: 0; transition: opacity .6s ease-out;
}
/* Keep the floating control bar clear of the iOS home indicator now that the
   canvas extends into the bottom safe area. */
.discover-comp {
  bottom: calc(2rem + env(safe-area-inset-bottom));
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
  transition: opacity .55s ease, filter .55s ease;
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
  background: rgba(8, 8, 8, .72);
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  opacity: 0; pointer-events: none;
  transition: opacity .3s ease;
}
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
`,
        }}
      />
    </>
  );
}
