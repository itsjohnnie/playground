"use client";

import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";
import type { DiscoverItem } from "@/lib/content";
import GridView from "./grid-view";
import GlobeView from "./globe-view";
import CascadeView from "./cascade-view";

type ViewId = "grid" | "globe" | "cascade";
const VIEWS: { id: ViewId; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "globe", label: "Globe" },
  { id: "cascade", label: "Cascade" },
];

const LIGHT = "#ffffff";
const DARK = "#080808";
const THEME_KEY = "discover-theme";

function setThemeColor(color: string) {
  let metas = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'),
  );
  if (metas.length === 0) {
    const m = document.createElement("meta");
    m.name = "theme-color";
    document.head.appendChild(m);
    metas = [m];
  }
  // Update every theme-color tag (and strip any media-scoped ones that could let
  // the system appearance win) so iOS Safari tints its chrome to match.
  for (const m of metas) {
    m.removeAttribute("media");
    m.setAttribute("content", color);
  }
}

export default function DiscoverExperience({ items }: { items: DiscoverItem[] }) {
  const [view, setView] = useState<ViewId>("grid");
  // Bottom bar arrives ~half a second after mount, then slides up + fades in.
  // A three-phase state (rather than a single boolean) so the entrance can use
  // its own transition timing without touching the bar's normal, unrelated
  // transitions (theme easing, the tap-to-stage slide-off) — see the CSS in
  // page.tsx: once "done", both extra classes are gone and those original
  // rules are back in full, undisturbed control.
  const [barPhase, setBarPhase] = useState<"pre" | "entering" | "done">("pre");

  useEffect(() => {
    const t = window.setTimeout(() => setBarPhase("entering"), 500);
    return () => window.clearTimeout(t);
  }, []);

  // Light/dark: follow the OS preference by default; a manual toggle overrides
  // it and persists in localStorage (so a refresh keeps the chosen mode). The
  // pre-paint head script already applied the same initial state to <html>.
  // Lives here (not inside a view) so it survives switching between views.
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const readSaved = (): string | null => {
      try {
        return localStorage.getItem(THEME_KEY);
      } catch {
        return null;
      }
    };
    const applyTheme = (dark: boolean) => {
      root.classList.toggle("is-dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
      root.style.setProperty("--bg", dark ? DARK : LIGHT);
      setThemeColor(dark ? DARK : LIGHT);
    };
    const saved = readSaved();
    applyTheme(saved ? saved === "dark" : mq.matches);

    const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");
    const onToggle = (e: Event) => {
      e.preventDefault();
      const next = !root.classList.contains("is-dark");
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch {
        /* private mode / storage disabled — just don't persist */
      }
    };
    toggle?.addEventListener("click", onToggle);

    const onSystem = (e: MediaQueryListEvent) => {
      if (!readSaved()) applyTheme(e.matches);
    };
    mq.addEventListener("change", onSystem);

    return () => {
      toggle?.removeEventListener("click", onToggle);
      mq.removeEventListener("change", onSystem);
      root.classList.remove("is-dark");
      root.style.colorScheme = "";
    };
  }, []);

  const barClass =
    barPhase === "pre"
      ? " discover-comp--pre"
      : barPhase === "entering"
        ? " discover-comp--entering"
        : "";

  return (
    <>
      {/* Floating control bar: home link, view switcher, light/dark toggle. */}
      <div
        className={`discover-comp${barClass}`}
        onTransitionEnd={(e) => {
          if (e.propertyName === "transform" && barPhase === "entering") setBarPhase("done");
        }}
      >
        <a href={asset("/")} className="discover-logo">
          <div>Johnnie Gómez Álzaga ®</div>
        </a>
        <div className="discover-views" role="tablist" aria-label="Discover view">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              className={`discover-view-btn${view === v.id ? " is-active" : ""}`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <a data-theme-toggle href="#" className="toggle-mode" aria-label="Toggle light or dark mode">
          {/* Sun/moon morph: a disc that masks into a crescent (moon) while
              eight rays fold in; back out to a smaller disc + rays (sun).
              Pure CSS, state-driven by html.is-dark — styles in page.tsx. */}
          <span className="button-icon sunmoon" aria-hidden="true">
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
            <span className="ray" />
          </span>
        </a>
      </div>

      {view === "grid" && <GridView items={items} />}
      {view === "globe" && <GlobeView items={items} />}
      {view === "cascade" && <CascadeView items={items} />}

      <div className="hero-gradient cc-white"></div>
    </>
  );
}
