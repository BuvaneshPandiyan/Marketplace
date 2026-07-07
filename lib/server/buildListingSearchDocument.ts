// Import the type for a Supabase client (works with either the server or service-role client)
import type { SupabaseClient } from "@supabase/supabase-js";
// Import the document shape we need to build
import type { ListingSearchDocument } from "@/lib/server/meilisearch";

// Define and export a function that builds a full search document for one listing by ID.
// Returns null if the listing doesn't exist (e.g., it was deleted between the mutation and this call).
export async function buildListingSearchDocument(
  // Any Supabase client — RLS already allows a seller to read their own listing regardless of status
  supabase: SupabaseClient,
  // Which listing to build a document for
  listingId: string
): Promise<ListingSearchDocument | null> {
  // Fetch the listing's core columns plus its directly-linked category in one round trip —
  // we deliberately avoid PostgREST's nested self-referencing-FK join syntax for the category's
  // PARENT category (it requires knowing the exact constraint name and is fragile), and instead
  // resolve the parent with a small separate lookup below, same pragmatic approach used elsewhere
  // in this app (see components/feed/CategoryChips.tsx for the same reasoning)
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("*, categories(name, parent_id)")
    .eq("id", listingId)
    .single();

  // If the listing wasn't found (or RLS denied access), there's nothing to build a document for
  if (listingError || !listing) {
    return null;
  }

  // Fetch every attribute row for this listing, so we can flatten their values into one blob
  const { data: attributeRows } = await supabase.from("listing_attributes").select("value").eq("listing_id", listingId);

  // Fetch this listing's cover (lowest sort_order) photo URL, if it has any photos
  const { data: photoRows } = await supabase
    .from("listing_photos")
    .select("url")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true })
    .limit(1);

  // Pull the joined category data back out (Supabase returns it as a nested object on the row)
  const category = listing.categories as { name: string; parent_id: string | null } | null;

  // Default the subcategory's parent name to the category's own name, in case it has no parent
  let parentCategoryName = category?.name ?? "";
  // If this category DOES have a parent, look up just that parent's name with one small query
  if (category?.parent_id) {
    // Fetch only the name column of the parent category row
    const { data: parentCategory } = await supabase.from("categories").select("name").eq("id", category.parent_id).single();
    // Use the parent's real name if we found one
    if (parentCategory?.name) {
      parentCategoryName = parentCategory.name;
    }
  }

  // Flatten every attribute's value into one space-separated string, skipping any null/empty ones
  const attributesBlob = (attributeRows ?? [])
    .map((row) => row.value)
    .filter((value): value is string => Boolean(value))
    .join(" ");

  // Build and return the final document in exactly the shape Meilisearch expects
  return {
    // Meilisearch's primary key for this document
    id: listing.id,
    // The listing's title
    title: listing.title,
    // The description, defaulting to an empty string since Meilisearch fields shouldn't be null
    description: listing.description ?? "",
    // The directly-linked category's name
    category_name: category?.name ?? "",
    // The resolved top-level parent category name (or the category's own name if it has no parent)
    subcategory_parent_name: parentCategoryName,
    // The flattened attribute values
    attributes_blob: attributesBlob,
    // The price — coerced with Number() defensively, since Postgres numeric columns can come
    // back as strings depending on the client/driver in use, even though Supabase's real
    // PostgREST layer normally serializes them as proper JSON numbers
    price: Number(listing.price),
    // Meilisearch's reserved geo field, built from the listing's lat/lng
    _geo: { lat: listing.lat, lng: listing.lng },
    // The locality name, defaulting to an empty string if somehow unset
    locality: listing.locality ?? "",
    // Convert the ISO created_at timestamp into a Unix timestamp (seconds) for numeric sorting
    created_at: Math.floor(new Date(listing.created_at).getTime() / 1000),
    // The listing's current status
    status: listing.status,
    // Sale or rent
    listing_type: listing.listing_type,
    // New or used
    condition: listing.condition,
    // The category ID, for exact-match filtering
    category_id: listing.category_id,
    // The cover photo URL, or null if this listing somehow has no photos
    cover_photo_url: photoRows?.[0]?.url ?? null,
    // Who posted it
    seller_id: listing.seller_id,
  };
}
