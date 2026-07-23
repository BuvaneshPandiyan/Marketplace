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

  // Fetch the conversation to find the other participant and the listing title
  const { data: conversation } = await supabase
    .from("conversations")
    .select("buyer_id, seller_id, listings(title)")
    .eq("id", body.conversationId)
    .single();

  // If the conversation doesn't exist or this user isn't a participant, refuse
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Work out who the OTHER participant is (the one who should receive the notification)
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