/**
 * Wishlist loading skeleton.
 *
 * Mirrors the real page (app/(main)/wishlist/page.tsx): teal band, head, three
 * frosted stat tiles, list heading, then a grid of feed-shaped cards. The old
 * skeleton still matched the pre-teal design — grey, square cards, no band — so
 * it flashed the wrong layout for a beat before the real page swapped in. Getting
 * the band height and grid columns identical is what stops the page jumping.
 */
export default function WishlistLoading() {
  return (
    <div style={{ background: "#f5f4f2", minHeight: "100vh" }}>
      <style>{`
        @keyframes wl-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .wls {
          background: linear-gradient(90deg, #e8e7e5 25%, #f0efed 37%, #e8e7e5 63%);
          background-size: 200% 100%; animation: wl-shimmer 1.5s ease-in-out infinite; border-radius: 8px;
        }
        /* Light-on-dark shimmer for elements sitting on the teal band */
        .wls-on-band {
          background: linear-gradient(90deg, rgba(255,255,255,0.13) 25%, rgba(255,255,255,0.22) 37%, rgba(255,255,255,0.13) 63%);
          background-size: 200% 100%; animation: wl-shimmer 1.5s ease-in-out infinite; border-radius: 8px;
        }
        .wls-band {
          position: absolute; top: 0; left: 0; right: 0; height: 300px; overflow: hidden;
          background: linear-gradient(135deg, #042f2e 0%, #0f766e 45%, #14b8a6 100%);
          border-radius: 0 0 28px 28px;
          -webkit-mask-image: linear-gradient(180deg, #000 82%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 82%, transparent 100%);
        }
        @media (min-width: 640px) { .wls-band { height: 340px; } }
        .wls-band-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .wls-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }
        @media (min-width: 640px) { .wls-stats { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
        .wls-stat {
          padding: 13px 14px; border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.7);
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
          box-shadow: 0 10px 30px rgba(4,47,46,0.18);
        }
        .wls-grid { display: grid; gap: 12px; grid-template-columns: repeat(2, 1fr); }
        @media (min-width: 640px)  { .wls-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; } }
        @media (min-width: 768px)  { .wls-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1024px) { .wls-grid { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 1280px) { .wls-grid { grid-template-columns: repeat(6, 1fr); } }
        .wls-card { border-radius: 16px; border: 1.5px solid #f0f0f0; background: #fff; overflow: hidden; }
        /* Matches the feed card's 5:4 photo — wrong ratio makes the grid jump */
        .wls-photo { width: 100%; aspect-ratio: 5 / 4; }
        @media (prefers-reduced-motion: reduce) {
          .wls, .wls-on-band { animation: none; }
          .wls { background: #e8e7e5; }
          .wls-on-band { background: rgba(255,255,255,0.16); }
        }
      `}</style>

      <div className="mx-auto max-w-[1600px] px-4 md:px-8" style={{ paddingBottom: 40, position: "relative" }}>
        <div className="wls-band" aria-hidden="true"><div className="wls-band-grid" /></div>

        {/* Head */}
        <div style={{ position: "relative", zIndex: 1, padding: "18px 0 4px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 16 }}>
            <div>
              <div className="wls-on-band" style={{ width: 200, height: 30, borderRadius: 10 }} />
              <div className="wls-on-band" style={{ width: 150, height: 12, marginTop: 9, borderRadius: 6 }} />
            </div>
            <div className="wls-on-band" style={{ width: 140, height: 40, borderRadius: 100, flexShrink: 0 }} />
          </div>

          {/* Three stat tiles */}
          <div className="wls-stats">
            {[0, 1, 2].map((i) => (
              <div key={i} className="wls-stat">
                <div className="wls" style={{ width: 26, height: 26, borderRadius: 8, marginBottom: 8 }} />
                <div className="wls" style={{ width: "45%", height: 22, borderRadius: 6 }} />
                <div className="wls" style={{ width: "70%", height: 9, borderRadius: 5, marginTop: 6 }} />
                <div className="wls" style={{ width: "55%", height: 9, borderRadius: 5, marginTop: 4 }} />
              </div>
            ))}
          </div>
        </div>

        {/* List heading */}
        <div className="wls" style={{ width: 120, height: 14, borderRadius: 6, margin: "18px 0 14px" }} />

        {/* Grid */}
        <div className="wls-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="wls-card">
              <div className="wls-photo wls" style={{ borderRadius: 0 }} />
              <div style={{ padding: 12 }}>
                <div className="wls" style={{ width: "45%", height: 16, borderRadius: 6 }} />
                <div className="wls" style={{ width: "80%", height: 12, borderRadius: 6, marginTop: 9 }} />
                <div className="wls" style={{ width: "60%", height: 9, borderRadius: 5, marginTop: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}