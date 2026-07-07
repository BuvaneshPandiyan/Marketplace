// Import Next.js's config type so we get type-checking on the config object below
import type { NextConfig } from "next";
// Import the helper that lets `next dev` access Cloudflare bindings (env vars, KV, R2, etc.)
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Call this so local development can read Cloudflare-specific bindings the same way production does
initOpenNextCloudflareForDev();

// Define the Next.js configuration object — left mostly default for this MVP scaffold
const nextConfig: NextConfig = {
  // No custom overrides needed yet; add image domains, redirects, etc. here as the app grows
};

// Export the config so Next.js picks it up automatically
export default nextConfig;
