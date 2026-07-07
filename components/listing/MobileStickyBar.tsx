"use client";
// Mobile-only sticky action bar — extracted as a Client Component so it can
// hold event handlers, which aren't allowed in Server Component JSX props.

import { ChatWithSellerButton } from "@/components/listing/ChatWithSellerButton";
import { ShowNumberButton } from "@/components/listing/ShowNumberButton";
import { WishlistButton } from "@/components/listing/WishlistButton";

type MobileStickyBarProps = {
  listingId: string;
  currentPrice: number;
  isLoggedIn: boolean;
};

export function MobileStickyBar({ listingId, currentPrice, isLoggedIn }: MobileStickyBarProps) {
  return (
    <div
      className="flex lg:hidden"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 80,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: "1px solid #f3f4f6",
        padding: "10px 16px",
        paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
        gap: 10,
      }}
    >
      {/* Chat — primary full-width gradient pill */}
      <div className="flex-1">
        <ChatWithSellerButton listingId={listingId} isLoggedIn={isLoggedIn} isOwnListing={false} />
      </div>

      {/* Phone — compact icon button */}
      <div style={{ width: 44, height: 44, flexShrink: 0 }}>
        <ShowNumberButton listingId={listingId} isLoggedIn={isLoggedIn} />
      </div>

      {/* Save — compact icon button */}
      <div style={{ width: 44, height: 44, flexShrink: 0 }}>
        <WishlistButton listingId={listingId} currentPrice={currentPrice} isLoggedIn={isLoggedIn} />
      </div>
    </div>
  );
}