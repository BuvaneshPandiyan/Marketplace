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

  // The session lookup and the conversation fetch don't depend on each other —
  // the conversation is found by its id from the URL, not by the viewer. Running
  // them together costs one round-trip instead of two.
  //
  // RLS still decides visibility: the conversations policy limits rows to the
  // buyer or seller, so fetching before the user check can't leak anything.
  const [
    { data: { user } },
    { data: conversation },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("conversations")
      .select("*, listings(title, status)")
      .eq("id", conversationId)
      .single(),
  ]);

  if (!user) redirect("/login");
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

        /* Stop the window scrolling on this page at all.
           This is what actually fixes the gap. The container is sized with svh
           — the viewport at its SMALLEST, i.e. with the browser URL bar showing
           — because that value never changes when the keyboard opens, which
           keeps the composer from jumping.
           But the URL bar only hides BECAUSE the page scrolls. When it did, the
           real viewport grew taller than svh, and since the container is fixed
           at a set height, that extra height appeared as dead space underneath
           it rather than as more room for messages.
           Locking scroll means the URL bar stays put, so svh always matches the
           real viewport: no gap, and still no keyboard jump. The message list
           has its own internal scroll, so nothing becomes unreachable. */
        html:has(.chat-page-container),
        body:has(.chat-page-container) {
          overflow: hidden !important;
          /* Kills the rubber-band overscroll that can nudge the URL bar away
             even without a real scroll. */
          overscroll-behavior: none !important;
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
            /* Full viewport height, NOT minus the nav.
               The nav pill is position:fixed and floats OVER the page, so it
               occupies no layout space — subtracting its height just left a dead
               grey band between the composer and the nav, with the chat surface
               stopping short of the bottom of the screen.
               The composer clears the nav with its own bottom padding instead
               (see .chat-input-wrap), which keeps the chat background running
               edge to edge.
               svh rather than vh: stable, never changes with the URL bar or the
               keyboard opening. */
            height: 100svh !important;
          }

          /* Fallback for browsers without svh */
          @supports not (height: 100svh) {
            .chat-page-container {
              height: 100vh !important;
            }
          }
        }

        /* Report button — glassmorphism pill, visible on the dark header */
        .chat-report-btn button,
        .chat-report-btn a {
          font-size: 11.5px !important;
          font-weight: 700 !important;
          letter-spacing: 0.01em;
          padding: 7px 14px !important;
          white-space: nowrap;
          border-radius: 999px !important;
          color: #fff !important;
          background: rgba(255,255,255,0.14) !important;
          border: 1px solid rgba(255,255,255,0.28) !important;
          -webkit-backdrop-filter: blur(10px);
          backdrop-filter: blur(10px);
          box-shadow: 0 2px 10px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: background 180ms ease, transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
        }
        .chat-report-btn button:hover,
        .chat-report-btn a:hover {
          background: rgba(248,113,113,0.9) !important;
          border-color: rgba(248,113,113,0.9) !important;
          color: #fff !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(220,38,38,0.4);
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