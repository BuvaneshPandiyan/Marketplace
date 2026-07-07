// Import our admin utilities
import { requireAdmin, getAdminSupabase } from "@/lib/server/adminUtils";
// Import Next.js's Link for the title hyperlink
import Link from "next/link";
// Import the client-side action buttons
import { AdminListingActions } from "@/app/admin/listings/AdminListingActions";

// Row types for the data we fetch — defined here since the admin client has no DB type gen
type AdminListingRow = {
  id: string; title: string; price: number; locality: string;
  flagged_reason: string | null; created_at: string; seller_id: string;
  listing_photos: { url: string; sort_order: number }[];
  profiles: { id: string; name: string | null; is_suspended: boolean; is_verified_seller: boolean } | null;
};

// The /admin/listings flagged-listings moderation queue
export default async function AdminListingsPage() {
  await requireAdmin();
  const admin = getAdminSupabase();

  // Fetch all flagged listings
  const { data: rawListings, error } = await admin
    .from("listings")
    .select(
      "id, title, price, locality, flagged_reason, created_at, seller_id," +
      "listing_photos(url, sort_order)," +
      "profiles!listings_seller_id_fkey(id, name, is_suspended, is_verified_seller)"
    )
    .eq("status", "flagged")
    .order("created_at", { ascending: false })
    .limit(100);

  // Cast to our typed array (admin client has no generated schema types)
  const listings = (rawListings as unknown as AdminListingRow[]) ?? [];

  // Count reports per listing
  const reportCounts: Record<string, number> = {};
  for (const listing of listings) {
    const { count } = await admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "listing")
      .eq("target_id", listing.id);
    reportCounts[listing.id] = count ?? 0;
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-neutral-900">Flagged Listings</h1>
      <p className="mb-6 text-sm text-neutral-500">{listings.length} listings pending review</p>

      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{(error as { message: string }).message}</p>}

      {listings.length === 0 && (
        <p className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          ✅ No flagged listings — moderation queue is clear.
        </p>
      )}

      <div className="space-y-3">
        {listings.map((listing) => {
          // Get the cover photo (lowest sort_order)
          const coverUrl = (listing.listing_photos ?? [])
            .sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
          const seller = listing.profiles;

          return (
            <div key={listing.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <div className="flex gap-4 p-4">
                {/* Thumbnail */}
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl} alt={listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">No photo</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-900">
                    <Link href={`/listing/${listing.id}`} target="_blank" className="hover:text-orange-600">
                      {listing.title}
                    </Link>
                  </p>
                  <p className="text-sm text-neutral-500">
                    ₹{Number(listing.price).toLocaleString("en-IN")} · {listing.locality}
                  </p>
                  <p className="text-xs text-neutral-400">
                    Seller: {seller?.name ?? "Unknown"}
                    {seller?.is_suspended && " (suspended)"}
                    {" "}· {reportCounts[listing.id] ?? 0} report(s)
                  </p>
                  {listing.flagged_reason && (
                    <p className="mt-1 rounded bg-orange-50 px-2 py-1 text-xs text-orange-800">
                      🚩 {listing.flagged_reason}
                    </p>
                  )}
                </div>
              </div>
              <div className="border-t border-neutral-100 px-4 py-2">
                <AdminListingActions
                  listingId={listing.id}
                  sellerId={listing.seller_id}
                  sellerName={seller?.name ?? "this seller"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
