-- Migration: 0007_listing_attributes_and_photos.sql
-- Purpose: create the two tables that attach extra data to a listing —
-- listing_attributes (flexible per-category fields) and listing_photos (photo metadata).
-- NOTE: this migration only creates the photo METADATA table. The actual storage bucket
-- and upload/camera-capture UI are intentionally left for the listing-creation prompt,
-- since this prompt is schema-only.

-- Create the listing_attributes table if it doesn't already exist
create table if not exists public.listing_attributes (
  -- A unique ID for this attribute row
  id uuid primary key default gen_random_uuid(),
  -- Which listing this attribute belongs to — deleting the listing removes its attributes too
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- The attribute's name, e.g., "km_driven" or "bhk" — matches a product type's question schema key
  key text not null,
  -- The attribute's value, stored as text regardless of its original type (number, boolean, etc.)
  -- so this one table can flexibly hold any category's fields without a schema migration per category
  value text,
  -- Prevent the same listing from having two rows for the same attribute key
  unique (listing_id, key)
);

-- Index listing_id since we'll constantly query "give me all attributes for this listing"
create index if not exists listing_attributes_listing_id_idx on public.listing_attributes (listing_id);

-- Turn on Row Level Security so the policies below actually get enforced
alter table public.listing_attributes enable row level security;

-- Anyone can read the attributes of a listing they're allowed to see (active, or their own) —
-- this mirrors the listings table's own select policy via a subquery
drop policy if exists "Attributes follow their listing's visibility" on public.listing_attributes;
create policy "Attributes follow their listing's visibility"
  on public.listing_attributes
  for select
  using (
    -- Check that a visible parent listing exists for this attribute row
    exists (
      select 1 from public.listings l
      where l.id = listing_attributes.listing_id
        and (l.status = 'active' or l.seller_id = auth.uid())
    )
  );

-- Only the owning seller can add attributes to their own listing
drop policy if exists "Sellers can insert attributes on their own listings" on public.listing_attributes;
create policy "Sellers can insert attributes on their own listings"
  on public.listing_attributes
  for insert
  with check (
    -- Check that the listing this attribute is being attached to belongs to the current user
    exists (
      select 1 from public.listings l
      where l.id = listing_attributes.listing_id
        and l.seller_id = auth.uid()
    )
  );

-- Only the owning seller can update attributes on their own listing
drop policy if exists "Sellers can update attributes on their own listings" on public.listing_attributes;
create policy "Sellers can update attributes on their own listings"
  on public.listing_attributes
  for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_attributes.listing_id
        and l.seller_id = auth.uid()
    )
  );

-- Only the owning seller can delete attributes on their own listing
drop policy if exists "Sellers can delete attributes on their own listings" on public.listing_attributes;
create policy "Sellers can delete attributes on their own listings"
  on public.listing_attributes
  for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_attributes.listing_id
        and l.seller_id = auth.uid()
    )
  );

-- Create the listing_photos table if it doesn't already exist
create table if not exists public.listing_photos (
  -- A unique ID for this photo row
  id uuid primary key default gen_random_uuid(),
  -- Which listing this photo belongs to — deleting the listing removes its photos too
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- The public URL where this photo can be viewed (will point into Supabase Storage)
  url text not null,
  -- The latitude embedded in the photo at capture time, used later to flag GPS/location mismatches
  exif_lat double precision,
  -- The longitude embedded in the photo at capture time
  exif_lng double precision,
  -- The timestamp embedded in the photo at capture time
  exif_timestamp timestamptz,
  -- Whether this photo was taken live through our in-app camera (true) vs. some other means (false) —
  -- defaults to true since that's the only path the upcoming listing-creation flow will allow
  captured_in_app boolean not null default true,
  -- A perceptual hash of the image, used later to detect duplicate/reused photos across listings
  perceptual_hash text,
  -- The display order of this photo within the listing's gallery (0 = first/cover photo)
  sort_order integer not null default 0,
  -- When this photo row was created
  created_at timestamptz not null default now()
);

-- Index listing_id since we'll constantly query "give me all photos for this listing, in order"
create index if not exists listing_photos_listing_id_idx on public.listing_photos (listing_id, sort_order);

-- Turn on Row Level Security so the policies below actually get enforced
alter table public.listing_photos enable row level security;

-- Anyone can see the photos of a listing they're allowed to see (active, or their own)
drop policy if exists "Photos follow their listing's visibility" on public.listing_photos;
create policy "Photos follow their listing's visibility"
  on public.listing_photos
  for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and (l.status = 'active' or l.seller_id = auth.uid())
    )
  );

-- Only the owning seller can add photos to their own listing
drop policy if exists "Sellers can insert photos on their own listings" on public.listing_photos;
create policy "Sellers can insert photos on their own listings"
  on public.listing_photos
  for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and l.seller_id = auth.uid()
    )
  );

-- Only the owning seller can update photo rows on their own listing (e.g., reordering)
drop policy if exists "Sellers can update photos on their own listings" on public.listing_photos;
create policy "Sellers can update photos on their own listings"
  on public.listing_photos
  for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and l.seller_id = auth.uid()
    )
  );

-- Only the owning seller can delete photos from their own listing
drop policy if exists "Sellers can delete photos on their own listings" on public.listing_photos;
create policy "Sellers can delete photos on their own listings"
  on public.listing_photos
  for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_photos.listing_id
        and l.seller_id = auth.uid()
    )
  );
