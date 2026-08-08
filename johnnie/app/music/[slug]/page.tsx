import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getSongs, songBlurb, songDateParts, type Song } from "@/lib/content";
import { asset } from "@/lib/asset";
import SongMenu from "./song-menu";
import SongPlayer from "./song-player";

type Params = { slug: string };

// Static export: one HTML file per song, so the whole section stays a plain
// folder of files on the CDN with no server behind it.
export function generateStaticParams(): Params[] {
  return getSongs().map((song) => ({ slug: song.slug }));
}

function find(slug: string): Song | undefined {
  return getSongs().find((song) => song.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const song = find(slug);
  if (!song) return {};
  const title = `${song.title} — ${song.artist} | A Song a Day®`;
  const description = songBlurb(song);
  return {
    title,
    description,
    openGraph: { title, description, images: [asset(song.image)] },
    twitter: { title, description, images: [asset(song.image)] },
  };
}

// Each song tints the browser chrome with its own accent. Like the index,
// this replaces the root viewport wholesale, so width/initialScale repeat.
export async function generateViewport({
  params,
}: {
  params: Promise<Params>;
}): Promise<Viewport> {
  const { slug } = await params;
  return {
    themeColor: find(slug)?.color ?? "#fafafa",
    width: "device-width",
    initialScale: 1,
  };
}

function Chevron() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.769,1.36A1,1,0,0,0,5.231,2.64L9.7,8,5.231,13.36a1,1,0,0,0,1.538,1.28l5-6a1,1,0,0,0,0-1.28Z"
      />
    </svg>
  );
}

export default async function SongPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const songs = getSongs(); // newest first
  const index = songs.findIndex((s) => s.slug === slug);
  if (index === -1) notFound();

  const song = songs[index];
  const [day, month, year] = songDateParts(song.date);
  // The list runs newest → oldest, so the next entry in the array is the
  // older song (left arrow) and the previous one is the newer (right arrow).
  const older = songs[index + 1];
  const newer = songs[index - 1];

  return (
    <main className="asad">
      {/* Overrides the root layout's cycling `.body` colour with this song's
          accent — server-rendered so it's correct at first paint, and so the
          overscroll area matches the page instead of flashing pink. The
          colour is validated in lib/content.ts before it reaches this. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `.body { background-color: ${song.color} !important; }`,
        }}
      />

      <section
        className="asad-song-page"
        // The accent drives the background, the selection colour, and (via
        // app/scripts.tsx reading data-asad-bg) the browser theme colour.
        data-asad-bg={song.color}
        style={{ "--accent": song.color } as React.CSSProperties}
      >
        <div className="asad-song-container">
          <div className="asad-song-content">
            <div className="asad-song-nav">
              <a className="asad-song-logo" href={asset("/music/")}>
                A song a day®
              </a>

              <div className="asad-pagination">
                <a
                  className={`asad-arrow is-prev${older ? "" : " is-off"}`}
                  href={older ? asset(`/music/${older.slug}/`) : undefined}
                  aria-label={older ? `Older: ${older.title}` : undefined}
                  aria-hidden={older ? undefined : true}
                >
                  <Chevron />
                </a>
                <div className="asad-date-pill">{day}</div>
                <div className="asad-date-pill">{month}</div>
                <div className="asad-date-pill">{year}</div>
                <a
                  className={`asad-arrow is-next${newer ? "" : " is-off"}`}
                  href={newer ? asset(`/music/${newer.slug}/`) : undefined}
                  aria-label={newer ? `Newer: ${newer.title}` : undefined}
                  aria-hidden={newer ? undefined : true}
                >
                  <Chevron />
                </a>
              </div>

              <SongMenu songs={songs} current={song.slug} />
            </div>

            <div className="asad-block">
              <div className="asad-number">{song.order}</div>
              <h1 className="asad-title">{song.title}</h1>
              <p className="asad-blurb">{songBlurb(song)}</p>
              <div className="asad-buttons">
                {song.spotify && (
                  <a className="asad-button" href={song.spotify} target="_blank" rel="noreferrer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                      <path d="M12,0C5.4,0,0,5.4,0,12s5.4,12,12,12s12-5.4,12-12S18.7,0,12,0z M17.5,17.3c-0.2,0.4-0.7,0.5-1,0.2 c-2.8-1.7-6.4-2.1-10.6-1.1c-0.4,0.1-0.8-0.2-0.9-0.5c-0.1-0.4,0.2-0.8,0.5-0.9c4.6-1,8.5-0.6,11.6,1.3C17.6,16.5,17.7,17,17.5,17.3 z M19,14c-0.3,0.4-0.8,0.6-1.3,0.3c-3.2-2-8.2-2.6-11.9-1.4c-0.5,0.1-1-0.1-1.1-0.6c-0.1-0.5,0.1-1,0.6-1.1 c4.4-1.3,9.8-0.7,13.5,1.6C19.1,13,19.3,13.6,19,14z M19.1,10.7C15.2,8.4,8.8,8.2,5.2,9.3C4.6,9.5,4,9.1,3.8,8.6 C3.6,8,4,7.4,4.5,7.2c4.3-1.3,11.3-1,15.7,1.6c0.5,0.3,0.7,1,0.4,1.6C20.3,10.8,19.6,11,19.1,10.7z" />
                    </svg>
                    <span>Listen in Spotify</span>
                  </a>
                )}
                <SongPlayer youtube={song.youtube} title={song.title} />
              </div>
            </div>
          </div>

          <div className="asad-image-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="asad-image"
              src={asset(song.image)}
              alt={`${song.title} — ${song.artist}`}
              loading="eager"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
