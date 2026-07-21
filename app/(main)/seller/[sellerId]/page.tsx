// Seller public profile page — /seller/[sellerId]
// Shows the seller's profile header + all their active public listings.
// Data-fetching only (Server Component); all interactivity via ListingCard (Client).
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAnonClient } from "@/lib/supabase/anon";
import { VerifiedBadge } from "@/components/listing/SellerMiniProfile";
import { SellerListingsGrid } from "@/components/seller/SellerListingsGrid";
import type { FeedListingItem } from "@/types";

// Public seller page — no per-user rendering, so it is cache-safe.
// Cached copy is served from the edge and refreshed at most every 5 min,
// plus purged on-demand when this seller's listings change (see revalidate wiring).
export const revalidate = 300;

// generateMetadata for SEO / OG
export async function generateMetadata({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}): Promise<Metadata> {
  const { sellerId } = await params;
  const supabase = createAnonClient();
  const { data: seller } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", sellerId)
    .single();
  if (!seller) return { title: "Seller not found" };
  return { title: `${seller.name ?? "Seller"} — bazar.in` };
}

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;
  const supabase = createAnonClient();

  // Both queries only need sellerId (a param), not each other — run in parallel.
  const [{ data: seller }, { data: rawListings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, profile_photo_url, rating_avg, rating_count, created_at, is_verified_seller")
      .eq("id", sellerId)
      .single(),
    supabase
      .from("listings")
      .select("*, listing_photos(url, sort_order)")
      .eq("seller_id", sellerId)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  if (!seller) notFound();

  // Shape each row into a FeedListingItem (cover photo from first sorted photo)
  const listings: FeedListingItem[] = (rawListings ?? []).map((l) => {
    const photos = (l.listing_photos ?? []).sort(
      (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
    );
    return {
      ...l,
      cover_photo_url: photos[0]?.url ?? null,
      distance_km: null,
    } as FeedListingItem;
  });

  const memberSinceYear = new Date(seller.created_at).getFullYear();
  const isVerified = seller.is_verified_seller ?? false;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">

      {/* ── Profile header banner ─────────────────────────────────────────── */}
      <div
        className="mb-8 rounded-2xl border border-neutral-100 p-6 md:p-8"
        style={{ background: "linear-gradient(135deg, #fafaf9 0%, #f5f5f4 100%)" }}
      >
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* Avatar */}
          <div className="relative shrink-0">
            {seller.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seller.profile_photo_url}
                alt={seller.name ?? "Seller"}
                className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow-md md:h-24 md:w-24"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100 text-3xl font-bold text-orange-700 ring-4 ring-white shadow-md md:h-24 md:w-24">
                {seller.name?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            {isVerified && (
              <VerifiedBadge className="absolute bottom-0 right-0 h-6 w-6 ring-2 ring-white rounded-full" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            {/* Name + verified */}
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-bold text-neutral-900">{seller.name ?? "Seller"}</h1>
              {isVerified && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                  Verified
                </span>
              )}
            </div>

            {/* Rating */}
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-neutral-600 sm:justify-start">
              {(seller.rating_count ?? 0) > 0 ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth={1}>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span className="font-medium">{(seller.rating_avg ?? 0).toFixed(1)}</span>
                  <span className="text-neutral-400">({seller.rating_count} rating{seller.rating_count !== 1 ? "s" : ""})</span>
                </>
              ) : (
                <span className="text-neutral-400">No ratings yet</span>
              )}
            </p>

            {/* Member since + listing count */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-neutral-500 sm:justify-start">
              <span>Member since {memberSinceYear}</span>
              <span className="hidden sm:inline text-neutral-300">·</span>
              <span className="font-medium text-orange-600">
                {listings.length} active listing{listings.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Listings grid ─────────────────────────────────────────────────── */}
      <h2 className="mb-4 text-lg font-bold text-neutral-900">
        {listings.length > 0 ? "Active listings" : ""}
      </h2>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5}>
              <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
              <path d="M16 3l-4 4-4-4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-neutral-700">No active listings</p>
          <p className="mt-1 text-xs text-neutral-500">This seller has no active listings right now.</p>
        </div>
      ) : (
        // SellerListingsGrid is a Client Component that handles pagination + media query
        <SellerListingsGrid listings={listings} />
      )}
    </div>
  );
}