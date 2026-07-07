"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { MyListingCard } from "@/components/listings/MyListingCard";

type RawListing = {
  id: string;
  status: string;
  title: string;
  price: number;
  listing_type: string;
  created_at: string;
  listing_photos: { url: string; sort_order: number }[];
  product_types: { name: string; question_schema: unknown } | null;
  listing_attributes: { id: string; key: string; value: string | null }[];
  [key: string]: unknown;
};

type MyListingsDashboardProps = { listings: RawListing[] };

const TABS = [
  { label: "All",    value: null,      color: "#1a1a1a" },
  { label: "Active", value: "active",  color: "#16a34a" },
  { label: "Sold",   value: "sold",    color: "#6b7280" },
  { label: "Draft",  value: "draft",   color: "#d97706" },
];

// Animated count-up number
function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView || target === 0) { setCurrent(target); return; }
    const start = performance.now();
    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return <span ref={ref}>{current}</span>;
}

export function MyListingsDashboard({ listings }: MyListingsDashboardProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const filtered = activeTab ? listings.filter((l) => l.status === activeTab) : listings;

  const total  = listings.length;
  const active = listings.filter((l) => l.status === "active").length;
  const sold   = listings.filter((l) => l.status === "sold").length;
  const draft  = listings.filter((l) => l.status === "draft").length;

  const STATS = [
    { label: "Total listings",  value: total,  color: "#ea580c", bg: "rgba(234,88,12,0.08)",  icon: "📋" },
    { label: "Active",          value: active, color: "#16a34a", bg: "rgba(22,163,74,0.08)",  icon: "✅" },
    { label: "Sold",            value: sold,   color: "#6b7280", bg: "rgba(107,114,128,0.08)", icon: "🏷️" },
    { label: "Draft",           value: draft,  color: "#d97706", bg: "rgba(217,119,6,0.08)",  icon: "📝" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f5" }}>
      <style>{`
        /* Global sell-btn shimmer */
        .sell-btn-dash {
          position: relative; overflow: hidden;
          transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms ease;
        }
        .sell-btn-dash::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
          transform: translateX(-100%); transition: transform 0s;
        }
        .sell-btn-dash:hover { transform: scale(1.04); box-shadow: 0 8px 32px rgba(234,88,12,0.55); }
        .sell-btn-dash:hover::after { transform: translateX(100%); transition: transform 0.45s ease; }
        .sell-btn-dash:active { transform: scale(0.96); }

        /* Stat card hover */
        .stat-card {
          transition: transform 220ms ease, box-shadow 220ms ease;
          cursor: default;
        }
        @media (hover: hover) {
          .stat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 36px rgba(0,0,0,0.1);
          }
        }

        /* Tab pill */
        .tab-btn {
          position: relative;
          transition: color 200ms ease;
          border: none; background: none; cursor: pointer;
          font-size: 14px; font-weight: 500; padding: 8px 20px;
          border-radius: 100px; white-space: nowrap;
        }

        /* Animated gradient header */
        @keyframes grad-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .hero-grad {
          background: linear-gradient(135deg, #1a0a00, #3d1500, #ea580c, #f97316, #3d1500, #1a0a00);
          background-size: 400% 400%;
          animation: grad-shift 12s ease infinite;
        }

        /* Grid card entrance */
        @keyframes card-rise {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-rise { animation: card-rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        /* Empty state pulse ring */
        @keyframes ring-pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50%       { transform: scale(1.15); opacity: 0.1; }
        }
        .ring-pulse { animation: ring-pulse 2.4s ease infinite; }

        @media (prefers-reduced-motion: reduce) {
          .sell-btn-dash, .stat-card, .tab-btn,
          .card-rise, .hero-grad, .ring-pulse {
            animation: none !important;
            transition-duration: 0ms !important;
          }
          .sell-btn-dash:hover, .stat-card:hover { transform: none !important; }
        }
      `}</style>

      {/* ── HERO HEADER ──────────────────────────────────────────── */}
      <motion.div
        className="hero-grad"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{ padding: "48px 24px 56px", position: "relative", overflow: "hidden" }}
      >
        {/* Decorative circles */}
        <div style={{ position: "absolute", top: -60, right: -60, width: 260, height: 260, borderRadius: "50%", background: "rgba(249,115,22,0.12)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -40, left: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

        <div className="mx-auto max-w-[1600px] md:px-8" style={{ paddingLeft: 16, paddingRight: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
            <div>
              <motion.p
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6 }}
              >
                Seller Dashboard
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
                style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 900, color: "white", lineHeight: 1.1, letterSpacing: "-0.03em", margin: 0 }}
              >
                My Listings
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
                style={{ marginTop: 8, fontSize: 14, color: "rgba(255,255,255,0.55)" }}
              >
                {total === 0 ? "Start selling — post your first listing" : `${total} listing${total !== 1 ? "s" : ""} in your store`}
              </motion.p>
            </div>

            {/* Post Ad CTA */}
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: "spring" }}>
              <Link
                href="/sell"
                className="sell-btn-dash"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "12px 24px", borderRadius: 100,
                  background: "white", color: "#ea580c",
                  fontWeight: 700, fontSize: 14, textDecoration: "none",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
                  whiteSpace: "nowrap",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Post Ad
              </Link>
            </motion.div>
          </div>

          {/* ── STAT CARDS ── */}
          {total > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.5 }}
              style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}
            >
              {STATS.map(({ label, value, color, bg, icon }, i) => (
                <motion.div
                  key={label}
                  className="stat-card"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.42 + i * 0.07, duration: 0.4 }}
                  style={{
                    background: "rgba(255,255,255,0.09)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.14)",
                    padding: "16px 18px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  }}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                  <div style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 900, color: "white", letterSpacing: "-0.03em", lineHeight: 1 }}>
                    <CountUp target={value} duration={900 + i * 150} />
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{label}</div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1600px] px-4 md:px-8" style={{ paddingTop: 28, paddingBottom: 48 }}>

        {/* ── FILTER TABS ── */}
        {total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ display: "flex", gap: 6, marginBottom: 28, overflowX: "auto", paddingBottom: 4 }}
          >
            {TABS.map(({ label, value, color }, idx) => {
              const isActive = activeTab === value;
              return (
                <button
                  key={label}
                  type="button"
                  className="tab-btn"
                  onClick={() => { setActiveTab(value); setActiveTabIndex(idx); }}
                  style={{
                    color: isActive ? "white" : "#6b7280",
                    background: isActive
                      ? "linear-gradient(135deg, #ea580c, #f97316)"
                      : "white",
                    border: isActive ? "none" : "1px solid #e5e7eb",
                    boxShadow: isActive ? "0 4px 16px rgba(234,88,12,0.35)" : "0 1px 3px rgba(0,0,0,0.06)",
                    transform: isActive ? "scale(1.03)" : "scale(1)",
                  }}
                >
                  {label}
                  {value !== null && (() => {
                    const count = value === "active" ? active : value === "sold" ? sold : draft;
                    return count > 0 ? (
                      <span style={{
                        marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 18, height: 18, borderRadius: "50%",
                        background: isActive ? "rgba(255,255,255,0.25)" : color,
                        color: isActive ? "white" : "white",
                        fontSize: 10, fontWeight: 700,
                      }}>{count}</span>
                    ) : null;
                  })()}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* ── EMPTY STATE ── */}
        {total === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            style={{ textAlign: "center", padding: "80px 24px" }}
          >
            {/* Pulsing rings */}
            <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 32px" }}>
              <div className="ring-pulse" style={{ position: "absolute", inset: -24, borderRadius: "50%", border: "2px solid #ea580c", opacity: 0.2 }} />
              <div className="ring-pulse" style={{ position: "absolute", inset: -8, borderRadius: "50%", border: "1px solid #ea580c", opacity: 0.15, animationDelay: "0.4s" }} />
              <div style={{
                width: 120, height: 120, borderRadius: "50%",
                background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "1px solid rgba(234,88,12,0.15)",
                boxShadow: "0 8px 32px rgba(234,88,12,0.12)",
              }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                  <line x1="12" y1="12" x2="12" y2="16" />
                  <line x1="10" y1="14" x2="14" y2="14" />
                </svg>
              </div>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 8 }}>Your store is empty</h2>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 28, maxWidth: 320, margin: "0 auto 28px" }}>
              List something for sale or rent — it takes under 2 minutes.
            </p>
            <Link
              href="/sell"
              className="sell-btn-dash"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 100,
                background: "linear-gradient(135deg, #ea580c, #f97316)",
                color: "white", fontWeight: 700, fontSize: 15, textDecoration: "none",
                boxShadow: "0 6px 24px rgba(234,88,12,0.4)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Post your first listing
            </Link>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "60px 24px", color: "#9ca3af", fontSize: 14 }}
          >
            No {activeTab} listings yet.
          </motion.div>
        ) : (
          /* ── GRID ── */
          <motion.div
            layout
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 lg:gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((listing, i) => (
                <motion.div
                  key={listing.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{
                    duration: 0.35,
                    delay: i * 0.04,
                    type: "spring",
                    stiffness: 260,
                    damping: 22,
                  }}
                >
                  <MyListingCard listing={listing as Parameters<typeof MyListingCard>[0]["listing"]} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}