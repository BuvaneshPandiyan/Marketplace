// Mark as Client Component since it manages real-time state and dropdown open/close
"use client";

// Import React hooks
import { useEffect, useRef, useState } from "react";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";
// Import Next.js's Link for navigating to a notification's deep-link
import Link from "next/link";
// Import our relative date formatter
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";
// Import the notification type
import type { AppNotification, NotificationType } from "@/types";

// Map each notification type to a simple emoji icon
const TYPE_ICON: Record<NotificationType, string> = {
  new_match: "🔍",
  price_drop: "📉",
  new_message: "💬",
  listing_sold: "✅",
  listing_expiring: "⏰",
  welcome: "👋",
};

export function NotificationBell() {
  const [supabase] = useState(() => createClient());
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    // Track the channel so we can clean it up
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setIsLoggedIn(true);

      // Fetch recent notifications
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications((data as AppNotification[]) ?? []);

      // Use a unique channel name per user
      const channelName = `notifications-bell-${user.id}`;

      // Remove any existing channel with this name first
      // This prevents the "cannot add callbacks after subscribe()" error in React strict mode
      const existing = supabase.channel(channelName);
      await supabase.removeChannel(existing);

      // Create a fresh channel
      channel = supabase.channel(channelName);

      // Attach listener BEFORE calling subscribe()
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) =>
            [payload.new as AppNotification, ...prev].slice(0, 20)
          );
        }
      );

      // Only subscribe AFTER attaching all listeners
      channel.subscribe();
    }

    init();

    // Cleanup on unmount
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Open notifications"
        className="relative flex items-center justify-center rounded-full hover:bg-neutral-100"
        style={{ width: 44, height: 44, color: "#4b5563" }}
      >
        {/* SVG bell — matches the 20px / strokeWidth-2 system used by all header icons */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          <div className="border-b border-neutral-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-neutral-900">Notifications</p>
          </div>
          <ul className="max-h-80 divide-y divide-neutral-50 overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-neutral-400">
                No notifications yet
              </li>
            )}
            {notifications.map((notification) => (
              <li key={notification.id}>
                {notification.link ? (
                  <Link
                    href={notification.link}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 ${
                      !notification.read ? "border-l-2 border-orange-500" : ""
                    }`}
                  >
                    <NotificationRow notification={notification} />
                  </Link>
                ) : (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 ${
                      !notification.read ? "border-l-2 border-orange-500" : ""
                    }`}
                  >
                    <NotificationRow notification={notification} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ notification }: { notification: AppNotification }) {
  return (
    <>
      <span className="mt-0.5 shrink-0 text-base">{TYPE_ICON[notification.type]}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${notification.read ? "font-normal text-neutral-700" : "font-semibold text-neutral-900"}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 truncate text-xs text-neutral-500">{notification.body}</p>
        )}
        <p className="mt-0.5 text-xs text-neutral-400">
          {formatRelativeDate(notification.created_at)}
        </p>
      </div>
    </>
  );
}
