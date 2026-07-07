-- Migration: 0012_create_listing_function.sql
-- Purpose: provide ONE atomic way to create a listing along with its attributes and photos.
-- Doing this as a single Postgres function means either everything is saved, or (if any part
-- fails) nothing is — there's no risk of a listing existing with zero photos because the
-- photo-saving step failed partway through a multi-request flow from the client.

create or replace function public.create_listing_with_details(
  -- Which product type this listing is (determines its category too — see below)
  p_product_type_id uuid,
  -- The listing's title
  p_title text,
  -- The listing's full description (optional)
  p_description text,
  -- The asking price
  p_price numeric,
  -- "sale" or "rent", passed as text and cast to our enum type below
  p_listing_type text,
  -- "new" or "used", passed as text and cast to our enum type below
  p_condition text,
  -- The human-readable locality name for this listing
  p_locality text,
  -- The listing's latitude
  p_lat double precision,
  -- The listing's longitude
  p_lng double precision,
  -- The category-specific question answers, as a JSON array of {"key": "...", "value": "..."} objects
  p_attributes jsonb,
  -- The captured photos, as a JSON array of
  -- {"url", "exif_lat", "exif_lng", "exif_timestamp", "captured_in_app", "sort_order"} objects
  p_photos jsonb
)
-- This function returns the ID of the newly created listing
returns uuid
language plpgsql
-- Deliberately NOT security definer — this runs with the CALLING user's own privileges, so
-- every RLS policy on listings/listing_attributes/listing_photos still applies as a second
-- line of defense, on top of the explicit checks we do below
as $$
declare
  -- Will hold the ID of the currently logged-in user, taken from their auth session
  v_seller_id uuid;
  -- Will hold the category this listing belongs to, looked up from the chosen product type
  v_category_id uuid;
  -- Will hold the ID of the listing row once we've created it
  v_listing_id uuid;
  -- Will hold how many photos were provided, for validation
  v_photo_count integer;
begin
  -- Look up who's actually calling this function right now
  v_seller_id := auth.uid();
  -- Reject the call outright if nobody is logged in — never trust a client-supplied seller ID
  if v_seller_id is null then
    raise exception 'You must be logged in to create a listing.';
  end if;

  -- Reject empty/whitespace-only titles
  if p_title is null or trim(p_title) = '' then
    raise exception 'A title is required.';
  end if;

  -- Reject negative prices (the table's own check constraint would also catch this, but a
  -- clear error message here is friendlier than a generic constraint-violation error)
  if p_price is null or p_price < 0 then
    raise exception 'Price must be zero or a positive number.';
  end if;

  -- Count how many photos were submitted
  v_photo_count := jsonb_array_length(coalesce(p_photos, '[]'::jsonb));
  -- Enforce the same 3-8 photo rule server-side that the UI already enforces client-side —
  -- client-side checks alone can always be bypassed, so this is the rule that actually matters
  if v_photo_count < 3 then
    raise exception 'At least 3 photos are required (got %).', v_photo_count;
  end if;
  if v_photo_count > 8 then
    raise exception 'A maximum of 8 photos is allowed (got %).', v_photo_count;
  end if;

  -- Look up the category for the chosen product type — this is how we avoid making the
  -- seller pick a category separately; it's implied by the specific product type they chose
  select category_id into v_category_id
  from public.product_types
  where id = p_product_type_id;
  -- If no matching product type was found, the client sent a bad/stale ID — fail clearly
  if v_category_id is null then
    raise exception 'Invalid product type.';
  end if;

  -- Insert the listing row itself, capturing its generated ID into v_listing_id
  insert into public.listings (
    seller_id, category_id, product_type_id, title, description, price,
    listing_type, condition, locality, lat, lng
  )
  values (
    -- Always use the SERVER-determined seller ID, never anything passed in from the client
    v_seller_id,
    v_category_id,
    p_product_type_id,
    trim(p_title),
    p_description,
    p_price,
    -- Cast the plain-text values to our enum types — Postgres raises a clear error automatically
    -- if an invalid value (e.g., "rental" instead of "rent") is passed
    p_listing_type::listing_type_enum,
    p_condition::condition_enum,
    p_locality,
    p_lat,
    p_lng
  )
  returning id into v_listing_id;

  -- Insert one listing_attributes row per entry in the p_attributes JSON array
  insert into public.listing_attributes (listing_id, key, value)
  select
    -- Every attribute row belongs to the listing we just created
    v_listing_id,
    -- Pull the "key" field out of each JSON object in the array
    attr.value ->> 'key',
    -- Pull the "value" field out of each JSON object in the array
    attr.value ->> 'value'
  -- Expand the JSON array into one row per element
  from jsonb_array_elements(coalesce(p_attributes, '[]'::jsonb)) as attr(value)
  -- Skip any malformed entries that don't actually have a key
  where attr.value ->> 'key' is not null;

  -- Insert one listing_photos row per entry in the p_photos JSON array
  insert into public.listing_photos (
    listing_id, url, exif_lat, exif_lng, exif_timestamp, captured_in_app, sort_order
  )
  select
    -- Every photo row belongs to the listing we just created
    v_listing_id,
    -- The photo's already-uploaded Supabase Storage URL
    photo.value ->> 'url',
    -- The latitude captured at the moment this photo was taken, cast from JSON text to a number
    (photo.value ->> 'exif_lat')::double precision,
    -- The longitude captured at the moment this photo was taken
    (photo.value ->> 'exif_lng')::double precision,
    -- The timestamp captured at the moment this photo was taken
    (photo.value ->> 'exif_timestamp')::timestamptz,
    -- Whether this photo was taken through our in-app camera — defaults to true if not specified
    coalesce((photo.value ->> 'captured_in_app')::boolean, true),
    -- This photo's position in the gallery — defaults to its array index if not specified
    coalesce((photo.value ->> 'sort_order')::integer, (ordinality - 1)::integer)
  -- Expand the JSON array into one row per element, also giving us each element's position
  from jsonb_array_elements(p_photos) with ordinality as photo(value, ordinality)
  -- Skip any malformed entries that don't actually have a URL
  where photo.value ->> 'url' is not null;

  -- Hand back the new listing's ID so the client knows where to redirect the seller
  return v_listing_id;
end;
$$;

-- By default, Postgres grants EXECUTE on new functions to PUBLIC (which includes anon) —
-- revoke that first so only logged-in users can even attempt to call this function at all,
-- rather than relying solely on the internal "must be logged in" check above as the only defense
revoke all on function public.create_listing_with_details(
  uuid, text, text, numeric, text, text, text, double precision, double precision, jsonb, jsonb
) from public;

-- Only logged-in users can call this function — posting a listing always requires authentication
grant execute on function public.create_listing_with_details(
  uuid, text, text, numeric, text, text, text, double precision, double precision, jsonb, jsonb
) to authenticated;
