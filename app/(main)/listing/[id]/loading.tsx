// Skeleton for /listing/[id] — shown while the Server Component fetches.
// Mirrors the real layout (plum banner + two columns) so there's no layout shift.
export default function ListingDetailLoading() {
  return (
    <div style={{ background: "#faf9fb", minHeight: "100vh" }}>
      <style>{`
        @keyframes lsk-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .lsk {
          background: linear-gradient(90deg, #ece7f0 25%, #f6f2f9 37%, #ece7f0 63%);
          background-size: 200% 100%; animation: lsk-shimmer 1.5s ease-in-out infinite;
          border-radius: 12px;
        }
        .lsk-dark {
          background: linear-gradient(90deg, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.16) 37%, rgba(255,255,255,0.08) 63%);
          background-size: 200% 100%; animation: lsk-shimmer 1.5s ease-in-out infinite;
          border-radius: 999px;
        }
        .lsk-banner {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #2a0a2e 0%, #5b1a5e 52%, #9333a8 100%);
          -webkit-mask-image: linear-gradient(180deg, #000 84%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 84%, transparent 100%);
          padding: 26px 0 44px;
        }
        .lsk-banner-inner { max-width: 1600px; margin: 0 auto; padding: 0 16px; }
        @media(min-width:768px){ .lsk-banner-inner { padding: 0 32px; } }
        .lsk-body { max-width: 1600px; margin: -24px auto 0; padding: 0 16px 40px; position: relative; z-index: 1; }
        @media(min-width:768px){ .lsk-body { padding: 0 32px 40px; } }
        .lsk-card { background: #fff; border-radius: 22px; border: 1px solid #eee; box-shadow: 0 12px 44px rgba(0,0,0,0.06); padding: 24px; }
        @media(min-width:768px){ .lsk-card { padding: 32px; } }
        .lsk-grid { display: grid; grid-template-columns: 1fr; gap: 32px; }
        @media(min-width:1024px){ .lsk-grid { grid-template-columns: 500px minmax(0,1fr); gap: 32px; align-items: start; } }
        .lsk-photo { aspect-ratio: 1/1; width: 100%; border-radius: 20px; }
        @media(min-width:1024px){ .lsk-photo { aspect-ratio: 4/3; } }
        .lsk-thumbs { display: flex; gap: 8px; margin-top: 12px; }
        .lsk-thumb { width: 60px; height: 60px; border-radius: 12px; }
        .lsk-map { height: 220px; width: 100%; border-radius: 16px; margin-top: 20px; }
        .lsk-row { display: flex; gap: 12px; }
      `}</style>

      {/* Banner */}
      <div className="lsk-banner">
        <div className="lsk-banner-inner">
          <div className="lsk-dark" style={{ width: 120, height: 14, marginBottom: 16 }} />
          <div className="lsk-dark" style={{ width: "min(60%, 460px)", height: 34, borderRadius: 10, marginBottom: 14 }} />
          <div className="lsk-row">
            <div className="lsk-dark" style={{ width: 90, height: 24 }} />
            <div className="lsk-dark" style={{ width: 130, height: 24 }} />
            <div className="lsk-dark" style={{ width: 70, height: 24 }} />
          </div>
        </div>
      </div>

      <div className="lsk-body">
        <div className="lsk-card">
          <div className="lsk-grid">
            {/* Left: photo + thumbs + map */}
            <div>
              <div className="lsk lsk-photo" />
              <div className="lsk-thumbs">
                {[0, 1, 2, 3].map((i) => <div key={i} className="lsk lsk-thumb" />)}
              </div>
              <div className="lsk lsk-map" />
            </div>

            {/* Right: buttons + seller + details + description */}
            <div>
              <div className="lsk-row" style={{ marginBottom: 20 }}>
                <div className="lsk" style={{ flex: 1, height: 44, borderRadius: 999 }} />
                <div className="lsk" style={{ flex: 1, height: 44, borderRadius: 999 }} />
                <div className="lsk" style={{ flex: 1, height: 44, borderRadius: 999 }} />
              </div>
              <div className="lsk" style={{ width: 80, height: 16, marginBottom: 10 }} />
              <div className="lsk" style={{ width: 220, height: 56, borderRadius: 999, marginBottom: 24 }} />
              <div className="lsk" style={{ width: 80, height: 16, marginBottom: 10 }} />
              <div className="lsk" style={{ width: "100%", height: 120, borderRadius: 16, marginBottom: 24 }} />
              <div className="lsk" style={{ width: 120, height: 16, marginBottom: 10 }} />
              <div className="lsk" style={{ width: "100%", height: 14, marginBottom: 8 }} />
              <div className="lsk" style={{ width: "92%", height: 14, marginBottom: 8 }} />
              <div className="lsk" style={{ width: "70%", height: 14 }} />
            </div>
          </div>

          {/* Related */}
          <div style={{ marginTop: 40 }}>
            <div className="lsk" style={{ width: 200, height: 24, marginBottom: 16 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }} className="lsk-related">
              {[0, 1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="lsk" style={{ width: "100%", aspectRatio: "1/1", borderRadius: 14, marginBottom: 8 }} />
                  <div className="lsk" style={{ width: "80%", height: 12, marginBottom: 6 }} />
                  <div className="lsk" style={{ width: "50%", height: 12 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}