"use client";
import type { ReactNode } from "react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { PushPermissionPrompt } from "@/components/notifications/PushPermissionPrompt";
import { NativePlatformFlag } from "@/components/ui/NativePlatformFlag";
import { AuthGateProvider } from "@/components/auth/AuthGateContext";
import { useUser } from "@/lib/hooks/useUser";

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user } = useUser();
  return (
    <AuthGateProvider isLoggedIn={!!user}>
    <div className="min-h-screen bg-neutral-50">
      {/* Ambient background — CSS-only drifting blooms + faint grid. Defined in
          globals.css, rendered once here so it sits behind every (main) page.
          Fixed + pointer-events:none, so it never intercepts a tap. */}
      <div className="bz-ambient" aria-hidden="true">
        <span className="bz-blob bz-blob-1" />
        <span className="bz-blob bz-blob-2" />
        <span className="bz-blob bz-blob-3" />
      </div>
      <Header />
      <main className="bz-above">
        <style>{`
          main { padding-top: 76px; }
          @media(max-width:639px){
            main {
              padding-top: 0 !important;
              overflow-x: hidden;
            }
          }
          /* Clearance for the floating bottom nav pill on mobile is handled by
             the footer's own bottom padding (see Footer.tsx), so the pill floats
             over the footer's green rather than an empty spacer band. */
        `}</style>
        {children}
      </main>
      <Footer />
      {/* Asks signed-in users to enable push. Self-hiding: renders nothing unless
          the browser supports push, permission is still undecided, and the user
          hasn't recently dismissed it. */}
      <PushPermissionPrompt />
      {/* Flags <html> when inside the Capacitor app so globals.css can drop the
          effects Android's WebView renders badly. Renders nothing on the web. */}
      <NativePlatformFlag />
    </div>
    </AuthGateProvider>
  );
}

// NOTE: This (main) route group is a placeholder for future pages — e.g. (main)/search,
// (main)/listing/[id], (main)/sell, (main)/my-listings, (main)/wishlist, (main)/messages.
// The actual home page currently lives at the project root (app/page.tsx) for simplicity;
// it can be moved into this group later if you want it to share this exact layout/header.