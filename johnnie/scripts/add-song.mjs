#!/usr/bin/env node
// Add one song to A Song a Day®.
//
//   node scripts/add-song.mjs "Woods" "Mac Miller" --image ~/Desktop/mac.jpg
//   node scripts/add-song.mjs --title "Woods" --artist "Mac Miller" \
//        --spotify https://open.spotify.com/track/3Qa9... \
//        --image https://example.com/photo.jpg --credit "Photo: Some One"
//
// Everything optional is worked out for you: the next number in the run,
// the URL slug, today's date, the album (looked up), a 30-second preview
// clip (looked up, and only accepted if it's confidently the right
// recording), and the page's accent colour (sampled from the photo).
//
// This is the thing to reach for from Claude Code — "add this song" — which
// is why it prints a short summary at the end and fails loudly rather than
// writing something half-formed.
//
// Options:
//   --title, --artist        Required (or pass them positionally).
//   --album                  Defaults to whatever the lookup finds.
//   --spotify <url>          Link to the full track.
//   --image <path|url>       The photo. Resized to 640² webp into public/songs.
//   --credit "Photo: …"      Where the photo came from — shown on the page.
//   --note "…"               Replaces the automatic one-line description.
//   --date YYYY-MM-DD        Defaults to today.
//   --color "#aabbcc"        Overrides the sampled accent.
//   --no-preview             Skip the preview lookup.
//   --dry-run                Print what would be written; write nothing.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePreview } from "./lib/preview.mjs";
import { importArtwork, hasSharp } from "./lib/artwork.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(ROOT, "content", "songs");
const ART = path.join(ROOT, "public", "songs");

const die = (msg) => {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
};

// ------------------------------------------------------------------ args

const argv = process.argv.slice(2);
const opts = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) {
    const key = a.slice(2);
    if (key === "dry-run" || key === "no-preview") opts[key] = true;
    else opts[key] = argv[++i];
  } else positional.push(a);
}

const title = (opts.title || positional[0] || "").trim();
const artist = (opts.artist || positional[1] || "").trim();
const DRY = Boolean(opts["dry-run"]);

if (!title || !artist) {
  die(
    'Need a title and an artist.\n' +
      '  node scripts/add-song.mjs "Woods" "Mac Miller" --image ./mac.jpg',
  );
}

// Mirrors lib/slugify.ts, so the file's slug and the site's URL agree.
const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const yaml = (v) => `"${String(v ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

// ------------------------------------------------- where it lands in the run

await fs.mkdir(CONTENT, { recursive: true });
const files = (await fs.readdir(CONTENT)).filter((f) => f.endsWith(".md"));

let highest = 0;
const usedSlugs = new Set();
for (const file of files) {
  const text = await fs.readFile(path.join(CONTENT, file), "utf8");
  const get = (k) => (text.match(new RegExp(`^${k}: "(.*)"$`, "m")) || [, ""])[1];
  highest = Math.max(highest, Number((text.match(/^order: (\d+)$/m) || [, 0])[1]));
  usedSlugs.add(get("slug") || slugify(get("title")));
  // Adding the same song twice is a mistake worth catching, not a feature.
  if (get("title").toLowerCase() === title.toLowerCase() &&
      get("artist").toLowerCase() === artist.toLowerCase()) {
    die(`"${title}" by ${artist} is already song ${get("order") || "?"} (${file}).`);
  }
}

const order = highest + 1;
let slug = slugify(title);
if (usedSlugs.has(slug)) slug = slugify(`${title} ${artist}`);
let unique = slug;
for (let n = 2; usedSlugs.has(unique); n++) unique = `${slug}-${n}`;
const explicitSlug = unique === slugify(title) ? "" : unique;
const base = `${String(order).padStart(2, "0")}-${unique}`;

console.log(`\nA Song a Day — adding #${order}: ${title} — ${artist}\n`);

// ------------------------------------------------------ lookup + artwork

let album = opts.album || "";
let preview = "";

if (!opts["no-preview"]) {
  process.stdout.write("  looking for a 30-second preview… ");
  try {
    const hit = await resolvePreview(title, artist, album, opts.spotify);
    if (hit) {
      preview = hit.url;
      console.log(
        `found (${hit.source})\n    ${hit.matched}` +
          (hit.variant ? "  ⚠ variant recording" : ""),
      );
    } else {
      console.log("none confidently matched (the page will link to Spotify instead)");
    }
  } catch (err) {
    console.log(`skipped — ${err.message}`);
  }
}

let image = "";
let color = opts.color || "#fafafa";
if (opts.image) {
  process.stdout.write("  importing the photo… ");
  try {
    const art = await importArtwork(opts.image, ART, base, DRY);
    image = art.image;
    if (!opts.color) color = art.color;
    console.log(
      art.optimised
        ? `${art.image} (640², accent ${color})`
        : `${art.image} (unoptimised — \`npm i -D sharp\` for resizing + colour)`,
    );
  } catch (err) {
    die(`couldn't import the photo: ${err.message}`);
  }
} else {
  console.log("  no photo given — add one later in /admin/ or with --image");
}

// ----------------------------------------------------------------- write

const today = new Date().toISOString().slice(0, 10);
const body = [
  "---",
  `order: ${order}`,
  ...(explicitSlug ? [`slug: ${yaml(explicitSlug)}`] : []),
  `title: ${yaml(title)}`,
  `artist: ${yaml(artist)}`,
  `album: ${yaml(album)}`,
  `date: ${yaml(opts.date || today)}`,
  `color: ${yaml(color)}`,
  `image: ${yaml(image)}`,
  `spotify: ${yaml(opts.spotify || "")}`,
  `preview: ${yaml(preview)}`,
  `credit: ${yaml(opts.credit || "")}`,
  `note: ${yaml(opts.note || "")}`,
  "---",
  "",
].join("\n");

const dest = path.join(CONTENT, `${base}.md`);
if (!DRY) await fs.writeFile(dest, body);

console.log(`\n${DRY ? "Would write" : "Wrote"} content/songs/${base}.md`);
console.log(`  URL: /songs/${unique}/`);
if (DRY) console.log(`\n${body}`);

const gaps = [];
if (!image) gaps.push("a photo");
if (!opts.spotify) gaps.push("a Spotify link");
if (!preview) gaps.push("a preview clip (none matched)");
if (gaps.length) console.log(`\n  Still missing: ${gaps.join(", ")}.`);
if (!hasSharp() && opts.image) {
  console.log("  Install sharp (`npm i -D sharp`) to resize photos and sample colours.");
}
console.log("");
