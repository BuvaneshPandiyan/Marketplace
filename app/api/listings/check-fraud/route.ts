// Import Next.js helpers
import { NextRequest, NextResponse } from "next/server";
import { allowRequest } from "@/lib/server/rateLimit";
// Import the server-side Supabase client (reads the session cookie to identify the caller)
import { createClient } from "@/lib/supabase/server";

// The expected request body shape
type RequestBody = {
  // The ID of the just-created listing to check
  listingId: string;
};

// POST /api/listings/check-fraud — runs all server-side fraud checks on a newly created listing
export async function POST(request: NextRequest) {
  if (!(await allowRequest(request, "check-fraud", 20, 60))) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Parse the request body to get the listing ID
  const body = (await request.json()) as RequestBody;
  // Validate that we received a listing ID
  if (!body.listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  // Create a server-side Supabase client to identify the caller and run the RPC calls
  const supabase = await createClient();
  // Require login — only the listing's owner should call this
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify that this listing actually belongs to the calling user — prevents an attacker from
  // triggering a fraud check on someone else's listing to flag it maliciously
  const { data: listing } = await supabase
    .from("listings")
    .select("id, seller_id")
    .eq("id", body.listingId)
    .eq("seller_id", user.id)
    .single();

  // If the listing doesn't exist or belongs to a different seller, refuse
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // ── FRAUD CHECK 1: EXIF GPS and timestamp mismatch ──────────────────────────────────────
  // Call the Postgres function that reads every photo's EXIF data and compares it to the
  // listing's declared location and creation time
  const { data: exifReason, error: exifError } = await supabase
    .rpc("check_listing_exif_fraud", {
      // The listing to check
      p_listing_id: body.listingId,
      // Flag photos more than 15 km from the declared listing location
      p_max_distance_km: 15.0,
      // Flag photos taken more than 30 days before the listing was created
      p_max_photo_age_days: 30,
    });

  // Log RPC errors but don't let them block the response — partial checks are better than none
  if (exifError) {
    console.error("[check-fraud] EXIF check error:", exifError.message);
  }

  // If the EXIF check returned a reason, flag the listing immediately
  if (exifReason) {
    await supabase.rpc("flag_listing_with_reason", {
      p_listing_id: body.listingId,
      p_reason: exifReason as string,
    });
    // Return early — no need to run the duplicate check if we're already flagging
    return NextResponse.json({ flagged: true, reason: exifReason });
  }

  // ── FRAUD CHECK 2: Perceptual hash duplicate detection ───────────────────────────────────
  // Call the Postgres function that compares this listing's photo hashes to all other active
  // listings and flags if any hash matches a DIFFERENT seller's photo
  const { data: duplicateReason, error: duplicateError } = await supabase
    .rpc("check_listing_photo_duplicates", {
      // The listing to check for duplicate photos
      p_listing_id: body.listingId,
    });

  // Log RPC errors but don't block the response
  if (duplicateError) {
    console.error("[check-fraud] duplicate check error:", duplicateError.message);
  }

  // If the duplicate check found a cross-seller match, flag the listing
  if (duplicateReason) {
    await supabase.rpc("flag_listing_with_reason", {
      p_listing_id: body.listingId,
      p_reason: duplicateReason as string,
    });
    return NextResponse.json({ flagged: true, reason: duplicateReason });
  }

  // All checks passed — listing is clean
  return NextResponse.json({ flagged: false });
}