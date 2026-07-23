"use client";

/**
 * MyListingCard — the seller's view of their own listing.
 *
 * The visual layer here is a straight clone of the homepage feed card
 * (components/feed/ListingCard.tsx): same 5:4 photo, price-leads-title, condition
 * pill, hairline that fills on hover, the nine-part hover choreography, the whole
 * thing. The two cards had drifted into two different designs; now the seller
 * sees exactly what buyers see, plus the controls only they get.
 *
 * What's added on top of the feed card:
 *   - a status ribbon (Active / Sold / Draft …) top-left
 *   - a ⋮ menu top-right with Edit, Mark as sold, and Delete
 *   - the SoldStamp gavel animation when a listing is marked sold
 *
 * What was removed: the Reactivate action. A sold listing stays sold; bringing it
 * back was never a real workflow and just crowded the menu.
 *
 * The distance chip and wishlist heart from the feed card are gone — a seller
 * doesn't need directions to their own item or a way to wishlist it.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";
import { syncListingToSearch } from "@/lib/client/syncSearch";
import { SoldStamp } from "@/components/ui/SoldStamp";
import { EditListingModal } from "@/components/listings/EditListingModal";
import type { Listing } from "@/types";

type MyListingRow = Listing & {
  listing_photos: { url: string; sort_order: number }[];
  listing_attributes: { id: string; key: string; value: string | null }[];
  product_types: { name: string; question_schema: unknown } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot?: string }> = {
  active:  { label: "Active",       color: "#16a34a", bg: "rgba(22,163,74,0.16)",  dot: "#16a34a" },
  sold:    { label: "Sold",         color: "#4b5563", bg: "rgba(107,114,128,0.16)" },
  expired: { label: "Expired",      color: "#b45309", bg: "rgba(217,119,6,0.16)" },
  flagged: { label: "Under review", color: "#dc2626", bg: "rgba(239,68,68,0.16)" },
  draft:   { label: "Draft",        color: "#b45309", bg: "rgba(217,119,6,0.16)" },
  removed: { label: "Removed",      color: "#6b7280", bg: "rgba(156,163,175,0.16)" },
};

const POPULAR_VIEWS = 50;
const FRESH_HOURS = 24;

type Props = { listing: MyListingRow; index?: number; layout?: "grid" | "list" };

export function MyListingCard({ listing, index = 0, layout = "grid" }: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [justSold, setJustSold] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const coverPhoto = [...listing.listing_photos].sort((a, b) => a.sort_order - b.sort_order)[0];
  const coverUrl = coverPhoto?.url ?? null;

  const statusCfg = STATUS_CONFIG[listing.status] ??
    { label: listing.status, color: "#6b7280", bg: "rgba(107,114,128,0.12)" };

  const isNew = listing.condition === "new";
  const href = `/listing/${listing.id}`;

  // The photo badge from the feed card, but it defers to the status ribbon: a
  // "Just listed" flag next to an "Active" ribbon is redundant, and it must never
  // sit over a sold listing.
  const ageHours = (Date.now() - new Date(listing.created_at).getTime()) / 3.6e6;
  const isFresh = ageHours < FRESH_HOURS;
  const isPopular = listing.view_count >= POPULAR_VIEWS;
  const showBadge = listing.status === "active";
  const photoBadge = showBadge
    ? (isPopular ? { label: "Popular", kind: "hot" as const }
       : isFresh  ? { label: "Just listed", kind: "fresh" as const }
       : null)
    : null;

  const isSold = listing.status === "sold";

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      const t = e.target as Node;
      // The menu is portaled to <body>, so it is NOT inside menuRef any more —
      // check it separately or every click on the menu would close it.
      if (menuRef.current?.contains(t)) return;
      if (menuPopRef.current?.contains(t)) return;
      setMenuOpen(false);
      setIsConfirmingDelete(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  // Portals need the document, so guard against the server render.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Where to draw the portaled menu, measured from the ⋮ button.
  const menuPopRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!menuOpen) { setMenuPos(null); return; }

    function place() {
      const btn = menuRef.current?.querySelector("button");
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setMenuPos({
        top: r.bottom + 6,
        // Right-aligned to the button, measured from the viewport's right edge.
        right: Math.max(8, window.innerWidth - r.right),
      });
    }
    place();

    // A fixed-position menu would otherwise drift away from its button as the
    // page moves, so just close it — simpler and less jarring than chasing it.
    const close = () => setMenuOpen(false);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
    };
  }, [menuOpen]);

  async function handleMarkAsSold() {
    setIsUpdating(true);
    setMenuOpen(false);
    const { error } = await supabase.rpc("mark_listing_sold", { p_listing_id: listing.id });
    if (!error) setJustSold(true);
    setIsUpdating(false);
    if (error) { alert(error.message ?? "Failed to mark as sold."); return; }

    // Tell everyone who was chatting about this item. Fire-and-forget, matching
    // how listing-published is sent on the sell flow: the sale is already
    // committed, so a notification problem must never surface as a failure to
    // the seller. Errors are logged server-side.
    fetch("/api/notifications/listing-sold", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id }),
    }).catch(() => {});

    syncListingToSearch(listing.id);
    router.refresh();
  }

  async function handleDelete() {
    if (!isConfirmingDelete) { setIsConfirmingDelete(true); return; }
    setIsUpdating(true);
    setMenuOpen(false);
    await supabase.from("listings").delete().eq("id", listing.id);
    setIsUpdating(false);
    syncListingToSearch(listing.id);
    router.refresh();
  }

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

        /* ── Seller additions on top of the feed card ─────────────── */
        /* Re-scope the feed card's brand vars to INDIGO here, so every accent it
           draws (hover glow, condition pill, the rule that fills, price on hover)
           turns indigo without touching the copied feed styles. Same technique the
           wishlist card uses for teal. */
        .mlc {
          position: relative;
          --brand: #6366f1;
          --brand-tint: #eef2ff;
          --brand-border: #c7d2fe;
          --brand-grad: linear-gradient(135deg, #6366f1, #8b5cf6);
        }
        /* The feed card's hover glow uses an rgba orange literal a variable can't
           reach — redeclare it in indigo. */
        @media (hover: hover) {
          .mlc:hover {
            box-shadow: 0 16px 44px rgba(99,102,241,0.16), 0 0 0 1px rgba(99,102,241,0.14);
          }
          .mlc:hover .lc-price { color: #6366f1; }
        }
        /* A sold listing reads as done: photo desaturates and dims so it recedes
           behind the live ones without disappearing from the grid. */
        .mlc--sold .lc-img { filter: grayscale(0.65) brightness(0.82); }
        .mlc--sold .lc-price { color: var(--ink-faint, #9ca3af); }

        /* Status ribbon — occupies the feed card's top-left (distance) slot */
        .mlc-status {
          position: absolute; top: 8px; left: 8px; z-index: 3;
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 9px; border-radius: var(--r-pill, 100px);
          font-size: 9.5px; font-weight: 900; letter-spacing: 0.03em;
          text-transform: uppercase;
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        }
        .mlc-status-dot { width: 5px; height: 5px; border-radius: 50%; animation: mlc-pulse 2s ease-in-out infinite; }
        @keyframes mlc-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        /* ⋮ menu */
        .mlc-menu-wrap { position: absolute; top: 8px; right: 8px; z-index: 5; }
        .mlc-menu-btn {
          width: 30px; height: 30px; border-radius: 50%; border: none; cursor: pointer;
          background: rgba(0,0,0,0.55); color: #fff;
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          transition: transform 220ms var(--spring), background 200ms ease;
        }
        @media (hover: hover) { .mlc-menu-btn:hover { background: var(--brand, #6366f1); transform: scale(1.1); } }
        .mlc-menu-btn:active { transform: scale(0.9); }
        .mlc-menu-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

        .mlc-menu {
          position: absolute; top: calc(100% + 6px); right: 0;
          min-width: 172px; padding: 6px;
          background: #fff; border-radius: 14px;
          border: 1.5px solid var(--line, #f0f0f0);
          box-shadow: 0 16px 44px rgba(0,0,0,0.18), 0 3px 10px rgba(0,0,0,0.08);
          animation: mlc-menu-in 200ms cubic-bezier(0.22,1,0.36,1) both;
          z-index: 10;
        }
        @keyframes mlc-menu-in { from { opacity: 0; transform: translateY(-6px) scale(0.97); } to { opacity: 1; transform: none; } }

        /* The portaled variant lives on <body>, so it positions against the
           viewport rather than the card, and needs to sit above everything —
           including the floating bottom nav (z-index 100). */
        .mlc-menu--portal {
          position: fixed;
          top: auto; right: auto;
          z-index: 200;
          min-width: 184px;
          padding: 7px;
          border-radius: 16px;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow:
            0 20px 50px rgba(0,0,0,0.20),
            0 4px 12px rgba(0,0,0,0.08);
          transform-origin: top right;
        }
        /* Slightly larger touch targets on phones — 9px padding is fine with a
           mouse, but cramped for a thumb. */
        @media (max-width: 639px) {
          .mlc-menu--portal .mlc-item { padding: 11px 12px; font-size: 13.5px; }
          .mlc-menu--portal { min-width: 196px; }
        }
        .mlc-item {
          display: flex; align-items: center; gap: 9px; width: 100%;
          padding: 9px 10px; border: none; background: transparent;
          border-radius: 9px; cursor: pointer; text-align: left;
          font-size: 12.5px; font-weight: 800; letter-spacing: -0.02em;
          color: var(--ink-soft, #374151);
          transition: background 160ms ease, color 160ms ease, transform 160ms ease;
        }
        @media (hover: hover) { .mlc-item:hover { background: var(--brand-tint, #eef2ff); color: var(--brand, #6366f1); transform: translateX(2px); } }
        .mlc-item:disabled { opacity: 0.5; cursor: default; }
        .mlc-item svg { flex-shrink: 0; }
        .mlc-sep { height: 1px; background: var(--line, #f0f0f0); margin: 5px 4px; }
        .mlc-item--danger { color: #dc2626; }
        @media (hover: hover) { .mlc-item--danger:hover { background: #fef2f2; color: #dc2626; } }
        .mlc-item--confirm { background: #fef2f2; color: #dc2626; }

        /* ── LIST MODE ──
           The grid card's 5:4 photo has no fixed width — fine inside a grid cell,
           but in the dashboard's list view the container is full-width flex, so the
           photo stretched to fill the whole viewport. This is the bug you saw.
           List mode swaps to a fixed horizontal row: a small square photo on the
           left, details on the right, nothing that can expand unbounded. */
        .mlc-list {
          position: relative;
          display: flex; align-items: stretch; gap: 12px;
          width: 100%;
          padding: 10px;
          border-radius: 16px;
          background: #fff;
          border: 1px solid var(--line, #f0f0f0);
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
          transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms ease, border-color 220ms ease;
          animation: ml-stat-in 420ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @media (hover: hover) {
          .mlc-list:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(99,102,241,0.14); border-color: #c7d2fe; }
          .mlc-list:hover .mll-img { transform: scale(1.06); }
          .mlc-list:hover .mll-title { color: #6366f1; }
        }
        .mll-photo {
          position: relative; flex-shrink: 0;
          width: 96px; height: 96px; border-radius: 12px; overflow: hidden;
          background: #f3f4f6; text-decoration: none;
          display: block;
        }
        @media (min-width: 640px) { .mll-photo { width: 116px; height: 116px; } }
        .mll-img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 320ms ease; }
        .mll-noimg { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 28px; }
        .mll-status {
          position: absolute; top: 5px; left: 5px;
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 7px; border-radius: 100px;
          font-size: 8.5px; font-weight: 900; letter-spacing: 0.03em; text-transform: uppercase;
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        }
        .mll-status-dot { width: 4px; height: 4px; border-radius: 50%; }
        .mll-sold .mll-img { filter: grayscale(0.6) brightness(0.84); }

        .mll-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; text-decoration: none; padding-right: 4px; }
        .mll-price { font-size: 17px; font-weight: 900; letter-spacing: -0.04em; color: var(--ink, #1a1a1a); font-variant-numeric: tabular-nums; line-height: 1; }
        .mll-price em { font-style: normal; font-size: 0.62em; font-weight: 700; color: var(--ink-faint, #9ca3af); }
        .mll-title { font-size: 13.5px; font-weight: 700; letter-spacing: -0.02em; color: var(--ink, #1a1a1a); margin: 4px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 200ms ease; }
        .mll-meta { font-size: 11px; font-weight: 600; color: var(--ink-faint, #9ca3af); margin-top: 5px; display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
        .mll-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: currentColor; opacity: 0.5; }

        .mll-actions { flex-shrink: 0; display: flex; align-items: center; }
        @media (prefers-reduced-motion: reduce) {
          .mlc-list, .mll-img { animation: none !important; transition: none !important; }
          .mlc-list:hover { transform: none !important; }
        }

        /* Sold stamp over the photo */
        .mlc-stamp {
          position: absolute; top: 0; left: 0; right: 0;
          aspect-ratio: 5 / 4; z-index: 4;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
        }
        @container (min-width: 300px) { .mlc-stamp { aspect-ratio: 9 / 8; } }

        @media (prefers-reduced-motion: reduce) {
          .mlc-status-dot, .mlc-menu { animation: none !important; }
          .mlc-menu-btn, .mlc-item { transition: none !important; }
          .mlc-menu-btn:hover, .mlc-menu-btn:active, .mlc-item:hover { transform: none !important; }
        }

      `}</style>


      {layout === "list" ? (
        <div className={`mlc-list${isSold ? " mll-sold" : ""}`} style={{ animationDelay: `${(index % 12) * 40}ms` }}>
          <Link href={href} className="mll-photo" aria-label={listing.title}>
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={listing.title}
                fill
                /* Fixed 96px thumbnail — no responsive variation needed. */
                sizes="96px"
                className="mll-img"
                style={{ objectFit: "cover" }}
              />
            ) : (
              <div className="mll-noimg">📦</div>
            )}
            <span className="mll-status" style={{ color: statusCfg.color, background: statusCfg.bg }}>
              {statusCfg.dot && <span className="mll-status-dot" style={{ background: statusCfg.dot }} />}
              {statusCfg.label}
            </span>
          </Link>
          <Link href={href} className="mll-body">
            <span className="mll-price">₹{listing.price.toLocaleString("en-IN")}</span>
            <span className="mll-title">{listing.title}</span>
            <span className="mll-meta">
              <span>{isNew ? "New" : "Used"}</span>
              <span className="mll-meta-dot" />
              <span>{listing.locality ?? "Nearby"}</span>
              <span className="mll-meta-dot" />
              <span>{listing.view_count.toLocaleString("en-IN")} views</span>
            </span>
          </Link>
          <div className="mll-actions">
            <div className="mlc-menu-wrap" ref={menuRef} style={{ position: "relative", top: "auto", right: "auto" }}>
              <button type="button" className="mlc-menu-btn" style={{ background: "#f3f4f6", color: "#57534e" }}
                aria-label="Listing options" aria-expanded={menuOpen}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o); setIsConfirmingDelete(false); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
              </button>
              {menuOpen && (
                <div className="mlc-menu" role="menu">
                  {!isSold && (
                    <button type="button" className="mlc-item" role="menuitem" disabled={isUpdating}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setIsEditOpen(true); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                    Edit
                  </button>
                  )}
                  {!isSold && (
                    <button type="button" className="mlc-item" role="menuitem" disabled={isUpdating}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMarkAsSold(); }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                      Mark as sold
                    </button>
                  )}
                  <div className="mlc-sep" />
                  <button type="button" className={`mlc-item mlc-item--danger${isConfirmingDelete ? " mlc-item--confirm" : ""}`} role="menuitem" disabled={isUpdating}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                    {isConfirmingDelete ? "Tap again to delete" : "Delete"}
                  </button>
                </div>
              )}
            </div>
          </div>
          {(justSold || isSold) && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }} aria-hidden="true">
              <SoldStamp variant={justSold ? "slam" : "static"} />
            </div>
          )}
        </div>
      ) : (
      <div className={`lc mlc${isSold ? " mlc--sold" : ""}`} style={{ animationDelay: `${(index % 12) * 40}ms` }}>
        <Link href={href} className="lc-photo" aria-label={listing.title}>
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={listing.title}
              fill
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

        {/* Status ribbon — sits where the feed card's distance chip was */}
        <span className="mlc-status" style={{ color: statusCfg.color, background: statusCfg.bg }}>
          {statusCfg.dot && <span className="mlc-status-dot" style={{ background: statusCfg.dot }} />}
          {statusCfg.label}
        </span>

        {/* ⋮ menu — sibling of the photo Link, never nested (invalid <a> in <a>) */}
        <div className="mlc-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="mlc-menu-btn"
            aria-label="Listing options"
            aria-expanded={menuOpen}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o); setIsConfirmingDelete(false); }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
            </svg>
          </button>

          {/* Portaled to <body>. The card sets overflow:hidden so its photo
              corners stay rounded, which also CLIPPED this menu — it was being
              cut off at the card's edge. Rendering it outside the card escapes
              that, and position:fixed keeps it anchored to the button. */}
          {menuOpen && mounted && menuPos && createPortal(
            <div
              ref={menuPopRef}
              className="mlc-menu mlc-menu--portal"
              role="menu"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              {!isSold && (
                <button type="button" className="mlc-item" role="menuitem" disabled={isUpdating}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setIsEditOpen(true); }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                Edit
              </button>
              )}

              {!isSold && (
                <button type="button" className="mlc-item" role="menuitem" disabled={isUpdating}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleMarkAsSold(); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  Mark as sold
                </button>
              )}

              <div className="mlc-sep" />

              <button type="button" className={`mlc-item mlc-item--danger${isConfirmingDelete ? " mlc-item--confirm" : ""}`} role="menuitem" disabled={isUpdating}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                {isConfirmingDelete ? "Tap again to delete" : "Delete"}
              </button>
            </div>,
            document.body
          )}
        </div>

        {/* The gavel stamp, over the photo, when marked sold */}
        {(justSold || isSold) && (
          <div className="mlc-stamp" aria-hidden="true">
            <SoldStamp variant={justSold ? "slam" : "static"} />
          </div>
        )}

        <Link href={href} className="lc-body">
          <span className="lc-top">
            <span className="lc-price">₹{listing.price.toLocaleString("en-IN")}</span>
            <span className={`lc-cond lc-cond--${isNew ? "new" : "used"}`}>{isNew ? "New" : "Used"}</span>
          </span>

          <span className="lc-title">{listing.title}</span>

          <span className="lc-rule" aria-hidden="true" />

          <span className="lc-foot">
            <span className="lc-row">
              <svg className="lc-pin" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" /></svg>
              <span className="lc-loc">{listing.locality ?? "Nearby"}</span>
            </span>
            <span className="lc-row">
              <span className="lc-views">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                {listing.view_count.toLocaleString("en-IN")}
              </span>
              <span className="lc-sep" aria-hidden="true">·</span>
              <span className="lc-time">{formatRelativeDate(listing.created_at)}</span>
            </span>
          </span>
        </Link>
      </div>
      )}

      {isEditOpen && (
        <EditListingModal
          listing={listing}
          onClose={() => setIsEditOpen(false)}
          onSaved={() => { setIsEditOpen(false); syncListingToSearch(listing.id); router.refresh(); }}
        />
      )}
    </>
  );
}