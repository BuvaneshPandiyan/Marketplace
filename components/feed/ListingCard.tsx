"use client";

/**
 * The listing card.
 *
 * This one component is the home feed, search results, wishlist, seller pages
 * and the "you may also like" rail — so it's the single highest-leverage surface
 * in the app. Restyling it restyles five pages.
 *
 * Design notes:
 * - Price leads, not the title. Zepto/Zomato both do this and it's right: on a
 *   marketplace the price is the thing being scanned, the title is the thing
 *   being read once something catches the eye.
 * - The type already carried `condition`, `view_count` and `distance_km` and the
 *   old card threw all three away. They're free signal — "New", "Popular" and a
 *   distance chip cost nothing extra to render and are exactly what makes a
 *   grid feel alive rather than like a spreadsheet.
 * - Badges are capped at two. Every card screaming is the same as none of them.
 */

import Link from "next/link";
import { useState } from "react";
import { useWishlist } from "@/lib/client/useWishlist";
import { formatDistance } from "@/lib/geo";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";
import type { FeedListingItem } from "@/types";

type ListingCardProps = {
  listing: FeedListingItem;
  /**
   * Position in its grid. Drives the entrance stagger only — optional, so every
   * existing <ListingCard listing={x} /> call site keeps working untouched.
   */
  index?: number;
};

/** Views before a listing earns the "Popular" flame. */
const POPULAR_VIEWS = 80;
/** How recent counts as "Just listed". */
const FRESH_HOURS = 24;

function HeartSVG({ filled }: { filled: boolean }) {
  return (
    <svg
      width="17" height="17" viewBox="0 0 24 24"
      fill={filled ? "#ef4444" : "none"}
      stroke={filled ? "#ef4444" : "#fff"}
      strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function ListingCard({ listing, index = 0 }: ListingCardProps) {
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

  const hoursOld = (Date.now() - new Date(listing.created_at).getTime()) / 36e5;
  const isFresh = hoursOld < FRESH_HOURS;
  const isNew = listing.condition === "new";
  const isPopular = listing.view_count >= POPULAR_VIEWS;
  const href = `/listing/${listing.id}`;

  // Two badges maximum, most interesting first.
  const badges: { label: string; kind: "fresh" | "new" | "hot" }[] = [];
  if (isFresh) badges.push({ label: "Just listed", kind: "fresh" });
  if (isNew) badges.push({ label: "New", kind: "new" });
  if (isPopular && badges.length < 2) badges.push({ label: "Popular", kind: "hot" });

  return (
    <>
      <style>{`
        .lc {
          position: relative;
          width: 100%;
          overflow: hidden;
          border-radius: var(--r-md);
          border: 1px solid var(--line);
          background: #fff;
          /* Cards fade up in sequence. Modulo keeps infinite-scroll pages from
             inheriting an ever-growing delay. */
          animation: bz-rise 420ms var(--ease) both;
          transition: transform 280ms var(--spring),
                      box-shadow 280ms ease, border-color 280ms ease;
        }
        @media (min-width: 640px) { .lc { border-radius: var(--r-lg); } }

        @media (hover: hover) {
          .lc:hover {
            transform: translateY(-6px);
            box-shadow: var(--sh-lg);
            border-color: var(--brand-border);
          }
          .lc:hover .lc-img   { transform: scale(1.07); }
          .lc:hover .lc-title { color: var(--brand); }
          .lc:hover .lc-price { transform: translateX(2px); }
          /* Light sweeps across the photo on hover */
          .lc:hover .lc-sheen { animation: bz-shine 780ms ease both; }
          .lc:hover .lc-scrim { opacity: 1; }
        }
        .lc:active { transform: scale(0.975); }

        .lc-photo {
          position: relative;
          aspect-ratio: 1;
          width: 100%;
          overflow: hidden;
          background: var(--surface-sunk);
        }
        .lc-img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 520ms var(--ease);
        }
        .lc-sheen {
          position: absolute; top: 0; bottom: 0; left: -60%; width: 45%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transform: translateX(-140%) skewX(-18deg);
          pointer-events: none;
        }
        /* Scrim keeps the badges legible over any photo */
        .lc-scrim {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 42%);
          opacity: 0.82;
          transition: opacity 280ms ease;
          pointer-events: none;
        }

        /* ── Chips ────────────────────────────────────────────────── */
        .lc-dist {
          position: absolute; top: 7px; left: 7px;
          display: inline-flex; align-items: center; gap: 3px;
          padding: 3px 7px; border-radius: var(--r-pill);
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          color: #fff; font-size: 9.5px; font-weight: 800;
          letter-spacing: -0.01em;
        }

        .lc-badges {
          position: absolute; left: 7px; bottom: 7px;
          display: flex; flex-wrap: wrap; gap: 4px;
        }
        .lc-badge {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 3px 7px; border-radius: var(--r-pill);
          font-size: 9px; font-weight: 800;
          letter-spacing: 0.03em; text-transform: uppercase;
          color: #fff;
        }
        .lc-badge--fresh {
          background: linear-gradient(135deg, #16a34a, #22c55e);
          box-shadow: 0 2px 8px rgba(34,197,94,0.45);
        }
        .lc-badge--new  { background: var(--brand-grad); box-shadow: 0 2px 8px rgba(234,88,12,0.45); }
        .lc-badge--hot  { background: linear-gradient(135deg, #b91c1c, #ef4444); box-shadow: 0 2px 8px rgba(239,68,68,0.45); }
        /* Only the freshness badge pulses — if they all did, none would read */
        .lc-badge--fresh::before {
          content: ''; width: 4px; height: 4px; border-radius: 50%;
          background: #fff; animation: lc-blink 1.8s ease-in-out infinite;
        }
        @keyframes lc-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }

        /* ── Heart ────────────────────────────────────────────────── */
        .lc-heart {
          position: absolute; top: 6px; right: 6px;
          width: 30px; height: 30px; border-radius: 50%;
          border: none; padding: 0; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.34);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          transition: transform 260ms var(--spring), background 200ms ease;
        }
        @media (hover: hover) { .lc-heart:hover { background: rgba(0,0,0,0.55); transform: scale(1.14); } }
        .lc-heart:active { transform: scale(0.86); }
        .lc-heart:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        @keyframes lc-heart-pop {
          0% { transform: scale(1); } 40% { transform: scale(1.35); }
          70% { transform: scale(0.9); } 100% { transform: scale(1); }
        }
        .lc-heart-pop { animation: lc-heart-pop 380ms var(--spring); }

        /* ── Body ─────────────────────────────────────────────────── */
        .lc-body { display: block; padding: 9px 10px 11px; text-decoration: none; }
        @media (min-width: 640px) { .lc-body { padding: 11px 12px 13px; } }

        .lc-price {
          font-size: 15px; font-weight: 900; letter-spacing: -0.04em;
          color: var(--ink); margin: 0 0 3px;
          transition: transform 280ms var(--spring), color 200ms ease;
        }
        @media (min-width: 640px) { .lc-price { font-size: 17px; } }
        .lc-price span { font-size: 0.68em; font-weight: 600; color: var(--ink-faint); letter-spacing: 0; }

        .lc-title {
          font-size: 11.5px; font-weight: 600; line-height: 1.35;
          color: var(--ink-soft); margin: 0 0 6px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 200ms ease;
          min-height: 2.7em; /* two lines reserved, so grids stay even */
        }
        @media (min-width: 640px) { .lc-title { font-size: 12.5px; } }

        .lc-meta {
          display: flex; align-items: center; gap: 5px;
          font-size: 10px; color: var(--ink-faint); font-weight: 500;
        }
        .lc-meta-loc {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          min-width: 0;
        }
        .lc-dot { flex-shrink: 0; opacity: 0.5; }

        @media (prefers-reduced-motion: reduce) {
          .lc, .lc-img, .lc-price, .lc-heart, .lc-sheen, .lc-scrim, .lc-title { animation: none !important; transition: none !important; }
          .lc:hover, .lc:active, .lc:hover .lc-img, .lc:hover .lc-price { transform: none !important; }
          .lc-badge--fresh::before { animation: none !important; }
        }
      `}</style>

      <div className="lc" style={{ animationDelay: `${(index % 12) * 40}ms` }}>
        {/* Photo */}
        <Link href={href} className="lc-photo" aria-label={listing.title}>
          {listing.cover_photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.cover_photo_url} alt={listing.title} className="lc-img" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl opacity-30">📦</div>
          )}

          <span className="lc-sheen" aria-hidden="true" />
          <span className="lc-scrim" aria-hidden="true" />

          {typeof listing.distance_km === "number" && (
            <span className="lc-dist">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>
              {formatDistance(listing.distance_km)}
            </span>
          )}

          {badges.length > 0 && (
            <span className="lc-badges">
              {badges.map((b) => (
                <span key={b.label} className={`lc-badge lc-badge--${b.kind}`}>
                  {b.label}
                </span>
              ))}
            </span>
          )}
        </Link>

        {/* Heart lives outside the Link — nesting a button inside an anchor is
            invalid HTML and breaks keyboard navigation */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`lc-heart${popping ? " lc-heart-pop" : ""}`}
        >
          <HeartSVG filled={isWishlisted} />
        </button>

        {/* Body */}
        <Link href={href} className="lc-body">
          <p className="lc-price">
            ₹{listing.price.toLocaleString("en-IN")}
            {listing.listing_type === "rent" && <span>/mo</span>}
          </p>
          <p className="lc-title">{listing.title}</p>
          <p className="lc-meta">
            <span className="lc-meta-loc">{listing.locality ?? "Nearby"}</span>
            <span className="lc-dot" aria-hidden="true">·</span>
            <span style={{ flexShrink: 0 }}>{formatRelativeDate(listing.created_at)}</span>
          </p>
        </Link>
      </div>
    </>
  );
}