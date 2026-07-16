// Mark this as a Client Component since it depends on useActiveLocation() and fetches client-side
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import { TIER_1_RADIUS_KM, TIER_2_RADIUS_KM, FEED_PAGE_SIZE } from "@/lib/feedConfig";
import { ListingCard } from "@/components/feed/ListingCard";
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
    // Fix A — same container as the home feed (TieredFeed.tsx) for identical card sizing
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8">

      {/* Fix B — heading replaces the duplicate search bar form/input */}
      <h1 className="mb-4 text-lg font-bold text-neutral-900">
        {submittedQuery.trim()
          ? <>Search results for &quot;{submittedQuery}&quot;</>
          : "All listings"}
      </h1>

      {/* Fix C — filter controls: collapsible on mobile, inline on desktop */}

      {/* MOBILE: pill trigger (hidden at sm+) */}
      <div className="mb-3 sm:hidden">
        <button
          ref={filterBtnRef}
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="flex w-full items-center justify-between rounded-full border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm"
        >
          <span className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-xs font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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

      {/* MOBILE FILTER BOTTOM SHEET — same pattern as location selector */}
      <AnimatePresence>
        {mobileFiltersOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="filter-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
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
              transition={{ type: "spring", damping: 28, stiffness: 280, mass: 0.8 }}
              style={{
                position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
                maxHeight: "85vh",
                background: "white",
                borderRadius: "20px 20px 0 0",
                display: "flex", flexDirection: "column",
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
                padding: "8px 20px 14px", flexShrink: 0,
                borderBottom: "1px solid #f3f4f6",
              }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Filters</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Clear button — only visible when filters are active */}
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      style={{
                        fontSize: 13, fontWeight: 600, color: "#ea580c",
                        background: "none", border: "none", cursor: "pointer",
                        padding: "4px 8px",
                      }}
                    >
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
              <div style={{ overflowY: "auto", flex: 1, padding: "12px 20px 20px" }}>

                {/* Category */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                    Category
                  </label>
                  <select
                    value={filters.categoryId ?? ""}
                    onChange={(e) => setFilters({ ...filters, categoryId: e.target.value || null })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, background: "white" }}
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
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                    Price range (₹)
                  </label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="number"
                      value={filters.priceMin}
                      onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                      placeholder="Min"
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }}
                    />
                    <input
                      type="number"
                      value={filters.priceMax}
                      onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                      placeholder="Max"
                      style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14 }}
                    />
                  </div>
                </div>

                {/* Condition */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                    Condition
                  </label>
                  <select
                    value={filters.condition ?? ""}
                    onChange={(e) => setFilters({ ...filters, condition: (e.target.value || null) as "new" | "used" | null })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, background: "white" }}
                  >
                    <option value="">Any condition</option>
                    <option value="new">New</option>
                    <option value="used">Used</option>
                  </select>
                </div>

                {/* Listing type */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                    Type
                  </label>
                  <select
                    value={filters.listingType ?? ""}
                    onChange={(e) => setFilters({ ...filters, listingType: (e.target.value || null) as "sale" | "rent" | null })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, background: "white" }}
                  >
                    <option value="">Sale or rent</option>
                    <option value="sale">For sale</option>
                    <option value="rent">For rent</option>
                  </select>
                </div>

                {/* Sort */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                    Sort by
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 14, background: "white" }}
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Newest</option>
                    {lat !== null && lng !== null && <option value="distance">Distance</option>}
                  </select>
                </div>

                {/* Apply / Close button */}
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 100,
                    background: "linear-gradient(135deg, #ea580c, #f97316)",
                    color: "white", fontWeight: 700, fontSize: 15,
                    border: "none", cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(234,88,12,0.35)",
                  }}
                >
                  Show results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
            className="font-medium text-orange-600 hover:text-orange-700"
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
            <p className="text-sm text-neutral-500">No results found.</p>
          )}
        </>
      ) : (
        <>
          {/* Fix A — same grid classes as home feed */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7 lg:gap-6">
            {flatItems.map((hit, i) => (
              <ListingCard key={hit.id} listing={searchHitToFeedListingItem(hit)} index={i} />
            ))}
          </div>
          {flatHasLoadedOnce && flatItems.length === 0 && (
            <p className="text-sm text-neutral-500">No results found.</p>
          )}
          {flatHasMore && (
            <button
              type="button"
              onClick={() => fetchFlat(false)}
              disabled={flatIsLoading}
              className="mt-4 text-sm font-medium text-orange-600 hover:text-orange-700 disabled:opacity-60"
            >
              {flatIsLoading ? "Loading..." : "Show more"}
            </button>
          )}
        </>
      )}
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7 lg:gap-6">
        {tier.items.map((hit, i) => (
          <ListingCard key={hit.id} listing={searchHitToFeedListingItem(hit)} index={i} />
        ))}
      </div>
      {tier.hasMore && (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={tier.isLoading}
          className="mt-2 text-sm font-medium text-orange-600 hover:text-orange-700 disabled:opacity-60"
        >
          {tier.isLoading ? "Loading..." : "Show more"}
        </button>
      )}
    </section>
  );
}