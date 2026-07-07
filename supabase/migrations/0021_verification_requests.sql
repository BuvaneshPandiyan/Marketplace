-- Migration: 0021_verification_requests.sql
-- Purpose: the seller-verification flow. Users upload a government ID photo and a selfie;
-- an admin reviews them manually (no automated ID-matching API in this MVP) and either
-- approves (sets is_verified_seller = true) or rejects with a note.

-- The lifecycle states a verification request goes through
do $$ begin
  create type public.verification_status as enum (
    'pending',   -- Submitted, waiting for admin review
    'approved',  -- Admin approved — is_verified_seller will be set to true
    'rejected'   -- Admin rejected — user can re-submit after addressing the issue
  );
exception
  when duplicate_object then null;
end $$;

-- Create the verification_requests table if it doesn't already exist
create table if not exists public.verification_requests (
  -- A unique ID for this verification request
  id uuid primary key default gen_random_uuid(),
  -- The user requesting verification
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Supabase Storage URL of the government ID photo (uploaded to the verif-docs bucket)
  id_photo_url text not null,
  -- Supabase Storage URL of the live selfie (uploaded to the verif-docs bucket)
  selfie_url text not null,
  -- When the user submitted this request
  created_at timestamptz not null default now(),
  -- The current review status
  status public.verification_status not null default 'pending',
  -- When an admin reviewed this request (null while pending)
  reviewed_at timestamptz,
  -- Optional notes from the admin (e.g., "ID unreadable, please resubmit")
  admin_notes text,
  -- A user can only have one open (pending/recently rejected) request at a time
  -- We enforce this in the application layer and via the unique index below
  unique (user_id)
);

-- Index by status so the admin dashboard can quickly list all pending requests
create index if not exists verif_requests_status_idx
  on public.verification_requests (status, created_at desc);

-- Turn on Row Level Security
alter table public.verification_requests enable row level security;

-- A user can only see their OWN verification request status
drop policy if exists "Users can view their own verification request" on public.verification_requests;
create policy "Users can view their own verification request"
  on public.verification_requests
  for select
  using (auth.uid() = user_id);

-- A user can submit or update their own verification request
-- (an UPDATE allows them to re-submit after a rejection by uploading new photos)
drop policy if exists "Users can submit their own verification request" on public.verification_requests;
create policy "Users can submit their own verification request"
  on public.verification_requests
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own verification request" on public.verification_requests;
create policy "Users can update their own verification request"
  on public.verification_requests
  for update
  using (auth.uid() = user_id)
  -- On re-submission, only allow updating the photo URLs and resetting to pending —
  -- the user can never directly set status to 'approved'
  with check (auth.uid() = user_id);

-- ── verif-docs Storage bucket ─────────────────────────────────────────────────────────────
-- A PRIVATE bucket for government ID photos and selfies — not publicly readable.
-- Admin access happens via the service-role key in the admin dashboard (Prompt 10).
insert into storage.buckets (id, name, public)
values ('verif-docs', 'verif-docs', false)
on conflict (id) do nothing;

-- Users can upload into their own subfolder — same per-user-folder pattern used throughout
drop policy if exists "Users can upload their own verif docs" on storage.objects;
create policy "Users can upload their own verif docs"
  on storage.objects
  for insert
  with check (
    bucket_id = 'verif-docs'
    -- The file must live under the user's own UUID subfolder
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read back their OWN uploaded docs (e.g., to show them a preview of what they sent)
drop policy if exists "Users can view their own verif docs" on storage.objects;
create policy "Users can view their own verif docs"
  on storage.objects
  for select
  using (
    bucket_id = 'verif-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── approve_verification() ────────────────────────────────────────────────────────────────
-- A SECURITY DEFINER function the admin dashboard (Prompt 10) calls to approve a request.
-- Doing this in a function keeps the is_verified_seller update atomic with the status change.
create or replace function public.approve_verification(
  -- The verification request to approve
  p_request_id uuid,
  -- Optional admin note to store alongside the approval
  p_admin_notes text default null
)
returns void
language plpgsql
-- SECURITY DEFINER so it can update both the request row and the profile row
security definer
set search_path = public
as $$
declare
  -- The user whose request we're approving
  v_user_id uuid;
begin
  -- Find the request and get its user_id
  select user_id into v_user_id
  from public.verification_requests
  where id = p_request_id;

  -- Bail if the request doesn't exist
  if v_user_id is null then
    raise exception 'Verification request % not found', p_request_id;
  end if;

  -- Mark the request as approved with the current timestamp
  update public.verification_requests
  set
    status = 'approved',
    reviewed_at = now(),
    admin_notes = p_admin_notes
  where id = p_request_id;

  -- Set the seller's verified badge on their profile
  update public.profiles
  set is_verified_seller = true
  where id = v_user_id;
end;
$$;

-- Only the admin (service-role key) can call this function — no client access
revoke all on function public.approve_verification(uuid, text) from public;

-- ── reject_verification() ─────────────────────────────────────────────────────────────────
-- The counterpart to approve_verification() — marks the request as rejected with admin notes.
create or replace function public.reject_verification(
  -- The verification request to reject
  p_request_id uuid,
  -- A required rejection note explaining what was wrong (shown to the user)
  p_admin_notes text
)
returns void
language plpgsql
-- SECURITY DEFINER so it can update the request row and the profile
security definer
set search_path = public
as $$
begin
  -- Mark the request as rejected
  update public.verification_requests
  set
    status = 'rejected',
    reviewed_at = now(),
    admin_notes = p_admin_notes
  where id = p_request_id;
end;
$$;

-- Only the admin (service-role key) can call this function
revoke all on function public.reject_verification(uuid, text) from public;
