-- Migration: 0019_fraud_detection_columns.sql
-- Purpose: extend the listings and listing_photos tables with the columns the fraud-detection
-- layer needs, and provide a safe server-side function to flag listings.

-- ── listings.flagged_reason ───────────────────────────────────────────────────────────────
-- A human-readable note (set by the fraud system, NOT by the seller) explaining WHY this
-- listing was flagged. NULL when status != 'flagged'. Used by the admin queue in Prompt 10.
alter table public.listings
  add column if not exists flagged_reason text;

-- ── listing_photos.perceptual_hash ────────────────────────────────────────────────────────
-- A 16-character hex string representing the photo's dHash (difference perceptual hash).
-- Computed client-side with a canvas element and stored here so the server can detect
-- when the same (or very similar) photo appears on listings from different sellers.
alter table public.listing_photos
  add column if not exists perceptual_hash text;

-- Index the hash column so duplicate-detection queries are fast even with many photos
create index if not exists listing_photos_perceptual_hash_idx
  on public.listing_photos (perceptual_hash)
  -- Partial index: only index rows that actually have a hash stored, skipping nulls
  where perceptual_hash is not null;

-- ── flag_listing_with_reason() ────────────────────────────────────────────────────────────
-- A SECURITY DEFINER function the fraud-check API route can call to set status='flagged'
-- and write the reason — even though the route runs as the authenticated user (who normally
-- cannot set status='flagged' on their own listing via RLS).
create or replace function public.flag_listing_with_reason(
  -- The listing to flag
  p_listing_id uuid,
  -- The human-readable reason string written into flagged_reason
  p_reason text
)
returns void
language plpgsql
-- SECURITY DEFINER so this function can bypass RLS and set status/flagged_reason
security definer
set search_path = public
as $$
begin
  -- Update the listing's status to 'flagged' and record the reason why
  update public.listings
  set
    -- Mark the listing as flagged so it no longer appears in public feeds
    status = 'flagged',
    -- Store the reason so the admin queue can show it
    flagged_reason = p_reason
  where
    -- Only flag the specific listing we were told to flag
    id = p_listing_id
    -- Only flag listings that are currently active — don't touch already-sold or removed ones
    and status = 'active';
end;
$$;

-- Revoke the default PUBLIC execute grant — only server-side code (via service-role) calls this
revoke all on function public.flag_listing_with_reason(uuid, text) from public;
-- Grant to authenticated so the fraud-check API route (running as the listing's owner) can call it
grant execute on function public.flag_listing_with_reason(uuid, text) to authenticated;

-- ── check_listing_exif_fraud() ────────────────────────────────────────────────────────────
-- Called server-side after a listing is created. Checks every photo's EXIF data against the
-- declared listing location and submission time, and flags the listing if anything is suspicious.
-- Returns a text description of the fraud reason found, or NULL if everything looks fine.
create or replace function public.check_listing_exif_fraud(
  -- The listing to check
  p_listing_id uuid,
  -- Max km between photo's EXIF GPS and declared listing location before it's flagged
  p_max_distance_km double precision default 15.0,
  -- Max days between photo's EXIF timestamp and listing creation before it's flagged
  p_max_photo_age_days integer default 30
)
returns text
language plpgsql
-- SECURITY DEFINER so the function can read listing_photos regardless of the caller's role
security definer
set search_path = public
as $$
declare
  -- A record we'll iterate over to check each photo
  v_photo record;
  -- The listing's declared lat/lng and creation time
  v_listing_lat double precision;
  v_listing_lng double precision;
  v_listing_created_at timestamptz;
  -- Distance in km between photo EXIF GPS and listing location
  v_distance_km double precision;
  -- Age of the photo at listing creation time
  v_photo_age_days integer;
  -- The reason string to return if fraud is detected (NULL if none found)
  v_reason text := null;
begin
  -- Fetch the listing's declared location and creation timestamp
  select lat, lng, created_at
  into v_listing_lat, v_listing_lng, v_listing_created_at
  from public.listings
  where id = p_listing_id;

  -- If the listing doesn't exist or has no location, nothing to check
  if v_listing_lat is null then
    return null;
  end if;

  -- Loop over every photo attached to this listing that has EXIF GPS data
  for v_photo in
    select exif_lat, exif_lng, exif_timestamp
    from public.listing_photos
    where listing_id = p_listing_id
      -- Only check photos that actually have EXIF GPS coordinates
      and exif_lat is not null
      and exif_lng is not null
  loop
    -- ── Distance check ──────────────────────────────────────────────────────────────────
    -- Compute the Haversine distance between the photo's GPS and the listing's declared location.
    -- Formula: 2 * R * arcsin( sqrt( sin²(Δlat/2) + cos(lat1)*cos(lat2)*sin²(Δlng/2) ) )
    -- where R = 6371 (Earth's radius in km), all angles in radians.
    v_distance_km := 2 * 6371 * asin(
      sqrt(
        -- sin² of half the latitude difference
        pow(sin(radians(v_photo.exif_lat - v_listing_lat) / 2), 2)
        -- plus cos(lat1) * cos(lat2) * sin² of half the longitude difference
        + cos(radians(v_listing_lat)) * cos(radians(v_photo.exif_lat))
          * pow(sin(radians(v_photo.exif_lng - v_listing_lng) / 2), 2)
      )
    );

    -- If this photo was taken more than p_max_distance_km away from the declared location, flag it
    if v_distance_km > p_max_distance_km then
      -- Compose a clear flagged_reason string that the admin can read in the queue
      v_reason := format(
        'EXIF GPS mismatch: photo taken %s km from declared location (max %s km)',
        -- round() to 1 decimal place, then cast to text — format() only supports %s, not %f
        round(v_distance_km::numeric, 1)::text,
        p_max_distance_km::text
      );
      -- Return immediately — one mismatch is enough to flag the listing
      return v_reason;
    end if;

    -- ── Timestamp check ─────────────────────────────────────────────────────────────────
    -- If the photo has an EXIF timestamp, check whether it's too old relative to listing creation
    if v_photo.exif_timestamp is not null then
      -- Compute age in whole days: listing creation time minus when the photo was taken
      v_photo_age_days := extract(epoch from (v_listing_created_at - v_photo.exif_timestamp)) / 86400;

      -- Negative age means the photo timestamp is AFTER listing creation — which is suspicious
      -- (clocks can drift by a few hours, but a photo "from the future" is likely a bad timestamp)
      if v_photo_age_days < 0 then
        v_reason := format(
          'EXIF timestamp anomaly: photo timestamp (%s) is after listing creation',
          v_photo.exif_timestamp::date
        );
        return v_reason;
      end if;

      -- A photo older than p_max_photo_age_days suggests it's a stock or archived image
      if v_photo_age_days > p_max_photo_age_days then
        v_reason := format(
          'EXIF timestamp too old: photo taken %s days before listing (max %s days)',
          v_photo_age_days,
          p_max_photo_age_days
        );
        return v_reason;
      end if;
    end if;
  end loop;

  -- All checks passed — no fraud detected
  return null;
end;
$$;

-- Revoke PUBLIC, grant to authenticated (called from the server API route as the listing owner)
revoke all on function public.check_listing_exif_fraud(uuid, double precision, integer) from public;
grant execute on function public.check_listing_exif_fraud(uuid, double precision, integer) to authenticated;

-- ── check_listing_photo_duplicates() ─────────────────────────────────────────────────────
-- Checks whether any of the newly-uploaded photos' perceptual hashes match a photo on an
-- EXISTING listing from a DIFFERENT seller. Returns a reason string if duplicates found.
create or replace function public.check_listing_photo_duplicates(
  -- The newly-created listing to check
  p_listing_id uuid
)
returns text
language plpgsql
-- SECURITY DEFINER so the function can query other sellers' photo hashes
security definer
set search_path = public
as $$
declare
  -- Holds the duplicate match info we find (if any)
  v_match record;
  -- The seller of the listing we're checking
  v_seller_id uuid;
begin
  -- Find the seller of this listing so we can exclude them from the search below
  select seller_id into v_seller_id from public.listings where id = p_listing_id;
  if v_seller_id is null then
    return null;
  end if;

  -- Look for any photo in the NEW listing whose hash matches a photo on ANY OTHER listing
  -- from a DIFFERENT seller — this is the "stock photo reuse" or "scam reposter" signal
  select
    -- Capture the matching existing listing ID so we can mention it in the reason string
    existing_listing.id as existing_listing_id,
    -- Capture the matching photo hash for the reason string
    new_photo.perceptual_hash as hash
  into v_match
  from
    -- The new listing's photos
    public.listing_photos new_photo
    -- Join against all OTHER photos with the same hash
    join public.listing_photos existing_photo
      on existing_photo.perceptual_hash = new_photo.perceptual_hash
      -- Ensure we're not comparing the photo to itself
      and existing_photo.id != new_photo.id
    -- Join to get the existing photo's listing, so we can check seller ownership
    join public.listings existing_listing
      on existing_listing.id = existing_photo.listing_id
  where
    -- Only check photos belonging to the new listing
    new_photo.listing_id = p_listing_id
    -- The hash must actually be set (skip photos that weren't hashed client-side)
    and new_photo.perceptual_hash is not null
    -- Only flag cross-seller matches — same seller reusing their own photo is fine
    and existing_listing.seller_id != v_seller_id
    -- Only flag against active listings (not against already-removed/flagged/sold ones)
    and existing_listing.status = 'active'
  -- Take just the first match — one is enough to flag
  limit 1;

  -- If we found a match, return a descriptive reason string
  if v_match is not null then
    return format(
      'Duplicate photo detected: image hash %s matches a photo on listing %s from a different seller',
      v_match.hash,
      v_match.existing_listing_id
    );
  end if;

  -- No duplicates found
  return null;
end;
$$;

-- Revoke PUBLIC, grant to authenticated
revoke all on function public.check_listing_photo_duplicates(uuid) from public;
grant execute on function public.check_listing_photo_duplicates(uuid) to authenticated;
