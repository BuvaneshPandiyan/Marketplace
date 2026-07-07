// Import the helper that builds an OpenNext config tailored for Cloudflare deployments
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Export the Cloudflare-specific OpenNext config — defaults are sensible for an MVP,
// so we don't override incremental cache / queue / tag cache behavior yet.
export default defineCloudflareConfig();
