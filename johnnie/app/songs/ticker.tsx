"use client";

import { useState } from "react";

// The scrolling strip at the top of the index.
//
// Two accessibility problems it has to solve at once. The line is repeated
// six times so the loop has no seam — a screen reader must not hear it six
// times. And it moves on its own, forever, which WCAG 2.2.2 (Pause, Stop,
// Hide) says a visitor has to be able to stop.
//
// So: the sentence is announced exactly once from a visually-hidden copy,
// every visible repeat is hidden from assistive tech, and there's a real
// control to stop the motion. (`prefers-reduced-motion` already halts it —
// but that's a system setting, not a mechanism on the page, and someone who
// simply finds it distracting today shouldn't have to go change their OS.)
export default function Ticker({ line }: { line: string }) {
  const [paused, setPaused] = useState(false);

  return (
    <div className="sad-ticker">
      {/* Heard once. Everything below is decoration as far as a screen
          reader is concerned. */}
      <p className="sr-only">A Song a Day® — {line}</p>

      <div className="sad-ticker-window" aria-hidden="true">
        <div className={`sad-ticker-track${paused ? " is-paused" : ""}`}>
          {/* Two identical halves so translating -50% loops seamlessly. */}
          {[0, 1].map((half) => (
            <div className="sad-ticker-half" key={half}>
              {[0, 1, 2].map((i) => (
                <span className="sad-ticker-item" key={i}>
                  <b>A Song a Day®</b> — {line}
                  <span className="sad-ticker-dot">•</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="sad-ticker-toggle"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
      >
        {paused ? (
          <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        )}
        <span className="sr-only">
          {paused ? "Resume the scrolling banner" : "Pause the scrolling banner"}
        </span>
      </button>
    </div>
  );
}
