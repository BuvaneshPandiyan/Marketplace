// Import Next.js's helper types for reading the request and sending a JSON response
import { NextRequest, NextResponse } from "next/server";
// Used to identify the caller so we can keep their own listings out of results
import { createClient } from "@/lib/supabase/server";
// Cookie-free client for the Postgres search path
import { createAnonClient } from "@/lib/supabase/anon";

// Define the small set of sort options this route understands, matching the UI's sort dropdown
type SortOption = "relevance" | "price_asc" | "price_desc" | "newest" | "distance";

// Define the GET handler — runs when the client calls GET /api/search/query?...
export async function GET(request: NextRequest) {
  // Grab the URL's query parameters for easy reading
  const params = request.nextUrl.searchParams;

  // Who is asking? You can't buy your own item, so a seller's own listings are
  // noise in their search results. Anonymous callers get everything.
  let currentUserId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    currentUserId = data.user?.id ?? null;
  } catch {
    // Session lookup failing must never break search — just don't filter.
  }

  // Read the free-text search query, defaulting to an empty string (an empty query still works
  // — an empty query just means "match everything", useful for filter-only browsing)
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


  /**
   * Search runs entirely in Postgres — no external search service.
   *
   * search_listings() does stemming ("bikes" finds "bike"), prefix matching
   * ("iph" finds "iPhone") and trigram typo tolerance ("iphonr" finds
   * "iPhone"), and applies the same filters and sorts the API always supported.
   */
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase.rpc("search_listings", {
      p_q: q,
      p_category_id: categoryId,
      p_price_min: priceMin,
      p_price_max: priceMax,
      p_condition: condition,
      p_listing_type: listingType,
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radiusKm,
      p_min_radius_km: minRadiusKm,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
      p_exclude_seller: currentUserId,
    });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    // total_count is a window function, so it repeats on every row and is only
    // meaningful when at least one row came back.
    const total = rows.length > 0 ? Number(rows[0].total_count ?? rows.length) : 0;

    // Reshape into the hit format the client adapter expects: nested _geo,
    // created_at as Unix SECONDS, and distance in METERS. Keeping this contract
    // means SearchBar and SearchResults need no changes.
    const hits = rows.map((row) => ({
      id: row.id,
      title: row.title,
      price: Number(row.price),
      listing_type: row.listing_type,
      condition: row.condition,
      locality: row.locality,
      _geo: { lat: Number(row.lat), lng: Number(row.lng) },
      created_at: Math.floor(new Date(String(row.created_at)).getTime() / 1000),
      seller_id: row.seller_id,
      category_id: row.category_id,
      category_name: row.category_name,
      subcategory_parent_name: row.subcategory_parent_name,
      cover_photo_url: row.cover_photo_url,
      description: row.description,
      ...(row.distance_km != null
        ? { _geoDistance: Number(row.distance_km) * 1000 }
        : {}),
    }));

    return NextResponse.json({ hits, estimatedTotalHits: total, query: q });
  } catch (error) {
    console.error("[search] query failed:", error);
    // Degrade to an empty result set rather than a hard failure, so a search
    // problem never takes down the whole page.
    return NextResponse.json({
      hits: [],
      estimatedTotalHits: 0,
      query: q,
      error: "Search is temporarily unavailable.",
    });
  }
}