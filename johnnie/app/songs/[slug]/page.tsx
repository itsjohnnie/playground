import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSongs, songBlurb, songDateParts, type Song } from "@/lib/content";
import { asset } from "@/lib/asset";
import SongGestures from "./song-gestures";
import SongPlayer from "./song-player";
import PhotoFade from "../photo-fade";
import ThemeColor from "./theme-color";

type Params = { slug: string };

// Static export: one HTML file per song, so the section stays a folder of
// files on the CDN with nothing running behind it — the reason a thousand
// songs costs the same to serve as forty.
export function generateStaticParams(): Params[] {
  return getSongs().map((song) => ({ slug: song.slug }));
}

function find(slug: string): Song | undefined {
  return getSongs().find((song) => song.slug === slug);
}

export async function generateViewport({
  params,
}: {
  params: Promise<Params>;
}): Promise<Viewport> {
  const { slug } = await params;
  return {
    // Correct in the server HTML, so a no-JS visitor still gets the right
    // browser chrome. Next re-applies this on every client-side navigation
    // by removing the tag and inserting a new one, which Safari often
    // ignores — so the script below installs a second, longer-lived tag
    // ahead of it. First theme-color in the document wins, and that one is
    // only ever edited in place.
    themeColor: find(slug)?.color ?? "#fafafa",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
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
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "A Song a Day" },
  };
}

function Chevron() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" aria-hidden="true">
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
  // older song (left) and the previous one is the newer (right).
  const older = songs[index + 1];
  const newer = songs[index - 1];
  const olderHref = older ? asset(`/songs/${older.slug}/`) : null;
  const newerHref = newer ? asset(`/songs/${newer.slug}/`) : null;

  return (
    <main className="sad">
      {/* Overrides the root layout's cycling `.body` colour with this song's
          accent — server-rendered, so it's right at first paint and the
          overscroll area matches the page. Both values are validated in
          lib/content.ts before they reach this. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `.body { background-color: ${song.color} !important; }`,
        }}
      />
      {/* Paints the browser chrome before first paint, and creates the one
          long-lived meta that ThemeColor then edits in place on every
          subsequent song. Runs during parse, so it beats hydration and works
          even if the JS never arrives. The colour is validated hex (see
          lib/content.ts) and JSON-encoded on the way in. */}
      <script
        dangerouslySetInnerHTML={{
          __html:
            `(function(c){var m=document.querySelector('meta[name=theme-color][data-sad]');` +
            `if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');` +
            `m.setAttribute('data-sad','');document.head.appendChild(m);}` +
            `m.setAttribute('content',c);})(${JSON.stringify(song.color)})`,
        }}
      />

      <article
        className="sad-song"
        style={{ "--accent": song.color, "--ink": song.ink, "--ink-muted": song.inkMuted } as React.CSSProperties}
      >
        <div className="sad-song-grid">
          <div className="sad-song-col">
            <nav className="sad-topbar" aria-label="Song navigation">
              <a className="sad-home" href={asset("/songs/")}>
                All songs
              </a>

              <div className="sad-pager">
                {olderHref ? (
                  <Link className="sad-step sad-step--prev" href={olderHref} rel="prev" aria-label={`Older song: ${older.title}`}>
                    <Chevron />
                  </Link>
                ) : (
                  <span className="sad-step sad-step--prev" aria-disabled="true" aria-hidden="true">
                    <Chevron />
                  </span>
                )}

                {/* One <time> rather than three loose pills, so it's read as
                    a date instead of three unrelated numbers. */}
                <time className="sad-pager-date" dateTime={song.date}>
                  <span className="sad-pill">{day}</span>
                  <span className="sad-pill">{month}</span>
                  <span className="sad-pill">{year}</span>
                </time>

                {newerHref ? (
                  <Link className="sad-step sad-step--next" href={newerHref} rel="next" aria-label={`Newer song: ${newer.title}`}>
                    <Chevron />
                  </Link>
                ) : (
                  <span className="sad-step sad-step--next" aria-disabled="true" aria-hidden="true">
                    <Chevron />
                  </span>
                )}
              </div>
            </nav>

            <div className="sad-meta">
              {/* Decorative duplicate — the number is already in the heading
                  below for anyone not looking at the page. */}
              <div className="sad-number" aria-hidden="true">
                {song.order}
              </div>
              <h1 className="sad-title">
                <span className="sr-only">{`Song ${song.order}: `}</span>
                {song.title}
              </h1>
              <p className="sad-blurb">{songBlurb(song)}</p>

              <div className="sad-actions">
                <SongPlayer preview={song.preview} spotify={song.spotify} title={song.title} />
                {/* The preview is a 30-second taste; this is the whole song.
                    Only worth showing when the button above isn't already
                    the Spotify one. */}
                {song.spotify && song.preview && (
                  <a className="song-btn song-btn--ghost" href={song.spotify} target="_blank" rel="noreferrer">
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                      <path d="M12,0C5.4,0,0,5.4,0,12s5.4,12,12,12s12-5.4,12-12S18.7,0,12,0z M17.5,17.3c-0.2,0.4-0.7,0.5-1,0.2 c-2.8-1.7-6.4-2.1-10.6-1.1c-0.4,0.1-0.8-0.2-0.9-0.5c-0.1-0.4,0.2-0.8,0.5-0.9c4.6-1,8.5-0.6,11.6,1.3C17.6,16.5,17.7,17,17.5,17.3 z M19,14c-0.3,0.4-0.8,0.6-1.3,0.3c-3.2-2-8.2-2.6-11.9-1.4c-0.5,0.1-1-0.1-1.1-0.6c-0.1-0.5,0.1-1,0.6-1.1 c4.4-1.3,9.8-0.7,13.5,1.6C19.1,13,19.3,13.6,19,14z M19.1,10.7C15.2,8.4,8.8,8.2,5.2,9.3C4.6,9.5,4,9.1,3.8,8.6 C3.6,8,4,7.4,4.5,7.2c4.3-1.3,11.3-1,15.7,1.6c0.5,0.3,0.7,1,0.4,1.6C20.3,10.8,19.6,11,19.1,10.7z" />
                    </svg>
                    <span>Full song</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="sad-cover">
            {/* Hand-picked photographs of the artists, not album covers. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset(song.image)}
              alt={`${song.artist}, photographed`}
              width={640}
              height={640}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              sizes="(max-width: 860px) 100vw, 50vw"
            />
            {song.credit && <p className="sad-credit">{song.credit}</p>}
          </div>
        </div>
      </article>

      <ThemeColor color={song.color} />
      <SongGestures older={olderHref} newer={newerHref} />
      <PhotoFade />
    </main>
  );
}
