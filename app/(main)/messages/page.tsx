import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── DATA FETCHING — unchanged ──────────────────────────────────────────────
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
        : (conv.buyer  as unknown as ProfileShape);
      const listing    = conv.listings as unknown as ListingShape;
      const coverPhoto = (listing?.listing_photos ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
      const lastMessage = lastMessages?.[0] ?? null;
      const isSold      = listing?.status === "sold";

      return {
        id:               conv.id,
        listingTitle:     listing?.title ?? "Listing",
        isSold,
        coverPhoto,
        otherUserName:    otherUser?.name ?? "Unknown",
        otherUserPhotoUrl:otherUser?.profile_photo_url ?? null,
        lastMessageText:  lastMessage?.text ?? (lastMessage?.image_url ? "📷 Photo" : "No messages yet"),
        lastMessageAt:    lastMessage?.created_at ?? conv.created_at,
        lastMessageIsOwn: lastMessage?.sender_id === user.id,
        unreadCount:      unreadCount ?? 0,
      };
    })
  );

  enriched.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  const totalUnread = enriched.reduce((s, c) => s + c.unreadCount, 0);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: "#f5f4f2" }}>
      <style>{`
        /*
          msgs-head: sticky header
          Desktop: sticks at top:76px (just below the floating pill navbar that ends ~72px from top).
          Mobile:  sticks at top:0 — pill is at the BOTTOM on mobile, nothing is at the top,
                   so the header should pin flush to the viewport top with minimal breathing room.
        */
        .msgs-head {
          position: sticky;
          top: 76px;   /* desktop */
          z-index: 30;
          background: #f5f4f2;
          padding: 12px 0 10px;
          border-bottom: 1px solid #ebebeb;
          margin-bottom: 12px;
        }
        @media(max-width:639px){
          .msgs-head { top: 0 !important; padding-top: 14px; }
        }

        /* Row entrance stagger */
        @keyframes row-in {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .conv-row { animation: row-in 280ms cubic-bezier(0.22,1,0.36,1) both; }

        /* Row hover / press */
        .conv-link {
          display:flex; align-items:center; gap:14px;
          padding:14px 16px; text-decoration:none; color:inherit;
          border-radius:14px;
          transition: background 150ms ease, transform 150ms ease;
        }
        @media(hover:hover){
          .conv-link:hover { background: rgba(234,88,12,0.04); }
        }
        .conv-link:active { transform: scale(0.99); background: rgba(234,88,12,0.06); }

        /* Unread badge glow */
        @keyframes badge-glow {
          0%,100%{ box-shadow:0 0 0 0 rgba(234,88,12,0.35); }
          50%    { box-shadow:0 0 0 5px rgba(234,88,12,0); }
        }
        .unread-badge { animation: badge-glow 2.2s ease infinite; }

        @media(prefers-reduced-motion:reduce){
          .conv-row,.conv-link,.unread-badge {
            animation:none !important; transition:none !important;
          }
        }
      `}</style>

      {/*
        Outer wrapper: zero extra top padding — the layout's main padding-top:76px
        on desktop already provides the gap below the floating pill. On mobile,
        layout sets padding-top:0 and the sticky header's top:0 means it pins to
        the very top of the viewport with only the 14px header padding as breathing room.
      */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 12px 24px" }}>

        {/* ── STICKY CHATS HEADER ─────────────────────────────────────────── */}
        <div className="msgs-head">
          <h1 style={{
            margin: 0, display: "flex", alignItems: "center", gap: 10,
            fontSize: "clamp(18px,3vw,24px)", fontWeight: 800,
            color: "#111", letterSpacing: "-0.02em",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Chats
            {totalUnread > 0 && (
              <span style={{
                fontSize: 11, padding: "2px 10px", borderRadius: 100,
                background: "linear-gradient(135deg,#ea580c,#f97316)",
                color: "white", fontWeight: 700,
              }}>
                {totalUnread} new
              </span>
            )}
          </h1>
        </div>

        {/* ── EMPTY STATE ─────────────────────────────────────────────────── */}
        {enriched.length === 0 ? (
          <div style={{
            border: "2px dashed #e5e7eb", borderRadius: 16,
            padding: "60px 24px", textAlign: "center",
            background: "rgba(255,255,255,0.6)", maxWidth: 400, margin: "32px auto",
          }}>
            <div style={{ width:56, height:56, borderRadius:"50%", border:"2px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                stroke="#9ca3af" strokeWidth={1.5} strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p style={{ fontSize:15, fontWeight:700, color:"#374151", marginBottom:6 }}>No chats yet</p>
            <p style={{ fontSize:13, color:"#9ca3af", lineHeight:1.5 }}>
              Tap &ldquo;Chat with Seller&rdquo; on any listing to start a conversation.
            </p>
          </div>
        ) : (

          /* ── CONVERSATION LIST ────────────────────────────────────────────── */
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {enriched.map((conv, i) => (
              <div key={conv.id} className="conv-row"
                style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}>
                <Link href={`/messages/${conv.id}`} prefetch={true} className="conv-link"
                  style={{
                    background: conv.unreadCount > 0 ? "white" : "rgba(255,255,255,0.75)",
                    boxShadow: conv.unreadCount > 0
                      ? "0 2px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(234,88,12,0.08)"
                      : "0 1px 4px rgba(0,0,0,0.05)",
                  }}>

                  {/* ── Avatar ── */}
                  <div style={{ position:"relative", flexShrink:0 }}>
                    {conv.otherUserPhotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={conv.otherUserPhotoUrl} alt={conv.otherUserName}
                        style={{ width:50, height:50, borderRadius:"50%", objectFit:"cover", border:"2px solid #f3f4f6" }} />
                    ) : (
                      <div style={{ width:50, height:50, borderRadius:"50%", background:"linear-gradient(135deg,#ea580c,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:19, fontWeight:700, color:"white" }}>
                        {conv.otherUserName[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    {/* Online dot — visual only, not related to unread count */}
                    <div style={{ position:"absolute", bottom:1, right:1, width:10, height:10, borderRadius:"50%", background:"#22c55e", border:"2px solid white" }} />
                  </div>

                  {/* ── Text ── */}
                  <div style={{ flex:1, minWidth:0 }}>
                    {/* Row 1: name + timestamp */}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, marginBottom:3 }}>
                      <p style={{ fontSize:14, fontWeight: conv.unreadCount>0?700:600, color:"#111", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {conv.otherUserName}
                      </p>
                      <p style={{ fontSize:11, color:"#9ca3af", flexShrink:0, margin:0 }}>
                        {formatRelativeDate(conv.lastMessageAt)}
                      </p>
                    </div>

                    {/* Row 2: listing title + SOLD badge */}
                    <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                      <p style={{ fontSize:11, fontWeight:600, color: conv.isSold?"#6b7280":"#ea580c", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {conv.isSold ? "🏷️" : "🛍️"} {conv.listingTitle}
                      </p>
                      {conv.isSold && (
                        <span style={{
                          fontSize:9, padding:"1px 7px", borderRadius:100,
                          /* Matches Sold badge color established in MyListingCard */
                          background:"rgba(107,114,128,0.12)", color:"#6b7280",
                          fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", flexShrink:0
                        }}>
                          SOLD
                        </span>
                      )}
                    </div>

                    {/* Row 3: last message preview — single line, always truncated */}
                    <p style={{ fontSize:13, color: conv.unreadCount>0?"#374151":"#9ca3af", fontWeight: conv.unreadCount>0?500:400, margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {conv.lastMessageIsOwn && <span style={{ color:"#9ca3af" }}>You: </span>}
                      {conv.lastMessageText}
                    </p>
                  </div>

                  {/* ── Right: thumbnail + unread badge ── */}
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                    {conv.coverPhoto && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={conv.coverPhoto} alt={conv.listingTitle}
                        style={{ width:46, height:46, borderRadius:10, objectFit:"cover", border:"1px solid #e5e7eb", boxShadow:"0 1px 4px rgba(0,0,0,0.08)", opacity: conv.isSold?0.5:1 }} />
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="unread-badge" style={{
                        minWidth:20, height:20, borderRadius:100, padding:"0 5px",
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