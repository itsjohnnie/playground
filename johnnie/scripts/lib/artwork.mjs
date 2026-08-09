// Bringing a photo into the section: resize it, convert it to webp, put it
// in public/songs, and sample an accent colour off it.
//
// The images here are hand-picked photographs of the artists, not album
// covers, so nothing fetches them automatically — a human chooses each one
// and passes it in.

import fs from "node:fs/promises";
import path from "node:path";

let sharp = null;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  /* optional — see the fallbacks below */
}

export const hasSharp = () => Boolean(sharp);

// Average the image, then push the result somewhere usable: a flat mean tends
// to come out muddy, so saturation gets a nudge and lightness is clamped away
// from both extremes. lib/content.ts then picks black or white ink for
// whatever this lands on, so the page stays readable either way.
function accentFrom(pixels) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; n++;
  }
  if (!n) return "#fafafa";
  [r, g, b] = [r / n / 255, g / n / 255, b / n / 255];

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  s = Math.min(1, s * 1.35);
  const L = Math.min(0.82, Math.max(0.28, l));

  const c = (1 - Math.abs(2 * L - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [rr, gg, bb] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${hex(rr)}${hex(gg)}${hex(bb)}`;
}

async function read(source) {
  if (/^https?:\/\//i.test(source)) {
    const res = await fetch(source, { headers: { "user-agent": "a-song-a-day/1.0" } });
    if (!res.ok) throw new Error(`couldn't fetch the image (HTTP ${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(path.resolve(source));
}

// Returns { image, color } — the site-relative path and a sampled accent.
// `source` is a local file path or a URL. With `dry`, the colour is still
// sampled (it's the useful half of the preview) but nothing is written.
export async function importArtwork(source, destDir, base, dry = false) {
  const buf = await read(source);
  if (!dry) await fs.mkdir(destDir, { recursive: true });

  if (!sharp) {
    // Keep the original bytes and its extension rather than mislabelling a
    // JPEG as .webp.
    const ext = (path.extname(source.split("?")[0]) || ".jpg").toLowerCase();
    if (!dry) await fs.writeFile(path.join(destDir, `${base}${ext}`), buf);
    return { image: `/songs/${base}${ext}`, color: "#fafafa", optimised: false };
  }

  // 640 square: enough for a full-bleed phone hero, small enough that a
  // thousand of them don't bloat the repo. One file serves the grid and the
  // song page both.
  if (!dry) {
    await sharp(buf)
      .resize(640, 640, { fit: "cover", position: "attention" })
      .webp({ quality: 80 })
      .toFile(path.join(destDir, `${base}.webp`));
  }

  const { data } = await sharp(buf)
    .resize(32, 32, { fit: "cover" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return { image: `/songs/${base}.webp`, color: accentFrom(data), optimised: true };
}
