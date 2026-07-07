-- Migration: 0022_create_listing_store_phash.sql
-- Purpose: update create_listing_with_details() to also extract and store the
-- perceptual_hash field from each photo object in the p_photos JSONB array.
-- This is the minimum change needed — all other logic in the function is unchanged.

-- Replace the function with a version that adds perceptual_hash to the INSERT
create or replace function public.create_listing_with_details(
  p_product_type_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_listing_type text,
  p_condition text,
  p_locality text,
  p_lat double precision,
  p_lng double precision,
  p_attributes jsonb,
  -- JSON array of photo objects:
  -- {"url", "exif_lat", "exif_lng", "exif_timestamp", "captured_in_app",
  --  "perceptual_hash", "sort_order"}
  p_photos jsonb
)
returns uuid
language plpgsql
-- SECURITY DEFINER so the caller (authenticated user) can write to listings without a
-- blanket INSERT policy — same reasoning as the original function in migration 0012
security definer
set search_path = public
as $$
declare
  -- Will hold the new listing's UUID once we've inserted it
  v_listing_id uuid;
  -- The seller is always the currently-authenticated user — never trust a client-supplied ID
  v_seller_id uuid := auth.uid();
  -- The product type's parent category, used to link the listing to its category
  v_category_id uuid;
  -- Total number of photos in the array (used to validate the maximum)
  v_photo_count integer;
begin
  -- Refuse if nobody is logged in — this function must never run anonymously
  if v_seller_id is null then
    raise exception 'You must be logged in to post a listing.';
  end if;

  -- Look up which category this product type belongs to
  select category_id into v_category_id from public.product_types where id = p_product_type_id;
  if v_category_id is null then
    raise exception 'Unknown product type: %', p_product_type_id;
  end if;

  -- Count photos and enforce the 10-photo maximum
  v_photo_count := jsonb_array_length(coalesce(p_photos, '[]'::jsonb));
  if v_photo_count > 10 then
    raise exception 'Too many photos: % supplied, maximum is 10.', v_photo_count;
  end if;

  -- Require at least one photo (prevents empty listing shells)
  if v_photo_count = 0 then
    raise exception 'At least one photo is required.';
  end if;

  -- Validate listing_type
  if p_listing_type not in ('sale', 'rent') then
    raise exception 'Invalid listing_type: %. Must be ''sale'' or ''rent''.', p_listing_type;
  end if;

  -- Validate condition
  if p_condition not in ('new', 'used') then
    raise exception 'Invalid condition: %. Must be ''new'' or ''used''.', p_condition;
  end if;

  -- Insert the core listing row — status defaults to 'active' (set in migration 0006)
  insert into public.listings (
    seller_id, category_id, product_type_id,
    title, description, price,
    listing_type, condition,
    locality, lat, lng,
    -- Store the listing's geography as a PostGIS point (used by the distance query functions)
    geog
  )
  values (
    v_seller_id, v_category_id, p_product_type_id,
    p_title, p_description, p_price,
    p_listing_type, p_condition,
    p_locality, p_lat, p_lng,
    ST_Point(p_lng, p_lat)::geography
  )
  -- Capture the auto-generated UUID so we can use it in the next two INSERTs
  returning id into v_listing_id;

  -- Insert one listing_attributes row per entry in the p_attributes JSON array
  insert into public.listing_attributes (listing_id, key, value)
  select
    v_listing_id,
    -- Extract the key field from each attribute object
    attr.value ->> 'key',
    -- Extract the value field from each attribute object
    attr.value ->> 'value'
  from jsonb_array_elements(coalesce(p_attributes, '[]'::jsonb)) as attr(value)
  -- Skip attributes that have an empty key (shouldn't happen, but defensive)
  where attr.value ->> 'key' is not null;

  -- Insert one listing_photos row per entry in the p_photos JSON array
  -- CHANGED vs 0012: now also extracts and stores perceptual_hash
  insert into public.listing_photos (
    listing_id, url, exif_lat, exif_lng, exif_timestamp, captured_in_app,
    -- NEW: include perceptual_hash so the fraud-check function can compare it cross-seller
    perceptual_hash,
    sort_order
  )
  select
    v_listing_id,
    -- The Storage URL for this photo
    photo.value ->> 'url',
    -- The GPS latitude from the photo's EXIF data (null if not captured or not available)
    (photo.value ->> 'exif_lat')::double precision,
    -- The GPS longitude from the photo's EXIF data
    (photo.value ->> 'exif_lng')::double precision,
    -- The timestamp from the photo's EXIF data (ISO string, cast to timestamptz)
    (photo.value ->> 'exif_timestamp')::timestamptz,
    -- Whether this photo was captured inside the app (always true for the sell wizard)
    coalesce((photo.value ->> 'captured_in_app')::boolean, true),
    -- NEW: the dHash perceptual hash computed client-side (null if not provided)
    photo.value ->> 'perceptual_hash',
    -- The display order (0-indexed); falls back to the array element position
    coalesce((photo.value ->> 'sort_order')::integer, (ordinality - 1)::integer)
  from jsonb_array_elements(p_photos) with ordinality as photo(value, ordinality);

  -- Return the new listing's UUID to the caller so it can redirect to the listing page
  return v_listing_id;
end;
$$;

-- Revoke and re-grant as before
revoke all on function public.create_listing_with_details(
  uuid, text, text, numeric, text, text, text, double precision, double precision, jsonb, jsonb
) from public;
grant execute on function public.create_listing_with_details(
  uuid, text, text, numeric, text, text, text, double precision, double precision, jsonb, jsonb
) to authenticated;
