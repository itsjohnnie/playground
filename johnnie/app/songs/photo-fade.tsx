"use client";

import { useEffect } from "react";

// Cross-fades each photo up out of the coloured square that stands in for it.
//
// The placeholder is already the song's own colour, so fading the image in
// from transparent *is* the blend — the colour resolves into the photograph
// rather than being replaced by it.
//
// Two things this deliberately does not do:
//
//   • Put an `onLoad` on every image. At a thousand cards that's a thousand
//     React handlers; one capture-phase listener on the container catches
//     every `load` instead, because load events don't bubble but they do
//     capture.
//   • Hide images by default in CSS. If it did, anyone without JavaScript
//     would get a page of empty colour swatches. Instead the CSS only hides
//     what's *not yet* marked, and only once this has flagged the container
//     as handling the fade — so no JS means no fade and every photo shows.
export default function PhotoFade() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".sad");
    if (!root) return;

    const mark = (img: HTMLImageElement) => {
      img.dataset.loaded = "";
    };

    // Listener first, then sweep — the other order leaves a gap where an
    // image finishing in between would never be marked and stay invisible.
    const onLoad = (e: Event) => {
      const t = e.target;
      if (t instanceof HTMLImageElement) mark(t);
    };
    root.addEventListener("load", onLoad, true);
    // A decode failure shouldn't leave a permanently blank square; show the
    // browser's own broken-image state instead.
    root.addEventListener("error", onLoad, true);

    // Anything already finished (cache, or eager art that beat hydration)
    // is marked without a transition — see the CSS — so it doesn't blink.
    root.dataset.fade = "on";
    for (const img of root.querySelectorAll("img")) {
      if (img.complete && img.naturalWidth > 0) mark(img);
    }

    return () => {
      root.removeEventListener("load", onLoad, true);
      root.removeEventListener("error", onLoad, true);
      delete root.dataset.fade;
    };
  }, []);

  return null;
}
