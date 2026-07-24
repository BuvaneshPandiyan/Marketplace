"use client";

/**
 * The listing card — home feed, search, wishlist, seller pages, related rail.
 *
 * WHY IT LOOKS LIKE THIS
 * ----------------------
 * Cards land at ~210px wide on desktop (1600px / 7 cols) and ~180px on mobile
 * (2 cols). A 1:1 photo at that width is ~200px tall against ~70px of text, so
 * the card reads as "a picture with a caption". Two fixes:
 *
 *   1. The photo is 4:3, not square. That reclaims a quarter of its height and
 *      shifts the balance toward content without shrinking the card.
 *   2. Every field the type carries is now on the card. `condition` and
 *      `view_count` were being dropped entirely; they're the difference between
 *      a caption and an actual listing.
 *
 * CONTAINER QUERIES, NOT MEDIA QUERIES
 * ------------------------------------
 * The same card renders at 180px (2-col mobile) and at 380px (a 3-col tablet
 * grid). Viewport breakpoints can't tell those apart — a media query for "small
 * screen" would shrink the tablet card too. `container-type: inline-size` lets
 * the card respond to ITS OWN width, so it's dense when narrow and generous when
 * wide, on any screen. That's what makes it hold up everywhere.
 */

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useWishlist } from "@/lib/client/useWishlist";
import { useAuthGate } from "@/components/auth/AuthGateContext";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import { formatDistance, haversineDistanceKm } from "@/lib/geo";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";
import type { FeedListingItem } from "@/types";

type ListingCardProps = {
  listing: FeedListingItem;
  /** Position in its grid — drives the entrance stagger. Optional. */
  index?: number;
};

/** Views before a listing earns the "Popular" flame. */
const POPULAR_VIEWS = 80;
/** How recent counts as "Just listed". */
const FRESH_HOURS = 24;

function HeartSVG({ filled }: { filled: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24"
      fill={filled ? "#ef4444" : "none"}
      stroke={filled ? "#ef4444" : "#fff"}
      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

export function ListingCard({ listing, index = 0 }: ListingCardProps) {
  const { requireAuth } = useAuthGate();
  const { isWishlisted, toggle } = useWishlist({
    listingId: listing.id,
    currentPrice: listing.price,
  });
  const [popping, setPopping] = useState(false);
  const { lat: userLat, lng: userLng } = useActiveLocation();

  /**
   * Distance to this listing.
   *
   * The feed's RPCs only return distance_km for tiers 1 and 2 — get_listings_far
   * sorts by recency and never computes it, so every tier-3 card had no distance
   * at all. Rather than add a migration, we fall back to computing it here: the
   * listing already carries lat/lng and the user's coords are in context, and
   * haversine over two known points is exact. Server value wins when present
   * (it's the same maths, done by PostGIS), otherwise we do it locally — so
   * every card gets a distance, at any range.
   *
   * Coordinates are the real ones. fuzzCoordinate exists but is display-only,
   * applied in MapPreview at 150m; it never touches what's stored.
   */
  const distanceKm =
    listing.distance_km ??
    (userLat != null && userLng != null
      ? haversineDistanceKm(userLat, userLng, listing.lat, listing.lng)
      : null);

  /**
   * Directions, not a pin drop. We know both ends, so Google can show the route
   * and the real travel distance — which is what someone tapping "2.5 km away"
   * actually wants to know. Falls back to a plain search when we don't have the
   * user's position.
   */
  const mapsUrl =
    userLat != null && userLng != null
      ? `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${listing.lat},${listing.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`;

  function handleWishlist() {
    toggle();
    setPopping(true);
    setTimeout(() => setPopping(false), 400);
  }

  const hoursOld = (Date.now() - new Date(listing.created_at).getTime()) / 36e5;
  const isFresh = hoursOld < FRESH_HOURS;
  const isNew = listing.condition === "new";
  const isPopular = listing.view_count >= POPULAR_VIEWS;
  const isRent = listing.listing_type === "rent";
  const href = `/listing/${listing.id}`;

  // One photo badge maximum. Two competing flags is noise; the condition pill
  // lives down in the body where it doesn't fight the photo.
  const photoBadge = isFresh
    ? { label: "Just listed", kind: "fresh" as const }
    : isPopular
      ? { label: "Popular", kind: "hot" as const }
      : null;

  return (
    <>
      <style>{`
        .lc {
          container-type: inline-size;
          position: relative;
          width: 100%;
          overflow: hidden;
          border-radius: var(--r-md);
          border: 1px solid var(--line);
          background: #fff;
          display: flex;
          flex-direction: column;
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
          .lc:hover .lc-img    { transform: scale(1.08); }
          .lc:hover .lc-title  { color: var(--brand); }
          .lc:hover .lc-sheen  { animation: bz-shine 780ms ease both; }
          .lc:hover .lc-scrim  { opacity: 1; }
          /* Price swells a touch — the eye's first stop stays the eye's first stop */
          .lc:hover .lc-price  { transform: scale(1.05); }
          /* Rule fills left-to-right */
          .lc:hover .lc-rule::after { transform: scaleX(1); }
          /* Condition pill pops */
          .lc:hover .lc-cond--new  { transform: scale(1.06); box-shadow: 0 3px 10px rgba(234,88,12,0.3); }
          .lc:hover .lc-cond--used { transform: scale(1.06); }
          /* The location pin does a single hop */
          .lc:hover .lc-pin { animation: lc-pin-hop 620ms var(--spring); }
        }
        @keyframes lc-pin-hop {
          0%,100% { transform: translateY(0); }
          35%     { transform: translateY(-3px) scale(1.15); }
          60%     { transform: translateY(0) scale(0.95); }
        }
        .lc:active { transform: scale(0.975); }

        /* ── Photo ────────────────────────────────────────────────
           5:4. Square (1:1) made the card 70% picture; 4:3 overcorrected and
           read as squashed. 5:4 gives the photo real height while still
           leaving the body enough room to look like a listing. */
        .lc-photo {
          position: relative;
          aspect-ratio: 5 / 4;
          width: 100%;
          overflow: hidden;
          background: var(--surface-sunk);
          display: block;
          flex-shrink: 0;
        }
        .lc-img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 560ms var(--ease);
        }
        .lc-noimg {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; opacity: 0.25;
        }
        .lc-sheen {
          position: absolute; top: 0; bottom: 0; left: -60%; width: 45%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent);
          transform: translateX(-140%) skewX(-18deg);
          pointer-events: none;
        }
        .lc-scrim {
          position: absolute; inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.46) 0%, transparent 38%);
          opacity: 0.8;
          transition: opacity 280ms ease;
          pointer-events: none;
        }

        /* ── Distance chip ────────────────────────────────────────
           This is a link now, so it has to LOOK tappable — a static label and a
           button look identical when both are just text on a photo. It gets a
           ring, a breathing pulse to catch the eye, and an arrow that slides out
           on hover. z-index 2 puts it above the photo link's hit area. */
        .lc-dist {
          position: absolute; top: 6px; left: 6px; z-index: 2;
          display: inline-flex; align-items: center; gap: 3px;
          padding: 4px 8px; border-radius: var(--r-pill);
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.22);
          color: #fff; font-size: 9.5px; font-weight: 800;
          letter-spacing: -0.01em;
          text-decoration: none; cursor: pointer;
          font-variant-numeric: tabular-nums;
          animation: lc-dist-pulse 3.2s ease-out 1.5s infinite;
          transition: background 200ms ease, transform 240ms var(--spring),
                      border-color 200ms ease;
        }
        /* A soft ring pushes outward every few seconds — enough to read as
           interactive without becoming a distraction in a grid of 20 cards */
        @keyframes lc-dist-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.34); }
          45%      { box-shadow: 0 0 0 5px rgba(255,255,255,0); }
        }
        @media (hover: hover) {
          .lc-dist:hover {
            background: var(--brand); border-color: rgba(255,255,255,0.5);
            transform: scale(1.06);
            animation-play-state: paused;
          }
          .lc-dist:hover .lc-dist-pin { transform: translateY(-1px) scale(1.15); }
          /* The arrow is hidden until hover — it would crowd the chip otherwise */
          .lc-dist:hover .lc-dist-go { max-width: 12px; opacity: 1; margin-left: 1px; }
        }
        .lc-dist:active { transform: scale(0.93); }
        .lc-dist:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        .lc-dist-pin { transition: transform 260ms var(--spring); }
        .lc-dist-go {
          max-width: 0; opacity: 0; overflow: hidden;
          transition: max-width 240ms var(--ease), opacity 200ms ease, margin-left 240ms var(--ease);
        }
        /* Touch has no hover, so the arrow is always out — it's the only cue
           a phone user gets that this does something */
        @media (hover: none) {
          .lc-dist-go { max-width: 12px; opacity: 0.75; margin-left: 1px; }
        }

        .lc-badge {
          position: absolute; left: 6px; bottom: 6px;
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: var(--r-pill);
          font-size: 9px; font-weight: 800;
          letter-spacing: 0.04em; text-transform: uppercase;
          color: #fff;
        }
        .lc-badge--fresh { background: linear-gradient(135deg,#16a34a,#22c55e); box-shadow: 0 2px 8px rgba(34,197,94,0.5); }
        .lc-badge--hot   { background: linear-gradient(135deg,#b91c1c,#ef4444); box-shadow: 0 2px 8px rgba(239,68,68,0.5); }
        .lc-badge--fresh::before {
          content: ''; width: 4px; height: 4px; border-radius: 50%;
          background: #fff; animation: lc-blink 1.8s ease-in-out infinite;
        }
        @keyframes lc-blink { 0%,100%{opacity:1} 50%{opacity:0.25} }

        .lc-heart {
          position: absolute; top: 5px; right: 5px;
          width: 29px; height: 29px; border-radius: 50%;
          border: none; padding: 0; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.36);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          transition: transform 260ms var(--spring), background 200ms ease;
        }
        @media (hover: hover) { .lc-heart:hover { background: rgba(0,0,0,0.6); transform: scale(1.15); } }
        .lc-heart:active { transform: scale(0.86); }
        .lc-heart:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        @keyframes lc-heart-pop { 0%{transform:scale(1)} 40%{transform:scale(1.35)} 70%{transform:scale(0.9)} 100%{transform:scale(1)} }
        .lc-heart-pop { animation: lc-heart-pop 380ms var(--spring); }

        /* ── Body ─────────────────────────────────────────────────── */
        .lc-body {
          display: flex; flex-direction: column;
          padding: 9px 10px 10px;
          text-decoration: none;
          flex: 1;
        }

        .lc-top {
          display: flex; align-items: baseline; justify-content: space-between;
          gap: 6px; margin-bottom: 3px;
        }
        .lc-price {
          font-size: 16px; font-weight: 900; letter-spacing: -0.055em;
          color: var(--ink); white-space: nowrap;
          /* Tabular figures so prices line up down a column instead of
             jittering — ₹1,111 and ₹9,999 occupy the same width */
          font-variant-numeric: tabular-nums;
          transform-origin: left center;
          transition: transform 280ms var(--spring);
        }
        .lc-price em { font-style: normal; font-size: 0.6em; font-weight: 700; color: var(--ink-faint); letter-spacing: -0.02em; }

        /* Condition pill — 'New' earns brand orange, 'Used' stays quiet */
        .lc-cond {
          flex-shrink: 0;
          font-size: 8.5px; font-weight: 900;
          letter-spacing: 0.07em; text-transform: uppercase;
          padding: 3px 7px; border-radius: 6px;
          transition: transform 280ms var(--spring), box-shadow 280ms ease;
        }
        .lc-cond--new  { background: var(--brand-tint); color: var(--brand); border: 1px solid var(--brand-border); }
        .lc-cond--used { background: #f3f4f6; color: var(--ink-muted); border: 1px solid #e5e7eb; }

        .lc-title {
          /* 700, not 600, and full ink rather than the soft grey. On Zomato the
             name is the second-loudest thing on the card after the rating —
             here it's second after the price. 600/grey read as a caption. */
          font-size: 12px; font-weight: 700; line-height: 1.32;
          letter-spacing: -0.025em;
          color: var(--ink); margin: 0 0 8px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 200ms ease;
          min-height: 2.7em;
        }

        /* The rule doubles as a hover indicator: a grey hairline that fills
           with brand gradient from the left. Cheap, and it makes the whole
           lower half of the card feel responsive rather than inert. */
        .lc-rule {
          position: relative; height: 1px; background: var(--line);
          margin: 0 0 7px; overflow: hidden;
        }
        .lc-rule::after {
          content: ''; position: absolute; inset: 0;
          background: var(--brand-grad);
          transform: scaleX(0); transform-origin: left;
          transition: transform 420ms var(--ease);
        }

        .lc-foot { display: flex; flex-direction: column; gap: 3px; margin-top: auto; }
        .lc-row {
          display: flex; align-items: center; gap: 4px;
          font-size: 10.5px; font-weight: 700; letter-spacing: -0.015em;
          color: var(--ink-muted);
          min-width: 0;
        }
        .lc-row svg { flex-shrink: 0; opacity: 0.65; }
        .lc-loc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lc-sep { opacity: 0.4; flex-shrink: 0; }
        .lc-time { color: var(--ink-faint); font-weight: 600; flex-shrink: 0; letter-spacing: -0.01em; }
        .lc-views { color: var(--ink-faint); font-weight: 700; display: flex; align-items: center; gap: 3px; font-variant-numeric: tabular-nums; }

        /* ── CONTAINER QUERIES — the card reacts to its own width ──── */
        /* Roomy (4-col tablet, 3-col wide phone): let it breathe */
        @container (min-width: 240px) {
          /* With width to spare, go nearly square — the photo is the product */
          .lc-photo { aspect-ratio: 9 / 8; }
          .lc-body  { padding: 12px 13px 13px; }
          .lc-price { font-size: 20px; }
          .lc-title { font-size: 13.5px; }
          .lc-row   { font-size: 11.5px; }
          .lc-cond  { font-size: 9.5px; padding: 3px 8px; }
        }
        /* Tight (7-col desktop, cramped phones): drop what's least useful
           rather than shrinking everything into illegibility */
        @container (max-width: 168px) {
          .lc-views { display: none; }
          .lc-title { font-size: 11.5px; }
          .lc-price { font-size: 15px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .lc, .lc-img, .lc-heart, .lc-sheen, .lc-scrim, .lc-title,
          .lc-dist, .lc-dist-pin, .lc-dist-go { animation: none !important; transition: none !important; }
          .lc-dist:hover, .lc-dist:active { transform: none !important; }
          .lc-dist-go { max-width: 12px !important; opacity: 0.75 !important; }
          .lc:hover, .lc:active, .lc:hover .lc-img,
          .lc:hover .lc-price, .lc:hover .lc-cond--new, .lc:hover .lc-cond--used { transform: none !important; }
          .lc-price, .lc-cond, .lc-rule::after { transition: none !important; }
          .lc:hover .lc-pin { animation: none !important; }
          .lc-badge--fresh::before { animation: none !important; }
        }
      `}</style>

      <div className="lc" style={{ animationDelay: `${(index % 12) * 40}ms` }}>
        {/* Photo */}
        <Link href={href} className="lc-photo" aria-label={listing.title}>
          {listing.cover_photo_url ? (
            <Image
              src={listing.cover_photo_url}
              alt={listing.title}
              fill
              // The card is 2 columns on phones, 3 small / 4 medium / 7 on wide
              // screens. Telling the browser roughly how wide the image will
              // actually be lets it pick the smallest sufficient file instead of
              // downloading a full-size one for a thumbnail — this is where most
              // of the bandwidth saving comes from, not the format change.
              sizes="(min-width: 1024px) 14vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="lc-img"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="lc-noimg">📦</div>
          )}
          <span className="lc-sheen" aria-hidden="true" />
          <span className="lc-scrim" aria-hidden="true" />

          {photoBadge && (
            <span className={`lc-badge lc-badge--${photoBadge.kind}`}>{photoBadge.label}</span>
          )}
        </Link>

        {/* Distance chip — a sibling of the photo link, not a child. Nesting an
            <a> inside an <a> is invalid HTML and browsers resolve the click
            unpredictably. Same reason the heart lives out here. */}
        {distanceKm != null && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="lc-dist"
            aria-label={`${formatDistance(distanceKm)} — open directions in Google Maps`}
            onClick={(e) => {
              // Directions reveal roughly where a seller is, so it is gated like
              // the phone number and chat. requireAuth() shows the sign-in
              // prompt and returns false when nobody is logged in.
              //
              // Left as a real <a> with a valid href rather than a button: for a
              // signed-in user, middle-click and "open in new tab" then still
              // work, and assistive tech announces it correctly. The handler
              // only intercepts the plain-click case.
              if (!requireAuth("get directions")) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <svg className="lc-dist-pin" width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
            </svg>
            <span className="lc-dist-t">{formatDistance(distanceKm)}</span>
            <svg className="lc-dist-go" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </a>
        )}

        {/* Outside the Link — a <button> inside an <a> is invalid HTML and
            breaks keyboard navigation */}
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
          <span className="lc-top">
            <span className="lc-price">
              ₹{listing.price.toLocaleString("en-IN")}
              {isRent && <em>/mo</em>}
            </span>
            <span className={`lc-cond lc-cond--${isNew ? "new" : "used"}`}>
              {isNew ? "New" : "Used"}
            </span>
          </span>

          <span className="lc-title">{listing.title}</span>

          <span className="lc-rule" aria-hidden="true" />

          <span className="lc-foot">
            <span className="lc-row">
              <svg className="lc-pin" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>
              <span className="lc-loc">{listing.locality ?? "Nearby"}</span>
            </span>
            <span className="lc-row">
              <span className="lc-views">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {listing.view_count.toLocaleString("en-IN")}
              </span>
              <span className="lc-sep" aria-hidden="true">·</span>
              <span className="lc-time">{formatRelativeDate(listing.created_at)}</span>
            </span>
          </span>
        </Link>
      </div>
    </>
  );
}