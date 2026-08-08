"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The song's YouTube video, playing full-bleed behind the page — the same
// trick the Webflow site used, where the song "starts" the moment you open it.
//
// It still asks for autoplay, but no browser has honoured unmuted autoplay for
// years, so the request usually gets refused and the page would sit silent
// with no way to start it. Hence the button next to "Listen in Spotify": it
// drives the same iframe through YouTube's postMessage API, and the label
// tracks what the player is *actually* doing (via the API's state events)
// rather than what we asked it to do.
export default function SongPlayer({
  youtube,
  title,
}: {
  youtube: string;
  title: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [playing, setPlaying] = useState(false);

  const command = useCallback((func: "playVideo" | "pauseVideo") => {
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args: [] }),
      "*",
    );
  }, []);

  useEffect(() => {
    if (!youtube) return;

    // YouTube only emits state events to listeners that have introduced
    // themselves. The iframe may not be ready when this effect runs, so the
    // handshake repeats for a few seconds and stops once we hear back.
    let handshake = 0;
    const introduce = () =>
      frame.current?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
        "*",
      );
    const timer = window.setInterval(() => {
      if (++handshake > 20) window.clearInterval(timer);
      introduce();
    }, 300);
    introduce();

    const onMessage = (e: MessageEvent) => {
      if (!/youtube\.com$/.test(new URL(e.origin).hostname)) return;
      let data: { event?: string; info?: unknown };
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      // 1 = playing, 3 = buffering; anything else means it isn't running.
      // The state arrives either as `info` directly (onStateChange) or nested
      // in the periodic infoDelivery payload.
      const info = data?.info;
      const state =
        typeof info === "number"
          ? info
          : typeof (info as { playerState?: number })?.playerState === "number"
            ? (info as { playerState: number }).playerState
            : null;
      if (state === null) return;
      window.clearInterval(timer);
      setPlaying(state === 1 || state === 3);
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("message", onMessage);
    };
  }, [youtube]);

  if (!youtube) return null;

  const src =
    `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtube)}` +
    `?autoplay=1&playsinline=1&rel=0&enablejsapi=1&modestbranding=1`;

  return (
    <>
      <button
        type="button"
        className="asad-button is-secondary"
        onClick={() => command(playing ? "pauseVideo" : "playVideo")}
        aria-pressed={playing}
      >
        {playing ? (
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" />
          </svg>
        )}
        <span>{playing ? "Pause" : "Play"} the video</span>
      </button>

      <div className="asad-bg-video" aria-hidden="true">
        <iframe
          ref={frame}
          src={src}
          title={`${title} — video`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          tabIndex={-1}
        />
      </div>
    </>
  );
}
