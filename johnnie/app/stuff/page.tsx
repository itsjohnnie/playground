import type { Metadata } from "next";
import { getStuff } from "@/lib/content";
import { asset } from "@/lib/asset";
import StuffList from "./stuff-list";

export const metadata: Metadata = {
  title: "Stuff — Johnnie Gómez Álzaga",
  description:
    "Things I have — and things I'll have, one day. A running list of watches, perfumes, clothing and more.",
};

export default function StuffPage() {
  const items = getStuff();

  return (
    <main className="stuff-page">
      <div className="stuff-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset("/images/stuff-hero.png")}
          alt="Johnnie at his desk with his two monitors and his dog Honey"
          width={1024}
          height={1024}
        />
      </div>

      <div className="stuff">
        <StuffList items={items} />
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
/* Background matches the hero image's studio backdrop so the render blends
   seamlessly into the page (overrides the cycling homepage background). */
.body { background-color: #f1f1f0 !important; }

/* Inter, self-hosted from Rasmus Andersson's official variable-font
   distribution (rsms.me/inter) — not Google Fonts. */
@font-face {
  font-family: "Inter var";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("/fonts/InterVariable.woff2") format("woff2");
}

.stuff-page {
  color: #1b1b1b;
  font-family: "Inter var", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow-x: clip;
}
.stuff { max-width: 720px; margin: 0 auto; padding: 0 1.5rem 6rem; }

/* Full-bleed hero, flush at the top. */
.stuff-hero { position: relative; width: 100%; margin: 0; }
.stuff-hero img { width: 100%; height: auto; display: block; }
/* Inner glow in the page's background colour, feathered inward on every edge.
   The photo's borders aren't a perfectly uniform tone, so this haze blends
   the render into the page instead of leaving a hard, slightly-mismatched seam. */
.stuff-hero::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  box-shadow: inset 0 0 clamp(28px, 9vw, 70px) clamp(10px, 3.5vw, 26px) #f1f1f0;
}

/* Title + sort on one line; description below. Positioned above the hero so
   the overlapping title paints ON TOP of the image (the hero is position:
   relative, so without this it would paint over the title). */
.stuff-titlerow {
  position: relative; z-index: 3;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem;
}
.stuff-titlerow h1 {
  font-family: "Inter var", -apple-system, Helvetica, Arial, sans-serif;
  font-size: clamp(3.25rem, 18vw, 7.5rem);
  font-weight: 600; letter-spacing: -.03em; line-height: .85;
  text-transform: none;
  margin: clamp(.4rem, 2.5vw, 1rem) 0 0;   /* small gap so the title clears the photo */
}

/* Sort control (bottom-aligned with the title). */
.stuff-sort {
  flex: none; display: inline-flex; align-items: center; gap: .5rem;
  margin-bottom: .35rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; opacity: .6;
}
.stuff-sort select {
  font: inherit; text-transform: uppercase; letter-spacing: .06em;
  color: #1b1b1b; background: transparent;
  border: none; border-bottom: 1px solid rgba(27, 27, 27, .25);
  padding: .15rem 1.15rem .15rem .1rem; cursor: pointer;
  appearance: none; -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' fill='none' stroke='%231b1b1b' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right .05rem center; background-size: .62rem;
  transition: border-color .2s var(--ease-out);
}
.stuff-sort select:hover { border-bottom-color: rgba(27, 27, 27, .5); }
.stuff-sort select:focus-visible { outline: 2px solid #1b1b1b; outline-offset: 3px; border-radius: 1px; }

.stuff-desc {
  font-size: .95rem; line-height: 1.5; max-width: 46ch;
  opacity: .55; margin: .75rem 0 clamp(1.5rem, 5vw, 2.5rem);
}

/* List + expandable rows. */
.stuff-grid { list-style: none; margin: 0; padding: 0; border-top: 1px solid rgba(27, 27, 27, .12); }
.stuff-row { border-bottom: 1px solid rgba(27, 27, 27, .12); transition: opacity .25s var(--ease-out); }
.stuff-row.is-wish { opacity: .4; }

.stuff-rowbtn {
  width: 100%; display: flex; align-items: baseline; justify-content: space-between;
  gap: 1rem; padding: .6rem .25rem;
  background: none; border: 0; cursor: pointer; text-align: left; color: inherit; font: inherit;
}
.stuff-name { font-size: 1.05rem; font-weight: 500; letter-spacing: -.01em; }
.stuff-rowmeta { flex: none; display: inline-flex; align-items: center; gap: .75rem; }
.stuff-cat {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; opacity: .55; white-space: nowrap;
}
/* Row indicator: a small right-chevron; tapping the row opens a modal. */
.stuff-arrow {
  color: #1b1b1b; opacity: .35; flex: none;
  transition: transform .16s var(--ease-out), opacity .2s var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .stuff-rowbtn:hover .stuff-arrow { opacity: .7; transform: translateX(2px); }
}

/* Detail modal (centered dialog, closed via the ✕, backdrop, or Escape). */
.stuff-modal {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center; padding: 1.25rem;
  background: rgba(20, 20, 19, .38);
  -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px);
  opacity: 0; transition: opacity .22s var(--ease-out);
}
.stuff-modal.is-open { opacity: 1; }
.stuff-modal-card {
  position: relative;
  width: 100%; max-width: 400px; max-height: 88vh; overflow-y: auto;
  background: #fff; border-radius: 14px; box-shadow: 0 24px 64px rgba(0, 0, 0, .3);
  transform: scale(.96); transition: transform .24s var(--ease-out);
}
.stuff-modal.is-open .stuff-modal-card { transform: scale(1); }
.stuff-modal-x {
  position: absolute; top: .7rem; right: .7rem; z-index: 2;
  width: 30px; height: 30px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(241, 241, 240, .92); border: 1px solid rgba(27, 27, 27, .08);
  color: #1b1b1b; cursor: pointer;
  transition: background .2s var(--ease-out), transform .16s var(--ease-out);
}
.stuff-modal-x:active { transform: scale(.9); }
@media (hover: hover) and (pointer: fine) { .stuff-modal-x:hover { background: #e9e9e7; } }

.stuff-modal-media {
  aspect-ratio: 4 / 3; background: #fff; border-radius: 14px 14px 0 0;
  display: flex; align-items: center; justify-content: center;
  border-bottom: 1px solid rgba(27, 27, 27, .07);
}
.stuff-modal-media img { width: 100%; height: 100%; object-fit: contain; }
.stuff-thumb-ph { width: 26%; height: 26%; color: #1b1b1b; opacity: .22; }

.stuff-modal-body { padding: 1.25rem 1.4rem 1.5rem; }
.stuff-modal-head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 1rem; margin-bottom: 1.1rem;
}
.stuff-modal-head h2 {
  font-size: 1.35rem; font-weight: 600; letter-spacing: -.02em; line-height: 1.1; margin: 0;
}

.stuff-facts-dl {
  margin: 0; display: grid; grid-template-columns: auto 1fr;
  gap: .4rem 1rem; align-items: baseline;
}
.stuff-facts-dl dt {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .66rem; text-transform: uppercase; letter-spacing: .06em; opacity: .5;
}
.stuff-facts-dl dd { margin: 0; font-size: .92rem; }
.stuff-descr { margin: 1rem 0 0; font-size: .92rem; line-height: 1.55; opacity: .75; }
.stuff-descr--empty { opacity: .4; font-style: italic; }
/* Prominent call-to-action button that takes you to where you can buy it. */
.stuff-get {
  display: inline-flex; align-items: center; gap: .4rem; margin-top: 1.3rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .78rem; letter-spacing: .02em;
  color: #fff; background: #1b1b1b; text-decoration: none;
  padding: .62rem 1rem; border-radius: 999px;
  transition: transform .16s var(--ease-out), background .2s var(--ease-out);
}
.stuff-get:active { transform: scale(.97); }
@media (hover: hover) and (pointer: fine) { .stuff-get:hover { background: #000; } }

@media (prefers-reduced-motion: reduce) {
  .stuff-modal, .stuff-modal-card, .stuff-arrow { transition: none; }
}
`,
        }}
      />
    </main>
  );
}
