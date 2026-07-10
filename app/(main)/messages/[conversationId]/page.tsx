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
      const coverPhoto = (listing?.listing_photos ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
      const lastMessage = lastMessages?.[0] ?? null;
      const isSold = listing?.status === "sold";

      return {
        id: conv.id,
        listingTitle: listing?.title ?? "Listing",
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
    <div style={{ minHeight: "100vh", background: "#f5f4f2" }}>
      <style>{`
        /* Card entrance */
        @keyframes card-slide { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .conv-card-wrap { animation: card-slide 320ms cubic-bezier(0.22,1,0.36,1) both; }

        /* Hover glow + animated left border */
        .conv-link {
          display: flex; align-items: center; gap: 14px;
          padding: 16px 20px; text-decoration: none; color: inherit;
          position: relative; overflow: hidden;
          transition: background 180ms ease, box-shadow 180ms ease;
          border-left: 3px solid transparent;
        }
        .conv-link::before {
          content: '';
          position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, #ea580c, #f97316, #ea580c);
          background-size: 100% 200%;
          transform: scaleY(0);
          transition: transform 200ms ease;
          animation: none;
        }
        @keyframes border-slide {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 200%; }
        }
        @media (hover: hover) {
          .conv-link:hover {
            background: linear-gradient(90deg, rgba(234,88,12,0.04) 0%, rgba(255,255,255,0.8) 100%);
            box-shadow: inset 0 0 0 0 transparent, 4px 0 32px rgba(234,88,12,0.06);
          }
          .conv-link:hover::before {
            transform: scaleY(1);
            animation: border-slide 1s linear infinite;
          }
        }
        .conv-link:active { background: rgba(234,88,12,0.06); }

        /* Unread badge pulse */
        @keyframes badge-glow {
          0%,100%{box-shadow:0 0 0 0 rgba(234,88,12,0.35)}
          50%{box-shadow:0 0 0 6px rgba(234,88,12,0)}
        }
        .unread-badge { animation: badge-glow 2.2s ease infinite; }

        @media (prefers-reduced-motion: reduce) {
          .conv-card-wrap, .conv-link, .conv-link::before, .unread-badge {
            animation: none !important; transition: none !important;
          }
        }
      `}</style>

      {/* ── STICKY HERO HEADER ── stays in place while you scroll through chats */}
      <div style={{
        position: "sticky",
        top: 56, /* below desktop app header */
        zIndex: 30,
        background: "linear-gradient(135deg,#1a0a00 0%,#3d1500 50%,#ea580c 100%)",
        padding: "12px 0 10px",
        overflow: "hidden",
      }}>
        {/* Decorative blobs */}
        <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: "35%", width: 100, height: 100, borderRadius: "50%", background: "rgba(0,0,0,0.08)", pointerEvents: "none" }} />

        {/* Mobile: sticky below two-row header */}
        <style>{`@media(max-width:639px){.inbox-sticky{top:108px!important}}`}</style>
        <div className="inbox-sticky" />

        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 2px" }}>Inbox</p>
              <h1 style={{ fontSize: "clamp(16px,2.5vw,22px)", fontWeight: 900, color: "white", margin: 0, letterSpacing: "-0.03em" }}>
                💬 Chats
              </h1>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "2px 0 0" }}>
                {enriched.length === 0 ? "No conversations yet" : `${enriched.length} conversation${enriched.length !== 1 ? "s" : ""}${totalUnread > 0 ? ` · ${totalUnread} unread` : ""}`}
              </p>
            </div>
            {totalUnread > 0 && (
              <div style={{ padding: "6px 16px", borderRadius: 100, background: "white", color: "#ea580c", fontWeight: 800, fontSize: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
                {totalUnread} new
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CONVERSATION LIST ── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "20px 16px 48px" }}>
        {enriched.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>💬</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 8 }}>No chats yet</p>
            <p style={{ fontSize: 14, color: "#6b7280" }}>Tap &ldquo;Chat with Seller&rdquo; on any listing to start a conversation.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {enriched.map((conv, i) => (
              <div key={conv.id} className="conv-card-wrap" style={{ animationDelay: `${i * 55}ms` }}>
                <Link href={`/messages/${conv.id}`} prefetch={true} className="conv-link"
                  style={{
                    borderRadius: 16,
                    background: conv.unreadCount > 0 ? "white" : "rgba(255,255,255,0.85)",
                    boxShadow: conv.unreadCount > 0
                      ? "0 2px 16px rgba(0,0,0,0.08), 0 0 0 1px rgba(234,88,12,0.1)"
                      : "0 1px 6px rgba(0,0,0,0.05)",
                  }}>

                  {/* ── Avatar ── */}
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
                    {/* Online dot */}
                    <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: "#22c55e", border: "2px solid white" }} />
                  </div>

                  {/* ── Text content ── */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Row 1: Name + timestamp — timestamp stays RIGHT, never displaced */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                      <p style={{ fontSize: 14, fontWeight: conv.unreadCount > 0 ? 700 : 600, color: "#111", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.otherUserName}
                      </p>
                      {/* Timestamp is always here — no sold badge here to displace it */}
                      <p style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0, margin: 0 }}>
                        {formatRelativeDate(conv.lastMessageAt)}
                      </p>
                    </div>

                    {/* Row 2: Listing name + sold badge (same row, no timestamp) */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: conv.isSold ? "#6b7280" : "#ea580c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {conv.isSold ? "🏷️" : "🛍️"} {conv.listingTitle}
                      </span>
                      {/* Sold badge sits next to listing name — not near the timestamp */}
                      {conv.isSold && (
                        <span style={{ fontSize: 9, padding: "1px 7px", borderRadius: 100, background: "rgba(107,114,128,0.12)", color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>
                          SOLD
                        </span>
                      )}
                    </div>

                    {/* Row 3: Last message preview */}
                    <p style={{ fontSize: 13, color: conv.unreadCount > 0 ? "#374151" : "#9ca3af", fontWeight: conv.unreadCount > 0 ? 500 : 400, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {conv.lastMessageIsOwn && <span style={{ color: "#9ca3af" }}>You: </span>}
                      {conv.lastMessageText}
                    </p>
                  </div>

                  {/* ── Right side: item thumbnail + unread badge ── */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                    {/* Item thumbnail */}
                    {conv.coverPhoto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={conv.coverPhoto} alt={conv.listingTitle}
                        style={{
                          width: 48, height: 48, borderRadius: 10, objectFit: "cover",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                          opacity: conv.isSold ? 0.55 : 1,
                        }} />
                    )}
                    {/* Unread badge */}
                    {conv.unreadCount > 0 && (
                      <span className="unread-badge" style={{
                        minWidth: 22, height: 22, borderRadius: 100, padding: "0 6px",
                        background: "linear-gradient(135deg,#ea580c,#f97316)",
                        color: "white", fontSize: 11, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}