// Prefixes a root-absolute asset path with the configured base path so the
// site works both at a domain root (johnnies.life) and under a subdirectory
// (e.g. GitHub Pages: /playground/johnnie). See next.config.mjs.
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function asset(path: string): string {
  if (!path) return path;
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path; // external/absolute
  return `${BASE_PATH}${path}`;
}
