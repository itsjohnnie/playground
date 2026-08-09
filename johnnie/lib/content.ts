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

// One entry of A Song a Day® (/songs). `order` is the song's number in the
// run (1 = the first one ever); the list shows them newest-first.
export type Song = {
  order: number;
  title: string;
  // The song's URL: /songs/<slug>/. Derived from the title unless the entry
  // carries an explicit `slug`. A handful of the earliest songs have one,
  // because their original URL was longer than their title
  // ("bzrp-music-sessions-vol-3-feat-paco-amoroso" for "BZRP Music Session")
  // and the override keeps those links alive. New entries leave it blank.
  slug: string;
  artist: string;
  album: string;
  date: string; // ISO yyyy-mm-dd; rendered as the DD / MON / YYYY pills
  // Accent colour: the song page's background, taken from its artwork.
  color: string;
  // Text colour to use on `color` — near-black or near-white, whichever
  // clears WCAG contrast. Derived, never authored (see inkFor).
  ink: string;
  // A softened `ink` for the big song number: as close to the accent as it
  // can get while still clearing large-text contrast (see mutedInkFor).
  inkMuted: string;
  image: string; // album art, self-hosted under /songs
  spotify: string; // full open.spotify.com track URL
  // 30-second clip from Apple's public preview endpoint. Plays for everyone,
  // signed into nothing — see scripts/lib/preview.mjs. Empty when no
  // confident match was found; the page falls back to the Spotify link.
  preview: string;
  // Where the photo came from. These are hand-picked images of the artists,
  // not album covers, so the source is worth recording per song.
  credit: string;
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

// The accent colours come straight off album art, so some land pale and some
// land near-black. Fixing the text at near-black (as the old design did) put
// unreadable pages one dark cover away. Instead every page picks its own ink
// by measuring contrast, so all of them clear WCAG AA whatever the artwork.
//
// Relative luminance per WCAG 2.x; only hex is parsed here (the sync tool and
// the CMS colour picker both emit hex), and anything else keeps the dark ink,
// which is right for the pale defaults.
const INK_DARK = "#101011";
const INK_LIGHT = "#f7f7f5";

function luminance(hex: string): number | null {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  if (h.length !== 6 || !/^[0-9a-f]{6}$/i.test(h)) return null;
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: number, b: number): number {
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function inkFor(color: string): string {
  const bg = luminance(color);
  if (bg === null) return INK_DARK;
  const dark = contrast(bg, luminance(INK_DARK)!);
  const light = contrast(bg, luminance(INK_LIGHT)!);
  return light > dark ? INK_LIGHT : INK_DARK;
}

// Mid-tone accents have a dead zone — around 45% lightness, neither black nor
// white text quite clears 4.5:1, and a colour sampled off a photograph lands
// there sooner or later ("Rain" did, at 4.41). Rather than leave one page
// slightly unreadable, or hand-tune colours forever, the accent itself is
// nudged away from the middle until the better ink clears AA. It moves by at
// most a few percent of lightness, which is invisible next to a photograph,
// and it means no song added in the future can quietly land unreadable.
const AA = 4.5;

function shift(hex: string, amount: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const channels = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const moved = channels.map((v) =>
    Math.max(0, Math.min(255, Math.round(amount > 0 ? v + (255 - v) * amount : v * (1 + amount)))),
  );
  return `#${moved.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// The big ghosted song number wants to sit back from the title without
// becoming unreadable. A flat `opacity` can't do that job: it scales contrast
// down from whatever the accent already gives, so on the accents that only
// just clear AA the number lands far below the 3:1 that large text needs
// (four of forty-two pages failed that way). Instead the ink is blended
// toward the accent as far as it can go while still holding 3:1 — the same
// ghosted look where the colour allows it, and automatically firmer where it
// doesn't.
const LARGE_TEXT = 3.2; // 3:1 required, with a little margin

function mix(from: string, to: string, ratio: number): string {
  const parse = (hex: string) => {
    let h = hex.replace("#", "");
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };
  const a = parse(from);
  const b = parse(to);
  const out = a.map((v, i) => Math.round(v + (b[i] - v) * ratio));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function mutedInkFor(color: string, ink: string): string {
  const bg = luminance(color);
  if (bg === null) return ink;
  // Walk from "fully ink" toward "fully accent" and keep the last blend that
  // still clears the bar.
  let best = ink;
  for (let step = 1; step <= 10; step++) {
    const candidate = mix(ink, color, step / 20); // up to 50% toward the accent
    const lum = luminance(candidate);
    if (lum === null) break;
    if (contrast(bg, lum) < LARGE_TEXT) break;
    best = candidate;
  }
  return best;
}

export function accessibleAccent(color: string): string {
  const bg = luminance(color);
  if (bg === null) return color;

  const ink = inkFor(color);
  if (contrast(bg, luminance(ink)!) >= AA) return color;

  // Push away from the ink: lighten if the text is dark, darken if it's light.
  const direction = ink === INK_DARK ? 1 : -1;
  let candidate = color;
  for (let step = 0; step < 24; step++) {
    candidate = shift(candidate, direction * 0.04);
    const lum = luminance(candidate);
    if (lum === null) break;
    // Re-pick the ink each round: a big enough nudge can flip which one wins.
    if (contrast(lum, luminance(inkFor(candidate))!) >= AA) return candidate;
  }
  return candidate;
}

// Newest first — the order the songs are shown in, and the order the arrows
// page through. `order` is the song's number in the run, so descending by it
// puts the most recent song first.
export function getSongs(): Song[] {
  const songs = readCollection<Song & { slug?: string }>("songs")
    .map((s) => {
      // Nudged, if need be, so the page clears AA whatever colour the
      // photo produced.
      const color = accessibleAccent(safeColor(s.color));
      const spotify = typeof s.spotify === "string" ? s.spotify : "";
      const ink = inkFor(color);
      return {
        ...s,
        slug: s.slug || slugify(s.title),
        note: typeof s.note === "string" ? s.note : "",
        album: typeof s.album === "string" ? s.album : "",
        spotify,
        preview: typeof s.preview === "string" ? s.preview : "",
        credit: typeof s.credit === "string" ? s.credit : "",
        color,
        ink,
        inkMuted: mutedInkFor(color, ink),
      };
    })
    .sort((a, b) => b.order - a.order);

  const seen = new Set<string>();
  for (const s of songs) {
    if (seen.has(s.slug)) {
      throw new Error(
        `Duplicate /songs slug "${s.slug}" (from "${s.title}") — two songs produce the same URL. Set an explicit \`slug\` on one of them.`,
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
