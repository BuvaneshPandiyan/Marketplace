// My Listings loading — matches the fixed gradient hero + horizontal stat row + grid
export default function MyListingsLoading() {
  return (
    <div style={{ minHeight: "100svh", background: "#f8f7f5" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .sk  { background:linear-gradient(90deg,#ffffff18 25%,#ffffff35 37%,#ffffff18 63%); background-size:200% 100%; animation:shimmer 1.8s ease-in-out infinite; border-radius:8px; }
        .skw { background:linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 37%,#e5e7eb 63%); background-size:200% 100%; animation:shimmer 1.6s ease-in-out infinite; border-radius:8px; }
        @media(prefers-reduced-motion:reduce){.sk,.skw{animation:none;background:#e5e7eb;}}
      `}</style>

      {/* Sticky gradient hero skeleton */}
      <div style={{ background: "linear-gradient(135deg,#1a0a00,#3d1500,#ea580c)", padding: "36px 16px 32px" }}>
        <div style={{ maxWidth: 1600, margin: "0 auto" }}>
          {/* Title row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <div className="sk" style={{ height: 10, width: 140, borderRadius: 100, marginBottom: 8 }} />
              <div className="sk" style={{ height: 36, width: 180, borderRadius: 8, marginBottom: 6 }} />
              <div className="sk" style={{ height: 10, width: 120, borderRadius: 100 }} />
            </div>
            <div className="sk" style={{ height: 38, width: 100, borderRadius: 100 }} />
          </div>
          {/* Stat cards — horizontal on mobile */}
          <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ flexShrink: 0, minWidth: 100, background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: "14px 16px" }}>
                <div className="sk" style={{ width: 32, height: 32, borderRadius: "50%", marginBottom: 10 }} />
                <div className="sk" style={{ height: 28, width: 40, borderRadius: 6, marginBottom: 6 }} />
                <div className="sk" style={{ height: 10, width: 60, borderRadius: 100 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "24px 16px" }}>
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {[55, 70, 60, 65].map((w, i) => (
            <div key={i} className="skw" style={{ height: 34, width: w, borderRadius: 100 }} />
          ))}
        </div>
        {/* Card grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 lg:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 16, overflow: "hidden", background: "white", border: "1px solid #ebebeb" }}>
              <div className="skw" style={{ aspectRatio: "1", width: "100%" }} />
              <div style={{ padding: "10px 12px 12px" }}>
                <div className="skw" style={{ height: 12, width: "75%", marginBottom: 8 }} />
                <div className="skw" style={{ height: 14, width: "50%", marginBottom: 6 }} />
                <div className="skw" style={{ height: 10, width: "40%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}