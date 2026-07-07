// Import Next.js helpers
import { NextRequest, NextResponse } from "next/server";
// Import our admin verification and service-role client helpers
import { verifyAdminForApi, getAdminSupabase, writeAuditLog } from "@/lib/server/adminUtils";

// A helper that pings our own /api/search/sync route after every admin listing status change,
// so Meilisearch stays consistent with the database.  We hit our own route (not Meilisearch
// directly) so the sync logic stays in one place.
async function syncAfterAction(listingId: string, request: NextRequest): Promise<void> {
  try {
    // Build an absolute URL to the sync route using the current request's host
    const url = new URL("/api/search/sync", request.url).toString();
    // POST to the sync route with the cookie forwarded so it has an auth session
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: request.headers.get("cookie") ?? "" },
      body: JSON.stringify({ listingId }),
    });
  } catch {
    // A sync failure is non-fatal — DB is the source of truth; the cron will catch up anyway
    console.error("[admin] search sync failed for", listingId);
  }
}

// The expected request body shape
type RequestBody = {
  listingId: string;
  action: "approve" | "remove" | "ban_seller";
  notes?: string;
};

// POST /api/admin/listings/action
export async function POST(request: NextRequest) {
  // Parse and validate the request body
  const body = (await request.json()) as RequestBody;
  if (!body.listingId || !body.action) {
    return NextResponse.json({ error: "listingId and action are required" }, { status: 400 });
  }

  // Verify the caller is an admin
  let adminId: string;
  try {
    adminId = await verifyAdminForApi();
  } catch (err) {
    const msg = String(err);
    return NextResponse.json(
      { error: msg.includes("UNAUTHORIZED") ? "Not logged in" : "Not an admin" },
      { status: msg.includes("UNAUTHORIZED") ? 401 : 403 }
    );
  }

  // Service-role client for DB mutations
  const admin = getAdminSupabase();

  // Fetch the listing to get the seller ID and title
  const { data: listing } = await admin
    .from("listings")
    .select("id, seller_id, title")
    .eq("id", body.listingId)
    .single();
  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  if (body.action === "approve") {
    // Restore the listing to active and clear the moderation flag reason
    const { error } = await admin
      .from("listings")
      .update({ status: "active", flagged_reason: null })
      .eq("id", body.listingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await writeAuditLog({ adminId, action: "approve_listing", targetType: "listing", targetId: body.listingId, notes: body.notes ?? `Approved: "${listing.title}"` });
    // Re-index in Meilisearch now that the listing is active again
    await syncAfterAction(body.listingId, request);
  }

  else if (body.action === "remove") {
    // Permanently remove the listing from public view
    const { error } = await admin.from("listings").update({ status: "removed" }).eq("id", body.listingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await writeAuditLog({ adminId, action: "remove_listing", targetType: "listing", targetId: body.listingId, notes: body.notes ?? `Removed: "${listing.title}"` });
    // Delete from Meilisearch — removed listings must not appear in search results
    await syncAfterAction(body.listingId, request);
  }

  else if (body.action === "ban_seller") {
    // Suspend the seller's account and flag all their active listings
    const { error } = await admin.rpc("suspend_user", {
      p_target_user_id: listing.seller_id,
      p_admin_id: adminId,
      p_notes: body.notes ?? `Banned via listing: "${listing.title}"`,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Also mark this specific listing as removed
    await admin.from("listings").update({ status: "removed" }).eq("id", body.listingId);
    await writeAuditLog({ adminId, action: "ban_seller", targetType: "user", targetId: listing.seller_id, notes: body.notes ?? `Banned seller of "${listing.title}"` });
    // Remove from Meilisearch
    await syncAfterAction(body.listingId, request);
  }

  else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
