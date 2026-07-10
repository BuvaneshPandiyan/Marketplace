import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: conversations } = await supabase
    .from("conversations")
    .select(`
      id, listing_id, buyer_id, seller_id, created_at,
      listings(title, status, listing_photos(url, sort_order)),
      buyer:profiles!conversations_buyer_id_fkey(id, name, profile_photo_url),
      seller:profiles!conversations_seller_id_fkey(id, name, profile_photo_url)
    `)
    .order("created_at", { ascending: false });

  const enriched = await Promise.all(
    (conversations ?? []).map(async (conv) => {
      const { data: lastMessages } = await supabase
        .from("messages").select("text, image_url, created_at, read, sender_id")
        .eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1);
      const { count: unreadCount } = await supabase
        .from("messages").select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id).eq("read", false).neq("sender_id", user.id);

      type ProfileShape = { id: string; name: string | null; profile_photo_url: string | null } | null;
      type ListingShape = { title: string; status: string; listing_photos: { url: string; sort_order: number }[] } | null;

      const otherUser = conv.buyer_id === user.id
        ? (conv.seller as unknown as ProfileShape)
        : (conv.buyer as unknown as ProfileShape);
      const listing = conv.listings as unknown as ListingShape;
      const coverPhoto = (listing?.listing_photos ?? []).sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
      const lastMessage = lastMessages?.[0] ?? null;
      const isSold = listing?.status === "sold";

      return {
        id: conv.id,
        listingTitle: listing?.title ?? "Listing",
        listingStatus: listing?.status ?? "active",
        isSold,
        coverPhoto,
        otherUserName: otherUser?.name ?? "Unknown",
        otherUserPhotoUrl: otherUser?.profile_photo_url ?? null,
        lastMessageText: lastMessage?.text ?? (lastMessage?.image_url ? "📷 Photo" : "No messages yet"),
        lastMessageAt: lastMessage?.created_at ?? conv.created_at,
        lastMessageIsOwn: lastMessage?.sender_id === user.id,
        unreadCount: unreadCount ?? 0,
      };
    })
  );

  enriched.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  const totalUnread = enriched.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f5" }}>
      <style>{`
        @keyframes msg-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .msg-row { animation: msg-in 350ms cubic-bezier(0.22,1,0.36,1) both; }
        .conv-card {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px; text-decoration: none; color: inherit;
          border-bottom: 1px solid #f3f4f6;
          transition: background 150ms ease;
          position: relative;
        }
        .conv-card:hover { background: rgba(234,88,12,0.03); }
        .conv-card:active { background: rgba(234,88,12,0.07); }
        @keyframes unread-pulse {
          0%,100%{box-shadow:0 0 0 0 rgba(234,88,12,0.35)}
          50%{box-shadow:0 0 0 6px rgba(234,88,12,0)}
        }
        .unread-badge { animation: unread-pulse 2.2s ease infinite; }
        @media(prefers-reduced-motion:reduce){
          .msg-row,.conv-card,.unread-badge{animation:none!important;transition:none!important;}
        }
      `}</style>

      {/* Hero header */}
      <div style={{ background: "linear-gradient(135deg,#1a0a00,#3d1500,#ea580c)", padding: "28px 16px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -30, left: "30%", width: 140, height: 140, borderRadius: "50%", background: "rgba(0,0,0,0.1)", pointerEvents: "none" }} />
        <div className="mx-auto max-w-3xl" style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Inbox</p>
              <h1 style={{ fontSize: "clamp(22px,4vw,32px)", fontWeight: 900, color: "white", margin: 0, letterSpacing: "-0.03em" }}>
                💬 Chats
              </h1>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                {enriched.length === 0
                  ? "No conversations yet"
                  : `${enriched.length} conversation${enriched.length !== 1 ? "s" : ""}${totalUnread > 0 ? ` · ${totalUnread} unread` : ""}`}
              </p>
            </div>
            {totalUnread > 0 && (
              <div style={{ padding: "6px 16px", borderRadius: 100, background: "white", color: "#ea580c", fontWeight: 800, fontSize: 14 }}>
                {totalUnread} new
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conversation list */}
      <div className="mx-auto max-w-3xl">
        {enriched.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>No chats yet</p>
            <p style={{ fontSize: 14, color: "#6b7280" }}>Tap &ldquo;Chat with Seller&rdquo; on any listing to start a conversation.</p>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "0 0 20px 20px", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
            {enriched.map((conv, i) => (
              <div key={conv.id} className="msg-row" style={{ animationDelay: `${i * 50}ms` }}>
                <Link href={`/messages/${conv.id}`} prefetch={true} className="conv-card">
                  {/* Avatar */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    {conv.otherUserPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={conv.otherUserPhotoUrl} alt={conv.otherUserName}
                        style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", border: "2px solid #f3f4f6" }} />
                    ) : (
                      <div style={{ width: 52, height: 52, borderRadius: "50%", background: "linear-gradient(135deg,#ea580c,#f97316)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "white" }}>
                        {conv.otherUserName[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    {/* Listing thumbnail overlay */}
                    {conv.coverPhoto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={conv.coverPhoto} alt={conv.listingTitle}
                        style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: 6, objectFit: "cover", border: "2px solid white" }} />
                    )}
                  </div>

                  {/* Text content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 14, fontWeight: conv.unreadCount > 0 ? 700 : 500, color: "#111", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.otherUserName}
                      </p>
                      <p style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0 }}>
                        {formatRelativeDate(conv.lastMessageAt)}
                      </p>
                    </div>
                    {/* Listing name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: conv.isSold ? "#6b7280" : "#ea580c" }}>
                        {conv.isSold ? "🏷️ Sold" : "🛍️"} {conv.listingTitle}
                      </span>
                    </div>
                    {/* Last message preview */}
                    <p style={{ fontSize: 13, color: conv.unreadCount > 0 ? "#374151" : "#9ca3af", fontWeight: conv.unreadCount > 0 ? 500 : 400, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {conv.lastMessageIsOwn && <span style={{ color: "#9ca3af" }}>You: </span>}
                      {conv.lastMessageText}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {conv.unreadCount > 0 && (
                    <span className="unread-badge" style={{
                      minWidth: 22, height: 22, borderRadius: 100, padding: "0 6px",
                      background: "linear-gradient(135deg,#ea580c,#f97316)",
                      color: "white", fontSize: 11, fontWeight: 800, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                    </span>
                  )}

                  {/* Sold indicator */}
                  {conv.isSold && (
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 100, background: "rgba(107,114,128,0.1)", color: "#6b7280", fontWeight: 600, flexShrink: 0 }}>
                      Sold
                    </span>
                  )}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}