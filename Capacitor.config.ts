import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for bazar.in.
 *
 * WHY THIS LOADS A REMOTE URL INSTEAD OF BUNDLED FILES
 * The usual Capacitor setup bundles a folder of static HTML/JS into the app.
 * This app cannot do that: it has 16 API routes, middleware, and 15 files using
 * the Supabase *server* client. All of that needs a running server, and there
 * is no Node process inside a phone. `next build && next export` would simply
 * fail.
 *
 * So the native app is a shell around the live deployment. Rendering keeps
 * happening on the server exactly as it does in a browser, and the app is a
 * native window onto it.
 *
 * What that buys us:
 *   • Everything already works — auth, chat, realtime, caching, RLS.
 *   • Shipping a web fix updates the app instantly, with no store review.
 *     A store submission is only needed when native code or plugins change.
 *
 * What it costs:
 *   • No offline mode. Reasonable for a marketplace, which is useless without
 *     live listings anyway.
 *   • Apple rejects apps that are only a website in a wrapper (guideline 4.2),
 *     which is why the native camera, geolocation and push integrations below
 *     are not optional extras — they are what makes this a real app.
 */
const config: CapacitorConfig = {
  // Reverse-domain identifier. PERMANENT once published — the stores key the
  // app to this string, and changing it later means shipping a brand new app.
  appId: "in.bazar.app",
  appName: "bazar.in",

  // Required by the CLI even when loading a remote URL. Nothing is served from
  // here; it just needs to exist so `npx cap sync` doesn't complain.
  webDir: "public",

  server: {
    // ── The one line that matters ──
    // Point this at your deployed site. It must be HTTPS: Android blocks
    // cleartext by default, and the camera and geolocation APIs refuse to run
    // on an insecure origin, which would break listing creation.
    url: "https://marketplace-lilac-nu.vercel.app",
    cleartext: false,
  },

  plugins: {
    SplashScreen: {
      // The site takes a moment to load over the network; without a splash the
      // app opens on a white rectangle and looks broken.
      launchShowDuration: 2000,
      backgroundColor: "#0e3d47",
      showSpinner: false,
      androidSplashResourceName: "splash",
    },
    PushNotifications: {
      // Ask the OS for a token on launch. The in-app prompt still controls when
      // the user is actually asked for permission.
      presentationOptions: ["badge", "sound", "alert"],
    },
  },

  android: {
    // Lets the WebView reach the camera and file picker for listing photos.
    allowMixedContent: false,
  },

  ios: {
    // Matches the app's own background so there is no white flash on scroll
    // bounce, which is very obvious against the dark chat header.
    backgroundColor: "#0e3d47",
    contentInset: "always",
  },
};

export default config;