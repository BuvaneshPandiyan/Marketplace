// Import Next.js helpers
import { redirect } from "next/navigation";
// Import Next.js's Link for navigation to individual threads
import Link from "next/link";
// Import our server-side Supabase client creator
import { createClient } from "@/lib/supabase/server";
// Import our relative date formatter
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";

// The /messages page — an async Server Component
export default async function MessagesPage() {
  // Create a server-side Supabase client for this request
  const supabase = await createClient();

  // Guard: /messages is protected by middleware but double-check here
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch every conversation where the current user is buyer or seller, including:
  //  - the listing's title and cover photo (for context in the inbox row)
  //  - the other participant's profile (name + photo for the avatar)
  //  - the single most recent message (for the preview text + timestamp)
  // We use two separate queries and merge them because Supabase's JS client doesn't yet
  // support a clean "latest message per conversation" subquery in one shot.

  // First: fetch all conversations the user is in, joined with listing + both profiles
  const { data: conversations } = await supabase
    .from("conversations")
    .select(`
      id,
      listing_id,
      buyer_id,
      seller_id,
      created_at,
      listings(title, listing_photos(url, sort_order)),
      buyer:profiles!conversations_buyer_id_fkey(id, name, profile_photo_url),
      seller:profiles!conversations_seller_id_fkey(id, name, profile_photo_url)
    `)
    // RLS automatically restricts to only conversations the user is part of
    .order("created_at", { ascending: false });

  // For each conversation, fetch its latest message and unread count in parallel
  const enriched = await Promise.all(
    (conversations ?? []).map(async (conv) => {
      // Fetch the single most recent message in this conversation
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("text, image_url, created_at, read, sender_id")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1);

      // Count unread messages that were NOT sent by the current user
      const { count: unreadCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .eq("read", false)
        // Only count the OTHER person's messages as "unread for me"
        .neq("sender_id", user.id);

      // The latest message row (or null if this conversation has no messages yet)
      const lastMessage = lastMessages?.[0] ?? null;

      // Supabase's TS types return FK-joined relations as arrays even when they're scalar;
      // cast via unknown to tell TypeScript we know the actual runtime shape is singular
      type OtherUserShape = { id: string; name: string | null; profile_photo_url: string | null } | null;
      type ListingShape = { title: string; listing_photos: { url: string; sort_order: number }[] } | null;

      // Work out which profile is "the other person"
      const otherUser =
        conv.buyer_id === user.id
          ? (conv.seller as unknown as OtherUserShape)
          : (conv.buyer as unknown as OtherUserShape);

      // Get the listing's cover photo (lowest sort_order)
      const listing = conv.listings as unknown as ListingShape;
      const coverPhoto = (listing?.listing_photos ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;

      return {
        // The conversation's own fields
        id: conv.id,
        listingTitle: listing?.title ?? "Listing",
        coverPhoto,
        // The other participant's details
        otherUserName: otherUser?.name ?? "Unknown",
        otherUserPhotoUrl: otherUser?.profile_photo_url ?? null,
        // The preview text shown in the inbox row
        lastMessageText: lastMessage?.text ?? (lastMessage?.image_url ? "📷 Photo" : "No messages yet"),
        // When the last message was sent, for relative date display
        lastMessageAt: lastMessage?.created_at ?? conv.created_at,
        // How many unread messages are waiting in this conversation
        unreadCount: unreadCount ?? 0,
      };
    })
  );

  // Sort the enriched list by most recent message, so active threads float to the top
  enriched.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  // Render the inbox
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Page heading */}
      <h1 className="mb-4 text-lg font-bold text-neutral-900">Messages</h1>

      {/* Empty state */}
      {enriched.length === 0 && (
        <p className="text-sm text-neutral-500">
          No conversations yet. Tap &quot;Chat with Seller&quot; on any listing to start one.
        </p>
      )}

      {/* The conversation list */}
      <ul className="space-y-1">
        {enriched.map((conv) => (
          // Each row links to the full conversation thread
          <li key={conv.id}>
            <Link
              href={`/messages/${conv.id}`}
              className="flex items-center gap-3 rounded-xl p-3 hover:bg-neutral-50"
            >
              {/* The other person's avatar, or a listing cover photo as a fallback */}
              {conv.otherUserPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
                <img
                  src={conv.otherUserPhotoUrl}
                  alt={conv.otherUserName}
                  className="h-11 w-11 shrink-0 rounded-full object-cover"
                />
              ) : conv.coverPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element -- Supabase Storage URL
                <img
                  src={conv.coverPhoto}
                  alt={conv.listingTitle}
                  className="h-11 w-11 shrink-0 rounded-lg object-cover"
                />
              ) : (
                // Generic placeholder when neither is available
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-lg font-semibold text-orange-700">
                  {conv.otherUserName[0]?.toUpperCase() ?? "?"}
                </div>
              )}

              {/* The text column: other person's name, listing title, message preview */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  {/* The other person's name */}
                  <p className="truncate text-sm font-medium text-neutral-900">{conv.otherUserName}</p>
                  {/* The relative date of the last message */}
                  <p className="shrink-0 text-xs text-neutral-400">
                    {formatRelativeDate(conv.lastMessageAt)}
                  </p>
                </div>
                {/* The listing title, in smaller muted text */}
                <p className="truncate text-xs text-neutral-400">{conv.listingTitle}</p>
                {/* The last message preview */}
                <p className="truncate text-xs text-neutral-500">{conv.lastMessageText}</p>
              </div>

              {/* Unread badge — only shown when there are unread messages */}
              {conv.unreadCount > 0 && (
                <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1.5 text-[10px] font-semibold text-white">
                  {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
