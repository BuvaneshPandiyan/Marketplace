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
        .chat-page-container {
          position: fixed;
          /* Desktop header ~56px */
          top: 56px;
          left: 0; right: 0; bottom: 0;
          z-index: 10;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        /* Mobile header has two rows ~108px */
        @media (max-width: 639px) {
          .chat-page-container { top: 108px; }
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