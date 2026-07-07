"use client";

import Link from "next/link";
import { useState } from "react";
import { useWishlist } from "@/lib/client/useWishlist";
import { formatDistance } from "@/lib/geo";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";
import type { FeedListingItem } from "@/types";

type ListingCardProps = { listing: FeedListingItem };

// SVG heart icon — same path used in the Header for visual consistency
function HeartSVG({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={filled ? color : "white"}
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ filter: filled ? "none" : "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function ListingCard({ listing }: ListingCardProps) {
  const { isWishlisted, toggle } = useWishlist({
    listingId: listing.id,
    currentPrice: listing.price,
  });
  const [popping, setPopping] = useState(false);

  function handleWishlist() {
    toggle();
    setPopping(true);
    setTimeout(() => setPopping(false), 400);
  }

  return (
    <>
      <style>{`
        /* Heart pop — shared with Header's wishlist icon */
        @keyframes card-heart-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.3); }
          70%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .card-heart-pop { animation: card-heart-pop 0.35s cubic-bezier(0.34,1.56,0.64,1); }

        /* Card hover — only on pointer devices */
        @media (hover: hover) {
          .listing-card-wrap:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 32px rgba(0,0,0,0.12);
          }
          .listing-card-wrap:hover .card-img {
            transform: scale(1.05);
          }
          .listing-card-wrap:hover .card-title {
            color: #ea580c;
          }
        }
        /* Touch fallback */
        .listing-card-wrap:active {
          transform: scale(0.97);
        }
        .listing-card-wrap {
          transition: transform 250ms ease-out, box-shadow 250ms ease-out;
        }
        .card-img {
          transition: transform 300ms ease-out;
          width: 100%; height: 100%; object-fit: cover;
        }
        .card-title {
          transition: color 200ms ease;
        }
        @media (prefers-reduced-motion: reduce) {
          .listing-card-wrap, .card-img, .card-heart-pop {
            animation: none !important;
            transition-duration: 0ms !important;
          }
          .listing-card-wrap:hover { transform: none; }
        }
      `}</style>

      {/* w-full so the parent grid controls column width */}
      <div className="listing-card-wrap w-full overflow-hidden rounded-xl border border-neutral-200 bg-white">

        {/* Photo — clicking navigates to detail page */}
        <Link href={`/listing/${listing.id}`} className="block">
          <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
            {listing.cover_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.cover_photo_url} alt={listing.title} className="card-img" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">No photo</div>
            )}

            {/* Wishlist heart — sits on the image top-right, no circular backdrop */}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); handleWishlist(); }}
              aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              className={popping ? "card-heart-pop" : ""}
              style={{
                position: "absolute",
                top: 8, right: 8,
                width: 36, height: 36,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "none", background: "transparent",
                cursor: "pointer", padding: 0,
                transition: "transform 200ms ease",
              }}
            >
              <HeartSVG filled={isWishlisted} color="#ef4444" />
            </button>
          </div>
        </Link>

        {/* Text content */}
        <Link href={`/listing/${listing.id}`} className="block p-2.5 pt-2">
          {/* Title — 2 lines max; font slightly smaller on very narrow 7-col cards */}
          <p className="card-title line-clamp-2 text-xs font-medium text-neutral-900 sm:text-sm">
            {listing.title}
          </p>
          {/* Price */}
          <p className="mt-0.5 text-xs font-semibold text-neutral-900 sm:text-sm">
            ₹{listing.price.toLocaleString("en-IN")}
            {listing.listing_type === "rent" && (
              <span className="font-normal text-neutral-500">/mo</span>
            )}
          </p>
          {/* Locality + distance */}
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {listing.locality}
            {typeof listing.distance_km === "number" && <> · {formatDistance(listing.distance_km)}</>}
          </p>
          {/* Relative date */}
          <p className="mt-0.5 text-xs text-neutral-400">{formatRelativeDate(listing.created_at)}</p>
        </Link>
      </div>
    </>
  );
}