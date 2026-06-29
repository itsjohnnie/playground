/** @type {import('next').NextConfig} */

// Base path for subdirectory hosting (e.g. GitHub Pages project site at
// /playground/johnnie). Leave empty for root hosting (e.g. johnnies.life on
// Cloudflare). Set via PAGES_BASE_PATH at build time.
const basePath = process.env.PAGES_BASE_PATH || "";

const nextConfig = {
  // Static HTML export — deploys for free on GitHub Pages or Cloudflare Pages.
  output: "export",
  // We self-host all assets and use plain <img>, so Next's optimizer is unused.
  images: { unoptimized: true },
  // Emit /about/ style folders so it works cleanly on static hosts.
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  // Exposed to the client so hard-coded asset URLs can be prefixed too.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
