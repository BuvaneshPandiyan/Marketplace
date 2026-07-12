// Wishlist loading skeleton — matches the new wishlist card style:
// square image, 2-line title area with fixed minHeight, price, location, date.
export default function WishlistLoading() {
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

      <div className="mx-auto max-w-[1400px] px-3 pt-5 pb-4 sm:px-6 sm:pt-7 sm:pb-8">

        {/* ── Page heading skeleton ── */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:20 }}>
          <div className="skw" style={{ height:26, width:160, borderRadius:8 }} />
          <div className="skw-light" style={{ height:18, width:54, borderRadius:100 }} />
        </div>

        {/* ── Card grid skeleton — mirrors the real grid breakpoints ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 lg:gap-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              borderRadius: 14,
              overflow: "hidden",
              background: "white",
              border: "1px solid #ebebeb",
              display: "flex",
              flexDirection: "column",
              /* Stagger so skeletons pulse in a wave */
              animationDelay: `${(i % 6) * 80}ms`,
            }}>
              {/* Square photo placeholder */}
              <div className="skw" style={{ aspectRatio:"1", width:"100%" }} />

              {/* Text area */}
              <div style={{ padding:"10px 12px 12px", display:"flex", flexDirection:"column", flex:1 }}>
                {/* Title — two lines with fixed minHeight matching the real card */}
                <div style={{ minHeight:"2.7em", marginBottom:6 }}>
                  <div className="skw" style={{ height:11, width:"88%", borderRadius:6, marginBottom:5 }} />
                  <div className="skw" style={{ height:11, width:"62%", borderRadius:6 }} />
                </div>

                {/* Price */}
                <div className="skw" style={{ height:14, width:"52%", borderRadius:6, marginBottom:5 }} />

                {/* Location */}
                <div className="skw-light" style={{ height:10, width:"70%", borderRadius:6, marginBottom:4 }} />

                {/* Date — pinned to bottom */}
                <div className="skw-light" style={{ height:9, width:"40%", borderRadius:6, marginTop:"auto", paddingTop:4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}