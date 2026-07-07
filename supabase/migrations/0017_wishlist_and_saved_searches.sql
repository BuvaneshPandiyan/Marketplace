-- Migration: 0017_wishlist_and_saved_searches.sql
-- Purpose: the two user-personalization tables that feed the wishlist page and saved-search alerts.

-- ============================================================================================
-- WISHLIST — one row per (user, listing) pair, storing the price at the time of the save
-- ============================================================================================

-- Create the wishlist table if it doesn't already exist
create table if not exists public.wishlist (
  -- A unique ID for this wishlist entry
  id uuid primary key default gen_random_uuid(),
  -- The user who saved this listing
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The saved listing
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- The listing's price at the moment it was added — used later to detect price drops
  price_at_save numeric(12, 2) not null,
  -- When this was wishlisted
  created_at timestamptz not null default now(),
  -- A user can only save a given listing once — the heart is a toggle, not a counter
  unique (user_id, listing_id)
);

-- Index user_id since "fetch all my wishlisted listings" is the most common query
create index if not exists wishlist_user_id_idx on public.wishlist (user_id);
-- Index listing_id since the cron job will scan "all wishlist rows for listing X" for price-drop checks
create index if not exists wishlist_listing_id_idx on public.wishlist (listing_id);

-- Turn on Row Level Security so users can only see and touch their own wishlist rows
alter table public.wishlist enable row level security;

-- A user can see only their own wishlist entries
drop policy if exists "Users can view their own wishlist" on public.wishlist;
create policy "Users can view their own wishlist"
  on public.wishlist
  for select
  using (auth.uid() = user_id);

-- A user can add to their own wishlist — never someone else's
drop policy if exists "Users can add to their own wishlist" on public.wishlist;
create policy "Users can add to their own wishlist"
  on public.wishlist
  for insert
  with check (auth.uid() = user_id);

-- A user can remove from their own wishlist
drop policy if exists "Users can remove from their own wishlist" on public.wishlist;
create policy "Users can remove from their own wishlist"
  on public.wishlist
  for delete
  using (auth.uid() = user_id);

-- ============================================================================================
-- SAVED SEARCHES — one row per (user, search) pair
-- ============================================================================================

-- Create the saved_searches table if it doesn't already exist
create table if not exists public.saved_searches (
  -- A unique ID for this saved search
  id uuid primary key default gen_random_uuid(),
  -- The user who saved this search
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The plain-text query string (may be empty for filter-only saves, e.g., "All Bikes in Chennai")
  query text not null default '',
  -- The active filter/sort state at save time, stored as a JSON object so we can replay it
  -- later to check if new listings would match — see the cron job for the matching logic
  filters jsonb not null default '{}',
  -- A human-readable label the user can set, or null to use the query text
  label text,
  -- When this search was saved
  created_at timestamptz not null default now()
);

-- Index user_id since "fetch all my saved searches" is the most common query
create index if not exists saved_searches_user_id_idx on public.saved_searches (user_id);

-- Turn on Row Level Security
alter table public.saved_searches enable row level security;

-- A user can see only their own saved searches
drop policy if exists "Users can view their own saved searches" on public.saved_searches;
create policy "Users can view their own saved searches"
  on public.saved_searches
  for select
  using (auth.uid() = user_id);

-- A user can create their own saved searches
drop policy if exists "Users can create their own saved searches" on public.saved_searches;
create policy "Users can create their own saved searches"
  on public.saved_searches
  for insert
  with check (auth.uid() = user_id);

-- A user can delete their own saved searches
drop policy if exists "Users can delete their own saved searches" on public.saved_searches;
create policy "Users can delete their own saved searches"
  on public.saved_searches
  for delete
  using (auth.uid() = user_id);
