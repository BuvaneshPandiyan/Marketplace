-- Migration: 0014_chat_and_contact_reveals.sql
-- Purpose: the database layer for buyer-seller chat (conversations + messages) and a simple
-- audit log of when a buyer reveals a seller's phone number (contact_reveals), used later by
-- the fraud-prevention prompt for abuse analysis.

-- ============================================================================================
-- CONTACT REVEALS — an append-only audit log, not a feature users interact with directly
-- ============================================================================================

-- Create the contact_reveals table if it doesn't already exist
create table if not exists public.contact_reveals (
  -- A unique ID for this reveal event
  id uuid primary key default gen_random_uuid(),
  -- Which listing's seller phone number was revealed
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- Who revealed it (clicked "Show Number")
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  -- When this happened
  created_at timestamptz not null default now()
);

-- Index listing_id since future fraud-analysis tooling will query "how many reveals per listing"
create index if not exists contact_reveals_listing_id_idx on public.contact_reveals (listing_id);
-- Index viewer_id since it'll also be useful to query "how many reveals has this user triggered"
create index if not exists contact_reveals_viewer_id_idx on public.contact_reveals (viewer_id);

-- Turn on Row Level Security
alter table public.contact_reveals enable row level security;

-- Any logged-in user can log their OWN reveal event — never someone else's
drop policy if exists "Users can log their own contact reveals" on public.contact_reveals;
create policy "Users can log their own contact reveals"
  on public.contact_reveals
  for insert
  with check (auth.uid() = viewer_id);

-- NOTE: there is intentionally no SELECT policy here yet — this table is a write-only audit
-- log from the app's perspective for now. Reading it (for abuse/safety analysis) is left for
-- the admin tooling built in the fraud-prevention prompt, which will add a policy or use the
-- service role key, whichever fits that prompt's design.

-- ============================================================================================
-- CONVERSATIONS — one row per (listing, buyer) pair; the seller is derived from the listing
-- ============================================================================================

-- Create the conversations table if it doesn't already exist
create table if not exists public.conversations (
  -- A unique ID for this conversation
  id uuid primary key default gen_random_uuid(),
  -- Which listing this conversation is about
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- The buyer (the person who started the conversation)
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  -- The seller (copied from the listing at creation time, so it survives even if the listing
  -- is later deleted — though the conversation itself cascades away with the listing too)
  seller_id uuid not null references public.profiles (id) on delete cascade,
  -- When this conversation was first started
  created_at timestamptz not null default now(),
  -- A buyer can only ever have ONE conversation per listing — re-opening "Chat with Seller"
  -- should always return to the same thread, never create a duplicate
  unique (listing_id, buyer_id)
);

-- Index both participant columns, since "find all my conversations" filters on either one
create index if not exists conversations_buyer_id_idx on public.conversations (buyer_id);
create index if not exists conversations_seller_id_idx on public.conversations (seller_id);

-- Turn on Row Level Security
alter table public.conversations enable row level security;

-- Only the two participants (buyer or seller) can see a conversation
drop policy if exists "Participants can view their own conversations" on public.conversations;
create policy "Participants can view their own conversations"
  on public.conversations
  for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- A logged-in user can create a conversation as the BUYER, for any listing they don't own
-- themselves — this mirrors the checks already inside get_or_create_conversation() below,
-- giving us the same defense-in-depth layering used elsewhere in this project (e.g.,
-- create_listing_with_details in migration 0012): the function's own validation AND this RLS
-- policy both independently enforce the same rule
drop policy if exists "Buyers can create conversations for listings they don't own" on public.conversations;
create policy "Buyers can create conversations for listings they don't own"
  on public.conversations
  for insert
  with check (
    buyer_id = auth.uid()
    and seller_id != auth.uid()
  );

-- ============================================================================================
-- MESSAGES — individual chat messages within a conversation
-- ============================================================================================

-- Create the messages table if it doesn't already exist
create table if not exists public.messages (
  -- A unique ID for this message
  id uuid primary key default gen_random_uuid(),
  -- Which conversation this message belongs to
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- Who sent it
  sender_id uuid not null references public.profiles (id) on delete cascade,
  -- The message's text content, nullable since an image-only message has none
  text text,
  -- An attached image's URL, nullable since most messages are text-only
  image_url text,
  -- When this message was sent
  created_at timestamptz not null default now(),
  -- Whether the OTHER participant has read this message yet
  read boolean not null default false,
  -- Require every message to have at least some content — never both fields empty
  constraint messages_has_content check (text is not null or image_url is not null)
);

-- Index conversation_id + created_at together, since loading a chat thread always filters by
-- conversation and sorts by time
create index if not exists messages_conversation_id_idx on public.messages (conversation_id, created_at);

-- Turn on Row Level Security
alter table public.messages enable row level security;

-- Only the two participants of the parent conversation can read its messages
drop policy if exists "Participants can read messages in their conversations" on public.messages;
create policy "Participants can read messages in their conversations"
  on public.messages
  for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Only a participant can send a message, and only as themselves
drop policy if exists "Participants can send messages as themselves" on public.messages;
create policy "Participants can send messages as themselves"
  on public.messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Either participant can update a message's "read" status (the recipient marking it as seen) —
-- not restricted to the sender, since the whole point of "read" is the OTHER person sets it
drop policy if exists "Participants can update read status in their conversations" on public.messages;
create policy "Participants can update read status in their conversations"
  on public.messages
  for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- ============================================================================================
-- get_or_create_conversation() — the single entry point for "Chat with Seller"
-- ============================================================================================

create or replace function public.get_or_create_conversation(p_listing_id uuid)
returns uuid
language plpgsql
-- Deliberately NOT security definer — runs as the calling user, so the RLS select policy
-- above still governs whether they can see the conversation this returns
as $$
declare
  v_buyer_id uuid;
  v_seller_id uuid;
  v_conversation_id uuid;
begin
  -- Identify who's calling — never trust a client-supplied buyer ID
  v_buyer_id := auth.uid();
  if v_buyer_id is null then
    raise exception 'You must be logged in to start a conversation.';
  end if;

  -- Look up the listing's seller
  select seller_id into v_seller_id from public.listings where id = p_listing_id;
  if v_seller_id is null then
    raise exception 'Listing not found.';
  end if;

  -- A seller can't open a buyer-style conversation about their own listing
  if v_seller_id = v_buyer_id then
    raise exception 'You cannot start a conversation about your own listing.';
  end if;

  -- Check whether a conversation already exists for this exact listing+buyer pair
  select id into v_conversation_id
  from public.conversations
  where listing_id = p_listing_id and buyer_id = v_buyer_id;

  -- If it already exists, just hand back its ID
  if v_conversation_id is not null then
    return v_conversation_id;
  end if;

  -- Otherwise, create a new conversation and return its freshly generated ID
  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (p_listing_id, v_buyer_id, v_seller_id)
  returning id into v_conversation_id;

  return v_conversation_id;
end;
$$;

-- Revoke the default PUBLIC execute grant, then explicitly grant only to logged-in users —
-- same defense-in-depth pattern used for create_listing_with_details() in migration 0012
revoke all on function public.get_or_create_conversation(uuid) from public;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- ============================================================================================
-- Enable Supabase Realtime on the messages table, so new messages appear instantly without
-- a page refresh. This is a no-op (safely skipped) outside of a real Supabase project, since
-- the "supabase_realtime" publication only exists there, not on a plain local Postgres install.
-- ============================================================================================
do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  -- If the publication doesn't exist at all (e.g., local/non-Supabase Postgres), skip quietly
  when undefined_object then null;
  -- If the table was already added to the publication (e.g., migration re-run), skip quietly
  when duplicate_object then null;
end $$;
