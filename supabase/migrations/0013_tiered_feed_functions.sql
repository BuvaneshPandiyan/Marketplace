-- Migration: 0013_tiered_feed_functions.sql
-- Purpose: support the home feed's three location tiers cleanly and correctly:
--   Tier 1 (0 - 3km), Tier 2 (3 - 10km) both need DISTANCE-sorted "ring" queries (a minimum
--   AND maximum radius), which the original get_listings_near() couldn't express — without a
--   minimum radius, naively fetching "everything within 10km" and subtracting Tier 1's items
--   in application code breaks pagination (if Tier 1 alone fills the page limit, Tier 2 would
--   never appear). Tier 3 needs a different sort entirely (recency, not distance) with only an
--   exclusion radius and no upper bound — so it gets its own function, get_listings_far().
-- Both functions are also extended to return each listing's cover photo URL in the same
-- round trip, since every feed card needs one and a separate per-listing query would be wasteful.

-- Drop the exact old signature first — the safest way to change a function's parameter list
-- AND its output columns at once, without relying on CREATE OR REPLACE's stricter append-only rules.
-- Two drops cover both cases: the original Prompt 3 signature (first time this migration runs)
-- and this migration's own signature (if this migration is ever safely re-run afterward).
drop function if exists public.get_listings_near(double precision, double precision, double precision, uuid, integer, integer);
drop function if exists public.get_listings_near(double precision, double precision, double precision, uuid, integer, integer, double precision);

-- Recreate get_listings_near with the new p_min_radius_km parameter and cover_photo_url column
create function public.get_listings_near(
  -- The search center's latitude
  p_lat double precision,
  -- The search center's longitude
  p_lng double precision,
  -- The search radius in kilometers (the OUTER/maximum bound), defaults to 50km
  p_radius_km double precision default 50,
  -- Optionally filter to one category — null means "any category"
  p_category_id uuid default null,
  -- How many rows to return at most, for pagination
  p_limit integer default 50,
  -- How many rows to skip, for pagination
  p_offset integer default 0,
  -- NEW: excludes anything within this many km of the center — lets a caller ask for a "ring"
  -- between two radii (e.g., "between 3km and 10km") instead of always starting from the center
  p_min_radius_km double precision default 0
)
-- Describe the shape of each row this function returns
returns table (
  id uuid,
  title text,
  price numeric,
  listing_type text,
  condition text,
  locality text,
  lat double precision,
  lng double precision,
  distance_km double precision,
  created_at timestamptz,
  seller_id uuid,
  category_id uuid,
  view_count integer,
  -- NEW: the listing's first (cover) photo URL, null if it somehow has none
  cover_photo_url text
)
language sql
stable
as $$
  select
    l.id,
    l.title,
    l.price,
    l.listing_type::text,
    l.condition::text,
    l.locality,
    l.lat,
    l.lng,
    -- Distance from the search point, converted from meters to kilometers
    st_distance(l.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000 as distance_km,
    l.created_at,
    l.seller_id,
    l.category_id,
    l.view_count,
    -- A correlated subquery that grabs just this listing's lowest sort_order photo URL
    (
      select lp.url
      from public.listing_photos lp
      where lp.listing_id = l.id
      order by lp.sort_order asc
      limit 1
    ) as cover_photo_url
  from public.listings l
  where l.status = 'active'
    -- The outer bound: must be within the maximum radius
    and st_dwithin(l.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
    -- The inner bound: must NOT be within the minimum radius. Skipped entirely when
    -- p_min_radius_km is 0 (the default) — relying on st_dwithin(geog, point, 0) as a "no-op"
    -- would be WRONG, since it actually returns true (and so excludes) any listing sitting at
    -- the exact same coordinates as the search center, which is a perfectly normal case
    and (p_min_radius_km <= 0 or not st_dwithin(l.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_min_radius_km * 1000))
    and (p_category_id is null or l.category_id = p_category_id)
  order by distance_km asc
  limit p_limit offset p_offset;
$$;

-- Re-grant execute on the new signature (GRANT does not carry over to a dropped-and-recreated function)
grant execute on function public.get_listings_near(
  double precision, double precision, double precision, uuid, integer, integer, double precision
) to anon, authenticated;

-- Define the new function powering Tier 3: recency-sorted, outside a radius, with NO location
-- required at all — when p_lat/p_lng are left null, it gracefully falls back to "every active
-- listing citywide, newest first," used when a visitor hasn't set a location yet
create or replace function public.get_listings_far(
  -- The search center's latitude — optional, see above
  p_lat double precision default null,
  -- The search center's longitude — optional
  p_lng double precision default null,
  -- Exclude anything within this many km of the center (ignored entirely if lat/lng are null)
  p_radius_km double precision default 10,
  -- Optionally filter to one category — null means "any category"
  p_category_id uuid default null,
  -- How many rows to return at most, for pagination
  p_limit integer default 50,
  -- How many rows to skip, for pagination
  p_offset integer default 0
)
-- Describe the shape of each row this function returns — no distance_km, since this tier
-- isn't distance-sorted, but still includes the cover photo for the same reason as above
returns table (
  id uuid,
  title text,
  price numeric,
  listing_type text,
  condition text,
  locality text,
  lat double precision,
  lng double precision,
  created_at timestamptz,
  seller_id uuid,
  category_id uuid,
  view_count integer,
  cover_photo_url text
)
language sql
stable
as $$
  select
    l.id,
    l.title,
    l.price,
    l.listing_type::text,
    l.condition::text,
    l.locality,
    l.lat,
    l.lng,
    l.created_at,
    l.seller_id,
    l.category_id,
    l.view_count,
    (
      select lp.url
      from public.listing_photos lp
      where lp.listing_id = l.id
      order by lp.sort_order asc
      limit 1
    ) as cover_photo_url
  from public.listings l
  where l.status = 'active'
    and (p_category_id is null or l.category_id = p_category_id)
    -- Only apply the exclusion radius if a center point was actually provided
    and (
      p_lat is null or p_lng is null
      or not st_dwithin(l.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
    )
  -- Tier 3 is sorted by recency, not distance — this is what distinguishes it from Tiers 1/2
  order by l.created_at desc
  limit p_limit offset p_offset;
$$;

-- Anyone (logged in or not) can call this function, same reasoning as get_listings_near
grant execute on function public.get_listings_far(
  double precision, double precision, double precision, uuid, integer, integer
) to anon, authenticated;
