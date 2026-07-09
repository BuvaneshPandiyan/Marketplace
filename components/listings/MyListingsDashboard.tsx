"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { MyListingCard } from "@/components/listings/MyListingCard";

type RawListing = {
  id: string; status: string; title: string; price: number;
  listing_type: string; created_at: string;
  listing_photos: { url: string; sort_order: number }[];
  product_types: { name: string; question_schema: unknown } | null;
  listing_attributes: { id: string; key: string; value: string | null }[];
  [key: string]: unknown;
};
type Props = { listings: RawListing[] };

const TABS = [
  { label: "All",    value: null     },
  { label: "Active", value: "active" },
  { label: "Sold",   value: "sold"   },
  { label: "Draft",  value: "draft"  },
];

// SVG stat icons — matched stroke weight to empty-state icon
const STAT_ICONS = {
  total: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  active: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>
    </svg>
  ),
  sold: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <circle cx="7" cy="7" r="1.5" fill={color} stroke="none"/>
    </svg>
  ),
  draft: (color: string) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
};

const STAT_COLORS = {
  total:  { color: "#ea580c", bg: "rgba(234,88,12,0.15)"  },
  active: { color: "#16a34a", bg: "rgba(22,163,74,0.15)"  },
  sold:   { color: "#6b7280", bg: "rgba(107,114,128,0.15)"},
  draft:  { color: "#d97706", bg: "rgba(217,119,6,0.15)"  },
};

// Time-aware greeting
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Animated count-up
function CountUp({ target, duration = 1100 }: { target: number; duration?: number }) {
  const [n, setN] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || target === 0) { setN(target); return; }
    const t0 = performance.now();
    function tick(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      setN(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, target, duration]);
  return <span ref={ref}>{n}</span>;
}

// Grain texture data URI
const GRAIN_URI = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='1'/></svg>")`;

export function MyListingsDashboard({ listings }: Props) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [sort, setSort] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  // Blob parallax — zero offset when reduced motion
  const blob1Y = useTransform(scrollY, [0, 400], prefersReducedMotion ? [0, 0] : [0, -40]);
  const blob2Y = useTransform(scrollY, [0, 400], prefersReducedMotion ? [0, 0] : [0, -20]);
  const blob3Y = useTransform(scrollY, [0, 400], prefersReducedMotion ? [0, 0] : [0, -60]);

  const counts = {
    total:  listings.length,
    active: listings.filter(l => l.status === "active").length,
    sold:   listings.filter(l => l.status === "sold").length,
    draft:  listings.filter(l => l.status === "draft").length,
  };

  const STATS = [
    { key: "total",  label: "Total listings" },
    { key: "active", label: "Active"         },
    { key: "sold",   label: "Sold"           },
    { key: "draft",  label: "Draft"          },
  ] as const;

  // Filter then sort — no new fetching
  const filtered = activeTab ? listings.filter(l => l.status === activeTab) : listings;
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "oldest":     return +new Date(a.created_at) - +new Date(b.created_at);
      case "price_high": return b.price - a.price;
      case "price_low":  return a.price - b.price;
      default:           return +new Date(b.created_at) - +new Date(a.created_at);
    }
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f5" }}>
      <style>{`
        /* Sell button shimmer */
        .sell-btn-dash { position: relative; overflow: hidden; transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms ease; }
        .sell-btn-dash::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent); transform: translateX(-100%); transition: transform 0s; }
        .sell-btn-dash:hover { transform: scale(1.04); box-shadow: 0 8px 32px rgba(234,88,12,0.55); }
        .sell-btn-dash:hover::after { transform: translateX(100%); transition: transform 0.45s ease; }
        .sell-btn-dash:active { transform: scale(0.96); }

        /* Stat card hover */
        .stat-card { transition: transform 220ms ease, box-shadow 220ms ease; }
        @media (hover: hover) { .stat-card:hover { transform: translateY(-3px); box-shadow: 0 14px 40px rgba(0,0,0,0.22); } }

        /* Tab button */
        .tab-btn { border: none; background: none; cursor: pointer; font-size: 14px; font-weight: 500; padding: 8px 20px; border-radius: 100px; white-space: nowrap; position: relative; z-index: 1; transition: color 180ms ease; }

        /* Hero gradient animation */
        @keyframes grad-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .hero-grad { background: linear-gradient(135deg,#1a0a00,#3d1500,#ea580c,#f97316,#3d1500,#1a0a00); background-size:400% 400%; animation: grad-shift 12s ease infinite; }

        /* Empty-state pulse */
        @keyframes ring-pulse { 0%,100%{transform:scale(1);opacity:.4} 50%{transform:scale(1.15);opacity:.1} }
        .ring-pulse { animation: ring-pulse 2.4s ease infinite; }

        /* prefers-reduced-motion — extend this block, don't add new ones */
        @media (prefers-reduced-motion: reduce) {
          .sell-btn-dash, .stat-card, .tab-btn, .ring-pulse { animation: none !important; transition-duration: 0ms !important; }
          .sell-btn-dash:hover, .stat-card:hover { transform: none !important; box-shadow: none !important; }
          .hero-grad { animation: none !important; }
        }
      `}</style>

      {/* ── HERO ── */}
      <div ref={heroRef} className="hero-grad" style={{ padding: "36px 0 32px", position: "relative", overflow: "hidden" }}>

        {/* Grain texture overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage: GRAIN_URI, backgroundSize: "200px 200px",
          opacity: 0.04, mixBlendMode: "overlay",
        }} />

        {/* Blurred mesh-gradient blobs — softer than the old crisp circles */}
        <motion.div style={{ y: blob1Y, position: "absolute", top: -80, right: "10%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.35), transparent 70%)", filter: "blur(64px)", pointerEvents: "none" }} />
        <motion.div style={{ y: blob2Y, position: "absolute", bottom: -60, left: "5%",  width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(239,68,68,0.25), transparent 70%)",  filter: "blur(72px)", pointerEvents: "none" }} />
        <motion.div style={{ y: blob3Y, position: "absolute", top: "20%", left: "45%",  width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)", filter: "blur(48px)", pointerEvents: "none" }} />

        <div className="mx-auto max-w-[1600px]" style={{ padding: "0 16px", position: "relative", zIndex: 1 }}>
          {/* Greeting + title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: counts.total > 0 ? 28 : 0 }}>
            <div>
              <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
                {getGreeting()}, seller
              </motion.p>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                style={{ fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 900, color: "white", lineHeight: 1.1, letterSpacing: "-0.03em", margin: 0 }}>
                My Listings
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
                style={{ marginTop: 5, fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                {counts.total === 0 ? "Post your first listing to get started" : `${counts.total} listing${counts.total !== 1 ? "s" : ""} in your store`}
              </motion.p>
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.22, type: "spring" }}>
              <Link href="/sell" className="sell-btn-dash"
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "11px 22px", borderRadius: 100, background: "white", color: "#ea580c", fontWeight: 700, fontSize: 13, textDecoration: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.22)", whiteSpace: "nowrap" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
                Post Ad
              </Link>
            </motion.div>
          </div>

          {/* ── STAT CARDS ── */}
          {counts.total > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
              {STATS.map(({ key, label }, i) => {
                const { color, bg } = STAT_COLORS[key];
                const val = counts[key];
                return (
                  <motion.div key={key} className="stat-card"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 + i * 0.06 }}
                    style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.18)", padding: "14px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
                    {/* Icon with bounce entrance + tinted circular backdrop */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.18, 1] }}
                      transition={{ delay: 0.55 + i * 0.08, duration: 0.4, ease: "easeOut" }}
                      style={{ width: 36, height: 36, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}
                    >
                      {STAT_ICONS[key](color)}
                    </motion.div>
                    <div style={{ fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 900, color: "white", letterSpacing: "-0.03em", lineHeight: 1 }}>
                      <CountUp target={val} duration={800 + i * 130} />
                    </div>
                    <div style={{ marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{label}</div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="mx-auto max-w-[1600px] px-4 md:px-8" style={{ paddingTop: 24, paddingBottom: 48 }}>

        {counts.total > 0 && (
          <>
            {/* Filter tabs + controls row */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 16 }}>
              {/* Sliding tab row */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}
                style={{ display: "flex", gap: 4, background: "#f0efed", borderRadius: 100, padding: 4, flex: "1 1 auto" }}>
                {TABS.map(({ label, value }) => {
                  const isActive = activeTab === value;
                  const count = value === null ? counts.total : counts[value as keyof typeof counts];
                  return (
                    <button key={label} type="button" className="tab-btn"
                      onClick={() => setActiveTab(value)}
                      style={{ color: isActive ? "white" : "#6b7280", flex: "1 1 auto" }}>
                      {/* Shared sliding background via layoutId */}
                      {isActive && (
                        <motion.div
                          layoutId="active-tab-bg"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          style={{ position: "absolute", inset: 0, borderRadius: 100, zIndex: -1, background: "linear-gradient(135deg, #ea580c, #f97316)", boxShadow: "0 4px 14px rgba(234,88,12,0.38)" }}
                        />
                      )}
                      {label}
                      {count > 0 && (
                        <span style={{ marginLeft: 5, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: "50%", fontSize: 10, fontWeight: 700, background: isActive ? "rgba(255,255,255,0.25)" : "#e5e7eb", color: isActive ? "white" : "#374151" }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>

              {/* Sort + view-mode controls — stacked on own line on mobile via flex-wrap */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.48 }}
                style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {/* Sort dropdown */}
                <select value={sort} onChange={e => setSort(e.target.value)}
                  style={{ fontSize: 12, fontWeight: 500, color: "#374151", background: "white", border: "1px solid #e5e7eb", borderRadius: 100, padding: "6px 28px 6px 12px", appearance: "none", WebkitAppearance: "none", cursor: "pointer", outline: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7280'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="price_high">Price: high → low</option>
                  <option value="price_low">Price: low → high</option>
                </select>

                {/* Grid / List view toggle */}
                {(["grid", "list"] as const).map(mode => (
                  <button key={mode} type="button" onClick={() => setViewMode(mode)}
                    title={mode === "grid" ? "Grid view" : "List view"}
                    style={{ width: 32, height: 32, borderRadius: 100, border: "1px solid #e5e7eb", background: viewMode === mode ? "#111" : "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "background 150ms ease, border-color 150ms ease" }}>
                    {mode === "grid" ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={viewMode === "grid" ? "white" : "#6b7280"} strokeWidth={2}>
                        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={viewMode === "list" ? "white" : "#6b7280"} strokeWidth={2} strokeLinecap="round">
                        <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                      </svg>
                    )}
                  </button>
                ))}
              </motion.div>
            </div>
          </>
        )}

        {/* Grid or empty */}
        {counts.total === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4, type: "spring" }}
            style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 28px" }}>
              <div className="ring-pulse" style={{ position: "absolute", inset: -24, borderRadius: "50%", border: "2px solid #ea580c", opacity: 0.2 }} />
              <div className="ring-pulse" style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "1px solid #ea580c", opacity: 0.15, animationDelay: "0.4s" }} />
              <div style={{ width: 120, height: 120, borderRadius: "50%", background: "linear-gradient(135deg, #fff7ed, #ffedd5)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(234,88,12,0.15)", boxShadow: "0 8px 32px rgba(234,88,12,0.12)" }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              </div>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 8 }}>Your store is empty</h2>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 28, maxWidth: 300, margin: "0 auto 28px" }}>List something for sale or rent — it takes under 2 minutes.</p>
            <Link href="/sell" className="sell-btn-dash"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 100, background: "linear-gradient(135deg, #ea580c, #f97316)", color: "white", fontWeight: 700, fontSize: 14, textDecoration: "none", boxShadow: "0 6px 24px rgba(234,88,12,0.4)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
              Post your first listing
            </Link>
          </motion.div>
        ) : sorted.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "60px 24px", color: "#9ca3af", fontSize: 14 }}>
            No {activeTab} listings yet.
          </motion.div>
        ) : (
          <motion.div layout
            className={viewMode === "grid"
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 lg:gap-6"
              : "flex flex-col gap-3"}>
            <AnimatePresence mode="popLayout">
              {sorted.map((listing, i) => (
                <motion.div key={listing.id} layout
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.3), type: "spring", stiffness: 260, damping: 22 }}>
                  <MyListingCard listing={listing as Parameters<typeof MyListingCard>[0]["listing"]} layout={viewMode} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}