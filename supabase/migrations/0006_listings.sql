-- Migration: 0006_listings.sql
-- Purpose: create the core `listings` table — the heart of the marketplace.

-- Make sure the PostGIS extension is enabled (needed for the geography column/index below)
create extension if not exists postgis;

-- Postgres has no "create type if not exists", so we wrap each enum creation in a check
-- against the system catalog and only create it if it's missing — this keeps the migration
-- safe to re-run without erroring on "type already exists".
do $$
begin
  -- Only create the listing_type enum if it doesn't already exist
  if not exists (select 1 from pg_type where typname = 'listing_type_enum') then
    -- Define the two ways a listing can be offered: for sale, or for rent
    create type listing_type_enum as enum ('sale', 'rent');
  end if;
end $$;

do $$
begin
  -- Only create the condition enum if it doesn't already exist
  if not exists (select 1 from pg_type where typname = 'condition_enum') then
    -- Define whether an item is brand new or previously used
    create type condition_enum as enum ('new', 'used');
  end if;
end $$;

do $$
begin
  -- Only create the listing_status enum if it doesn't already exist
  if not exists (select 1 from pg_type where typname = 'listing_status_enum') then
    -- Define every state a listing can be in throughout its lifecycle
    create type listing_status_enum as enum ('active', 'sold', 'expired', 'flagged', 'removed');
  end if;
end $$;

-- Create the listings table if it doesn't already exist
create table if not exists public.listings (
  -- A unique ID for this listing, auto-generated
  id uuid primary key default gen_random_uuid(),
  -- Which user posted this listing — deleting the seller's account removes their listings too
  seller_id uuid not null references public.profiles (id) on delete cascade,
  -- Which category this listing belongs to — blocked from deletion if listings still reference it
  category_id uuid not null references public.categories (id) on delete restrict,
  -- The listing's headline, e.g., "Honda Activa - 2019, well maintained"
  title text not null,
  -- The full free-text description the seller wrote
  description text,
  -- The asking price — numeric(12,2) supports values up to 10 digits before the decimal point
  price numeric(12, 2) not null,
  -- Whether this is for sale or for rent
  listing_type listing_type_enum not null default 'sale',
  -- Whether the item is new or used
  condition condition_enum not null default 'used',
  -- The listing's current lifecycle status, starts active the moment it's posted
  status listing_status_enum not null default 'active',
  -- A human-readable locality name, e.g., "Tambaram, Chennai" — copied from the seller's location at posting time
  locality text,
  -- The listing's latitude — required, since every listing needs a location in a hyperlocal app
  lat double precision not null,
  -- The listing's longitude — required for the same reason
  lng double precision not null,
  -- A PostGIS geography point, automatically computed from lat/lng whenever a row is inserted/updated —
  -- this is what powers fast "listings near me" radius queries (see the function in migration 0008)
  geog geography(point, 4326) generated always as (
    -- Build a geometry point from (longitude, latitude) — note PostGIS wants lng first, then lat —
    -- set its spatial reference system to 4326 (standard GPS coordinates), then cast to geography
    st_setsrid(st_makepoint(lng, lat), 4326)::geography
  ) stored,
  -- When this listing was first created
  created_at timestamptz not null default now(),
  -- When this listing was last modified — kept current by the trigger defined below
  updated_at timestamptz not null default now(),
  -- How many times this listing's detail page has been viewed, starts at zero
  view_count integer not null default 0
);

-- Add a check constraint keeping latitude within the valid real-world range
alter table public.listings drop constraint if exists listings_lat_range;
alter table public.listings add constraint listings_lat_range
  -- Latitude must always be between -90 and 90 degrees
  check (lat between -90 and 90);

-- Add a check constraint keeping longitude within the valid real-world range
alter table public.listings drop constraint if exists listings_lng_range;
alter table public.listings add constraint listings_lng_range
  -- Longitude must always be between -180 and 180 degrees
  check (lng between -180 and 180);

-- Add a check constraint making sure the price is never negative
alter table public.listings drop constraint if exists listings_price_non_negative;
alter table public.listings add constraint listings_price_non_negative
  -- Price must be zero or more — zero is allowed for "free to a good home" type listings
  check (price >= 0);

-- Create a GiST index on the geography column — this is what makes radius/distance queries fast
create index if not exists listings_geog_idx on public.listings using gist (geog);
-- Index category_id since the feed/search will constantly filter "listings in this category"
create index if not exists listings_category_id_idx on public.listings (category_id);
-- Index status since almost every query filters to "status = 'active'" only
create index if not exists listings_status_idx on public.listings (status);
-- Index seller_id since the seller's "My Listings" dashboard filters by it
create index if not exists listings_seller_id_idx on public.listings (seller_id);

-- Define a small reusable trigger function that stamps updated_at with the current time
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- Overwrite the row's updated_at column with the current timestamp
  new.updated_at = now();
  -- Return the modified row so the update actually uses this new value
  return new;
end;
$$;

-- Remove any existing trigger of the same name so this migration can be re-run safely
drop trigger if exists set_listings_updated_at on public.listings;
-- Attach the trigger: before any update to a listings row, refresh its updated_at timestamp
create trigger set_listings_updated_at
  before update on public.listings
  for each row
  execute function public.set_updated_at();

-- Turn on Row Level Security so the policies below actually get enforced
alter table public.listings enable row level security;

-- Anyone can see ACTIVE listings; sellers can also see their OWN listings regardless of status
-- (e.g., so their "My Listings" dashboard can show sold/flagged/removed items too)
drop policy if exists "Active listings are publicly readable, sellers see their own" on public.listings;
create policy "Active listings are publicly readable, sellers see their own"
  on public.listings
  for select
  using (status = 'active' or auth.uid() = seller_id);

-- Only a logged-in user can create a listing, and only under their own seller_id
drop policy if exists "Users can insert their own listings" on public.listings;
create policy "Users can insert their own listings"
  on public.listings
  for insert
  with check (auth.uid() = seller_id);

-- A seller can only update their own listings (e.g., editing price, marking as sold)
drop policy if exists "Sellers can update their own listings" on public.listings;
create policy "Sellers can update their own listings"
  on public.listings
  for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

-- A seller can only delete their own listings
drop policy if exists "Sellers can delete their own listings" on public.listings;
create policy "Sellers can delete their own listings"
  on public.listings
  for delete
  using (auth.uid() = seller_id);
