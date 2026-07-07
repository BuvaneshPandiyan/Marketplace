"use client";
// Handles pagination + responsive page size for the seller's public listings grid.
// Reuses ListingCard and the same useMediaQuery + DESKTOP/MOBILE_FEED_PAGE_SIZE
// pattern already established on the home feed and search pages.

import { useState } from "react";
import { ListingCard } from "@/components/feed/ListingCard";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { DESKTOP_FEED_PAGE_SIZE, MOBILE_FEED_PAGE_SIZE } from "@/lib/feedConfig";
import type { FeedListingItem } from "@/types";

type SellerListingsGridProps = {
  listings: FeedListingItem[];
};

export function SellerListingsGrid({ listings }: SellerListingsGridProps) {
  const [page, setPage] = useState(0);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const pageSize = isDesktop ? DESKTOP_FEED_PAGE_SIZE : MOBILE_FEED_PAGE_SIZE;

  const totalPages = Math.ceil(listings.length / pageSize);
  const pageItems = listings.slice(page * pageSize, (page + 1) * pageSize);
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  return (
    <>
      <style>{`
        @keyframes card-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .seller-card-anim { animation: card-in 300ms ease both; }
        @media (prefers-reduced-motion: reduce) {
          .seller-card-anim { animation: none !important; }
        }
      `}</style>

      {/* Responsive grid — pixel-identical to home feed and search results */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7 lg:gap-6">
        {pageItems.map((listing, i) => (
          <div
            key={listing.id}
            className="seller-card-anim"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <ListingCard listing={listing} />
          </div>
        ))}
      </div>

      {/* Prev / Next pagination controls — same orange-pill style as the home feed */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            disabled={!hasPrev}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-orange-400 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Prev
          </button>

          {/* Current page indicator */}
          <span
            className="rounded-full bg-orange-600 px-3 py-2 text-sm font-semibold text-white"
            style={{ minWidth: 36, textAlign: "center" }}
          >
            {page + 1}
          </span>

          <span className="text-xs text-neutral-400">of {totalPages}</span>

          <button
            type="button"
            onClick={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            disabled={!hasNext}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-orange-400 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}