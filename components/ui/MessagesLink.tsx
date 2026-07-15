"use client";
// Header Chats button — shows unread count badge and active state
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GatedLink } from "@/components/auth/GatedLink";

export function MessagesLink() {
  const [supabase] = useState(() => createClient());
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();
  const isActive = pathname?.startsWith("/messages");

  useEffect(() => {
    async function fetchUnread() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("read", false)
        .neq("sender_id", user.id);
      setUnread(count ?? 0);
    }
    fetchUnread();
  }, [pathname, supabase]);

  return (
    <>
      <style>{`
        .chats-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 8px 14px; border-radius: 100px;
          font-size: 13px; font-weight: 600;
          text-decoration: none;
          position: relative;
          transition: background 200ms ease, color 200ms ease, transform 200ms ease, box-shadow 200ms ease;
          color: ${isActive ? "#ea580c" : "#374151"};
          background: ${isActive ? "rgba(234,88,12,0.08)" : "transparent"};
        }
        @media (hover: hover) {
          .chats-btn:hover {
            background: rgba(234,88,12,0.08);
            color: #ea580c;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(234,88,12,0.15);
          }
        }
        .chats-btn:active { transform: scale(0.96); }
        @keyframes chats-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(234,88,12,0.4); }
          50%      { box-shadow: 0 0 0 5px rgba(234,88,12,0); }
        }
        .chats-badge { animation: chats-pulse 2s ease infinite; }
        @media (prefers-reduced-motion: reduce) {
          .chats-btn { transition-duration: 0ms !important; }
          .chats-btn:hover { transform: none !important; }
          .chats-badge { animation: none !important; }
        }
      `}</style>
      <GatedLink href="/messages" action="chat with sellers" prefetch={true} className="chats-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        Chats
        {unread > 0 && (
          <span className="chats-badge" style={{
            minWidth: 18, height: 18, borderRadius: 100, padding: "0 4px",
            background: "linear-gradient(135deg,#ea580c,#f97316)",
            color: "white", fontSize: 10, fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </GatedLink>
    </>
  );
}