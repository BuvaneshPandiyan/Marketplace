// Import Next.js's helper types for reading the request and sending a JSON response
import { NextRequest, NextResponse } from "next/server";
// Import our server-side Supabase client creator (respects the caller's own RLS-scoped session)
import { createClient } from "@/lib/supabase/server";
// Import the function that fetches and flattens a listing into a search document
import { buildListingSearchDocument } from "@/lib/server/buildListingSearchDocument";
// Import the functions that actually write to (or remove from) Meilisearch
import { upsertListingDocument, deleteListingDocument } from "@/lib/server/meilisearch";

// Define the POST handler — runs when the client calls POST /api/search/sync after a mutation
export async function POST(request: NextRequest) {
  // Parse the JSON body, wrapped in try/catch in case it's malformed
  let body: { listingId?: string };
  try {
    // Attempt to parse the request body as JSON
    body = await request.json();
  } catch {
    // If parsing fails, the request body wasn't valid JSON at all
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Pull the listing ID out of the parsed body
  const listingId = body.listingId;
  // Guard clause: a listing ID is required
  if (!listingId) {
    return NextResponse.json({ error: "listingId is required." }, { status: 400 });
  }

  // Create a server-side Supabase client scoped to whoever is actually calling this route
  const supabase = await createClient();
  // Require the caller to be logged in — syncing is only ever triggered right after a mutation
  // the user themselves just performed, so there's no legitimate anonymous use case for this route
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "You must be logged in to do this." }, { status: 401 });
  }

  try {
    // Build the listing's current document straight from Postgres — RLS (via this user's own
    // session) naturally limits this to listings they're actually allowed to read
    const document = await buildListingSearchDocument(supabase, listingId);

    // If the listing no longer exists, or its status isn't "active", it shouldn't be searchable —
    // make sure any previously-indexed copy is removed rather than left stale
    if (!document || document.status !== "active") {
      await deleteListingDocument(listingId);
      return NextResponse.json({ success: true, action: "removed" });
    }

    // Otherwise, push the current (active) state of the listing into the index
    await upsertListingDocument(document);
    return NextResponse.json({ success: true, action: "indexed" });
  } catch (error) {
    // Log the underlying error on the server for debugging
    console.error("Search sync failed:", error);
    // Respond with a 500, but this is intentionally non-fatal from the CALLER's perspective —
    // every call site treats a sync failure as a background concern, never blocking the user's
    // actual action (e.g., a listing still gets created even if indexing it happens to fail)
    return NextResponse.json({ error: "Failed to sync this listing to search." }, { status: 500 });
  }
}
