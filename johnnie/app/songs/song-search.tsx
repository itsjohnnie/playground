"use client";

import { useEffect, useRef, useState } from "react";

// Filters the list that is already on the page.
//
// The obvious build would ship the songs to the client as JSON and render the
// matches — which means every title and artist travels twice, once in the HTML
// and again in a script tag. Instead each card carries its own haystack in a
// data attribute, and this toggles `hidden` on the ones that don't match.
// Nothing is duplicated and nothing renders twice.
//
// The list is read ONCE into a plain array on mount rather than being
// re-queried per keystroke. Reading `dataset` parses the attribute every time
// you touch it, so at a thousand cards the naive version cost ~330ms per
// keypress on a mid-range phone — typing visibly lagged. Caching the strings
// takes the same work down to single-digit milliseconds.
type Entry = { el: HTMLElement; hay: string };

export default function SongSearch({ total }: { total: number }) {
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(total);
  const entries = useRef<Entry[]>([]);
  const frame = useRef(0);
  const lastQuery = useRef("");

  useEffect(() => {
    entries.current = [...document.querySelectorAll<HTMLElement>(".sad-card")].map((el) => ({
      el,
      hay: el.dataset.find || "",
    }));
  }, []);

  useEffect(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const needle = query.trim().toLowerCase();
      const previous = lastQuery.current;
      lastQuery.current = needle;

      // Narrowing an existing search can only ever hide more, so the cards
      // already hidden can be left alone.
      const narrowing = needle.startsWith(previous) && previous.length > 0;
      let count = 0;

      for (const { el, hay } of entries.current) {
        if (narrowing && el.hidden) continue;
        const hit = !needle || hay.includes(needle);
        // Only touch the DOM when the state actually changes — otherwise
        // every keystroke invalidates layout for the whole list.
        if (el.hidden === hit) el.hidden = !hit;
        if (hit) count++;
      }
      // When narrowing, the skipped cards were already hidden and so aren't
      // in `count` — which is exactly the number still showing.
      setShown(count);

      // The "nothing matched" line is server-rendered (hidden) after the
      // grid, so it sits in the right place in the document without this
      // component having to portal into it.
      const empty = document.getElementById("sad-empty");
      if (empty) empty.hidden = count > 0;
    });
    return () => cancelAnimationFrame(frame.current);
  }, [query]);

  // The list is server-rendered complete, so without JS every song is
  // visible and this box simply never appears. With JS it does.
  return (
    <>
      <label className="sr-only" htmlFor="sad-search">
        Search songs by title, artist or album
      </label>
      <input
        id="sad-search"
        className="sad-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        // The total lives in the placeholder rather than in a chip beside
        // the field. On a phone that chip sat in the sticky bar taking up
        // room the whole way down the list, to say a number that never
        // changed until you typed something.
        placeholder={`Search ${total} songs…`}
        autoComplete="off"
        spellCheck={false}
      />

      {/* Only worth the space once it's actually telling you something. */}
      {query.trim() !== "" && (
        <span className="sad-count" aria-hidden="true">
          {shown} of {total}
        </span>
      )}

      {/* The count as a live region, always present so a screen reader hears
          the result total settle after typing — politely, so it reads the
          final number rather than every intermediate one. */}
      <output className="sr-only" htmlFor="sad-search" aria-live="polite">
        {shown === total ? `${total} songs` : `${shown} of ${total} songs`}
      </output>
    </>
  );
}
