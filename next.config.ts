import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // ── Image optimisation ──────────────────────────────────────────────────
  images: {
    // Auto-convert to WebP/AVIF — massive file size reduction
    formats: ["image/avif", "image/webp"],
    // Cache optimised images for 1 week
    minimumCacheTTL: 604800,
    // Allow Supabase storage images to be optimised
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
    ],
  },

  // ── Compiler ────────────────────────────────────────────────────────────
  compiler: {
    // Strip console.log in production
    removeConsole: process.env.NODE_ENV === "production",
  },

  // ── External Packages ───────────────────────────────────────────────────
  // Moved out of 'experimental' for Next.js 15+
  serverExternalPackages: ["meilisearch"],

  // ── Headers — aggressive caching for static assets ──────────────────────
  async headers() {
    return [
      {
        // Cache all static files (JS, CSS, fonts, images) for 1 year
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Cache listing photos and uploads for 1 week
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },

  // ── Experimental ────────────────────────────────────────────────────────
  experimental: {
    // Optimise CSS — removes unused styles
    optimizeCss: true,
  },
};

export default nextConfig;