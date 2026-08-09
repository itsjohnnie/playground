"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Paging between songs the way a phone expects it: swipe left/right, and
// arrow keys on a desktop. The links themselves are in the markup and work
// on their own — this only adds the gestures on top, so nothing here is
// load-bearing.
//
// Navigation goes through the router rather than window.location on purpose.
// A full page load throws away the browser's "this user has interacted with
// the page" flag, and without it the next song's preview clip is refused
// permission to play. Staying in the same document keeps that flag, which is
// what lets the clip start by itself once you've pressed play once.
export default function SongGestures({
  older,
  newer,
}: {
  older: string | null;
  newer: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    const go = (href: string | null) => {
      if (href) router.push(href);
    };

    const onKey = (e: KeyboardEvent) => {
      // Never steal the arrow keys from someone typing, or from the
      // Spotify iframe's own controls.
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") go(older);
      else if (e.key === "ArrowRight") go(newer);
    };

    let startX = 0;
    let startY = 0;
    let tracking = false;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    };
    const onEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // Comfortably horizontal, and long enough not to fire on a stray
      // thumb during a vertical scroll.
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6) return;
      go(dx < 0 ? newer : older);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [older, newer, router]);

  return null;
}
