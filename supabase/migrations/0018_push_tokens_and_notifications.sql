-- Migration: 0018_push_tokens_and_notifications.sql
-- Purpose: the two tables that power the notification system — device tokens for Firebase
-- Cloud Messaging (push) and a universal notifications inbox (in-app + read/unread tracking).

-- ============================================================================================
-- PUSH TOKENS — one row per (user, FCM token) pair, refreshed whenever the browser renews
-- ============================================================================================

-- Create the push_tokens table if it doesn't already exist
create table if not exists public.push_tokens (
  -- A unique ID for this token row
  id uuid primary key default gen_random_uuid(),
  -- The user this token belongs to
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- The raw FCM registration token string
  token text not null,
  -- When this token was first registered (or last refreshed)
  created_at timestamptz not null default now(),
  -- Tokens are per-device — each (user, token) pair is unique so we can upsert safely
  unique (user_id, token)
);

-- Index user_id since "fetch all tokens for user X" is what the cron/send functions call
create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);

-- Turn on Row Level Security
alter table public.push_tokens enable row level security;

-- A logged-in user can register their own token — but may not read tokens at all
-- (there's no reason to expose raw FCM tokens to the client; they're write-only here)
drop policy if exists "Users can register their own push tokens" on public.push_tokens;
create policy "Users can register their own push tokens"
  on public.push_tokens
  for insert
  with check (auth.uid() = user_id);

-- Allow upsert (update) for token refresh — same ownership rule
drop policy if exists "Users can update their own push tokens" on public.push_tokens;
create policy "Users can update their own push tokens"
  on public.push_tokens
  for update
  using (auth.uid() = user_id);

-- A user can delete/revoke their own token (e.g., on logout)
drop policy if exists "Users can delete their own push tokens" on public.push_tokens;
create policy "Users can delete their own push tokens"
  on public.push_tokens
  for delete
  using (auth.uid() = user_id);

-- NOTE: no SELECT policy — the server (via service-role key in the cron job) reads tokens;
-- the client only ever needs to write/refresh its own token, never read others'.

-- ============================================================================================
-- NOTIFICATIONS — a universal inbox row for every in-app notification
-- ============================================================================================

-- An enumeration of every notification type the app can generate, so the frontend can
-- render the right icon/colour without checking free-form strings
do $$ begin
  -- Try to create the type — silently skip if it already exists (e.g., on re-run)
  create type public.notification_type as enum (
    'new_match',         -- A new listing matches a saved search
    'price_drop',        -- A wishlisted listing's price has dropped
    'new_message',       -- A new chat message arrived
    'listing_sold',      -- A listing the user was watching or selling was marked sold
    'listing_expiring',  -- The user's own listing is about to expire
    'welcome'            -- The welcome notification sent once on account creation
  );
exception
  -- Skip quietly if the type already exists
  when duplicate_object then null;
end $$;

-- Create the notifications table if it doesn't already exist
create table if not exists public.notifications (
  -- A unique ID for this notification
  id uuid primary key default gen_random_uuid(),
  -- Who this notification is for
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- What kind of notification this is (drives icon/colour in the UI)
  type public.notification_type not null,
  -- The bold first line shown in the notification bell and any push notification
  title text not null,
  -- The secondary/body text
  body text not null default '',
  -- An optional deep-link URL (e.g., /listing/[id], /messages/[conv]) the bell row taps to
  link text,
  -- Whether the user has seen/dismissed this notification
  read boolean not null default false,
  -- When this notification was created (used for sorting and "X minutes ago" labels)
  created_at timestamptz not null default now()
);

-- Index user_id + created_at together since "fetch my recent notifications" always filters
-- by user and orders by time descending
create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

-- Turn on Row Level Security
alter table public.notifications enable row level security;

-- A user can only read their own notifications
drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
  on public.notifications
  for select
  using (auth.uid() = user_id);

-- A user can mark their own notifications as read (update only "read" column is the intent,
-- but row-level policy can't restrict which columns — we rely on the API layer for that)
drop policy if exists "Users can update their own notifications" on public.notifications;
create policy "Users can update their own notifications"
  on public.notifications
  for update
  using (auth.uid() = user_id);

-- NOTE: there is intentionally no INSERT policy for regular users — notifications are always
-- created by the server (cron job, realtime trigger, or API route) using the service-role key,
-- never directly by the client.

-- Enable Supabase Realtime on notifications so the bell icon updates instantly without polling
do $$
begin
  -- Add the table to the Supabase-managed publication (no-op on plain local Postgres)
  alter publication supabase_realtime add table public.notifications;
exception
  -- Skip quietly if the publication doesn't exist (plain local Postgres) or table already added
  when undefined_object then null;
  when duplicate_object then null;
end $$;
