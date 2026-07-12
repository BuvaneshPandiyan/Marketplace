"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types";

// ── Preferred display order — extended to 24 categories ──────────────
const PREFERRED_ORDER = [
  "electronics-mobiles",
  "vehicles",
  "property-rentals",
  "furniture-home",
  "fashion",
  "jobs",
  "services",
  "sports-fitness",
  "books-education",
  "pets",
  "kids-baby",
  "beauty-health",
  "home-appliances",
  "computers-laptops",
  "cameras-photography",
  "music-instruments",
  "garden-outdoor",
  "tools-equipment",
  "toys-games",
  "watches-jewellery",
  "food-agriculture",
  "travel-luggage",
  "art-collectibles",
  "health-medical",
];

const CATEGORY_ACCENT: Record<string, { bg: string; color: string; border: string }> = {
  "electronics-mobiles":  { bg: "rgba(59,130,246,0.10)",  color: "#3b82f6", border: "rgba(59,130,246,0.25)"  },
  "vehicles":             { bg: "rgba(234,88,12,0.10)",   color: "#ea580c", border: "rgba(234,88,12,0.25)"   },
  "property-rentals":     { bg: "rgba(16,185,129,0.10)",  color: "#10b981", border: "rgba(16,185,129,0.25)"  },
  "furniture-home":       { bg: "rgba(245,158,11,0.10)",  color: "#f59e0b", border: "rgba(245,158,11,0.25)"  },
  "fashion":              { bg: "rgba(236,72,153,0.10)",  color: "#ec4899", border: "rgba(236,72,153,0.25)"  },
  "jobs":                 { bg: "rgba(139,92,246,0.10)",  color: "#8b5cf6", border: "rgba(139,92,246,0.25)"  },
  "services":             { bg: "rgba(20,184,166,0.10)",  color: "#14b8a6", border: "rgba(20,184,166,0.25)"  },
  "sports-fitness":       { bg: "rgba(34,197,94,0.10)",   color: "#22c55e", border: "rgba(34,197,94,0.25)"   },
  "books-education":      { bg: "rgba(99,102,241,0.10)",  color: "#6366f1", border: "rgba(99,102,241,0.25)"  },
  "pets":                 { bg: "rgba(251,146,60,0.10)",  color: "#fb923c", border: "rgba(251,146,60,0.25)"  },
  "kids-baby":            { bg: "rgba(232,121,249,0.10)", color: "#e879f9", border: "rgba(232,121,249,0.25)" },
  "beauty-health":        { bg: "rgba(244,114,182,0.10)", color: "#f472b6", border: "rgba(244,114,182,0.25)" },
  "home-appliances":      { bg: "rgba(56,189,248,0.10)",  color: "#38bdf8", border: "rgba(56,189,248,0.25)"  },
  "computers-laptops":    { bg: "rgba(100,116,139,0.10)", color: "#64748b", border: "rgba(100,116,139,0.25)" },
  "cameras-photography":  { bg: "rgba(168,85,247,0.10)",  color: "#a855f7", border: "rgba(168,85,247,0.25)"  },
  "music-instruments":    { bg: "rgba(239,68,68,0.10)",   color: "#ef4444", border: "rgba(239,68,68,0.25)"   },
  "garden-outdoor":       { bg: "rgba(74,222,128,0.10)",  color: "#4ade80", border: "rgba(74,222,128,0.25)"  },
  "tools-equipment":      { bg: "rgba(120,113,108,0.10)", color: "#78716c", border: "rgba(120,113,108,0.25)" },
  "toys-games":           { bg: "rgba(251,191,36,0.10)",  color: "#fbbf24", border: "rgba(251,191,36,0.25)"  },
  "watches-jewellery":    { bg: "rgba(217,119,6,0.10)",   color: "#d97706", border: "rgba(217,119,6,0.25)"   },
  "food-agriculture":     { bg: "rgba(132,204,22,0.10)",  color: "#84cc16", border: "rgba(132,204,22,0.25)"  },
  "travel-luggage":       { bg: "rgba(6,182,212,0.10)",   color: "#06b6d4", border: "rgba(6,182,212,0.25)"   },
  "art-collectibles":     { bg: "rgba(249,115,22,0.10)",  color: "#f97316", border: "rgba(249,115,22,0.25)"  },
  "health-medical":       { bg: "rgba(20,184,166,0.10)",  color: "#14b8a6", border: "rgba(20,184,166,0.25)"  },
};
const DEFAULT_ACCENT = { bg: "rgba(107,114,128,0.08)", color: "#6b7280", border: "rgba(107,114,128,0.2)" };

// How many chips show inline on desktop before the "More" dropdown
const INLINE_COUNT = 7;

export function CategoryChips() {
  const [supabase] = useState(() => createClient());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreDropRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const activeCategory = categories.find(c => pathname === `/category/${c.slug}`);
  const inlineChips = categories.slice(0, INLINE_COUNT);
  const moreChips   = categories.slice(INLINE_COUNT);
  const activeIsInMore = moreChips.some(c => pathname === `/category/${c.slug}`);

  // ── Fetch + sort ────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("categories").select("*").is("parent_id", null);
      const sorted = (data ?? []).sort((a, b) => {
        const ai = PREFERRED_ORDER.indexOf(a.slug), bi = PREFERRED_ORDER.indexOf(b.slug);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1; if (bi !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
      setCategories(sorted);
      setLoading(false);
    }
    load();
  }, [supabase]);

  // ── Close "More" dropdown on outside click ──────────────────────────
  useEffect(() => {
    if (!moreOpen) return;
    const fn = (e: MouseEvent) => {
      if (moreDropRef.current?.contains(e.target as Node)) return;
      if (moreBtnRef.current?.contains(e.target as Node)) return;
      setMoreOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [moreOpen]);

  // ── Mobile sheet ───────────────────────────────────────────────────
  const openSheet = useCallback(() => { setSheetOpen(true); document.body.style.overflow = "hidden"; }, []);
  const closeSheet = useCallback(() => { setSheetOpen(false); document.body.style.overflow = ""; setTimeout(() => triggerRef.current?.focus(), 50); }, []);
  useEffect(() => { if (!sheetOpen) return; const fn = (e: KeyboardEvent) => { if (e.key === "Escape") closeSheet(); }; document.addEventListener("keydown", fn); return () => document.removeEventListener("keydown", fn); }, [sheetOpen, closeSheet]);
  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  return (
    <>
      <style>{`
        /* ── Chip base ── */
        .cat-chip {
          display: inline-flex; align-items: center; gap: 7px;
          height: 38px; padding: 0 14px 0 8px; border-radius: 100px;
          font-size: 13px; font-weight: 600; text-decoration: none;
          white-space: nowrap; flex-shrink: 0; user-select: none;
          border: 1.5px solid var(--chip-border, #e5e7eb);
          background: white; color: #374151;
          transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 220ms ease, background 180ms ease,
                      border-color 180ms ease, color 180ms ease;
          position: relative; overflow: hidden;
        }
        .cat-chip::after {
          content:''; position:absolute; inset:0;
          background: linear-gradient(135deg, rgba(255,255,255,0.25), transparent);
          opacity:0; transition: opacity 200ms ease;
        }
        .cat-chip:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.10); border-color: var(--chip-color, #e5e7eb); color: var(--chip-color, #374151); }
        .cat-chip:hover::after { opacity:1; }
        .cat-chip:active { transform: scale(0.96) translateY(0); }
        .cat-chip.active-chip {
          background: var(--chip-color, #ea580c); color: white !important;
          border-color: var(--chip-color, #ea580c) !important;
          box-shadow: 0 4px 18px color-mix(in srgb, var(--chip-color, #ea580c) 40%, transparent);
        }
        .cat-chip.active-chip::after { opacity:1; }
        .chip-icon { width:24px; height:24px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1); }
        .cat-chip:hover .chip-icon { transform: scale(1.2) rotate(-8deg); }
        .cat-chip.active-chip .chip-icon { transform:scale(1.1); background:rgba(255,255,255,0.22) !important; }

        /* ── More button ── */
        .more-btn {
          display:inline-flex; align-items:center; gap:5px;
          height:38px; padding:0 14px; border-radius:100px;
          font-size:13px; font-weight:600; cursor:pointer;
          border:1.5px solid #e5e7eb; background:white; color:#374151;
          transition: all 180ms ease; flex-shrink:0; white-space:nowrap;
        }
        .more-btn:hover { border-color:#ea580c; color:#ea580c; background:#fff7ed; }
        .more-btn.has-active { border-color:#ea580c; color:#ea580c; background:rgba(234,88,12,0.06); }
        .more-btn .chevron-icon { transition: transform 220ms ease; }
        .more-btn.open .chevron-icon { transform: rotate(180deg); }

        /* ── More dropdown ── */
        .more-drop {
          position:absolute; top:calc(100% + 10px); right:0;
          background:white; border-radius:16px; z-index:200;
          box-shadow:0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
          border:1px solid rgba(0,0,0,0.06); overflow:hidden;
          animation: drop-in 160ms cubic-bezier(0.22,1,0.36,1) both;
          transform-origin: top right; min-width:260px;
        }
        @keyframes drop-in { from{opacity:0;transform:scale(0.95) translateY(-6px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .more-item {
          display:flex; align-items:center; gap:12px;
          padding:10px 16px; text-decoration:none; color:#374151;
          font-size:13px; font-weight:500; transition:background 120ms ease;
          border-left:3px solid transparent;
        }
        .more-item:hover { background:#f9f8f6; }
        .more-item.active-item { background:rgba(234,88,12,0.05); border-left-color:var(--chip-color,#ea580c); color:var(--chip-color,#ea580c); font-weight:700; }

        /* ── Entrance animation ── */
        @keyframes chip-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .chip-enter { animation: chip-in 280ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes skel-pulse { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        .chip-skeleton { animation: skel-pulse 1.4s ease-in-out infinite; }

        /* ── Mobile trigger ── */
        .cat-trigger { transition: transform 200ms ease, box-shadow 200ms ease; }
        .cat-trigger:active { transform: scale(0.97); }
        .chevron { transition: transform 280ms cubic-bezier(0.34,1.56,0.64,1); }
        .chevron.open { transform: rotate(180deg); }
        .sheet-row { transition: background 120ms ease; }
        .sheet-row:active { background:rgba(234,88,12,0.06) !important; }

        @media(prefers-reduced-motion:reduce){
          .cat-chip,.chip-icon,.chip-enter,.chip-skeleton,.cat-trigger,.chevron,.more-btn,.more-drop {
            animation:none !important; transition-duration:0ms !important;
          }
          .cat-chip:hover { transform:none; }
        }
      `}</style>

      {/* ════════════════════════════════════════════════════
          DESKTOP — inline chips + "More ▾" dropdown
          Sticky at top:92px, hidden below md
      ════════════════════════════════════════════════════ */}
      <div className="relative hidden md:block"
        style={{ position:"sticky", top:92, zIndex:40, background:"#f8f7f5", paddingTop:8, paddingBottom:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"nowrap", overflowX:"visible" }}>

          {/* Inline chips */}
          {loading && [90,110,85,105,95,80,100].map((w, i) => (
            <div key={i} className="chip-skeleton" style={{ width:w, height:38, borderRadius:100, background:"#e5e7eb", flexShrink:0, animationDelay:`${i*70}ms` }} />
          ))}
          {!loading && inlineChips.map((cat, i) => {
            const isActive = pathname === `/category/${cat.slug}`;
            const acc = CATEGORY_ACCENT[cat.slug] ?? DEFAULT_ACCENT;
            return (
              <Link key={cat.id} href={`/category/${cat.slug}`}
                className={`cat-chip chip-enter${isActive?" active-chip":""}`}
                style={{
                  "--chip-color": acc.color, "--chip-border": acc.border,
                  animationDelay:`${i*40}ms`,
                } as React.CSSProperties}>
                <span className="chip-icon" style={{ background: isActive?"rgba(255,255,255,0.22)":acc.bg }}>
                  {cat.icon}
                </span>
                {cat.name}
              </Link>
            );
          })}

          {/* ── "More ▾" dropdown button ── */}
          {!loading && moreChips.length > 0 && (
            <div style={{ position:"relative", flexShrink:0 }}>
              <button ref={moreBtnRef} type="button"
                className={`more-btn${moreOpen?" open":""}${activeIsInMore?" has-active":""}`}
                onClick={() => setMoreOpen(o => !o)}>
                {activeIsInMore ? (
                  <>
                    <span aria-hidden="true">{activeCategory?.icon}</span>
                    {activeCategory?.name}
                  </>
                ) : (
                  <>More <span style={{ opacity:0.6, fontSize:11 }}>+{moreChips.length}</span></>
                )}
                <svg className="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {moreOpen && (
                <div ref={moreDropRef} className="more-drop">
                  <div style={{ padding:"10px 16px 8px", fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#9ca3af" }}>
                    All Categories
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", paddingBottom:8 }}>
                    {moreChips.map(cat => {
                      const isActive = pathname === `/category/${cat.slug}`;
                      const acc = CATEGORY_ACCENT[cat.slug] ?? DEFAULT_ACCENT;
                      return (
                        <Link key={cat.id} href={`/category/${cat.slug}`}
                          className={`more-item${isActive?" active-item":""}`}
                          style={{ "--chip-color": acc.color } as React.CSSProperties}
                          onClick={() => setMoreOpen(false)}>
                          <span style={{ width:28, height:28, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, background:acc.bg, flexShrink:0 }}>
                            {cat.icon}
                          </span>
                          <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{cat.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MOBILE — pill trigger + bottom sheet (unchanged)
      ════════════════════════════════════════════════════ */}
      <div className="md:hidden">
        <button ref={triggerRef} type="button" onClick={openSheet}
          aria-haspopup="dialog" aria-expanded={sheetOpen}
          className="cat-trigger"
          style={{
            display:"flex", alignItems:"center", gap:8, width:"100%", minHeight:44,
            padding:"0 16px", borderRadius:100,
            border:`1px solid ${activeCategory ? CATEGORY_ACCENT[activeCategory.slug]?.border ?? "#e5e7eb" : "#e5e7eb"}`,
            background: activeCategory ? CATEGORY_ACCENT[activeCategory.slug]?.bg ?? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.9)",
            backdropFilter:"blur(8px)", WebkitBackdropFilter:"blur(8px)",
            boxShadow:"0 2px 8px rgba(0,0,0,0.06)", fontSize:14, fontWeight:600,
            color: activeCategory ? CATEGORY_ACCENT[activeCategory.slug]?.color ?? "#374151" : "#374151",
            cursor:"pointer", textAlign:"left",
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ flexShrink:0, opacity:0.5 }}>
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          {activeCategory ? (
            <span style={{ display:"flex", alignItems:"center", gap:6, flex:1 }}>
              <span aria-hidden="true">{activeCategory.icon}</span>{activeCategory.name}
            </span>
          ) : <span style={{ flex:1 }}>Categories</span>}
          <svg className={`chevron ${sheetOpen ? "open" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ flexShrink:0, opacity:0.5 }}>
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </button>

        <AnimatePresence>
          {sheetOpen && (
            <>
              <motion.div key="backdrop" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.2 }}
                onClick={closeSheet}
                style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(2px)", WebkitBackdropFilter:"blur(2px)" }}
                aria-hidden="true" />
              <motion.div key="sheet" role="dialog" aria-modal="true" aria-label="Select a category"
                initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
                transition={{ type:"spring", damping:28, stiffness:280, mass:0.8 }}
                style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:101, height:"68vh", background:"white", borderRadius:"20px 20px 0 0", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 -8px 40px rgba(0,0,0,0.15)" }}>
                <div style={{ display:"flex", justifyContent:"center", paddingTop:12, paddingBottom:4, flexShrink:0 }}>
                  <div style={{ width:36, height:4, borderRadius:100, background:"#e5e7eb" }} />
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 20px 12px", flexShrink:0, borderBottom:"1px solid #f3f4f6" }}>
                  <p style={{ fontSize:16, fontWeight:700, color:"#111827", margin:0 }}>Categories</p>
                  <button type="button" onClick={closeSheet} aria-label="Close categories"
                    style={{ width:32, height:32, borderRadius:"50%", border:"none", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <div style={{ overflowY:"auto", flex:1, padding:"8px 0" }}>
                  {loading && [1,2,3,4,5].map(i => (
                    <div key={i} className="chip-skeleton" style={{ margin:"6px 16px", height:52, borderRadius:12, background:"#f3f4f6", animationDelay:`${i*60}ms` }} />
                  ))}
                  {!loading && categories.map((cat, i) => {
                    const isActive = pathname === `/category/${cat.slug}`;
                    const acc = CATEGORY_ACCENT[cat.slug] ?? DEFAULT_ACCENT;
                    return (
                      <motion.div key={cat.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*30/1000, duration:0.22 }}>
                        <Link href={`/category/${cat.slug}`} onClick={closeSheet} className="sheet-row"
                          style={{ display:"flex", alignItems:"center", gap:14, padding:"0 20px", minHeight:52, textDecoration:"none", background: isActive ? acc.bg : "transparent", borderLeft: isActive ? `3px solid ${acc.color}` : "3px solid transparent" }}>
                          <span style={{ width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, background:acc.bg, flexShrink:0 }} aria-hidden="true">{cat.icon}</span>
                          <span style={{ flex:1, fontSize:15, fontWeight:isActive?700:500, color:isActive?acc.color:"#374151" }}>{cat.name}</span>
                          {isActive && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={acc.color} strokeWidth={2.5}><path d="M20 6L9 17l-5-5"/></svg>}
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