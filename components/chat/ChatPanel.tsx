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
    <>
      {/* LAYOUT: full height flex column — header sticky, messages scroll, input fixed */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#ede9e4", minHeight: 0 }}>

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
          background: "linear-gradient(135deg, #1a0a00 0%, #3d1500 50%, #ea580c 100%)",
          padding: "12px 14px",
          position: "relative", overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}>
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
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid white" }} />
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
                style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginTop: 1, transition: "opacity 150ms ease" }}
                className="hover:opacity-90">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conversation.listing_title}</span>
              </Link>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {isSold && (
                <span style={{ fontSize: 10, padding: "3px 10px", borderRadius: 100, background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                  SOLD
                </span>
              )}
              <ReportButton targetType={reportTarget.targetType} targetId={reportTarget.targetId} isLoggedIn={true} />
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
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
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
              <div key={msg.id} style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
                {/* Other person avatar */}
                {!isOwn && (
                  otherUserProfile?.profile_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={otherUserProfile.profile_photo_url} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#ea580c,#f97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", flexShrink: 0 }}>
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
                    <div style={{
                      padding: "10px 14px",
                      borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isOwn ? "linear-gradient(135deg,#ea580c,#f97316)" : "white",
                      color: isOwn ? "white" : "#111827",
                      fontSize: 14, lineHeight: 1.45, wordBreak: "break-word",
                      boxShadow: isOwn ? "0 4px 16px rgba(234,88,12,0.3)" : "0 2px 8px rgba(0,0,0,0.08)",
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
                      <span style={{ fontSize: 10, color: msg.read ? "#ea580c" : "#9ca3af", fontWeight: 600 }}>
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
          <div style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb", background: "white", padding: "8px 12px 10px" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage}
                style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 150ms" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ea580c"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}>
                {isUploadingImage ? "Uploading…" : "📎 Photo"}
              </button>
              <button type="button" onClick={handleShareLocation}
                style={{ fontSize: 12, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: 0, transition: "color 150ms" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ea580c"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#9ca3af"; }}>
                📍 Location
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                placeholder="Type a message…"
                style={{ flex: 1, border: "1.5px solid #e5e7eb", borderRadius: 100, padding: "10px 16px", fontSize: 14, outline: "none", background: "#f9fafb", transition: "border-color 200ms ease, background 200ms ease" }}
                onFocus={(e) => { e.target.style.borderColor = "#ea580c"; e.target.style.background = "white"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#f9fafb"; }}
              />
              <button type="button" onClick={handleSendText} disabled={isSending || !inputText.trim()}
                style={{
                  width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0,
                  background: inputText.trim() ? "linear-gradient(135deg,#ea580c,#f97316)" : "#e5e7eb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: inputText.trim() ? "0 4px 16px rgba(234,88,12,0.35)" : "none",
                  transition: "background 200ms ease, box-shadow 200ms ease, transform 150ms ease",
                }}
                onMouseEnter={(e) => { if (inputText.trim()) (e.currentTarget as HTMLElement).style.transform = "scale(1.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={inputText.trim() ? "white" : "#9ca3af"} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
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