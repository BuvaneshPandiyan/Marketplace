// Import Next.js's helper types for reading the request and sending a JSON response
import { NextRequest, NextResponse } from "next/server";
import { allowRequest } from "@/lib/server/rateLimit";
// Import our server-only place-search helper
import { searchPlaces } from "@/lib/server/nominatim";

// Define the GET handler — runs when the client calls GET /api/geo/search?q=...
export async function GET(request: NextRequest) {
  // Nominatim bans by IP, and a ban takes out location for every user at once.
  // Throttle per client so one abusive caller cannot cost everyone else.
  if (!(await allowRequest(request, "geo-search", 20, 60))) {
    return NextResponse.json(
      { error: "Too many location requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Read the search query text off the request URL
  const query = request.nextUrl.searchParams.get("q");

  // Guard clause: a query string must be provided
  if (!query) {
    // Respond with a 400 Bad Request if it's missing
    return NextResponse.json({ error: "q query parameter is required." }, { status: 400 });
  }

  try {
    // Call our helper to search Nominatim for places matching this query
    const results = await searchPlaces(query);
    // Respond with the array of matching places (possibly empty)
    return NextResponse.json({ results });
  } catch (error) {
    // Log the underlying error on the server for debugging
    console.error("Place search failed:", error);
    // Respond with a 500 error and a user-facing message
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}