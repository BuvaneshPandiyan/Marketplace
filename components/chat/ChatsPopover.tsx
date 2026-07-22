"use client";

/**
 * Chats popover — the conversation list, in a panel instead of a page.
 *
 * Deliberately mirrors NotificationBell: same gradient header, same 340px
 * dropdown anchored under the trigger on desktop, same 65vh bottom sheet via
 * portal on mobile, same entrance animations, same skeleton and empty state.
 * If you restyle one, restyle the other — they're meant to read as siblings.
 *
 * Tapping a conversation still navigates to /messages/[conversationId]; only
 * the *list* page is replaced. /messages is now unlinked and can be deleted.
 *
 * The query mirrors app/(main)/messages/page.tsx exactly — same select, same
 * last-message/unread derivation — so the panel and that page can't drift.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { BannerArt } from "@/components/ui/BannerArt";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthGate } from "@/components/auth/AuthGateContext";
import { useUser } from "@/lib/hooks/useUser";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";

type ChatRow = {
  id: string;
  listingTitle: string;
  isSold: boolean;
  coverPhoto: string | null;
  otherUserName: string;
  otherUserPhotoUrl: string | null;
  lastMessageText: string;
  lastMessageAt: string;
  lastMessageIsOwn: boolean;
  unreadCount: number;
};

type ProfileShape = { id: string; name: string | null; profile_photo_url: string | null } | null;
type ListingShape = { title: string; status: string; listing_photos: { url: string; sort_order: number }[] } | null;
type MsgRow = {
  conversation_id: string;
  text: string | null;
  image_url: string | null;
  created_at: string;
  read: boolean;
  sender_id: string;
};

export function ChatsPopover() {
  const [supabase] = useState(() => createClient());
  const { requireAuth } = useAuthGate();
  const { user } = useUser();
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Optional header artwork — falls back to the plain gradient if absent.
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 639px)");
  const router = useRouter();
  const pathname = usePathname();
  /**
   * Header mounts this component TWICE — once in the desktop pill, once in the
   * mobile pill — and hides one with CSS rather than unmounting it. Both
   * instances therefore run their effects at the same time. If they share a
   * realtime channel name, the second one gets handed the first one's live,
   * already-subscribed channel and .on() throws. useId gives each instance its
   * own name. (Strip the punctuation React puts in the id — channel topics
   * should stay alphanumeric.)
   */
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const unreadCount = user ? chats.reduce((sum, c) => sum + c.unreadCount, 0) : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  /** Load conversations, deriving last message + unread the same way /messages does. */
  const loadChats = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      // Logged out: nothing to fetch, but clear the flag or the panel would
      // spin forever — the same trap NotificationBell had.
      setIsLoadingChats(false);
      setChats([]);
      return;
    }

    const { data: conversations } = await supabase
      .from("conversations")
      .select(
        `
        id, listing_id, buyer_id, seller_id, created_at,
        listings(title, status, listing_photos(url, sort_order)),
        buyer:profiles!conversations_buyer_id_fkey(id, name, profile_photo_url),
        seller:profiles!conversations_seller_id_fkey(id, name, profile_photo_url)
      `
      )
      .order("created_at", { ascending: false });

    const convIds = (conversations ?? []).map((c) => c.id);

    const { data: lastMsgs } = convIds.length
      ? await supabase
          .from("messages")
          .select("conversation_id, text, image_url, created_at, read, sender_id")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
      : { data: [] as MsgRow[] };

    const lastMsgMap: Record<string, MsgRow> = {};
    const unreadMap: Record<string, number> = {};
    for (const msg of (lastMsgs ?? []) as MsgRow[]) {
      if (!lastMsgMap[msg.conversation_id]) lastMsgMap[msg.conversation_id] = msg;
      if (!msg.read && msg.sender_id !== authUser.id) {
        unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] ?? 0) + 1;
      }
    }

    const enriched: ChatRow[] = (conversations ?? []).map((conv) => {
      const otherUser =
        conv.buyer_id === authUser.id
          ? (conv.seller as unknown as ProfileShape)
          : (conv.buyer as unknown as ProfileShape);
      const listing = conv.listings as unknown as ListingShape;
      const coverPhoto =
        (listing?.listing_photos ?? []).sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
      const lastMessage = lastMsgMap[conv.id] ?? null;

      return {
        id: conv.id,
        listingTitle: listing?.title ?? "Listing",
        isSold: listing?.status === "sold",
        coverPhoto,
        otherUserName: otherUser?.name ?? "Unknown",
        otherUserPhotoUrl: otherUser?.profile_photo_url ?? null,
        lastMessageText: lastMessage?.text ?? (lastMessage?.image_url ? "📷 Photo" : "No messages yet"),
        lastMessageAt: lastMessage?.created_at ?? conv.created_at,
        lastMessageIsOwn: lastMessage?.sender_id === authUser.id,
        unreadCount: unreadMap[conv.id] ?? 0,
      };
    });

    enriched.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
    setChats(enriched);
    setIsLoadingChats(false);
  }, [supabase]);

  // Initial load + refresh whenever the route changes (e.g. back from a thread)
  useEffect(() => {
    loadChats();
  }, [loadChats, pathname]);

  // Realtime: any new message refreshes the list, so the badge stays honest
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    async function subscribe() {
      const channelName = `chats-popover-${userId}-${instanceId}`;
      /**
       * supabase.channel(name) hands back the EXISTING channel when one is
       * already registered under that name, and .on() throws if that channel has
       * already subscribed. The per-instance name above stops the two Header
       * copies colliding; this teardown additionally covers the same instance
       * re-running its effect (dev StrictMode double-invoke, or a user id change).
       */
      await supabase.removeChannel(supabase.channel(channelName));
      if (cancelled) return;

      channel = supabase.channel(channelName);
      // INSERT keeps the list and badge current when a message arrives.
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => loadChats()
      );
      // UPDATE matters just as much: reading a conversation flips messages to
      // read = true, and without listening for that the badge would sit there
      // until the route changed. Reopening the popover on the same page would
      // still show the old count.
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => loadChats()
      );
      channel.subscribe();
    }
    subscribe();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // user?.id, not user — the context object's identity can change between
    // renders, which would tear down and rebuild the channel on every render.
  }, [supabase, user?.id, loadChats, instanceId]);

  // Desktop outside-click — skipped on mobile, where the portal sits outside containerRef
  useEffect(() => {
    if (isMobile) return;
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [isOpen, isMobile]);

  // Escape closes, and the mobile sheet locks body scroll
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    if (isMobile) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, isMobile]);

  // Close on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  function handleOpen() {
    // Logged out: show the sign-in popup rather than an empty panel
    if (!requireAuth("chat with sellers")) return;
    setIsOpen((prev) => !prev);
  }

  const panel = (isMobileSheet: boolean) => (
    <>
      {/* Header — same gradient as the bell, drawer and location sheet */}
      <div
        style={{
          background: "linear-gradient(135deg, #4c0519 0%, #9f1239 45%, #e11d48 100%)",
          padding: isMobileSheet ? "14px 20px 18px" : "16px 20px 14px",
          flexShrink: 0,
          borderRadius: isMobileSheet ? 0 : "16px 16px 0 0",
          position: "relative",
        }}
      >
        {/* Artwork behind the header. Masked so it fades out on the left where
                the title sits, then a scrim over that for guaranteed legibility. */}
            <BannerArt variant="glass" tint="#fb7185" tint2="#e11d48" id="chats" />
            <div className="pop-art-scrim" aria-hidden="true" />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
            borderRadius: isMobileSheet ? 0 : "16px 16px 0 0",
            pointerEvents: "none",
          }}
        />
        {isMobileSheet && (
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 100,
              background: "rgba(255,255,255,0.25)",
              margin: "0 auto 14px",
              position: "relative",
            }}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>💬</span>
            <div>
              {/* Matched to the location modal: 16px / 900 / tight tracking, and a
                  warmer line than a bare "Chats" label. */}
              <p style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.035em", color: "white", margin: 0 }}>Your chats</p>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.62)", margin: "1px 0 0" }}>
                {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""}` : "You're all caught up"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "white",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Conversation list */}
      <div style={{ overflowY: "auto", flex: 1, paddingBottom: isMobileSheet ? "env(safe-area-inset-bottom)" : 0 }}>
        {chats.length === 0 && isLoadingChats ? (
          <div style={{ padding: "8px 16px 16px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div className="animate-pulse" style={{ width: 44, height: 44, borderRadius: 12, background: "#f3f4f6", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="animate-pulse" style={{ height: 10, width: "40%", borderRadius: 6, background: "#f3f4f6" }} />
                  <div className="animate-pulse" style={{ height: 13, width: "85%", borderRadius: 6, background: "#f3f4f6" }} />
                  <div className="animate-pulse" style={{ height: 10, width: "25%", borderRadius: 6, background: "#f3f4f6" }} />
                </div>
              </div>
            ))}
          </div>
        ) : chats.length === 0 ? (
          <div className="pop-empty">
            <div className="pop-empty-badge" aria-hidden="true">💬</div>
            <p className="pop-empty-h">No chats yet</p>
            <p className="pop-empty-s">Find something you like and message the seller — your conversations land right here.</p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {chats.map((c, i) => {
              const isUnread = c.unreadCount > 0;
              const href = `/messages/${c.id}`;

              const inner = (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "14px 16px",
                    background: isUnread ? "rgba(225,29,72,0.04)" : "transparent",
                    borderLeft: isUnread ? "3px solid #e11d48" : "3px solid transparent",
                    animation: `chat-item-in 300ms ease ${i * 40}ms both`,
                  }}
                >
                  {/* Listing cover, with the other person's avatar tucked in the corner */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: "#f3f4f6",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                      }}
                    >
                      {c.coverPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.coverPhoto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        "📦"
                      )}
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: -3,
                        right: -3,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        overflow: "hidden",
                        border: "2px solid white",
                        background: "#fecdd3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 800,
                        color: "#9a3412",
                      }}
                    >
                      {c.otherUserPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.otherUserPhotoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        c.otherUserName[0]?.toUpperCase() ?? "?"
                      )}
                    </div>
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "#e11d48",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: c.isSold ? 130 : 180,
                        }}
                      >
                        {c.listingTitle}
                      </span>
                      {c.isSold && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: "1px 5px",
                            borderRadius: 100,
                            background: "#f3f4f6",
                            color: "#6b7280",
                            flexShrink: 0,
                          }}
                        >
                          SOLD
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: isUnread ? 700 : 600,
                        color: "#111",
                        margin: 0,
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.otherUserName}
                    </p>
                    <p
                      style={{
                        fontSize: 12,
                        color: isUnread ? "#374151" : "#6b7280",
                        fontWeight: isUnread ? 600 : 400,
                        marginTop: 2,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                      }}
                    >
                      {c.lastMessageIsOwn && <span style={{ color: "#9ca3af" }}>You: </span>}
                      {c.lastMessageText}
                    </p>
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{formatRelativeDate(c.lastMessageAt)}</p>
                  </div>

                  {isUnread ? (
                    <span
                      style={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: 100,
                        padding: "0 5px",
                        background: "linear-gradient(135deg,#e11d48,#f43f5e)",
                        color: "white",
                        fontSize: 10,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                    >
                      {c.unreadCount > 99 ? "99+" : c.unreadCount}
                    </span>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#d1d5db"
                      strokeWidth={2}
                      style={{ flexShrink: 0, marginTop: 4 }}
                      strokeLinecap="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </div>
              );

              return (
                <li key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  {isMobileSheet ? (
                    /* Mobile portal: push first, close after — same reasoning as the bell,
                       a <Link> gets interrupted by the portal tearing down underneath it */
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        router.push(href);
                        setTimeout(() => setIsOpen(false), 60);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          router.push(href);
                          setTimeout(() => setIsOpen(false), 60);
                        }
                      }}
                      style={{ cursor: "pointer" }}
                      className="chat-item-link"
                    >
                      {inner}
                    </div>
                  ) : (
                    <Link
                      href={href}
                      prefetch={true}
                      style={{ display: "block", textDecoration: "none", color: "inherit", transition: "background 150ms ease" }}
                      className="chat-item-link"
                      onClick={() => setIsOpen(false)}
                    >
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );

  return (
    <>
      <style>{`
        /* Shared header-artwork treatment */
        .pop-art {
          position: absolute; inset: 0; pointer-events: none;
          opacity: 0.5;
          -webkit-mask-image: linear-gradient(90deg, transparent 4%, rgba(0,0,0,0.5) 40%, #000 82%);
          mask-image: linear-gradient(90deg, transparent 4%, rgba(0,0,0,0.5) 40%, #000 82%);
          animation: pop-art-in 900ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes pop-art-in { from { opacity: 0; transform: scale(1.1); } }
        .pop-art-scrim {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(90deg, rgba(76,5,25,0.85) 0%, rgba(76,5,25,0.35) 55%, transparent 100%);
        }

        /* ── Shared popover empty state ────────────────────────────
           A big emoji and one grey line reads as "nothing here" — dead. Same
           bones as the feed's empty states: a ringed badge that floats, a bold
           headline, and a sentence that tells you how to make it non-empty. */
        .pop-empty {
          padding: 40px 26px; text-align: center;
          display: flex; flex-direction: column; align-items: center;
          animation: pop-empty-in 500ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes pop-empty-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .pop-empty-badge {
          width: 60px; height: 60px; border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; margin-bottom: 14px;
          background: var(--brand-tint, #fff1f2);
          border: 1.5px solid var(--brand-border, #fecdd3);
          animation: pop-empty-float 3.4s ease-in-out infinite;
        }
        @keyframes pop-empty-float { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
        .pop-empty-h {
          font-size: 15px; font-weight: 900; letter-spacing: -0.035em;
          color: var(--ink, #1a1a1a); margin: 0 0 5px;
        }
        .pop-empty-s {
          font-size: 12px; font-weight: 500; line-height: 1.5;
          color: var(--ink-muted, #6b7280); max-width: 30ch; margin: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .pop-empty, .pop-empty-badge { animation: none !important; }
        }

        /* Chat rows slide + tint on hover, matching the location recents */
        .chat-item-link { display: block; text-decoration: none; transition: transform 180ms cubic-bezier(0.34,1.56,0.64,1); }
        @media (hover: hover) { .chat-item-link:hover { transform: translateX(3px); } }

        @keyframes chat-wiggle {
          0%,100%{ transform: rotate(0); }
          25%    { transform: rotate(-9deg); }
          50%    { transform: rotate(7deg); }
          75%    { transform: rotate(-4deg); }
        }
        @keyframes chat-badge-pulse {
          0%,100%{ transform: scale(1); box-shadow: 0 0 0 0 rgba(225,29,72,0.42); }
          50%    { transform: scale(1.15); box-shadow: 0 0 0 6px rgba(225,29,72,0); }
        }
        .chatpop-btn { transition: transform 200ms ease, background 200ms ease; }
        .chatpop-btn:hover { transform: scale(1.12); background: rgba(225,29,72,0.09) !important; }
        .chatpop-btn:hover .chatpop-icon { animation: chat-wiggle 0.6s ease; }
        .chatpop-btn:active { transform: scale(0.92); }
        .chatpop-badge { animation: chat-badge-pulse 2s ease infinite; }

        /* Desktop dropdown — identical timing/origin to the notification panel */
        @keyframes chat-in { from{opacity:0;transform:scale(0.94) translateY(-8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .chat-dropdown { animation: chat-in 220ms cubic-bezier(0.22,1,0.36,1) both; transform-origin: top right; }

        /* Mobile sheet */
        @keyframes chat-sheet-in { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .chat-sheet { animation: chat-sheet-in 320ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes chat-backdrop-in { from{opacity:0} to{opacity:1} }
        .chat-backdrop { animation: chat-backdrop-in 220ms ease both; }

        @keyframes chat-item-in { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }

        .chat-item-link:hover > div { background: rgba(225,29,72,0.06) !important; }
        .chat-item-link:active > div { background: rgba(225,29,72,0.11) !important; }

        @media (prefers-reduced-motion: reduce) {
          .chatpop-btn,.chatpop-btn:hover,.chat-dropdown,.chat-sheet,.chat-backdrop,.pop-art { animation:none!important; transition-duration:0ms!important; }
          .pop-art { opacity: 0.5 !important; transform: none !important; }
          .chatpop-btn:hover { transform:none!important; }
          .chatpop-badge { animation:none!important; }
          div[style*="chat-item-in"] { animation:none!important; }
        }
      `}</style>

      <div ref={containerRef} style={{ position: "relative" }}>
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Open chats"
          aria-expanded={isOpen}
          className="chatpop-btn"
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            background: isOpen ? "rgba(225,29,72,0.11)" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            color: isOpen ? "#e11d48" : "#374151",
          }}
        >
          <svg
            className="chatpop-icon"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadCount > 0 && (
            <span
              className="chatpop-badge"
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                minWidth: 18,
                height: 18,
                borderRadius: 100,
                background: "linear-gradient(135deg,#e11d48,#f43f5e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 800,
                color: "white",
                padding: "0 4px",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Desktop dropdown */}
        {!isMobile && isOpen && (
          <div
            className="chat-dropdown"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              zIndex: 9999,
              width: 340,
              borderRadius: 16,
              overflow: "hidden",
              background: "white",
              display: "flex",
              flexDirection: "column",
              maxHeight: 480,
              boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {panel(false)}
          </div>
        )}
      </div>

      {/* Mobile bottom sheet via portal */}
      {isMobile &&
        isOpen &&
        mounted &&
        createPortal(
          <>
            <div
              className="chat-backdrop"
              onClick={() => setIsOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9990,
                background: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(3px)",
                WebkitBackdropFilter: "blur(3px)",
              }}
              aria-hidden="true"
            />
            <div
              className="chat-sheet"
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 9991,
                background: "white",
                borderRadius: "24px 24px 0 0",
                height: "65vh",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 -16px 56px rgba(0,0,0,0.25)",
                overflow: "hidden",
              }}
            >
              {panel(true)}
            </div>
          </>,
          document.body
        )}
    </>
  );
}