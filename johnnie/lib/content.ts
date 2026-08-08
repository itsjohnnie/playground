import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { slugify } from "./slugify";

const CONTENT = path.join(process.cwd(), "content");

export type Project = {
  order: number;
  title: string;
  tag: string;
  poster: string;
  video: string;
  award_text: string;
  award_url: string;
};

export type Feature = {
  order: number;
  title: string;
  category: string;
  url: string;
};

export type DiscoverItem = {
  order: number;
  name: string;
  category: string;
  image: string;
};

// A single "stat" line in the detail card (dimensions, weight, movement…).
export type StuffSpec = { label: string; value: string };

export type StuffItem = {
  order: number;
  name: string;
  // Derived from name (not stored in frontmatter) — used as the #hash for
  // linking straight to one item's detail sheet (see stuff-list.tsx).
  slug: string;
  category: string;
  // Owned = full opacity; not owned (wishlist / someday) = dimmed.
  owned: boolean;
  // Overrides the auto "Owned" / "On the wishlist" status text (e.g. "Sold")
  // for items that don't fit the owned/wishlist binary. Empty = automatic.
  status: string;
  // Expanded detail card (all optional — fill in over time via the CMS):
  brand: string;
  price: string;
  description: string;
  // Pokédex-style spec lines beyond brand/price (dimensions, weight, etc.).
  specs: StuffSpec[];
  image: string; // isometric render (light theme)
  image_dark: string; // optional dark-theme variant of the render
  // "Buy it" link + its call-to-action label (defaults to "Buy it").
  link: string;
  cta: string;
};

// One entry of A Song a Day® (/music) — migrated off Webflow, where each song
// was a CMS item with its own page. `order` is the song's number in the run
// (1 = the first one ever); the grid shows them newest-first.
export type Song = {
  order: number;
  title: string;
  // The song's URL: /music/<slug>/. Derived from the title unless the entry
  // carries an explicit `slug` — three of the migrated songs had a Webflow
  // slug longer than their title ("bzrp-music-sessions-vol-3-feat-paco-
  // amoroso" for "BZRP Music Session"), and the override keeps those old
  // links working. New entries can just leave it blank.
  slug: string;
  artist: string;
  album: string;
  date: string; // ISO yyyy-mm-dd; rendered as the DD / MON / YYYY pills
  // Accent colour: the song page's background, picked from its artwork.
  color: string;
  image: string; // album art, self-hosted under /music
  spotify: string;
  youtube: string; // video id — plays behind the song page, as it did on Webflow
  // Optional free-text line replacing the automatic "a song by X, featured in
  // the album Y." sentence, for when a song deserves an actual note.
  note: string;
};

function readCollection<T>(dir: string): T[] {
  const full = path.join(CONTENT, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith(".md"))
    .map((f) => matter(fs.readFileSync(path.join(full, f), "utf8")).data as T)
    .sort((a, b) => (a as { order: number }).order - (b as { order: number }).order);
}

export function getProjects(): Project[] {
  return readCollection<Project>("projects");
}

export function getFeatures(): Feature[] {
  return readCollection<Feature>("features");
}

export function getDiscover(): DiscoverItem[] {
  return readCollection<DiscoverItem>("discover");
}

export function getStuff(): StuffItem[] {
  // `specs`/`cta` are newer fields; default them so older entries stay valid.
  const items = readCollection<StuffItem>("stuff").map((it) => ({
    ...it,
    slug: slugify(it.name),
    specs: Array.isArray(it.specs) ? it.specs : [],
    cta: typeof it.cta === "string" ? it.cta : "",
    image_dark: typeof it.image_dark === "string" ? it.image_dark : "",
    status: typeof it.status === "string" ? it.status : "",
  }));

  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.slug)) {
      throw new Error(
        `Duplicate /stuff slug "${it.slug}" (from "${it.name}") — two items produce the same URL.`,
      );
    }
    seen.add(it.slug);
  }

  return items;
}

// The accent colour ends up inside a server-rendered <style> block, so it
// can't be taken on trust: a hand-edited (or CMS-fumbled) value carrying a
// brace or a semicolon would escape its rule and inject arbitrary CSS. Only
// plain hex and the rgb()/hsl() function forms get through; anything else
// falls back to the page's neutral.
const COLOR_RE = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%/-]+\))$/i;

function safeColor(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return COLOR_RE.test(raw) ? raw : "#fafafa";
}

// Newest first — the order the songs are shown in, and the order the arrows
// page through. `order` is the song's number in the run, so descending by it
// puts the most recent song first (as the Webflow grid did).
export function getSongs(): Song[] {
  const songs = readCollection<Song & { slug?: string }>("music")
    .map((s) => ({
      ...s,
      slug: s.slug || slugify(s.title),
      note: typeof s.note === "string" ? s.note : "",
      album: typeof s.album === "string" ? s.album : "",
      youtube: typeof s.youtube === "string" ? s.youtube : "",
      spotify: typeof s.spotify === "string" ? s.spotify : "",
      color: safeColor(s.color),
    }))
    .sort((a, b) => b.order - a.order);

  const seen = new Set<string>();
  for (const s of songs) {
    if (seen.has(s.slug)) {
      throw new Error(
        `Duplicate /music slug "${s.slug}" (from "${s.title}") — two songs produce the same URL. Set an explicit \`slug\` on one of them.`,
      );
    }
    seen.add(s.slug);
  }

  return songs;
}

// "a song by Mac Miller, featured in the album “Circles”." — the line under
// every song title, unless the entry overrides it with a `note`.
export function songBlurb(song: Song): string {
  if (song.note) return song.note;
  const album = song.album ? `, featured in the album “${song.album}”` : "";
  return `a song by ${song.artist}${album}.`;
}

// "05 / Nov / 2022" as three pills. Parsed as UTC (the plain yyyy-mm-dd form
// is already UTC by spec) and formatted in UTC, so the date never slips a day
// for readers west of Greenwich.
export function songDateParts(date: string): [string, string, string] {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return ["", "", ""];
  const [mon, day, year] = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(d)
    .replace(",", "")
    .split(" ");
  return [day, mon, year];
}
