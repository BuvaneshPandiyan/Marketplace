// Force dynamic rendering for every page — auth state requires request-time cookies
export const dynamic = "force-dynamic";

// Import Next.js's Metadata and Viewport types for type-safe head configuration
import type { Metadata, Viewport } from "next";
// Import the global stylesheet (includes Tailwind base/components/utilities)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import "./globals.css";
// Import the provider that tracks the logged-in user/profile across the whole app
import { UserProvider } from "@/components/providers/UserProvider";
// Import the provider that tracks the active browsing location across the whole app
import { LocationProvider } from "@/components/providers/LocationProvider";

// Configure the HTML <meta name="viewport"> tag — critical for correct mobile rendering
export const viewport: Viewport = {
  // Fill the device's full CSS pixel width at 100% scale
  width: "device-width",
  initialScale: 1,
  // Color the browser chrome on Android Chrome / iOS Safari to match the app's orange brand
  themeColor: "#ea580c",
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
    <html lang="en">
      {/* suppressHydrationWarning prevents a false mismatch warning from browser extensions
          that modify the DOM (e.g., password managers, translation extensions) */}
      <body suppressHydrationWarning className="bg-neutral-50">
        {/* UserProvider tracks the logged-in user/profile in React Context */}
        <UserProvider>
          {/* LocationProvider tracks the active location (default + browsing) in React Context */}
          <LocationProvider>
            {/* The active page/layout rendered here */}
            {children}
          </LocationProvider>
        </UserProvider>
      </body>
    </html>
  );
}