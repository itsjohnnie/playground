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
        <header className="stuff-head">
          <a className="stuff-back" href={asset("/")}>← Johnnie&#x27;s Life</a>
          <h1>Stuff</h1>
          <p>
            Things I have — and things I&#x27;ll have, one day. The dimmed ones are
            still on the list.
          </p>
        </header>

        <StuffList items={items} />
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
/* Background matches the hero image's studio backdrop so the render blends
   seamlessly into the page (overrides the cycling homepage background). */
.body { background-color: #f1f1f0 !important; }

.stuff-page {
  color: #1b1b1b;
  font-family: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow-x: clip;   /* belt against any sub-pixel full-bleed overflow */
}
.stuff {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 1.5rem 6rem;
}

/* Full-bleed hero: spans the whole viewport width and sits flush at the top,
   so the render's soft left-side shadow reaches the screen edge instead of
   showing a visible boundary in a boxed image. */
.stuff-hero { width: 100%; margin: 0 0 clamp(1.5rem, 5vw, 2.5rem); }
.stuff-hero img { width: 100%; height: auto; display: block; }

.stuff-back {
  display: inline-block;
  font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .8rem; letter-spacing: .01em;
  color: #1b1b1b; opacity: .5; text-decoration: none;
  margin-bottom: 1.25rem;
  transition: opacity .2s var(--ease-out);
}
@media (hover: hover) and (pointer: fine) { .stuff-back:hover { opacity: 1; } }

.stuff-head h1 {
  font-family: "Geist", -apple-system, sans-serif;
  font-size: clamp(2.5rem, 9vw, 3.5rem);
  font-weight: 600; letter-spacing: -.03em; line-height: 1;
  margin: 0 0 .5rem;
}
.stuff-head p {
  font-size: .95rem; line-height: 1.5; max-width: 44ch;
  opacity: .55; margin: 0 0 clamp(1.5rem, 5vw, 2.5rem);
}

/* Sort control, top-right above the list. */
.stuff-toolbar {
  display: flex; justify-content: flex-end; align-items: center;
  padding: 0 .25rem .75rem;
}
.stuff-sort {
  display: inline-flex; align-items: center; gap: .5rem;
  font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .7rem; text-transform: uppercase; letter-spacing: .06em;
  opacity: .6;
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

.stuff-grid {
  list-style: none; margin: 0; padding: 0;
  border-top: 1px solid rgba(27, 27, 27, .12);
}
.stuff-row {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 1rem; padding: 1rem .25rem;
  border-bottom: 1px solid rgba(27, 27, 27, .12);
  transition: opacity .25s var(--ease-out);
}
/* Not owned yet — dimmed. */
.stuff-row.is-wish { opacity: .4; }

.stuff-namewrap { display: flex; align-items: center; gap: .5rem; min-width: 0; }
.stuff-name { font-size: 1.05rem; font-weight: 500; letter-spacing: -.01em; }

.stuff-info {
  display: inline-flex; line-height: 0; color: #1b1b1b; opacity: .4;
  transition: opacity .2s var(--ease-out), transform .16s var(--ease-out);
}
.stuff-info svg { display: block; }
@media (hover: hover) and (pointer: fine) { .stuff-info:hover { opacity: .85; } }
.stuff-info:active { transform: scale(.88); }

.stuff-cat {
  flex: none; align-self: center;
  font-family: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .7rem; text-transform: uppercase; letter-spacing: .06em;
  opacity: .55; white-space: nowrap;
}
`,
        }}
      />
    </main>
  );
}
