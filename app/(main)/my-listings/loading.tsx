// My Listings dashboard loading skeleton
export default function MyListingsLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f5" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .sk { background: linear-gradient(90deg,#ffffff22 25%,#ffffff44 37%,#ffffff22 63%); background-size: 200% 100%; animation: shimmer 1.8s ease-in-out infinite; border-radius: 8px; }
        .sk-white { background: linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 37%,#e5e7eb 63%); background-size: 200% 100%; animation: shimmer 1.6s ease-in-out infinite; border-radius: 8px; }
        @media (prefers-reduced-motion: reduce) { .sk,.sk-white { animation: none; background: #e5e7eb; } }
      `}</style>

      {/* Hero gradient skeleton */}
      <div style={{ background: "linear-gradient(135deg,#1a0a00,#3d1500,#ea580c)", padding: "36px 16px 32px" }}>
        <div className="mx-auto max-w-[1600px]">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div>
              <div className="sk h-3 w-36 mb-3" style={{ borderRadius: 100 }} />
              <div className="sk h-9 w-48 mb-2" />
              <div className="sk h-3 w-32" style={{ borderRadius: 100 }} />
            </div>
            <div className="sk h-10 w-24" style={{ borderRadius: 100 }} />
          </div>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10 }}>
            {[1,2,3,4].map((i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.18)", padding: "14px 16px" }}>
                <div className="sk h-9 w-9 mb-3" style={{ borderRadius: "50%" }} />
                <div className="sk h-8 w-12 mb-2" />
                <div className="sk h-3 w-20" style={{ borderRadius: 100 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="mx-auto max-w-[1600px] px-4 md:px-8" style={{ paddingTop: 24 }}>
        {/* Filter tabs skeleton */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[60,80,65,70].map((w, i) => (
            <div key={i} className="sk-white h-9" style={{ width: w, borderRadius: 100 }} />
          ))}
        </div>
        {/* Card grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6 lg:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ borderRadius: 16, overflow: "hidden", background: "white", border: "1px solid #ebebeb" }}>
              <div className="sk-white aspect-square w-full" />
              <div style={{ padding: "10px 12px 12px" }}>
                <div className="sk-white h-3 w-3/4 mb-1.5" />
                <div className="sk-white h-4 w-1/2 mb-1" />
                <div className="sk-white h-3 w-2/3 mb-1" />
                <div className="sk-white h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}