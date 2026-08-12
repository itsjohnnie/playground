#!/usr/bin/env node
/**
 * Builds the badge case: compiles content/badges/*.json (one file per
 * badge — the CMS's "Badges" collection) into public/badge/badges.json,
 * the single roster the /badge/ page fetches, then vendors the Twemoji
 * SVG each badge is struck from.
 *
 * Badges are sorted by their `number` — the № engraved on the back.
 * Numbers are permanent: never reuse one. Gaps are fine (a deleted badge
 * just retires its number); a duplicate is warned about loudly but kept,
 * so the mistake is visible on the pins rather than silently dropped.
 *
 * The site self-hosts everything, so a badge added in the CMS needs its
 * glyph fetched once, from a pinned Twemoji release. This runs as
 * `prebuild` (and as the badge bot in the deploy workflow, which commits
 * the results back). When nothing changed it rewrites the same bytes and
 * never touches the network.
 *
 * Nothing here fails the build: a bad entry warns and is skipped — the
 * page must keep working no matter what the CMS or a hand edit produced.
 */
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';

const TWEMOJI_TAG = 'v17.0.3'; // jdecked/twemoji release the glyphs come from

const contentDir = new URL('../content/badges/', import.meta.url);
const rosterUrl = new URL('../public/badge/badges.json', import.meta.url);
const glyphDir = new URL('../public/badge/lib/twemoji/', import.meta.url);

// Must match glyphUrl() in public/badge/index.html exactly.
const glyphName = (emoji) =>
  [...emoji].map((c) => c.codePointAt(0).toString(16)).join('-');

/* ------------------------- compile the roster ------------------------- */

const badges = [];
// existsSync guard: an emptied content/badges/ vanishes from a fresh git
// checkout, and a missing folder must not brick the build. The filename
// sort only makes duplicate-№ warnings deterministic across filesystems.
const files = existsSync(contentDir) ? readdirSync(contentDir) : [];
for (const f of files.filter((f) => f.endsWith('.json')).sort()) {
  let entry;
  try {
    entry = JSON.parse(readFileSync(new URL(f, contentDir), 'utf8'));
  } catch (e) {
    console.warn(`::warning::content/badges/${f} is broken (${e.message}) — skipped`);
    continue;
  }
  const number = Number(entry?.number);
  const emoji = typeof entry?.emoji === 'string' ? entry.emoji.trim() : '';
  if (!Number.isInteger(number) || number < 1 || !emoji) {
    console.warn(`::warning::content/badges/${f}: needs a whole number ≥ 1 and an emoji — skipped`);
    continue;
  }
  const badge = { number, emoji, label: String(entry.label ?? '') };
  if (entry.earned != null) {
    const earned = Number(entry.earned);
    if (Number.isFinite(earned) && typeof entry.earned !== 'boolean') badge.earned = earned;
    else console.warn(`::warning::content/badges/${f}: earned ${JSON.stringify(entry.earned)} is not a number — ignored`);
  }
  badges.push(badge);
}
badges.sort((a, b) => a.number - b.number);
for (let i = 1; i < badges.length; i++) {
  if (badges[i].number === badges[i - 1].number)
    console.warn(
      `::warning::badge № ${badges[i].number} is used twice ("${badges[i - 1].label}" and "${badges[i].label}") — both kept; give one the next free number`
    );
}
writeFileSync(rosterUrl, JSON.stringify({ badges }, null, 2) + '\n');

/* ------------------------- vendor the glyphs -------------------------- */

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

let fetched = 0;
let failed = 0;

for (const { emoji, label } of badges) {
  const name = glyphName(emoji);
  if (!/^[0-9a-f]+(-[0-9a-f]+)*$/.test(name)) {
    console.warn(`::warning::badge "${label}": not an emoji (${JSON.stringify(emoji)}) — the page will skip it`);
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
