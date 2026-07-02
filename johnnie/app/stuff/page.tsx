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

/* Full-bleed hero, flush at the top; the title overlaps up into it. */
.stuff-hero { position: relative; width: 100%; margin: 0; }
.stuff-hero img { width: 100%; height: auto; display: block; }

/* Title + sort on one line; description below. */
.stuff-titlerow {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem;
}
.stuff-titlerow h1 {
  font-family: "Inter var", -apple-system, Helvetica, Arial, sans-serif;
  font-size: clamp(3.25rem, 18vw, 7.5rem);
  font-weight: 600; letter-spacing: -.03em; line-height: .85;
  text-transform: none;
  margin: -.2em 0 0;   /* subtle overlap up into the hero */
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
.stuff-chev { color: #1b1b1b; opacity: .4; transition: transform .3s var(--ease-out); }
.stuff-row.is-open .stuff-chev { transform: rotate(180deg); }
@media (hover: hover) and (pointer: fine) {
  .stuff-rowbtn:hover .stuff-chev { opacity: .75; }
}

/* Expand/collapse via animatable grid rows (0fr -> 1fr). */
.stuff-panel {
  display: grid; grid-template-rows: 0fr;
  transition: grid-template-rows .32s var(--ease-out);
}
.stuff-row.is-open .stuff-panel { grid-template-rows: 1fr; }
.stuff-panel-in {
  overflow: hidden; min-height: 0;
  opacity: 0; transition: opacity .25s var(--ease-out);
  display: flex; gap: 1.25rem; padding: 0 .25rem;
}
.stuff-row.is-open .stuff-panel-in { opacity: 1; padding-bottom: 1.6rem; }

.stuff-thumb {
  flex: none; width: clamp(96px, 28vw, 120px); aspect-ratio: 1;
  background: #fff; border: 1px solid rgba(27, 27, 27, .1); border-radius: 8px;
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.stuff-thumb img { width: 100%; height: 100%; object-fit: contain; }
.stuff-thumb-ph { width: 40%; height: 40%; color: #1b1b1b; opacity: .28; }

.stuff-facts { flex: 1; min-width: 0; }
.stuff-facts-dl {
  margin: 0; display: grid; grid-template-columns: auto 1fr;
  gap: .35rem 1rem; align-items: baseline;
}
.stuff-facts-dl dt {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .66rem; text-transform: uppercase; letter-spacing: .06em; opacity: .5;
}
.stuff-facts-dl dd { margin: 0; font-size: .9rem; }
.stuff-descr { margin: .8rem 0 0; font-size: .9rem; line-height: 1.5; opacity: .72; }
.stuff-descr--empty { opacity: .4; font-style: italic; }
.stuff-get {
  display: inline-block; margin-top: .9rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .78rem; color: #1b1b1b; text-decoration: none;
  border-bottom: 1px solid rgba(27, 27, 27, .3); padding-bottom: 1px;
  transition: border-color .2s var(--ease-out);
}
@media (hover: hover) and (pointer: fine) { .stuff-get:hover { border-bottom-color: #1b1b1b; } }

@media (prefers-reduced-motion: reduce) {
  .stuff-panel, .stuff-panel-in, .stuff-chev { transition: none; }
}
`,
        }}
      />
    </main>
  );
}
