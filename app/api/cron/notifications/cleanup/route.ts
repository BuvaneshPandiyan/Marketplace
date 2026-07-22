// Storage-reclamation cron.
//
// Runs on a schedule (see SETUP.md) with the same x-cron-secret header the
// notifications cron uses. Two jobs:
//
//   1. Delete photo FILES for listings that have been sold longer than the
//      grace period. Photos are ~99% of this app's storage, so this is where
//      the space actually comes back.
//   2. Prune append-only log tables that grow forever and are read by nothing
//      after they age out.
//
// Deliberately does NOT delete listing rows. Doing so would cascade into
// `ratings` and `conversations`, wiping seller reputations and buyer/seller
// chat history. Rows are ~1 KB; the photos were the problem.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin client — bypasses RLS via the service-role key. Same pattern as the
// notifications cron.
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// How long after a sale we keep the photos. Buyers may still be checking what
// they bought, and disputes surface early, so this is deliberately generous.
const GRACE_DAYS = 30;
// Cap per run so a single invocation can't time out on a large backlog.
const BATCH_LIMIT = 500;

const BUCKET = "listing-photos";

type PurgeRow = { listing_id: string; photo_id: string; url: string };

/**
 * Storage delete needs a path inside the bucket, but the DB stores full public
 * URLs. Pull the portion after the bucket name back out.
 */
function urlToStoragePath(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const path = url.slice(i + marker.length).split("?")[0];
  return path ? decodeURIComponent(path) : null;
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();

  // ── 1. Photos for long-sold listings ────────────────────────────────────
  const { data: rows, error: listErr } = await supabase.rpc(
    "list_purgeable_listing_photos",
    { p_older_than_days: GRACE_DAYS, p_limit: BATCH_LIMIT }
  );

  if (listErr) {
    console.error("[cleanup] could not list purgeable photos:", listErr.message);
    return NextResponse.json({ error: "Failed to list photos" }, { status: 500 });
  }

  const photos = (rows ?? []) as PurgeRow[];
  let filesDeleted = 0;
  let listingsPurged = 0;

  if (photos.length > 0) {
    const paths = photos
      .map((p) => urlToStoragePath(p.url))
      .filter((p): p is string => Boolean(p));

    if (paths.length > 0) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths);
      if (rmErr) {
        // Stop before marking anything purged — otherwise the DB would claim
        // the files are gone while they're still occupying space, and the
        // sweep would never retry them.
        console.error("[cleanup] storage delete failed:", rmErr.message);
        return NextResponse.json({ error: "Storage delete failed" }, { status: 500 });
      }
      filesDeleted = paths.length;
    }

    // Only now record the purge, so a storage failure is always retried.
    const listingIds = Array.from(new Set(photos.map((p) => p.listing_id)));
    const { error: markErr } = await supabase.rpc("mark_listing_photos_purged", {
      p_listing_ids: listingIds,
    });
    if (markErr) {
      console.error("[cleanup] could not mark listings purged:", markErr.message);
    } else {
      listingsPurged = listingIds.length;
    }
  }

  // ── 2. Prune the disposable log tables ──────────────────────────────────
  const { data: pruned, error: pruneErr } = await supabase.rpc("prune_disposable_rows");
  if (pruneErr) console.error("[cleanup] prune failed:", pruneErr.message);

  return NextResponse.json({
    ok: true,
    graceDays: GRACE_DAYS,
    filesDeleted,
    listingsPurged,
    // More may remain if we hit the batch cap — the next run picks them up.
    moreRemaining: photos.length === BATCH_LIMIT,
    pruned: pruned ?? null,
  });
}