// Import Next.js's helper types for reading the request and sending a JSON response
import { NextRequest, NextResponse } from "next/server";
import { allowRequest } from "@/lib/server/rateLimit";
// Import our server-only reverse geocoding helper
import { reverseGeocode } from "@/lib/server/nominatim";

// Define the GET handler — runs when the client calls GET /api/geo/reverse?lat=...&lng=...
export async function GET(request: NextRequest) {
  // Nominatim bans by IP, and a ban takes out location for every user at once.
  // Throttle per client so one abusive caller cannot cost everyone else.
  if (!(await allowRequest(request, "geo-reverse", 40, 60))) {
    return NextResponse.json(
      { error: "Too many location requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Read the lat/lng query parameters off the request URL
  const lat = request.nextUrl.searchParams.get("lat");
  // Read the longitude query parameter
  const lng = request.nextUrl.searchParams.get("lng");

  // Guard clause: both coordinates must be present
  if (!lat || !lng) {
    // Respond with a 400 Bad Request if either is missing
    return NextResponse.json({ error: "lat and lng query parameters are required." }, { status: 400 });
  }

  // Parse the coordinate strings into actual numbers
  const latNum = parseFloat(lat);
  // Parse the longitude string into a number
  const lngNum = parseFloat(lng);

  // Guard clause: make sure parsing actually produced valid numbers
  if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
    // Respond with a 400 Bad Request if either value wasn't a valid number
    return NextResponse.json({ error: "lat and lng must be valid numbers." }, { status: 400 });
  }

  try {
    // Call our helper to turn these coordinates into a human-readable locality string
    const locality = await reverseGeocode(latNum, lngNum);
    // Respond with the resulting locality (which may be null if nothing was found)
    return NextResponse.json({ locality });
  } catch (error) {
    // Log the underlying error on the server for debugging
    console.error("Reverse geocoding failed:", error);
    // Respond with a 500 error and a user-facing message
    return NextResponse.json({ error: "Failed to determine your locality. Please try again." }, { status: 500 });
  }
}