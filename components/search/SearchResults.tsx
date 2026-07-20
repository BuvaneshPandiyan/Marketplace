// Mark this as a Client Component since it depends on useActiveLocation() and fetches client-side
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import { TIER_1_RADIUS_KM, TIER_2_RADIUS_KM, FEED_PAGE_SIZE } from "@/lib/feedConfig";
import { ListingCard } from "@/components/feed/ListingCard";
import { SearchBannerArt } from "@/components/search/SearchBannerArt";
import { SearchFilters, type SearchFilterValues, type SortOption } from "@/components/search/SearchFilters";
import { SaveSearchButton } from "@/components/search/SaveSearchButton";
import { searchHitToFeedListingItem, type SearchHit } from "@/lib/client/searchHitAdapter";
import type { Category } from "@/types";

type TierState = {
  items: SearchHit[];
  offset: number;
  hasMore: boolean;
  isLoading: boolean;
  hasLoadedOnce: boolean;
};

function createInitialTierState(): TierState {
  return { items: [], offset: 0, hasMore: true, isLoading: false, hasLoadedOnce: false };
}

type SearchResultsProps = {
  initialQuery: string;
};

export function SearchResults({ initialQuery }: SearchResultsProps) {
  const [supabase] = useState(() => createClient());
  const { lat, lng, isReady } = useActiveLocation();

  // Fix B — URL drives the active query so re-searching from the header works
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);

  // Keep input + submitted query in sync when URL changes (e.g. header autocomplete)
  useEffect(() => {
    setSubmittedQuery(urlQuery);
  }, [urlQuery]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [filters, setFilters] = useState<SearchFilterValues>({
    categoryId: null, priceMin: "", priceMax: "", condition: null, listingType: null,
  });
  const [sort, setSort] = useState<SortOption>("relevance");
  const isTiered = sort === "relevance";

  // Fix C — mobile filter bottom sheet state
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  // Portal needs the document to exist — guard against SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  // Lock body scroll while filter sheet is open; restore on close
  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileFiltersOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMobileFiltersOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileFiltersOpen]);

  // Count active filters for the badge on the mobile trigger button
  const activeFilterCount = [
    filters.categoryId,
    filters.priceMin,
    filters.priceMax,
    filters.condition,
    filters.listingType,
    sort !== "relevance" ? sort : null,
  ].filter(Boolean).length;

  // Resets all filters and sort back to defaults
  function clearFilters() {
    setFilters({ categoryId: null, priceMin: "", priceMax: "", condition: null, listingType: null });
    setSort("relevance");
  }

  const [tier1, setTier1] = useState<TierState>(createInitialTierState);
  const [tier2, setTier2] = useState<TierState>(createInitialTierState);
  const [tier3, setTier3] = useState<TierState>(createInitialTierState);

  const [flatItems, setFlatItems] = useState<SearchHit[]>([]);
  const [flatOffset, setFlatOffset] = useState(0);
  const [flatHasMore, setFlatHasMore] = useState(true);
  const [flatIsLoading, setFlatIsLoading] = useState(false);
  const [flatHasLoadedOnce, setFlatHasLoadedOnce] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from("categories").select("*").order("name");
      setCategories((data as Category[]) ?? []);
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }
    loadCategories();
  }, [supabase]);

  const buildParams = useCallback(
    (extra: Record<string, string>) => {
      const params = new URLSearchParams();
      params.set("q", submittedQuery);
      if (filters.categoryId)  params.set("categoryId",  filters.categoryId);
      if (filters.priceMin)    params.set("priceMin",    filters.priceMin);
      if (filters.priceMax)    params.set("priceMax",    filters.priceMax);
      if (filters.condition)   params.set("condition",   filters.condition);
      if (filters.listingType) params.set("listingType", filters.listingType);
      if (lat !== null && lng !== null) {
        params.set("lat", String(lat));
        params.set("lng", String(lng));
      }
      Object.entries(extra).forEach(([key, value]) => params.set(key, value));
      return params;
    },
    [submittedQuery, filters, lat, lng]
  );

  const fetchTier1 = useCallback(async (reset: boolean) => {
    if (lat === null || lng === null) return;
    setTier1((prev) => ({ ...prev, isLoading: true }));
    const offsetToUse = reset ? 0 : tier1.offset;
    const params = buildParams({ radiusKm: String(TIER_1_RADIUS_KM), limit: String(FEED_PAGE_SIZE), offset: String(offsetToUse) });
    const data = await fetch(`/api/search/query?${params}`).then((r) => r.json());
    const newItems: SearchHit[] = data.hits ?? [];
    setTier1((prev) => ({
      items: reset ? newItems : [...prev.items, ...newItems],
      offset: offsetToUse + newItems.length,
      hasMore: newItems.length === FEED_PAGE_SIZE,
      isLoading: false, hasLoadedOnce: true,
    }));
  }, [lat, lng, buildParams, tier1.offset]);

  const fetchTier2 = useCallback(async (reset: boolean) => {
    if (lat === null || lng === null) return;
    setTier2((prev) => ({ ...prev, isLoading: true }));
    const offsetToUse = reset ? 0 : tier2.offset;
    const params = buildParams({ radiusKm: String(TIER_2_RADIUS_KM), minRadiusKm: String(TIER_1_RADIUS_KM), limit: String(FEED_PAGE_SIZE), offset: String(offsetToUse) });
    const data = await fetch(`/api/search/query?${params}`).then((r) => r.json());
    const newItems: SearchHit[] = data.hits ?? [];
    setTier2((prev) => ({
      items: reset ? newItems : [...prev.items, ...newItems],
      offset: offsetToUse + newItems.length,
      hasMore: newItems.length === FEED_PAGE_SIZE,
      isLoading: false, hasLoadedOnce: true,
    }));
  }, [lat, lng, buildParams, tier2.offset]);

  const fetchTier3 = useCallback(async (reset: boolean) => {
    setTier3((prev) => ({ ...prev, isLoading: true }));
    const offsetToUse = reset ? 0 : tier3.offset;
    const extra: Record<string, string> = { limit: String(FEED_PAGE_SIZE), offset: String(offsetToUse) };
    if (lat !== null && lng !== null) extra.minRadiusKm = String(TIER_2_RADIUS_KM);
    const data = await fetch(`/api/search/query?${buildParams(extra)}`).then((r) => r.json());
    const newItems: SearchHit[] = data.hits ?? [];
    setTier3((prev) => ({
      items: reset ? newItems : [...prev.items, ...newItems],
      offset: offsetToUse + newItems.length,
      hasMore: newItems.length === FEED_PAGE_SIZE,
      isLoading: false, hasLoadedOnce: true,
    }));
  }, [lat, lng, buildParams, tier3.offset]);

  const fetchFlat = useCallback(async (reset: boolean) => {
    setFlatIsLoading(true);
    const offsetToUse = reset ? 0 : flatOffset;
    const params = buildParams({ sort, limit: String(FEED_PAGE_SIZE), offset: String(offsetToUse) });
    const data = await fetch(`/api/search/query?${params}`).then((r) => r.json());
    const newItems: SearchHit[] = data.hits ?? [];
    setFlatItems((prev) => (reset ? newItems : [...prev, ...newItems]));
    setFlatOffset(offsetToUse + newItems.length);
    setFlatHasMore(newItems.length === FEED_PAGE_SIZE);
    setFlatIsLoading(false);
    setFlatHasLoadedOnce(true);
  }, [buildParams, sort, flatOffset]);

  useEffect(() => {
    if (!isReady) return;
    setTier1(createInitialTierState());
    setTier2(createInitialTierState());
    setTier3(createInitialTierState());
    setFlatItems([]);
    setFlatOffset(0);
    setFlatHasMore(true);
    setFlatHasLoadedOnce(false);
    if (isTiered) {
      if (lat !== null && lng !== null) { fetchTier1(true); fetchTier2(true); }
      fetchTier3(true);
    } else {
      fetchFlat(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, submittedQuery, filters, sort, lat, lng]);

  const allLoadedOnce = isTiered
    ? tier1.hasLoadedOnce && tier2.hasLoadedOnce && tier3.hasLoadedOnce
    : flatHasLoadedOnce;
  const totalHits = isTiered
    ? tier1.items.length + tier2.items.length + tier3.items.length
    : flatItems.length;
  const topHit = isTiered ? (tier1.items[0] ?? tier2.items[0] ?? tier3.items[0]) : flatItems[0];
  const showDidYouMean =
    allLoadedOnce && submittedQuery.trim().length > 0 && totalHits > 0 && totalHits < 3 &&
    topHit && topHit.title.toLowerCase() !== submittedQuery.trim().toLowerCase();

  return (
    <div className="srch-page">
      <style>{`
        /* ── Search page: RUBY / CRIMSON theme ── */
        .srch-page { background: #fbf7f8; min-height: 100vh; }
        .srch-banner {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #3d0714 0%, #8b0e2a 52%, #cf1338 100%);
          -webkit-mask-image: linear-gradient(180deg, #000 84%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 84%, transparent 100%);
          padding: 30px 0 52px;
        }
        @media(max-width:640px){ .srch-banner { padding: 22px 0 40px; } }
        .srch-banner-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .srch-banner-glow {
          position: absolute; top: -110px; right: -50px; width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,110,140,0.4) 0%, transparent 70%);
          animation: srch-breathe 9s ease-in-out infinite; pointer-events: none;
        }
        @keyframes srch-breathe { 0%,100%{transform:scale(1);opacity:0.85} 50%{transform:scale(1.14);opacity:1} }
        .srch-banner::before {
          content: ""; position: absolute; top: 0; bottom: 0; left: -30%; width: 30%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.08), transparent);
          transform: skewX(-18deg); animation: srch-shine 7s ease-in-out infinite; pointer-events: none; z-index: 1;
        }
        @keyframes srch-shine { 0%{left:-30%} 55%,100%{left:130%} }
        .srch-banner-inner {
          position: relative; z-index: 1; max-width: 1600px; margin: 0 auto; padding: 0 16px;
        }
        @media(min-width:768px){ .srch-banner-inner { padding: 0 32px; } }
        .srch-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
          color: #fff; margin: 0 0 12px; padding: 5px 12px; border-radius: 999px;
          background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); text-shadow: 0 1px 8px rgba(0,0,0,0.4);
        }
        .srch-title {
          font-size: clamp(24px, 4vw, 40px); font-weight: 900; letter-spacing: -0.045em;
          line-height: 1.05; color: #fff; margin: 0; max-width: 900px;
          text-shadow: 0 2px 20px rgba(0,0,0,0.4);
          animation: srch-rise 550ms cubic-bezier(0.22,1,0.36,1) both;
        }
        .srch-title em { font-style: normal; color: #ff9db0; }
        @keyframes srch-rise { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .srch-count {
          font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.82);
          margin: 12px 0 0; text-shadow: 0 1px 8px rgba(0,0,0,0.4);
          animation: srch-rise 550ms cubic-bezier(0.22,1,0.36,1) 100ms both;
        }
        .srch-body {
          max-width: 1600px; margin: -24px auto 0; padding: 0 16px 40px; position: relative; z-index: 1;
        }
        @media(min-width:768px){ .srch-body { padding: 0 32px 40px; } }
        .srch-card {
          background: #fff; border-radius: 22px; border: 1px solid #f1e5e8;
          box-shadow: 0 12px 44px rgba(0,0,0,0.06); padding: 24px;
          animation: srch-rise 600ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @media(min-width:768px){ .srch-card { padding: 32px; } }
        /* Ruby brand-var remap so ListingCards + filter accents match this page */
        .srch-page {
          --brand: #cf1338;
          --brand-tint: #fff1f3;
          --brand-border: #fecdd6;
          --brand-grad: linear-gradient(135deg, #cf1338, #f43f5e);
        }
        /* Results reveal on scroll */
        .srch-results-grid > * { animation: srch-pop 500ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes srch-pop { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }

        /* Mobile "Filters" trigger — ruby, Zomato text, glow + hover */
        .srch-filter-trigger {
          background: #fff; border: 1.5px solid #f0e2e5; color: #1c1917;
          box-shadow: 0 4px 16px rgba(207,19,56,0.08);
          transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms cubic-bezier(0.34,1.56,0.64,1);
        }
        .srch-filter-trigger:active { transform: scale(0.985); }
        .srch-filter-trigger:hover { border-color: #f0b8c2; box-shadow: 0 6px 20px rgba(207,19,56,0.14); }
        .srch-filter-ic {
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
          background: linear-gradient(135deg, #cf1338, #f43f5e); color: #fff;
          box-shadow: 0 3px 10px rgba(207,19,56,0.35);
        }
        .srch-filter-label { font-size: 15px; font-weight: 800; letter-spacing: -0.02em; color: #1c1917; }
        .srch-filter-caret { color: #cf1338; }

        /* Empty state */
        .srch-empty {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 48px 20px; animation: srch-rise 500ms cubic-bezier(0.22,1,0.36,1) both;
        }
        .srch-empty-ic {
          width: 68px; height: 68px; border-radius: 20px; margin-bottom: 16px;
          display: flex; align-items: center; justify-content: center; font-size: 30px;
          background: linear-gradient(135deg, #fff1f3, #ffe4e9); border: 1px solid #fecdd6;
          box-shadow: 0 8px 24px rgba(207,19,56,0.12);
          animation: srch-empty-float 4s ease-in-out infinite;
        }
        @keyframes srch-empty-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .srch-empty-title { font-size: 19px; font-weight: 900; letter-spacing: -0.03em; color: #1c1917; margin: 0 0 6px; }
        .srch-empty-sub { font-size: 14px; font-weight: 500; color: #78716c; margin: 0; max-width: 320px; line-height: 1.5; }
        @media(prefers-reduced-motion:reduce){
          .srch-banner-glow, .srch-banner::before, .srch-title, .srch-count, .srch-card, .srch-results-grid > *, .srch-empty, .srch-empty-ic { animation: none !important; }
        }
      `}</style>

      {/* ── BANNER ── */}
      <div className="srch-banner">
        <SearchBannerArt src="/images/search-header.png" />
        <div className="srch-banner-grid" aria-hidden="true" />
        <div className="srch-banner-glow" aria-hidden="true" />
        <div className="srch-banner-inner">
          <p className="srch-eyebrow">🔍 Search</p>
          <h1 className="srch-title">
            {submittedQuery.trim()
              ? <>Results for <em>&quot;{submittedQuery}&quot;</em></>
              : <>Browse <em>all listings</em></>}
          </h1>
          <p className="srch-count">
            {totalHits > 0
              ? `${totalHits}${flatItems.length >= 0 && !isTiered ? "" : "+"} ${totalHits === 1 ? "listing" : "listings"} found`
              : "Refine your search below"}
          </p>
        </div>
      </div>

      <div className="srch-body">
        <div className="srch-card">

      {/* Fix C — filter controls: collapsible on mobile, inline on desktop */}

      {/* MOBILE: pill trigger (hidden at sm+) */}
      <div className="mb-3 sm:hidden">
        <button
          ref={filterBtnRef}
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="srch-filter-trigger flex w-full items-center justify-between rounded-2xl px-4 py-3.5"
        >
          <span className="flex items-center gap-2.5">
            <span className="srch-filter-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            </span>
            <span className="srch-filter-label">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-xs font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </span>
          <svg className="srch-filter-caret" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* DESKTOP: unchanged inline rendering (hidden on mobile) */}
      <div className="hidden sm:block">
        <SearchFilters
          categories={categories}
          filters={filters}
          onFiltersChange={setFilters}
          sort={sort}
          onSortChange={setSort}
          hasLocation={lat !== null && lng !== null}
          onClear={clearFilters}
        />
      </div>

      {/* MOBILE FILTER BOTTOM SHEET — portaled to <body> so position:fixed
          anchors to the viewport, not a transformed ancestor (the card/banner). */}
      {mounted && createPortal(
        <AnimatePresence>
          {mobileFiltersOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="filter-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setMobileFiltersOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
              }}
              aria-hidden="true"
            />

            {/* Sheet */}
            <motion.div
              key="filter-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Filter search results"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
                background: "#fff",
                borderRadius: "22px 22px 0 0",
                boxShadow: "0 -10px 50px rgba(45,7,20,0.22)",
                paddingBottom: "env(safe-area-inset-bottom)",
                overflow: "hidden",
              }}
            >
              {/* Drag handle */}
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
                <div style={{ width: 40, height: 4, borderRadius: 100, background: "#e7d3d8" }} />
              </div>

              <style>{`
                .msf-body { --msf: #cf1338; }
                .msf-label {
                  font-size: 11px; font-weight: 800; color: #a1656f; text-transform: uppercase;
                  letter-spacing: 0.08em; display: block; margin-bottom: 8px;
                }
                .msf-field {
                  width: 100%; appearance: none; -webkit-appearance: none;
                  padding: 12px 14px; border-radius: 13px; font-size: 14.5px; font-weight: 600;
                  color: #1c1917; background: #fff; border: 1.5px solid #f0e2e5; outline: none;
                  transition: border-color 200ms ease, box-shadow 200ms ease;
                }
                .msf-field::placeholder { color: #b6a8ac; font-weight: 500; }
                .msf-field:focus { border-color: var(--msf); box-shadow: 0 0 0 4px rgba(207,19,56,0.13); }
                .msf-select {
                  padding-right: 38px;
                  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23cf1338' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
                  background-repeat: no-repeat; background-position: right 14px center;
                }
                .msf-group { margin-bottom: 18px; animation: msf-in 220ms cubic-bezier(0.22,1,0.36,1) both; }
                .msf-group:nth-child(2){ animation-delay: 20ms; }
                .msf-group:nth-child(3){ animation-delay: 40ms; }
                .msf-group:nth-child(4){ animation-delay: 60ms; }
                .msf-group:nth-child(5){ animation-delay: 80ms; }
                @keyframes msf-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
                .msf-apply {
                  width: 100%; padding: 15px; border-radius: 999px; border: none; cursor: pointer;
                  background: linear-gradient(135deg, #8b0e2a, #cf1338 55%, #f43f5e);
                  color: #fff; font-weight: 800; font-size: 15.5px; letter-spacing: -0.01em;
                  box-shadow: 0 8px 24px rgba(207,19,56,0.4);
                  position: relative; overflow: hidden;
                  transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease;
                }
                .msf-apply::after {
                  content: ""; position: absolute; top: 0; bottom: 0; left: -60%; width: 40%;
                  background: linear-gradient(100deg, transparent, rgba(255,255,255,0.4), transparent);
                  transform: skewX(-20deg); animation: msf-sheen 3s ease-in-out infinite;
                }
                @keyframes msf-sheen { 0%{left:-60%} 55%,100%{left:130%} }
                .msf-apply:active { transform: scale(0.97); }
                .msf-clear {
                  font-size: 13px; font-weight: 700; color: #cf1338;
                  background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 8px;
                  transition: background 160ms ease;
                }
                .msf-clear:active { background: #fff1f3; }
                @media(prefers-reduced-motion:reduce){ .msf-group, .msf-apply::after { animation: none !important; } }
              `}</style>

              {/* Sheet header */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 20px 14px", flexShrink: 0,
                borderBottom: "1px solid #f3f4f6",
              }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Filters</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Clear button — only visible when filters are active */}
                  {activeFilterCount > 0 && (
                    <button type="button" onClick={clearFilters} className="msf-clear">
                      Clear all
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(false)}
                    aria-label="Close filters"
                    style={{
                      width: 32, height: 32, borderRadius: "50%", border: "none",
                      background: "#f3f4f6", display: "flex", alignItems: "center",
                      justifyContent: "center", cursor: "pointer",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.5}>
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Filter rows — full-width stacked, easy to tap */}
              <div className="msf-body" style={{ overflowY: "auto", maxHeight: "62vh", padding: "16px 20px 24px" }}>

                {/* Category */}
                <div className="msf-group">
                  <label className="msf-label">
                    Category
                  </label>
                  <select
                    value={filters.categoryId ?? ""}
                    onChange={(e) => setFilters({ ...filters, categoryId: e.target.value || null })}
                    className="msf-field msf-select"
                  >
                    <option value="">All categories</option>
                    {categories.filter(c => !c.parent_id).map((parent) => {
                      const children = categories.filter(c => c.parent_id === parent.id);
                      return children.length > 0 ? (
                        <optgroup key={parent.id} label={`${parent.icon ?? ""} ${parent.name}`}>
                          <option value={parent.id}>All {parent.name}</option>
                          {children.map(child => (
                            <option key={child.id} value={child.id}>{child.name}</option>
                          ))}
                        </optgroup>
                      ) : (
                        <option key={parent.id} value={parent.id}>{parent.icon ?? ""} {parent.name}</option>
                      );
                    })}
                  </select>
                </div>

                {/* Price range */}
                <div className="msf-group">
                  <label className="msf-label">
                    Price range (₹)
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="number"
                      value={filters.priceMin}
                      onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                      placeholder="Min"
                      className="msf-field" style={{ flex: 1, minWidth: 0 }}
                    />
                    <input
                      type="number"
                      value={filters.priceMax}
                      onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                      placeholder="Max"
                      className="msf-field" style={{ flex: 1, minWidth: 0 }}
                    />
                  </div>
                </div>

                {/* Condition */}
                <div className="msf-group">
                  <label className="msf-label">
                    Condition
                  </label>
                  <select
                    value={filters.condition ?? ""}
                    onChange={(e) => setFilters({ ...filters, condition: (e.target.value || null) as "new" | "used" | null })}
                    className="msf-field msf-select"
                  >
                    <option value="">Any condition</option>
                    <option value="new">New</option>
                    <option value="used">Used</option>
                  </select>
                </div>

                {/* Listing type */}
                <div className="msf-group">
                  <label className="msf-label">
                    Type
                  </label>
                  <select
                    value={filters.listingType ?? ""}
                    onChange={(e) => setFilters({ ...filters, listingType: (e.target.value || null) as "sale" | "rent" | null })}
                    className="msf-field msf-select"
                  >
                    <option value="">Sale or rent</option>
                    <option value="sale">For sale</option>
                    <option value="rent">For rent</option>
                  </select>
                </div>

                {/* Sort */}
                <div style={{ marginBottom: 24 }}>
                  <label className="msf-label">
                    Sort by
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    className="msf-field msf-select"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest</option>
                    {lat !== null && lng !== null && <option value="distance">Distance</option>}
                  </select>
                </div>

                {/* Apply / Close button */}
                <button type="button" onClick={() => setMobileFiltersOpen(false)} className="msf-apply">
                  Show results
                </button>
              </div>
            </motion.div>
          </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Save-search button */}
      <div className="mb-3 flex justify-end">
        <SaveSearchButton query={submittedQuery} filters={filters} isLoggedIn={isLoggedIn} />
      </div>

      {/* "Did you mean" suggestion */}
      {showDidYouMean && (
        <p className="mb-4 text-sm text-neutral-600">
          Few results for &quot;{submittedQuery}&quot;. Did you mean{" "}
          <button
            type="button"
            onClick={() => setSubmittedQuery(topHit.title)}
            className="font-semibold text-rose-600 hover:text-rose-700"
          >
            {topHit.title}
          </button>
          ?
        </p>
      )}

      {/* Tiered mode */}
      {isTiered ? (
        <>
          {(tier1.items.length > 0 || tier1.isLoading) && lat !== null && (
            <SearchResultSection title="In your area" tier={tier1} onLoadMore={() => fetchTier1(false)} />
          )}
          {(tier2.items.length > 0 || tier2.isLoading) && lat !== null && (
            <SearchResultSection title="Nearby areas" tier={tier2} onLoadMore={() => fetchTier2(false)} />
          )}
          {(tier3.items.length > 0 || tier3.isLoading) && (
            <SearchResultSection
              title={lat !== null ? "More across the city" : "Results"}
              tier={tier3}
              onLoadMore={() => fetchTier3(false)}
            />
          )}
          {allLoadedOnce && totalHits === 0 && (
            <div className="srch-empty">
              <div className="srch-empty-ic" aria-hidden="true">🔍</div>
              <p className="srch-empty-title">No results found</p>
              <p className="srch-empty-sub">Try adjusting your filters or searching for something else.</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Fix A — same grid classes as home feed */}
          <div className="srch-results-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7 lg:gap-6">
            {flatItems.map((hit, i) => (
              <ListingCard key={hit.id} listing={searchHitToFeedListingItem(hit)} index={i} />
            ))}
          </div>
          {flatHasLoadedOnce && flatItems.length === 0 && (
            <div className="srch-empty">
              <div className="srch-empty-ic" aria-hidden="true">🔍</div>
              <p className="srch-empty-title">No results found</p>
              <p className="srch-empty-sub">Try adjusting your filters or searching for something else.</p>
            </div>
          )}
          {flatHasMore && (
            <button
              type="button"
              onClick={() => fetchFlat(false)}
              disabled={flatIsLoading}
              className="mt-4 text-sm font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60"
            >
              {flatIsLoading ? "Loading..." : "Show more"}
            </button>
          )}
        </>
      )}
        </div>{/* /.srch-card */}
      </div>{/* /.srch-body */}
    </div>
  );
}

// Renders one tiered section — heading, grid matching home feed, "Show more"
function SearchResultSection({
  title, tier, onLoadMore,
}: {
  title: string;
  tier: TierState;
  onLoadMore: () => void;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-semibold text-neutral-700">{title}</h2>
      {/* Fix A — same grid as home feed's FeedSection */}
      <div className="srch-results-grid grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7 lg:gap-6">
        {tier.items.map((hit, i) => (
          <ListingCard key={hit.id} listing={searchHitToFeedListingItem(hit)} index={i} />
        ))}
      </div>
      {tier.hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={tier.isLoading}
          className="mt-2 text-sm font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60"
        >
          {tier.isLoading ? "Loading..." : "Show more"}
        </button>
      )}
    </section>
  );
}