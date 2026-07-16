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
    // Each locality is itself "Area, City", so joining several produces a
    // run-on line. Take the area part only, and cap the list.
    const areas = Array.from(seen).map((l) => l.split(",")[0].trim()).filter(Boolean);
    return areas.length > 0 ? `Near ${areas.slice(0, TIER_2_LOCALITY_NAMES_SHOWN).join(", ")}` : "Nearby areas";
  }, [tier2.items]);

  const tier3Label = useMemo(() => {
    if (!locality) return "Recent listings";
    const segments = locality.split(",").map((x) => x.trim()).filter(Boolean);
    // "Meenambakkam, Chennai" -> "Chennai". A single-segment locality is the
    // area itself, so there's no city to name.
    const cityGuess = segments.length > 1 ? segments[segments.length - 1] : null;
    return cityGuess ? `More across ${cityGuess}` : "More listings";
  }, [locality]);

  /* Tier 1 is "closest to you". Tiers 2 and 3 are everything beyond, and they
     render as one continuous run after the divider — a browser doesn't care
     where our 3km/10km boundary falls, only "near me" vs "further out". The
     tiers still fetch and paginate separately; only the rendering is merged. */
  const nearItems = tier1.items;
  const restItems = useMemo(
    () => [...tier2.items, ...tier3.items],
    [tier2.items, tier3.items]
  );
  const anyLoading = tier1.isLoading || tier2.isLoading || tier3.isLoading;
  const restLabel = tier2.items.length > 0 ? tier2Label : tier3Label;

  return (
    // Wider container — max-w-[1600px] uses full available width on large screens
    <>
      <style>{`
        /* ── Feed typography ──────────────────────────────────────────
           Matches the hero and contact page: heavy weights, tight tracking,
           real size steps. The old h1 was text-lg/bold and the section
           headings were 13px grey — they read as form labels, not headings. */
        .tf-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px; margin-bottom: 16px;
        }
        .tf-h1 {
          font-size: 22px; font-weight: 900;
          letter-spacing: -0.045em; line-height: 1.1;
          color: var(--ink, #1a1a1a); margin: 0;
          min-width: 0;
        }
        @media (min-width: 640px)  { .tf-h1 { font-size: 28px; } }
        @media (min-width: 1024px) { .tf-h1 { font-size: 32px; } }
        .tf-h1 em {
          font-style: normal; color: var(--brand, #ea580c);
          position: relative;
          /* Belt and braces: localities are short now, but a long one must wrap
             and clamp rather than run off the side of the page. */
          overflow: hidden; text-overflow: ellipsis;
          display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical;
          max-width: 100%;
        }
        /* Underline sketches itself in once the locality resolves */
        .tf-h1 em::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: -1px;
          height: 4px; border-radius: 4px;
          background: var(--brand-border, #fed7aa);
          transform-origin: left;
          animation: tf-underline 620ms var(--ease) 260ms both;
        }
        @keyframes tf-underline { from { transform: scaleX(0); } to { transform: scaleX(1); } }

        .tf-refresh {
          flex-shrink: 0;
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: var(--r-pill, 100px);
          border: 1.5px solid var(--brand-border, #fed7aa);
          background: var(--brand-tint, #fff7ed);
          color: var(--brand, #ea580c);
          font-size: 12.5px; font-weight: 800; letter-spacing: -0.02em;
          cursor: pointer;
          transition: transform 240ms var(--spring), background 200ms ease, box-shadow 200ms ease;
        }
        @media (hover: hover) {
          .tf-refresh:hover {
            background: #fff; transform: translateY(-2px);
            box-shadow: 0 6px 18px rgba(234,88,12,0.22);
          }
          .tf-refresh:hover svg { transform: rotate(-180deg); }
        }
        .tf-refresh:active { transform: scale(0.95); }
        .tf-refresh svg { transition: transform 520ms var(--ease); }

        /* ── Section heading ──────────────────────────────────────── */
        .tf-h2 {
          display: flex; align-items: center; gap: 9px;
          font-size: 16px; font-weight: 900;
          letter-spacing: -0.035em;
          color: var(--ink, #1a1a1a);
          margin: 0 0 12px;
        }
        @media (min-width: 640px) { .tf-h2 { font-size: 19px; } }
        .tf-h2-bar {
          width: 4px; height: 17px; border-radius: 4px; flex-shrink: 0;
          background: var(--brand-grad, linear-gradient(135deg,#ea580c,#f97316));
        }
        @media (min-width: 640px) { .tf-h2-bar { height: 20px; } }

        /* ── Location banner ──────────────────────────────────────── */
        .tf-locbanner {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 18px; padding: 12px 15px;
          border-radius: var(--r-md, 16px);
          background: var(--brand-tint, #fff7ed);
          border: 1.5px solid var(--brand-border, #fed7aa);
          color: var(--brand-dark, #9a3412);
          font-size: 13px; font-weight: 600; line-height: 1.45;
        }
        .tf-locbanner svg { flex-shrink: 0; color: var(--brand, #ea580c); }

        /* ── Feed layout ──────────────────────────────────────────
           Flex, not grid. CSS Grid gives every cell an identical track, so the
           divider was handed a full column (~200px at 7-up) to hold a ~40px
           badge — hence the dead space either side of it. Flex lets the cards
           keep their computed column width while the divider takes only the
           26px it actually needs, so the listings close up around it.

           Card widths are the same maths grid was doing: (100% - gaps) / columns.
           2 up on phones, 3 from 640, 4 from 768, 7 from 1024. */
        .tf-grid {
          display: flex;
          flex-wrap: wrap;
          align-items: stretch;
          gap: 12px;
        }
        .tf-grid > .lc,
        .tf-grid > .tf-skel {
          flex: 0 0 calc((100% - 12px) / 2);
          min-width: 0;
        }
        @media (min-width: 640px) {
          .tf-grid > .lc, .tf-grid > .tf-skel { flex-basis: calc((100% - 24px) / 3); }
        }
        @media (min-width: 768px) {
          .tf-grid > .lc, .tf-grid > .tf-skel { flex-basis: calc((100% - 36px) / 4); }
        }
        @media (min-width: 1024px) {
          .tf-grid { gap: 16px; }
          .tf-grid > .lc, .tf-grid > .tf-skel { flex-basis: calc((100% - 96px) / 7); }
        }

        /* ── Divider ──────────────────────────────────────────────
           Occupies ONE grid cell on tablet+, so the run of listings continues
           on the same row instead of breaking to a new one. On a 2-column phone
           a vertical sliver would waste half a row, so there it spans the full
           width and lies flat. */
        .tf-sep {
          /* Full width on a 2-up phone — a vertical sliver would eat half a row */
          flex: 0 0 100%;
          position: relative;
          display: flex; align-items: center; justify-content: center;
          min-height: 44px;
        }
        @media (min-width: 640px) {
          /* Just wide enough for the badge plus a little breathing room */
          .tf-sep { flex: 0 0 26px; min-height: auto; align-self: stretch; }
        }

        .tf-sep-line {
          position: absolute;
          left: 0; right: 0; top: 50%; height: 2px;
          transform: translateY(-50%);
          border-radius: 2px;
          background: linear-gradient(90deg, transparent, var(--brand-border, #fed7aa) 22%, var(--brand, #ea580c) 50%, var(--brand-border, #fed7aa) 78%, transparent);
        }
        @media (min-width: 640px) {
          .tf-sep-line {
            left: 50%; right: auto; top: 10%; bottom: 10%;
            width: 2px; height: auto;
            transform: translateX(-50%);
            background: linear-gradient(180deg, transparent, var(--brand-border, #fed7aa) 22%, var(--brand, #ea580c) 50%, var(--brand-border, #fed7aa) 78%, transparent);
          }
        }

        .tf-sep-badge {
          position: relative; z-index: 1;
          display: flex; align-items: center; gap: 7px;
          padding: 7px 13px; border-radius: var(--r-pill, 100px);
          background: #fff;
          border: 1.5px solid var(--brand-border, #fed7aa);
          color: var(--brand, #ea580c);
          box-shadow: 0 4px 16px rgba(234,88,12,0.18);
          animation: tf-sep-pulse 3s ease-in-out infinite;
        }
        @media (min-width: 640px) {
          .tf-sep-badge {
            flex-direction: column; gap: 7px;
            padding: 11px 4px;
            /* The badge is wider than its 26px track and centres over the gutter,
               overlapping the gap on both sides rather than forcing the track wider */
            margin: 0 -5px;
          }
        }
        @keyframes tf-sep-pulse {
          0%,100% { box-shadow: 0 4px 16px rgba(234,88,12,0.18), 0 0 0 0 rgba(234,88,12,0.28); }
          50%     { box-shadow: 0 4px 16px rgba(234,88,12,0.18), 0 0 0 8px rgba(234,88,12,0); }
        }
        .tf-sep-badge svg { flex-shrink: 0; }

        .tf-sep-text {
          font-size: 9px; font-weight: 900;
          letter-spacing: 0.1em; text-transform: uppercase;
          white-space: nowrap;
        }
        @media (min-width: 640px) {
          /* Turn the label on its side so it fits a one-column-wide cell */
          .tf-sep-text {
            writing-mode: vertical-rl;
            text-orientation: mixed;
            font-size: 8.5px; letter-spacing: 0.09em;
            max-height: 130px; overflow: hidden; text-overflow: ellipsis;
          }
        }

        /* ── Skeletons ────────────────────────────────────────────── */
        .tf-skel {
          width: 100%; overflow: hidden;
          border-radius: var(--r-md, 16px);
          border: 1px solid var(--line, #f0f0f0);
          background: #fff;
        }
        .tf-skel-img { width: 100%; aspect-ratio: 5 / 4; background: #eeeceb; }
        .tf-skel-body { padding: 10px; display: flex; flex-direction: column; gap: 7px; }
        .tf-skel-line { height: 9px; border-radius: 5px; background: #eeeceb; }
        .tf-skel-img, .tf-skel-line { animation: tf-skel-pulse 1.4s ease-in-out infinite; }
        @keyframes tf-skel-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 0.9; } }

        /* ── Pagers ───────────────────────────────────────────────── */
        .tf-pagers { display: flex; flex-direction: column; gap: 8px; margin-top: 18px; }
        .tf-pager {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          font-size: 12px; font-weight: 700; color: var(--ink-muted, #6b7280);
        }
        .tf-pager-label {
          font-size: 10px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.07em; color: var(--ink-faint, #9ca3af);
          margin-right: 2px;
        }
        .tf-pager-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 13px; border-radius: var(--r-pill, 100px);
          border: 1.5px solid var(--line-strong, #e5e7eb);
          background: #fff; color: var(--ink-soft, #374151);
          font-size: 12px; font-weight: 800; cursor: pointer;
          transition: transform 200ms var(--spring), border-color 200ms ease, color 200ms ease;
        }
        @media (hover: hover) {
          .tf-pager-btn:not(:disabled):hover {
            border-color: var(--brand, #ea580c); color: var(--brand, #ea580c);
            transform: translateY(-2px);
          }
        }
        .tf-pager-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .tf-pager-page {
          min-width: 30px; text-align: center;
          padding: 6px 9px; border-radius: var(--r-pill, 100px);
          background: var(--brand-grad, linear-gradient(135deg,#ea580c,#f97316));
          color: #fff; font-size: 12px; font-weight: 800;
        }

        /* ── Empty states ─────────────────────────────────────────── */
        .tf-empty {
          display: flex; flex-direction: column; align-items: center;
          gap: 3px; padding: 56px 20px; text-align: center;
        }
        .tf-empty-emoji { font-size: 40px; margin-bottom: 6px; opacity: 0.85; }
        .tf-empty-h {
          font-size: 16px; font-weight: 800; letter-spacing: -0.03em;
          color: var(--ink-soft, #374151);
        }
        .tf-empty-s { font-size: 13px; color: var(--ink-faint, #9ca3af); font-weight: 500; }

        @media (prefers-reduced-motion: reduce) {
          .tf-h1 em::after { animation: none !important; transform: scaleX(1) !important; }
          .tf-refresh, .tf-refresh svg { transition: none !important; }
          .tf-refresh:hover, .tf-refresh:active { transform: none !important; }
          .tf-refresh:hover svg { transform: none !important; }
          .tf-sep-badge, .tf-skel-img, .tf-skel-line { animation: none !important; }
          .tf-pager-btn { transition: none !important; }
          .tf-pager-btn:not(:disabled):hover { transform: none !important; }
        }
      `}</style>

    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-8">
      <div className="mb-4">
        <CategoryChips />
      </div>

      {category === "not-found" ? (
        <p className="tf-empty">
          <span className="tf-empty-emoji" aria-hidden="true">🤔</span>
          <span className="tf-empty-h">Category not found</span>
          <span className="tf-empty-s">That one doesn&apos;t exist — try browsing the rail above.</span>
        </p>
      ) : (
        <>
          <div className="tf-head">
            <h1 className="tf-h1">
              {category && category !== "loading" ? (
                category.name
              ) : (
                <>
                  Listings near <em>{locality ?? "you"}</em>
                </>
              )}
            </h1>
            <button type="button" onClick={handleRefresh} className="tf-refresh">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
              </svg>
              Refresh
            </button>
          </div>

          {isReady && needsSetup && (
            <p className="tf-locbanner">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>
              <span>Set your location using the pin in the header to see listings ranked by distance.</span>
            </p>
          )}

          {/* ── ONE GRID ──────────────────────────────────────────────
              The three tiers used to be three separate <section>s, each with
              its own grid. That meant a tier with one item left the rest of its
              row empty and pushed everything else down — exactly the gap you
              could see under a single nearby listing. They're one grid now, so
              items flow continuously, and a divider marks where "closest to
              you" ends instead of a row break doing it.

              The tiers still fetch and paginate independently; only the
              rendering is merged. */}
          {!needsSetup && (nearItems.length > 0 || restItems.length > 0 || anyLoading) && (
            <section className="mb-6">
              <h2 className="tf-h2">
                <span className="tf-h2-bar" aria-hidden="true" />
                {nearItems.length > 0 ? "Closest to you" : restLabel}
              </h2>

              <div className="tf-grid">
                {nearItems.map((listing, i) => (
                  <ListingCard key={listing.id} listing={listing} index={i} />
                ))}

                {/* Divider — only when there's something on both sides of it */}
                {nearItems.length > 0 && restItems.length > 0 && (
                  <div className="tf-sep" aria-hidden="true">
                    <span className="tf-sep-line" />
                    <span className="tf-sep-badge">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                      </svg>
                      <span className="tf-sep-text">{restLabel}</span>
                    </span>
                  </div>
                )}

                {restItems.map((listing, i) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    index={nearItems.length + 1 + i}
                  />
                ))}

                {anyLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={`skel-${i}`} className="tf-skel">
                      <div className="tf-skel-img" />
                      <div className="tf-skel-body">
                        <div className="tf-skel-line" style={{ width: "45%", height: 13 }} />
                        <div className="tf-skel-line" style={{ width: "85%" }} />
                        <div className="tf-skel-line" style={{ width: "60%" }} />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Pagination stays per-tier — each fetches independently */}
              <div className="tf-pagers">
                <Pager label="Closest to you" tier={tier1}
                  onPrev={() => { setTier1((p) => ({ ...p, page: p.page - 1 })); fetchTier1Page(false); }}
                  onNext={() => { setTier1((p) => ({ ...p, page: p.page + 1 })); fetchTier1Page(false); }} />
                <Pager label={tier2Label} tier={tier2}
                  onPrev={() => { setTier2((p) => ({ ...p, page: p.page - 1 })); fetchTier2Page(false); }}
                  onNext={() => { setTier2((p) => ({ ...p, page: p.page + 1 })); fetchTier2Page(false); }} />
                <Pager label={tier3Label} tier={tier3}
                  onPrev={() => { setTier3((p) => ({ ...p, page: p.page - 1 })); fetchTier3Page(false); }}
                  onNext={() => { setTier3((p) => ({ ...p, page: p.page + 1 })); fetchTier3Page(false); }} />
              </div>
            </section>
          )}

          {tier1.hasLoadedOnce && tier2.hasLoadedOnce && tier3.hasLoadedOnce &&
            tier1.items.length === 0 && tier2.items.length === 0 && tier3.items.length === 0 && (
              <p className="tf-empty">
                <span className="tf-empty-emoji" aria-hidden="true">🪧</span>
                <span className="tf-empty-h">Nothing here yet</span>
                <span className="tf-empty-s">Be the first to post a listing in this area.</span>
              </p>
            )}
        </>
      )}
    </div>
    </>
  );
}

type PagerProps = {
  label: string;
  tier: TierState;
  onPrev: () => void;
  onNext: () => void;
};

/**
 * Prev/next for a single tier.
 *
 * The tiers render as one merged grid but still fetch independently, so each
 * keeps its own pager. Renders nothing unless that tier actually has another
 * page — in practice only one of the three is usually pageable, so this stays
 * quiet rather than showing three sets of dead buttons.
 *
 * Numbered pages aren't possible yet: get_listings_near/get_listings_far return
 * hasMore but no total count. Add a p_include_count param to those RPCs and
 * totalPages = ceil(count / pageSize) becomes available.
 */
function Pager({ label, tier, onPrev, onNext }: PagerProps) {
  const hasPrev = tier.page > 0;
  const hasNext = tier.hasMore;
  if (!hasPrev && !hasNext) return null;

  return (
    <div className="tf-pager">
      <span className="tf-pager-label">{label}</span>
      <button type="button" onClick={onPrev} disabled={!hasPrev || tier.isLoading} className="tf-pager-btn">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Prev
      </button>
      <span className="tf-pager-page">{tier.page + 1}</span>
      <button type="button" onClick={onNext} disabled={!hasNext || tier.isLoading} className="tf-pager-btn">
        Next
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
      {tier.isLoading && <span style={{ fontSize: 11, color: "#9ca3af" }}>Loading…</span>}
    </div>
  );
}