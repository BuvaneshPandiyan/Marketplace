import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── DATA FETCHING — single query per resource, no N+1 loops ──────────────
  const { data: conversations } = await supabase
    .from("conversations")
    .select(`
      id, listing_id, buyer_id, seller_id, created_at,
      listings(title, status, listing_photos(url, sort_order)),
      buyer:profiles!conversations_buyer_id_fkey(id, name, profile_photo_url),
      seller:profiles!conversations_seller_id_fkey(id, name, profile_photo_url)
    `)
    .order("created_at", { ascending: false });

  const convIds = (conversations ?? []).map(c => c.id);

  // Bulk fetch last message per conversation (one query instead of N)
  const { data: lastMsgs } = convIds.length ? await supabase
    .from("messages")
    .select("conversation_id, text, image_url, created_at, read, sender_id")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false }) : { data: [] };

  type MsgRow = { conversation_id: string; text: string | null; image_url: string | null; created_at: string; read: boolean; sender_id: string; };

  // Build a map: conversationId → last message
  const lastMsgMap: Record<string, MsgRow> = {};
  const unreadMap:  Record<string, number> = {};
  for (const msg of lastMsgs ?? []) {
    if (!lastMsgMap[msg.conversation_id]) lastMsgMap[msg.conversation_id] = msg;
    if (!msg.read && msg.sender_id !== user.id) {
      unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] ?? 0) + 1;
    }
  }

  type ProfileShape = { id: string; name: string | null; profile_photo_url: string | null } | null;
  type ListingShape = { title: string; status: string; listing_photos: { url: string; sort_order: number }[] } | null;

  const enriched = (conversations ?? []).map(conv => {
    const otherUser  = conv.buyer_id === user.id
      ? (conv.seller as unknown as ProfileShape)
      : (conv.buyer  as unknown as ProfileShape);
    const listing    = conv.listings as unknown as ListingShape;
    const coverPhoto = (listing?.listing_photos ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
    const lastMessage = lastMsgMap[conv.id] ?? null;

    return {
      id:               conv.id,
      listingTitle:     listing?.title ?? "Listing",
      isSold:           listing?.status === "sold",
      coverPhoto,
      otherUserName:    otherUser?.name ?? "Unknown",
      otherUserPhotoUrl:otherUser?.profile_photo_url ?? null,
      lastMessageText:  lastMessage?.text ?? (lastMessage?.image_url ? "📷 Photo" : "No messages yet"),
      lastMessageAt:    lastMessage?.created_at ?? conv.created_at,
      lastMessageIsOwn: lastMessage?.sender_id === user.id,
      unreadCount:      unreadMap[conv.id] ?? 0,
    };
  });

  enriched.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  const totalUnread = enriched.reduce((s, c) => s + c.unreadCount, 0);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#f5f4f2" }}>
      <style>{`
        .msgs-head {
          position: sticky;
          top: 76px;
          z-index: 30;
          background: #f5f4f2;
          padding: 14px 0 10px;
          border-bottom: 1px solid #ebebeb;
          margin-bottom: 10px;
        }
        @media(max-width:639px){
          .msgs-head { top: 0 !important; padding-top: 14px; }
        }

        @keyframes row-in {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .conv-row { animation: row-in 260ms cubic-bezier(0.22,1,0.36,1) both; }

        .conv-link {
          display:flex; align-items:center; gap:14px;
          padding:14px 16px; text-decoration:none; color:inherit;
          border-radius:14px;
          transition: background 150ms ease, transform 140ms ease, box-shadow 150ms ease;
        }
        @media(hover:hover){
          .conv-link:hover { background: white !important; box-shadow: 0 4px 18px rgba(0,0,0,0.09) !important; transform: translateY(-1px); }
        }
        .conv-link:active { transform: scale(0.99); }

        @keyframes badge-glow {
          0%,100%{ box-shadow:0 0 0 0 rgba(234,88,12,0.35); }
          50%    { box-shadow:0 0 0 5px rgba(234,88,12,0); }
        }
        .unread-badge { animation: badge-glow 2.2s ease infinite; }

        @media(prefers-reduced-motion:reduce){
          .conv-row,.conv-link,.unread-badge { animation:none!important; transition:none!important; }
          .conv-link:hover { transform:none!important; }
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 12px 80px" }}>

        {/* ── STICKY HEADER ── */}
        <div className="msgs-head">
          <h1 style={{
            margin: 0, display:"flex", alignItems:"center", gap:10,
            fontSize:"clamp(18px,3vw,22px)", fontWeight:800, color:"#111", letterSpacing:"-0.02em",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity:0.7 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chats
            {totalUnread > 0 && (
              <span style={{
                fontSize:11, padding:"3px 10px", borderRadius:100,
                background:"linear-gradient(135deg,#ea580c,#f97316)",
                color:"white", fontWeight:700,
              }}>
                {totalUnread} new
              </span>
            )}
          </h1>
        </div>

        {/* ── EMPTY STATE ── */}
        {enriched.length === 0 ? (
          <div style={{
            border:"2px dashed #e5e7eb", borderRadius:16,
            padding:"56px 24px", textAlign:"center",
            background:"rgba(255,255,255,0.5)", maxWidth:380, margin:"32px auto",
          }}>
            <div style={{ width:56, height:56, borderRadius:"50%", border:"2px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p style={{ fontSize:15, fontWeight:700, color:"#374151", marginBottom:6 }}>No chats yet</p>
            <p style={{ fontSize:13, color:"#9ca3af", lineHeight:1.5 }}>
              Tap &ldquo;Chat with Seller&rdquo; on any listing to start a conversation.
            </p>
          </div>

        ) : (
          /* ── CONVERSATION LIST ── */
          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
            {enriched.map((conv, i) => (
              <div key={conv.id} className="conv-row"
                style={{ animationDelay:`${Math.min(i*40,300)}ms` }}>
                <Link href={`/messages/${conv.id}`} prefetch={true} className="conv-link"
                  style={{
                    background: conv.unreadCount > 0 ? "white" : "rgba(255,255,255,0.7)",
                    boxShadow: conv.unreadCount > 0
                      ? "0 2px 10px rgba(0,0,0,0.06), 0 0 0 1px rgba(234,88,12,0.07)"
                      : "0 1px 3px rgba(0,0,0,0.04)",
                  }}>

                  {/* Avatar */}
                  <div style={{ position:"relative", flexShrink:0 }}>
                    {conv.otherUserPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={conv.otherUserPhotoUrl} alt={conv.otherUserName}
                        style={{ width:50, height:50, borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(0,0,0,0.06)" }} />
                    ) : (
                      <div style={{ width:50, height:50, borderRadius:"50%", background:"linear-gradient(135deg,#ea580c,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, fontWeight:700, color:"white" }}>
                        {conv.otherUserName[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div style={{ position:"absolute", bottom:1, right:1, width:10, height:10, borderRadius:"50%", background:"#22c55e", border:"2px solid white" }} />
                  </div>

                  {/* Text content */}
                  <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:3 }}>
                    {/* Row 1: name + time */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                      <p style={{ fontSize:14, fontWeight: conv.unreadCount>0 ? 800 : 600, color:"#0f0f0f", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {conv.otherUserName}
                      </p>
                      <p style={{ fontSize:11, color:"#b0b0b0", flexShrink:0, margin:0 }}>
                        {formatRelativeDate(conv.lastMessageAt)}
                      </p>
                    </div>

                    {/* Row 2: listing chip */}
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{
                        display:"inline-flex", alignItems:"center", gap:4,
                        fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:100,
                        background: conv.isSold ? "rgba(107,114,128,0.1)" : "rgba(234,88,12,0.08)",
                        color: conv.isSold ? "#6b7280" : "#ea580c",
                        maxWidth:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                      }}>
                        {conv.isSold ? "🏷️ " : "🛍️ "}
                        {conv.listingTitle}
                        {conv.isSold && " · SOLD"}
                      </span>
                    </div>

                    {/* Row 3: last message */}
                    <p style={{
                      fontSize:13, margin:0,
                      color: conv.unreadCount>0 ? "#374151" : "#9ca3af",
                      fontWeight: conv.unreadCount>0 ? 500 : 400,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                    }}>
                      {conv.lastMessageIsOwn && <span style={{ color:"#b0b0b0" }}>You: </span>}
                      {conv.lastMessageText}
                    </p>
                  </div>

                  {/* Right: photo + unread */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                    {conv.coverPhoto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={conv.coverPhoto} alt={conv.listingTitle}
                        style={{ width:46, height:46, borderRadius:10, objectFit:"cover", border:"1px solid rgba(0,0,0,0.06)", opacity: conv.isSold ? 0.45 : 1 }} />
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="unread-badge" style={{
                        minWidth:20, height:20, borderRadius:100, padding:"0 6px",
                        background:"linear-gradient(135deg,#ea580c,#f97316)",
                        color:"white", fontSize:10, fontWeight:800,
                        display:"flex", alignItems:"center", justifyContent:"center",
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