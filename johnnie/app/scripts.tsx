"use client";

import { useEffect } from "react";
import { asset } from "@/lib/asset";

// Exact list of Webflow runtime chunks (IX2 interactions + Lottie), in the
// order Webflow ships them, followed by the entry loader. They self-assemble
// via self.webpackChunk with no network calls.
const WEBFLOW_CHUNKS = [
  "/js/webflow.schunk.36b8fb49256177c8.js",
  "/js/webflow.schunk.8208d3e53b97e3c7.js",
  "/js/webflow.schunk.c7aa0cc1620bfec5.js",
  "/js/webflow.schunk.a2895b93f03a774a.js",
  "/js/webflow.schunk.b4435221be879eb3.js",
  "/js/webflow.schunk.b1adc1fa4495e600.js",
];
const WEBFLOW_MAIN = "/js/webflow.86be44b3.17ea3bd94fa9c2fe.js";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false; // preserve execution order
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("failed to load " + src));
    document.body.appendChild(s);
  });
}

// The page background-color is animated frame-by-frame by Webflow's JS (the
// cycling hue), written straight onto <body>. The fixed nav has its own color
// that can lag/freeze, causing a duotone clash on mobile. Rather than push the
// color onto each nav element, we mirror the body's current color into a single
// CSS custom property (--bg) on the root each frame; CSS then drives the nav
// (and anything else) off var(--bg), so everything stays in sync by design. We
// also keep the <meta name="theme-color"> in sync so the iOS/Android browser
// chrome matches the page in real time.
function syncBgVar(): () => void {
  let raf = 0;
  let last = "";
  let lastTheme = 0;
  let metas = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );
  if (metas.length === 0) {
    const m = document.createElement("meta");
    m.name = "theme-color";
    document.head.appendChild(m);
    metas = [m];
  }
  const tick = () => {
    if (document.hidden) {
      raf = requestAnimationFrame(tick);
      return;
    }
    const c =
      document.body.style.backgroundColor ||
      getComputedStyle(document.body).backgroundColor;
    if (c && c !== last) {
      last = c;
      document.documentElement.style.setProperty("--bg", c);
      const now = performance.now();
      if (now - lastTheme > 150) {
        lastTheme = now;
        for (const m of metas) m.setAttribute("content", c);
      }
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

export default function Scripts() {
  useEffect(() => {
    let cancelled = false;
    const stopNavSync = syncBgVar();
    (async () => {
      try {
        await loadScript(asset("/vendor/jquery-3.5.1.min.js"));
        for (const c of WEBFLOW_CHUNKS) {
          if (cancelled) return;
          await loadScript(asset(c));
        }
        if (cancelled) return;
        await loadScript(asset(WEBFLOW_MAIN));
      } catch (e) {
        // Non-fatal: visuals degrade gracefully if a runtime asset fails.
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
      stopNavSync();
    };
  }, []);

  // Fonts are loaded via render-blocking <link> stylesheets in the <head>
  // (see app/layout.tsx) to avoid the flash-of-unstyled-text / layout shift.
  return null;
}
