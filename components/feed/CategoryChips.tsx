"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types";

// ── Preserved exactly as-is ──────────────────────────────────────────
const PREFERRED_ORDER = [
  "electronics-mobiles",
  "vehicles",
  "property-rentals",
  "furniture-home",
  "fashion",
  "jobs",
  "services",
];

const CATEGORY_ACCENT: Record<string, { bg: string; color: string }> = {
  "electronics-mobiles": { bg: "rgba(59,130,246,0.12)",  color: "#3b82f6" },
  "vehicles":            { bg: "rgba(234,88,12,0.12)",   color: "#ea580c" },
  "property-rentals":    { bg: "rgba(16,185,129,0.12)",  color: "#10b981" },
  "furniture-home":      { bg: "rgba(245,158,11,0.12)",  color: "#f59e0b" },
  "fashion":             { bg: "rgba(236,72,153,0.12)",  color: "#ec4899" },
  "jobs":                { bg: "rgba(139,92,246,0.12)",  color: "#8b5cf6" },
  "services":            { bg: "rgba(20,184,166,0.12)",  color: "#14b8a6" },
};
const DEFAULT_ACCENT = { bg: "rgba(107,114,128,0.1)", color: "#6b7280" };

export function CategoryChips() {
  const [supabase] = useState(() => createClient());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Find the currently active category
  const activeCategory = categories.find(
    (c) => pathname === `/category/${c.slug}`
  );

  // ── Preserved fetch + sort logic ────────────────────────────────────
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from("categories").select("*").is("parent_id", null);
      const sorted = (data ?? []).sort((a, b) => {
        const indexA = PREFERRED_ORDER.indexOf(a.slug);
        const indexB = PREFERRED_ORDER.indexOf(b.slug);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
      setCategories(sorted);
      setLoading(false);
    }
    loadCategories();
  }, [supabase]);

  // ── Preserved scroll shadow logic ───────────────────────────────────
  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [categories]);

  // ── Preserved mouse drag-to-scroll ──────────────────────────────────
  const dragState = useRef({ dragging: false, startX: 0, scrollLeft: 0 });
  function onMouseDown(e: React.MouseEvent) {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { dragging: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
    el.style.cursor = "grabbing";
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragState.current.dragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
  }
  function onMouseUp() {
    dragState.current.dragging = false;
    if (scrollRef.current) scrollRef.current.style.cursor = "grab";
  }

  // ── Bottom sheet open/close ─────────────────────────────────────────
  const openSheet = useCallback(() => {
    setSheetOpen(true);
    document.body.style.overflow = "hidden";
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    document.body.style.overflow = "";
    // Restore focus to trigger button
    setTimeout(() => triggerRef.current?.focus(), 50);
  }, []);

  // Escape key closes sheet
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeSheet(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheetOpen, closeSheet]);

  // Cleanup body overflow on unmount
  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  return (
    <>
      <style>{`
        /* ── Desktop chip styles (preserved) ── */
        .cat-chip {
          transition: transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms ease,
                      background 250ms ease, color 200ms ease, border-color 250ms ease;
          position: relative;
        }
        .cat-chip::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 100px;
          padding: 1px;
          background: linear-gradient(135deg, #ea580c, #f97316);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 250ms ease;
          pointer-events: none;
        }
        .cat-chip:hover::before, .cat-chip.active-chip::before { opacity: 1; }
        .cat-chip:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(234,88,12,0.15); border-color: transparent !important; }
        .cat-chip:active { transform: scale(0.97) translateY(0); }
        .cat-chip.active-chip {
          background: linear-gradient(135deg, #ea580c, #f97316) !important;
          color: white !important; border-color: transparent !important;
          box-shadow: 0 4px 16px rgba(234,88,12,0.35);
        }
        .chip-icon { transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1); }
        .cat-chip:hover .chip-icon { transform: scale(1.2) rotate(-8deg); }
        .cat-chip.active-chip .chip-icon { transform: scale(1.1); }
        @keyframes chip-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .chip-enter { animation: chip-in 320ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes skel-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.8; }
        }
        .chip-skeleton { animation: skel-pulse 1.4s ease-in-out infinite; }
        .chip-scroll { cursor: grab; }
        .chip-scroll:active { cursor: grabbing; }
        .chip-scroll::-webkit-scrollbar { display: none; }
        .chip-scroll { scrollbar-width: none; -ms-overflow-style: none; }

        /* ── Mobile trigger button ── */
        .cat-trigger {
          transition: transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms ease;
        }
        .cat-trigger:active { transform: scale(0.97); }
        .chevron { transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1); }
        .chevron.open { transform: rotate(180deg); }

        /* ── Sheet category row ── */
        .sheet-row {
          transition: background 150ms ease;
        }
        .sheet-row:active { background: rgba(234,88,12,0.06) !important; }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .cat-chip, .chip-icon, .chip-enter, .chip-skeleton, .cat-trigger, .chevron {
            animation: none !important; transition-duration: 0ms !important;
          }
          .cat-chip:hover { transform: none; }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════
          DESKTOP — horizontal scroll row, sticky under pill navbar
          Hidden below md, shown at md+
      ════════════════════════════════════════════════════ */}
      <div className="relative hidden md:block"
        style={{
          position: "sticky",
          top: 92,          /* matches layout padding-top for the floating pill */
          zIndex: 40,
          background: "#f8f7f5",   /* matches page bg so chips don't show stacked items behind */
          paddingTop: 8,
          paddingBottom: 8,
          marginTop: -8,    /* cancel the 8px so content below doesn't jump */
        }}
      >
        {canScrollLeft && (
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0, width: 48, zIndex: 2,
            background: "linear-gradient(to right, rgba(250,250,250,1) 30%, transparent)",
            display: "flex", alignItems: "center", paddingLeft: 4, pointerEvents: "none",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </div>
        )}
        {canScrollRight && (
          <div style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 48, zIndex: 2,
            background: "linear-gradient(to left, rgba(250,250,250,1) 30%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 4, pointerEvents: "none",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        )}
        <div
          ref={scrollRef}
          className="chip-scroll"
          style={{
            display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4,
            paddingLeft: 2, paddingRight: 2, scrollSnapType: "x mandatory",
            WebkitOverflowScrolling: "touch",
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          {loading && [80, 100, 90, 110, 85, 95, 75].map((w, i) => (
            <div key={i} className="chip-skeleton" style={{
              width: w, height: 40, borderRadius: 100, background: "#e5e7eb",
              flexShrink: 0, animationDelay: `${i * 80}ms`,
            }} />
          ))}
          {!loading && categories.map((category, i) => {
            const isActive = pathname === `/category/${category.slug}`;
            const accent = CATEGORY_ACCENT[category.slug] ?? DEFAULT_ACCENT;
            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className={`cat-chip chip-enter ${isActive ? "active-chip" : ""}`}
                style={{
                  display: "flex", alignItems: "center", gap: 8, flexShrink: 0,
                  height: 40, padding: "0 16px 0 10px", borderRadius: 100,
                  border: "1px solid #e5e7eb",
                  background: isActive ? undefined : "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                  fontSize: 13, fontWeight: 600,
                  color: isActive ? "white" : "#374151",
                  textDecoration: "none", scrollSnapAlign: "start",
                  animationDelay: `${i * 50}ms`,
                  userSelect: "none", WebkitUserSelect: "none",
                }}
              >
                <span className="chip-icon" aria-hidden="true" style={{
                  width: 26, height: 26, borderRadius: 8, display: "flex",
                  alignItems: "center", justifyContent: "center", fontSize: 14,
                  background: isActive ? "rgba(255,255,255,0.2)" : accent.bg, flexShrink: 0,
                }}>
                  {category.icon}
                </span>
                {category.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MOBILE — pill trigger + bottom sheet
          Shown below md, hidden at md+
      ════════════════════════════════════════════════════ */}
      <div className="md:hidden">
        {/* Trigger pill button */}
        <button
          ref={triggerRef}
          type="button"
          onClick={openSheet}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          className="cat-trigger"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            minHeight: 44,
            padding: "0 16px",
            borderRadius: 100,
            border: `1px solid ${activeCategory ? CATEGORY_ACCENT[activeCategory.slug]?.color ?? "#e5e7eb" : "#e5e7eb"}`,
            background: activeCategory
              ? CATEGORY_ACCENT[activeCategory.slug]?.bg ?? "rgba(255,255,255,0.9)"
              : "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            fontSize: 14,
            fontWeight: 600,
            color: activeCategory
              ? CATEGORY_ACCENT[activeCategory.slug]?.color ?? "#374151"
              : "#374151",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {/* Grid icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ flexShrink: 0, opacity: 0.6 }}>
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>

          {/* Active category or default label */}
          {activeCategory ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
              <span aria-hidden="true">{activeCategory.icon}</span>
              {activeCategory.name}
            </span>
          ) : (
            <span style={{ flex: 1 }}>Categories</span>
          )}

          {/* Animated chevron */}
          <svg
            className={`chevron ${sheetOpen ? "open" : ""}`}
            width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth={2}
            style={{ flexShrink: 0, opacity: 0.5 }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {/* Bottom sheet + backdrop */}
        <AnimatePresence>
          {sheetOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={closeSheet}
                style={{
                  position: "fixed", inset: 0, zIndex: 100,
                  background: "rgba(0,0,0,0.4)",
                  backdropFilter: "blur(2px)",
                  WebkitBackdropFilter: "blur(2px)",
                }}
                aria-hidden="true"
              />

              {/* Sheet */}
              <motion.div
                key="sheet"
                role="dialog"
                aria-modal="true"
                aria-label="Select a category"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 280, mass: 0.8 }}
                style={{
                  position: "fixed",
                  bottom: 0, left: 0, right: 0,
                  zIndex: 101,
                  height: "68vh",
                  background: "white",
                  borderRadius: "20px 20px 0 0",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
                }}
              >
                {/* Drag handle */}
                <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
                  <div style={{ width: 36, height: 4, borderRadius: 100, background: "#e5e7eb" }} />
                </div>

                {/* Sheet header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 20px 12px", flexShrink: 0,
                  borderBottom: "1px solid #f3f4f6",
                }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
                    Categories
                  </p>
                  <button
                    type="button"
                    onClick={closeSheet}
                    aria-label="Close categories"
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      border: "none", background: "#f3f4f6",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.5}>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Category list */}
                <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
                  {/* Skeleton inside sheet */}
                  {loading && [1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="chip-skeleton" style={{
                      margin: "6px 16px", height: 52, borderRadius: 12,
                      background: "#f3f4f6", animationDelay: `${i * 60}ms`,
                    }} />
                  ))}

                  {/* Category rows */}
                  {!loading && categories.map((category, i) => {
                    const isActive = pathname === `/category/${category.slug}`;
                    const accent = CATEGORY_ACCENT[category.slug] ?? DEFAULT_ACCENT;
                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 35 / 1000, duration: 0.25 }}
                      >
                        <Link
                          href={`/category/${category.slug}`}
                          onClick={closeSheet}
                          className="sheet-row"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "0 20px",
                            minHeight: 56,
                            textDecoration: "none",
                            background: isActive ? `${accent.bg}` : "transparent",
                            borderLeft: isActive ? `3px solid ${accent.color}` : "3px solid transparent",
                          }}
                        >
                          {/* Icon backdrop */}
                          <span style={{
                            width: 36, height: 36, borderRadius: 10,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 18, background: accent.bg, flexShrink: 0,
                          }} aria-hidden="true">
                            {category.icon}
                          </span>

                          {/* Name */}
                          <span style={{
                            flex: 1, fontSize: 15, fontWeight: isActive ? 700 : 500,
                            color: isActive ? accent.color : "#374151",
                          }}>
                            {category.name}
                          </span>

                          {/* Active checkmark */}
                          {isActive && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                              stroke={accent.color} strokeWidth={2.5}>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}