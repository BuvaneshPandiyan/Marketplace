// Notifies everyone who was chatting about a listing that it has been sold.
//
// Called by the seller's client right after mark_listing_sold() succeeds.
// Deliberately a separate step rather than part of the RPC: the SQL function
// can't reach Firebase, and createNotification() both inserts the in-app row
// AND sends the push. Keeping it here means one code path serves web push,
// the in-app bell, and later the native app.
//
// Failure here is non-fatal by design — the listing IS already sold. A missed
// notification must never make a completed sale look like it failed.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/server/createNotification";

type RequestBody = {
  listingId: string;
};

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  // Identify the caller from their session — never trust a user id sent by the
  // client, or anyone could announce someone else's listing as sold.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Read the listing under the caller's own session, so RLS applies.
  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, seller_id, status")
    .eq("id", body.listingId)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  // Only the seller may announce their own sale.
  if (listing.seller_id !== user.id) {
    return NextResponse.json({ error: "Only the seller can do this." }, { status: 403 });
  }

  // Guard against notifying for a listing that isn't actually sold — otherwise a
  // stray call could tell buyers an item is gone while it's still on sale.
  if (listing.status !== "sold") {
    return NextResponse.json({ error: "That listing is not marked sold." }, { status: 409 });
  }

  // Everyone who opened a conversation about this item deserves to know.
  const { data: conversations } = await supabase
    .from("conversations")
    .select("buyer_id")
    .eq("listing_id", listing.id);

  // De-duplicate: one buyer may have more than one conversation on a listing,
  // and nobody wants the same notification three times.
  const buyerIds = Array.from(
    new Set((conversations ?? []).map((c) => c.buyer_id).filter((id) => id && id !== user.id))
  );

  if (buyerIds.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // Send in parallel, and don't let one failure stop the rest — allSettled
  // rather than all, because a single bad push token shouldn't silence
  // everyone else's notification.
  const results = await Promise.allSettled(
    buyerIds.map((buyerId) =>
      createNotification({
        userId: buyerId,
        type: "listing_sold",
        title: "Item sold",
        body: `"${listing.title}" has been marked as sold.`,
        // Link to the chat list rather than the listing, which is no longer
        // publicly viewable once sold.
        link: "/messages",
      })
    )
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(`[notify] listing ${listing.id}: ${failed}/${buyerIds.length} sold-notifications failed`);
  }

  return NextResponse.json({
    ok: true,
    notified: buyerIds.length - failed,
    failed,
  });
}