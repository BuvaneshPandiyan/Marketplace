"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MyListingCard } from "@/components/listings/MyListingCard";
import Link from "next/link";

type RawListing = {
  id: string; status: string; title: string; price: number;
  listing_type: string; created_at: string;
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
    <div style={{ background: "#f9f8f6" }}>
      <style>{`
        .ml-fbtn {
          display:inline-flex; align-items:center; gap:5px;
          padding:6px 14px; border-radius:8px;
          border:1.5px solid #e5e7eb; background:white;
          font-size:13px; font-weight:600; color:#374151;
          cursor:pointer; transition:border-color 140ms, color 140ms;
          white-space:nowrap;
        }
        .ml-fbtn:hover,.ml-fbtn.on { border-color:#ea580c; color:#ea580c; }
        .ml-fbtn.on { background:rgba(234,88,12,.04); }

        .ml-vbtn {
          width:30px; height:30px; border-radius:6px;
          border:1.5px solid #e5e7eb; display:flex; align-items:center;
          justify-content:center; cursor:pointer; background:white;
          transition:all 120ms ease;
        }
        .ml-vbtn.on { background:#ea580c; border-color:#ea580c; }

        .ml-drop {
          position:fixed; min-width:240px; background:white;
          border-radius:14px;
          box-shadow:0 10px 40px rgba(0,0,0,.14),0 2px 8px rgba(0,0,0,.06);
          border:1px solid rgba(0,0,0,.07); overflow:hidden; z-index:9999;
          animation:drop-in 150ms cubic-bezier(.22,1,.36,1) both;
          transform-origin:top right;
        }
        @keyframes drop-in {
          from{opacity:0;transform:scale(.95) translateY(-4px)}
          to{opacity:1;transform:scale(1) translateY(0)}
        }
        .ml-drow {
          display:flex; align-items:center; justify-content:space-between;
          gap:8px; width:100%; padding:9px 16px;
          font-size:13px; font-weight:500; color:#374151;
          background:transparent; border:none; cursor:pointer; text-align:left;
          transition:background 100ms;
        }
        .ml-drow:hover { background:#f9f8f6; }
        .ml-drow.sel   { color:#ea580c; font-weight:600; background:rgba(234,88,12,.04); }
        .ml-dlabel {
          padding:8px 16px 4px;
          font-size:10px; font-weight:700; letter-spacing:.08em;
          text-transform:uppercase; color:#9ca3af;
        }

        @keyframes ring-pulse {
          0%,100%{transform:scale(1);opacity:.4}
          50%{transform:scale(1.15);opacity:.1}
        }
        .ring-pulse { animation:ring-pulse 2.4s ease infinite; }
        @media(prefers-reduced-motion:reduce){
          .ml-fbtn,.ml-vbtn,.ml-drop,.ring-pulse{animation:none!important;transition-duration:0ms!important;}
        }
      `}</style>

      {/*
        ════════════════════════════════════════════════════════════════════
        OUTER WRAPPER — normal document flow, no positioning tricks.
        The layout's padding-top already pushes this below the pill navbar.
        The toolbar and grid are plain siblings; the browser guarantees no overlap.
        ════════════════════════════════════════════════════════════════════
      */}
      <div className="mx-auto max-w-[1400px] px-3 sm:px-6"
           style={{ paddingTop: 20, paddingBottom: 24 }}>

        {/* ── TOOLBAR — static flow, directly above the grid ── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          gap: 12, marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "1px solid #ebebeb",
        }}>
          {/* Left: title + count / active filter */}
          <div style={{ display:"flex", alignItems:"baseline", gap:8 }}>
            <h1 style={{ fontSize:18, fontWeight:800, color:"#111", margin:0, letterSpacing:"-0.02em" }}>
              My Listings
            </h1>
            {tab ? (
              <span style={{ fontSize:12, color:"#ea580c", fontWeight:600 }}>
                {activeLabel} · {count(tab)}
              </span>
            ) : counts.total > 0 ? (
              <span style={{ fontSize:12, color:"#9ca3af" }}>
                {counts.total} listing{counts.total !== 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          {/* Right: view toggle + filter */}
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {counts.total > 0 && (["grid","list"] as const).map(m => (
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
            ))}

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
                  background:"#ea580c", display:"inline-block" }}/>
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

        {/* ── CONTENT ── */}
        {counts.total === 0 ? (
          <div style={{ textAlign:"center", paddingTop:64 }}>
            <div style={{ position:"relative", width:88, height:88, margin:"0 auto 20px" }}>
              <div className="ring-pulse" style={{ position:"absolute", inset:-18, borderRadius:"50%", border:"2px solid #ea580c", opacity:.2 }}/>
              <div style={{ width:88, height:88, borderRadius:"50%", background:"linear-gradient(135deg,#fff7ed,#ffedd5)", display:"flex", alignItems:"center", justifyContent:"center", border:"1px solid rgba(234,88,12,.12)" }}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={1.5} strokeLinecap="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/>
                  <line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              </div>
            </div>
            <h2 style={{ fontSize:18, fontWeight:700, color:"#111", marginBottom:6 }}>No listings yet</h2>
            <p style={{ fontSize:14, color:"#6b7280", maxWidth:260, margin:"0 auto 20px" }}>
              Post your first listing — takes under 2 minutes.
            </p>
            <Link href="/sell" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 18px", borderRadius:8, background:"linear-gradient(135deg,#ea580c,#f97316)", color:"white", fontWeight:600, fontSize:13, textDecoration:"none" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
              Post your first listing
            </Link>
          </div>

        ) : sorted.length === 0 ? (
          <div style={{ textAlign:"center", paddingTop:48 }}>
            <p style={{ color:"#9ca3af", fontSize:14, marginBottom:12 }}>
              No {activeLabel.toLowerCase()} listings.
            </p>
            <button type="button" onClick={() => setTab(null)}
              style={{ fontSize:13, color:"#ea580c", fontWeight:600, background:"none", border:"none", cursor:"pointer" }}>
              Show all
            </button>
          </div>

        ) : (
          <motion.div layout
            className={view === "grid"
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-4"
              : "flex flex-col gap-2"}>
            <AnimatePresence mode="popLayout">
              {sorted.map((listing, i) => (
                <motion.div key={listing.id} layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.025, 0.15) }}>
                  <MyListingCard
                    listing={listing as Parameters<typeof MyListingCard>[0]["listing"]}
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
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2.5} strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    : <span style={{ width:13 }}/>}
                  {label}
                </span>
                <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:100,
                  background: sel ? "rgba(234,88,12,0.1)" : "#f3f4f6",
                  color:      sel ? "#ea580c" : "#6b7280" }}>
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
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2.5} strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
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