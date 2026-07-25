// Skeleton for the seller profile page — mirrors the real layout so there's no jump.
export default function SellerLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
      <style>{`
        @keyframes slk-sh { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .slk { background: linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 37%,#e5e7eb 63%); background-size:200% 100%; animation: slk-sh 1.5s ease-in-out infinite; border-radius:12px; }
        @media(prefers-reduced-motion:reduce){ .slk { animation:none; } }
      `}</style>

      {/* Profile header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
        <div className="slk" style={{ width: 72, height: 72, borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="slk" style={{ width: 180, height: 24, marginBottom: 10 }} />
          <div className="slk" style={{ width: 120, height: 14 }} />
        </div>
      </div>

      {/* Listings heading */}
      <div className="slk" style={{ width: 200, height: 20, marginBottom: 16 }} />

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-7 lg:gap-6">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i}>
            <div className="slk" style={{ width: "100%", aspectRatio: "1/1", borderRadius: 14, marginBottom: 8 }} />
            <div className="slk" style={{ width: "80%", height: 12, marginBottom: 6 }} />
            <div className="slk" style={{ width: "50%", height: 12 }} />
          </div>
        ))}
      </div>
    </div>
  );
}