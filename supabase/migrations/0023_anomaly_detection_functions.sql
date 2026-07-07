-- Migration: 0023_anomaly_detection_functions.sql
-- Purpose: the two SQL helper functions called by the /api/cron/notifications anomaly-detection
-- task. Both are SECURITY DEFINER so the cron job (running as the service-role key) can call
-- them efficiently without scanning every row through RLS row-by-row.

-- ── detect_bulk_posters() ────────────────────────────────────────────────────────────────
-- Returns one row per seller who has posted more than p_max_per_day listings since p_since.
-- Used by the cron job to write bulk-posting anomaly_log entries.
create or replace function public.detect_bulk_posters(
  -- Only consider listings created after this timestamp
  p_since timestamptz,
  -- How many listings per day counts as "suspicious"
  p_max_per_day integer default 5
)
-- Returns a table with the seller's ID and how many listings they posted
returns table(seller_id uuid, count bigint)
language sql
-- SECURITY DEFINER so this bypasses RLS (the cron needs to see all sellers' listing counts)
security definer
set search_path = public
as $$
  -- Count listings per seller since the cutoff time
  select
    -- The seller who posted these listings
    l.seller_id,
    -- How many listings they posted in the window
    count(*) as count
  from public.listings l
  where
    -- Only look at listings created since the lookback window
    l.created_at >= p_since
    -- Only count active listings — a seller marking their own items sold isn't suspicious
    and l.status = 'active'
  group by l.seller_id
  -- Only return sellers who exceeded the threshold
  having count(*) > p_max_per_day;
$$;

-- Revoke PUBLIC access — only the cron job (service-role key) calls this
revoke all on function public.detect_bulk_posters(timestamptz, integer) from public;

-- ── detect_price_anomalies() ─────────────────────────────────────────────────────────────
-- Returns one row per recently-created listing whose price is below p_max_ratio times the
-- median price for other listings in the same category and locality.
-- A ratio of 0.30 means "flag if the price is less than 30% of the median".
create or replace function public.detect_price_anomalies(
  -- Flag listings priced below this fraction of the category/locality median
  p_max_ratio double precision default 0.30,
  -- Require at least this many other listings in the same category/locality for the median
  -- to be statistically meaningful — avoids false positives in sparsely-listed categories
  p_min_sample integer default 5
)
-- Returns the seller, listing, actual price, and the computed median
returns table(seller_id uuid, listing_id uuid, price numeric, median_price double precision)
language sql
security definer
set search_path = public
as $$
  -- Use a CTE (Common Table Expression) to compute the per-category/locality median first,
  -- then filter the listings that fall below the threshold in a second step
  with category_locality_medians as (
    -- Compute the median price for each (category_id, locality) bucket
    select
      -- The category this bucket covers
      l.category_id,
      -- The locality string this bucket covers
      l.locality,
      -- Percentile_cont(0.5) is PostgreSQL's median aggregate
      percentile_cont(0.5) within group (order by l.price) as median_price,
      -- How many listings are in this bucket (used for the p_min_sample filter)
      count(*) as sample_size
    from public.listings l
    where
      -- Only count active listings as reference data
      l.status = 'active'
    group by l.category_id, l.locality
    -- Only return buckets with enough sample listings for a meaningful median
    having count(*) >= p_min_sample
  )
  -- Now find recently-created listings whose price is suspiciously low
  select
    -- The seller who posted the suspicious listing
    l.seller_id,
    -- The listing itself
    l.id as listing_id,
    -- The listing's actual price
    l.price,
    -- The median price for this listing's category/locality bucket
    m.median_price
  from public.listings l
  -- Join to the median for this listing's exact bucket
  join category_locality_medians m
    on m.category_id = l.category_id
    and m.locality = l.locality
  where
    -- Only check listings created in the last 7 days (recently published)
    l.created_at >= now() - interval '7 days'
    -- Only check active listings
    and l.status = 'active'
    -- Flag listings whose price is below the threshold ratio of the median
    and l.price < m.median_price * p_max_ratio
  -- Cheapest-relative-to-median first (most suspicious first)
  order by (l.price::double precision / m.median_price) asc;
$$;

-- Revoke PUBLIC access — only the cron job (service-role key) calls this
revoke all on function public.detect_price_anomalies(double precision, integer) from public;
