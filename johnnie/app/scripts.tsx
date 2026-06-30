"use client";

import { useEffect } from "react";

// Cycling background palette, sampled from the original site:
// green -> peach -> salmon -> lavender, looping. We drive it ourselves (no
// Webflow runtime) by writing the current color onto <body> and into the --bg
// custom property (which the nav and the browser theme-color follow).
const PALETTE: [number, number, number][] = [
  [174, 190, 169], // green
  [233, 178, 151], // peach
  [250, 203, 199], // salmon
  [184, 166, 204], // lavender
];
const SEGMENT_MS = 6000; // time to travel between two palette stops

function colorCycle(): () => void {
  const root = document.documentElement;
  let metas = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );
  if (metas.length === 0) {
    const m = document.createElement("meta");
    m.name = "theme-color";
    document.head.appendChild(m);
    metas = [m];
  }
  let raf = 0;
  let startedAt = -1;
  let lastTheme = 0;
  const n = PALETTE.length;
  const frame = (now: number) => {
    if (startedAt < 0) startedAt = now;
    if (document.hidden) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const t = now - startedAt;
    const seg = Math.floor(t / SEGMENT_MS) % n;
    const f = (t % SEGMENT_MS) / SEGMENT_MS;
    const a = PALETTE[seg];
    const b = PALETTE[(seg + 1) % n];
    const r = Math.round(a[0] + (b[0] - a[0]) * f);
    const g = Math.round(a[1] + (b[1] - a[1]) * f);
    const bl = Math.round(a[2] + (b[2] - a[2]) * f);
    const c = `rgb(${r}, ${g}, ${bl})`;
    document.body.style.backgroundColor = c;
    root.style.setProperty("--bg", c);
    if (now - lastTheme > 150) {
      lastTheme = now;
      for (const m of metas) m.setAttribute("content", c);
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}

// Minimal image lightbox for the project tiles ("Zoom in"), replacing Webflow's.
function lightbox(): () => void {
  const onClick = (e: Event) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>(".project-link_block");
    if (!link) return;
    e.preventDefault();
    const img = link.querySelector("img");
    const src = img?.getAttribute("src");
    if (!src) return;
    const overlay = document.createElement("div");
    overlay.className = "lb-overlay";
    const big = document.createElement("img");
    big.src = src;
    big.alt = "";
    overlay.appendChild(big);
    const close = () => {
      overlay.classList.remove("is-open");
      setTimeout(() => overlay.remove(), 200);
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && close();
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-open"));
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

export default function Scripts() {
  useEffect(() => {
    const stopColor = colorCycle();
    const stopLightbox = lightbox();
    return () => {
      stopColor();
      stopLightbox();
    };
  }, []);
  return null;
}
