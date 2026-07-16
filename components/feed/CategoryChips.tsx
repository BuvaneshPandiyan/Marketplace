"use client";

/**
 * Category rail.
 *
 * Rebuilt to the Zomato/Swiggy pattern: a horizontal rail of big tiles — large
 * gradient icon tile with the label beneath — that scrolls on every screen size.
 *
 * What this replaced, and why:
 *   - 38px text pills with 24px icons. Small, grey, and easy to miss; they read
 *     as filter tags rather than as a way in.
 *   - A "More +17" dropdown on desktop. Hiding 17 of 24 categories behind a
 *     dropdown buries most of the catalogue. A rail shows everything and lets
 *     you flick through it.
 *   - A separate bottom sheet on mobile. That was a second implementation of the
 *     same idea, which meant two things to keep in sync. Now one rail serves both.
 *
 * The per-category accent colours are kept — they were the good part.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/types";

const PREFERRED_ORDER = [
  "electronics-mobiles", "vehicles", "property-rentals", "furniture-home",
  "fashion", "jobs", "services", "sports-fitness", "books-education", "pets",
  "kids-baby", "beauty-health", "home-appliances", "computers-laptops",
  "cameras-photography", "music-instruments", "garden-outdoor", "tools-equipment",
  "toys-games", "watches-jewellery", "food-agriculture", "travel-luggage",
  "art-collectibles", "health-medical",
];

/** Two-stop gradient per category. The tile is filled with it, so these carry
 *  much more weight than they did as a 10%-opacity pill background. */
const ACCENT: Record<string, [string, string]> = {
  "electronics-mobiles": ["#3b82f6", "#60a5fa"],
  "vehicles":            ["#ea580c", "#fb923c"],
  "property-rentals":    ["#10b981", "#34d399"],
  "furniture-home":      ["#f59e0b", "#fbbf24"],
  "fashion":             ["#ec4899", "#f472b6"],
  "jobs":                ["#8b5cf6", "#a78bfa"],
  "services":            ["#14b8a6", "#2dd4bf"],
  "sports-fitness":      ["#22c55e", "#4ade80"],
  "books-education":     ["#6366f1", "#818cf8"],
  "pets":                ["#fb923c", "#fdba74"],
  "kids-baby":           ["#e879f9", "#f0abfc"],
  "beauty-health":       ["#f472b6", "#f9a8d4"],
  "home-appliances":     ["#38bdf8", "#7dd3fc"],
  "computers-laptops":   ["#64748b", "#94a3b8"],
  "cameras-photography": ["#a855f7", "#c084fc"],
  "music-instruments":   ["#ef4444", "#f87171"],
  "garden-outdoor":      ["#4ade80", "#86efac"],
  "tools-equipment":     ["#78716c", "#a8a29e"],
  "toys-games":          ["#fbbf24", "#fcd34d"],
  "watches-jewellery":   ["#d97706", "#f59e0b"],
  "food-agriculture":    ["#84cc16", "#a3e635"],
  "travel-luggage":      ["#06b6d4", "#22d3ee"],
  "art-collectibles":    ["#f97316", "#fb923c"],
  "health-medical":      ["#14b8a6", "#5eead4"],
};
const DEFAULT_ACCENT: [string, string] = ["#6b7280", "#9ca3af"];

export function CategoryChips() {
  const [supabase] = useState(() => createClient());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const railRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("categories").select("*").is("parent_id", null);
      const sorted = (data ?? []).sort((a, b) => {
        const ai = PREFERRED_ORDER.indexOf(a.slug), bi = PREFERRED_ORDER.indexOf(b.slug);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.name.localeCompare(b.name);
      });
      setCategories(sorted);
      setLoading(false);
    }
    load();
  }, [supabase]);

  /** Track scroll position so the edge fades and arrows only show when there's
   *  actually something in that direction. */
  const syncEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    syncEdges();
    el.addEventListener("scroll", syncEdges, { passive: true });
    window.addEventListener("resize", syncEdges);
    return () => {
      el.removeEventListener("scroll", syncEdges);
      window.removeEventListener("resize", syncEdges);
    };
  }, [syncEdges, categories.length]);

  function nudge(dir: 1 | -1) {
    railRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  return (
    <>
      <style>{`
        .cr-shell {
          position: sticky; top: 92px; z-index: 40;
          /* Warm cream band, not grey. This is the single biggest reason the rail
             now reads as Zomato/Swiggy rather than as a filter bar. */
          background: var(--brand-tint, #fff7ed);
          border-bottom: 1px solid var(--brand-border, #fed7aa);
          padding: 14px 0 14px;
          margin-bottom: 8px;
          overflow: hidden;
        }
        @media (max-width: 767px) { .cr-shell { top: 0; padding: 10px 0 12px; } }

        /* Faint dot field — texture, drifting slowly. Masked at the edges so it
           never fights the tiles for attention. */
        .cr-shell::before {
          content: '';
          position: absolute; inset: -50%;
          background-image: radial-gradient(circle, rgba(234,88,12,0.13) 1px, transparent 1px);
          background-size: 18px 18px;
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, transparent 25%, #000 100%);
          mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, transparent 25%, #000 100%);
          animation: cr-dots 60s linear infinite;
          pointer-events: none;
        }
        @keyframes cr-dots { to { transform: translate(18px, 18px); } }

        /* ── Heading ──────────────────────────────────────────────── */
        .cr-head {
          position: relative;
          display: flex; align-items: baseline; gap: 8px;
          padding: 0 2px 10px;
        }
        .cr-head-h {
          font-size: 15px; font-weight: 900; letter-spacing: -0.035em;
          color: var(--ink, #1a1a1a); margin: 0;
        }
        @media (min-width: 768px) { .cr-head-h { font-size: 18px; } }
        .cr-head-h em {
          font-style: normal; color: var(--brand, #ea580c);
          position: relative;
        }
        /* Hand-drawn underline that sketches itself in */
        .cr-head-h em::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: -2px;
          height: 3px; border-radius: 3px;
          background: var(--brand-border, #fed7aa);
          transform-origin: left;
          animation: cr-underline 620ms var(--ease) 320ms both;
        }
        @keyframes cr-underline { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .cr-head-sub {
          font-size: 11.5px; font-weight: 600; color: var(--ink-faint, #9ca3af);
          margin: 0;
        }
        @media (max-width: 479px) { .cr-head-sub { display: none; } }

        .cr-viewport { position: relative; }

        .cr-rail {
          display: flex; gap: 10px;
          overflow-x: auto; overflow-y: hidden;
          scroll-snap-type: x proximity;
          padding: 4px 2px 8px;
          -ms-overflow-style: none; scrollbar-width: none;
          /* Momentum on iOS, and don't let a horizontal flick hijack the page */
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
        }
        .cr-rail::-webkit-scrollbar { display: none; }
        @media (min-width: 768px) { .cr-rail { gap: 14px; } }

        /* ── Tile ─────────────────────────────────────────────────── */
        .cr-tile {
          flex: 0 0 auto;
          scroll-snap-align: start;
          width: 74px;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          text-decoration: none;
          animation: bz-pop 420ms var(--spring) both;
        }
        @media (min-width: 768px) { .cr-tile { width: 84px; } }

        .cr-icon {
          position: relative;
          width: 58px; height: 58px;
          border-radius: 19px;
          display: flex; align-items: center; justify-content: center;
          font-size: 25px;
          overflow: hidden;
          /* The gradient is set inline per category */
          box-shadow: 0 6px 16px var(--cr-shadow);
          transition: transform 320ms var(--spring), box-shadow 320ms ease;
        }
        @media (min-width: 768px) { .cr-icon { width: 66px; height: 66px; border-radius: 22px; font-size: 28px; } }

        /* Gloss across the top of the tile — reads as a physical button */
        .cr-icon::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(160deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.06) 46%, transparent 60%);
          pointer-events: none;
        }
        /* Shine sweep on hover */
        .cr-icon::after {
          content: ''; position: absolute; top: -50%; bottom: -50%; left: -70%;
          width: 45%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
          transform: translateX(-140%) skewX(-20deg);
          pointer-events: none;
        }

        .cr-label {
          font-size: 11px; font-weight: 700;
          letter-spacing: -0.02em; line-height: 1.25;
          color: var(--ink-soft, #374151);
          text-align: center;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
          transition: color 200ms ease;
        }
        @media (min-width: 768px) { .cr-label { font-size: 12px; } }

        /* A soft bloom of the category's own colour, behind its tile. Sits at
           z-index -1 relative to the tile content and only blooms on hover. */
        .cr-tile { position: relative; }
        .cr-tile::before {
          content: '';
          position: absolute; top: 4px; left: 50%;
          width: 58px; height: 58px; border-radius: 50%;
          transform: translateX(-50%) scale(0.6);
          background: var(--cr-a);
          filter: blur(18px);
          opacity: 0;
          transition: opacity 340ms ease, transform 340ms var(--spring);
          pointer-events: none;
        }
        @media (min-width: 768px) { .cr-tile::before { width: 66px; height: 66px; } }

        @media (hover: hover) {
          .cr-tile:hover::before { opacity: 0.55; transform: translateX(-50%) scale(1.5); }
          .cr-tile:hover .cr-icon {
            transform: translateY(-6px) scale(1.1) rotate(-5deg);
            box-shadow: 0 16px 34px var(--cr-shadow-strong);
          }
          .cr-tile:hover .cr-icon::after { animation: bz-shine 700ms ease both; }
          .cr-tile:hover .cr-label { color: var(--cr-a); transform: translateY(1px); }
        }
        .cr-label { transition: color 200ms ease, transform 200ms ease; }
        .cr-tile:active .cr-icon { transform: scale(0.93); }
        .cr-tile:focus-visible { outline: none; }
        .cr-tile:focus-visible .cr-icon { outline: 3px solid var(--cr-a); outline-offset: 3px; }

        /* ── Active ───────────────────────────────────────────────── */
        .cr-tile.is-active .cr-icon {
          transform: translateY(-4px);
          box-shadow: 0 12px 28px var(--cr-shadow-strong), 0 0 0 3px rgba(255,255,255,0.9), 0 0 0 5px var(--cr-a);
        }
        .cr-tile.is-active .cr-label { color: var(--cr-a); font-weight: 800; }
        .cr-tile.is-active .cr-icon::before { opacity: 0.5; }
        .cr-tile.is-active::before { opacity: 0.4; transform: translateX(-50%) scale(1.3); }
        /* A dot beneath the active label */
        .cr-tile.is-active .cr-label::after {
          content: ''; display: block; margin: 4px auto 0;
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--cr-a);
          animation: bz-pop 340ms var(--spring) both;
        }

        /* ── Edge fades + arrows ──────────────────────────────────── */
        .cr-fade {
          position: absolute; top: 0; bottom: 8px; width: 44px;
          pointer-events: none; z-index: 2;
          opacity: 1; transition: opacity 260ms ease;
        }
        .cr-fade-l { left: 0;  background: linear-gradient(90deg, var(--brand-tint, #fff7ed) 25%, transparent); }
        .cr-fade-r { right: 0; background: linear-gradient(270deg, var(--brand-tint, #fff7ed) 25%, transparent); }
        .cr-fade[data-hidden="true"] { opacity: 0; }

        .cr-arrow {
          position: absolute; top: 26px; z-index: 3;
          width: 32px; height: 32px; border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.06);
          background: #fff; color: var(--ink-soft, #374151);
          cursor: pointer;
          display: none; align-items: center; justify-content: center;
          box-shadow: var(--sh-md, 0 4px 20px rgba(0,0,0,0.07));
          transition: transform 220ms var(--spring), background 200ms ease, opacity 220ms ease;
        }
        @media (min-width: 768px) and (hover: hover) { .cr-arrow { display: flex; } }
        .cr-arrow:hover { transform: scale(1.14); background: var(--brand-tint, #fff7ed); color: var(--brand, #ea580c); }
        .cr-arrow[data-hidden="true"] { opacity: 0; pointer-events: none; }
        .cr-arrow-l { left: -6px; }
        .cr-arrow-r { right: -6px; }

        /* ── Skeleton ─────────────────────────────────────────────── */
        .cr-skel { flex: 0 0 auto; width: 74px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        @media (min-width: 768px) { .cr-skel { width: 84px; } }
        .cr-skel-icon { width: 58px; height: 58px; border-radius: 19px; background: #e7e5e4; }
        @media (min-width: 768px) { .cr-skel-icon { width: 66px; height: 66px; border-radius: 22px; } }
        .cr-skel-text { width: 70%; height: 9px; border-radius: 5px; background: #e7e5e4; }
        .cr-skel-icon, .cr-skel-text { animation: cr-pulse 1.4s ease-in-out infinite; }
        @keyframes cr-pulse { 0%,100% { opacity: 0.45; } 50% { opacity: 0.8; } }

        @media (prefers-reduced-motion: reduce) {
          .cr-tile, .cr-icon, .cr-icon::after, .cr-label,
          .cr-skel-icon, .cr-skel-text, .cr-arrow,
          .cr-tile.is-active .cr-label::after {
            animation: none !important; transition: none !important;
          }
          .cr-tile:hover .cr-icon, .cr-tile:active .cr-icon { transform: none !important; }
          .cr-shell::before, .cr-head-h em::after { animation: none !important; }
          .cr-head-h em::after { transform: scaleX(1) !important; }
          .cr-tile::before { transition: none !important; }
          .cr-rail { scroll-behavior: auto !important; }
        }
      `}</style>

      <div className="cr-shell">
        <div className="cr-head">
          <h2 className="cr-head-h">
            What are you <em>looking for?</em>
          </h2>
          <p className="cr-head-sub">{categories.length > 0 ? `${categories.length} categories` : ""}</p>
        </div>

        <div className="cr-viewport">
          <div className="cr-fade cr-fade-l" data-hidden={atStart} aria-hidden="true" />
          <div className="cr-fade cr-fade-r" data-hidden={atEnd} aria-hidden="true" />

          <button
            type="button"
            className="cr-arrow cr-arrow-l"
            data-hidden={atStart}
            onClick={() => nudge(-1)}
            aria-label="Scroll categories left"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className="cr-arrow cr-arrow-r"
            data-hidden={atEnd}
            onClick={() => nudge(1)}
            aria-label="Scroll categories right"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div className="cr-rail" ref={railRef}>
            {loading &&
              Array.from({ length: 10 }).map((_, i) => (
                <div className="cr-skel" key={i}>
                  <div className="cr-skel-icon" style={{ animationDelay: `${i * 70}ms` }} />
                  <div className="cr-skel-text" style={{ animationDelay: `${i * 70}ms` }} />
                </div>
              ))}

            {!loading &&
              categories.map((cat, i) => {
                const isActive = pathname === `/category/${cat.slug}`;
                const [a, b] = ACCENT[cat.slug] ?? DEFAULT_ACCENT;
                return (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    className={`cr-tile${isActive ? " is-active" : ""}`}
                    aria-current={isActive ? "page" : undefined}
                    style={
                      {
                        "--cr-a": a,
                        "--cr-shadow": `${a}38`,
                        "--cr-shadow-strong": `${a}66`,
                        // Cap the stagger so tile 24 isn't still waiting a second in
                        animationDelay: `${Math.min(i, 12) * 35}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <span
                      className="cr-icon"
                      style={{ background: `linear-gradient(145deg, ${a}, ${b})` }}
                      aria-hidden="true"
                    >
                      {cat.icon}
                    </span>
                    <span className="cr-label">{cat.name}</span>
                  </Link>
                );
              })}
          </div>
        </div>
      </div>
    </>
  );
}