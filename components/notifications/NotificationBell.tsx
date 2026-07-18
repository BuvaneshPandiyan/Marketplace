"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useAuthGate } from "@/components/auth/AuthGateContext";
import { useUser } from "@/lib/hooks/useUser";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { AppNotification, NotificationType } from "@/types";

// Emoji + color config per type
const TYPE_CONFIG: Record<NotificationType, { emoji: string; label: string; color: string; bg: string }> = {
  new_message:       { emoji: "💬", label: "New message",      color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  new_match:         { emoji: "🔍", label: "New match",        color: "#d97706", bg: "rgba(217,119,6,0.11)"  },
  price_drop:        { emoji: "📉", label: "Price drop",       color: "#16a34a", bg: "rgba(22,163,74,0.1)"  },
  listing_sold:      { emoji: "🏷️", label: "Item sold",        color: "#16a34a", bg: "rgba(22,163,74,0.1)"  },
  listing_expiring:  { emoji: "⏰", label: "Listing expiring", color: "#d97706", bg: "rgba(217,119,6,0.1)"  },
  listing_published: { emoji: "🎉", label: "Listing live!",    color: "#d97706", bg: "rgba(217,119,6,0.11)"  },
  welcome:           { emoji: "👋", label: "Welcome!",         color: "#d97706", bg: "rgba(217,119,6,0.11)"  },
};

function resolveLink(n: AppNotification): string {
  if (n.link) return n.link;
  switch (n.type) {
    case "new_message":      return "/messages";
    case "listing_sold":     return "/messages";
    case "new_match":        return "/search";
    case "price_drop":       return "/wishlist";
    case "listing_expiring": return "/my-listings";
    case "welcome":          return "/";
    default:                 return "/";
  }
}

export function NotificationBell() {
  const [supabase] = useState(() => createClient());
  const { requireAuth } = useAuthGate();
  const { user } = useUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // Optional header artwork — falls back to the plain gradient if absent.
  const [artFailed, setArtFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 639px)");
  const router = useRouter();
  const pathname = usePathname();
  const prevPathname = useRef(pathname);
  /**
   * Header mounts this bell TWICE — desktop pill and mobile pill — hiding one
   * with CSS rather than unmounting it. Both run their effects simultaneously,
   * so a shared realtime channel name means the second instance is handed the
   * first one's already-subscribed channel and .on() throws. useId keeps them
   * apart. (Same fix as ChatsPopover.)
   */
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const unreadCount = user ? notifications.filter((n) => !n.read).length : 0;

  // Prefetch all notification destinations the moment the bell opens —
  // this kicks off background fetches so tapping a notification is near-instant
  useEffect(() => {
    if (!isOpen || notifications.length === 0) return;
    notifications.forEach((n) => {
      const url = resolveLink(n);
      router.prefetch(url);
    });
  }, [isOpen, notifications, router]);

  // Close sheet when pathname changes (navigation completed)
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      setIsOpen(false);
      document.body.style.overflow = "";
    }
  }, [pathname]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Logged out: there is nothing to fetch, but we MUST clear the loading
        // flag. Returning with isLoadingNotifs still true (its initial value) is
        // what left the panel spinning forever for guests.
        setIsLoadingNotifs(false);
        return;
      }
      // User confirmed — load notifications and subscribe to new ones
      const { data } = await supabase.from("notifications").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      setNotifications((data as AppNotification[]) ?? []);
      setIsLoadingNotifs(false);
      const channelName = `notifications-bell-${user.id}-${instanceId}`;
      const existing = supabase.channel(channelName);
      await supabase.removeChannel(existing);
      channel = supabase.channel(channelName);
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => { setNotifications((prev) => [payload.new as AppNotification, ...prev].slice(0, 20)); });
      channel.subscribe();
    }
    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [supabase, instanceId]);

  // Desktop outside-click — skipped on mobile (portal is outside containerRef)
  useEffect(() => {
    if (isMobile) return;
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [isMobile]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isMobile, isOpen]);

  async function handleOpen() {
    // Logged out: show the sign-in popup instead of opening an empty panel
    if (!requireAuth("see your notifications")) return;
    setIsOpen((prev) => !prev);
    if (isOpen) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  // Bell always renders immediately — the Header already guards with {user && (...)}
  // so we know the user is logged in. The portal (mobile sheet) still needs mounted.

  const popupContent = (isMobileSheet: boolean) => (
    <>
      {/* Header — same gradient style as drawer and location sheet */}
      <div style={{
        background: "linear-gradient(135deg, #451a03 0%, #92400e 45%, #d97706 100%)",
        padding: isMobileSheet ? "14px 20px 18px" : "16px 20px 14px",
        flexShrink: 0,
        overflow: "hidden",
        borderRadius: isMobileSheet ? 0 : "16px 16px 0 0",
        position: "relative",
      }}>
        {!artFailed && (
          <>
            {/* Optional header artwork, masked so it fades out on the left where
                the title sits, plus a scrim for guaranteed legibility. */}
            <div className="pop-art" aria-hidden="true">
              <Image
                src="/images/header-notifications.png"
                alt=""
                fill
                sizes="(max-width: 639px) 100vw, 340px"
                style={{ objectFit: "cover", objectPosition: "center right" }}
                onError={() => setArtFailed(true)}
              />
            </div>
            <div className="pop-art-scrim" aria-hidden="true" />
          </>
        )}
        {/* Grid overlay */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize:"28px 28px", borderRadius: isMobileSheet ? 0 : "16px 16px 0 0", pointerEvents:"none" }} />
        {/* Drag handle — only on mobile sheet */}
        {isMobileSheet && (
          <div style={{ width:36, height:4, borderRadius:100, background:"rgba(255,255,255,0.25)", margin:"0 auto 14px", position:"relative" }} />
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <div>
              <p style={{ fontWeight: 900, fontSize: 16, letterSpacing: "-0.035em", color: "white", margin: 0 }}>Notifications</p>
              <p style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.62)", margin: "1px 0 0" }}>
                {unreadCount > 0 ? `${unreadCount} new update${unreadCount > 1 ? "s" : ""}` : "You're all caught up"}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => setIsOpen(false)} aria-label="Close"
            style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div style={{ overflowY: "auto", flex: 1, paddingBottom: isMobileSheet ? "env(safe-area-inset-bottom)" : 0 }}>
        {notifications.length === 0 && isLoadingNotifs ? (
          // Skeleton — shown while notifications are fetching
          <div style={{ padding: "8px 16px 16px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
                <div className="animate-pulse" style={{ width: 40, height: 40, borderRadius: 12, background: "#f3f4f6", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="animate-pulse" style={{ height: 10, width: "40%", borderRadius: 6, background: "#f3f4f6" }} />
                  <div className="animate-pulse" style={{ height: 13, width: "85%", borderRadius: 6, background: "#f3f4f6" }} />
                  <div className="animate-pulse" style={{ height: 10, width: "55%", borderRadius: 6, background: "#f3f4f6" }} />
                  <div className="animate-pulse" style={{ height: 10, width: "25%", borderRadius: 6, background: "#f3f4f6" }} />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center" }}>
            <div className="pop-empty-badge" aria-hidden="true" style={{ margin: "0 auto 14px" }}>🔔</div>
            <p className="pop-empty-h">You&apos;re all caught up</p>
            <p className="pop-empty-s" style={{ maxWidth: "30ch", margin: "0 auto" }}>New offers, messages and updates on your listings will show up here.</p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {notifications.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] ?? { emoji: "🔔", label: n.type, color: "#6b7280", bg: "#f3f4f6" };
              const isUnread = !n.read;
              const href = resolveLink(n);

              const inner = (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                  background: isUnread ? "rgba(217,119,6,0.04)" : "transparent",
                  borderLeft: isUnread ? "3px solid #d97706" : "3px solid transparent",
                  opacity: 1,
                  animation: `notif-item-in 300ms ease ${i * 40}ms both`,
                }}>
                  {/* Emoji badge */}
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
                    {cfg.emoji}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: cfg.color }}>{cfg.label}</span>
                      {isUnread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#d97706", display: "inline-block", flexShrink: 0 }} />}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: isUnread ? 600 : 400, color: isUnread ? "#111" : "#374151", margin: 0, lineHeight: 1.4 }}>{n.title}</p>
                    {n.body && <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{n.body}</p>}
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{formatRelativeDate(n.created_at)}</p>
                  </div>
                  {/* Arrow */}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={2} style={{ flexShrink: 0, marginTop: 4 }} strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              );

              return (
                <li key={n.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  {isMobileSheet ? (
                    /* Mobile portal: router.push first, then close — avoids Link getting
                       interrupted by the portal teardown or backdrop click */
                    <div role="button" tabIndex={0}
                      onClick={() => { router.push(href); setTimeout(() => setIsOpen(false), 60); }}
                      onKeyDown={(e) => { if (e.key==="Enter"||e.key===" ") { router.push(href); setTimeout(() => setIsOpen(false), 60); }}}
                      style={{ cursor:"pointer" }}
                      className="notif-item-link">
                      {inner}
                    </div>
                  ) : (
                    <Link href={href} prefetch={true} style={{ display: "block", textDecoration: "none", color: "inherit", transition: "background 150ms ease" }}
                      className="notif-item-link" onClick={() => setIsOpen(false)}>
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
        /* Bell ring animation when unread */
        /* Shared header-artwork treatment (mirrors ChatsPopover) */
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
          background: linear-gradient(90deg, rgba(69,26,3,0.85) 0%, rgba(69,26,3,0.35) 55%, transparent 100%);
        }

        .pop-empty-badge {
          width: 60px; height: 60px; border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px;
          background: var(--brand-tint, #fffbeb);
          border: 1.5px solid var(--brand-border, #fde68a);
          animation: pop-empty-float 3.4s ease-in-out infinite;
        }
        @keyframes pop-empty-float { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
        .pop-empty-h { font-size: 15px; font-weight: 900; letter-spacing: -0.035em; color: var(--ink, #1a1a1a); margin: 0 0 5px; }
        .pop-empty-s { font-size: 12px; font-weight: 500; line-height: 1.5; color: var(--ink-muted, #6b7280); }
        @media (prefers-reduced-motion: reduce) { .pop-empty-badge { animation: none !important; } }

        @keyframes bell-ring {
          0%,100%{ transform: rotate(0); }
          10%     { transform: rotate(18deg); }
          20%     { transform: rotate(-16deg); }
          30%     { transform: rotate(12deg); }
          40%     { transform: rotate(-10deg); }
          50%     { transform: rotate(6deg); }
          60%     { transform: rotate(-4deg); }
          70%     { transform: rotate(2deg); }
          80%     { transform: rotate(0); }
        }
        @keyframes badge-pulse {
          0%,100%{ transform: scale(1); box-shadow: 0 0 0 0 rgba(217,119,6,0.42); }
          50%    { transform: scale(1.15); box-shadow: 0 0 0 6px rgba(217,119,6,0); }
        }
        .bell-btn { transition: transform 200ms ease, background 200ms ease; }
        .bell-btn:hover { transform: scale(1.12); background: rgba(217,119,6,0.09) !important; }
        .bell-btn:hover .bell-icon { animation: bell-ring 0.6s ease; }
        .bell-btn:active { transform: scale(0.92); }
        .badge-pulse { animation: badge-pulse 2s ease infinite; }

        /* Desktop dropdown */
        @keyframes notif-in { from{opacity:0;transform:scale(0.94) translateY(-8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .notif-dropdown { animation: notif-in 220ms cubic-bezier(0.22,1,0.36,1) both; transform-origin: top right; }

        /* Mobile sheet */
        @keyframes sheet-in { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .notif-sheet { animation: sheet-in 320ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes backdrop-in { from{opacity:0} to{opacity:1} }
        .notif-backdrop { animation: backdrop-in 220ms ease both; }

        /* List item entrance */
        @keyframes notif-item-in { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }

        /* Notification row hover */
        .notif-item-link:hover > div { background: rgba(217,119,6,0.06) !important; }
        .notif-item-link:hover svg[viewBox="0 0 24 24"]:last-child { stroke: #d97706; }
        .notif-item-link:active > div { background: rgba(217,119,6,0.11) !important; transform: scale(0.99); }

        @media (prefers-reduced-motion: reduce) {
          .pop-art { animation: none !important; opacity: 0.5 !important; transform: none !important; }
          .bell-btn,.bell-btn:hover,.notif-dropdown,.notif-sheet,.notif-backdrop { animation:none!important; transition-duration:0ms!important; }
          .bell-btn:hover { transform:none!important; }
          div[style*="notif-item-in"] { animation:none!important; }
        }
      `}</style>

      <div ref={containerRef} style={{ position: "relative" }}>
        {/* Bell button */}
        <button type="button" onClick={handleOpen} aria-label="Open notifications"
          className="bell-btn"
          style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative", color: "#374151", opacity: 1 }}>
          <svg className="bell-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unreadCount > 0 && (
            <span className="badge-pulse" style={{
              position: "absolute", top: 4, right: 4,
              minWidth: 18, height: 18, borderRadius: 100,
              background: "linear-gradient(135deg,#d97706,#f59e0b)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, fontWeight: 800, color: "white", padding: "0 4px",
            }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Desktop dropdown */}
        {!isMobile && isOpen && (
          <div className="notif-dropdown" style={{
            position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 9999,
            width: 340, borderRadius: 16, overflow: "hidden",
            background: "white", display: "flex", flexDirection: "column", maxHeight: 480,
            boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}>
            {popupContent(false)}
          </div>
        )}
      </div>

      {/* Mobile bottom sheet via portal */}
      {isMobile && isOpen && mounted && createPortal(
        <>
          <div className="notif-backdrop" onClick={() => setIsOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }}
            aria-hidden="true"
          />
          <div className="notif-sheet" style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9991,
            background: "white", borderRadius: "24px 24px 0 0",
            height: "65vh", display: "flex", flexDirection: "column",
            boxShadow: "0 -16px 56px rgba(0,0,0,0.25)",
            overflow: "hidden",
          }}>
            {popupContent(true)}
          </div>
        </>,
        document.body
      )}
    </>
  );
}