// Import the type for React's children prop
import type { ReactNode } from "react";
// Import the shared Header component (logo, search bar, location pill, login button)
import { Header } from "@/components/ui/Header";

// Define the layout component that wraps every page inside the (main) route group
export default function MainLayout({ children }: { children: ReactNode }) {
  // Render the shared header above whatever page content is nested inside
  return (
    // A wrapper with no extra styling beyond a minimum height, so individual pages control their own layout
    <div className="min-h-screen bg-neutral-50">
      {/* The persistent header shown across the whole "main" part of the app */}
      <Header />
      {/* Render the actual page (home feed, search results, listing detail, sell flow, etc.) */}
      <main>{children}</main>
    </div>
  );
}

// NOTE: This (main) route group is a placeholder for future pages — e.g. (main)/search,
// (main)/listing/[id], (main)/sell, (main)/my-listings, (main)/wishlist, (main)/messages.
// The actual home page currently lives at the project root (app/page.tsx) for simplicity;
// it can be moved into this group later if you want it to share this exact layout/header.
