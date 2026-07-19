"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category, ProductType, QuestionSchema } from "@/types";

const OTHER_SCHEMA: QuestionSchema = {
  fields: [
    { key: "condition", label: "Condition", type: "select", required: true,
      options: ["Brand new","Like new","Good","Fair","For parts"] },
    { key: "specifications", label: "Key specifications / details", type: "text", required: true },
    { key: "age", label: "Age of item", type: "select", required: true,
      options: ["Under 1 year","1–2 years","2–5 years","5+ years"] },
  ],
};

// Visual accent per top-level category
const CAT_ACCENT: Record<string, { bg: string; color: string; icon: string }> = {
  "electronics-mobiles":  { bg:"rgba(59,130,246,.10)",  color:"#3b82f6", icon:"📱" },
  "vehicles":             { bg:"rgba(234,88,12,.10)",   color:"#ea580c", icon:"🚗" },
  "property-rentals":     { bg:"rgba(16,185,129,.10)",  color:"#10b981", icon:"🏠" },
  "furniture-home":       { bg:"rgba(245,158,11,.10)",  color:"#f59e0b", icon:"🛋️"  },
  "fashion":              { bg:"rgba(236,72,153,.10)",  color:"#ec4899", icon:"👗" },
  "jobs":                 { bg:"rgba(139,92,246,.10)",  color:"#8b5cf6", icon:"💼" },
  "services":             { bg:"rgba(20,184,166,.10)",  color:"#14b8a6", icon:"🔧" },
  "sports-fitness":       { bg:"rgba(34,197,94,.10)",   color:"#22c55e", icon:"⚽" },
  "books-education":      { bg:"rgba(99,102,241,.10)",  color:"#6366f1", icon:"📚" },
  "pets":                 { bg:"rgba(251,146,60,.10)",  color:"#fb923c", icon:"🐾" },
  "kids-baby":            { bg:"rgba(232,121,249,.10)", color:"#e879f9", icon:"👶" },
  "beauty-health":        { bg:"rgba(244,114,182,.10)", color:"#f472b6", icon:"💄" },
  "home-appliances":      { bg:"rgba(56,189,248,.10)",  color:"#38bdf8", icon:"🏡" },
  "computers-laptops":    { bg:"rgba(100,116,139,.10)", color:"#64748b", icon:"💻" },
  "cameras-photography":  { bg:"rgba(168,85,247,.10)",  color:"#a855f7", icon:"📷" },
  "music-instruments":    { bg:"rgba(239,68,68,.10)",   color:"#ef4444", icon:"🎸" },
  "garden-outdoor":       { bg:"rgba(74,222,128,.10)",  color:"#4ade80", icon:"🌱" },
  "tools-equipment":      { bg:"rgba(120,113,108,.10)", color:"#78716c", icon:"🔩" },
  "toys-games":           { bg:"rgba(251,191,36,.10)",  color:"#fbbf24", icon:"🎮" },
  "watches-jewellery":    { bg:"rgba(217,119,6,.10)",   color:"#d97706", icon:"⌚" },
  "food-agriculture":     { bg:"rgba(132,204,22,.10)",  color:"#84cc16", icon:"🌾" },
  "travel-luggage":       { bg:"rgba(6,182,212,.10)",   color:"#06b6d4", icon:"🧳" },
  "art-collectibles":     { bg:"rgba(249,115,22,.10)",  color:"#f97316", icon:"🎨" },
  "health-medical":       { bg:"rgba(20,184,166,.10)",  color:"#14b8a6", icon:"⚕️"  },
};
const DEFAULT_ACCENT = { bg:"rgba(107,114,128,.08)", color:"#6b7280", icon:"📦" };

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")
    + "-" + Math.random().toString(36).slice(2,7);
}

type Props = { onSelect: (pt: ProductType) => void };

export function ProductTypeStep({ onSelect }: Props) {
  const [supabase]       = useState(() => createClient());
  const [productTypes,   setPts]         = useState<ProductType[]>([]);
  const [categories,     setCats]        = useState<Category[]>([]);
  const [loading,        setLoading]     = useState(true);
  const [query,          setQuery]       = useState("");
  const [selectedCatId,  setSelCatId]    = useState<string | null>(null);
  const [otherOpen,      setOtherOpen]   = useState(false);
  const [customName,     setCustomName]  = useState("");
  const [customCatId,    setCustomCatId] = useState("");
  const [saving,         setSaving]      = useState(false);
  const [customErr,      setCustomErr]   = useState<string|null>(null);
  const searchRef  = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [ptsRes, catsRes] = await Promise.all([
        supabase.from("product_types").select("*").order("name"),
        supabase.from("categories").select("*").order("name"),
      ]);
      setPts((ptsRes.data as ProductType[]) ?? []);
      setCats((catsRes.data as Category[]) ?? []);
      setLoading(false);
    })();
  }, [supabase]);

  const catById = useMemo(() => {
    const m: Record<string,Category> = {};
    categories.forEach(c => { m[c.id] = c; });
    return m;
  }, [categories]);

  const topCats = useMemo(() =>
    categories.filter(c => !c.parent_id).sort((a,b) => {
      const slugOrder = Object.keys(CAT_ACCENT);
      const ai = slugOrder.indexOf(a.slug), bi = slugOrder.indexOf(b.slug);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1; if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    }),
  [categories]);

  // Get product types for selected category or search
  const filteredPts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return productTypes.filter(pt =>
        pt.name.toLowerCase().includes(q) ||
        (catById[pt.category_id]?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (selectedCatId) {
      return productTypes.filter(pt => {
        const direct = catById[pt.category_id];
        return pt.category_id === selectedCatId ||
          direct?.parent_id === selectedCatId;
      });
    }
    return [];
  }, [productTypes, query, selectedCatId, catById]);

  // Group filtered results by category
  const grouped = useMemo(() => {
    const g: Record<string, ProductType[]> = {};
    filteredPts.forEach(pt => {
      const direct = catById[pt.category_id];
      const parent = direct?.parent_id ? catById[direct.parent_id] : null;
      const label = parent?.name ?? direct?.name ?? "Other";
      if (!g[label]) g[label] = [];
      g[label].push(pt);
    });
    return g;
  }, [filteredPts, catById]);

  // Called when user clicks a top-level category card.
  // If product types exist for it, show them (user picks one).
  // If none exist (migration not run yet), immediately advance with a generic schema.
  async function handleCategoryClick(cat: Category) {
    const isSel = selectedCatId === cat.id;
    if (isSel) { setSelCatId(null); return; }
    setSelCatId(cat.id);
    // Scroll the results section into view so the user sees the options appear
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);

    // Count product types for this category
    const matching = productTypes.filter(pt => {
      const direct = catById[pt.category_id];
      return pt.category_id === cat.id || direct?.parent_id === cat.id;
    });

    // If no specific product types exist, auto-advance with a generic "Other" type
    if (matching.length === 0) {
      setSaving(true);
      const { data, error } = await supabase.from("product_types")
        .insert({
          category_id: cat.id,
          name: cat.name,
          slug: cat.slug + "-general-" + Math.random().toString(36).slice(2,6),
          question_schema: OTHER_SCHEMA,
          is_custom: true,
        })
        .select().single();
      setSaving(false);
      if (!error && data) {
        onSelect(data as ProductType);
      } else {
        // Fallback: use a virtual product type without saving
        onSelect({
          id: "temp-" + cat.id,
          category_id: cat.id,
          name: cat.name,
          slug: cat.slug,
          question_schema: OTHER_SCHEMA,
          is_custom: true,
        } as ProductType);
      }
    }
    // else: product types are shown below — user picks one
  }

  // Called when user picks a specific product type from the list
  function handleTypeSelect(pt: ProductType) {
    onSelect(pt);
  }

    async function handleSaveCustom() {
    setCustomErr(null);
    if (!customName.trim()) { setCustomErr("Please describe what you're selling."); return; }
    if (!customCatId) { setCustomErr("Please choose a category."); return; }
    setSaving(true);
    const { data, error } = await supabase.from("product_types")
      .insert({ category_id:customCatId, name:customName.trim(), slug:slugify(customName), question_schema:OTHER_SCHEMA, is_custom:true })
      .select().single();
    setSaving(false);
    if (error || !data) { setCustomErr("Couldn't save — please try again."); return; }
    onSelect(data as ProductType);
  }

  const selectedCat = selectedCatId ? catById[selectedCatId] : null;
  const accent = selectedCat ? (CAT_ACCENT[selectedCat.slug] ?? DEFAULT_ACCENT) : DEFAULT_ACCENT;
  const hasResults = Object.keys(grouped).length > 0;
  const isSearching = query.trim().length > 0;

  if (loading) return (
    <div style={{ padding:"20px 0" }}>
      <div style={{ height:44, borderRadius:10, background:"#f0efed", marginBottom:20 }} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
        {Array.from({length:8}).map((_,i) => (
          <div key={i} style={{ height:76, borderRadius:12, background:"#f0efed", animationDelay:`${i*50}ms` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <style>{`
        /* ── Category card ── */

        /* ── Product type button ── */
        .pt-type-btn {
          width:100%; padding:11px 14px; border-radius:10px; border:1.5px solid #e5e7eb;
          background:white; text-align:left; cursor:pointer; font-size:13px; font-weight:500; color:#374151;
          transition:all 180ms cubic-bezier(0.34,1.56,0.64,1);
          display:flex; align-items:center; justify-content:space-between; gap:8px;
        }
        .pt-type-btn:hover {
          border-color:var(--cc,#0891b2); color:var(--cc,#0891b2);
          background:var(--cbg,rgba(234,88,12,0.05));
          transform:translateX(4px);
          box-shadow:0 4px 16px rgba(0,0,0,0.08);
        }
        .pt-type-btn:hover .pt-arrow { transform:translateX(3px); }
        .pt-type-btn:active { transform:scale(0.98); }
        .pt-arrow { flex-shrink:0; transition:transform 200ms ease; }

        /* ── Search input ── */
        .pt-search {
          width:100%; padding:12px 12px 12px 40px;
          border-radius:10px; border:1.5px solid #e5e7eb; font-size:14px;
          outline:none; box-sizing:border-box; color:#111; transition:border-color 150ms ease;
        }
        .pt-search:focus { border-color:#0891b2; box-shadow:0 0 0 3px rgba(8,145,178,0.1); }

        /* ── Category grid — responsive ── */
        /* ── Category chips — ported from the home feed's CategoryChips ──
           Home-page chip look (gradient rounded icon tile + label), laid out in
           TWO ROWS that scroll horizontally together. Contained so it can't widen
           the card (that was the earlier bug). */
        .pt-cat-scroll { position: relative; width:100%; min-width:0; max-width:100%; overflow:hidden; }
        .pt-cat-scroll::after {
          content:''; position:absolute; top:0; right:0; bottom:12px; width:40px;
          background:linear-gradient(90deg, transparent, #fff);
          pointer-events:none; z-index:2;
        }
        .pt-cat-grid {
          display:grid;
          grid-auto-flow:column;
          grid-template-rows:repeat(2, auto);   /* TWO ROWS */
          gap:14px 12px;
          overflow-x:auto; overflow-y:hidden;
          scroll-snap-type:x proximity;
          -webkit-overflow-scrolling:touch;
          overscroll-behavior-x:contain;
          padding:4px 40px 10px 2px;
          scrollbar-width:none;
        }
        .pt-cat-grid::-webkit-scrollbar { display:none; }

        /* Tile: gradient rounded icon + label, exactly like the home chips */
        .pt-cat-card {
          scroll-snap-align:start;
          flex:0 0 auto;
          width:74px;
          display:flex; flex-direction:column; align-items:center; gap:8px;
          background:none !important; border:none !important; padding:0 !important;
          cursor:pointer; position:relative;
          animation:cat-in 380ms cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .pt-cat-icon {
          position:relative;
          width:58px; height:58px; border-radius:19px;
          display:flex; align-items:center; justify-content:center;
          font-size:25px; overflow:hidden;
          background:linear-gradient(145deg, var(--cc), color-mix(in srgb, var(--cc) 78%, #000 22%));
          box-shadow:0 6px 16px var(--cs, rgba(0,0,0,0.12));
          transition:transform 320ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 320ms ease;
        }
        .pt-cat-icon::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(160deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.06) 46%, transparent 60%);
          pointer-events:none;
        }
        .pt-cat-label {
          font-size:11px; font-weight:700; letter-spacing:-0.02em; line-height:1.25;
          color:#374151; text-align:center;
          display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
          transition:color 200ms ease;
        }
        @media (hover:hover) {
          .pt-cat-card:hover .pt-cat-icon { transform:translateY(-3px) scale(1.06); box-shadow:0 10px 24px var(--cs, rgba(0,0,0,0.18)); }
          .pt-cat-card:hover .pt-cat-label { color:var(--cc); }
        }
        .pt-cat-card:active .pt-cat-icon { transform:scale(0.93); }
        .pt-cat-card.sel .pt-cat-icon { outline:3px solid var(--cc); outline-offset:2px; }
        .pt-cat-card.sel .pt-cat-label { color:var(--cc); font-weight:800; }

        /* ── Results grid ── */
        .pt-type-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
          gap:7px;
        }
        @media(max-width:500px){ .pt-type-grid { grid-template-columns:1fr; } }

        /* ── Entrance animations ── */
        @keyframes fade-up { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cat-in  { from{opacity:0;transform:scale(0.85) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .pt-results { animation:fade-up 220ms ease both; }
        .pt-cat-card { animation:cat-in 280ms cubic-bezier(0.34,1.56,0.64,1) both; }

        @media(prefers-reduced-motion:reduce){
          .pt-cat-card,.pt-type-btn,.pt-results{animation:none!important;transition:none!important;}
          .pt-cat-card:hover{transform:none;} .pt-type-btn:hover{transform:none;}
        }
      `}</style>

      {/* ── SEARCH ── */}
      <div style={{ position:"relative", marginBottom:20 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round"
          style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input ref={searchRef} type="text" value={query} onChange={e => { setQuery(e.target.value); setSelCatId(null); }}
          placeholder="Search item, e.g. iPhone, car, sofa, cricket bat..."
          className="pt-search"

        />
        {query && (
          <button type="button" onClick={() => { setQuery(""); searchRef.current?.focus(); }}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", fontSize:16 }}>×</button>
        )}
      </div>

      {/* ── CATEGORY GRID (when not searching) ── */}
      {!isSearching && (
        <>
          <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#9ca3af", marginBottom:12 }}>
            Choose a category
          </p>
          <div className="pt-cat-scroll" style={{ marginBottom:20 }}>
          <div className="pt-cat-grid">
            {topCats.map((cat, i) => {
              const acc = CAT_ACCENT[cat.slug] ?? DEFAULT_ACCENT;
              const isSel = selectedCatId === cat.id;
              return (
                <button key={cat.id} type="button"
                  className={`pt-cat-card${isSel?" sel":""}`}
                  onClick={() => handleCategoryClick(cat)}
                  style={{ '--cc': acc.color, '--cs': `${acc.color}55`, animationDelay:`${i*30}ms` } as React.CSSProperties}>
                  <span className="pt-cat-icon" aria-hidden="true">{cat.icon || acc.icon}</span>
                  <span className="pt-cat-label">{cat.name}</span>
                </button>
              );
            })}
          </div>
          </div>
        </>
      )}

      {/* ── PRODUCT TYPES ── */}
      {(isSearching || selectedCatId) && (
        <div ref={resultsRef} className="pt-results">
          {isSearching && (
            <p style={{ fontSize:12, color:"#9ca3af", marginBottom:12 }}>
              {hasResults ? `${filteredPts.length} results for "${query}"` : `No results for "${query}"`}
            </p>
          )}
          {selectedCatId && !isSearching && (
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16,
              padding:"14px 16px", borderRadius:12,
              background: accent.bg, border:`1.5px solid ${accent.color}33`,
              boxShadow:`0 4px 16px ${accent.color}18` }}>
              <div style={{ width:40, height:40, borderRadius:10, background:"white",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20, flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,0.10)" }}>
                {selectedCat?.icon || accent.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.06em", color:accent.color, margin:0 }}>
                  {selectedCat?.name}
                </p>
                <p style={{ fontSize:14, fontWeight:700, color:"#111", margin:"3px 0 0" }}>
                  What exactly are you selling? ↓
                </p>
              </div>
              {/* Pulsing arrow hinting to scroll down */}
              <div style={{ fontSize:22, animation:"sw-arrow-pulse 1.2s ease-in-out infinite", flexShrink:0 }}>
                👇
              </div>
              <style>{`@keyframes sw-arrow-pulse{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}`}</style>
            </div>
          )}

          {hasResults ? (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group} style={{ marginBottom:20 }}>
                {Object.keys(grouped).length > 1 && (
                  <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color:"#9ca3af", marginBottom:8 }}>{group}</p>
                )}
                <div className="pt-type-grid">
                  {items.map(pt => (
                    <button key={pt.id} type="button" className="pt-type-btn"
                      style={{ "--cc": accent.color, "--cbg": accent.bg } as React.CSSProperties}
                      onClick={() => handleTypeSelect(pt)}>
                      <span>{pt.name}</span>
                      <svg className="pt-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign:"center", padding:"24px 0" }}>
              <p style={{ fontSize:14, color:"#9ca3af", marginBottom:8 }}>No exact match found.</p>
              <button type="button" onClick={() => { setOtherOpen(true); setQuery(""); }}
                style={{ fontSize:13, color:"#0891b2", fontWeight:600, background:"none", border:"none", cursor:"pointer" }}>
                List it under &ldquo;Other&rdquo; →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── OTHER / CUSTOM ── */}
      <div style={{ borderTop:"1px solid #f3f4f6", marginTop:16, paddingTop:16 }}>
        {!otherOpen ? (
          <button type="button" onClick={() => setOtherOpen(true)}
            style={{ width:"100%", padding:"11px", borderRadius:10, border:"1.5px dashed #d1d5db", background:"white", fontSize:13, fontWeight:500, color:"#6b7280", cursor:"pointer", transition:"all 150ms ease" }}
            onMouseEnter={e => { (e.target as HTMLButtonElement).style.borderColor="#0891b2"; (e.target as HTMLButtonElement).style.color="#0891b2"; }}
            onMouseLeave={e => { (e.target as HTMLButtonElement).style.borderColor="#d1d5db"; (e.target as HTMLButtonElement).style.color="#6b7280"; }}>
            Can&apos;t find it? Describe what you&apos;re selling →
          </button>
        ) : (
          <div style={{ borderRadius:12, border:"1.5px solid #e5e7eb", padding:16, background:"#fafafa" }}>
            <p style={{ fontSize:13, fontWeight:700, color:"#111", marginBottom:12 }}>Describe your item</p>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:600, color:"#6b7280", display:"block", marginBottom:4 }}>What is it?</label>
              <input type="text" value={customName} onChange={e => setCustomName(e.target.value)}
                placeholder="e.g. Antique wooden mirror"
                style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:13, outline:"none", boxSizing:"border-box" }}
                onFocus={e => (e.target.style.borderColor="#0891b2")} onBlur={e => (e.target.style.borderColor="#e5e7eb")} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, fontWeight:600, color:"#6b7280", display:"block", marginBottom:4 }}>Closest category</label>
              <select value={customCatId} onChange={e => setCustomCatId(e.target.value)}
                style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #e5e7eb", fontSize:13, outline:"none", background:"white" }}>
                <option value="">Choose a category...</option>
                {topCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            {customErr && <p style={{ fontSize:12, color:"#dc2626", marginBottom:10 }}>{customErr}</p>}
            <div style={{ display:"flex", gap:8 }}>
              <button type="button" onClick={() => { setOtherOpen(false); setCustomName(""); setCustomCatId(""); setCustomErr(null); }}
                style={{ flex:1, padding:"9px", borderRadius:8, border:"1.5px solid #e5e7eb", background:"white", fontSize:13, cursor:"pointer", color:"#6b7280" }}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveCustom} disabled={saving}
                style={{ flex:2, padding:"9px", borderRadius:8, background:"linear-gradient(135deg,#0891b2,#06b6d4)", color:"white", border:"none", fontSize:13, fontWeight:600, cursor:"pointer", opacity:saving?0.7:1 }}>
                {saving ? "Saving..." : "Continue →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}