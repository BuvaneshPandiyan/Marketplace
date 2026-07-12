// Import the type for React's children prop
import type { ReactNode } from "react";
// Import the shared Header component (logo, search bar, location pill, login button)
import { Header } from "@/components/ui/Header";

// Define the layout component that wraps every page inside the (main) route group
export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Header />
      {/*
        Desktop: pill header floats 10px from top ~56px tall → padding-top: 72px
        Mobile:  mini top bar ~52px + bottom pill nav ~80px
      */}
      <main>
        <style>{`
          main { padding-top: 76px; }
          @media(max-width:639px){
            main { padding-top: 0 !important; padding-bottom: calc(88px + env(safe-area-inset-bottom)); overflow-x: hidden; }
            body { overflow-x: hidden; }
          }
        `}</style>
        {children}
      </main>
    </div>
  );
}

// NOTE: This (main) route group is a placeholder for future pages — e.g. (main)/search,
// (main)/listing/[id], (main)/sell, (main)/my-listings, (main)/wishlist, (main)/messages.
// The actual home page currently lives at the project root (app/page.tsx) for simplicity;
// it can be moved into this group later if you want it to share this exact layout/header.