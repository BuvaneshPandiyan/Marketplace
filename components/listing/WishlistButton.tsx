"use client";
import { useState } from "react";
import { useAuthGate } from "@/components/auth/AuthGateContext";
import { useWishlist } from "@/lib/client/useWishlist";

type WishlistButtonProps = {
  listingId: string;
  currentPrice: number;
  isLoggedIn: boolean;
  size?: "default" | "compact";
};

export function WishlistButton({ listingId, currentPrice, isLoggedIn, size = "default" }: WishlistButtonProps) {
  const { isWishlisted, isLoading, toggle } = useWishlist({ listingId, currentPrice });
  const { requireAuth } = useAuthGate();
  const [popping, setPopping] = useState(false);

  const isCompact = size === "compact";

  if (!isLoggedIn) {
    if (isCompact) {
      return (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-center text-xs text-neutral-600">
        <button type="button" onClick={() => requireAuth("save this listing")} style={{background:"none",border:"none",color:"#9333a8",fontWeight:700,cursor:"pointer",fontSize:"inherit",padding:0}}>Sign in</button>{" "}to save listings
      </div>
      );
    }
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-sm text-neutral-600">
        <button type="button" onClick={() => requireAuth("save this listing")} style={{background:"none",border:"none",color:"#9333a8",fontWeight:700,cursor:"pointer",fontSize:"inherit",padding:0}}>Sign in</button>{" "}to save listings
      </div>
    );
  }

  function handleToggle() {
    toggle();
    setPopping(true);
    setTimeout(() => setPopping(false), 400);
  }

  return (
    <>
      <style>{`
        @keyframes wl-heart-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.3); }
          70%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .wl-pop { animation: wl-heart-pop 0.35s cubic-bezier(0.34,1.56,0.64,1); }
        @media (prefers-reduced-motion: reduce) { .wl-pop { animation: none !important; } }
      `}</style>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isLoading}
        className={`${popping ? "wl-pop" : ""} flex w-full items-center justify-center gap-2 rounded-full border font-semibold transition-colors disabled:opacity-60 ${
          isCompact ? "py-2 text-xs" : "py-3 text-sm gap-2.5"
        } ${
          isWishlisted
            ? "border-red-300 text-red-600 hover:bg-red-50"
            : "border-neutral-300 text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
        }`}
      >
        <svg
          width={isCompact ? 14 : 17} height={isCompact ? 14 : 17} viewBox="0 0 24 24"
          fill={isWishlisted ? "currentColor" : "none"}
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {isWishlisted
          ? (isCompact ? "Saved" : "Saved to wishlist")
          : (isCompact ? "Save" : "Save to wishlist")}
      </button>
    </>
  );
}