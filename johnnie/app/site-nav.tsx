"use client";

import { useEffect, useRef, useState } from "react";

const LINKS = [
  { href: "#hero", label: "Top" },
  { href: "#about", label: "About" },
  { href: "#work", label: "Work" },
  { href: "#features", label: "Features" },
  { href: "#contact", label: "Contact" },
];

export default function SiteNav() {
  const fixedRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Reveal-on-scroll: hidden at the very top; once past the hero it shows, then
  // slides up while scrolling down and back down while scrolling up.
  useEffect(() => {
    const fixed = fixedRef.current;
    const bar = barRef.current;
    if (!fixed || !bar) return;
    let lastY = window.scrollY;
    let ticking = false;
    const TOP_HIDE = 160;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      if (y < TOP_HIDE) {
        fixed.style.display = "none";
      } else {
        fixed.style.display = "block";
        fixed.style.opacity = "1";
        if (y > lastY + 4) {
          bar.style.transform = "translateY(-100%)";
          setOpen(false);
        } else if (y < lastY - 4) {
          bar.style.transform = "translateY(0)";
        }
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
    <div ref={fixedRef} style={{ display: "none", opacity: 0 }} className="cc-fixed">
      <div
        ref={barRef}
        role="banner"
        className={`navbar w-nav${open ? " is-open" : ""}`}
        style={{ transition: "transform 0.4s ease" }}
      >
        <div className="container cc-nav">
          <a href="#hero" className="brand w-nav-brand" onClick={() => setOpen(false)}>
            <div>Johnnie&#x27;s LiFe</div>
          </a>
          <nav role="navigation" className="nav_menu w-nav-menu">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="nav_link w-nav-link" onClick={() => setOpen(false)}>
                {l.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="nav_button w-nav-button hamburger"
            aria-label="Menu"
            aria-expanded={open}
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
