"use client";

import { useEffect, useRef, useState } from "react";
import { SoldStamp } from "@/components/ui/SoldStamp";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";
import { syncListingToSearch } from "@/lib/client/syncSearch";
import { EditListingModal } from "@/components/listings/EditListingModal";
import type { Listing } from "@/types";

type MyListingRow = Listing & {
  listing_photos: { url: string; sort_order: number }[];
  listing_attributes: { id: string; key: string; value: string | null }[];
  product_types: { name: string; question_schema: unknown } | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot?: string }> = {
  active:  { label: "Active",       color: "#16a34a", bg: "rgba(22,163,74,0.15)",  dot: "#16a34a" },
  sold:    { label: "Sold",         color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  expired: { label: "Expired",      color: "#d97706", bg: "rgba(217,119,6,0.15)" },
  flagged: { label: "Under review", color: "#dc2626", bg: "rgba(239,68,68,0.15)" },
  draft:   { label: "Draft",        color: "#d97706", bg: "rgba(217,119,6,0.15)" },
  removed: { label: "Removed",      color: "#9ca3af", bg: "rgba(156,163,175,0.15)" },
};

type Props = { listing: MyListingRow; layout?: "grid" | "list" };

export function MyListingCard({ listing, layout = "grid" }: Props) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  // True only for the moment right after the user marks this sold — drives the
  // one-off gavel animation. Already-sold listings render the static stamp.
  const [justSold, setJustSold] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const coverPhoto = [...listing.listing_photos]
    .sort((a, b) => a.sort_order - b.sort_order)[0];

  const statusCfg = STATUS_CONFIG[listing.status] ??
    { label: listing.status, color: "#6b7280", bg: "rgba(107,114,128,0.12)" };

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setIsConfirmingDelete(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  async function handleMarkAsSold() {
    setIsUpdating(true);
    setMenuOpen(false);
    const { error } = await supabase.rpc("mark_listing_sold", { p_listing_id: listing.id });
    if (!error) setJustSold(true);
    setIsUpdating(false);
    if (error) { alert(error.message ?? "Failed to mark as sold."); return; }
    syncListingToSearch(listing.id);
    router.refresh();
  }

  async function handleReactivate() {
    setIsUpdating(true);
    setMenuOpen(false);
    await supabase.from("listings").update({ status: "active" }).eq("id", listing.id);
    setIsUpdating(false);
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
        .mlc-wrap {
          position: relative; width: 100%;
          border-radius: 16px; overflow: hidden;
          background: white;
          border: 1px solid #ebebeb;
          transition: transform 260ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 260ms ease;
          cursor: pointer;
          /* Flex column so text area stretches to fill — ensures identical card heights */
          display: flex; flex-direction: column; height: 100%;
        }
        @media (hover: hover) {
          .mlc-wrap:hover {
            transform: translateY(-5px);
            box-shadow: 0 16px 48px rgba(0,0,0,0.13), 0 0 0 1px rgba(234,88,12,0.1);
          }
          .mlc-wrap:hover .mlc-img { transform: scale(1.07); }
          .mlc-wrap:hover .mlc-price { color: #ea580c; }
        }
        .mlc-wrap:active { transform: scale(0.97); }
        .mlc-img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 360ms ease-out;
        }
        /* Quick-actions overlay (Netflix hover pattern) */
        .mlc-overlay {
          position: absolute; bottom: 0; left: 0; right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.3) 60%, transparent 100%);
          padding: 28px 8px 8px;
          display: flex; gap: 6px; justify-content: flex-end;
          opacity: 0; transform: translateY(6px);
          transition: opacity 200ms ease, transform 200ms ease;
          pointer-events: none;
        }
        .mlc-overlay-btn {
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(255,255,255,0.9); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 150ms ease, transform 150ms ease;
          pointer-events: all;
        }
        .mlc-overlay-btn:hover { background: white; transform: scale(1.1); }
        @media (hover: hover) {
          .mlc-wrap:hover .mlc-overlay { opacity: 1; transform: translateY(0); }
        }

        /* List mode overrides */
        .mlc-list { display: flex; flex-direction: row; align-items: stretch; min-height: 90px; }
        .mlc-list .mlc-photo-wrap { width: 90px !important; flex-shrink: 0; aspect-ratio: unset !important; }
        .mlc-list .mlc-text { flex: 1; display: flex; align-items: center; gap: 16px; padding: 10px 12px; }
        .mlc-list .mlc-title { font-size: 13px !important; -webkit-line-clamp: 1 !important; }
        .mlc-list .mlc-bottom-bar { display: none; }
        @keyframes dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .dot-pulse { animation: dot-pulse 2s ease infinite; }
        .kebab-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          min-width: 164px;
          background: white;
          border-radius: 14px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08);
          border: 1px solid rgba(0,0,0,0.06);
          overflow: hidden;
          z-index: 50;
          animation: menu-in 150ms cubic-bezier(0.22,1,0.36,1) both;
          transform-origin: top right;
        }
        @keyframes menu-in {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        .ki {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 16px; font-size: 13px; font-weight: 500;
          cursor: pointer; border: none; background: transparent;
          width: 100%; text-align: left;
          transition: background 120ms ease;
          color: #374151;
        }
        .ki:hover { background: #f9fafb; }
        .ki.danger { color: #dc2626; }
        .ki.danger:hover { background: #fef2f2; }
        @media (prefers-reduced-motion: reduce) {
          .mlc-wrap, .mlc-img, .mlc-price, .dot-pulse, .kebab-menu { animation: none !important; transition-duration: 0ms !important; }
          .mlc-wrap:hover { transform: none; box-shadow: none; }
          .mlc-wrap:hover .mlc-img { transform: none; }
        }
      `}</style>

      <div className={`mlc-wrap${layout === "list" ? " mlc-list" : ""}`} style={{ opacity: isUpdating ? 0.6 : 1 }}>

        {/* Photo */}
        <Link href={`/listing/${listing.id}`} style={{ display: "block", textDecoration: "none", flexShrink: layout === "list" ? 0 : undefined }}>
          <div className="mlc-photo-wrap" style={{ position: "relative", aspectRatio: layout === "list" ? undefined : "1", height: layout === "list" ? "100%" : undefined, overflow: "hidden", background: "#f3f4f6" }}>
            {coverPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPhoto.url} alt={listing.title} className="mlc-img" />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, opacity: 0.25 }}>🛍️</div>
            )}

            {/* Status badge — top left */}
            <div style={{
              position: "absolute", top: 8, left: 8,
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 100,
              background: statusCfg.bg,
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              border: `1px solid ${statusCfg.color}22`,
            }}>
              {statusCfg.dot && (
                <span className="dot-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: statusCfg.dot, display: "block" }} />
              )}
              <span style={{ fontSize: 10, fontWeight: 700, color: statusCfg.color, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {statusCfg.label}
              </span>
            </div>

            {/* SOLD stamp — slams down once on the actual sold action, then
                renders in its landed pose on every subsequent load. */}
            {listing.status === "sold" && layout !== "list" && (
              <SoldStamp variant={justSold ? "slam" : "static"} size={104} />
            )}

            {/* Gradient bottom fade */}
            {layout !== "list" && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 48, background: "linear-gradient(to top, rgba(0,0,0,0.25), transparent)", pointerEvents: "none" }} />
            )}

            {/* Quick-actions overlay */}
            {layout !== "list" && (
              <div className="mlc-overlay">
                <button type="button" className="mlc-overlay-btn" title="View" onClick={e => { e.preventDefault(); e.stopPropagation(); router.push(`/listing/${listing.id}`); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={2} strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button type="button" className="mlc-overlay-btn" title="Edit" onClick={e => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); setIsEditOpen(true); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={2} strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                {listing.status === "active" && (
                  <button type="button" className="mlc-overlay-btn" title="Mark as sold" onClick={e => { e.preventDefault(); e.stopPropagation(); handleMarkAsSold(); }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={2} strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </button>
                )}
                {listing.status === "sold" && (
                  <button type="button" className="mlc-overlay-btn" title="Reactivate" onClick={e => { e.preventDefault(); e.stopPropagation(); handleReactivate(); }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={2} strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </Link>

        {/* Kebab menu — positioned relative to the card */}
        <div ref={menuRef} style={{ position: "absolute", top: 8, right: 8, zIndex: 10 }}>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o); }}
            aria-label="Listing actions"
            style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#374151">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div className="kebab-menu" onClick={(e) => e.stopPropagation()}>
              {/* Edit */}
              <button type="button" className="ki" onClick={() => { setMenuOpen(false); setIsEditOpen(true); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit listing
              </button>

              {listing.status === "active" ? (
                <button type="button" className="ki" onClick={handleMarkAsSold} disabled={isUpdating}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Mark as sold
                </button>
              ) : listing.status === "sold" && (
                <button type="button" className="ki" onClick={handleReactivate} disabled={isUpdating}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Reactivate
                </button>
              )}

              <div style={{ height: 1, background: "#f3f4f6", margin: "2px 0" }} />

              <button type="button" className="ki danger" onClick={handleDelete} disabled={isUpdating}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                {isConfirmingDelete ? "Confirm delete?" : "Delete"}
              </button>
            </div>
          )}
        </div>

        {/* Text content — flex-1 pushes price/meta to bottom consistently */}
        <Link href={`/listing/${listing.id}`} style={{ display: "flex", flexDirection: "column", flex: 1, padding: "10px 12px 12px", textDecoration: "none" }}>
          {/* Title: always reserves 2-line height so short titles don't shrink the card */}
          <p style={{ fontSize: 12, fontWeight: 600, color: "#111", lineHeight: 1.35, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, minHeight: "2.7em", margin: 0 }}>
            {listing.title}
          </p>
          <p className="mlc-price" style={{ marginTop: 4, fontSize: 13, fontWeight: 800, color: "#111", letterSpacing: "-0.02em" }}>
            ₹{Number(listing.price).toLocaleString("en-IN")}
            {listing.listing_type === "rent" && <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>/mo</span>}
          </p>
          {listing.product_types?.name && (
            <p style={{ marginTop: 2, fontSize: 11, color: "#9ca3af", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {listing.product_types.name}
            </p>
          )}
          {/* Date pushed to bottom */}
          <p style={{ marginTop: "auto", paddingTop: 4, fontSize: 10, color: "#c4c4c4" }}>
            {formatRelativeDate(listing.created_at)}
          </p>
        </Link>

        {/* Active: orange accent line at bottom */}
        {listing.status === "active" && (
          <div style={{ height: 3, background: "linear-gradient(90deg, #ea580c, #f97316)", margin: "0 0 0 0" }} />
        )}
      </div>

      {isEditOpen && (
        <EditListingModal
          listing={listing}
          onClose={() => setIsEditOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
}