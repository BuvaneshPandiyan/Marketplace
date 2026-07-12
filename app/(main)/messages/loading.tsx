// Chats page loading skeleton — matches the new messages page style
export default function MessagesLoading() {
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
        .skw-light {
          background: linear-gradient(90deg, #eeede9 25%, #f5f4f2 37%, #eeede9 63%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
        @media(prefers-reduced-motion:reduce){
          .skw,.skw-light { animation:none; background:#e8e7e5; }
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 12px 80px" }}>

        {/* ── Sticky header skeleton ── */}
        <div style={{ paddingTop: 14, paddingBottom: 10, borderBottom: "1px solid #ebebeb", marginBottom: 12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div className="skw" style={{ width:22, height:22, borderRadius:6 }} />
            <div className="skw" style={{ width:80, height:22, borderRadius:7 }} />
            <div className="skw-light" style={{ width:52, height:20, borderRadius:100 }} />
          </div>
        </div>

        {/* ── Conversation row skeletons ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px",
              borderRadius: 14,
              background: i === 0 ? "white" : "rgba(255,255,255,0.75)",
              boxShadow: i === 0 ? "0 2px 12px rgba(0,0,0,0.07), 0 0 0 1px rgba(234,88,12,0.07)" : "0 1px 4px rgba(0,0,0,0.04)",
              animationDelay: `${i * 40}ms`,
            }}>
              {/* Avatar */}
              <div className="skw" style={{ width:50, height:50, borderRadius:"50%", flexShrink:0 }} />

              {/* Text block */}
              <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:6 }}>
                {/* Row 1: name + timestamp */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div className="skw" style={{ height:13, width: 80 + (i % 3) * 24, borderRadius:6 }} />
                  <div className="skw-light" style={{ height:10, width:40, borderRadius:6 }} />
                </div>
                {/* Row 2: listing name */}
                <div className="skw-light" style={{ height:10, width: 100 + (i % 4) * 20, borderRadius:6 }} />
                {/* Row 3: last message preview */}
                <div className="skw-light" style={{ height:11, width: `${55 + (i % 5) * 8}%`, borderRadius:6 }} />
              </div>

              {/* Right: thumbnail + badge */}
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
                <div className="skw" style={{ width:46, height:46, borderRadius:10 }} />
                {i < 2 && (
                  <div className="skw" style={{ width:20, height:20, borderRadius:100 }} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}