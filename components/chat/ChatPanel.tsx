// Mark this as a Client Component since it manages real-time subscriptions and form state
"use client";

// Import React's hooks
import { useCallback, useEffect, useRef, useState } from "react";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";
// Import our shared types
import type { Message, Conversation, Profile } from "@/types";
// Import the rating prompt modal
import { RatingPrompt } from "@/components/chat/RatingPrompt";
// Import the keyword safety warning banner
import { SafetyWarningBanner } from "@/components/trust/SafetyWarningBanner";
// Import the push-permission hook so we can ask contextually after the first send
import { usePushNotifications } from "@/lib/client/usePushNotifications";

// Define the extended conversation shape this panel receives from its parent server component —
// the base Conversation type plus two extra fields the server joined in for us
type EnrichedConversation = Conversation & {
  // The listing's title, shown in the panel header
  listing_title: string;
  // The listing's current status, used to decide whether to show the rating prompt
  listing_status: string;
};

// Define the props this component accepts
type ChatPanelProps = {
  // The conversation (with the two extra joined fields above)
  conversation: EnrichedConversation;
  // The currently logged-in user's ID
  currentUserId: string;
  // The profile of the OTHER participant (the person we're chatting with)
  otherUserProfile: Profile | null;
};

// Define and export the ChatPanel component
export function ChatPanel({ conversation, currentUserId, otherUserProfile }: ChatPanelProps) {
  // Create one browser Supabase client instance for this component's lifetime
  const [supabase] = useState(() => createClient());
  // All messages loaded so far, in chronological order
  const [messages, setMessages] = useState<Message[]>([]);
  // The text currently being typed in the input field
  const [inputText, setInputText] = useState("");
  // True while a text message send is in flight
  const [isSending, setIsSending] = useState(false);
  // True while an image is being uploaded to Storage
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  // Whether the post-sale rating prompt is currently visible
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  // The list of flagged keywords fetched from Supabase (used for chat safety monitoring)
  const [flaggedKeywords, setFlaggedKeywords] = useState<string[]>([]);
  // The keyword that triggered the current safety warning banner (null = no banner shown)
  const [warningKeyword, setWarningKeyword] = useState<string | null>(null);
  // Whether push permission has already been requested in this session — we only ask once
  const hasPushedRef = useRef(false);
  // A ref to the invisible file input, so we can trigger it from the "📎 Photo" button
  const fileInputRef = useRef<HTMLInputElement>(null);
  // A ref to the invisible bottom-anchor div, used as the auto-scroll target
  const bottomRef = useRef<HTMLDivElement>(null);
  // Get the push-permission requester from our hook — called after the first message sent
  const { requestPushPermission } = usePushNotifications();

  // Track listing status client-side so the sold banner and composer lock update in real time
  // even if the page was loaded before the seller marked the item as sold.
  const [listingStatus, setListingStatus] = useState(conversation.listing_status);
  const isSold = listingStatus === "sold";

  // Fetch the current listing status via the conversations join — the buyer always has
  // SELECT on their own conversation row, so this bypasses any listings RLS that might
  // restrict sold listings from being queried directly.
  useEffect(() => {
    supabase
      .from("conversations")
      .select("listings(status)")
      .eq("id", conversation.id)
      .single()
      .then(({ data }) => {
        const status = (data?.listings as unknown as { status: string } | null)?.status;
        if (status && status !== listingStatus) setListingStatus(status);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  // ── Mark messages as read ──────────────────────────────────────────────────────────────────
  // Defined with useCallback so it can safely be listed as a useEffect dependency below
  const markMessagesAsRead = useCallback(async () => {
    // Only mark messages sent by the OTHER person — we don't mark our own messages as "read"
    if (!otherUserProfile) return;
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversation.id)
      .eq("sender_id", otherUserProfile.id)
      .eq("read", false);
  }, [supabase, conversation.id, otherUserProfile]);

  // ── Initial load + Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    // Fetch the full message history, oldest first
    async function loadMessages() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });
      const msgs = (data as (Message & { message_type?: string })[]) ?? [];
      setMessages(msgs);
      // If the history already contains a system message the listing was marked sold before
      // this session — disable the composer immediately without waiting for a Realtime event.
      const alreadySold = msgs.some((m) => m.message_type === "system");
      if (alreadySold) setListingStatus("sold");
      await markMessagesAsRead();
    }
    loadMessages();

    // Also fetch the active flagged keywords so we can monitor outgoing messages client-side
    async function loadKeywords() {
      const { data } = await supabase
        .from("flagged_keywords")
        .select("keyword")
        // Only load active keywords — disabled ones are excluded
        .eq("is_active", true);
      // Store just the keyword strings (not the full rows)
      setFlaggedKeywords((data ?? []).map((row: { keyword: string }) => row.keyword));
    }
    loadKeywords();

    // Subscribe to new INSERTs on the messages table, scoped to this conversation only
    const channel = supabase
      .channel(`messages-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          // Meilisearch-style filter: only fire for this conversation's rows
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          // Append the incoming message to the list
          const incoming = payload.new as Message & { message_type?: string };
          setMessages((prev) => [...prev, incoming]);
          // If it's a system message (e.g. "marked as sold"), disable the composer immediately
          if (incoming.message_type === "system") {
            setListingStatus("sold");
          }
          // If it came from the other person, immediately mark it read
          if (incoming.sender_id !== currentUserId) markMessagesAsRead();
        }
      )
      .subscribe();

    // Tear down the subscription when the component unmounts or the conversation changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversation.id, currentUserId, markMessagesAsRead]);

  // ── Auto-scroll to bottom on every new message ────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Rating prompt check ───────────────────────────────────────────────────────────────────
  // Run once after messages load: if the listing is sold and this user hasn't rated yet, show it
  useEffect(() => {
    // Nothing to do if the listing isn't sold
    if (conversation.listing_status !== "sold") return;
    async function checkForExistingRating() {
      // Look for an existing rating row from this user for this listing
      const { data } = await supabase
        .from("ratings")
        .select("id")
        .eq("listing_id", conversation.listing_id)
        .eq("rater_id", currentUserId)
        .maybeSingle();
      // No row found → they haven't rated yet → show the prompt
      if (!data) setShowRatingPrompt(true);
    }
    checkForExistingRating();
  }, [supabase, conversation.listing_id, conversation.listing_status, currentUserId]);

  // ── Send a text message ────────────────────────────────────────────────────────────────────
  async function handleSendText() {
    // Hard guard — never send if the listing is sold, regardless of UI state
    if (isSold) return;
    if (!inputText.trim()) return;

    // ── Keyword check ───────────────────────────────────────────────────────────────────────
    // Check the outgoing message against every flagged keyword (case-insensitive substring match)
    const lowerInput = inputText.toLowerCase();
    const matchedWord = flaggedKeywords.find((kw) => lowerInput.includes(kw.toLowerCase()));
    if (matchedWord) {
      // Show the non-blocking safety banner for this match
      setWarningKeyword(matchedWord);
      // Note: we intentionally DO NOT return here — the message is still sent.
      // The warning is informational, not a blocker. Blocking legitimate messages
      // based on keyword heuristics would cause too many false positives.
    }

    setIsSending(true);
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: currentUserId,
      text: inputText.trim(),
    });
    // Notify the other participant (in-app + push) — fire-and-forget, doesn't block the UI
    fetch("/api/notifications/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: conversation.id }),
    }).catch(() => {}); // swallow errors — a missed notification is never worth breaking chat
    // Clear the input field after a successful send
    setInputText("");
    setIsSending(false);
    // If this is the first message the user has sent in this session, ask for push permission
    // now — we ask contextually here rather than on page load so it feels natural, not jarring
    if (!hasPushedRef.current) {
      hasPushedRef.current = true;
      // Don't await — fire and forget so it doesn't delay anything
      requestPushPermission();
    }
  }

  // ── Upload a chat image and send it as a message ──────────────────────────────────────────
  async function handleImageUpload(file: File) {
    setIsUploadingImage(true);
    // Store under the sender's own folder — matches the storage RLS policy in migration 0015
    const path = `${currentUserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { error: uploadError } = await supabase.storage.from("chat-images").upload(path, file);
    setIsUploadingImage(false);
    // If the upload failed, bail silently — don't leave a dangling message row
    if (uploadError) return;
    // Retrieve the public URL of the now-stored image
    const { data: urlData } = supabase.storage.from("chat-images").getPublicUrl(path);
    // Send an image-only message (no text content)
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: currentUserId,
      image_url: urlData.publicUrl,
    });
  }

  // ── Share a meet-up point via the browser Geolocation API ─────────────────────────────────
  function handleShareLocation() {
    navigator.geolocation.getCurrentPosition((pos) => {
      // Build a Google Maps link from the current coordinates
      const link = `https://maps.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
      // Send it as a regular text message so it renders as a clickable link in the thread
      supabase.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: currentUserId,
        // Include an emoji so it's visually distinctive in the message list
        text: `📍 Meet-up point: ${link}`,
      });
    });
  }

  return (
    // A full-height flex column, relative so the rating overlay can be positioned inside it
    <div className="relative flex h-full flex-col">

      {/* Rating prompt overlay — covers the whole panel when shown */}
      {showRatingPrompt && otherUserProfile && (
        <RatingPrompt
          listingId={conversation.listing_id}
          raterId={currentUserId}
          ratedUserId={otherUserProfile.id}
          ratedUserName={otherUserProfile.name}
          onDismiss={() => setShowRatingPrompt(false)}
        />
      )}

      {/* ── Header ── */}
      <div className="shrink-0 border-b border-neutral-200 px-4 py-3">
        {/* The listing this conversation is about */}
        <p className="truncate text-sm font-semibold text-neutral-900">{conversation.listing_title}</p>
        {/* Who we're talking to */}
        <p className="text-xs text-neutral-500">
          with {otherUserProfile?.name ?? "the other party"}
        </p>
      </div>

      {/* Safety warning banner — shown non-blocking when a message matches a flagged keyword */}
      {warningKeyword && (
        <SafetyWarningBanner matchedKeyword={warningKeyword} />
      )}

      {/* ── Sold banner ── */}
      {isSold && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
          <p className="flex items-center gap-2 text-xs font-medium text-amber-800">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
            </svg>
            This item has been sold and is no longer available.
          </p>
        </div>
      )}

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto space-y-3 px-4 py-3">
        {messages.map((msg) => {
          // System messages (e.g. "marked as sold") render as a centered pill, no avatar/bubble
          const isSystem = (msg as Message & { message_type?: string }).message_type === "system";
          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center py-1">
                <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-500">
                  {msg.text}
                </span>
              </div>
            );
          }
          // Is this message one we sent ourselves?
          const isOwn = msg.sender_id === currentUserId;
          return (
            // Align own messages to the right, incoming to the left
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
              {/* The bubble */}
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isOwn ? "bg-orange-600 text-white" : "bg-neutral-100 text-neutral-900"
                }`}
              >
                {/* Show the attached image if there is one */}
                {msg.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded chat image, not a Next.js static asset
                  <img src={msg.image_url} alt="Shared image" className="mb-1 max-w-full rounded-lg" />
                )}
                {/* Show the message text if there is any */}
                {msg.text && <p className="break-words">{msg.text}</p>}
                {/* Read receipt: only on own messages, ✓✓ once read, ✓ while unread */}
                {isOwn && (
                  <p className="mt-0.5 text-right text-[10px] text-white/60">
                    {msg.read ? "✓✓" : "✓"}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {/* Invisible anchor element — scrollIntoView() targets this to jump to the bottom */}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area — replaced by a muted notice when listing is sold ── */}
      {isSold ? (
        <div className="shrink-0 border-t border-neutral-200 bg-neutral-50 px-4 py-3 text-center">
          <p className="text-xs text-neutral-500">Messaging is disabled for sold listings.</p>
        </div>
      ) : (
      <div className="shrink-0 border-t border-neutral-200 px-3 py-2">
        {/* Quick-action row above the text input */}
        <div className="mb-2 flex gap-3">
          {/* Photo attachment button — opens the hidden file input */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            className="text-xs text-neutral-500 hover:text-orange-600 disabled:opacity-50"
          >
            {isUploadingImage ? "Uploading…" : "📎 Photo"}
          </button>
          {/* Share-location button — sends a Google Maps link of the current position */}
          <button
            type="button"
            onClick={handleShareLocation}
            className="text-xs text-neutral-500 hover:text-orange-600"
          >
            📍 Location
          </button>
        </div>

        {/* Hidden file input triggered by the "📎 Photo" button above */}
        <input
          ref={fileInputRef}
          type="file"
          // Accept any image type — this is chat, not listing photos, so any file is fine
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            // Reset so the same file can be selected again later
            e.target.value = "";
          }}
        />

        {/* Text input + send button row */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              // Send on Enter — Shift+Enter would insert a newline if this were a textarea
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendText();
              }
            }}
            placeholder="Type a message…"
            className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none"
          />
          {/* Send button — disabled when the input is empty or a send is in flight */}
          <button
            type="button"
            onClick={handleSendText}
            disabled={isSending || !inputText.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
          >
            ↑
          </button>
        </div>
      </div>
      )}
    </div>
  );
}