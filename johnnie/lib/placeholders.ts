import path from "node:path";
import sharp from "sharp";

// Build-time LQIP: sample each photo down to a COLS×ROWS colour grid and turn
// it into a stack of CSS radial-gradients (one soft blob per sample point over
// an average-colour base). The result reads like a heavily blurred version of
// the image, costs ~300 bytes of markup, and paints before a single image byte
// arrives — the real photo then blur-up fades in over it.
//
// This runs only during `next build` / SSR (sharp is a Node module); the
// static export ships pure CSS, no client JS.
const COLS = 3;
const ROWS = 2;

// Memoised per image path — dev-mode re-renders and the export's second pass
// reuse the same promise instead of re-decoding megabyte-scale sources.
const cache = new Map<string, Promise<string>>();

export function gradientPlaceholder(publicPath: string): Promise<string> {
  let p = cache.get(publicPath);
  if (!p) {
    // Any failure (missing file, undecodable format) degrades to "" — the
    // caller omits the inline style and the flat CSS tint stays.
    p = compute(publicPath).catch(() => "");
    cache.set(publicPath, p);
  }
  return p;
}

function hex(r: number, g: number, b: number): string {
  return (
    "#" +
    r.toString(16).padStart(2, "0") +
    g.toString(16).padStart(2, "0") +
    b.toString(16).padStart(2, "0")
  );
}

async function compute(publicPath: string): Promise<string> {
  const file = path.join(process.cwd(), "public", publicPath);
  const { data, info } = await sharp(file)
    .resize(COLS, ROWS, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const layers: string[] = [];
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = (row * COLS + col) * info.channels;
      const c = hex(data[i], data[i + 1], data[i + 2]);
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
      const x = Math.round(((col + 0.5) / COLS) * 100);
      const y = Math.round(((row + 0.5) / ROWS) * 100);
      // Fade each blob to ITS OWN colour at alpha 0 (not `transparent`, which
      // is transparent BLACK and muddies the midpoints grey).
      layers.push(`radial-gradient(at ${x}% ${y}%, ${c}, ${c}00 72%)`);
    }
  }

  const n = COLS * ROWS;
  const avg = hex(
    Math.round(sumR / n),
    Math.round(sumG / n),
    Math.round(sumB / n),
  );
  // Bottom layer: solid average colour, so the blobs' transparent edges never
  // expose the page background.
  layers.push(`linear-gradient(${avg}, ${avg})`);
  return layers.join(",");
}
