#!/usr/bin/env node
// Fills in the `preview` field for songs that don't have one yet.
//
//   node scripts/find-previews.mjs [--all] [--dry-run]
//
// Looks each song up on Apple's public iTunes Search API and records the URL
// of its 30-second preview clip — the thing that lets a visitor hear the song
// without an account anywhere. Songs that already have a `preview` are left
// alone unless --all is passed.
//
// A song with no confident match simply gets `preview: ""`. The site falls
// back to the "Open in Spotify" link for those, which is the honest outcome:
// better silence than 30 seconds of the wrong song.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolvePreview } from "./lib/preview.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(ROOT, "content", "songs");

const argv = process.argv.slice(2);
const ALL = argv.includes("--all");
const DRY = argv.includes("--dry-run");

const field = (text, key) =>
  (text.match(new RegExp(`^${key}: "(.*)"$`, "m")) || [, ""])[1];

const files = (await fs.readdir(CONTENT)).filter((f) => f.endsWith(".md")).sort();

let found = 0;
let missing = 0;
let skipped = 0;
const noMatch = [];
const variants = [];

for (const file of files) {
  const full = path.join(CONTENT, file);
  let text = await fs.readFile(full, "utf8");

  const has = /^preview: "(.+)"$/m.test(text);
  if (has && !ALL) {
    skipped++;
    continue;
  }

  const title = field(text, "title");
  const artist = field(text, "artist");
  const album = field(text, "album");

  let hit = null;
  try {
    hit = await resolvePreview(title, artist, album, field(text, "spotify"));
  } catch (err) {
    console.error(`\n✗ ${err.message}`);
    console.error("  Stopping here — rerun in a minute to pick up where this left off.\n");
    break;
  }

  if (hit) {
    found++;
    console.log(`✓ ${title} — ${artist}`);
    console.log(`    ${hit.matched}  [${hit.source}]${hit.variant ? "   ⚠ variant recording" : ""}`);
    if (hit.variant) variants.push(`${title} — ${hit.matched}`);
  } else {
    missing++;
    noMatch.push(`${title} — ${artist}`);
    console.log(`· ${title} — ${artist} (no confident match)`);
  }

  const line = `preview: "${hit ? hit.url : ""}"`;
  text = /^preview: ".*"$/m.test(text)
    ? text.replace(/^preview: ".*"$/m, line)
    : // Sits right after `spotify:` so the two playback fields stay together.
      text.replace(/^(spotify: ".*")$/m, `$1\n${line}`);

  if (!DRY) await fs.writeFile(full, text);
}

console.log(
  `\n${DRY ? "Would set" : "Set"} ${found} preview${found === 1 ? "" : "s"}` +
    `, ${missing} with no confident match` +
    (skipped ? `, ${skipped} already had one` : "") +
    ".",
);
if (variants.length) {
  console.log(`\n⚠ Matched a variant recording (check these):`);
  for (const v of variants) console.log(`  ${v}`);
}
if (noMatch.length) {
  console.log(`\nNo preview — these fall back to the Spotify link:`);
  for (const n of noMatch) console.log(`  ${n}`);
}
console.log("");
