-- Migration: 0003_profile_photos_bucket.sql
-- Purpose: set up a public Storage bucket for profile photos, with rules so users
-- can only upload/overwrite their OWN photo, while anyone can view any profile photo.

-- Create the bucket if it doesn't already exist (public = true means anyone can view files in it)
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
-- If the bucket already exists (e.g., migration re-run), do nothing instead of erroring
on conflict (id) do nothing;

-- Allow anyone to read/view files in this bucket (profile photos are meant to be public)
drop policy if exists "Profile photos are publicly readable" on storage.objects;
create policy "Profile photos are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'profile-photos');

-- Allow a logged-in user to upload a file ONLY into a folder named after their own user ID
-- (we'll structure uploads as profile-photos/<user-id>/<filename> from the app code)
drop policy if exists "Users can upload their own profile photo" on storage.objects;
create policy "Users can upload their own profile photo"
  on storage.objects
  for insert
  with check (
    -- Restrict uploads to this one bucket
    bucket_id = 'profile-photos'
    -- Check that the first folder in the file path matches the uploading user's ID
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow a logged-in user to replace/overwrite ONLY their own existing profile photo file
drop policy if exists "Users can update their own profile photo" on storage.objects;
create policy "Users can update their own profile photo"
  on storage.objects
  for update
  using (
    -- Restrict updates to this one bucket
    bucket_id = 'profile-photos'
    -- Check that the first folder in the file path matches the updating user's ID
    and (storage.foldername(name))[1] = auth.uid()::text
  );
