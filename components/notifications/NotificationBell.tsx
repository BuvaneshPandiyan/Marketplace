"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { AppNotification, NotificationType } from "@/types";

// Emoji + color config per type
const TYPE_CONFIG: Record<NotificationType, { emoji: string; label: string; color: string; bg: string }> = {
  new_message:       { emoji: "💬", label: "New message",      color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  new_match:         { emoji: "🔍", label: "New match",        color: "#ea580c", bg: "rgba(234,88,12,0.1)"  },
  price_drop:        { emoji: "📉", label: "Price drop",       color: "#16a34a", bg: "rgba(22,163,74,0.1)"  },
  listing_sold:      { emoji: "🏷️", label: "Item sold",        color: "#16a34a", bg: "rgba(22,163,74,0.1)"  },
  listing_expiring:  { emoji: "⏰", label: "Listing expiring", color: "#d97706", bg: "rgba(217,119,6,0.1)"  },
  listing_published: { emoji: "🎉", label: "Listing live!",    color: "#ea580c", bg: "rgba(234,88,12,0.1)"  },
  welcome:           { emoji: "👋", label: "Welcome!",         color: "#ea580c", bg: "rgba(234,88,12,0.1)"  },
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 639px)");
  const router = useRouter();
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
      if (!user) return;
      // User confirmed — load notifications and subscribe to new ones
      const { data } = await supabase.from("notifications").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      setNotifications((data as AppNotification[]) ?? []);
      setIsLoadingNotifs(false);
      const channelName = `notifications-bell-${user.id}`;
      const existing = supabase.channel(channelName);
      await supabase.removeChannel(existing);
      channel = supabase.channel(channelName);
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => { setNotifications((prev) => [payload.new as AppNotification, ...prev].slice(0, 20)); });
      channel.subscribe();
    }
    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [supabase]);

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
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a0a00 0%, #ea580c 100%)",
        padding: "16px 20px 14px",
        flexShrink: 0,
        borderRadius: isMobileSheet ? 0 : "16px 16px 0 0",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: "white", margin: 0 }}>Notifications</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0 }}>
              {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up ✓"}
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setIsOpen(false)} aria-label="Close"
          style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
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
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔕</div>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Nothing yet</p>
            <p style={{ fontSize: 12, color: "#9ca3af" }}>Notifications will appear here</p>
          </div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {notifications.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] ?? { emoji: "🔔", label: n.type, color: "#6b7280", bg: "#f3f4f6" };
              const isUnread = !n.read;
              const href = resolveLink(n);

              const inner = (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                  background: isUnread ? "rgba(234,88,12,0.03)" : "transparent",
                  borderLeft: isUnread ? "3px solid #ea580c" : "3px solid transparent",
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
                      {isUnread && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ea580c", display: "inline-block", flexShrink: 0 }} />}
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
                  <Link href={href} prefetch={true} style={{ display: "block", textDecoration: "none", color: "inherit", transition: "background 150ms ease" }}
                    className="notif-item-link">
                    {inner}
                  </Link>
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
          0%,100%{ transform: scale(1); box-shadow: 0 0 0 0 rgba(234,88,12,0.4); }
          50%    { transform: scale(1.15); box-shadow: 0 0 0 6px rgba(234,88,12,0); }
        }
        .bell-btn { transition: transform 200ms ease, background 200ms ease; }
        .bell-btn:hover { transform: scale(1.12); background: rgba(234,88,12,0.08) !important; }
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
        .notif-item-link:hover > div { background: rgba(234,88,12,0.05) !important; }
        .notif-item-link:hover svg[viewBox="0 0 24 24"]:last-child { stroke: #ea580c; }
        .notif-item-link:active > div { background: rgba(234,88,12,0.1) !important; transform: scale(0.99); }

        @media (prefers-reduced-motion: reduce) {
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
              background: "linear-gradient(135deg,#ea580c,#f97316)",
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
            background: "white", borderRadius: "28px 28px 0 0",
            maxHeight: "78vh", display: "flex", flexDirection: "column",
            boxShadow: "0 -16px 60px rgba(0,0,0,0.2)",
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