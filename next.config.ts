import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

// ── Security headers ────────────────────────────────────────────────────────
// Applied to every response (see headers() below). These are the low-risk,
// high-value hardening headers: clickjacking, MIME-sniffing, referrer leakage,
// browser feature access, and HTTPS enforcement.
const securityHeaders = [
  // Block this site from being framed by other origins (clickjacking defence).
  // Use "DENY" if you never embed the app in an iframe even on your own origin.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Stop browsers from MIME-sniffing a response away from its declared type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send only the origin (not the full URL, which can carry listing IDs or search
  // terms) to third parties such as the map-tile CDN.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Allow only the browser features the app actually uses, on its own origin.
  // camera + geolocation are needed for photo capture and "use current location".
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=(), payment=(), usb=()",
  },
  // Force HTTPS for two years, including subdomains. Cloudflare may also manage
  // this; setting it here is harmless belt-and-suspenders. "preload" is left off
  // deliberately — it's a hard-to-reverse commitment to opt into on purpose.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// ── Content-Security-Policy (REPORT-ONLY) ────────────────────────────────────
// Shipped in report-only mode on purpose: it does NOT block anything, it only
// reports violations to the browser console (and to a report endpoint if you add
// one). Watch for violations in production, widen the allowlists if something
// legitimate is flagged, and only THEN rename the header below to
// "Content-Security-Policy" to actually enforce it.
//
// Allowlists reflect what the app actually talks to:
//   Supabase (REST + realtime WebSocket), CARTO map tiles, Google/FCM for push,
//   gstatic for the Firebase messaging service worker; fonts are self-hosted.
//
// NOTE: script-src still needs 'unsafe-inline'/'unsafe-eval' because Next.js
// hydration uses inline scripts. For real XSS protection when you enforce this,
// move to a nonce-based script-src (via middleware) and drop those two tokens.
const contentSecurityPolicyReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://*.basemaps.cartocdn.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob: https://*.supabase.co",
  "manifest-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in wss://*.supabase.in https://*.googleapis.com https://www.gstatic.com",
].join("; ");

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
    // In production, strip noisy console.* calls (log/info/debug) to keep the
    // bundle clean — but KEEP console.error and console.warn. Those carry our
    // server-side diagnostics (audit-log write failures, cron errors, storage
    // cleanup failures, OTP/rate-limit warnings) that we rely on in Cloudflare
    // logs. `removeConsole: true` would have removed those too, silencing exactly
    // the failures they exist to surface. In development we strip nothing.
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // ── Headers — security on every response, plus aggressive asset caching ──
  async headers() {
    return [
      {
        // Security + report-only CSP on every route, including static assets
        // (harmless there) and API routes.
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicyReportOnly,
          },
        ],
      },
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

  // Meilisearch is server-only — keep it out of the client bundle
  serverExternalPackages: ["meilisearch"],
};

export default nextConfig;