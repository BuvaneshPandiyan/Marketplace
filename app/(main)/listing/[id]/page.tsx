// Import Next.js's notFound helper for missing listings
import Link from "next/link";
import { notFound } from "next/navigation";
// Import Next.js's Metadata type for the dynamic metadata function
import type { Metadata } from "next";
// Import our server-side Supabase client creator
import { createClient } from "@/lib/supabase/server";
// Import all the sub-components this page assembles
import { PhotoCarousel } from "@/components/listing/PhotoCarousel";
import { ListingAttributesDisplay } from "@/components/listing/ListingAttributesDisplay";
import { SellerMiniProfile, VerifiedBadge } from "@/components/listing/SellerMiniProfile";
import { MapPreview } from "@/components/listing/MapPreview";
import { ShowNumberButton } from "@/components/listing/ShowNumberButton";
import { ChatWithSellerButton } from "@/components/listing/ChatWithSellerButton";
import { WishlistButton } from "@/components/listing/WishlistButton";
import { ListingDescription } from "@/components/listing/ListingDescription";
import { ReportButton } from "@/components/trust/ReportButton";
import { WhatsAppSellerButton } from "@/components/listing/WhatsAppSellerButton";
import { ListingCard } from "@/components/feed/ListingCard";
import type { QuestionSchema, FeedListingItem } from "@/types";
import { ListingBannerArt } from "@/components/listing/ListingBannerArt";

// generateMetadata — preserved exactly as-is
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("title, price, locality, listing_type, listing_photos(url, sort_order)")
    .eq("id", id)
    .eq("status", "active")
    .single();
  if (!listing) return { title: "Listing not found" };
  type PhotoRow = { url: string; sort_order: number };
  const photos = (listing.listing_photos as unknown as PhotoRow[]) ?? [];
  const coverUrl = photos.sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null;
  const priceFormatted = `₹${Number(listing.price).toLocaleString("en-IN")}${listing.listing_type === "rent" ? "/month" : ""}`;
  const description = `${priceFormatted} · ${listing.locality}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";
  const url = `${appUrl}/listing/${id}`;
  return {
    title: `${listing.title} — ${priceFormatted}`,
    description,
    openGraph: {
      title: listing.title, description, url, type: "website",
      ...(coverUrl ? { images: [{ url: coverUrl, width: 1200, height: 630, alt: listing.title }] } : {}),
    },
    twitter: {
      card: coverUrl ? "summary_large_image" : "summary",
      title: listing.title, description,
      ...(coverUrl ? { images: [coverUrl] } : {}),
    },
    alternates: { canonical: url },
  };
}

// Define the page component — data-fetching preserved exactly
export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch listing — query preserved exactly
  const { data: listing } = await supabase
    .from("listings")
    .select("*, listing_attributes(id, key, value), listing_photos(id, url, sort_order), product_types(name, question_schema)")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!listing) notFound();

  // Fetch seller — query preserved exactly
  const { data: seller } = await supabase
    .from("profiles")
    .select("id, name, profile_photo_url, rating_avg, rating_count, created_at, is_verified_seller")
    .eq("id", listing.seller_id)
    .single();

  // Extract photos — logic preserved exactly
  const photoUrls = (listing.listing_photos ?? [])
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    .map((p: { url: string }) => p.url);

  // Extract question schema — logic preserved exactly
  const questionSchema = (listing.product_types as { name: string; question_schema: QuestionSchema } | null)
    ?.question_schema ?? null;

  // Fetch related listings — same category, excluding current listing
  // Uses get_listings_far for simplicity (no location dependency)
  const { data: relatedRaw } = await supabase
    .rpc("get_listings_far", {
      p_lat: listing.lat,
      p_lng: listing.lng,
      p_radius_km: 0,
      p_category_id: null,
      p_limit: 14,
      p_offset: 0,
    });
  const relatedListings = ((relatedRaw ?? []) as FeedListingItem[])
    .filter((r: FeedListingItem) => r.id !== listing.id)
    .slice(0, 7);

  const isBuyer = user?.id !== listing.seller_id;
  const priceFormatted = `₹${Number(listing.price).toLocaleString("en-IN")}`;

  return (
    <div className="lst-page">

      {/* Button animation styles */}
      <style>{`
        /* ── Product page: PLUM / AUBERGINE theme ── */
        .lst-page { background: #faf9fb; }

        /* Banner */
        .lst-banner {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #2a0a2e 0%, #5b1a5e 52%, #9333a8 100%);
          -webkit-mask-image: linear-gradient(180deg, #000 84%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 84%, transparent 100%);
          padding: 30px 0 52px;
        }
        .lst-banner-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .lst-banner-glow {
          position: absolute; top: -110px; right: -50px;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, rgba(192,84,224,0.4) 0%, transparent 70%);
          animation: lst-breathe 9s ease-in-out infinite; pointer-events: none;
        }
        @keyframes lst-breathe { 0%,100%{transform:scale(1);opacity:0.85} 50%{transform:scale(1.14);opacity:1} }
        .lst-banner-inner {
          position: relative; z-index: 1;
          max-width: 1600px; margin: 0 auto; padding: 0 16px;
        }
        @media(min-width:768px){ .lst-banner-inner { padding: 0 32px; } }
        .lst-crumb {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; letter-spacing: -0.01em;
          color: rgba(255,255,255,0.7); text-decoration: none; margin-bottom: 14px;
          transition: color 160ms ease, transform 160ms ease;
        }
        .lst-crumb:hover { color: #fff; transform: translateX(-3px); }
        .lst-banner-title {
          font-size: clamp(24px, 4vw, 40px); font-weight: 900; letter-spacing: -0.045em;
          line-height: 1.05; color: #fff; margin: 0; max-width: 900px;
          text-shadow: 0 2px 20px rgba(0,0,0,0.4);
          animation: lst-rise 550ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes lst-rise { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .lst-banner-meta {
          display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
          margin-top: 14px; animation: lst-rise 550ms cubic-bezier(0.22,1,0.36,1) 100ms both;
        }
        .lst-banner-price {
          font-size: clamp(20px, 3vw, 28px); font-weight: 900; letter-spacing: -0.03em;
          color: #f0c4f5;
        }
        .lst-banner-price small { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.7); }
        .lst-chip {
          display: inline-flex; align-items: center; gap: 5px;
          font-size: 12px; font-weight: 700; letter-spacing: -0.01em;
          color: #fff; padding: 5px 12px; border-radius: 999px;
          background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        }
        .lst-body {
          max-width: 1600px; margin: -24px auto 0; padding: 0 16px 40px;
          position: relative; z-index: 1;
        }
        @media(min-width:768px){ .lst-body { padding: 0 32px 40px; } }
        .lst-card {
          background: #fff; border-radius: 22px; border: 1px solid #eee;
          box-shadow: 0 12px 44px rgba(0,0,0,0.06); padding: 24px;
          animation: lst-rise 600ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @media(min-width:768px){ .lst-card { padding: 32px; } }
        .lst-related-h {
          font-size: clamp(20px, 3vw, 26px); font-weight: 900; letter-spacing: -0.04em;
          color: #1c1917; margin: 0 0 14px;
        }
        .lst-related-h em { font-style: normal; color: #9333a8; }
        /* Detail section headings → Zomato weight */
        .lst-card h2:not(.lst-related-h) { letter-spacing: -0.03em; }

        /* Compact seller pill — desktop title area */
        .seller-mini-link {
          transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease;
          text-decoration: none;
        }
        @media (hover: hover) {
          .seller-mini-link:hover {
            transform: translateY(-1px);
            border-color: #fdba74;
            box-shadow: 0 4px 12px rgba(234,88,12,0.15);
          }
        }
        .seller-mini-link:active { transform: scale(0.97) !important; }
        @media (prefers-reduced-motion: reduce) {
          .seller-mini-link { transition-duration: 0ms !important; }
          .seller-mini-link:hover { transform: none !important; box-shadow: none !important; }
        }

        /* Primary CTA — Chat with Seller */
        .btn-primary {
          position: relative; overflow: hidden;
          transition: transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms ease;
        }
        .btn-primary::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
          transform: translateX(-100%); transition: transform 0s;
        }
        @media (hover: hover) {
          .btn-primary:hover { transform: scale(1.02); box-shadow: 0 8px 28px rgba(147,51,168,0.45); }
          .btn-primary:hover::after { transform: translateX(100%); transition: transform 0.4s ease; }
          /* Secondary buttons — subtle lift + orange tint */
          .btn-secondary:hover {
            border-color: #d8b4e0 !important;
            background: rgba(250,245,251,0.7) !important;
            transform: translateY(-1px);
          }
          /* Seller card */
          .seller-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.09); }
        }
        .btn-primary:active { transform: scale(0.97) !important; }
        .btn-secondary { transition: border-color 200ms ease, background 200ms ease, transform 200ms ease; }
        .btn-secondary:active { transform: scale(0.97); }
        .seller-card { transition: transform 200ms ease, box-shadow 200ms ease; }
        @media (prefers-reduced-motion: reduce) {
          .btn-primary, .btn-secondary, .seller-card { transition-duration: 0ms !important; }
          .btn-primary:hover, .btn-secondary:hover, .seller-card:hover { transform: none !important; box-shadow: none !important; }
        }
        /* Mobile sticky bar */
        @media (min-width: 1024px) { .mobile-action-bar { display: none !important; } }
      `}</style>

      {/* ── BANNER: item name + plum band + masked fade ── */}
      <div className="lst-banner">
        <ListingBannerArt src="/images/listing-header.png" />
        <div className="lst-banner-grid" aria-hidden="true" />
        <div className="lst-banner-glow" aria-hidden="true" />
        <div className="lst-banner-inner">
          <Link href="/" className="lst-crumb">← Back to listings</Link>
          <h1 className="lst-banner-title">{listing.title}</h1>
          <div className="lst-banner-meta">
            <span className="lst-banner-price">
              {priceFormatted}
              {listing.listing_type === "rent" && <small> /month</small>}
            </span>
            <span className="lst-chip">📍 {listing.locality}</span>
            <span className="lst-chip">{listing.condition === "new" ? "✨ New" : "♻️ Used"}</span>
            <span className="lst-chip">{listing.listing_type === "sale" ? "For sale" : "For rent"}</span>
          </div>
        </div>
      </div>

      <div className="lst-body">
        <div className="lst-card">

      {/* ── HERO GRID ── photo left, desktop-right-column right ── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[640px_minmax(0,1fr)] lg:gap-10">

        {/* Left: sticky photo gallery — single unified carousel for all breakpoints */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <PhotoCarousel photoUrls={photoUrls} />
        </div>

        {/* ══ DESKTOP RIGHT COLUMN — hidden on mobile ══
            Fix 1: only compact seller card (top-right, labeled "Seller") — no duplicate below
            Fix 4: Description moved here, immediately after Details
            Fix 5: compact horizontal button row
        ══════════════════════════════════════════════ */}
        <div className="hidden flex-col gap-5 lg:flex">

          {/* Title row: title left, "Seller" label + compact pill right */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold leading-tight text-neutral-900">{listing.title}</h1>
              </div>

              {/* Fix 3: "Seller" label aligned over the seller's name (not the avatar) */}
              {seller && (
                <div className="hidden lg:flex lg:flex-col lg:items-start" style={{ width: "fit-content" }}>
                  <span
                    className="mb-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400"
                    style={{ paddingLeft: 44 }}
                  >
                    Seller
                  </span>
                  <Link
                    href={`/seller/${listing.seller_id}`}
                    className="seller-mini-link flex shrink-0 items-center gap-2.5 rounded-full border border-neutral-200 py-1.5 pl-1.5 pr-4"
                  >
                    {seller.profile_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={seller.profile_photo_url} alt={seller.name ?? "Seller"} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
                        {seller.name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="flex items-center gap-1 text-sm font-medium text-neutral-900">
                        {seller.name ?? "Seller"}
                        {(seller.is_verified_seller ?? false) && <VerifiedBadge className="h-3.5 w-3.5" />}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {(seller.rating_count ?? 0) > 0
                          ? `★ ${(seller.rating_avg ?? 0).toFixed(1)} (${seller.rating_count})`
                          : "No ratings yet"}
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-neutral-400">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
            <p className="mt-2 text-2xl font-extrabold text-neutral-900">
              {priceFormatted}
              {listing.listing_type === "rent" && <span className="ml-1 text-base font-normal text-neutral-500">/mo</span>}
            </p>
            <p className="mt-1.5 text-sm text-neutral-500">
              📍 {listing.locality} &middot; {listing.condition === "new" ? "New" : "Used"} &middot;{" "}
              {listing.listing_type === "sale" ? "For sale" : "For rent"}
            </p>
          </div>

          {/* Details card */}
          {(listing.listing_attributes ?? []).length > 0 && (
            <div className="rounded-xl border border-neutral-200 p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">Details</h2>
              <ListingAttributesDisplay attributes={listing.listing_attributes ?? []} schema={questionSchema} />
            </div>
          )}

          {/* Fix 4: Description with line-clamp + Show more modal */}
          {listing.description && (
            <ListingDescription description={listing.description} />
          )}

          {/* Fix 5: Compact horizontal button row */}
          {isBuyer && (
            <div className="flex gap-3">
              <div className="flex-1">
                <ChatWithSellerButton listingId={listing.id} isLoggedIn={!!user} isOwnListing={!isBuyer} size="compact" />
              </div>
              <div className="flex-1">
                <ShowNumberButton listingId={listing.id} isLoggedIn={!!user} size="compact" />
              </div>
              <div className="flex-1">
                <WishlistButton listingId={listing.id} currentPrice={Number(listing.price)} isLoggedIn={!!user} size="compact" />
              </div>
            </div>
          )}

          {/* Report */}
          {isBuyer && (
            <div className="flex justify-end">
              <ReportButton targetType="listing" targetId={listing.id} isLoggedIn={!!user} />
            </div>
          )}
        </div>
      </div>

      {/* ══ MOBILE CONTENT BLOCK — lg:hidden ══
          Correct mobile order: title → details → description → seller → buttons → map
          Each section is its own full-width block in normal document flow. */}
      <div className="flex flex-col gap-5 lg:hidden">

        {/* 1. Title + price + location */}
        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight text-neutral-900">{listing.title}</h1>
          <p className="mt-2 text-2xl font-extrabold text-neutral-900">
            {priceFormatted}
            {listing.listing_type === "rent" && <span className="ml-1 text-base font-normal text-neutral-500">/mo</span>}
          </p>
          <p className="mt-1.5 text-sm text-neutral-500">
            📍 {listing.locality} &middot; {listing.condition === "new" ? "New" : "Used"} &middot;{" "}
            {listing.listing_type === "sale" ? "For sale" : "For rent"}
          </p>
        </div>

        {/* 2. Details card */}
        {(listing.listing_attributes ?? []).length > 0 && (
          <div className="rounded-xl border border-neutral-200 p-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">Details</h2>
            <ListingAttributesDisplay attributes={listing.listing_attributes ?? []} schema={questionSchema} />
          </div>
        )}

        {/* 3. Description */}
        {listing.description && (
          <ListingDescription description={listing.description} />
        )}

        {/* 4. Seller info */}
        {seller && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-neutral-700">Seller</h2>
            <div className="seller-card rounded-xl">
              <SellerMiniProfile
                name={seller.name}
                profilePhotoUrl={seller.profile_photo_url}
                ratingAvg={seller.rating_avg ?? 0}
                ratingCount={seller.rating_count ?? 0}
                memberSince={seller.created_at}
                isVerified={seller.is_verified_seller ?? false}
                sellerId={listing.seller_id}
              />
            </div>
          </div>
        )}

        {/* 5. Action buttons — full-width, stacked, in normal document flow */}
        {isBuyer && (
          <div className="flex flex-col gap-2.5">
            <div className="btn-primary rounded-full">
              <ChatWithSellerButton listingId={listing.id} isLoggedIn={!!user} isOwnListing={!isBuyer} />
            </div>
            <div className="btn-secondary rounded-full">
              <ShowNumberButton listingId={listing.id} isLoggedIn={!!user} />
            </div>
            <div className="btn-secondary rounded-full">
              <WishlistButton listingId={listing.id} currentPrice={Number(listing.price)} isLoggedIn={!!user} />
            </div>
          </div>
        )}

        {/* Report */}
        {isBuyer && (
          <div className="flex justify-end">
            <ReportButton targetType="listing" targetId={listing.id} isLoggedIn={!!user} />
          </div>
        )}

        {/* 6. Map + view exact location */}
        <div>
          <h2 className="mb-3 text-lg font-bold text-neutral-900">Location</h2>
          <MapPreview lat={listing.lat} lng={listing.lng} listingId={listing.id} />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            View exact location
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </a>
        </div>
      </div>

      {/* ── BELOW HERO: desktop-only full-width sections ── */}

      {/* Description — desktop only: already rendered in right column above.
          Hidden here to avoid duplication. Mobile has it in the mobile block. */}

      {/* Location map — desktop only */}
      <section className="mt-10 hidden lg:block">
        <h2 className="mb-3 text-lg font-bold text-neutral-900">Location</h2>
        <MapPreview lat={listing.lat} lng={listing.lng} listingId={listing.id} />
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${listing.lat},${listing.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          View exact location
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M7 17L17 7M7 7h10v10" />
          </svg>
        </a>
      </section>
      </div>{/* /.lst-card */}

      {/* Related listings — shown on all breakpoints */}
      {relatedListings.length > 0 && (
        <section className="mb-8 mt-10">
          <h2 className="lst-related-h">You may also <em>like</em></h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7 lg:gap-6">
            {relatedListings.map((item, i) => (
              <ListingCard key={item.id} listing={item} index={i} />
            ))}
          </div>
        </section>
      )}

      </div>{/* /.lst-body */}

      {/* Floating "WhatsApp seller" — fetches the number through reveal_seller_phone
          on click, so it's never present in this page's HTML. Logged-out visitors
          still see it; tapping it opens the auth gate, same as the phone button. */}
      <WhatsAppSellerButton
        listingId={listing.id}
        title={listing.title}
        priceFormatted={priceFormatted}
        isOwnListing={!isBuyer}
      />

    </div>
  );
}