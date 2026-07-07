-- Migration: 0020_reports_keywords_anomalies.sql
-- Purpose: the report/flag system, the chat keyword safety list, and the anomaly log.

-- ============================================================================================
-- REPORTS TABLE
-- ============================================================================================

-- The set of things a user can report — using an enum keeps the DB consistent and the
-- API honest: a frontend bug or malicious caller can't invent a new target_type string
do $$ begin
  create type public.report_target_type as enum ('listing', 'user', 'message');
exception
  -- Skip quietly if this enum already exists (e.g., migration re-run)
  when duplicate_object then null;
end $$;

-- The set of reasons a user can choose when submitting a report
do $$ begin
  create type public.report_reason as enum (
    'fake_listing',      -- Listing content appears fabricated or misrepresented
    'scam',              -- Apparent fraud or deceptive intent
    'inappropriate',     -- Offensive, adult, or otherwise policy-violating content
    'wrong_category',    -- Item filed under a misleading category
    'other'              -- Catch-all for anything not covered above
  );
exception
  when duplicate_object then null;
end $$;

-- The lifecycle states a report goes through before it's resolved
do $$ begin
  create type public.report_status as enum (
    'pending',    -- Newly submitted, not yet reviewed by an admin
    'reviewed',   -- An admin has looked at it but not yet taken action
    'resolved',   -- Action was taken (listing removed, user banned, etc.)
    'dismissed'   -- Admin decided the report was unwarranted
  );
exception
  when duplicate_object then null;
end $$;

-- Create the reports table
create table if not exists public.reports (
  -- Unique ID for this report
  id uuid primary key default gen_random_uuid(),
  -- Who filed the report
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  -- What kind of thing is being reported
  target_type public.report_target_type not null,
  -- The ID of the listing, user profile, or message being reported
  -- Stored as text so it can reference any table without a polymorphic FK
  target_id text not null,
  -- The selected reason category
  reason public.report_reason not null,
  -- An optional freeform comment from the reporter
  comment text,
  -- When this report was filed
  created_at timestamptz not null default now(),
  -- Current moderation status
  status public.report_status not null default 'pending',
  -- One report per (reporter, target) pair — prevents the same user spamming the queue
  unique (reporter_id, target_type, target_id)
);

-- Index for the admin queue: "show me all pending reports newest-first"
create index if not exists reports_status_created_idx on public.reports (status, created_at desc);
-- Index for threshold queries: "how many reports does target X have?"
create index if not exists reports_target_idx on public.reports (target_type, target_id);

-- Turn on Row Level Security
alter table public.reports enable row level security;

-- A user can only see their OWN reports (not a global feed — that's for the admin dashboard)
drop policy if exists "Users can view their own reports" on public.reports;
create policy "Users can view their own reports"
  on public.reports
  for select
  using (auth.uid() = reporter_id);

-- A logged-in user can file a report as themselves — never as someone else
drop policy if exists "Users can file reports as themselves" on public.reports;
create policy "Users can file reports as themselves"
  on public.reports
  for insert
  with check (auth.uid() = reporter_id);

-- ── Auto-flag trigger ────────────────────────────────────────────────────────────────────
-- When a listing or user profile crosses the report threshold, automatically flag it for
-- admin review so the moderation queue stays actionable without manual scanning.

-- The configurable thresholds
-- 3 reports within 30 days triggers an auto-flag
create or replace function public.auto_flag_on_report_threshold()
returns trigger
language plpgsql
-- SECURITY DEFINER so we can update listings/profiles regardless of the reporter's permissions
security definer
set search_path = public
as $$
declare
  -- How many reports are required to trigger an auto-flag
  v_threshold constant integer := 3;
  -- The time window to count reports in (30 days)
  v_window constant interval := interval '30 days';
  -- The count of recent reports against this target
  v_count integer;
begin
  -- Count reports for this exact (type, target) in the recent window
  select count(*) into v_count
  from public.reports
  where target_type = new.target_type
    and target_id = new.target_id
    -- Only count recent reports — old resolved ones shouldn't trigger a new flag
    and created_at >= now() - v_window
    -- Only count pending/reviewed reports — already-dismissed ones don't count
    and status in ('pending', 'reviewed');

  -- If the threshold is reached, flag the target
  if v_count >= v_threshold then

    -- Flag listing reports
    if new.target_type = 'listing' then
      update public.listings
      set
        status = 'flagged',
        flagged_reason = format('Auto-flagged: %s reports in 30 days (threshold=%s)', v_count, v_threshold)
      where id = new.target_id::uuid
        -- Only flag currently-active listings — don't touch already-sold/removed ones
        and status = 'active';

    -- Flag user reports
    elsif new.target_type = 'user' then
      -- Flag the user's profile with a note for the admin
      update public.profiles
      set is_verified_seller = false
      where id = new.target_id::uuid;
      -- Also flag ALL of this user's active listings to pull them from public feeds
      update public.listings
      set
        status = 'flagged',
        flagged_reason = format('Seller auto-flagged: %s user reports in 30 days', v_count)
      where seller_id = new.target_id::uuid
        and status = 'active';
    end if;

  end if;

  -- Triggers must return the new row
  return new;
end;
$$;

-- Remove any existing trigger of the same name (for idempotent re-runs)
drop trigger if exists on_report_inserted on public.reports;
-- Fire after each new report INSERT so the threshold check sees the new row included
create trigger on_report_inserted
  after insert on public.reports
  for each row
  execute function public.auto_flag_on_report_threshold();

-- ============================================================================================
-- FLAGGED KEYWORDS TABLE — chat safety word list
-- ============================================================================================

-- Create the flagged_keywords table if it doesn't already exist
create table if not exists public.flagged_keywords (
  -- A unique ID for this keyword entry
  id uuid primary key default gen_random_uuid(),
  -- The keyword or phrase to match (matched case-insensitively as a substring)
  keyword text not null unique,
  -- A human-readable category for grouping in the admin UI (e.g., "payment_scam", "phishing")
  category text not null default 'general',
  -- Whether this keyword is currently active — allows temporary disabling without deletion
  is_active boolean not null default true,
  -- When this keyword was added to the list
  created_at timestamptz not null default now()
);

-- Pre-populate the keyword list with the initial set of common scam phrases.
-- Using INSERT ... ON CONFLICT DO NOTHING so this is safe to re-run.
insert into public.flagged_keywords (keyword, category) values
  -- Payment scam patterns
  ('advance payment', 'payment_scam'),
  ('advance fee', 'payment_scam'),
  ('send money first', 'payment_scam'),
  ('western union', 'payment_scam'),
  ('moneygram', 'payment_scam'),
  ('gift card', 'payment_scam'),
  ('send gift card', 'payment_scam'),
  ('itunes card', 'payment_scam'),
  ('google play card', 'payment_scam'),
  -- Phishing / external platform diversion
  ('click this link', 'phishing'),
  ('click here to pay', 'phishing'),
  ('outside the app', 'phishing'),
  ('whatsapp me', 'phishing'),
  ('telegram me', 'phishing'),
  -- Too-good-to-be-true signals
  ('i am out of town', 'impersonation'),
  ('i am abroad', 'impersonation'),
  ('send your address', 'impersonation'),
  ('courier will deliver', 'impersonation')
on conflict (keyword) do nothing;

-- Only admins (service-role) should be able to add/remove keywords —
-- authenticated users can only READ the keyword list (for the client-side check)
alter table public.flagged_keywords enable row level security;

-- Allow all authenticated users to read the keyword list (needed by ChatPanel)
drop policy if exists "Keyword list is publicly readable" on public.flagged_keywords;
create policy "Keyword list is publicly readable"
  on public.flagged_keywords
  for select
  using (true);

-- ============================================================================================
-- ANOMALY LOG TABLE — records from the scheduled anomaly-detection cron job
-- ============================================================================================

-- Create the anomaly_log table if it doesn't already exist
create table if not exists public.anomaly_log (
  -- A unique ID for this anomaly record
  id uuid primary key default gen_random_uuid(),
  -- Which user triggered the anomaly
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Which listing was involved (null for user-level anomalies)
  listing_id uuid references public.listings (id) on delete set null,
  -- A short machine-readable category (e.g., "bulk_posting", "price_anomaly", "duplicate_description")
  anomaly_type text not null,
  -- A human-readable description of what was detected (shown in the admin queue)
  detail text not null,
  -- When this anomaly was detected by the cron job
  detected_at timestamptz not null default now()
);

-- Index by user_id so the admin dashboard can show "all anomalies for user X"
create index if not exists anomaly_log_user_id_idx on public.anomaly_log (user_id);
-- Index by detected_at so the admin queue can show most-recent-first
create index if not exists anomaly_log_detected_at_idx on public.anomaly_log (detected_at desc);

-- Only the service-role key (cron job) can insert into this table, and only the admin
-- dashboard (also service-role) can read it — no client-facing policies needed here
alter table public.anomaly_log enable row level security;
-- No RLS policies: only the service-role key (used by the cron job and admin) can access this table
