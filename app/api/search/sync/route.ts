// Called after a listing is created, edited, sold or deleted.
//
// This used to push the listing into an external search index. Search now runs
// directly in Postgres (see supabase/migrations/0027_postgres_search.sql), where
// the searchable document is a generated column — it updates itself the moment
// the row changes. There is nothing left to sync.
//
// The route is kept because it still does something important: purging the
// Next.js caches that hold this listing. Without it, an edit, a price change or
// "mark as sold" could keep showing stale data until the cache window expired.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  try {
    // The listing detail page caches its public data under this tag; the seller
    // page is full-route cached. Purge both so the change is visible at once.
    revalidateTag(`listing:${listingId}`);

    const supabase = await createClient();
    const { data: row } = await supabase
      .from("listings")
      .select("seller_id")
      .eq("id", listingId)
      .maybeSingle();

    if (row?.seller_id) {
      revalidatePath(`/seller/${row.seller_id}`);
    }

    return NextResponse.json({ success: true, action: "revalidated" });
  } catch (error) {
    // Cache purging is a best-effort follow-up: the listing change itself is
    // already committed, so this must never surface as a failure to the user.
    console.warn(`[revalidate] listing ${listingId}: cache purge failed —`,
      error instanceof Error ? error.message : error);
    return NextResponse.json({ success: true, action: "deferred" });
  }
}