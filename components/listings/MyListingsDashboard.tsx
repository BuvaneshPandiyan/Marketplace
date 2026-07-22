"use client";

import { useEffect, useRef, useState } from "react";
import { BannerArt } from "@/components/ui/BannerArt";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MyListingCard } from "@/components/listings/MyListingCard";
import Link from "next/link";

type RawListing = {
  id: string; status: string; title: string; price: number;
  listing_type: string; created_at: string;
  // Present in the payload already (the page selects "*") — just never typed,
  // so nothing could use it. It's the only engagement signal a seller has.
  view_count: number | null;
  listing_photos: { url: string; sort_order: number }[];
  product_types: { name: string; question_schema: unknown } | null;
  listing_attributes: { id: string; key: string; value: string | null }[];
  [key: string]: unknown;
};
type Props = { listings: RawListing[] };

const STATUS_TABS = [
  { label: "All",    value: null      },
  { label: "Active", value: "active"  },
  { label: "Sold",   value: "sold"    },
  { label: "Draft",  value: "draft"   },
];
const SORT_OPTIONS = [
  { label: "Newest first",      value: "newest"     },
  { label: "Oldest first",      value: "oldest"     },
  { label: "Price: high → low", value: "price_high" },
  { label: "Price: low → high", value: "price_low"  },
];

export function MyListingsDashboard({ listings }: Props) {
  const [tab,      setTab]      = useState<string | null>(null);
  const [sort,     setSort]     = useState("newest");
  const [view,     setView]     = useState<"grid"|"list">("grid");
  // Optional band artwork — falls back to the plain gradient if absent.
  const [dropOpen, setDropOpen] = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const [dropPos,  setDropPos]  = useState({ top: 0, right: 0 });
  const dropRef = useRef<HTMLDivElement>(null);
  const btnRef  = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!dropOpen) return;
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)
       && btnRef.current  && !btnRef.current.contains(e.target as Node))
        setDropOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [dropOpen]);

  useEffect(() => {
    if (!dropOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setDropOpen(false); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [dropOpen]);

  const counts = {
    total:  listings.length,
    active: listings.filter(l => l.status === "active").length,
    sold:   listings.filter(l => l.status === "sold").length,
    draft:  listings.filter(l => l.status === "draft").length,
  };

  /**
   * The numbers a seller actually opens this page to find out.
   *
   * All of it was already in the payload and none of it was rendered — the page
   * showed a toolbar and a grid, which is a file browser, not a dashboard. Views
   * in particular is the only feedback a seller gets on whether an ad is working.
   */
  const totalViews = listings.reduce((sum, l) => sum + (l.view_count ?? 0), 0);
  const soldValue = listings
    .filter((l) => l.status === "sold")
    .reduce((sum, l) => sum + (l.price ?? 0), 0);
  const activeValue = listings
    .filter((l) => l.status === "active")
    .reduce((sum, l) => sum + (l.price ?? 0), 0);

  /** ₹1,20,000 -> ₹1.2L. Stat tiles are narrow; full figures wrap and look broken. */
  const compactINR = (n: number) => {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(n >= 1e8 ? 0 : 1)}Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(n >= 1e6 ? 0 : 1)}L`;
    if (n >= 1e3) return `₹${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
    return `₹${n}`;
  };

  const STATS = [
    { key: "active", label: "Live now",    value: String(counts.active),      sub: `${compactINR(activeValue)} listed`, tone: "orange" as const,
      icon: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></> },
    { key: "views",  label: "Total views", value: totalViews.toLocaleString("en-IN"), sub: counts.active > 0 ? `${Math.round(totalViews / Math.max(counts.active, 1))} avg per ad` : "—", tone: "blue" as const,
      icon: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></> },
    { key: "sold",   label: "Sold",        value: String(counts.sold),        sub: counts.sold > 0 ? `${compactINR(soldValue)} earned` : "None yet", tone: "green" as const,
      icon: <><path d="M20 6L9 17l-5-5" /></> },
    { key: "total",  label: "All ads",     value: String(counts.total),       sub: counts.draft > 0 ? `${counts.draft} draft${counts.draft > 1 ? "s" : ""}` : "No drafts", tone: "grey" as const,
      icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
  ];
  const count = (v: string | null) =>
    v === null ? counts.total : counts[v as keyof typeof counts];

  const filtered = tab ? listings.filter(l => l.status === tab) : listings;
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "oldest":     return +new Date(a.created_at) - +new Date(b.created_at);
      case "price_high": return b.price - a.price;
      case "price_low":  return a.price - b.price;
      default:           return +new Date(b.created_at) - +new Date(a.created_at);
    }
  });

  const hasFilter   = tab !== null || sort !== "newest";
  const activeLabel = STATUS_TABS.find(t => t.value === tab)?.label ?? "All";

  function openDrop() {
    if (!btnRef.current) { setDropOpen(true); return; }
    const r = btnRef.current.getBoundingClientRect();
    setDropPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    setDropOpen(true);
  }

  return (
    <div style={{ background: "#f5f4f2" }}>
      <style>{`
        .ml-fbtn {
          display:inline-flex; align-items:center; gap:7px;
          padding:9px 16px; border-radius:100px;
          border:1.5px solid #e5e7eb; background:white;
          font-size:12.5px; font-weight:800; letter-spacing:-0.025em; color:#374151;
          cursor:pointer; transition:all 150ms ease;
          white-space:nowrap; box-shadow:0 1px 3px rgba(0,0,0,0.05);
        }
        .ml-fbtn:hover { border-color:#6366f1; color:#4338ca; box-shadow:0 2px 8px rgba(99,102,241,0.18); }

        .ml-vbtn {
          width:34px; height:34px; border-radius:100px;
          border:none; display:flex; align-items:center;
          justify-content:center; cursor:pointer; background:transparent;
          transition:all 180ms cubic-bezier(0.34,1.56,0.64,1); box-shadow:none;
        }

        .ml-drop {
          position:fixed; min-width:240px; background:white;
          border-radius:16px;
          box-shadow:0 16px 48px rgba(0,0,0,0.12),0 4px 12px rgba(0,0,0,0.06);
          border:1px solid rgba(0,0,0,.06); overflow:hidden; z-index:9999;
          animation:drop-in 160ms cubic-bezier(.22,1,.36,1) both;
          transform-origin:top right;
        }
        @keyframes drop-in {
          from{opacity:0;transform:scale(.95) translateY(-6px)}
          to{opacity:1;transform:scale(1) translateY(0)}
        }
        .ml-drow {
          display:flex; align-items:center; justify-content:space-between;
          gap:8px; width:100%; padding:10px 16px;
          font-size:13px; font-weight:500; color:#374151;
          background:transparent; border:none; cursor:pointer; text-align:left;
          transition:background 100ms;
        }
        .ml-drow:hover { background:#f5f4f2; }
        .ml-drow.sel   { color:#4338ca; font-weight:700; background:rgba(99,102,241,.06); }
        .ml-dlabel {
          padding:10px 16px 5px;
          font-size:10px; font-weight:700; letter-spacing:.1em;
          text-transform:uppercase; color:#9ca3af;
        }

        @keyframes ring-pulse {
          0%,100%{transform:scale(1);opacity:.4}
          50%{transform:scale(1.15);opacity:.1}
        }
        .ring-pulse { animation:ring-pulse 2.4s ease infinite; }

        /* Grid items must be h-full so MyListingCard stretches to fill row height */
        .ml-grid > * { height: 100%; }

        /* Mobile: pill is at bottom, nothing at top — sticky bar goes to very top */
        @media(max-width:639px){
          .ml-sticky-bar { top: 0 !important; padding-top: 10px !important; }
        }

        @media(prefers-reduced-motion:reduce){
          .ml-fbtn,.ml-vbtn,.ml-drop,.ring-pulse{animation:none!important;transition-duration:0ms!important;}
        }

        /* ══════════════════════════════════════════════════════════
           PAGE HEAD + STATS
           ══════════════════════════════════════════════════════════ */
        /* The band sits behind the head and bleeds edge to edge */
        .ml-band {
          position: absolute; top: 0; left: 0; right: 0;
          /* Tall enough to sit behind the full tile row (head + tiles ≈ 300/340px),
             so the frosted glass has warm colour to sample top to bottom instead
             of fading to plain over the grey page. */
          height: 300px;
          overflow: hidden;
          background: linear-gradient(135deg, #1e1b4b 0%, #4338ca 45%, #6366f1 100%);
          border-radius: 0 0 28px 28px;
          pointer-events: none;
          /* Soft bottom edge — no hard line where band meets page */
          -webkit-mask-image: linear-gradient(180deg, #000 82%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 82%, transparent 100%);
        }
        @media (min-width: 640px) { .ml-band { height: 340px; } }
        .ml-band-art {
          position: absolute; inset: 0;
          /* Was 0.4 — too faint to read as a person. */
          opacity: 0.72;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 34%, #000 72%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 34%, #000 72%);
          animation: ml-band-in 900ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes ml-band-in { from { opacity: 0; transform: scale(1.08); } }
        /* Left-to-right darkening so "Your listings" and the stat line keep
           their contrast now that the artwork is brighter */
        .ml-band-scrim {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(90deg, rgba(30,27,75,0.82) 0%, rgba(30,27,75,0.42) 42%, transparent 72%);
        }
        .ml-band-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .ml-band-glow {
          position: absolute; top: -110px; right: -70px;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 70%);
          animation: ml-breathe 9s ease-in-out infinite;
        }
        @keyframes ml-breathe {
          0%,100% { transform: scale(1); opacity: 0.85; }
          50%     { transform: scale(1.14); opacity: 1; }
        }

        .ml-head { position: relative; z-index: 1; padding: 18px 0 4px; }
        @media (min-width: 640px) { .ml-head { padding: 26px 0 6px; } }

        .ml-head-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 14px; margin-bottom: 16px;
        }

        .ml-h1 {
          font-size: 24px; font-weight: 900;
          letter-spacing: -0.045em; line-height: 1.1;
          color: #fff; margin: 0;
        }
        @media (min-width: 640px)  { .ml-h1 { font-size: 30px; } }
        @media (min-width: 1024px) { .ml-h1 { font-size: 34px; } }
        .ml-h1 em { font-style: normal; color: #a5b4fc; position: relative; }
        .ml-h1 em::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: -1px;
          height: 4px; border-radius: 4px;
          background: rgba(165,180,252,0.45);
          transform-origin: left;
          animation: ml-underline 620ms cubic-bezier(0.22,1,0.36,1) 220ms both;
        }
        @keyframes ml-underline { from { transform: scaleX(0); } to { transform: scaleX(1); } }

        .ml-h1-sub {
          font-size: 12.5px; font-weight: 700; letter-spacing: -0.02em;
          color: rgba(255,255,255,0.72); margin: 5px 0 0;
        }
        @media (min-width: 640px) { .ml-h1-sub { font-size: 13.5px; } }

        /* Post an ad — the only action this page is really for */
        .ml-new {
          flex-shrink: 0;
          display: inline-flex; align-items: center; gap: 7px;
          padding: 11px 17px; border-radius: 100px;
          /* White on the band — an orange button on an orange band disappears */
          background: #fff;
          color: #4338ca; text-decoration: none;
          font-size: 13.5px; font-weight: 900; letter-spacing: -0.025em;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 240ms ease;
        }
        @media (hover: hover) {
          .ml-new:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.32); }
          .ml-new:hover svg { transform: rotate(90deg); }
        }
        .ml-new:active { transform: scale(0.95); }
        .ml-new svg { transition: transform 320ms cubic-bezier(0.34,1.56,0.64,1); }
        @media (max-width: 419px) { .ml-new-t { display: none; } .ml-new { padding: 11px; } }

        /* ── Stat tiles ──
           2-up on phones, 4-up from 640. Four across a 360px screen would be
           ~80px each, which can't hold a number and two labels. */
        .ml-stats {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px;
        }
        @media (min-width: 640px) { .ml-stats { grid-template-columns: repeat(4, 1fr); gap: 12px; } }

        .ml-stat {
          position: relative; overflow: hidden;
          display: flex; flex-direction: column;
          padding: 13px 14px;
          border-radius: 18px;
          /* Frosted glass, not solid white. The tiles straddle the dark band and
             the grey page, so an opaque white slab reads as paper stuck onto a
             photo. Translucent + blur lets the band's warmth bleed through — the
             Zomato/Zepto treatment for cards that sit over imagery. */
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: 0 10px 30px rgba(30,27,75,0.18), inset 0 1px 0 rgba(255,255,255,0.6);
          animation: ml-stat-in 460ms cubic-bezier(0.22,1,0.36,1) both;
          transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 240ms ease;
        }
        @keyframes ml-stat-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (hover: hover) {
          .ml-stat:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(30,27,75,0.26), inset 0 1px 0 rgba(255,255,255,0.6); }
          .ml-stat:hover .ml-stat-ico { transform: scale(1.12) rotate(-6deg); }
        }

        .ml-stat-ico {
          width: 26px; height: 26px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 8px; color: #fff; flex-shrink: 0;
          transition: transform 260ms cubic-bezier(0.34,1.56,0.64,1);
        }
        .ml-stat--orange .ml-stat-ico { background: linear-gradient(135deg,#6366f1,#8b5cf6); box-shadow: 0 2px 8px rgba(99,102,241,0.4); }
        .ml-stat--blue   .ml-stat-ico { background: linear-gradient(135deg,#2563eb,#3b82f6); box-shadow: 0 2px 8px rgba(37,99,235,0.35); }
        .ml-stat--green  .ml-stat-ico { background: linear-gradient(135deg,#16a34a,#22c55e); box-shadow: 0 2px 8px rgba(34,197,94,0.35); }
        .ml-stat--grey   .ml-stat-ico { background: linear-gradient(135deg,#57534e,#78716c); box-shadow: 0 2px 8px rgba(87,83,78,0.3); }

        /* A wash of the tile's own colour, so four tiles don't read as four
           identical boxes with different numbers */
        .ml-stat::before {
          content: ''; position: absolute; top: -14px; right: -14px;
          width: 60px; height: 60px; border-radius: 50%;
          opacity: 0.12; pointer-events: none;
        }
        .ml-stat--orange::before { background: #6366f1; }
        .ml-stat--blue::before   { background: #2563eb; }
        .ml-stat--green::before  { background: #16a34a; }
        .ml-stat--grey::before   { background: #57534e; }

        .ml-stat-v {
          font-size: 22px; font-weight: 900; letter-spacing: -0.05em;
          color: #1e1b4b; line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        @media (min-width: 640px) { .ml-stat-v { font-size: 26px; } }
        .ml-stat-l {
          font-size: 9.5px; font-weight: 900; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--ink-muted, #6b7280);
          margin-top: 4px;
        }
        .ml-stat-s {
          font-size: 10.5px; font-weight: 600; color: var(--ink-faint, #9ca3af);
          margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* ── Toolbar chips ────────────────────────────────────────── */
        .ml-chip-idle {
          font-size: 11.5px; font-weight: 800; letter-spacing: -0.02em;
          color: var(--ink-faint, #9ca3af);
        }
        .ml-chip-active {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 11px; border-radius: 100px; border: none;
          background: linear-gradient(135deg,#6366f1,#8b5cf6);
          color: #fff; cursor: pointer;
          font-size: 11.5px; font-weight: 800; letter-spacing: -0.02em;
          box-shadow: 0 3px 10px rgba(99,102,241,0.4);
          transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease;
        }
        @media (hover: hover) { .ml-chip-active:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(99,102,241,0.5); } }
        .ml-chip-active:active { transform: scale(0.95); }
        .ml-chip-n {
          background: rgba(255,255,255,0.28); border-radius: 100px;
          padding: 0 5px; font-size: 10px; font-weight: 900;
        }

        /* ── Empty state ──────────────────────────────────────────── */
        .ml-empty-h {
          font-size: 22px; font-weight: 900; letter-spacing: -0.04em;
          color: var(--ink, #1a1a1a); margin: 0 0 7px;
        }
        @media (min-width: 640px) { .ml-empty-h { font-size: 26px; } }
        .ml-empty-s {
          font-size: 13.5px; font-weight: 500; line-height: 1.55;
          color: var(--ink-muted, #6b7280);
          max-width: 34ch; margin: 0 auto 20px;
        }
        .ml-empty-perks {
          list-style: none; margin: 0 auto; padding: 0;
          display: flex; flex-direction: column; gap: 10px;
          max-width: 260px; text-align: left;
        }
        .ml-empty-perks li {
          display: flex; align-items: center; gap: 11px;
          animation: ml-stat-in 460ms cubic-bezier(0.22,1,0.36,1) both;
        }
        .ml-empty-perks li:nth-child(1) { animation-delay: 120ms; }
        .ml-empty-perks li:nth-child(2) { animation-delay: 190ms; }
        .ml-empty-perks li:nth-child(3) { animation-delay: 260ms; }
        .ml-empty-perk-i {
          width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
          background: #eef2ff;
          border: 1.5px solid #c7d2fe;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
        }
        .ml-empty-perk-t {
          display: block;
          font-size: 12.5px; font-weight: 800; letter-spacing: -0.025em;
          color: var(--ink-soft, #374151);
        }
        .ml-empty-perk-s {
          display: block;
          font-size: 11px; font-weight: 600; color: var(--ink-faint, #9ca3af);
        }

        @media (prefers-reduced-motion: reduce) {
          .ml-band-art, .ml-band-glow { animation: none !important; }
          .ml-chip-active { transition: none !important; }
          .ml-chip-active:hover, .ml-chip-active:active { transform: none !important; }
          .ml-empty-perks li { animation: none !important; }
          .ml-h1 em::after { animation: none !important; transform: scaleX(1) !important; }
          .ml-stat { animation: none !important; }
          .ml-new, .ml-new svg, .ml-stat, .ml-stat-ico { transition: none !important; }
          .ml-new:hover, .ml-new:active, .ml-stat:hover,
          .ml-new:hover svg, .ml-stat:hover .ml-stat-ico { transform: none !important; }
        }

        /* ══════════════════════════════════════════════════════════
           TOOLBAR
           ══════════════════════════════════════════════════════════ */
        .ml-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
          /* No box. A white bar floating on the grey page looked like a panel
             pasted on — the individual controls already read as buttons, so the
             container around them was just an odd extra edge. This is a plain
             row now, like the home feed's section headings. */
          padding: 4px 0 14px;
          margin-bottom: 4px;
        }

        /* Segmented control, not two loose buttons. Grid/list are one choice
           with two states — a shared track says that; two bordered boxes side by
           side say "two unrelated buttons that happen to be adjacent". */
        .ml-seg {
          display: flex; align-items: center; gap: 2px;
          padding: 3px; border-radius: 100px;
          background: #ececea;
          border: 1.5px solid #e2e0dd;
        }
        .ml-vbtn.on {
          background: linear-gradient(135deg,#6366f1,#8b5cf6) !important;
          box-shadow: 0 3px 10px rgba(99,102,241,0.45) !important;
        }
        @media (hover: hover) {
          .ml-vbtn:not(.on):hover { background: rgba(255,255,255,0.85) !important; }
          .ml-vbtn:hover { transform: scale(1.08); }
        }
        .ml-vbtn:active { transform: scale(0.9); }

        /* Filter */
        @media (hover: hover) {
          .ml-fbtn:hover svg:first-child { transform: rotate(-12deg) scale(1.12); }
        }
        .ml-fbtn svg:first-child { transition: transform 260ms cubic-bezier(0.34,1.56,0.64,1); }
        .ml-fbtn:active { transform: scale(0.95); }
        .ml-fbtn.on {
          background: linear-gradient(135deg,#6366f1,#8b5cf6) !important;
          border-color: transparent !important;
          color: #fff !important;
          box-shadow: 0 4px 14px rgba(99,102,241,0.45) !important;
        }

        /* "Showing all 3" — was 11.5px grey, invisible next to two solid
           controls. Same treatment as the feed's section headings: an accent bar
           and real weight, so the left side of the bar has something to hold. */
        .ml-chip-idle {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 900; letter-spacing: -0.03em;
          color: var(--ink, #1a1a1a);
        }
        .ml-chip-idle::before {
          content: '';
          width: 4px; height: 16px; border-radius: 4px; flex-shrink: 0;
          background: linear-gradient(180deg,#6366f1,#8b5cf6);
        }
        .ml-chip-idle em {
          font-style: normal; color: var(--ink-faint, #9ca3af); font-weight: 700;
        }

        @media (prefers-reduced-motion: reduce) {
          .ml-vbtn, .ml-fbtn, .ml-fbtn svg { transition: none !important; }
          .ml-vbtn:hover, .ml-vbtn:active, .ml-fbtn:active,
          .ml-fbtn:hover svg:first-child { transform: none !important; }
        }
      `}</style>

      {/*
        ════════════════════════════════════════════════════════════════════
        OUTER WRAPPER — normal document flow, no positioning tricks.
        The layout's padding-top already pushes this below the pill navbar.
        The toolbar and grid are plain siblings; the browser guarantees no overlap.
        ════════════════════════════════════════════════════════════════════
      */}
      {/* Identical container to the home feed: max-w-[1600px] px-4 md:px-8.
          This page was max-w-[1400px] px-3 sm:px-6 — 200px narrower with tighter
          gutters, which is exactly the mismatched margin you could see when
          flipping between the two pages. */}
      <div className="mx-auto max-w-[1600px] px-4 md:px-8"
           style={{ paddingTop: 0, paddingBottom: 32, position: "relative" }}>

        {/* ── PAGE HEAD ──
            The h1 used to be 16px/800 buried in the sticky toolbar, which is why
            the page read as a file browser rather than a place. Same type scale
            as the home feed and contact page. */}
        {/* ── HERO BAND ──
            The page opened straight onto grey with a heading floating on it,
            which is why it read as empty no matter how much we put below. This
            is the same dark→orange band as the home hero and contact page, so
            the page has a top edge and the stat tiles have something to sit
            against. It bleeds past the container's padding on purpose. */}
        <div className="ml-band">
          <BannerArt variant="glyphs" tint="#a5b4fc" tint2="#6366f1" id="mylistings" />
          <div className="ml-band-scrim" aria-hidden="true" />
          <div className="ml-band-grid" aria-hidden="true" />
          <div className="ml-band-glow" aria-hidden="true" />
        </div>

        <div className="ml-head">
          <div className="ml-head-row">
            <div>
              <h1 className="ml-h1">
                Your <em>listings</em>
              </h1>
              <p className="ml-h1-sub">
                {counts.total === 0
                  ? "Nothing posted yet"
                  : `${counts.active} live · ${counts.sold} sold · ${totalViews.toLocaleString("en-IN")} views`}
              </p>
            </div>
            <Link href="/sell" prefetch className="ml-new">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="ml-new-t">Post an ad</span>
            </Link>
          </div>

          {/* Stat tiles — only worth the space once there's something to count */}
          {counts.total > 0 && (
            <div className="ml-stats">
              {STATS.map((st, i) => (
                <div key={st.key} className={`ml-stat ml-stat--${st.tone}`} style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="ml-stat-ico" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                      {st.icon}
                    </svg>
                  </span>
                  <span className="ml-stat-v">{st.value}</span>
                  <span className="ml-stat-l">{st.label}</span>
                  <span className="ml-stat-s">{st.sub}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── TOOLBAR ──
            Was a bare row floating on grey with a hairline under it — the emptiest
            band on the page. Now a real bar: white, rounded, its own soft shadow,
            so the controls sit ON something instead of in a void. */}
        <div className="ml-sticky-bar" style={{
          position: "sticky", top: 76, zIndex: 30,
          /* Transparent, not a #f5f4f2 block. The page wrapper is already that
             colour, so the continuous background shows straight through — no
             rectangle, no seam where the band's faded edge got covered over.
             When the grid scrolls up under this row, the backdrop-blur keeps the
             controls legible without needing an opaque slab. */
          background: "transparent",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          paddingTop: 10, paddingBottom: 4,
        }}>
        <div className="ml-toolbar">
          {/*
            Left side used to read "▍My Listings · 3 total" — directly under a page
            head already saying "Your listings · 2 live · 1 sold · 0 views". Two
            titles and two counts for one list. The head owns naming the page; this
            bar only needs to say what's being FILTERED, and only when something is.
          */}
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
            {tab ? (
              <button type="button" onClick={() => setTab(null)} className="ml-chip-active">
                {activeLabel}
                <span className="ml-chip-n">{count(tab)}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            ) : (
              <span className="ml-chip-idle">
                All ads <em>{counts.total}</em>
              </span>
            )}
          </div>

          {/* Right: view toggle + filter */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {counts.total > 0 && <div className="ml-seg">{(["grid","list"] as const).map(m => (
              <button key={m} type="button"
                className={`ml-vbtn${view===m?" on":""}`}
                onClick={() => setView(m)}
                title={m==="grid" ? "Grid view" : "List view"}>
                {m === "grid" ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke={view==="grid"?"white":"#6b7280"} strokeWidth={2}>
                    <rect x="3" y="3" width="7" height="7" rx="1"/>
                    <rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/>
                    <rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke={view==="list"?"white":"#6b7280"} strokeWidth={2} strokeLinecap="round">
                    <line x1="3" y1="6"  x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                )}
              </button>
            ))}</div>}

            <button ref={btnRef} type="button"
              className={`ml-fbtn${hasFilter?" on":""}`}
              onClick={dropOpen ? () => setDropOpen(false) : openDrop}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
              Filter
              {hasFilter && (
                <span style={{ width:6, height:6, borderRadius:"50%",
                  background:"#6366f1", display:"inline-block" }}/>
              )}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
                style={{ transform:dropOpen?"rotate(180deg)":"rotate(0)",
                         transition:"transform 180ms ease" }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
          </div>
        </div>
        </div>

        {/* ── CONTENT — 16px gap below toolbar ── */}
        <div style={{ height: 16 }} />
        {counts.total === 0 ? (
          <div style={{ textAlign:"center", paddingTop:64 }}>
            <div style={{ position:"relative", width:88, height:88, margin:"0 auto 20px" }}>
              <div className="ring-pulse" style={{ position:"absolute", inset:-18, borderRadius:"50%", border:"2px solid #6366f1", opacity:.2 }}/>
              <div style={{ width:88, height:88, borderRadius:"50%", background:"linear-gradient(135deg,#eef2ff,#e0e7ff)", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(99,102,241,.15)" }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={1.5} strokeLinecap="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/>
                  <line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              </div>
            </div>
            <h2 className="ml-empty-h">Nothing listed yet</h2>
            <p className="ml-empty-s">
              That old phone in your drawer is worth something to someone
              two streets away. Takes about a minute.
            </p>
            <Link href="/sell" prefetch className="ml-new" style={{ marginBottom: 22 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Post your first ad
            </Link>
            {/* Three reasons, because an empty state's job is to get the first
                ad posted — not to announce that there are no ads */}
            <ul className="ml-empty-perks">
              {[
                { i: "🏷️", t: "Free to post", s: "No commission, ever" },
                { i: "📍", t: "Buyers nearby", s: "Ranked by distance" },
                { i: "🛡️", t: "Your number stays hidden", s: "Until you share it" },
              ].map((p) => (
                <li key={p.t}>
                  <span className="ml-empty-perk-i" aria-hidden="true">{p.i}</span>
                  <span>
                    <span className="ml-empty-perk-t">{p.t}</span>
                    <span className="ml-empty-perk-s">{p.s}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

        ) : sorted.length === 0 ? (
          <div style={{ textAlign:"center", paddingTop:48 }}>
            <p style={{ color:"#9ca3af", fontSize:14, marginBottom:12 }}>
              No {activeLabel.toLowerCase()} listings.
            </p>
            <button type="button" onClick={() => setTab(null)}
              style={{ fontSize:13, color:"#4338ca", fontWeight:600, background:"none", border:"none", cursor:"pointer" }}>
              Show all
            </button>
          </div>

        ) : (
          <motion.div layout
            className={`ml-grid ${view === "grid"
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-4"
              : "flex flex-col gap-2"}`}>
            <AnimatePresence mode="popLayout">
              {sorted.map((listing, i) => (
                <motion.div key={listing.id} layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.15) }}>
                  <MyListingCard
                    listing={listing as Parameters<typeof MyListingCard>[0]["listing"]}
                    index={i}
                    layout={view}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ── FILTER DROPDOWN via portal (escapes all stacking contexts) ── */}
      {mounted && dropOpen && createPortal(
        <div ref={dropRef} className="ml-drop"
             style={{ top: dropPos.top, right: dropPos.right }}>

          <div className="ml-dlabel">Status</div>
          {STATUS_TABS.map(({ label, value }) => {
            const sel = tab === value;
            return (
              <button key={label} type="button"
                className={`ml-drow${sel ? " sel" : ""}`}
                onClick={() => { setTab(value); setDropOpen(false); }}>
                <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {sel
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    : <span style={{ width:13 }}/>}
                  {label}
                </span>
                <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:100,
                  background: sel ? "rgba(99,102,241,0.12)" : "#f3f4f6",
                  color:      sel ? "#4338ca" : "#6b7280" }}>
                  {count(value)}
                </span>
              </button>
            );
          })}

          <div style={{ height:1, background:"#f3f4f6", margin:"6px 0" }}/>
          <div className="ml-dlabel">Sort by</div>
          {SORT_OPTIONS.map(({ label, value }) => {
            const sel = sort === value;
            return (
              <button key={value} type="button"
                className={`ml-drow${sel ? " sel" : ""}`}
                onClick={() => { setSort(value); setDropOpen(false); }}>
                <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {sel
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    : <span style={{ width:13 }}/>}
                  {label}
                </span>
              </button>
            );
          })}
          <div style={{ height:6 }}/>
        </div>,
        document.body
      )}
    </div>
  );
}