import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
// Import the global stylesheet (includes Tailwind base/components/utilities)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import "./globals.css";
// Import the provider that tracks the logged-in user/profile across the whole app
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import { UserProvider } from "@/components/providers/UserProvider";
// Import the provider that tracks the active browsing location across the whole app
import { LocationProvider } from "@/components/providers/LocationProvider";
import { LocationPrompt } from "@/components/location/LocationPrompt";

/**
 * THE APP'S TYPEFACE.
 *
 * Why this exists at all: the site used to run on the system stack
 * (-apple-system / BlinkMacSystemFont / Segoe UI / Roboto). Every one of those
 * resolves to a font the DEVICE picks — and Samsung, OnePlus, Xiaomi and others
 * all ship a system-wide font picker. A user who set their phone to a rounded
 * display font got that font on this site, at every weight, with all our tracking
 * applied to letterforms it was never designed for. The design simply wasn't ours
 * to control.
 *
 * Figtree is a geometric sans with a true 900 weight (many of the obvious
 * alternatives — Manrope, Plus Jakarta Sans — stop at 800, and this design leans
 * on 900 everywhere). Variable, so all weights arrive in one file.
 *
 * The woff2 is vendored at app/fonts/ and loaded via next/font/local.
 *
 * On the "instant loading" trade-off: this is served from our own origin, hashed
 * and preloaded by Next. No request to Google, no extra DNS lookup, no
 * render-blocking stylesheet. Next emits a metric-matched local fallback (via
 * size-adjust) so the swap doesn't shift layout. Cost is one ~40KB woff2 on
 * first visit, immutably cached after.
 *
 * To change the typeface, change the import and this call — nothing else refers
 * to a font name anywhere.
 */
const figtree = localFont({
  // The woff2 lives in the repo (app/fonts/), NOT fetched from Google at build
  // time. next/font/google would need fonts.gstatic.com reachable on every
  // build — including CI — and a network blip would fail the deploy. This file
  // is 40KB, versioned with the code, and builds offline.
  src: "./fonts/figtree-latin-wght-normal.woff2",
  // One variable file covering the whole range, so every weight we use (400 to
  // 900) comes from a single request.
  weight: "300 900",
  style: "normal",
  // swap: show the fallback immediately, upgrade when the font lands. Never
  // hides text waiting for a download.
  display: "swap",
  variable: "--font-sans",
  // Metric-matched fallback so the swap doesn't shift the layout
  adjustFontFallback: "Arial",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
});

// Configure the HTML <meta name="viewport"> tag — critical for correct mobile rendering
export const viewport: Viewport = {
  // Fill the device's full CSS pixel width at 100% scale
  width: "device-width",
  initialScale: 1,
  // viewportFit=cover: extend layout under the notch/home-indicator on notched iPhones.
  // Required for env(safe-area-inset-*) to work correctly.
  viewportFit: "cover",
  // interactiveWidget=resizes-visual: when the virtual keyboard or browser chrome
  // (URL bar) appears/disappears, only the VISUAL viewport changes — the layout
  // viewport stays fixed. This prevents position:fixed elements and svh-based heights
  // from recalculating, eliminating the "jump" on all pages when the URL bar hides.
  // Supported in Chrome 108+, Safari 15.4+, Firefox 101+.
  interactiveWidget: "resizes-visual",
  // Color the browser chrome on Android Chrome / iOS Safari to match the app's orange brand
  themeColor: "#FFFFFF",
};

// Root-level metadata — every page's title gets " | Marketplace" appended via the template
export const metadata: Metadata = {
  title: {
    // Shown on the home page (no page-level title override)
    default: "Marketplace — Buy, sell & rent near you",
    // Applied as a suffix when individual pages export their own title
    template: "%s | Marketplace",
  },
  // Default meta description (overridden by individual pages that export their own)
  description: "A hyperlocal marketplace for second-hand goods, new items, vehicles, and rentals near you.",
  // Open Graph defaults — overridden per-page (e.g., listing detail with cover photo)
  openGraph: {
    siteName: "Marketplace",
    type: "website",
  },
  // Tell search engines to index public pages and follow links
  robots: "index, follow",
};

// Define and export the root layout component — every page renders inside this
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Set the document language for accessibility and SEO
    <html lang="en" className={figtree.variable}>
      {/* suppressHydrationWarning prevents a false mismatch warning from browser extensions
          that modify the DOM (e.g., password managers, translation extensions) */}
      <body suppressHydrationWarning className="bg-neutral-50">
        {/* NavigationProgress uses useSearchParams — must be in Suspense */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {/* UserProvider tracks the logged-in user/profile in React Context */}
        <UserProvider>
          {/* LocationProvider tracks the active location (default + browsing) in React Context */}
          <LocationProvider>
            {/* First-visit prompt asking the user to enable location */}
            <LocationPrompt />
            {/* The active page/layout rendered here */}
            {children}
          </LocationProvider>
        </UserProvider>
      </body>
    </html>
  );
}