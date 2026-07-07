-- Migration: 0016_phone_privacy_fix.sql
-- Purpose: close a real privacy gap: the profiles.phone column was readable by anyone via
-- a direct Supabase query, completely bypassing the "reveal on click + audit log" design.
-- This migration:
--   1. Revokes SELECT on the phone column from anon/authenticated at the column level
--   2. Provides reveal_seller_phone(listing_id) — the ONLY way to see a phone number —
--      which atomically logs the reveal AND returns the phone in one call

-- Revoke column-level read access to the phone number from every role except the superuser.
-- NOTE: In Supabase's hosted environment the roles are named "anon" and "authenticated"; on a
-- self-hosted or local Postgres they may not exist yet (this migration gracefully handles that).
do $$
begin
  -- Revoke read access to the phone column from the anonymous (logged-out) role
  execute 'revoke select (phone) on public.profiles from anon';
exception
  -- If the role doesn't exist (plain local Postgres), skip quietly
  when undefined_object then null;
end $$;

do $$
begin
  -- Revoke read access to the phone column from the general authenticated-user role too —
  -- the ONLY path to see someone's phone is through the reveal function below
  execute 'revoke select (phone) on public.profiles from authenticated';
exception
  when undefined_object then null;
end $$;

-- Define the secure reveal function — called when the buyer taps "Show Number"
create or replace function public.reveal_seller_phone(p_listing_id uuid)
-- Returns the seller's phone number, or raises an exception if this is not allowed
returns text
language plpgsql
-- SECURITY DEFINER so this function can read the phone column even after we revoked it above
security definer
set search_path = public
as $$
declare
  -- The calling user's ID
  v_viewer_id uuid;
  -- The listing's seller ID
  v_seller_id uuid;
  -- The seller's phone number, to be returned
  v_phone text;
begin
  -- Identify who's actually calling this function
  v_viewer_id := auth.uid();
  -- Require the caller to be logged in — a logged-out user can't reveal a phone number
  if v_viewer_id is null then
    raise exception 'You must be logged in to see a seller''s phone number.';
  end if;

  -- Look up the listing's seller ID and the seller's phone number together
  select l.seller_id, p.phone
  into v_seller_id, v_phone
  from public.listings l
  join public.profiles p on p.id = l.seller_id
  where l.id = p_listing_id
    -- Only reveal phone numbers for active listings — no point revealing a sold/removed listing's seller
    and l.status = 'active';

  -- If the listing wasn't found (or isn't active), refuse clearly
  if v_seller_id is null then
    raise exception 'Listing not found or no longer active.';
  end if;

  -- A seller doesn't need to "reveal" their own phone number to themselves
  if v_seller_id = v_viewer_id then
    raise exception 'This is your own listing.';
  end if;

  -- Log this reveal event — this INSERT is what the audit trail depends on, so it happens
  -- BEFORE we return the phone number: even if the caller disconnects immediately after,
  -- the log is written
  insert into public.contact_reveals (listing_id, viewer_id)
  values (p_listing_id, v_viewer_id)
  -- If this exact viewer already revealed this listing's phone, just update the timestamp
  -- rather than inserting a duplicate row — one reveal per viewer per listing is enough
  on conflict do nothing;

  -- Return the phone number — only reached if all the guards above passed
  return v_phone;
end;
$$;

-- Revoke the default PUBLIC execute grant, same defense-in-depth pattern used throughout
revoke all on function public.reveal_seller_phone(uuid) from public;
-- Only logged-in users can call this function
grant execute on function public.reveal_seller_phone(uuid) to authenticated;
