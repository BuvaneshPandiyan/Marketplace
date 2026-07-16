"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import {
  TIER_1_RADIUS_KM, TIER_2_RADIUS_KM,
  DESKTOP_FEED_PAGE_SIZE, MOBILE_FEED_PAGE_SIZE,
  TIER_2_LOCALITY_NAMES_SHOWN,
} from "@/lib/feedConfig";
import { ListingCard } from "@/components/feed/ListingCard";
import { CategoryChips } from "@/components/feed/CategoryChips";
import type { FeedListingItem, Category } from "@/types";

// TierState now includes a page number for true pagination
type TierState = {
  items: FeedListingItem[];
  offset: number;
  // Current page number (0-indexed)
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  hasLoadedOnce: boolean;
};

function createInitialTierState(): TierState {
  return { items: [], offset: 0, page: 0, hasMore: true, isLoading: false, hasLoadedOnce: false };
}

type TieredFeedProps = { categorySlug?: string };

export function TieredFeed({ categorySlug }: TieredFeedProps) {
  const [supabase] = useState(() => createClient());
  const { lat, lng, locality, isReady, needsSetup } = useActiveLocation();

  // Detect desktop breakpoint (lg = 1024px) to choose page size
  // SSR-safe: defaults to false (mobile size) until client hydrates
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const activePageSize = isDesktop ? DESKTOP_FEED_PAGE_SIZE : MOBILE_FEED_PAGE_SIZE;

  const [category, setCategory] = useState<Category | null | "loading" | "not-found">(
    categorySlug ? "loading" : null
  );
  const [tier1, setTier1] = useState<TierState>(createInitialTierState);
  const [tier2, setTier2] = useState<TierState>(createInitialTierState);
  const [tier3, setTier3] = useState<TierState>(createInitialTierState);

  // When the breakpoint changes, reset all tiers and refetch at the new page size
  useEffect(() => {
    if (!isReady) return;
    setTier1(createInitialTierState());
    setTier2(createInitialTierState());
    setTier3(createInitialTierState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDesktop]);

  useEffect(() => {
    if (!categorySlug) { setCategory(null); return; }
    async function resolveCategory() {
      const { data } = await supabase.from("categories").select("*").eq("slug", categorySlug).single();
      setCategory((data as Category) ?? "not-found");
    }
    resolveCategory();
  }, [categorySlug, supabase]);

  const categoryId = category && category !== "loading" && category !== "not-found" ? category.id : null;

  // ── Tier 1 fetch — replace mode per page ────────────────────────────
  const fetchTier1Page = useCallback(async (reset: boolean) => {
    if (lat === null || lng === null) return;
    setTier1((prev) => ({ ...prev, isLoading: true }));
    const pageNum = reset ? 0 : tier1.page;
    const offsetToUse = pageNum * activePageSize;
    const { data } = await supabase.rpc("get_listings_near", {
      p_lat: lat, p_lng: lng,
      p_radius_km: TIER_1_RADIUS_KM,
      p_category_id: categoryId,
      p_limit: activePageSize,
      p_offset: offsetToUse,
      p_min_radius_km: 0,
    });
    const newItems = (data as FeedListingItem[]) ?? [];
    setTier1({
      // Replace mode — show this page's items only, not appended
      items: newItems,
      offset: offsetToUse + newItems.length,
      page: pageNum,
      // hasMore: true when a full page came back; false means we've hit the end
      // NOTE: numbered pagination (page 1 of N) would require a total count from the RPC.
      // That's not available yet — plug in a p_include_count param to get_listings_near here
      // when you're ready to add total-page numbers.
      hasMore: newItems.length === activePageSize,
      isLoading: false,
      hasLoadedOnce: true,
    });
  }, [lat, lng, categoryId, supabase, tier1.page, activePageSize]);

  const fetchTier2Page = useCallback(async (reset: boolean) => {
    if (lat === null || lng === null) return;
    setTier2((prev) => ({ ...prev, isLoading: true }));
    const pageNum = reset ? 0 : tier2.page;
    const offsetToUse = pageNum * activePageSize;
    const { data } = await supabase.rpc("get_listings_near", {
      p_lat: lat, p_lng: lng,
      p_radius_km: TIER_2_RADIUS_KM,
      p_category_id: categoryId,
      p_limit: activePageSize,
      p_offset: offsetToUse,
      p_min_radius_km: TIER_1_RADIUS_KM,
    });
    const newItems = (data as FeedListingItem[]) ?? [];
    setTier2({
      items: newItems,
      offset: offsetToUse + newItems.length,
      page: pageNum,
      hasMore: newItems.length === activePageSize,
      isLoading: false,
      hasLoadedOnce: true,
    });
  }, [lat, lng, categoryId, supabase, tier2.page, activePageSize]);

  const fetchTier3Page = useCallback(async (reset: boolean) => {
    setTier3((prev) => ({ ...prev, isLoading: true }));
    const pageNum = reset ? 0 : tier3.page;
    const offsetToUse = pageNum * activePageSize;
    const { data } = await supabase.rpc("get_listings_far", {
      p_lat: lat, p_lng: lng,
      p_radius_km: TIER_2_RADIUS_KM,
      p_category_id: categoryId,
      p_limit: activePageSize,
      p_offset: offsetToUse,
    });
    const newItems = (data as FeedListingItem[]) ?? [];
    setTier3({
      items: newItems,
      offset: offsetToUse + newItems.length,
      page: pageNum,
      hasMore: newItems.length === activePageSize,
      isLoading: false,
      hasLoadedOnce: true,
    });
  }, [lat, lng, categoryId, supabase, tier3.page, activePageSize]);

  // Initial load
  useEffect(() => {
    if (!isReady) return;
    if (categorySlug && category === "loading") return;
    if (category === "not-found") return;
    if (!needsSetup) {
      fetchTier1Page(true);
      fetchTier2Page(true);
    }
    fetchTier3Page(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, needsSetup, lat, lng, categoryId, category, categorySlug]);

  // Refresh — resets page state too
  function handleRefresh() {
    setTier1(createInitialTierState());
    setTier2(createInitialTierState());
    setTier3(createInitialTierState());
    if (!needsSetup) {
      fetchTier1Page(true);
      fetchTier2Page(true);
    }
    fetchTier3Page(true);
  }

  const tier2Label = useMemo(() => {
    const seen = new Set<string>();
    for (const item of tier2.items) {
      if (item.locality) seen.add(item.locality);
      if (seen.size >= TIER_2_LOCALITY_NAMES_SHOWN) break;
    }
    return seen.size > 0 ? `Near ${Array.from(seen).join(", ")}` : "Nearby areas";
  }, [tier2.items]);

  const tier3Label = useMemo(() => {
    if (!locality) return "Recent listings";
    const segments = locality.split(",").map((s) => s.trim());
    const cityGuess = segments[segments.length - 1];
    return cityGuess ? `More across ${cityGuess}` : "More across the city";
  }, [locality]);

  return (
    // Wider container — max-w-[1600px] uses full available width on large screens
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8">
      <div className="mb-4">
        <CategoryChips />
      </div>

      {category === "not-found" ? (
        <p className="text-sm text-neutral-500">That category couldn&apos;t be found.</p>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-neutral-900">
              {category && category !== "loading" ? category.name : "Listings near you"}
            </h1>
            <button type="button" onClick={handleRefresh}
              className="text-sm font-medium text-orange-600 hover:text-orange-700">
              ↻ Refresh
            </button>
          </div>

          {isReady && needsSetup && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Set your location (tap the pin in the header) to see listings ranked by distance from you.
            </p>
          )}

          {!needsSetup && (tier1.items.length > 0 || tier1.isLoading) && (
            <FeedSection
              title={`In ${locality ?? "your area"}`}
              tier={tier1}
              onPrev={() => {
                setTier1((p) => ({ ...p, page: p.page - 1 }));
                fetchTier1Page(false);
              }}
              onNext={() => {
                setTier1((p) => ({ ...p, page: p.page + 1 }));
                fetchTier1Page(false);
              }}
            />
          )}

          {!needsSetup && (tier2.items.length > 0 || tier2.isLoading) && (
            <FeedSection title={tier2Label} tier={tier2}
              onPrev={() => { setTier2((p) => ({ ...p, page: p.page - 1 })); fetchTier2Page(false); }}
              onNext={() => { setTier2((p) => ({ ...p, page: p.page + 1 })); fetchTier2Page(false); }}
            />
          )}

          {(tier3.items.length > 0 || tier3.isLoading) && (
            <FeedSection title={tier3Label} tier={tier3}
              onPrev={() => { setTier3((p) => ({ ...p, page: p.page - 1 })); fetchTier3Page(false); }}
              onNext={() => { setTier3((p) => ({ ...p, page: p.page + 1 })); fetchTier3Page(false); }}
            />
          )}

          {tier1.hasLoadedOnce && tier2.hasLoadedOnce && tier3.hasLoadedOnce &&
            tier1.items.length === 0 && tier2.items.length === 0 && tier3.items.length === 0 && (
              <p className="text-sm text-neutral-500">No listings here yet — be the first to post one!</p>
            )}
        </>
      )}
    </div>
  );
}

type FeedSectionProps = {
  title: string;
  tier: TierState;
  onPrev: () => void;
  onNext: () => void;
};

function FeedSection({ title, tier, onPrev, onNext }: FeedSectionProps) {
  const hasPrev = tier.page > 0;
  const hasNext = tier.hasMore;

  return (
    <section className="mb-8">
      {/* Section heading */}
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">{title}</h2>

      {/* Responsive grid:
          mobile  (default) : 2 cols
          sm      (640px+)  : 3 cols
          md      (768px+)  : 4 cols
          lg      (1024px+) : 7 cols  ← matches DESKTOP_FEED_PAGE_SIZE = 42 (7×6)
      */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 lg:gap-4">
        {tier.items.map((listing, i) => (
          <ListingCard key={listing.id} listing={listing} index={i} />
        ))}

        {/* Skeleton placeholders while loading */}
        {tier.isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={`skel-${i}`}
            className="w-full animate-pulse overflow-hidden rounded-xl border border-neutral-200 bg-white"
          >
            <div className="aspect-square w-full bg-neutral-200" />
            <div className="space-y-1.5 p-2.5">
              <div className="h-3 w-3/4 rounded bg-neutral-200" />
              <div className="h-3 w-1/2 rounded bg-neutral-200" />
              <div className="h-2 w-2/3 rounded bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Prev / Next pagination controls
          NOTE: numbered pages (page 1 of N) aren't possible yet because the RPCs don't
          return a total row count — only hasMore. To add numbers, add a p_include_count
          param to get_listings_near/get_listings_far and compute totalPages = ceil(count / pageSize).
      */}
      {(hasPrev || hasNext) && (
        <div className="mt-4 flex items-center gap-2">
          {/* Previous page */}
          <button
            type="button"
            onClick={onPrev}
            disabled={!hasPrev || tier.isLoading}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-orange-400 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Prev
          </button>

          {/* Page indicator */}
          <span className="rounded-full bg-orange-600 px-3 py-2 text-sm font-semibold text-white"
            style={{ minWidth: 36, textAlign: "center" }}>
            {tier.page + 1}
          </span>

          {/* Next page */}
          <button
            type="button"
            onClick={onNext}
            disabled={!hasNext || tier.isLoading}
            className="flex items-center gap-1.5 rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-orange-400 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next →
          </button>

          {tier.isLoading && (
            <span className="text-xs text-neutral-400">Loading…</span>
          )}
        </div>
      )}
    </section>
  );
}