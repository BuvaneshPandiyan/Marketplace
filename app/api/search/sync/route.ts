// Import Next.js's helper types for reading the request and sending a JSON response
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buildListingSearchDocument } from "@/lib/server/buildListingSearchDocument";
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

    // ── Purge caches for anything showing this listing ──
    // The listing detail page caches its public data under the tag `listing:${id}`
    // (unstable_cache), and the seller profile page is full-route cached (ISR).
    // Without this, an edit / price change / "mark as sold" / delete could keep
    // showing the OLD state for up to the revalidate window. Purging here — at the
    // single choke point every mutation already calls — refreshes them immediately.
    // This is the correctness half of caching.
    revalidateTag(`listing:${listingId}`);
    if (document?.seller_id) {
      revalidatePath(`/seller/${document.seller_id}`);
    } else {
      // Listing was deleted and we couldn't read its seller from the doc — fall back
      // to a direct lookup so the seller's page still gets purged.
      const { data: row } = await supabase.from("listings").select("seller_id").eq("id", listingId).maybeSingle();
      if (row?.seller_id) revalidatePath(`/seller/${row.seller_id}`);
    }

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