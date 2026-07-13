"use client";
import type { ReactNode } from "react";
import { Header } from "@/components/ui/Header";
import { AuthGateProvider } from "@/components/auth/AuthGateContext";
import { useUser } from "@/lib/hooks/useUser";

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user } = useUser();
  return (
    <AuthGateProvider isLoggedIn={!!user}>
    <div className="min-h-screen bg-neutral-50">
      <Header />
      <main>
        <style>{`
          main { padding-top: 76px; }
          @media(max-width:639px){
            main {
              padding-top: 0 !important;
              padding-bottom: calc(88px + env(safe-area-inset-bottom));
              overflow-x: hidden;
            }
          }
        `}</style>
        {children}
      </main>
    </div>
    </AuthGateProvider>
  );
}

// NOTE: This (main) route group is a placeholder for future pages — e.g. (main)/search,
// (main)/listing/[id], (main)/sell, (main)/my-listings, (main)/wishlist, (main)/messages.
// The actual home page currently lives at the project root (app/page.tsx) for simplicity;
// it can be moved into this group later if you want it to share this exact layout/header.