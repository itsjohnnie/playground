#!/usr/bin/env node
/**
 * Vendors the Twemoji SVG for every badge in public/badge/badges.json.
 *
 * The badge page renders each emoji from a local SVG at
 * /badge/lib/twemoji/<codepoints>.svg — the site self-hosts everything, so a
 * badge added in the CMS needs its glyph fetched once. This runs as
 * `prebuild` (and as the badge bot in the deploy workflow), sees which
 * glyphs are missing, and downloads them from a pinned Twemoji release.
 * When the roster is already fully vendored it does nothing and never
 * touches the network.
 *
 * A glyph that can't be fetched WARNS but does not fail the build: the page
 * skips badges whose glyph 404s, and a bad emoji in the CMS must not brick
 * the whole deploy.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const TWEMOJI_TAG = 'v17.0.3'; // jdecked/twemoji release the glyphs come from

const rosterUrl = new URL('../public/badge/badges.json', import.meta.url);
const glyphDir = new URL('../public/badge/lib/twemoji/', import.meta.url);

// Must match glyphUrl() in public/badge/index.html exactly.
const glyphName = (emoji) =>
  [...emoji].map((c) => c.codePointAt(0).toString(16)).join('-');

async function tryFetch(url, headers = {}) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const body = await res.text();
    // an error page saved as .svg would poison the badge forever
    return body.includes('<svg') ? body : null;
  } catch {
    return null; // network failure — the caller tries the next source
  }
}

async function fetchGlyph(name) {
  // Twemoji drops fe0f (VS16) from most filenames; the page requests the
  // exact sequence, so try that first and fall back to the stripped name —
  // but always save under the exact name the page will ask for.
  const candidates = [name];
  const stripped = name.split('-').filter((s) => s !== 'fe0f').join('-');
  if (stripped && stripped !== name) candidates.push(stripped);

  for (const c of candidates) {
    const svg =
      (await tryFetch(
        `https://cdn.jsdelivr.net/gh/jdecked/twemoji@${TWEMOJI_TAG}/assets/svg/${c}.svg`
      )) ??
      (await tryFetch(
        `https://api.github.com/repos/jdecked/twemoji/contents/assets/svg/${c}.svg?ref=${TWEMOJI_TAG}`,
        { 'user-agent': 'johnnies-life-badge-bot', accept: 'application/vnd.github.raw+json' }
      ));
    if (svg) return svg;
  }
  return null;
}

// A broken roster must not brick the deploy either: the page catches its own
// fetch/parse failures, so warn and ship the rest of the site.
let badges = [];
try {
  badges = JSON.parse(readFileSync(rosterUrl, 'utf8')).badges;
  if (!Array.isArray(badges)) throw new Error('no badges array');
} catch (e) {
  console.warn(`::warning::badges.json is broken (${e.message}) — no glyphs vendored`);
  badges = [];
}
let fetched = 0;
let failed = 0;

for (const entry of badges) {
  const emoji = typeof entry?.emoji === 'string' ? entry.emoji.trim() : '';
  const label = entry?.label ?? '?';
  const name = glyphName(emoji);
  if (!emoji || !/^[0-9a-f]+(-[0-9a-f]+)*$/.test(name)) {
    console.warn(`::warning::badge "${label}": not an emoji (${JSON.stringify(entry?.emoji)}) — skipped`);
    failed++;
    continue;
  }
  const file = new URL(`${name}.svg`, glyphDir);
  if (existsSync(file)) continue;

  const svg = await fetchGlyph(name);
  if (svg) {
    writeFileSync(file, svg);
    console.log(`vendored ${name}.svg (${label})`);
    fetched++;
  } else {
    console.warn(
      `::warning::badge "${label}" (${name}): no Twemoji glyph found — the page will skip it`
    );
    failed++;
  }
}

console.log(
  `badges: ${badges.length} in the case, ${fetched} glyph${fetched === 1 ? '' : 's'} vendored, ${failed} missing`
);
