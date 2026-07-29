"use client";

import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";

const LINKS = [
  { href: "#hero", label: "Top" },
  { href: "#about", label: "About" },
  { href: "#work", label: "Work" },
  // Separate page (not an in-page anchor), so it gets the basePath prefix.
  { href: asset("/discover/"), label: "Discover" },
  { href: "#features", label: "Features" },
  { href: "#contact", label: "Contact" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  // Starts away so the server-rendered bar is already off-screen — no flash
  // at load, and the first reveal is a slide like every other one.
  const [away, setAway] = useState(true);

  // Reveal-on-scroll: away at the very top and while scrolling down, slides in
  // while scrolling up. All three transitions use the same slide (see the
  // .is-away CSS in layout.tsx) — previously reaching the top flipped
  // display:none, which made the bar vanish abruptly instead of sliding out.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const TOP_HIDE = 160;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      if (y < TOP_HIDE || y > lastY + 4) {
        setAway(true);
        setOpen(false);
      } else if (y < lastY - 4) {
        setAway(false);
      }
      lastY = y;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="cc-fixed">
      {/* No role="banner" here — the hero <header> is the page's banner
          landmark; a second one is a duplicate-landmark violation. */}
      <div className={`navbar ui-nav${open ? " is-open" : ""}${away ? " is-away" : ""}`}>
        <div className="container cc-nav">
          <a href="#hero" className="brand ui-nav-brand" onClick={() => setOpen(false)}>
            <div>Johnnie&#x27;s LiFe</div>
          </a>
          <nav id="site-menu" aria-label="Site" className="nav_menu ui-nav-menu">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="nav_link ui-nav-link" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="nav_button ui-nav-button hamburger"
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </div>
  );
}
