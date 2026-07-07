-- Migration: 0025_admin_stats_function.sql
-- Purpose: a single function the analytics dashboard calls to get all key platform metrics
-- in one round-trip, rather than making 5+ separate count queries from the API route.

create or replace function public.get_admin_stats()
-- Returns a single row with all the stat columns the analytics dashboard needs
returns table(
  -- Total registered user profiles (not auth.users rows — profiles are created on first login)
  total_users bigint,
  -- Total listings that are currently live and searchable
  total_active_listings bigint,
  -- Listings whose created_at falls within today (UTC)
  listings_today bigint,
  -- Listings currently in the 'flagged' state waiting for admin review
  flagged_listings_pending bigint,
  -- Reports with status = 'pending' (not yet reviewed by a moderator)
  reports_pending bigint,
  -- Verification requests with status = 'pending'
  verifications_pending bigint,
  -- Total anomaly_log entries detected across all time (indicator of fraud-detection activity)
  total_anomalies bigint
)
language sql
-- SECURITY DEFINER so this bypasses RLS and can count across all users/listings
security definer
set search_path = public
-- STABLE because the counts don't change mid-transaction
stable
as $$
  -- Run all seven counts in a single SELECT using subquery aggregation
  select
    -- Count of all profile rows (one per registered user)
    (select count(*) from public.profiles)                                   as total_users,
    -- Count of listings that are currently visible to buyers
    (select count(*) from public.listings where status = 'active')           as total_active_listings,
    -- Count of listings created on today's date (UTC midnight to now)
    (select count(*) from public.listings
     where created_at >= current_date and created_at < current_date + 1)     as listings_today,
    -- Count of listings sitting in the moderation queue
    (select count(*) from public.listings where status = 'flagged')          as flagged_listings_pending,
    -- Count of reports waiting for a moderator to look at
    (select count(*) from public.reports where status = 'pending')           as reports_pending,
    -- Count of seller-verification requests waiting for manual ID review
    (select count(*) from public.verification_requests where status = 'pending') as verifications_pending,
    -- Count of total anomaly-detection log entries (useful to watch trend over time)
    (select count(*) from public.anomaly_log)                                as total_anomalies;
$$;

-- Only the service-role key (admin dashboard API routes) calls this function
revoke all on function public.get_admin_stats() from public;
