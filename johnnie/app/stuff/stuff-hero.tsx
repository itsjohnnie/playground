"use client";

import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";

// Battery Status API — Chrome/Android only, Safari never implemented it, so
// this is a best-effort proactive check, not the primary mechanism.
type BatteryManager = {
  charging: boolean;
  level: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

const ALT = "Johnnie at his desk with his two monitors and his dog Honey";

export default function StuffHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Starts true so server/client markup match on hydration; JS then demotes
  // it to the static dark image if autoplay is blocked or power-saving
  // kicks in — never the other way, so there's nothing to flicker back.
  const [videoOk, setVideoOk] = useState(true);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true; // belt-and-suspenders alongside the muted attribute

    let cancelled = false;
    const fallbackToImage = () => {
      if (!cancelled) setVideoOk(false);
    };

    // The reliable, cross-browser signal: iOS Low Power Mode (and other
    // battery-saver modes) silently blocks <video autoplay> — the element
    // just sits paused with a play button rather than throwing. Try to
    // play explicitly so we get a promise to catch, and treat rejection
    // (or staying paused) as "skip the video, use the still image."
    const playAttempt = v.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(fallbackToImage);
    }

    // A pause after we've already started playing — power saver kicking in
    // mid-loop, say — is the same signal. Ignore pauses while the tab is
    // hidden (normal backgrounding pauses video in most browsers and isn't
    // what we're guarding against here).
    const onPause = () => {
      if (document.visibilityState === "visible" && !v.ended) fallbackToImage();
    };
    v.addEventListener("pause", onPause);

    // Best-effort battery check where the API exists: an unplugged device
    // at 20% or below skips the video outright rather than waiting for
    // autoplay to fail (which it may not, on every browser/OS).
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryManager>;
    };
    let battery: BatteryManager | null = null;
    let onBatteryChange: (() => void) | null = null;
    if (nav.getBattery) {
      nav
        .getBattery()
        .then((b) => {
          if (cancelled) return;
          battery = b;
          onBatteryChange = () => {
            if (!b.charging && b.level <= 0.2) fallbackToImage();
          };
          onBatteryChange();
          b.addEventListener("levelchange", onBatteryChange);
          b.addEventListener("chargingchange", onBatteryChange);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      v.removeEventListener("pause", onPause);
      if (battery && onBatteryChange) {
        battery.removeEventListener("levelchange", onBatteryChange);
        battery.removeEventListener("chargingchange", onBatteryChange);
      }
    };
  }, []);

  return (
    <div className="stuff-hero">
      {/* Light and dark renders of the same scene; CSS picks by the system
          colour-scheme preference (both stay in the DOM — a <picture> can't
          switch between an img and a video). Dark is a boomerang loop
          (forward, then reverse, so the "cut" back to the start is really
          just the same frame it started on) — unless autoplay is blocked
          or the battery's low, in which case it's the same still dark
          render as light mode gets. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="stuff-hero-light"
        src={asset("/images/stuff-hero.png")}
        alt={ALT}
        width={1024}
        height={1024}
      />
      {videoOk ? (
        <video
          ref={videoRef}
          className="stuff-hero-dark"
          aria-label={ALT}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          width={960}
          height={960}
        >
          <source src={asset("/videos/stuff-hero-dark.webm")} type="video/webm" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="stuff-hero-dark"
          src={asset("/images/stuff-hero-dark.png")}
          alt={ALT}
          width={1024}
          height={1024}
        />
      )}
    </div>
  );
}
