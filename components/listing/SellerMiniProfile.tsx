// No "use client" — pure display component
import Link from "next/link";

type SellerMiniProfileProps = {
  name: string | null;
  profilePhotoUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  memberSince: string;
  isVerified: boolean;
  // Optional sellerId — when provided the card links to the seller's public profile
  sellerId?: string;
};

// Shared SVG verified badge — used in both the compact and full card
export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Verified seller"
    >
      <circle cx="12" cy="12" r="10" fill="#3b82f6" />
      <path d="M8 12l3 3 5-5" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SellerMiniProfile({
  name, profilePhotoUrl, ratingAvg, ratingCount, memberSince, isVerified, sellerId,
}: SellerMiniProfileProps) {
  const memberSinceYear = new Date(memberSince).getFullYear();

  const content = (
    <div className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      {/* Avatar with verified badge overlay */}
      <div className="relative shrink-0">
        {profilePhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profilePhotoUrl} alt={name ?? "Seller"} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-xl font-bold text-neutral-600">
            {name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        {isVerified && (
          <VerifiedBadge className="absolute bottom-0 right-0 h-5 w-5 ring-2 ring-white rounded-full" />
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-neutral-900">{name ?? "Seller"}</p>
        <p className="flex items-center gap-1 text-xs text-neutral-500">
          {ratingCount > 0 ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth={1}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>{ratingAvg.toFixed(1)}</span>
              <span className="text-neutral-400">({ratingCount})</span>
            </>
          ) : (
            "No ratings yet"
          )}
        </p>
        <p className="text-xs text-neutral-400">Member since {memberSinceYear}</p>
      </div>
    </div>
  );

  // If a sellerId is provided, wrap the whole card in a Link
  if (sellerId) {
    return (
      <Link href={`/seller/${sellerId}`} style={{ textDecoration: "none", display: "block" }}>
        {content}
      </Link>
    );
  }

  return content;
}