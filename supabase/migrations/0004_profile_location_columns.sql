-- Migration: 0004_profile_location_columns.sql
-- Purpose: add location columns to profiles so we can rank the feed/search by distance
-- in a later prompt. "default_*" is set once during onboarding (rarely changes).
-- "current_*" is updated whenever the user explicitly taps "Use current location" in the
-- location switcher — it's a record of their last known real GPS position, separate from
-- whatever locality they might be BROWSING as (that override lives in the browser only,
-- via localStorage, not in this table — see lib/hooks/useActiveLocation.ts).

-- Add the default (onboarding-time) latitude column, if it doesn't already exist
alter table public.profiles add column if not exists default_lat double precision;
-- Add the default (onboarding-time) longitude column
alter table public.profiles add column if not exists default_lng double precision;
-- Add the default (onboarding-time) human-readable locality name, e.g. "Tambaram, Chennai"
alter table public.profiles add column if not exists default_locality text;

-- Add the most recently captured real GPS latitude column
alter table public.profiles add column if not exists current_lat double precision;
-- Add the most recently captured real GPS longitude column
alter table public.profiles add column if not exists current_lng double precision;
-- Add the most recently captured real GPS locality name
alter table public.profiles add column if not exists current_locality text;

-- Add a check constraint making sure latitude values are always within the valid real-world range
alter table public.profiles drop constraint if exists profiles_default_lat_range;
alter table public.profiles add constraint profiles_default_lat_range
  -- Latitude must be between -90 and 90 degrees, or left empty (not yet set)
  check (default_lat is null or (default_lat between -90 and 90));

-- Add a check constraint making sure longitude values are always within the valid real-world range
alter table public.profiles drop constraint if exists profiles_default_lng_range;
alter table public.profiles add constraint profiles_default_lng_range
  -- Longitude must be between -180 and 180 degrees, or left empty (not yet set)
  check (default_lng is null or (default_lng between -180 and 180));

-- Repeat the same range safety checks for the "current" GPS columns
alter table public.profiles drop constraint if exists profiles_current_lat_range;
alter table public.profiles add constraint profiles_current_lat_range
  -- Latitude must be between -90 and 90 degrees, or left empty
  check (current_lat is null or (current_lat between -90 and 90));

alter table public.profiles drop constraint if exists profiles_current_lng_range;
alter table public.profiles add constraint profiles_current_lng_range
  -- Longitude must be between -180 and 180 degrees, or left empty
  check (current_lng is null or (current_lng between -180 and 180));
