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
  // Continue from the random phase the inline head script chose, so there's no
  // jump from the first-painted color (see app/layout.tsx).
  const offset =
    (window as unknown as { __bgOffset?: number }).__bgOffset || 0;
  const frame = (now: number) => {
    if (startedAt < 0) startedAt = now - offset;
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
    // The body, nav, and sections all read --bg; no need to touch body.style.
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
    const videoSrc = link.getAttribute("data-video");
    const src = link.querySelector("img")?.getAttribute("src");
    if (!videoSrc && !src) return;
    const overlay = document.createElement("div");
    overlay.className = "lb-overlay";
    let media: HTMLElement;
    if (videoSrc) {
      const v = document.createElement("video");
      v.src = videoSrc;
      v.controls = true;
      v.autoplay = true;
      v.loop = true;
      v.playsInline = true;
      if (src) v.poster = src;
      media = v;
    } else {
      const big = document.createElement("img");
      big.src = src as string;
      big.alt = "";
      media = big;
    }
    // Let users interact with the media; close via background/Escape.
    media.addEventListener("click", (ev) => ev.stopPropagation());
    overlay.appendChild(media);
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

// Custom-eased smooth scroll for in-page anchor links — buttery + snappy
// (easeInOutCubic), not the browser's linear default.
function smoothAnchors(): () => void {
  const easeInOutCubic = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  let raf = 0;
  const scrollToY = (targetY: number) => {
    cancelAnimationFrame(raf);
    const startY = window.scrollY;
    const dist = targetY - startY;
    if (Math.abs(dist) < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, targetY);
      return;
    }
    // Snappy: scales with distance but capped so long jumps don't drag.
    const duration = Math.min(900, Math.max(420, Math.abs(dist) * 0.32));
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, Math.round(startY + dist * easeInOutCubic(t)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute("href");
    if (!href || href === "#") return; // project links / no target
    const el = document.getElementById(href.slice(1));
    if (!el) return;
    e.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY;
    scrollToY(Math.max(0, top));
    history.replaceState(null, "", href);
  };
  document.addEventListener("click", onClick);
  return () => {
    document.removeEventListener("click", onClick);
    cancelAnimationFrame(raf);
  };
}

export default function Scripts() {
  useEffect(() => {
    const stopColor = colorCycle();
    const stopLightbox = lightbox();
    const stopAnchors = smoothAnchors();
    return () => {
      stopColor();
      stopLightbox();
      stopAnchors();
    };
  }, []);
  return null;
}
