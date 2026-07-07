// Import Next.js's helpers
import { notFound, redirect } from "next/navigation";
// Import our server-side Supabase client creator
import { createClient } from "@/lib/supabase/server";
// Import the report button so users can flag suspicious chat conversations
import { ReportButton } from "@/components/trust/ReportButton";
// Import the real-time chat panel
import { ChatPanel } from "@/components/chat/ChatPanel";

// The /messages/[conversationId] page — an async Server Component
export default async function ConversationPage({
  // Next.js 15: params is a Promise that must be awaited
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  // Unwrap the dynamic segment
  const { conversationId } = await params;
  // Create a server-side Supabase client for this request
  const supabase = await createClient();

  // Guard: require login — the middleware protects /messages, but this is a double-check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch the conversation, plus the listing title/status we need for the panel header
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, listings(title, status)")
    .eq("id", conversationId)
    .single();

  // 404 if the conversation doesn't exist or the current user isn't a participant
  // (the RLS SELECT policy on conversations enforces participation automatically)
  if (!conversation) notFound();

  // Work out who the other participant is (the one who is NOT the current user)
  const otherUserId =
    conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;

  // Fetch the other participant's profile for the panel header and rating prompt
  const { data: otherUserProfile } = await supabase
    .from("profiles")
    .select("id, name, profile_photo_url, rating_avg, rating_count, created_at, is_verified_seller")
    .eq("id", otherUserId)
    .single();

  // Pull the listing title and status out of the joined relation
  const listing = conversation.listings as { title: string; status: string } | null;

  // Render a full-height chat panel, no outer page padding so it uses the full viewport
  return (
    // A full-viewport-height container so the message list and input stay in place
    <div className="flex h-[calc(100dvh-56px)] flex-col">
      {/* Small "Report this conversation" link in the top-right corner */}
      <div className="flex justify-end border-b border-neutral-100 px-3 py-1">
        <ReportButton
          targetType="user"
          // Report the OTHER user (not the current user reporting themselves)
          targetId={otherUserId}
          isLoggedIn={true}
        />
      </div>
      {/* Hand everything off to the real-time ChatPanel client component */}
      <ChatPanel
        conversation={{
          // Spread the base conversation fields
          ...conversation,
          // Add the two extra fields the panel needs
          listing_title: listing?.title ?? "Listing",
          listing_status: listing?.status ?? "active",
        }}
        currentUserId={user.id}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- profile shape matches
        otherUserProfile={otherUserProfile as any}
      />
    </div>
  );
}
