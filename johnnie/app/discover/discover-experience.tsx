"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";
import type { DiscoverItem } from "@/lib/content";
import GridView from "./grid-view";
import GlobeView from "./globe-view";
import CascadeView from "./cascade-view";
import { GridIcon, GlobeIcon, CascadeIcon } from "./view-icons";

type ViewId = "grid" | "globe" | "cascade";
const VIEWS: { id: ViewId; label: string; Icon: () => React.ReactElement }[] = [
  { id: "grid", label: "Grid", Icon: GridIcon },
  { id: "globe", label: "Globe", Icon: GlobeIcon },
  { id: "cascade", label: "Cascade", Icon: CascadeIcon },
];

// How long the outgoing view fades out before the incoming one mounts (which
// then fades itself in via its own existing .ready transition) — see
// .discover-view-pane in page.tsx.
const VIEW_CROSSFADE_MS = 320;

function renderView(id: ViewId, items: DiscoverItem[]) {
  if (id === "grid") return <GridView items={items} />;
  if (id === "globe") return <GlobeView items={items} />;
  return <CascadeView items={items} />;
}

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
  // `view` is the tab the user asked for (highlights immediately); `displayed`
  // is what's actually mounted — it only catches up once the outgoing view
  // has faded out, so switching views crossfades instead of cutting instantly.
  const [view, setView] = useState<ViewId>("grid");
  const [displayed, setDisplayed] = useState<ViewId>("grid");
  const [leaving, setLeaving] = useState(false);
  const crossfadeTimeout = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (crossfadeTimeout.current) window.clearTimeout(crossfadeTimeout.current);
    };
  }, []);

  function selectView(next: ViewId) {
    if (next === view) return;
    setView(next);
    setLeaving(true);
    if (crossfadeTimeout.current) window.clearTimeout(crossfadeTimeout.current);
    crossfadeTimeout.current = window.setTimeout(() => {
      setDisplayed(next);
      setLeaving(false);
    }, VIEW_CROSSFADE_MS);
  }

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
              title={v.label}
              aria-label={v.label}
              aria-selected={view === v.id}
              className={`discover-view-btn${view === v.id ? " is-active" : ""}`}
              onClick={() => selectView(v.id)}
            >
              <v.Icon />
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

      <div className={`discover-view-pane${leaving ? " is-leaving" : ""}`}>
        {renderView(displayed, items)}
      </div>

      <div className="hero-gradient cc-white"></div>
    </>
  );
}
