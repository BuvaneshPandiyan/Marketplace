// My Listings loading — matches new toolbar (plain row) + uniform card grid
export default function MyListingsLoading() {
  return (
    <div style={{ background: "#f5f4f2" }}>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
        .skw {
          background: linear-gradient(90deg, #e8e7e5 25%, #f0efed 37%, #e8e7e5 63%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        .skw-light {
          background: linear-gradient(90deg, #f0efed 25%, #f7f6f4 37%, #f0efed 63%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        @media(prefers-reduced-motion:reduce){
          .skw,.skw-light { animation:none; background:#e8e7e5; }
        }
      `}</style>

      <div className="mx-auto max-w-[1400px] px-3 sm:px-6" style={{ paddingBottom: 32 }}>

        {/* ── Toolbar skeleton — matches the sticky clean bar with bottom border ── */}
        <div style={{ paddingTop: 14, paddingBottom: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, paddingBottom: 12, borderBottom: "2px solid #e5e7eb",
          }}>
            {/* Left: accent bar + title + count pill */}
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:3, height:20, borderRadius:100, background:"#e5e7eb" }} />
              <div className="skw" style={{ height:18, width:110, borderRadius:6 }} />
              <div className="skw-light" style={{ height:16, width:52, borderRadius:100 }} />
            </div>
            {/* Right: view buttons + filter */}
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div className="skw-light" style={{ width:32, height:32, borderRadius:8 }} />
              <div className="skw-light" style={{ width:32, height:32, borderRadius:8 }} />
              <div style={{ width:1, height:20, background:"#e5e7eb", margin:"0 2px" }} />
              <div className="skw-light" style={{ width:80, height:32, borderRadius:10 }} />
            </div>
          </div>
        </div>

        {/* 16px gap matching the real dashboard */}
        <div style={{ height: 16 }} />

        {/* ── Card grid skeleton — same breakpoints as real grid ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              borderRadius: 16,
              overflow: "hidden",
              background: "white",
              border: "1px solid #ebebeb",
              display: "flex",
              flexDirection: "column",
            }}>
              {/* Square photo — same aspect ratio as real card */}
              <div className="skw" style={{ aspectRatio:"1", width:"100%" }} />

              {/* Text area matching real card text layout */}
              <div style={{ padding:"10px 12px 12px", display:"flex", flexDirection:"column", flex:1 }}>
                {/* Title — 2 lines, fixed minHeight matches real card's 2.7em */}
                <div style={{ minHeight:"2.7em", marginBottom:4 }}>
                  <div className="skw" style={{ height:11, width:"85%", borderRadius:6, marginBottom:5 }} />
                  <div className="skw" style={{ height:11, width:"58%", borderRadius:6 }} />
                </div>
                {/* Price */}
                <div className="skw" style={{ height:14, width:"50%", borderRadius:6, marginTop:4, marginBottom:5 }} />
                {/* Product type */}
                <div className="skw-light" style={{ height:10, width:"65%", borderRadius:6, marginBottom:3 }} />
                {/* Date — pushed to bottom */}
                <div className="skw-light" style={{ height:9, width:"38%", borderRadius:6, marginTop:"auto", paddingTop:4 }} />
              </div>

              {/* Orange status bar at bottom (active listings) — shown on even cards */}
              {i % 3 === 0 && (
                <div style={{ height:3, background:"linear-gradient(90deg,#ea580c,#f97316)" }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}