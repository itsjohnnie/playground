import type { Metadata, Viewport } from "next";
import { getSongs } from "@/lib/content";
import { asset } from "@/lib/asset";
import SongSearch from "./song-search";
import PhotoFade from "./photo-fade";

const TITLE = "A SONG A DAY® — Curated by Johnnie Gómez";
const DESCRIPTION =
  "A curated Spotify playlist, growing a song a day. A wide variety of jazz, hip-hop, house, techno, folk, rock, and many other music genres.";

// Replaces the root viewport wholesale (Next merges shallowly), so width and
// initialScale have to be repeated alongside this page's theme colour.
export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // let the page paint under the notch / home indicator
};

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION },
  manifest: asset("/songs.webmanifest"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "A Song a Day",
  },
};

const TICKER = "One song a day, picked by hand and played from Spotify.";

export default function SongsPage() {
  const songs = getSongs(); // newest first

  return (
    <main className="sad">
      {/* The root layout paints `.body` from the cycling --bg with
          !important; this later, equally-specific rule wins and holds the
          index on its flat off-white — server-rendered, so it is right at
          first paint with no JS involved. */}
      <style dangerouslySetInnerHTML={{ __html: `.body { background-color: #fafafa !important; }` }} />

      <a className="sad-skip" href="#sad-list">
        Skip to the songs
      </a>

      <div className="sad-index">
        <div className="sad-ticker" aria-hidden="true">
          {/* Two identical halves so the -50% keyframe loops seamlessly. The
              whole strip is aria-hidden and the line is repeated for the
              readable copy below, so nobody hears it six times. */}
          <div className="sad-ticker-track">
            {[0, 1].map((half) => (
              <div className="sad-ticker-half" key={half}>
                {[0, 1, 2].map((i) => (
                  <div className="sad-ticker-item" key={i}>
                    <b>A Song a Day®</b> — {TICKER} •
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <header className="sad-masthead">
          <h1 className="sad-logo">A Song a Day®</h1>
          <p className="sad-tagline">
            A playlist curated by{" "}
            <a href="https://twitter.com/callmejohnnie" target="_blank" rel="noreferrer">
              Johnnie Gómez
            </a>
            .
          </p>
        </header>

        <div className="sad-toolbar">
          <SongSearch total={songs.length} />
        </div>

        <ul className="sad-grid" id="sad-list">
          {songs.map((song, i) => (
            <li
              className="sad-card"
              key={song.slug}
              // The search haystack travels with the card instead of being
              // shipped again as JSON. Lower-cased here so the filter never
              // has to case-fold a thousand strings per keystroke.
              data-find={`${song.title} ${song.artist} ${song.album}`.toLowerCase()}
              style={{ "--card-accent": song.color } as React.CSSProperties}
            >
              <a href={asset(`/songs/${song.slug}/`)}>
                <div className="sad-art">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset(song.image)}
                    alt={`${song.title} by ${song.artist}`}
                    // Square art, so square intrinsics: the box is reserved
                    // before the bytes arrive and nothing shifts.
                    width={640}
                    height={640}
                    // Only the first screenful is worth blocking on.
                    loading={i < 8 ? "eager" : "lazy"}
                    fetchPriority={i < 4 ? "high" : "auto"}
                    decoding="async"
                    sizes="(max-width: 640px) 45vw, (max-width: 1100px) 30vw, 220px"
                  />
                </div>
                <h2 className="sad-card-title">{song.title}</h2>
                <div className="sad-card-artist">{song.artist}</div>
              </a>
            </li>
          ))}
        </ul>

        <p className="sad-empty" id="sad-empty" hidden>
          No songs match that. Try an artist, or part of a title.
        </p>
      </div>

      <PhotoFade />
    </main>
  );
}
