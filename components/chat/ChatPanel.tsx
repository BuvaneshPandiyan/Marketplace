// Mark this as a Client Component since it manages real-time subscriptions and form state
"use client";

// Import React's hooks
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ReportButton } from "@/components/trust/ReportButton";
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
  conversation: EnrichedConversation;
  currentUserId: string;
  otherUserId: string;
  otherUserProfile: Profile | null;
  reportTarget: { targetType: "user" | "listing" | "message"; targetId: string };
};

export function ChatPanel({ conversation, currentUserId, otherUserId, otherUserProfile, reportTarget }: ChatPanelProps) {
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

  // Background images (banner + centre watermark) with graceful fallback if missing.
  const [bannerImgFailed, setBannerImgFailed] = useState(false);
  const [centerImgFailed, setCenterImgFailed] = useState(false);

  // A soft two-note "pop" chime for incoming messages — generated with the Web
  // Audio API so no audio file is needed. Guarded so autoplay policies don't throw.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playNotifySound = useCallback(() => {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = audioCtxRef.current ?? (audioCtxRef.current = new AC());
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;
      [ [880, 0], [1320, 0.09] ].forEach(([freq, offset]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gain); gain.connect(ctx.destination);
        const t = now + offset;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.start(t); osc.stop(t + 0.2);
      });
    } catch { /* ignore — sound is a nice-to-have */ }
  }, []);
  // Lightbox — null when closed, image URL string when open
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxMounted, setLightboxMounted] = useState(false);
  useEffect(() => { setLightboxMounted(true); }, []);

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
    /**
     * Mark everything in this conversation that ISN'T mine as read.
     *
     * This used to filter on `sender_id = otherUserProfile.id`, which quietly
     * excluded system messages — the "This item has been marked as sold by the
     * seller" rows. Those aren't sent by the other person, so they never matched,
     * never got marked, and the unread badge sat at 1 forever no matter how many
     * times you opened the chat.
     *
     * The rule now mirrors ChatsPopover's counter exactly:
     *     counter:  !msg.read && msg.sender_id !== authUser.id
     *     marker:   read = false AND sender_id != me
     * If those two ever disagree again, a badge becomes unclearable — they have
     * to be read as a pair.
     *
     * The `is.null` arm matters: SQL `sender_id != <uuid>` is NULL (not true) for
     * a NULL sender, so a system message with no sender would slip through the
     * neq and stay unread — while the JS counter, where `null !== uuid` is plain
     * true, would keep counting it. Same disagreement, different disguise.
     */
    if (!currentUserId) return;
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("conversation_id", conversation.id)
      .eq("read", false)
      .or(`sender_id.neq.${currentUserId},sender_id.is.null`);
  }, [supabase, conversation.id, currentUserId]);

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
          // If it came from the other person, mark it read + play a soft chime
          if (incoming.sender_id !== currentUserId) {
            markMessagesAsRead();
            playNotifySound();
          }
        }
      )
      .subscribe();

    // Tear down the subscription when the component unmounts or the conversation changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversation.id, currentUserId, markMessagesAsRead, playNotifySound]);

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
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  function handleShareLocation() {
    if (!navigator.geolocation) { alert("Location not supported on this device."); return; }
    setIsSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const link = `https://maps.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        supabase.from("messages").insert({
          conversation_id: conversation.id,
          sender_id: currentUserId,
          text: `📍 My location: ${link}`,
        }).then(() => setIsSharingLocation(false));
      },
      (err) => {
        setIsSharingLocation(false);
        if (err.code === 1) alert("Location permission denied. Please allow location access in your browser settings.");
        else alert("Could not get your location. Please try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <>
      <style>{`
        /* ── Chat pill composer (petrol + copper) ── */
        .chat-pill {
          flex: 1; display: flex; align-items: center; gap: 2px;
          background: #f1f4f5; border: 1.5px solid #e2e8ea; border-radius: 100px;
          padding: 4px 6px 4px 8px; min-width: 0;
          transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;
        }
        .chat-pill:focus-within {
          border-color: #1a6b7a; background: #fff;
          box-shadow: 0 0 0 4px rgba(26,107,122,0.12);
        }
        .chat-pill-ic {
          flex-shrink: 0; width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: none; border: none; cursor: pointer; color: #8a9aa0;
          transition: color 160ms ease, background 160ms ease, transform 160ms ease;
        }
        .chat-pill-ic:hover { color: #0e3d47; background: rgba(26,107,122,0.1); }
        .chat-pill-ic:active { transform: scale(0.9); }
        .chat-pill-ic:disabled { opacity: 0.55; cursor: default; }
        .chat-pill-input {
          flex: 1; min-width: 0; border: none; background: none; outline: none;
          padding: 8px 10px; font-size: 14.5px; color: #0f2229; font-weight: 500;
        }
        .chat-pill-input::placeholder { color: #9fb0b5; font-weight: 500; }
        .chat-send {
          flex-shrink: 0; width: 46px; height: 46px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: none; cursor: pointer; color: #fff; background: #cbd5d8;
          transition: background 200ms ease, box-shadow 200ms ease, transform 180ms cubic-bezier(0.34,1.56,0.64,1);
        }
        .chat-send.is-active {
          background: linear-gradient(135deg, #a5622c, #d99058);
          box-shadow: 0 6px 20px rgba(184,115,51,0.4);
        }
        .chat-send.is-active:hover { transform: scale(1.09) rotate(-6deg); }
        .chat-send.is-active:active { transform: scale(0.94); }
        .chat-send:disabled { cursor: default; }
        .chat-spin {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(26,107,122,0.3); border-top-color: #1a6b7a;
          animation: chat-spin 0.7s linear infinite; display: inline-block;
        }
        @keyframes chat-spin { to { transform: rotate(360deg); } }

        /* On mobile the floating bottom nav pill overlaps the composer — lift the
           composer above it so the send button and pill are never covered. */
        @media(max-width:639px){
          .chat-input-wrap { padding-bottom: calc(20px + env(safe-area-inset-bottom)) !important; }
        }

        /* Message bubbles animate in as they arrive (auto, no interaction) */
        .chat-msg-row { animation: chat-msg-in 340ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes chat-msg-in { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
        .chat-bubble { transition: transform 180ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 180ms ease; }
        .chat-bubble:hover { transform: translateY(-2px); }

        /* Header avatar online-dot gentle pulse */
        .chat-online-dot { animation: chat-pulse 2.4s ease-in-out infinite; }
        @keyframes chat-pulse { 0%,100%{ box-shadow: 0 0 0 0 rgba(34,197,94,0.5); } 50%{ box-shadow: 0 0 0 4px rgba(34,197,94,0); } }
        /* Item chip subtle hover */
        .chat-item-chip { transition: background 180ms ease, transform 180ms ease; }
        .chat-item-chip:hover { background: rgba(216,144,88,0.3) !important; transform: translateY(-1px); }

        @media(prefers-reduced-motion:reduce){
          .chat-send.is-active:hover, .chat-send.is-active:active, .chat-pill-ic:active { transform: none; }
          .chat-spin { animation-duration: 1.2s; }
          .chat-msg-row, .chat-bubble, .chat-online-dot, .chat-item-chip { animation: none !important; transition: none !important; }
        }
      `}</style>
      {/* LAYOUT: full height flex column — header sticky, messages scroll, input fixed */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#eef2f3", minHeight: 0 }}>

        {/* Rating prompt overlay */}
        {showRatingPrompt && otherUserProfile && (
          <RatingPrompt
            listingId={conversation.listing_id}
            raterId={currentUserId}
            ratedUserId={otherUserProfile.id}
            ratedUserName={otherUserProfile.name}
            onDismiss={() => setShowRatingPrompt(false)}
          />
        )}

        {/* ── STICKY HEADER ── stays visible during scroll */}
        <div style={{
          flexShrink: 0,
          background: "linear-gradient(135deg, #071f26 0%, #0e3d47 50%, #1a6b7a 100%)",
          padding: "12px 14px",
          position: "relative", overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}>
          {/* Banner background image — masked left-fade + scrim, falls back to gradient */}
          {!bannerImgFailed && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/chat-header.png" alt="" aria-hidden="true"
                onError={() => setBannerImgFailed(true)}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center right", opacity: 0.4, pointerEvents: "none", WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 45%, #000 88%)", maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 45%, #000 88%)" }} />
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(90deg, #071f26 0%, rgba(7,31,38,0.85) 40%, transparent 82%)" }} />
            </>
          )}
          <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
            {/* Avatar */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              {otherUserProfile?.profile_photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={otherUserProfile.profile_photo_url} alt={otherUserProfile.name ?? ""}
                  style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(255,255,255,0.3)" }} />
              ) : (
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "white", border: "2px solid rgba(255,255,255,0.2)" }}>
                  {(otherUserProfile?.name ?? "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className="chat-online-dot" style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid white" }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Clickable username → seller profile */}
              <Link href={`/seller/${otherUserId}`}
                style={{ fontSize: 15, fontWeight: 700, color: "white", textDecoration: "none", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "opacity 150ms ease" }}
                className="hover:opacity-80">
                {otherUserProfile?.name ?? "Unknown"}
              </Link>
              {/* Clickable listing title → listing page */}
              <Link href={`/listing/${conversation.listing_id}`}
                style={{ fontSize: 11.5, fontWeight: 600, color: "#f5d9c4", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, marginTop: 3, padding: "3px 9px", borderRadius: 100, background: "rgba(216,144,88,0.18)", border: "1px solid rgba(216,144,88,0.35)", maxWidth: "100%", transition: "background 150ms ease" }}
                className="chat-item-chip">
                <span aria-hidden="true">🏷️</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conversation.listing_title}</span>
                {/* Sold badge sits beside the listing title — never displaces the report button */}
                {isSold && (
                  <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 100, background: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", fontWeight: 700, letterSpacing: "0.05em", flexShrink: 0 }}>
                    SOLD
                  </span>
                )}
              </Link>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <div className="chat-report-btn">
                <ReportButton targetType={reportTarget.targetType} targetId={reportTarget.targetId} isLoggedIn={true} />
              </div>
            </div>
          </div>
        </div>

        {/* Safety banner */}
        {warningKeyword && <SafetyWarningBanner matchedKeyword={warningKeyword} />}

        {/* Sold banner */}
        {isSold && (
          <div style={{ flexShrink: 0, background: "linear-gradient(135deg,#fffbeb,#fef3c7)", padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #fde68a" }}>
            <span style={{ fontSize: 14 }}>🏷️</span>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#92400e", margin: 0 }}>This item has been sold — messaging is disabled.</p>
          </div>
        )}

        {/* ── SCROLLABLE MESSAGE LIST — only this area scrolls ── */}
        <div className="chat-messages-area" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10, minHeight: 0, overscrollBehavior: "contain", position: "relative" }}>
          {/* Faint centre watermark — sits behind messages, fades at top/bottom */}
          {!centerImgFailed && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/chat-center.png" alt="" aria-hidden="true"
                onError={() => setCenterImgFailed(true)}
                style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(58%, 280px)", opacity: 0.06, pointerEvents: "none", userSelect: "none" }} />
            </>
          )}
          {messages.map((msg) => {
            const isSystem = (msg as Message & { message_type?: string }).message_type === "system";
            if (isSystem) {
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: "center", padding: "4px 0" }}>
                  <span style={{ borderRadius: 100, background: "rgba(0,0,0,0.08)", padding: "5px 14px", fontSize: 11, color: "#6b7280", fontWeight: 500 }}>
                    {msg.text}
                  </span>
                </div>
              );
            }
            const isOwn = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className="chat-msg-row" style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
                {/* Other person avatar */}
                {!isOwn && (
                  otherUserProfile?.profile_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={otherUserProfile.profile_photo_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#0e3d47,#1a6b7a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>
                      {(otherUserProfile?.name ?? "?")[0]?.toUpperCase()}
                    </div>
                  )
                )}
                <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start", gap: 4 }}>
                  {/* Image — thumbnail, click to enlarge */}
                  {msg.image_url && (
                    <div
                      onClick={() => setLightboxUrl(msg.image_url!)}
                      style={{ cursor: "pointer", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", maxWidth: 200, transition: "transform 150ms ease" }}
                      className="hover:scale-[1.02]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={msg.image_url} alt="Shared image"
                        style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
                      <div style={{ background: "rgba(0,0,0,0.45)", padding: "4px 10px", fontSize: 10, color: "rgba(255,255,255,0.8)", textAlign: "center" }}>
                        Tap to expand
                      </div>
                    </div>
                  )}
                  {/* Text bubble */}
                  {msg.text && (
                    <div className="chat-bubble" style={{
                      padding: "10px 14px",
                      borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isOwn ? "linear-gradient(135deg,#a5622c,#d99058)" : "white",
                      color: isOwn ? "white" : "#111827",
                      fontSize: 14, lineHeight: 1.45, wordBreak: "break-word",
                      boxShadow: isOwn ? "0 4px 16px rgba(184,115,51,0.32)" : "0 2px 8px rgba(0,0,0,0.07)",
                    }}>
                      {msg.text}
                    </div>
                  )}
                  {/* Timestamp + read receipt */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 4px" }}>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isOwn && (
                      <span style={{ fontSize: 10, color: msg.read ? "#b87333" : "#9ca3af", fontWeight: 600 }}>
                        {msg.read ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── FIXED INPUT AREA — never scrolls away ── */}
        {isSold ? (
          <div style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb", background: "white", padding: "14px 16px", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500, margin: 0 }}>🏷️ Messaging disabled for sold items</p>
          </div>
        ) : (
          <div className="chat-input-wrap" style={{ flexShrink: 0, background: "#fff", padding: "10px 12px calc(10px + env(safe-area-inset-bottom))" }}>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />

            <div className="chat-composer" style={{ display: "flex", gap: 9, alignItems: "flex-end" }}>
              {/* The pill: attach + location icons, then the text field — one seamless pill, no boxes */}
              <div className="chat-pill">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage}
                  className="chat-pill-ic" title="Attach photo" aria-label="Attach photo">
                  {isUploadingImage ? (
                    <span className="chat-spin" />
                  ) : (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  )}
                </button>
                <button type="button" onClick={handleShareLocation} disabled={isSharingLocation}
                  className="chat-pill-ic" title="Share location" aria-label="Share location">
                  {isSharingLocation ? (
                    <span className="chat-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  )}
                </button>
                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                  placeholder="Type a message…"
                  className="chat-pill-input"
                />
              </div>

              {/* Send button — copper, sits to the right of the pill */}
              <button type="button" onClick={handleSendText} disabled={isSending || !inputText.trim()}
                className={`chat-send ${inputText.trim() ? "is-active" : ""}`} aria-label="Send message">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── LIGHTBOX — click image to expand ── */}
      {lightboxMounted && lightboxUrl && createPortal(
        <div
          onClick={() => setLightboxUrl(null)}
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, cursor: "zoom-out" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxUrl} alt="Full size"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 24px 60px rgba(0,0,0,0.5)", cursor: "default" }} />
          <button onClick={() => setLightboxUrl(null)}
            style={{ position: "absolute", top: 16, right: 16, width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>,
        document.body
      )}
    </>
  );
}