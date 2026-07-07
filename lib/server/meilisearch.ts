// Import the official Meilisearch JS client SDK
import { Meilisearch } from "meilisearch";

// The name of the Meilisearch index that stores searchable listing documents
export const LISTINGS_INDEX_NAME = "listings";

// Define the exact shape of a document we store in the listings index — this is intentionally
// a flattened, denormalized copy of listing data, since Meilisearch (unlike Postgres) has no
// joins, so anything we want to search/filter/sort by must already live on the document itself
export type ListingSearchDocument = {
  // The listing's ID, used as Meilisearch's primary key for this document
  id: string;
  // The listing's title — the main searchable field
  title: string;
  // The listing's description, also searchable
  description: string;
  // The listing's direct category name, e.g., "Bikes" — searchable
  category_name: string;
  // The listing's TOP-LEVEL parent category name, e.g., "Vehicles" — searchable, may equal
  // category_name itself if this listing's category has no parent
  subcategory_parent_name: string;
  // Every category-specific attribute VALUE, flattened into one space-separated string so a
  // search for e.g. "Petrol" or "Mint" also matches against listing_attributes values
  attributes_blob: string;
  // The asking price — filterable and sortable
  price: number;
  // Meilisearch's reserved geo field — required in exactly this {lat, lng} shape for
  // _geoRadius() filters and _geoPoint() distance sorting to work
  _geo: { lat: number; lng: number };
  // The human-readable locality name — filterable
  locality: string;
  // The creation time as a Unix timestamp (seconds) — Meilisearch sorts numbers, not date strings
  created_at: number;
  // The listing's lifecycle status — always filtered to "active" in every public-facing query
  status: string;
  // "sale" or "rent" — filterable
  listing_type: string;
  // "new" or "used" — filterable
  condition: string;
  // The category ID — filterable (lets the UI filter by exact category without relying on names)
  category_id: string;
  // The listing's cover photo URL, shown directly in search result cards without a second lookup
  cover_photo_url: string | null;
  // Who posted it — not filtered on directly today, but useful for any future "hide my own
  // listings from my own search results" type feature
  seller_id: string;
};

// Define and export a function that creates a configured Meilisearch client instance.
// Reads connection details from environment variables so the same code works against a local
// Docker instance during development and a hosted instance (VPS or Meilisearch Cloud) in production.
export function getMeilisearchClient(): Meilisearch {
  // Read the Meilisearch host URL from the environment
  const host = process.env.MEILISEARCH_HOST;
  // Read the Meilisearch ADMIN API key from the environment — this key can write to the index,
  // so it must only ever be used here, on the server, never sent to the browser
  const apiKey = process.env.MEILISEARCH_API_KEY;

  // Guard clause: fail loudly and clearly if either required variable is missing
  if (!host || !apiKey) {
    // Throw a descriptive error so a misconfigured deployment fails obviously, not silently
    throw new Error("MEILISEARCH_HOST and MEILISEARCH_API_KEY must both be set.");
  }

  // Construct and return the configured client
  return new Meilisearch({
    // The base URL of the Meilisearch instance
    host,
    // The API key used to authenticate every request this client makes
    apiKey,
  });
}

// Define and export a function that adds or fully replaces one listing's document in the index —
// Meilisearch's addDocuments() performs an upsert keyed by primary key, so this single function
// covers both "a new listing was created" and "an existing listing was edited"
export async function upsertListingDocument(document: ListingSearchDocument): Promise<void> {
  // Get a configured client
  const client = getMeilisearchClient();
  // Send the single document as a one-item array (addDocuments is built for batches), then wait
  // for Meilisearch to actually finish processing the write before this function resolves —
  // this keeps callers from assuming the index is updated when the write might still be queued
  await client.index<ListingSearchDocument>(LISTINGS_INDEX_NAME).addDocuments([document]).waitTask();
}

// Define and export a function that removes one listing's document from the index — used when
// a listing is deleted outright, or moves to a non-public status (sold/removed/expired/flagged)
export async function deleteListingDocument(listingId: string): Promise<void> {
  // Get a configured client
  const client = getMeilisearchClient();
  // Ask Meilisearch to delete the document with this primary key, and wait for it to finish
  await client.index(LISTINGS_INDEX_NAME).deleteDocument(listingId).waitTask();
}
