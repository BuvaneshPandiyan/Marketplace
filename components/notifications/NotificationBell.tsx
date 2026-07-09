"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import type { AppNotification, NotificationType } from "@/types";
import React from "react";

// SVG icons per notification type
const TYPE_ICON: Record<NotificationType, (isRead: boolean) => React.ReactElement> = {
  new_match:       (r) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={r?"#9ca3af":"#ea580c"} strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
  price_drop:      (r) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={r?"#9ca3af":"#16a34a"} strokeWidth={2} strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  new_message:     (r) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={r?"#9ca3af":"#3b82f6"} strokeWidth={2} strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  listing_sold:    (r) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={r?"#9ca3af":"#16a34a"} strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></svg>,
  listing_expiring:(r) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={r?"#9ca3af":"#d97706"} strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
  welcome:         (r) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={r?"#9ca3af":"#ea580c"} strokeWidth={2} strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
};

// The notification list content — shared between desktop dropdown and mobile sheet
function NotifList({ notifications, onClose }: { notifications: AppNotification[]; onClose: () => void }) {
  if (notifications.length === 0) {
    return (
      <div style={{ padding: "40px 16px", textAlign: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <p style={{ fontSize: 13, color: "#9ca3af" }}>No notifications yet</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-neutral-50">
      {notifications.map((n) => {
        const isUnread = !n.read;
        const iconEl = TYPE_ICON[n.type]?.(n.read) ?? null;
        const row = (
          <>
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center", background: isUnread ? "rgba(234,88,12,0.08)" : "#f9fafb", transition: "transform 200ms ease" }}>
              {iconEl}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: isUnread ? 600 : 400, color: isUnread ? "#111827" : "#374151", margin: 0, lineHeight: 1.4 }}>{n.title}</p>
              {n.body && <p style={{ fontSize: 12, color: "#6b7280", marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{n.body}</p>}
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{formatRelativeDate(n.created_at)}</p>
            </div>
            {isUnread && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ea580c", flexShrink: 0, marginTop: 5 }} />}
          </>
        );

        const rowStyle: React.CSSProperties = {
          display: "flex", alignItems: "flex-start", gap: 12,
          padding: "12px 16px", textDecoration: "none", color: "inherit",
          borderLeft: isUnread ? "2px solid #ea580c" : "2px solid transparent",
          transition: "background 150ms ease",
          cursor: "pointer",
        };

        return (
          <li key={n.id}>
            {n.link ? (
              <Link href={n.link} onClick={onClose}
                style={rowStyle}
                className="hover:bg-orange-50 active:bg-orange-100">
                {row}
              </Link>
            ) : (
              <div style={rowStyle} className="hover:bg-orange-50">{row}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Shared header bar for the popup
function NotifHeader({ unreadCount, onClose }: { unreadCount: number; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 12px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
      <p style={{ fontWeight: 700, fontSize: 15, color: "#111827", margin: 0 }}>Notifications</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {unreadCount > 0
          ? <span style={{ fontSize: 11, fontWeight: 600, color: "#ea580c", background: "#fff7ed", padding: "2px 8px", borderRadius: 100 }}>{unreadCount} new</span>
          : <span style={{ fontSize: 11, color: "#9ca3af" }}>All caught up ✓</span>
        }
        <button type="button" onClick={onClose} aria-label="Close notifications"
          style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [supabase] = useState(() => createClient());
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("(max-width: 639px)");

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setIsLoggedIn(true);
      const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      setNotifications((data as AppNotification[]) ?? []);
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

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Lock body scroll when mobile sheet is open
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

  if (!isLoggedIn) return null;

  return (
    <>
      <style>{`
        /* Desktop dropdown entrance */
        @keyframes notif-in {
          from { opacity: 0; transform: scale(0.95) translateY(-6px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .notif-dropdown { animation: notif-in 180ms cubic-bezier(0.22,1,0.36,1) both; transform-origin: top right; }

        /* Mobile bottom sheet entrance */
        @keyframes sheet-in {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .notif-sheet { animation: sheet-in 300ms cubic-bezier(0.22,1,0.36,1) both; }

        /* Mobile backdrop entrance */
        @keyframes backdrop-in { from { opacity:0; } to { opacity:1; } }
        .notif-backdrop { animation: backdrop-in 200ms ease both; }

        @media (prefers-reduced-motion: reduce) {
          .notif-dropdown, .notif-sheet, .notif-backdrop { animation: none !important; }
        }
      `}</style>

      <div ref={containerRef} className="relative">
        {/* Bell button */}
        <button type="button" onClick={handleOpen} aria-label="Open notifications"
          className="relative flex items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
          style={{ width: 44, height: 44, color: "#4b5563" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {unreadCount > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* ── DESKTOP dropdown — absolute, under the bell ── */}
        {!isMobile && isOpen && (
          <div className="notif-dropdown absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white"
            style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.14), 0 4px 16px rgba(0,0,0,0.08)" }}>
            <NotifHeader unreadCount={unreadCount} onClose={() => setIsOpen(false)} />
            <div className="max-h-80 overflow-y-auto">
              <NotifList notifications={notifications} onClose={() => setIsOpen(false)} />
            </div>
          </div>
        )}
      </div>

      {/* ── MOBILE bottom sheet — rendered via portal, OUTSIDE the header ── */}
      {isMobile && isOpen && mounted && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="notif-backdrop"
            onClick={() => setIsOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 9990, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)" }}
            aria-hidden="true"
          />
          {/* Sheet */}
          <div
            className="notif-sheet"
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9991,
              background: "white", borderRadius: "20px 20px 0 0",
              maxHeight: "75vh", display: "flex", flexDirection: "column",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
            }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
              <div style={{ width: 36, height: 4, borderRadius: 100, background: "#e5e7eb" }} />
            </div>
            <NotifHeader unreadCount={unreadCount} onClose={() => setIsOpen(false)} />
            <div style={{ overflowY: "auto", flex: 1, paddingBottom: "env(safe-area-inset-bottom)" }}>
              <NotifList notifications={notifications} onClose={() => setIsOpen(false)} />
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
