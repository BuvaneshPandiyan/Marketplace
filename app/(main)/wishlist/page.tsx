import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WishlistCard, type WishlistCardEntry } from "@/components/wishlist/WishlistCard";
import { BannerArt } from "@/components/ui/BannerArt";

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: entries } = await supabase
    .from("wishlist")
    .select("id, price_at_save, created_at, listings(id, title, price, status, locality, listing_type, listing_photos(url, sort_order))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const displayEntries: WishlistCardEntry[] = (entries ?? []).map((entry) => {
    type ListingShape = {
      id: string; title: string; price: number; status: string;
      locality: string; listing_type: string;
      listing_photos: { url: string; sort_order: number }[];
    };
    const listing = entry.listings as unknown as ListingShape | null;
    const currentPrice = Number(listing?.price ?? entry.price_at_save);
    const priceAtSave  = Number(entry.price_at_save);
    let badge: WishlistCardEntry["badge"] = "available";
    if (listing?.status === "sold" || listing?.status === "removed") badge = "sold";
    else if (currentPrice < priceAtSave * 0.95) badge = "price_drop";
    const coverPhotoUrl =
      (listing?.listing_photos ?? []).sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
    return {
      wishlistId: entry.id,
      listingId:  listing?.id ?? "",
      title:      listing?.title ?? "Listing",
      currentPrice, priceAtSave,
      status:      listing?.status ?? "active",
      locality:    listing?.locality ?? "",
      listingType: listing?.listing_type ?? "sale",
      coverPhotoUrl,
      savedAt: entry.created_at,
      badge,
    };
  });

  const total = displayEntries.length;
  const drops = displayEntries.filter((e) => e.badge === "price_drop").length;
  const sold  = displayEntries.filter((e) => e.badge === "sold").length;
  const live  = total - sold;

  return (
    <div style={{ background: "#f5f4f2", minHeight: "100vh" }}>
      <style>{`
        /* ── Teal hero band ──
           The wishlist is a saved / kept space, so it runs on teal rather than the
           site orange — calmer, and clearly a different room of the same house.
           Same band mechanics as my-listings: gradient, grid, breathing glow,
           masked bottom so it fades into the page with no hard line. */
        .wp-band {
          position: absolute; top: 0; left: 0; right: 0;
          height: 300px; overflow: hidden; pointer-events: none;
          background: linear-gradient(135deg, #042f2e 0%, #0f766e 45%, #14b8a6 100%);
          border-radius: 0 0 28px 28px;
          -webkit-mask-image: linear-gradient(180deg, #000 82%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 82%, transparent 100%);
        }
        @media (min-width: 640px) { .wp-band { height: 340px; } }
        .wp-band-art {
          position: absolute; inset: 0; opacity: 0.4;
          -webkit-mask-image: linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.55) 40%, #000 85%);
          mask-image: linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.55) 40%, #000 85%);
          animation: wp-art-in 900ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes wp-art-in { from { opacity: 0; transform: scale(1.08); } }
        .wp-band-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .wp-band-glow {
          position: absolute; top: -110px; right: -70px;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(20,184,166,0.5) 0%, transparent 70%);
          animation: wp-breathe 9s ease-in-out infinite;
        }
        @keyframes wp-breathe { 0%,100% { transform: scale(1); opacity: 0.85; } 50% { transform: scale(1.14); opacity: 1; } }

        .wp-head { position: relative; z-index: 1; padding: 18px 0 4px; }
        @media (min-width: 640px) { .wp-head { padding: 26px 0 6px; } }
        .wp-head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 16px; }

        .wp-h1 {
          font-size: 24px; font-weight: 900; letter-spacing: -0.045em; line-height: 1.1;
          color: #fff; margin: 0;
        }
        @media (min-width: 640px)  { .wp-h1 { font-size: 30px; } }
        @media (min-width: 1024px) { .wp-h1 { font-size: 34px; } }
        .wp-h1 em { font-style: normal; color: #5eead4; position: relative; }
        .wp-h1 em::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 4px;
          border-radius: 4px; background: rgba(94,234,212,0.45);
          transform-origin: left; animation: wp-underline 620ms cubic-bezier(0.22,1,0.36,1) 220ms both;
        }
        @keyframes wp-underline { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .wp-h1-sub { font-size: 12.5px; font-weight: 700; letter-spacing: -0.02em; color: rgba(255,255,255,0.72); margin: 5px 0 0; }
        @media (min-width: 640px) { .wp-h1-sub { font-size: 13.5px; } }

        .wp-cta {
          flex-shrink: 0; display: inline-flex; align-items: center; gap: 7px;
          padding: 11px 17px; border-radius: 100px;
          background: #fff; color: #0f766e; text-decoration: none;
          font-size: 13.5px; font-weight: 900; letter-spacing: -0.025em;
          box-shadow: 0 6px 20px rgba(0,0,0,0.25);
          transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 240ms ease;
        }
        @media (hover: hover) { .wp-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.32); } .wp-cta:hover svg { transform: translateX(2px); } }
        .wp-cta:active { transform: scale(0.95); }
        .wp-cta svg { transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1); }
        @media (max-width: 419px) { .wp-cta-t { display: none; } .wp-cta { padding: 11px; } }

        /* Frosted stat tiles over the band, teal-tinted */
        .wp-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }
        @media (min-width: 640px) { .wp-stats { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
        .wp-stat {
          position: relative; overflow: hidden; display: flex; flex-direction: column;
          padding: 13px 14px; border-radius: 18px;
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(16px) saturate(1.4); -webkit-backdrop-filter: blur(16px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: 0 10px 30px rgba(4,47,46,0.18), inset 0 1px 0 rgba(255,255,255,0.6);
          animation: wp-stat-in 460ms cubic-bezier(0.22,1,0.36,1) both;
          transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 240ms ease;
        }
        .wp-stat:nth-child(2) { animation-delay: 60ms; }
        .wp-stat:nth-child(3) { animation-delay: 120ms; }
        @keyframes wp-stat-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @media (hover: hover) { .wp-stat:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(4,47,46,0.26), inset 0 1px 0 rgba(255,255,255,0.6); } .wp-stat:hover .wp-stat-ico { transform: scale(1.12) rotate(-6deg); } }
        .wp-stat-ico {
          width: 26px; height: 26px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
          margin-bottom: 8px; color: #fff; flex-shrink: 0;
          transition: transform 260ms cubic-bezier(0.34,1.56,0.64,1);
        }
        .wp-stat--teal  .wp-stat-ico { background: linear-gradient(135deg,#0d9488,#14b8a6); box-shadow: 0 2px 8px rgba(13,148,136,0.4); }
        .wp-stat--green .wp-stat-ico { background: linear-gradient(135deg,#16a34a,#22c55e); box-shadow: 0 2px 8px rgba(34,197,94,0.35); }
        .wp-stat--grey  .wp-stat-ico { background: linear-gradient(135deg,#57534e,#78716c); box-shadow: 0 2px 8px rgba(87,83,78,0.3); }
        .wp-stat::before { content: ''; position: absolute; top: -14px; right: -14px; width: 60px; height: 60px; border-radius: 50%; opacity: 0.12; pointer-events: none; }
        .wp-stat--teal::before  { background: #0d9488; }
        .wp-stat--green::before { background: #16a34a; }
        .wp-stat--grey::before  { background: #57534e; }
        .wp-stat-v { font-size: 22px; font-weight: 900; letter-spacing: -0.05em; color: #042f2e; line-height: 1; font-variant-numeric: tabular-nums; }
        @media (min-width: 640px) { .wp-stat-v { font-size: 26px; } }
        .wp-stat-l { font-size: 9.5px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin-top: 4px; }
        .wp-stat-s { font-size: 10.5px; font-weight: 600; color: #9ca3af; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* Grid — matches the home feed / my-listings column counts */
        .wp-grid { display: grid; gap: 12px; grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 640px)  { .wp-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; } }
        @media (min-width: 768px)  { .wp-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1024px) { .wp-grid { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 1280px) { .wp-grid { grid-template-columns: repeat(6, 1fr); } }

        .wp-listhead { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 900; letter-spacing: -0.03em; color: #1a1a1a; margin: 4px 0 14px; }
        .wp-listhead::before { content: ''; width: 4px; height: 16px; border-radius: 4px; background: linear-gradient(180deg,#0d9488,#14b8a6); }
        .wp-listhead em { font-style: normal; color: #9ca3af; font-weight: 700; }

        /* Empty state */
        .wp-empty { text-align: center; padding: 30px 24px 60px; display: flex; flex-direction: column; align-items: center; }
        .wp-empty-badge {
          width: 64px; height: 64px; border-radius: 20px; display: flex; align-items: center; justify-content: center;
          font-size: 30px; margin-bottom: 16px; background: #f0fdfa; border: 1.5px solid #99f6e4;
          animation: wp-float 3.4s ease-in-out infinite;
        }
        @keyframes wp-float { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
        .wp-empty-h { font-size: 22px; font-weight: 900; letter-spacing: -0.04em; color: #1a1a1a; margin: 0 0 7px; }
        @media (min-width: 640px) { .wp-empty-h { font-size: 26px; } }
        .wp-empty-s { font-size: 13.5px; font-weight: 500; line-height: 1.55; color: #6b7280; max-width: 34ch; margin: 0 auto 22px; }
        .wp-empty-cta {
          display: inline-flex; align-items: center; gap: 7px; padding: 12px 22px; border-radius: 100px;
          background: linear-gradient(135deg,#0d9488,#14b8a6); color: #fff; text-decoration: none;
          font-size: 14px; font-weight: 900; letter-spacing: -0.025em; box-shadow: 0 6px 20px rgba(13,148,136,0.42);
          transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 240ms ease;
        }
        @media (hover: hover) { .wp-empty-cta:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(13,148,136,0.55); } .wp-empty-cta:hover svg { transform: translateX(3px); } }
        .wp-empty-cta svg { transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1); }

        @media (prefers-reduced-motion: reduce) {
          .wp-band-art, .wp-band-glow, .wp-stat, .wp-empty-badge, .wp-h1 em::after { animation: none !important; }
          .wp-cta, .wp-stat, .wp-empty-cta, .wp-stat-ico { transition: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-[1600px] px-4 md:px-8" style={{ paddingBottom: 40, position: "relative" }}>
        {/* Hero band */}
        <div className="wp-band" aria-hidden="true">
          <BannerArt variant="glass" tint="#5eead4" tint2="#0d9488" id="wishlist" />
          <div className="wp-band-grid" />
          <div className="wp-band-glow" />
        </div>

        {/* Head */}
        <div className="wp-head">
          <div className="wp-head-row">
            <div>
              <h1 className="wp-h1">Your <em>wishlist</em></h1>
              <p className="wp-h1-sub">
                {total === 0 ? "Nothing saved yet" : `${live} available · ${drops} price drop${drops === 1 ? "" : "s"} · ${sold} sold`}
              </p>
            </div>
            <Link href="/" className="wp-cta">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              <span className="wp-cta-t">Browse listings</span>
            </Link>
          </div>

          {total > 0 && (
            <div className="wp-stats">
              <div className="wp-stat wp-stat--teal">
                <span className="wp-stat-ico" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg></span>
                <span className="wp-stat-v">{total}</span>
                <span className="wp-stat-l">Saved</span>
                <span className="wp-stat-s">{live} still available</span>
              </div>
              <div className="wp-stat wp-stat--green">
                <span className="wp-stat-ico" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg></span>
                <span className="wp-stat-v">{drops}</span>
                <span className="wp-stat-l">Price drops</span>
                <span className="wp-stat-s">{drops > 0 ? "Cheaper than saved" : "None yet"}</span>
              </div>
              <div className="wp-stat wp-stat--grey">
                <span className="wp-stat-ico" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></span>
                <span className="wp-stat-v">{sold}</span>
                <span className="wp-stat-l">Sold</span>
                <span className="wp-stat-s">{sold > 0 ? "No longer available" : "All still up"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {total === 0 && (
          <div className="wp-empty">
            <div className="wp-empty-badge" aria-hidden="true">💚</div>
            <p className="wp-empty-h">Nothing saved yet</p>
            <p className="wp-empty-s">Tap the heart on any listing and it lands here — we&apos;ll even tell you when the price drops.</p>
            <Link href="/" className="wp-empty-cta">
              Start browsing
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
          </div>
        )}

        {/* Grid */}
        {total > 0 && (
          <>
            <p className="wp-listhead">Saved items <em>{total}</em></p>
            <div className="wp-grid">
              {displayEntries.map((entry, i) => (
                <WishlistCard key={entry.wishlistId} entry={entry} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}