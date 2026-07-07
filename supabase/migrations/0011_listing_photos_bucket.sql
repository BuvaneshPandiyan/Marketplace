-- Migration: 0011_listing_photos_bucket.sql
-- Purpose: set up the public Storage bucket for listing photos. Photos are captured and
-- uploaded DURING the multi-step "Post Ad" wizard, before the listing row itself exists yet
-- (the listing is only created at final submit) — so paths are organized by the uploading
-- user's ID rather than by listing ID: listing-photos/<user-id>/<timestamp>-<n>.jpg

-- Create the bucket if it doesn't already exist (public = true so listing photos are viewable by anyone)
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
-- If the bucket already exists (e.g., migration re-run), do nothing instead of erroring
on conflict (id) do nothing;

-- Allow anyone to read/view files in this bucket (listing photos are meant to be public)
drop policy if exists "Listing photos are publicly readable" on storage.objects;
create policy "Listing photos are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'listing-photos');

-- Allow a logged-in user to upload a file ONLY into a folder named after their own user ID
drop policy if exists "Users can upload their own listing photos" on storage.objects;
create policy "Users can upload their own listing photos"
  on storage.objects
  for insert
  with check (
    -- Restrict uploads to this one bucket
    bucket_id = 'listing-photos'
    -- Check that the first folder in the file path matches the uploading user's ID
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow a logged-in user to delete ONLY their own uploaded listing photo files —
-- useful if they remove a photo mid-wizard before final submit, or delete a listing later
drop policy if exists "Users can delete their own listing photos" on storage.objects;
create policy "Users can delete their own listing photos"
  on storage.objects
  for delete
  using (
    -- Restrict deletes to this one bucket
    bucket_id = 'listing-photos'
    -- Check that the first folder in the file path matches the deleting user's ID
    and (storage.foldername(name))[1] = auth.uid()::text
  );
