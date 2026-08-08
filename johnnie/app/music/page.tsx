import type { Metadata, Viewport } from "next";
import { getSongs } from "@/lib/content";
import { asset } from "@/lib/asset";

// Replaces the root viewport wholesale (Next merges shallowly), so width and
// initialScale have to be repeated here alongside this page's theme colour.
export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "A SONG A DAY® — Curated by Johnnie Gómez",
  description:
    "A curated Spotify playlist, growing a song a day. A wide variety of jazz, hip-hop, house, techno, folk, rock, and many other music genres.",
  openGraph: {
    title: "A SONG A DAY® — Curated by Johnnie Gómez",
    description:
      "A curated Spotify playlist, growing a song a day. A wide variety of jazz, hip-hop, house, techno, folk, rock, and many other music genres.",
  },
};

const DISCLAIMER =
  "Audio will be played once a song is clicked. Still trying to figure out APIs and working with them •";

export default function MusicPage() {
  const songs = getSongs(); // newest first

  return (
    // data-asad-bg tells app/scripts.tsx to hold the background at this colour
    // instead of running the homepage's cycling palette here.
    <main className="asad" data-asad-bg="#fafafa">
      {/* The root layout paints `.body` from the cycling --bg with
          !important; this later, equally-specific rule wins and holds the
          page on the original's flat off-white — server-rendered, so it's
          right at first paint with no JS involved. */}
      <style dangerouslySetInnerHTML={{ __html: `.body { background-color: #fafafa !important; }` }} />

      <div className="asad-home">
        <div className="asad-disclaimer">
          {/* Two identical halves so the -50% keyframe loops seamlessly. The
              second is aria-hidden — a screen reader should hear the line
              once, not six times. */}
          <div className="asad-marquee">
            {[0, 1].map((half) => (
              <div key={half} style={{ display: "flex" }} aria-hidden={half === 1}>
                {[0, 1, 2].map((i) => (
                  <div className="asad-disclaimer-text" key={i}>
                    <span className="asad-label">Disclaimer:</span> {DISCLAIMER}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="asad-headline">
          <h1 className="asad-logo">A Song a Day®</h1>
          <div className="asad-sublogo">
            A playlist curated by{" "}
            <a href="https://twitter.com/callmejohnnie" target="_blank" rel="noreferrer">
              Johnnie Gómez
            </a>
            . Back to <a href={asset("/")}>johnnies.life</a>.
          </div>
        </div>

        <ul className="asad-grid" role="list">
          {songs.map((song, i) => (
            <li
              className="asad-song"
              key={song.slug}
              // Cap the stagger so the last card in a long list isn't left
              // waiting seconds before it appears.
              style={{ "--i": Math.min(i, 11) } as React.CSSProperties}
            >
              <a href={asset(`/music/${song.slug}/`)}>
                <div className="asad-photo-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="asad-photo"
                    src={asset(song.image)}
                    alt={`${song.title} — ${song.artist}`}
                    loading={i < 8 ? "eager" : "lazy"}
                  />
                </div>
                <h2 className="asad-song-name">{song.title}</h2>
                <div className="asad-song-artist">by {song.artist}</div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
