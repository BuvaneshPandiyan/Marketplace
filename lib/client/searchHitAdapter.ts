// Import our shared types
import type { FeedListingItem } from "@/types";

// Define the shape of a hit as it actually comes back from our /api/search/query route —
// matches ListingSearchDocument plus the optional Meilisearch-computed geo distance field
export type SearchHit = {
  id: string;
  title: string;
  price: number;
  listing_type: "sale" | "rent";
  condition: "new" | "used";
  locality: string;
  _geo: { lat: number; lng: number };
  // Unix timestamp in SECONDS, as stored in the index — different from Postgres's ISO strings
  created_at: number;
  seller_id: string;
  category_id: string;
  // The listing's category name — not used by the adapter below, but useful for UI like the
  // autocomplete dropdown wanting to show category context next to each suggestion
  category_name: string;
  cover_photo_url: string | null;
  // Only present when the query used a _geoPoint sort — the distance in METERS from the search center
  _geoDistance?: number;
};

// Define and export a function that converts one search hit into the shape ListingCard expects
export function searchHitToFeedListingItem(hit: SearchHit): FeedListingItem {
  return {
    // Carry over the ID as-is
    id: hit.id,
    // Carry over the title as-is
    title: hit.title,
    // Carry over the price as-is
    price: hit.price,
    // Carry over the listing type as-is
    listing_type: hit.listing_type,
    // Carry over the condition as-is
    condition: hit.condition,
    // Carry over the locality as-is
    locality: hit.locality,
    // Pull latitude out of the nested _geo field
    lat: hit._geo.lat,
    // Pull longitude out of the nested _geo field
    lng: hit._geo.lng,
    // Convert the Unix-seconds timestamp back into an ISO string, matching FeedListingItem's shape
    created_at: new Date(hit.created_at * 1000).toISOString(),
    // Carry over the seller ID as-is
    seller_id: hit.seller_id,
    // Carry over the category ID as-is
    category_id: hit.category_id,
    // Search results don't track per-listing view counts the way the feed's RPC does — default to 0
    view_count: 0,
    // Carry over the cover photo URL as-is
    cover_photo_url: hit.cover_photo_url,
    // Convert the geo distance from meters to kilometers, only when it was actually computed
    distance_km: typeof hit._geoDistance === "number" ? hit._geoDistance / 1000 : undefined,
  };
}
