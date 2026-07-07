// Import Next.js's helper types for reading the request and sending a JSON response
import { NextRequest, NextResponse } from "next/server";
// Import our Meilisearch client helper and index name constant
import { getMeilisearchClient, LISTINGS_INDEX_NAME, type ListingSearchDocument } from "@/lib/server/meilisearch";

// Define the small set of sort options this route understands, matching the UI's sort dropdown
type SortOption = "relevance" | "price_asc" | "price_desc" | "newest" | "distance";

// Define the GET handler — runs when the client calls GET /api/search/query?...
export async function GET(request: NextRequest) {
  // Grab the URL's query parameters for easy reading
  const params = request.nextUrl.searchParams;

  // Read the free-text search query, defaulting to an empty string (an empty query still works
  // in Meilisearch — it just means "match everything", useful for filter-only browsing)
  const q = params.get("q") ?? "";
  // Read the optional category ID filter
  const categoryId = params.get("categoryId");
  // Read the optional minimum price filter
  const priceMin = params.get("priceMin");
  // Read the optional maximum price filter
  const priceMax = params.get("priceMax");
  // Read the optional condition filter ("new" or "used")
  const condition = params.get("condition");
  // Read the optional listing type filter ("sale" or "rent")
  const listingType = params.get("listingType");
  // Read the optional search-center latitude (needed for radius filtering and distance sort)
  const lat = params.get("lat") ? parseFloat(params.get("lat")!) : null;
  // Read the optional search-center longitude
  const lng = params.get("lng") ? parseFloat(params.get("lng")!) : null;
  // Read the optional outer radius in km (used together with lat/lng)
  const radiusKm = params.get("radiusKm") ? parseFloat(params.get("radiusKm")!) : null;
  // Read the optional inner radius in km — lets the tiered results page ask for a "ring",
  // exactly mirroring the p_min_radius_km parameter on our Postgres get_listings_near() function
  const minRadiusKm = params.get("minRadiusKm") ? parseFloat(params.get("minRadiusKm")!) : null;
  // Read the requested sort option, defaulting to relevance
  const sort = (params.get("sort") as SortOption | null) ?? "relevance";
  // Read the requested page size, defaulting to 20, capped at 50 to avoid abuse
  const limit = Math.min(Number(params.get("limit")) || 20, 50);
  // Read the requested offset, defaulting to 0
  const offset = Number(params.get("offset")) || 0;

  // Start building the list of filter clauses — every search always excludes non-active listings.
  // Note: string values in Meilisearch filter expressions must be double-quoted; numbers must not be.
  const filterClauses: string[] = [`status = "active"`];
  // Add a category filter if one was given
  if (categoryId) filterClauses.push(`category_id = "${categoryId}"`);
  // Add a minimum price filter if one was given
  if (priceMin) filterClauses.push(`price >= ${Number(priceMin)}`);
  // Add a maximum price filter if one was given
  if (priceMax) filterClauses.push(`price <= ${Number(priceMax)}`);
  // Add a condition filter if one was given
  if (condition) filterClauses.push(`condition = "${condition}"`);
  // Add a listing type filter if one was given
  if (listingType) filterClauses.push(`listing_type = "${listingType}"`);
  // Add the outer radius geo filter if we have a center point and a radius
  if (lat !== null && lng !== null && radiusKm !== null) {
    // _geoRadius takes the radius in METERS, so convert from km
    filterClauses.push(`_geoRadius(${lat}, ${lng}, ${radiusKm * 1000})`);
  }
  // Add the inner-radius EXCLUSION if a minimum radius was given — same "ring" trick as the
  // Postgres function, letting Tier 2 ask for "everything between 3km and 10km"
  if (lat !== null && lng !== null && minRadiusKm !== null && minRadiusKm > 0) {
    filterClauses.push(`NOT _geoRadius(${lat}, ${lng}, ${minRadiusKm * 1000})`);
  }

  // Translate our small sort enum into the actual Meilisearch sort array it expects
  let meilisearchSort: string[] | undefined;
  // "relevance" needs no explicit sort param — Meilisearch's default ranking already handles it
  if (sort === "price_asc") meilisearchSort = ["price:asc"];
  if (sort === "price_desc") meilisearchSort = ["price:desc"];
  if (sort === "newest") meilisearchSort = ["created_at:desc"];
  // Distance sort requires a center point — silently ignored if none was provided
  if (sort === "distance" && lat !== null && lng !== null) {
    meilisearchSort = [`_geoPoint(${lat}, ${lng}):asc`];
  }

  try {
    // Get a configured Meilisearch client
    const client = getMeilisearchClient();
    // Run the actual search against our listings index
    const results = await client.index<ListingSearchDocument>(LISTINGS_INDEX_NAME).search(q, {
      // Join every filter clause with AND
      filter: filterClauses.join(" AND "),
      // Apply our translated sort, if any
      sort: meilisearchSort,
      // Apply the requested page size
      limit,
      // Apply the requested offset
      offset,
      // Ask for every normal field — the virtual _geoDistance field is included automatically
      // by Meilisearch whenever a _geoPoint sort is active, no special request needed for it
      attributesToRetrieve: ["*"],
    });

    // Respond with the hits and a couple of useful metadata fields. Cast to a loose record here
    // since SearchResponse's exact shape varies by pagination mode in a way TypeScript can't
    // narrow cleanly with a runtime "in" check — estimatedTotalHits just falls back to the
    // current page's hit count if Meilisearch didn't include it for this particular response shape
    const resultsAsRecord = results as unknown as Record<string, unknown>;
    return NextResponse.json({
      hits: results.hits,
      estimatedTotalHits: resultsAsRecord.estimatedTotalHits ?? results.hits.length,
      query: results.query,
    });
  } catch (error) {
    // Log the underlying error on the server for debugging
    console.error("Meilisearch query failed:", error);
    // Respond gracefully with an empty result set rather than a hard failure — search being
    // briefly degraded shouldn't break the whole page the way a 500 with no body would
    return NextResponse.json({ hits: [], estimatedTotalHits: 0, query: q, error: "Search is temporarily unavailable." });
  }
}
