-- Migration: 0001_profiles.sql
-- Purpose: create the `profiles` table that stores public-facing user data,
-- separate from Supabase's private `auth.users` table, plus a trigger that
-- automatically creates a profile row the moment someone signs up via OTP.

-- Create the profiles table if it doesn't already exist
create table if not exists public.profiles (
  -- The profile's ID, which is also the Supabase auth user's ID (one-to-one link)
  id uuid primary key references auth.users (id) on delete cascade,
  -- The user's phone number, copied from auth.users for easy querying/display
  phone text not null,
  -- The user's display name — null until they complete onboarding (this is how we detect "new user")
  name text,
  -- A URL pointing to the user's profile photo in Supabase Storage, null if not set
  profile_photo_url text,
  -- When this profile was first created
  created_at timestamptz not null default now(),
  -- Whether this seller has completed ID verification (set by an admin in a later prompt)
  is_verified_seller boolean not null default false,
  -- The user's average rating from past transactions, starts at 0 until they have any ratings
  rating_avg numeric(2, 1) not null default 0,
  -- How many ratings this user has received, starts at 0
  rating_count integer not null default 0
);

-- Turn on Row Level Security so the policies below actually get enforced
alter table public.profiles enable row level security;

-- Allow anyone (including logged-out visitors) to read basic profile info —
-- needed so buyers can see a seller's name/rating on a listing without logging in
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
  on public.profiles
  for select
  using (true);

-- Allow a logged-in user to update ONLY their own profile row
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- NOTE: there is intentionally no "insert" policy for regular users —
-- profile rows are only ever created by the trigger below (running as the table owner),
-- never directly by a user, which prevents someone from creating a fake profile for another ID.

-- Define a function that runs automatically whenever a new row is added to auth.users
create or replace function public.handle_new_auth_user()
-- This function runs with the privileges of the function's owner, not the calling user,
-- which lets it insert into `profiles` even though regular users have no insert policy
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert a starter profile row for the brand-new auth user, using their phone number
  insert into public.profiles (id, phone)
  values (new.id, coalesce(new.phone, ''));
  -- Return the new auth.users row unchanged, as required by trigger functions
  return new;
end;
$$;

-- Remove any existing trigger of the same name so this migration can be re-run safely
drop trigger if exists on_auth_user_created on auth.users;

-- Create the trigger: after every new row in auth.users, run the function above
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
