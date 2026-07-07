// This is a Next.js API Route (App Router) at /api/cron/notifications.
// It is called on a schedule by a Cloudflare Cron Trigger (set up in wrangler.toml — see
// SETUP.md). It can also be called manually for testing with a valid CRON_SECRET header.

// Import Next.js's response type
import { NextRequest, NextResponse } from "next/server";
// Import the Supabase admin client creator (bypasses RLS — service-role key)
import { createClient } from "@supabase/supabase-js";
// Import the Meilisearch client so we can replay saved searches against the search index
import { Meilisearch } from "meilisearch";
// Import our notification sender
import { createNotification } from "@/lib/server/createNotification";

// Create the Supabase admin client (bypasses all RLS policies)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// The POST handler for /api/cron/notifications
// Cloudflare Cron Triggers call your Worker's `scheduled` handler, but since we're using
// opennextjs-cloudflare's routing, we expose a POST endpoint and configure the Cron Trigger
// to POST to this URL instead (see wrangler.toml's [triggers] section in SETUP.md).
export async function POST(request: NextRequest) {
  // Verify the caller is our own Cloudflare Cron Trigger, not an outside attacker
  // The secret is set as a Cloudflare environment variable and as a Next.js env var
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    // Return 401 — never run the job for unauthorized callers
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getAdminClient();
  // Track what we did for the response body (useful when debugging)
  const summary = { matchNotifications: 0, priceDropNotifications: 0, errors: [] as string[] };

  // ── TASK 1: Check saved searches against new listings ──────────────────────────────────────
  // "New" means: created since the last time this cron ran. We store the last-run timestamp
  // in a simple key-value table we piggyback off the notifications table convention — actually
  // we use a dedicated approach: check listings created in the last 2 hours (cron runs hourly).
  // This is deliberately simple and idempotent — if the cron runs twice, users may get two
  // notifications for a short window but won't get zero; a deduplication system is a future
  // improvement tracked in SETUP.md.
  const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  try {
    // Fetch all saved searches (across all users) to check against new listings
    const { data: savedSearches } = await supabase.from("saved_searches").select("*");
    if (savedSearches && savedSearches.length > 0) {
      // Initialize the Meilisearch client to replay each saved search
      const meili = new Meilisearch({
        host: process.env.MEILISEARCH_HOST!,
        apiKey: process.env.MEILISEARCH_API_KEY!,
      });
      const index = meili.index("listings");

      // Process each saved search
      for (const search of savedSearches) {
        try {
          // Build a Meilisearch filter that replicates the saved filter state, plus
          // a date restriction so we only match listings created since the cutoff
          const filterParts: string[] = [
            // Only show active listings
            `status = "active"`,
            // Only match listings created since the cutoff time
            `created_at_ts >= ${Math.floor(new Date(cutoffTime).getTime() / 1000)}`,
          ];
          // Add each active filter from the saved search's filters JSON
          const filters = search.filters as Record<string, string | null>;
          if (filters.categoryId) filterParts.push(`category_id = "${filters.categoryId}"`);
          if (filters.priceMin) filterParts.push(`price >= ${filters.priceMin}`);
          if (filters.priceMax) filterParts.push(`price <= ${filters.priceMax}`);
          if (filters.condition) filterParts.push(`condition = "${filters.condition}"`);
          if (filters.listingType) filterParts.push(`listing_type = "${filters.listingType}"`);

          // Run the search against Meilisearch — a single hit is enough to trigger a notification
          const result = await index.search(search.query, {
            filter: filterParts.join(" AND "),
            limit: 3, // fetch a few so we can mention a specific listing in the notification
          });

          // If any new listings matched, send a notification
          if (result.hits.length > 0) {
            const firstHit = result.hits[0] as { title?: string };
            const label = search.label ?? (search.query ? `"${search.query}"` : "your saved search");
            await createNotification({
              userId: search.user_id,
              type: "new_match",
              title: `New match for ${label}`,
              body: `${firstHit.title ?? "A new listing"} was just posted near you.`,
              // Link to the search results so they can browse all matches
              link: `/search?q=${encodeURIComponent(search.query)}`,
            });
            summary.matchNotifications++;
          }
        } catch (err) {
          // Log individual search errors but keep processing others
          summary.errors.push(`saved_search ${search.id}: ${String(err)}`);
        }
      }
    }
  } catch (err) {
    summary.errors.push(`saved_searches phase: ${String(err)}`);
  }

  // ── TASK 2: Check wishlist items for price drops ───────────────────────────────────────────
  try {
    // Fetch every active wishlist entry, joined with the listing's current price
    const { data: wishlistEntries } = await supabase
      .from("wishlist")
      .select("id, user_id, listing_id, price_at_save, listings(price, title, status)")
      // Only active listings can drop in price — ignore sold/removed
      .eq("listings.status", "active");

    for (const entry of wishlistEntries ?? []) {
      try {
        const listing = entry.listings as unknown as { price: number; title: string; status: string } | null;
        if (!listing) continue;
        const currentPrice = Number(listing.price);
        const savedPrice = Number(entry.price_at_save);
        // Trigger a price-drop notification when the price drops by 5% or more
        const DROP_THRESHOLD = 0.95;
        if (currentPrice < savedPrice * DROP_THRESHOLD) {
          await createNotification({
            userId: entry.user_id,
            type: "price_drop",
            title: `Price drop on "${listing.title}"`,
            body: `Now ₹${currentPrice.toLocaleString("en-IN")} — was ₹${savedPrice.toLocaleString("en-IN")} when you saved it.`,
            // Deep-link to the listing detail page
            link: `/listing/${entry.listing_id}`,
          });
          // Update price_at_save to the new (lower) price so we don't keep notifying
          // for the same drop on every subsequent cron run
          await supabase
            .from("wishlist")
            .update({ price_at_save: currentPrice })
            .eq("id", entry.id);
          summary.priceDropNotifications++;
        }
      } catch (err) {
        summary.errors.push(`wishlist ${entry.id}: ${String(err)}`);
      }
    }
  } catch (err) {
    summary.errors.push(`wishlist phase: ${String(err)}`);
  }

  // ── TASK 3: Notify sellers of listings expiring in 24 hours ──────────────────────────────
  try {
    // Listings expire after 60 days from creation (adjust to match whatever expiry you define)
    const expiryWindowStart = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
    const expiryWindowEnd = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
    // Find listings whose 60-day window ends within the next 1-hour cron window
    const { data: expiringListings } = await supabase
      .from("listings")
      .select("id, seller_id, title, created_at")
      .eq("status", "active")
      // The listing "expires" 60 days after creation — filter by the 60-day mark
      .gte("created_at", new Date(new Date(expiryWindowStart).getTime() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .lte("created_at", new Date(new Date(expiryWindowEnd).getTime() - 60 * 24 * 60 * 60 * 1000).toISOString());

    for (const listing of expiringListings ?? []) {
      await createNotification({
        userId: listing.seller_id,
        type: "listing_expiring",
        title: `Your listing is expiring soon`,
        body: `"${listing.title}" will expire in about 24 hours. Renew it to keep it visible.`,
        link: `/my-listings`,
      });
    }
  } catch (err) {
    summary.errors.push(`expiring phase: ${String(err)}`);
  }

  // ── TASK 4: Anomaly detection — flag suspicious seller behaviour ─────────────────────────
  // This task does not auto-remove listings — it only writes to anomaly_log for the admin queue.
  // The admin can then decide what action (if any) to take based on the context.
  try {
    // Create an admin Supabase client for the anomaly queries (needs to read all listings)
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // ── 4a: Bulk posting — more than 5 listings in 24 hours ────────────────────────────────
    const bulkCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    // Use a raw SQL query to count per-seller posting rates
    const { data: bulkPosters } = await adminClient.rpc("detect_bulk_posters", {
      p_since: bulkCutoff,
      p_max_per_day: 5,
    }).select();

    for (const poster of bulkPosters ?? []) {
      const p = poster as { seller_id: string; count: number };
      // Write to the anomaly_log table (admin only — no RLS policy for regular users)
      await adminClient.from("anomaly_log").insert({
        user_id: p.seller_id,
        anomaly_type: "bulk_posting",
        detail: `Posted ${p.count} listings in the last 24 hours (threshold: 5)`,
      });
    }

    // ── 4b: Price anomaly — item priced > 70% below category/locality median ───────────────
    // We use a simple SQL median calculation: for each listing created in the past 7 days,
    // check whether its price is more than 70% below the median for its category/locality pair.
    // This catches "too cheap to be real" signals (common in advance-fee scams).
    const { data: priceAnomalies } = await adminClient.rpc("detect_price_anomalies", {
      p_max_ratio: 0.30, // flag if price < 30% of category/locality median
      p_min_sample: 5,   // require at least 5 listings in the category/locality for the median to be meaningful
    }).select();

    for (const anomaly of priceAnomalies ?? []) {
      const a = anomaly as { seller_id: string; listing_id: string; price: number; median_price: number };
      await adminClient.from("anomaly_log").insert({
        user_id: a.seller_id,
        listing_id: a.listing_id,
        anomaly_type: "price_anomaly",
        detail: `Listing priced at ₹${a.price} vs category median ₹${Math.round(a.median_price)} (below 30% threshold)`,
      });
    }
  } catch (err) {
    summary.errors.push(`anomaly detection: ${String(err)}`);
  }

  // Return the summary so the caller (Cloudflare or a manual test) can see what happened
  return NextResponse.json({ ok: true, ...summary });
}
