import type { Metadata } from "next";
import { getDiscover } from "@/lib/content";
import { asset } from "@/lib/asset";
import DiscoverGrid from "./discover-grid";

export const metadata: Metadata = {
  title: "Design Discovery Area — Designed by Johnnie Gomez",
};

export default function DiscoverPage() {
  const items = getDiscover();

  return (
    <>
      {/* Floating control bar: home link, page label, light/dark toggle. */}
      <div className="discover-comp">
        <a href={asset("/")} className="discover-logo">
          <div>Johnnie GómeZ ®</div>
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

.hero-list-wrapper {
  position: fixed; inset: 0;
  width: 100vw; height: 100vh; height: 100dvh;
  overflow: hidden; cursor: grab; contain: strict;
  opacity: 0; transition: opacity .6s ease-out;
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
}
.hero-item .hero-image {
  pointer-events: none; user-select: none; -webkit-user-drag: none;
  width: 100%; height: 100%; object-fit: cover; aspect-ratio: auto;
}
.hero-item .hero-meta_data { pointer-events: none; }

/* The light/dark toggle glyph reads a touch small in its pill — bump it. */
.discover-comp .button-icon { width: 27px; height: 27px; }
.discover-comp .button-icon svg { width: 100%; height: 100%; display: block; }

/* Native dark mode (replaces the visual-builder interaction). */
body.is-dark { background-color: #080808 !important; color: #fff; }
body.is-dark .hero-gradient.cc-white {
  background-image: radial-gradient(circle closest-corner at 50% 50%, #08080800 60%, #080808 98%);
}
body.is-dark .hero-image { outline-color: #ffffff14; }
body.is-dark .discover-logo,
body.is-dark .discover-text,
body.is-dark .toggle-mode {
  background-color: #181818; color: #fff;
}
body.is-dark .discover-logo:hover,
body.is-dark .toggle-mode:hover { background-color: #242424; }
body.is-dark .discover-text { border-color: #ffffff14; }
body.is-dark .discover-comp { box-shadow: 0 0 0 1px #ffffff14, 0 2px 4px #00000052; }
`,
        }}
      />
    </>
  );
}
