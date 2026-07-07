-- Migration: 0008_nearby_listings_function.sql
-- Purpose: provide ONE reusable way to fetch active listings sorted by distance from a given
-- point. This gets called from app code via supabase.rpc('get_listings_near', {...}) — the
-- home feed (location-tiered) and search (location-tiered results) will both reuse this in
-- later prompts instead of each writing their own distance query.

-- ============================================================================================
-- EXAMPLE QUERY — this is the same logic the function below wraps, shown here as a plain
-- query so it's easy to read/copy/adapt directly in the Supabase SQL editor for debugging.
-- Finds active listings within 5km of a point near Tambaram, Chennai, nearest first.
-- ============================================================================================
-- select
--   l.id,
--   l.title,
--   l.price,
--   -- ST_Distance on two geography values returns meters; divide by 1000 to get kilometers
--   st_distance(l.geog, st_setsrid(st_makepoint(80.1275, 12.9229), 4326)::geography) / 1000 as distance_km
-- from public.listings l
-- where l.status = 'active'
--   -- ST_DWithin is the efficient way to filter by radius — it can use the GiST index,
--   -- unlike filtering on "distance_km < 5" which would compute the distance for every row first
--   and st_dwithin(
--     l.geog,
--     st_setsrid(st_makepoint(80.1275, 12.9229), 4326)::geography,
--     5000 -- radius in meters (5km)
--   )
-- order by distance_km asc;

-- Define the reusable function that the app will actually call
create or replace function public.get_listings_near(
  -- The search center's latitude
  p_lat double precision,
  -- The search center's longitude
  p_lng double precision,
  -- The search radius in kilometers, defaults to a generous 50km if not specified
  p_radius_km double precision default 50,
  -- Optionally filter to one category (and, implicitly via the join, all rows under it) — null means "any category"
  p_category_id uuid default null,
  -- How many rows to return at most, for pagination
  p_limit integer default 50,
  -- How many rows to skip, for pagination
  p_offset integer default 0
)
-- Describe the shape of each row this function returns
returns table (
  -- The listing's ID
  id uuid,
  -- The listing's title
  title text,
  -- The listing's price
  price numeric,
  -- Whether it's for sale or rent, returned as plain text for easy use in app code
  listing_type text,
  -- The item's condition, returned as plain text
  condition text,
  -- The listing's locality name
  locality text,
  -- The listing's latitude
  lat double precision,
  -- The listing's longitude
  lng double precision,
  -- The computed distance from the search point, in kilometers
  distance_km double precision,
  -- When the listing was created
  created_at timestamptz,
  -- Who posted it
  seller_id uuid,
  -- Which category it's in
  category_id uuid,
  -- How many views it has
  view_count integer
)
-- "language sql" (rather than plpgsql) since this is a single query — lets Postgres inline/optimize it better
language sql
-- "stable" tells Postgres this function only reads data and won't modify anything,
-- which allows better query planning
stable
as $$
  -- Select the columns our return type promises, computing distance for each matching row
  select
    l.id,
    l.title,
    l.price,
    -- Cast the enum to plain text so the app doesn't need to know about Postgres enum types
    l.listing_type::text,
    l.condition::text,
    l.locality,
    l.lat,
    l.lng,
    -- Compute the distance from the search point to this listing, converted from meters to kilometers
    st_distance(l.geog, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography) / 1000 as distance_km,
    l.created_at,
    l.seller_id,
    l.category_id,
    l.view_count
  from public.listings l
  -- Only ever return active, publicly visible listings from this function
  where l.status = 'active'
    -- Use the indexed radius filter (in meters, so we convert the km parameter) for performance
    and st_dwithin(
      l.geog,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
    -- Only apply the category filter if one was actually provided
    and (p_category_id is null or l.category_id = p_category_id)
  -- Closest listings first
  order by distance_km asc
  -- Apply pagination
  limit p_limit offset p_offset;
$$;

-- Let both logged-out (anon) and logged-in (authenticated) users call this function —
-- the function's own "where status = 'active'" plus the underlying table's RLS select
-- policy both still apply, so this never exposes non-active listings to the wrong audience
grant execute on function public.get_listings_near(double precision, double precision, double precision, uuid, integer, integer)
  to anon, authenticated;
