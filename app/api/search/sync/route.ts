// Purges the caches that hold a listing, after it is created, edited, sold or
// deleted.
//
// This used to push the listing into an external search index. Search now runs
// directly in Postgres, where the searchable column is generated and updates
// itself on write — so there is nothing left to sync. The route survives
// because cache purging still matters: without it, an edit, a price change or
// "mark as sold" could keep serving stale data until the cache window expired.
//
// AUTHORISATION
// Cache purging is cheap to request and expensive to serve: each call discards
// cached pages and forces the next visitor to re-render from the database. Left
// open, anyone could loop over listing IDs and strip the cache continuously,
// turning every request into a database hit — a denial-of-service that needs no
// special access and leaves little trace.
//
// So a caller must be signed in AND have a legitimate reason to purge THIS
// listing: either they own it (they just changed it), or they are an admin
// (moderation, take-downs). Everyone else is refused.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/server/adminUtils";

export async function POST(request: NextRequest) {
  let listingId: string | undefined;
  try {
    const body = (await request.json()) as { listingId?: string };
    listingId = body.listingId;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!listingId) {
    return NextResponse.json({ error: "listingId is required." }, { status: 400 });
  }

  const supabase = await createClient();

  // Identify the caller from their session cookie. Never trust an id supplied
  // in the body — that would be no protection at all.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Look the listing up with the service-role client, NOT the caller's session.
  //
  // This matters for moderation. RLS lets a non-seller read only ACTIVE
  // listings, so the moment an admin sets a listing to 'removed' it becomes
  // invisible to them — and reading it through their own session would return
  // null, making a removed listing indistinguishable from a deleted one. We
  // would then purge the ADMIN's seller page instead of the real seller's, and
  // the removed listing would keep showing on that seller's profile.
  //
  // Only `id` and `seller_id` are read, and nothing is returned to the caller;
  // authorisation is still enforced below.
  const { data: listing } = await getAdminSupabase()
    .from("listings")
    .select("id, seller_id")
    .eq("id", listingId)
    .maybeSingle();

  // A DELETED listing still needs its cache cleared — in fact especially so,
  // or its page keeps being served after the row is gone. The client calls this
  // immediately after deleting, by which point there is no row left to check
  // ownership against.
  //
  // Allowing any signed-in user to purge a NON-EXISTENT listing is safe: there
  // is no cached render behind it to rebuild, so it cannot be used to generate
  // load. Anything that does exist still requires ownership below.
  if (!listing) {
    revalidateTag(`listing:${listingId}`);
    // Their own seller page will have changed, so refresh that too.
    revalidatePath(`/seller/${user.id}`);
    return NextResponse.json({ success: true, action: "revalidated-deleted" });
  }

  // The owner can always purge their own listing.
  let allowed = listing.seller_id === user.id;

  // Admins can purge anything — the admin action route calls this after a
  // take-down, forwarding the moderator's cookie.
  if (!allowed) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();
    allowed = profile?.is_admin === true;
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "You can only refresh your own listings." },
      { status: 403 }
    );
  }

  try {
    // The listing detail page caches its public data under this tag; the seller
    // page is full-route cached. Purge both so a change is visible at once.
    revalidateTag(`listing:${listingId}`);
    revalidatePath(`/seller/${listing.seller_id}`);

    return NextResponse.json({ success: true, action: "revalidated" });
  } catch (error) {
    // Purging is a best-effort follow-up — the listing change is already
    // committed — so this must never surface as a failure to the user.
    console.warn(
      `[revalidate] listing ${listingId}: cache purge failed —`,
      error instanceof Error ? error.message : error
    );
    return NextResponse.json({ success: true, action: "deferred" });
  }
}