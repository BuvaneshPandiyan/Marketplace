// Sell page loading skeleton — matches the new full-width SellWizard layout
export default function SellLoading() {
  return (
    <div style={{ background: "#f5f4f2", minHeight: "100vh" }}>
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
        .skw-l {
          background: linear-gradient(90deg, #eeede9 25%, #f5f4f2 37%, #eeede9 63%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        @media(prefers-reduced-motion:reduce){ .skw,.skw-l{ animation:none; background:#e8e7e5; } }
      `}</style>

      {/* Header bar skeleton */}
      <div style={{ background:"white", borderBottom:"1px solid #ebebeb", padding:"14px 0" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div className="skw" style={{ height:20, width:160, borderRadius:8, marginBottom:6 }} />
            <div className="skw-l" style={{ height:11, width:100, borderRadius:6 }} />
          </div>
          {/* Step bubbles */}
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            {[1,2,3,4,5].map((n, i) => (
              <div key={n} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div className={n === 1 ? "skw" : "skw-l"} style={{ width:30, height:30, borderRadius:"50%" }} />
                {i < 4 && <div className="skw-l" style={{ width:16, height:2, borderRadius:2 }} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content grid skeleton */}
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 24px 80px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:24, alignItems:"start" }}>

          {/* Main card */}
          <div style={{ background:"white", borderRadius:16, border:"1px solid #ebebeb", boxShadow:"0 2px 8px rgba(0,0,0,0.05)", padding:"28px 32px" }}>
            {/* Search bar */}
            <div className="skw" style={{ height:44, borderRadius:10, marginBottom:24 }} />

            {/* Section label */}
            <div className="skw-l" style={{ height:11, width:120, borderRadius:6, marginBottom:14 }} />

            {/* Category card grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10, marginBottom:24 }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="skw-l" style={{ borderRadius:12, height:80, animationDelay:`${i*50}ms` }} />
              ))}
            </div>

            {/* Divider */}
            <div className="skw-l" style={{ height:1, marginBottom:20 }} />

            {/* Sub-items */}
            <div className="skw-l" style={{ height:11, width:100, borderRadius:6, marginBottom:12 }} />
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skw-l" style={{ height:40, borderRadius:8, animationDelay:`${i*40}ms` }} />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ background:"white", borderRadius:16, border:"1px solid #ebebeb", padding:20 }}>
              <div className="skw" style={{ height:12, width:80, borderRadius:6, marginBottom:14 }} />
              <div className="skw-l" style={{ height:11, width:"100%", borderRadius:6, marginBottom:6 }} />
              <div className="skw-l" style={{ height:11, width:"85%", borderRadius:6, marginBottom:6 }} />
              <div className="skw-l" style={{ height:11, width:"70%", borderRadius:6 }} />
            </div>
            <div style={{ background:"linear-gradient(135deg,#fff7ed,#ffedd5)", borderRadius:16, border:"1px solid rgba(234,88,12,0.15)", padding:20 }}>
              <div className="skw" style={{ height:12, width:140, borderRadius:6, marginBottom:14, background:"rgba(234,88,12,0.2)" }} />
              {[1,2,3,4].map(i => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:24, height:24, borderRadius:6, background:"rgba(234,88,12,0.15)" }} />
                  <div className="skw-l" style={{ height:10, width:`${140 + i*10}px`, borderRadius:6 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}