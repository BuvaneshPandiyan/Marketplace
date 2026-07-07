-- Migration: 0002_otp_rate_limit.sql
-- Purpose: track OTP send requests per phone number so we can block abuse
-- (e.g., a bot hammering the "send OTP" button to rack up SMS costs on us).

-- Create a table that logs every OTP send attempt
create table if not exists public.otp_requests (
  -- A unique ID for each logged request
  id bigint generated always as identity primary key,
  -- The phone number the OTP was requested for, in E.164 format (e.g., +919876543210)
  phone text not null,
  -- The timestamp this request was made, used to count requests within a time window
  requested_at timestamptz not null default now()
);

-- Index the phone + requested_at columns together since every query filters by both
create index if not exists otp_requests_phone_time_idx
  on public.otp_requests (phone, requested_at);

-- Turn on Row Level Security — we'll deliberately add NO policies, so only the
-- service role (used exclusively from our server-side API route) can touch this table
alter table public.otp_requests enable row level security;

-- Define a function that atomically checks the rate limit AND logs the new request,
-- so two simultaneous requests can't both slip through a "check, then insert" race condition
create or replace function public.check_and_log_otp_request(p_phone text)
-- Returns true if this request is ALLOWED (under the limit), false if it should be BLOCKED
returns boolean
language plpgsql
-- Runs with elevated privileges since it needs to read/write a table with no public policies
security definer
set search_path = public
as $$
declare
  -- A variable to hold how many requests this phone number has made recently
  recent_count integer;
begin
  -- Lock this phone number's rows for the duration of the transaction to prevent race conditions
  -- (advisory lock keyed on a hash of the phone number, released automatically at transaction end)
  perform pg_advisory_xact_lock(hashtext(p_phone));

  -- Count how many requests this phone number has made in the last 10 minutes
  select count(*) into recent_count
  from public.otp_requests
  where phone = p_phone
    and requested_at > now() - interval '10 minutes';

  -- If they've already hit the limit, block this request without logging a new attempt
  if recent_count >= 3 then
    return false;
  end if;

  -- Otherwise, log this new attempt and allow it through
  insert into public.otp_requests (phone) values (p_phone);
  return true;
end;
$$;
