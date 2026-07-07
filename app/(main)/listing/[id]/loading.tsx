// Shimmer skeleton for /listing/[id] — shown by Next.js while the Server Component fetches data.
// Layout matches the real page exactly (same container, same grid, same column widths)
// so there is zero layout shift when real content replaces it.
export default function ListingDetailLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
      <style>{`
        /* Shimmer animation — the sweep moves left-to-right across each skeleton block */
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .skeleton {
          background: linear-gradient(
            90deg,
            #e5e7eb 25%,
            #f3f4f6 37%,
            #e5e7eb 63%
          );
          background-size: 200% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
          border-radius: 8px;
        }
        /* Respect reduced-motion: drop the sweep, keep the neutral gray */
        @media (prefers-reduced-motion: reduce) {
          .skeleton {
            animation: none;
            background: #e5e7eb;
          }
        }
      `}</style>

      {/* Two-column hero — same grid as the real page so dimensions match on load */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[560px_minmax(0,1fr)] lg:gap-10">

        {/* Gallery skeleton — same aspect ratio and cap as the real PhotoCarousel */}
        <div className="skeleton aspect-[4/3] w-full" style={{ maxHeight: 520 }} />

        {/* Content column skeleton */}
        <div className="flex flex-col gap-4 pt-1">
          {/* Title */}
          <div className="skeleton h-8 w-3/4" />
          {/* Price */}
          <div className="skeleton h-7 w-1/3" />
          {/* Locality · condition · type */}
          <div className="skeleton h-4 w-1/2" />

          {/* Details card */}
          <div className="skeleton h-40 w-full" style={{ borderRadius: 12 }} />

          {/* Action buttons */}
          <div className="skeleton h-11 w-full" style={{ borderRadius: 100 }} />
          <div className="skeleton h-11 w-full" style={{ borderRadius: 100 }} />
          <div className="skeleton h-11 w-full" style={{ borderRadius: 100 }} />

          {/* Seller card */}
          <div className="flex items-center gap-3 rounded-xl border border-neutral-100 p-4">
            <div className="skeleton h-14 w-14 shrink-0" style={{ borderRadius: "50%" }} />
            <div className="flex flex-1 flex-col gap-2">
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-3 w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Below-hero sections */}
      <div className="mt-10 flex flex-col gap-10">
        {/* Description section */}
        <div>
          <div className="skeleton mb-3 h-6 w-32" />
          <div className="flex flex-col gap-2">
            <div className="skeleton h-4 w-full max-w-3xl" />
            <div className="skeleton h-4 w-4/5 max-w-3xl" />
            <div className="skeleton h-4 w-3/5 max-w-3xl" />
          </div>
        </div>

        {/* Map section */}
        <div>
          <div className="skeleton mb-3 h-6 w-24" />
          <div className="skeleton w-full" style={{ height: 256, borderRadius: 16 }} />
        </div>

        {/* Related listings section */}
        <div>
          <div className="skeleton mb-3 h-6 w-40" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7 lg:gap-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="skeleton aspect-square w-full" style={{ borderRadius: 12 }} />
                <div className="skeleton h-3 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}