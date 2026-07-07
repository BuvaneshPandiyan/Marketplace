// Import Next.js helpers
import { redirect } from "next/navigation";
// Import Next.js's Link for navigation
import Link from "next/link";
// Import our server-side Supabase client
import { createClient } from "@/lib/supabase/server";
// Import our relative date formatter
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";

// The /wishlist page — an async Server Component
export default async function WishlistPage() {
  // Create a server-side Supabase client for this request
  const supabase = await createClient();
  // Require login — middleware already protects /wishlist but double-check here
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch every wishlist entry for the current user, joined with the full listing data
  // (we need the current price to detect price drops vs the stored price_at_save)
  const { data: entries } = await supabase
    .from("wishlist")
    .select("id, price_at_save, created_at, listings(id, title, price, status, locality, listing_type, listing_photos(url, sort_order))")
    .eq("user_id", user.id)
    // Show most-recently-saved first
    .order("created_at", { ascending: false });

  // Shape each entry into a display-ready object
  type WishlistDisplayEntry = {
    wishlistId: string;
    listingId: string;
    title: string;
    currentPrice: number;
    priceAtSave: number;
    status: string;
    locality: string;
    listingType: string;
    coverPhotoUrl: string | null;
    savedAt: string;
    // Which badge to show next to the listing
    badge: "available" | "sold" | "price_drop";
  };

  const displayEntries: WishlistDisplayEntry[] = (entries ?? []).map((entry) => {
    // Supabase returns the joined listing as a nested object — cast it
    type ListingShape = {
      id: string; title: string; price: number; status: string;
      locality: string; listing_type: string;
      listing_photos: { url: string; sort_order: number }[];
    };
    const listing = entry.listings as unknown as ListingShape | null;
    // The listing's current price as a plain number
    const currentPrice = Number(listing?.price ?? entry.price_at_save);
    // The price when the user wishlisted it
    const priceAtSave = Number(entry.price_at_save);

    // Decide which badge to show:
    // 1. If the listing is sold/removed, show Sold
    // 2. If the current price is meaningfully lower than save price, show Price dropped
    // 3. Otherwise, show Available
    let badge: WishlistDisplayEntry["badge"] = "available";
    if (listing?.status === "sold" || listing?.status === "removed") {
      badge = "sold";
    } else if (currentPrice < priceAtSave * 0.95) {
      // Price has dropped by 5% or more since save — show a price drop badge
      badge = "price_drop";
    }

    // Get the cover photo (lowest sort_order)
    const coverPhotoUrl =
      (listing?.listing_photos ?? []).sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;

    return {
      wishlistId: entry.id,
      listingId: listing?.id ?? "",
      title: listing?.title ?? "Listing",
      currentPrice,
      priceAtSave,
      status: listing?.status ?? "active",
      locality: listing?.locality ?? "",
      listingType: listing?.listing_type ?? "sale",
      coverPhotoUrl,
      savedAt: entry.created_at,
      badge,
    };
  });

  // Render the wishlist page
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Page heading */}
      <h1 className="mb-4 text-lg font-bold text-neutral-900">Saved listings</h1>

      {/* Empty state */}
      {displayEntries.length === 0 && (
        <p className="text-sm text-neutral-500">
          You haven&apos;t saved any listings yet. Tap the heart icon on any listing to save it here.
        </p>
      )}

      {/* The wishlist grid — two columns on mobile, three on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {displayEntries.map((entry) => (
          <Link
            key={entry.wishlistId}
            href={`/listing/${entry.listingId}`}
            className="group overflow-hidden rounded-xl border border-neutral-200 bg-white hover:border-neutral-300"
          >
            {/* Cover photo */}
            <div className="relative aspect-square w-full bg-neutral-100">
              {entry.coverPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
                <img src={entry.coverPhotoUrl} alt={entry.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">No photo</div>
              )}
              {/* Status badge overlaid in the top-right corner */}
              <span
                className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  // Different badge styles for each status
                  entry.badge === "sold"
                    ? "bg-neutral-700 text-white"
                    : entry.badge === "price_drop"
                    ? "bg-green-600 text-white"
                    : "bg-white/90 text-neutral-700"
                }`}
              >
                {/* Badge text */}
                {entry.badge === "sold" ? "Sold" : entry.badge === "price_drop" ? "Price ↓" : "Available"}
              </span>
            </div>

            {/* Listing details */}
            <div className="p-2.5">
              {/* Title */}
              <p className="line-clamp-2 text-sm font-medium text-neutral-900">{entry.title}</p>
              {/* Current price */}
              <p className="mt-0.5 text-sm font-semibold text-neutral-900">
                ₹{entry.currentPrice.toLocaleString("en-IN")}
                {entry.listingType === "rent" && <span className="font-normal text-neutral-500">/month</span>}
              </p>
              {/* Price-drop detail — show both the old and new price when relevant */}
              {entry.badge === "price_drop" && (
                <p className="text-xs text-green-700">
                  Was ₹{entry.priceAtSave.toLocaleString("en-IN")}
                </p>
              )}
              {/* Locality */}
              <p className="mt-0.5 truncate text-xs text-neutral-500">{entry.locality}</p>
              {/* When it was saved */}
              <p className="mt-0.5 text-xs text-neutral-400">Saved {formatRelativeDate(entry.savedAt)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
