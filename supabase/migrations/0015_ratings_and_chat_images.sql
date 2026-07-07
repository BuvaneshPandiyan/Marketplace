-- Migration: 0015_ratings_and_chat_images.sql
-- Purpose: the post-transaction rating system, and a Storage bucket for chat image attachments
-- (deliberately allows normal file upload, unlike listing photos, since this is person-to-person
-- chat content, not a listing authenticity claim).

-- ============================================================================================
-- RATINGS
-- ============================================================================================

-- Create the ratings table if it doesn't already exist
create table if not exists public.ratings (
  -- A unique ID for this rating
  id uuid primary key default gen_random_uuid(),
  -- Which listing/transaction this rating is about
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- Who gave the rating
  rater_id uuid not null references public.profiles (id) on delete cascade,
  -- Who the rating is ABOUT
  rated_user_id uuid not null references public.profiles (id) on delete cascade,
  -- The star rating itself, constrained to a sensible 1-5 range
  stars integer not null check (stars between 1 and 5),
  -- An optional written comment
  comment text,
  -- When this rating was given
  created_at timestamptz not null default now(),
  -- One rating per person per transaction — can't rate the same listing's counterpart twice
  unique (listing_id, rater_id)
);

-- Index rated_user_id since profile pages/aggregation queries filter by "ratings about this person"
create index if not exists ratings_rated_user_id_idx on public.ratings (rated_user_id);

-- Turn on Row Level Security
alter table public.ratings enable row level security;

-- Ratings are public, like reviews on any marketplace — anyone can read them
drop policy if exists "Ratings are publicly readable" on public.ratings;
create policy "Ratings are publicly readable"
  on public.ratings
  for select
  using (true);

-- A user can only insert a rating as themselves, and only for a listing where they were
-- actually the buyer or seller (checked via the conversation that must exist for that pairing)
drop policy if exists "Users can rate their own completed transactions" on public.ratings;
create policy "Users can rate their own completed transactions"
  on public.ratings
  for insert
  with check (
    rater_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.listing_id = ratings.listing_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
        -- The person being rated must be the OTHER participant in that same conversation
        and (c.buyer_id = ratings.rated_user_id or c.seller_id = ratings.rated_user_id)
        and ratings.rated_user_id != auth.uid()
    )
  );

-- Define a function that recomputes a user's rating_avg/rating_count whenever their ratings change
create or replace function public.recompute_profile_rating()
returns trigger
language plpgsql
-- SECURITY DEFINER is required here: the person leaving a rating only has permission to update
-- their OWN profile row (per the profiles RLS policy), but this function needs to update the
-- RATED person's profile instead — a deliberate, narrow exception to that rule
security definer
set search_path = public
as $$
declare
  -- Whichever user's aggregate numbers need recalculating
  v_user_id uuid;
begin
  -- On insert/update we care about the new row's rated user; on delete, the old row's
  v_user_id := coalesce(new.rated_user_id, old.rated_user_id);

  -- Recompute both the average and the count in one update, from the full set of their ratings
  update public.profiles
  set
    -- Average star rating, rounded to one decimal place, defaulting to 0 if they have none
    rating_avg = (select coalesce(round(avg(stars)::numeric, 1), 0) from public.ratings where rated_user_id = v_user_id),
    -- How many ratings they've received in total
    rating_count = (select count(*) from public.ratings where rated_user_id = v_user_id)
  where id = v_user_id;

  -- Triggers must return a row; NEW for insert/update, OLD for delete
  return coalesce(new, old);
end;
$$;

-- Remove any existing trigger of the same name so this migration can be re-run safely
drop trigger if exists on_rating_change on public.ratings;
-- Run the recompute after any insert, update, or delete on the ratings table
create trigger on_rating_change
  after insert or update or delete on public.ratings
  for each row
  execute function public.recompute_profile_rating();

-- ============================================================================================
-- CHAT IMAGES STORAGE BUCKET — normal upload allowed (not camera-only, unlike listing photos)
-- ============================================================================================

-- Create the bucket if it doesn't already exist
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

-- Anyone can view chat images (simplest policy — actual access to the chat thread itself is
-- already gated by the messages/conversations RLS policies; the image URL alone reveals little)
drop policy if exists "Chat images are publicly readable" on storage.objects;
create policy "Chat images are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'chat-images');

-- A logged-in user can upload into their own folder, same per-user-folder pattern used elsewhere
drop policy if exists "Users can upload their own chat images" on storage.objects;
create policy "Users can upload their own chat images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'chat-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
