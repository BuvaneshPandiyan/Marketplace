"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthGate } from "@/components/auth/AuthGateContext";

type ChatWithSellerButtonProps = {
  listingId: string;
  isLoggedIn: boolean;
  isOwnListing: boolean;
  // "default" = full-width pill (mobile); "compact" = smaller for desktop horizontal row
  size?: "default" | "compact";
};

export function ChatWithSellerButton({ listingId, isLoggedIn, isOwnListing, size = "default" }: ChatWithSellerButtonProps) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { requireAuth } = useAuthGate();

  if (isOwnListing) return null;

  if (!isLoggedIn) {
    if (size === "compact") {
      return (
        <button type="button" onClick={() => requireAuth("chat with the seller")}
          className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-center text-xs text-neutral-600 w-full cursor-pointer">
          <span className="font-semibold text-orange-600">Sign in</span> to chat
        </button>
      );
    }
    return (
      <div className="rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-center text-sm text-neutral-600">
        <a href="/login" className="font-semibold text-orange-600 hover:text-orange-700">Log in</a>
        {" "}to chat with the seller.
      </div>
    );
  }

  async function handleChat() {
    if (!requireAuth("chat with the seller")) return;
    setError(null);
    setIsLoading(true);
    const { data, error: rpcError } = await supabase.rpc("get_or_create_conversation", {
      p_listing_id: listingId,
    });
    setIsLoading(false);
    if (rpcError || !data) {
      setError(rpcError?.message ?? "Couldn't open a conversation. Please try again.");
      return;
    }
    router.push(`/messages/${data as string}`);
  }

  const isCompact = size === "compact";

  return (
    <div>
      <button
        type="button"
        onClick={handleChat}
        disabled={isLoading}
        className={`action-btn-primary flex w-full items-center justify-center gap-2 rounded-full font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
          isCompact ? "py-2 text-xs" : "py-3 text-sm gap-2.5"
        }`}
        style={{
          background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
          boxShadow: "0 4px 20px rgba(234,88,12,0.35)",
        }}
      >
        <svg width={isCompact ? 15 : 18} height={isCompact ? 15 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {isLoading ? "Opening…" : isCompact ? "Chat" : "Chat with Seller"}
      </button>
      {error && <p className="mt-1.5 text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}