/**
 * Loading skeleton for My Listings.
 *
 * A skeleton's only job is to reserve the shape of what's coming, so the real
 * page slots in without anything jumping. This one was drawn for the OLD page —
 * a bare toolbar and a grid — so once the head and stat tiles arrived it stopped
 * matching and the whole page lurched downward on load. Same structure now:
 * band, head, four tiles, toolbar, grid.
 */
export default function MyListingsLoading() {
  return (
    <div style={{ background: "#f5f4f2", minHeight: "100vh" }}>
      <style>{`
        @keyframes ml-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .mls {
          background: linear-gradient(90deg, #e8e7e5 25%, #f0efed 37%, #e8e7e5 63%);
          background-size: 200% 100%;
          animation: ml-shimmer 1.5s ease-in-out infinite;
          border-radius: 8px;
        }
        /* On the dark band, the shimmer has to be light-on-dark or it reads as a hole */
        .mls-on-band {
          background: linear-gradient(90deg, rgba(255,255,255,0.13) 25%, rgba(255,255,255,0.22) 37%, rgba(255,255,255,0.13) 63%);
          background-size: 200% 100%;
          animation: ml-shimmer 1.5s ease-in-out infinite;
          border-radius: 8px;
        }
        .mls-band {
          position: absolute; top: 0; left: 0; right: 0;
          height: 190px;
          background: linear-gradient(135deg, #1a0a00 0%, #7c2000 45%, #ea580c 100%);
          border-radius: 0 0 28px 28px;
          overflow: hidden;
        }
        @media (min-width: 640px) { .mls-band { height: 210px; } }
        .mls-band-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .mls-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }
        @media (min-width: 640px) { .mls-stats { grid-template-columns: repeat(4, 1fr); gap: 12px; } }
        .mls-stat {
          padding: 12px 13px; border-radius: 16px;
          border: 1.5px solid #f0f0f0; background: #fff;
        }
        .mls-grid {
          display: grid; gap: 12px;
          grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 640px)  { .mls-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; } }
        @media (min-width: 768px)  { .mls-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (min-width: 1024px) { .mls-grid { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 1280px) { .mls-grid { grid-template-columns: repeat(6, 1fr); } }
        .mls-card {
          border-radius: 16px; border: 1.5px solid #f0f0f0;
          background: #fff; overflow: hidden;
        }
        /* Matches MyListingCard's photo ratio — get this wrong and the grid jumps */
        .mls-photo { width: 100%; aspect-ratio: 1; }
        @media (prefers-reduced-motion: reduce) {
          .mls, .mls-on-band { animation: none; }
          .mls { background: #e8e7e5; }
          .mls-on-band { background: rgba(255,255,255,0.16); }
        }
      `}</style>

      <div
        className="mx-auto max-w-[1600px] px-4 md:px-8"
        style={{ paddingTop: 0, paddingBottom: 32, position: "relative" }}
      >
        <div className="mls-band" aria-hidden="true">
          <div className="mls-band-grid" />
        </div>

        {/* Head */}
        <div style={{ position: "relative", zIndex: 1, padding: "18px 0 4px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 16 }}>
            <div>
              <div className="mls-on-band" style={{ width: 190, height: 30, borderRadius: 10 }} />
              <div className="mls-on-band" style={{ width: 140, height: 12, marginTop: 9, borderRadius: 6 }} />
            </div>
            <div className="mls-on-band" style={{ width: 116, height: 40, borderRadius: 100, flexShrink: 0 }} />
          </div>

          {/* Four stat tiles */}
          <div className="mls-stats">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="mls-stat">
                <div className="mls" style={{ width: 26, height: 26, borderRadius: 8, marginBottom: 8 }} />
                <div className="mls" style={{ width: "45%", height: 22, borderRadius: 6 }} />
                <div className="mls" style={{ width: "70%", height: 9, borderRadius: 5, marginTop: 6 }} />
                <div className="mls" style={{ width: "55%", height: 9, borderRadius: 5, marginTop: 4 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0 12px" }}>
          <div className="mls" style={{ width: 96, height: 14, borderRadius: 6 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <div className="mls" style={{ width: 34, height: 34, borderRadius: 9 }} />
            <div className="mls" style={{ width: 34, height: 34, borderRadius: 9 }} />
            <div className="mls" style={{ width: 84, height: 34, borderRadius: 100 }} />
          </div>
        </div>

        {/* Grid */}
        <div className="mls-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="mls-card">
              <div className="mls-photo mls" style={{ borderRadius: 0 }} />
              <div style={{ padding: 12 }}>
                <div className="mls" style={{ width: "80%", height: 12, borderRadius: 6 }} />
                <div className="mls" style={{ width: "45%", height: 16, borderRadius: 6, marginTop: 10 }} />
                <div className="mls" style={{ width: "60%", height: 9, borderRadius: 5, marginTop: 9 }} />
                <div className="mls" style={{ width: "35%", height: 9, borderRadius: 5, marginTop: 5 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}