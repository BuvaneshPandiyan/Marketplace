// Import Next.js's helpers
import { notFound, redirect } from "next/navigation";
// Import our server-side Supabase client creator
import { createClient } from "@/lib/supabase/server";
// Import the real-time chat panel
import { ChatPanel } from "@/components/chat/ChatPanel";

// The /messages/[conversationId] page — an async Server Component
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, listings(title, status)")
    .eq("id", conversationId)
    .single();

  if (!conversation) notFound();

  const otherUserId =
    conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;

  const { data: otherUserProfile } = await supabase
    .from("profiles")
    .select("id, name, profile_photo_url, rating_avg, rating_count, created_at, is_verified_seller")
    .eq("id", otherUserId)
    .single();

  const listing = conversation.listings as { title: string; status: string } | null;

  return (
    <>
      {/*
        Chat layout strategy:
        - The app header is `position: sticky; top: 0; z-index: 50; height ~56px desktop / ~108px mobile`
        - We use `position: fixed` for the chat container so it ALWAYS fills exactly the space
          below the header, on every device, without touching body overflow.
        - z-index: 10 keeps it below the app header (z-50).
        - The inner ChatPanel uses a flex column: header shrinks, messages scroll, input shrinks.
      */}
      <style>{`
        /* This is a full-height chat surface — the global site footer must not
           show below it (it peeks through on mobile when you scroll). The chat
           page mounts this marker; hide the footer while it's present. */
        body:has(.chat-page-container) footer,
        body:has(.chat-page-container) .bzf {
          display: none !important;
        }

        .chat-page-container {
          position: fixed;
          top: 76px;
          left: 0; right: 0; bottom: 0;
          z-index: 10;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          /* Compositor layer — prevents fixed-element jitter during scroll */
          will-change: transform;
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }

        /* Mobile: keyboard-stable layout.
           Problem 1: bottom: calc(80px + ...) recalculates when the virtual keyboard
           opens/closes because iOS/Android shrink the visual viewport → input bar jumps.
           Problem 2: 100dvh updates when the browser URL bar hides/shows as you scroll
           → dvh recalculates → container resizes → input bar jumps again.

           Fix: Use 100svh (small viewport height).
           svh = viewport height when the URL bar is FULLY VISIBLE (the minimum/smallest).
           It NEVER changes — not when the keyboard opens, not when the URL bar hides.
           The container stays exactly the same height regardless of browser chrome state.
           When the URL bar hides and extra space appears, the messages scroll area just
           shows more content naturally — no container resize, no input bar movement.

           svh is supported in Chrome 108+, Safari 15.4+, Firefox 101+.
           Fall back to 100vh for older browsers (will still jump on URL bar hide,
           but that's better than breaking the layout entirely). */
        @media (max-width: 639px) {
          .chat-page-container {
            top: 0 !important;
            bottom: auto !important;
            /* svh: stable, never changes with URL bar or keyboard */
            height: calc(100svh - 68px) !important;
          }

          /* Fallback for browsers without svh */
          @supports not (height: 100svh) {
            .chat-page-container {
              height: calc(100vh - 68px) !important;
            }
          }
        }

        /* Report button stays inside header on all screen sizes */
        .chat-report-btn button,
        .chat-report-btn a {
          font-size: 11px !important;
          padding: 4px 10px !important;
          white-space: nowrap;
          max-width: 70px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Prevent rubber-band / elastic overscroll from moving fixed children */
        .chat-messages-area {
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>

      <div className="chat-page-container">
        <ChatPanel
          conversation={{
            ...conversation,
            listing_title: listing?.title ?? "Listing",
            listing_status: listing?.status ?? "active",
          }}
          currentUserId={user.id}
          otherUserId={otherUserId}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          otherUserProfile={otherUserProfile as any}
          reportTarget={{ targetType: "user" as const, targetId: otherUserId }}
        />
      </div>
    </>
  );
}