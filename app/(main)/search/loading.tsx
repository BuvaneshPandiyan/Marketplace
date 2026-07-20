// Search results loading skeleton — mirrors the ruby banner + card layout.
export default function SearchLoading() {
  return (
    <div style={{ background: "#fbf7f8", minHeight: "100vh" }}>
      <style>{`
        @keyframes ssk-sh { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .ssk { background: linear-gradient(90deg,#f0e4e7 25%,#f8eef1 37%,#f0e4e7 63%); background-size:200% 100%; animation: ssk-sh 1.5s ease-in-out infinite; border-radius:12px; }
        .ssk-d { background: linear-gradient(90deg,rgba(255,255,255,0.08) 25%,rgba(255,255,255,0.16) 37%,rgba(255,255,255,0.08) 63%); background-size:200% 100%; animation: ssk-sh 1.5s ease-in-out infinite; border-radius:999px; }
        .ssk-banner {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #3d0714 0%, #8b0e2a 52%, #cf1338 100%);
          -webkit-mask-image: linear-gradient(180deg,#000 84%,transparent 100%); mask-image: linear-gradient(180deg,#000 84%,transparent 100%);
          padding: 30px 0 52px;
        }
        .ssk-inner { max-width:1600px; margin:0 auto; padding:0 16px; }
        @media(min-width:768px){ .ssk-inner { padding:0 32px; } }
        .ssk-body { max-width:1600px; margin:-24px auto 0; padding:0 16px 40px; position:relative; z-index:1; }
        @media(min-width:768px){ .ssk-body { padding:0 32px 40px; } }
        .ssk-card { background:#fff; border-radius:22px; border:1px solid #f1e5e8; box-shadow:0 12px 44px rgba(0,0,0,0.06); padding:24px; }
        @media(min-width:768px){ .ssk-card { padding:32px; } }
        @media(prefers-reduced-motion:reduce){ .ssk,.ssk-d { animation:none; } }
      `}</style>

      <div className="ssk-banner">
        <div className="ssk-inner">
          <div className="ssk-d" style={{ width: 90, height: 24, marginBottom: 14 }} />
          <div className="ssk-d" style={{ width: "min(55%,420px)", height: 36, borderRadius: 10, marginBottom: 12 }} />
          <div className="ssk-d" style={{ width: 150, height: 16 }} />
        </div>
      </div>

      <div className="ssk-body">
        <div className="ssk-card">
          {/* Filter chips */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24, overflow: "hidden" }}>
            {[90, 120, 100, 110, 95].map((w, i) => (
              <div key={i} className="ssk" style={{ width: w, height: 36, borderRadius: 100, flexShrink: 0 }} />
            ))}
          </div>
          {/* Results grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7 lg:gap-6">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i}>
                <div className="ssk" style={{ aspectRatio: "1/1", width: "100%", borderRadius: 12, marginBottom: 8 }} />
                <div className="ssk" style={{ height: 12, width: "80%", marginBottom: 6 }} />
                <div className="ssk" style={{ height: 12, width: "50%" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}