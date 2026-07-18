"use client";

/**
 * WishlistCard — a saved listing on the wishlist page.
 *
 * Same visual DNA as the homepage feed card (components/feed/ListingCard.tsx):
 * the style block below is copied from it verbatim, so the wishlist, the feed and
 * my-listings all share one card. The difference is colour — this page runs on a
 * TEAL accent, not the site orange. The feed card is built entirely on --brand*
 * CSS variables, so re-scoping those on .wl re-tints the whole thing (hover glow,
 * condition pill, the rule that fills on hover) without touching structure.
 *
 * Wishlist-specific bits layered on top:
 *   - a status pill (Available / Sold / Price drop) where the distance chip sat
 *   - the heart is filled + removes the item, instead of toggling wishlist state
 */

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";

export type WishlistCardEntry = {
  wishlistId: string;
  listingId: string;
  title: string;
  currentPrice: number;
  priceAtSave: number;
  status: string;
  locality: string;
  listingType: string;
  coverPhotoUrl: string | null;
  savedAt: string;
  badge: "available" | "sold" | "price_drop";
};

export function WishlistCard({ entry, index = 0 }: { entry: WishlistCardEntry; index?: number }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [removing, setRemoving] = useState(false);
  const [gone, setGone] = useState(false);

  const href = `/listing/${entry.listingId}`;
  const isSold = entry.badge === "sold";
  const isDrop = entry.badge === "price_drop";

  async function removeFromWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (removing) return;
    setRemoving(true);
    const { error } = await supabase.from("wishlist").delete().eq("id", entry.wishlistId);
    if (error) { setRemoving(false); return; }
    // Collapse out, then refresh so the server list matches
    setGone(true);
    setTimeout(() => router.refresh(), 260);
  }

  const badgeLabel = isSold ? "Sold" : isDrop ? "Price drop" : "Available";
  const badgeKind = isSold ? "sold" : isDrop ? "drop" : "ok";

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

        /* ══════════════════════════════════════════════════════════
           WISHLIST — TEAL RE-SKIN
           The feed card is built on --brand* variables. Re-scope them to teal
           HERE and every accent the card draws (hover glow, condition pill, the
           rule that fills, the price on hover) turns teal — one place, whole card.
           ══════════════════════════════════════════════════════════ */
        .wl {
          --brand: #0d9488;
          --brand-tint: #f0fdfa;
          --brand-border: #99f6e4;
          --brand-grad: linear-gradient(135deg, #0d9488, #14b8a6);
        }
        /* The feed card's hover glow reads the brand colour via rgba literals we
           can't reach from a variable, so re-declare the teal hover shadow. */
        @media (hover: hover) {
          .wl:hover {
            box-shadow: 0 16px 44px rgba(13,148,136,0.16), 0 0 0 1px rgba(13,148,136,0.14);
          }
          .wl:hover .lc-price { color: #0d9488; }
        }

        .wl { transition: opacity 260ms ease, transform 260ms ease,
                          box-shadow 260ms var(--ease, cubic-bezier(0.22,1,0.36,1)); }
        /* Removal: collapse out rather than vanish, so the grid re-flows smoothly */
        .wl--gone { opacity: 0; transform: scale(0.9); pointer-events: none; }
        .wl--sold .lc-img { filter: grayscale(0.55) brightness(0.85); }

        /* Status pill — sits where the feed card's distance chip was (top-left) */
        .wl-badge {
          position: absolute; top: 8px; left: 8px; z-index: 2;
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 9px; border-radius: 100px;
          font-size: 9.5px; font-weight: 900; letter-spacing: 0.02em;
          text-transform: uppercase;
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        }
        .wl-badge::before {
          content: ''; width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0;
        }
        .wl-badge--ok   { background: rgba(13,148,136,0.16); color: #0f766e; }
        .wl-badge--ok::before   { background: #14b8a6; animation: wl-pulse 2s ease-in-out infinite; }
        .wl-badge--drop { background: rgba(22,163,74,0.16); color: #15803d; }
        .wl-badge--drop::before { background: #22c55e; }
        .wl-badge--sold { background: rgba(107,114,128,0.2); color: #4b5563; }
        .wl-badge--sold::before { background: #9ca3af; }
        @keyframes wl-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

        /* Filled heart — remove button, top-right */
        .wl-heart {
          position: absolute; top: 8px; right: 8px; z-index: 3;
          width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer;
          background: rgba(0,0,0,0.5); color: #f43f5e;
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          transition: transform 220ms var(--spring, cubic-bezier(0.34,1.56,0.64,1)), background 200ms ease;
        }
        @media (hover: hover) {
          .wl-heart:hover { background: rgba(244,63,94,0.9); color: #fff; transform: scale(1.12); }
        }
        .wl-heart:active { transform: scale(0.85); }
        .wl-heart:disabled { opacity: 0.5; cursor: default; }
        .wl-heart:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

        /* "Was ₹X" strike, shown on a price drop, in the condition-pill slot */
        .wl-was {
          font-size: 11px; font-weight: 700; color: var(--ink-faint, #9ca3af);
          text-decoration: line-through; letter-spacing: -0.02em;
        }

        @media (prefers-reduced-motion: reduce) {
          .wl, .wl-heart { transition: none !important; }
          .wl-badge--ok::before { animation: none !important; }
          .wl-heart:hover, .wl-heart:active { transform: none !important; }
        }

      `}</style>


      <div
        className={`lc wl${gone ? " wl--gone" : ""}${isSold ? " wl--sold" : ""}`}
        style={{ animationDelay: `${(index % 12) * 40}ms` }}
      >
        <Link href={href} className="lc-photo" aria-label={entry.title}>
          {entry.coverPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={entry.coverPhotoUrl} alt={entry.title} className="lc-img" />
          ) : (
            <div className="lc-noimg">📦</div>
          )}
          <span className="lc-sheen" aria-hidden="true" />
          <span className="lc-scrim" aria-hidden="true" />
          <span className={`wl-badge wl-badge--${badgeKind}`}>{badgeLabel}</span>
        </Link>

        {/* Filled heart — removes the item. Sibling of the photo Link, never nested. */}
        <button
          type="button"
          onClick={removeFromWishlist}
          disabled={removing}
          className="wl-heart"
          aria-label="Remove from saved"
          title="Remove from saved"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        <Link href={href} className="lc-body">
          <span className="lc-top">
            <span className="lc-price">
              ₹{entry.currentPrice.toLocaleString("en-IN")}
              {entry.listingType === "rent" && <em>/mo</em>}
            </span>
            {isDrop && (
              <span className="wl-was">₹{entry.priceAtSave.toLocaleString("en-IN")}</span>
            )}
          </span>

          <span className="lc-title">{entry.title}</span>

          <span className="lc-rule" aria-hidden="true" />

          <span className="lc-foot">
            <span className="lc-row">
              <svg className="lc-pin" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
              <span className="lc-loc">{entry.locality || "Nearby"}</span>
            </span>
            <span className="lc-row">
              <span className="lc-time">Saved {formatRelativeDate(entry.savedAt)}</span>
            </span>
          </span>
        </Link>
      </div>
    </>
  );
}