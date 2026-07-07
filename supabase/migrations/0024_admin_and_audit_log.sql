-- Migration: 0024_admin_and_audit_log.sql
-- Purpose: the admin-role infrastructure. Adds admin/suspension flags to profiles,
-- creates an append-only audit log every admin action must write to, and provides
-- a server-side guard function that other functions can call to assert admin access.

-- ── Profiles: admin and suspension flags ─────────────────────────────────────────────────

-- Whether this user has admin (moderator) privileges — false by default for all new accounts
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Whether this user's account has been suspended by a moderator
-- Suspended users can still log in but cannot post listings or send messages
alter table public.profiles
  add column if not exists is_suspended boolean not null default false;

-- Index is_admin so the admin user-list query (filter by is_admin = true) is fast
create index if not exists profiles_is_admin_idx on public.profiles (is_admin)
  where is_admin = true; -- partial index: only the tiny set of admin accounts matters

-- ── audit_log table ───────────────────────────────────────────────────────────────────────
-- An append-only record of every action a moderator takes. Used for accountability and
-- future audits. No UPDATE or DELETE policies — rows are permanent once written.

-- Create the audit_log table
create table if not exists public.audit_log (
  -- Unique ID for this log entry
  id uuid primary key default gen_random_uuid(),
  -- Which admin performed this action
  admin_id uuid not null references public.profiles (id) on delete cascade,
  -- A short machine-readable verb describing what was done, e.g., "approve_listing",
  -- "remove_listing", "ban_user", "verify_seller", "resolve_report", "dismiss_report"
  action text not null,
  -- What kind of entity was acted on
  target_type text not null, -- e.g., "listing", "user", "report", "verification_request"
  -- The ID of the entity acted on (stored as text for flexibility across entity types)
  target_id text not null,
  -- Optional free-text notes the admin can attach (e.g., reason for removal)
  notes text,
  -- When this action was taken
  created_at timestamptz not null default now()
);

-- Index admin_id so "show me all actions by admin X" queries are fast
create index if not exists audit_log_admin_id_idx on public.audit_log (admin_id);
-- Index created_at for "show most recent actions" queries
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
-- Index target to support "show all actions against listing/user Y" queries
create index if not exists audit_log_target_idx on public.audit_log (target_type, target_id);

-- Turn on Row Level Security — no client reads or writes
alter table public.audit_log enable row level security;
-- NOTE: no RLS policies — only the service-role key (admin dashboard) accesses this table.

-- ── is_current_user_admin() helper ───────────────────────────────────────────────────────
-- A STABLE function that checks whether the currently authenticated user has is_admin = true.
-- Used by other database functions for defense-in-depth checks.
create or replace function public.is_current_user_admin()
returns boolean
language sql
-- SECURITY DEFINER so it can read profiles.is_admin regardless of RLS
security definer
set search_path = public
stable -- Result doesn't change within a transaction, so Postgres can cache it
as $$
  -- Return true if the calling user's profile has is_admin = true, false otherwise
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Allow all authenticated users to call this function — it only reveals their OWN admin status
revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

-- ── suspend_user() admin action function ──────────────────────────────────────────────────
-- Sets is_suspended = true on the target profile and writes an audit log entry.
-- Only callable by the service-role key (used from admin API routes).
create or replace function public.suspend_user(
  -- The user to suspend
  p_target_user_id uuid,
  -- The admin performing the action (passed explicitly since the service-role key
  -- doesn't have an auth.uid() — it's not an authenticated session)
  p_admin_id uuid,
  -- Optional notes to store in the audit log
  p_notes text default null
)
returns void
language plpgsql
-- SECURITY DEFINER so this can update profiles and audit_log regardless of RLS
security definer
set search_path = public
as $$
begin
  -- Mark the user's profile as suspended — they can still log in but are blocked from actions
  update public.profiles
  set is_suspended = true
  where id = p_target_user_id;

  -- Flag all of the suspended user's active listings so they're pulled from public feeds
  update public.listings
  set
    status = 'flagged',
    flagged_reason = 'Seller account suspended by admin'
  where seller_id = p_target_user_id
    and status = 'active';

  -- Write an immutable audit log entry
  insert into public.audit_log (admin_id, action, target_type, target_id, notes)
  values (p_admin_id, 'suspend_user', 'user', p_target_user_id::text, p_notes);
end;
$$;

-- Only the service-role key (admin API routes) calls this — revoke from everyone else
revoke all on function public.suspend_user(uuid, uuid, text) from public;

-- ── unsuspend_user() admin action function ────────────────────────────────────────────────
-- Reverses a suspension (admin can undo mistakes) and logs the action.
create or replace function public.unsuspend_user(
  p_target_user_id uuid,
  p_admin_id uuid,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Clear the suspended flag
  update public.profiles
  set is_suspended = false
  where id = p_target_user_id;

  -- Write the audit log entry
  insert into public.audit_log (admin_id, action, target_type, target_id, notes)
  values (p_admin_id, 'unsuspend_user', 'user', p_target_user_id::text, p_notes);
end;
$$;

revoke all on function public.unsuspend_user(uuid, uuid, text) from public;
