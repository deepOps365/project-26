import type { NextConfig } from "next";

// Static export: the whole game is client-side (local-first), so it can be hosted
// on any static host (Netlify/Vercel/GitHub Pages) or served from a laptop on the LAN.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: basePath || undefined,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
