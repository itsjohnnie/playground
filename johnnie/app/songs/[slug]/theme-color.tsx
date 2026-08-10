"use client";

import { useEffect } from "react";

// Keeps iOS's browser chrome in step with the song's colour.
//
// The page already ships the right `theme-color` in its HTML, so a fresh
// load is correct with no JavaScript. The trouble is paging between songs,
// which is a client-side navigation: Next handles that by REMOVING the old
// `<meta name="theme-color">` and inserting a new one. Chrome re-reads it
// and repaints. Safari frequently does not — it keeps showing the previous
// song's colour, and it's inconsistent about it, which is why the bar
// sometimes catches up when you page back and forth and sometimes doesn't.
//
// What Safari does honour reliably is a `content` attribute changing on a
// meta element that was already there. So this owns one such element:
// inserted once at the very front of <head> (first match wins, per the HTML
// spec, so it outranks the one Next keeps churning), then only ever mutated
// in place — never replaced.
export default function ThemeColor({ color }: { color: string }) {
  useEffect(() => {
    const head = document.head;
    let meta = head.querySelector<HTMLMetaElement>('meta[name="theme-color"][data-sad]');

    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      // Marks it as ours, so we never adopt (and then delete) Next's.
      meta.dataset.sad = "";
      head.appendChild(meta);
    }

    if (meta.getAttribute("content") !== color) {
      meta.setAttribute("content", color);
    }
  }, [color]);

  // Deliberately no cleanup that removes the tag. Paging to another song
  // remounts this component, and tearing the element down on unmount meant
  // it was destroyed and recreated on every navigation — exactly the
  // replace-don't-mutate pattern Safari ignores, which is the bug this file
  // exists to fix. It survives instead, and the effect above re-colours it.
  // Leaving /songs entirely is a full page load, so nothing leaks.

  return null;
}
