"use client";

import { useEffect, useState } from "react";
import type { Song } from "@/lib/content";
import { asset } from "@/lib/asset";

// The "All songs" panel: every song in the run, numbered, each number in its
// own accent colour — the index in miniature, reachable from any song page.
export default function SongMenu({
  songs,
  current,
}: {
  songs: Song[];
  current: string;
}) {
  const [open, setOpen] = useState(false);

  // Escape closes it, and the page behind it shouldn't scroll while it's up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="asad-menu-button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="asad-menu"
      >
        All songs
      </button>

      <div
        className={`asad-menu-scrim${open ? " is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <nav
        id="asad-menu"
        className={`asad-menu${open ? " is-open" : ""}`}
        aria-label="All songs"
        // Keeps the links out of the tab order (and off screen readers) while
        // the panel is closed, rather than leaving 42 invisible tab stops.
        inert={!open}
      >
        <button type="button" className="asad-menu-close" onClick={() => setOpen(false)}>
          Close ✕
        </button>
        <ul className="asad-menu-list" role="list">
          {songs.map((song) => (
            <li className="asad-menu-item" key={song.slug}>
              <a
                href={asset(`/music/${song.slug}/`)}
                aria-current={song.slug === current ? "page" : undefined}
              >
                <div className="asad-menu-number" style={{ color: song.color }}>
                  {song.order}
                </div>
                <div className="asad-menu-text">
                  <div className="asad-menu-title">{song.title}</div>
                  <div className="asad-menu-artist">{song.artist}</div>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
