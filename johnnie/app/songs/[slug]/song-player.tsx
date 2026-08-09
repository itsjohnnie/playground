"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The sneak peek: a 30-second clip, on a loop, playing to anyone who lands on
// the page — no Spotify account, no login, nothing to install.
//
// About autoplay, honestly: no browser will let a page make noise before the
// visitor has interacted with it. That is a hard rule, and it is exactly what
// the old autoplaying-YouTube-video trick was quietly losing to. So this does
// the next best thing, which turns out to be most of what was wanted:
//
//   • The first song you open shows a big Play button. One tap.
//   • That tap is remembered for the session. Every song you open afterwards
//     starts playing by itself, because by then the browser has the user
//     activation it wanted.
//
// So browsing the site — which is when the sneak peek actually matters —
// does play automatically. Only the very first page of a visit asks.
//
// Where a browser is feeling generous (a returning visitor, an installed
// PWA, high media engagement) the opening attempt succeeds too, and the
// button never appears. If it's refused, we catch it and show the button
// rather than pretending.

const WANTS_SOUND = "sad:sound-on";

export default function SongPlayer({
  preview,
  spotify,
  title,
}: {
  preview: string;
  spotify: string;
  title: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  // Until we know, render the neutral label — the server has no idea whether
  // this visitor has already opted into sound, and guessing would flash the
  // wrong button on hydration.
  const [ready, setReady] = useState(false);

  const start = useCallback(async () => {
    const el = audio.current;
    if (!el) return false;
    try {
      await el.play();
      try {
        sessionStorage.setItem(WANTS_SOUND, "1");
      } catch {
        /* private mode — the session just won't be remembered */
      }
      return true;
    } catch {
      return false; // blocked; the button stays
    }
  }, []);

  // Try to pick up where the last song left off.
  //
  // Keyed on `preview`, not just on mount: paging to the next song is a
  // client-side navigation, so React reuses this component rather than
  // remounting it. Only the src changes. Without `preview` in the deps the
  // effect would run once for the whole session and every song after the
  // first would sit silent.
  useEffect(() => {
    setReady(true);
    if (!preview) return;

    let wanted = false;
    try {
      wanted = sessionStorage.getItem(WANTS_SOUND) === "1";
    } catch {
      /* ignore */
    }
    if (!wanted) return;

    // The element is being re-pointed at a different clip; make sure it has
    // picked up the new src before asking it to play.
    const el = audio.current;
    if (el && el.getAttribute("src") !== preview) el.load();
    void start();
  }, [preview, start]);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (el.paused) {
      void start();
    } else {
      el.pause();
      try {
        // An explicit pause means "stop following me around".
        sessionStorage.removeItem(WANTS_SOUND);
      } catch {
        /* ignore */
      }
    }
  };

  // No preview for this one — offer Spotify instead of a button that lies.
  if (!preview) {
    if (!spotify) return null;
    return (
      <a className="song-btn" href={spotify} target="_blank" rel="noreferrer">
        <SpotifyMark />
        <span>Play on Spotify</span>
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`song-btn song-btn--play${playing ? " is-playing" : ""}`}
        onClick={toggle}
        aria-pressed={ready ? playing : undefined}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
        <span>{playing ? "Pause" : "Play"}</span>
        {/* Four bars that dance while the clip runs — the only cue that the
            sound is coming from this page and not a stray tab. */}
        <span className={`song-eq${playing ? " is-on" : ""}`} aria-hidden="true">
          <i /><i /><i /><i />
        </span>
      </button>

      <audio
        ref={audio}
        src={preview}
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        // A 30-second clip on loop is a taste, not the record. If it's
        // genuinely unreachable, fall back rather than leave a dead button.
        onError={() => setPlaying(false)}
      />
    </>
  );
}

function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l11.14-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function SpotifyMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12,0C5.4,0,0,5.4,0,12s5.4,12,12,12s12-5.4,12-12S18.7,0,12,0z M17.5,17.3c-0.2,0.4-0.7,0.5-1,0.2 c-2.8-1.7-6.4-2.1-10.6-1.1c-0.4,0.1-0.8-0.2-0.9-0.5c-0.1-0.4,0.2-0.8,0.5-0.9c4.6-1,8.5-0.6,11.6,1.3C17.6,16.5,17.7,17,17.5,17.3 z M19,14c-0.3,0.4-0.8,0.6-1.3,0.3c-3.2-2-8.2-2.6-11.9-1.4c-0.5,0.1-1-0.1-1.1-0.6c-0.1-0.5,0.1-1,0.6-1.1 c4.4-1.3,9.8-0.7,13.5,1.6C19.1,13,19.3,13.6,19,14z M19.1,10.7C15.2,8.4,8.8,8.2,5.2,9.3C4.6,9.5,4,9.1,3.8,8.6 C3.6,8,4,7.4,4.5,7.2c4.3-1.3,11.3-1,15.7,1.6c0.5,0.3,0.7,1,0.4,1.6C20.3,10.8,19.6,11,19.1,10.7z" />
    </svg>
  );
}
