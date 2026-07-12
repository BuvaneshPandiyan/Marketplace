// Import Next.js helpers
import { redirect } from "next/navigation";
// Import Next.js's Link for navigation
import Link from "next/link";
// Import our server-side Supabase client
import { createClient } from "@/lib/supabase/server";
// Import our relative date formatter
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";

// The /wishlist page — an async Server Component
export default async function WishlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── DATA FETCHING — unchanged ──────────────────────────────────────────────
  const { data: entries } = await supabase
    .from("wishlist")
    .select("id, price_at_save, created_at, listings(id, title, price, status, locality, listing_type, listing_photos(url, sort_order))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  type WishlistDisplayEntry = {
    wishlistId: string;
    listingId: string;
    title: string;
    currentPrice: number;
    priceAtSave: number;
    status: string;
    locality: string;
    listingType: string;
    coverPhotoUrl: string | null;
    savedAt: string;
    badge: "available" | "sold" | "price_drop";
  };

  const displayEntries: WishlistDisplayEntry[] = (entries ?? []).map((entry) => {
    type ListingShape = {
      id: string; title: string; price: number; status: string;
      locality: string; listing_type: string;
      listing_photos: { url: string; sort_order: number }[];
    };
    const listing = entry.listings as unknown as ListingShape | null;
    const currentPrice = Number(listing?.price ?? entry.price_at_save);
    const priceAtSave  = Number(entry.price_at_save);

    let badge: WishlistDisplayEntry["badge"] = "available";
    if (listing?.status === "sold" || listing?.status === "removed") badge = "sold";
    else if (currentPrice < priceAtSave * 0.95) badge = "price_drop";

    const coverPhotoUrl =
      (listing?.listing_photos ?? [])
        .sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;

    return {
      wishlistId: entry.id,
      listingId:  listing?.id ?? "",
      title:      listing?.title ?? "Listing",
      currentPrice,
      priceAtSave,
      status:      listing?.status ?? "active",
      locality:    listing?.locality ?? "",
      listingType: listing?.listing_type ?? "sale",
      coverPhotoUrl,
      savedAt: entry.created_at,
      badge,
    };
  });

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[1400px] px-3 pt-5 pb-4 sm:px-6 sm:pt-7 sm:pb-8">

      <style>{`
        /* ── Card entrance — stagger via inline animation-delay ── */
        @keyframes wl-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .wl-card {
          animation: wl-in 320ms ease both;
          border-radius: 14px;
          border: 1px solid #e5e7eb;
          background: white;
          overflow: hidden;
          display: flex; flex-direction: column;
          height: 100%;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          transition: box-shadow 300ms ease, transform 300ms ease;
          cursor: pointer;
        }

        /* ── Hover: lift + glow (desktop pointer only) ── */
        @media(hover:hover){
          .wl-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 32px rgba(0,0,0,0.10), 0 0 0 1px rgba(234,88,12,0.08),
                        0 0 28px rgba(234,88,12,0.18);
          }
          .wl-card:hover .wl-img   { transform: scale(1.06); }
          .wl-card:hover .wl-title { color: #ea580c; }
          .wl-card:hover .wl-heart { transform: scale(1.12); }
        }

        /* ── Active tap feedback (touch) ── */
        .wl-card:active { transform: scale(0.97); }

        /* ── Image zoom (contained) ── */
        .wl-img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 350ms ease;
          display: block;
        }

        .wl-title {
          transition: color 200ms ease;
        }

        .wl-heart {
          transition: transform 200ms ease;
        }

        /* ── Respect prefers-reduced-motion ── */
        @media(prefers-reduced-motion:reduce){
          .wl-card, .wl-img, .wl-title, .wl-heart {
            animation: none !important;
            transition: none !important;
          }
          .wl-card:hover { transform: none; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
        }
      `}</style>

      {/* ── PAGE HEADING ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20, display:"flex", alignItems:"baseline", gap:10 }}>
        <h1 style={{ fontSize: "clamp(18px,3vw,24px)", fontWeight: 800, color:"#111", margin:0, letterSpacing:"-0.02em" }}>
          Saved Listings
        </h1>
        {displayEntries.length > 0 && (
          <span style={{ fontSize:13, color:"#9ca3af", fontWeight:500 }}>
            {displayEntries.length} saved
          </span>
        )}
      </div>

      {/* ── EMPTY STATE ───────────────────────────────────────────────────── */}
      {displayEntries.length === 0 && (
        <div style={{
          border: "2px dashed #e5e7eb", borderRadius: 16,
          padding: "64px 24px", textAlign:"center",
          background:"#fafafa",
          maxWidth: 400, margin:"40px auto",
        }}>
          <div style={{ width:56, height:56, borderRadius:"50%", border:"2px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5} strokeLinecap="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <p style={{ fontSize:15, fontWeight:700, color:"#374151", marginBottom:6 }}>
            Nothing saved yet
          </p>
          <p style={{ fontSize:13, color:"#9ca3af", marginBottom:20, lineHeight:1.5 }}>
            Tap the ♡ on any listing to save it here for later.
          </p>
          <Link href="/" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"9px 20px", borderRadius:8, background:"linear-gradient(135deg,#ea580c,#f97316)", color:"white", fontWeight:600, fontSize:13, textDecoration:"none" }}>
            Browse listings
          </Link>
        </div>
      )}

      {/* ── GRID ──────────────────────────────────────────────────────────── */}
      {displayEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-5">
          {displayEntries.map((entry, i) => (
            <Link
              key={entry.wishlistId}
              href={`/listing/${entry.listingId}`}
              className="wl-card"
              style={{
                textDecoration: "none", color: "inherit",
                /* Staggered entrance: each card delayed by 45ms */
                animationDelay: `${Math.min(i * 45, 400)}ms`,
              }}
            >
              {/* ── Photo ── */}
              <div style={{ position:"relative", aspectRatio:"1", width:"100%", overflow:"hidden", background:"#f3f4f6", flexShrink:0 }}>
                {entry.coverPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.coverPhotoUrl} alt={entry.title} className="wl-img" />
                ) : (
                  <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                  </div>
                )}

                {/* ── Badge: frosted glass, colored dot ── */}
                <span style={{
                  position: "absolute", top: 8, right: 8,
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "3px 9px 3px 7px", borderRadius: 100,
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
                  fontSize: 10, fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.14)",
                  color: entry.badge === "sold" ? "#6b7280"
                       : entry.badge === "price_drop" ? "#16a34a"
                       : "#374151",
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: entry.badge === "sold"       ? "#9ca3af"
                               : entry.badge === "price_drop" ? "#16a34a"
                               : "#22c55e",
                  }} />
                  {entry.badge === "sold"       ? "Sold"
                 : entry.badge === "price_drop" ? "Price ↓"
                 : "Available"}
                </span>

                {/* ── Heart icon (top-left) ── */}
                <div className="wl-heart" style={{ position:"absolute", top:8, left:8, width:28, height:28, borderRadius:"50%", background:"rgba(255,255,255,0.9)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 1px 4px rgba(0,0,0,0.12)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#ea580c" stroke="#ea580c" strokeWidth={2} strokeLinecap="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                </div>
              </div>

              {/* ── Text content ── */}
              <div style={{ padding:"10px 10px 10px", display:"flex", flexDirection:"column", flex:1 }}>
                {/* Title — clamp to 2 lines, reserve space so all cards same height */}
                <p className="wl-title" style={{
                  fontSize: 13, fontWeight: 600, color:"#111",
                  margin: 0, marginBottom: 4,
                  display: "-webkit-box", WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical", overflow: "hidden",
                  minHeight: "2.6em", lineHeight: "1.3em",
                }}>
                  {entry.title}
                </p>

                {/* Price */}
                <p style={{ fontSize:13, fontWeight:700, color:"#111", margin:"0 0 2px" }}>
                  ₹{entry.currentPrice.toLocaleString("en-IN")}
                  {entry.listingType === "rent" && (
                    <span style={{ fontWeight:400, color:"#9ca3af", fontSize:11 }}>/mo</span>
                  )}
                </p>

                {/* Price drop */}
                {entry.badge === "price_drop" && (
                  <p style={{ fontSize:11, color:"#16a34a", margin:"0 0 2px", fontWeight:500 }}>
                    Was ₹{entry.priceAtSave.toLocaleString("en-IN")}
                  </p>
                )}

                {/* Location + saved date — pushed to bottom */}
                <div style={{ marginTop:"auto", paddingTop: 4 }}>
                  {entry.locality && (
                    <p style={{ fontSize:11, color:"#9ca3af", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {entry.locality}
                    </p>
                  )}
                  <p style={{ fontSize:10, color:"#d1d5db", margin:"2px 0 0" }}>
                    Saved {formatRelativeDate(entry.savedAt)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}