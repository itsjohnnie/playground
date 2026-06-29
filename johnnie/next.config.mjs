/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export — deploys for free on Cloudflare Pages (or any static host).
  output: "export",
  // We self-host all assets and use plain <img>, so Next's image optimizer is unused.
  images: { unoptimized: true },
  // Emit /about/ style folders so it works cleanly on static hosts.
  trailingSlash: true,
};

export default nextConfig;
