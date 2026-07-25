// Import Next.js helpers
import { NextRequest, NextResponse } from "next/server";
import { allowRequest } from "@/lib/server/rateLimit";
// Import the server-side Supabase client
import { createClient } from "@/lib/supabase/server";
// Import the notification creator (server-side, bypasses RLS)
import { createNotification } from "@/lib/server/createNotification";

// Define the expected request body
type RequestBody = {
  // The ID of the conversation the message was sent into
  conversationId: string;
};

// POST /api/notifications/message — called after every new chat message is sent
export async function POST(request: NextRequest) {
  if (!(await allowRequest(request, "notify-message", 30, 60))) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  // Parse the request body
  const body = (await request.json()) as RequestBody;
  if (!body.conversationId) {
    return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
  }

  // Identify the caller
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch the conversation to find both participants and the listing title
  const { data: conversation } = await supabase
    .from("conversations")
    .select("buyer_id, seller_id, listings(title)")
    .eq("id", body.conversationId)
    .single();

  // If the conversation doesn't exist (or RLS hid it because the caller isn't a
  // participant), refuse.
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Defence in depth: prove participation explicitly instead of relying on the
  // conversations RLS SELECT policy alone. If that policy were ever loosened,
  // deriving "the other participant" from an unchecked row would let anyone
  // trigger a notification at an arbitrary user. Require the caller to actually
  // be the buyer or the seller.
  const isParticipant =
    conversation.buyer_id === user.id || conversation.seller_id === user.id;
  if (!isParticipant) {
    return NextResponse.json(
      { error: "You are not a participant in this conversation." },
      { status: 403 }
    );
  }

  // Confirm a real, recent message from THIS caller exists in the conversation.
  // This endpoint is meant to fire immediately after the caller sends a message;
  // without this check a participant could call it on a loop to spam the other
  // party with "new message" alerts for messages that were never sent. A short
  // window keeps it aligned with genuine post-send calls while blocking replay.
  const RECENT_WINDOW_MS = 2 * 60 * 1000;
  const since = new Date(Date.now() - RECENT_WINDOW_MS).toISOString();
  const { count: recentFromCaller } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", body.conversationId)
    .eq("sender_id", user.id)
    .gte("created_at", since);

  // No genuine recent message from this caller — there is nothing to notify about.
  if (!recentFromCaller) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // The recipient is whichever participant is NOT the caller.
  const recipientId =
    conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;

  // Get the listing title for the notification body text
  const listingTitle = (conversation.listings as unknown as { title: string } | null)?.title ?? "a listing";

  // Create the in-app (+ push) notification for the recipient
  await createNotification({
    userId: recipientId,
    type: "new_message",
    title: "New message",
    body: `You have a new message about "${listingTitle}"`,
    // Deep-link directly to the conversation thread
    link: `/messages/${body.conversationId}`,
  });

  return NextResponse.json({ ok: true });
}