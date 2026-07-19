/**
 * Sell page loading skeleton.
 *
 * Mirrors the sidebar SellWizard: tall cyan band with grid texture + a stepper
 * placeholder on the right, then the content card (search + category chip grid)
 * with the three sidebar cards. Same visual quality as the my-listings / wishlist
 * skeletons — band-height and gutters matched so nothing jumps when the real
 * wizard mounts.
 */
export default function SellLoading() {
  return (
    <div style={{ background: "#f5f4f2", minHeight: "100vh" }}>
      <style>{`
        @keyframes sk-shim { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
        .sk  { background:linear-gradient(90deg,#e6e5e2 25%,#efeeeb 37%,#e6e5e2 63%); background-size:200% 100%; animation:sk-shim 1.5s ease-in-out infinite; border-radius:10px; }
        /* Light-on-dark shimmer for anything sitting on the cyan band */
        .sk-b{ background:linear-gradient(90deg,rgba(255,255,255,0.14) 25%,rgba(255,255,255,0.26) 37%,rgba(255,255,255,0.14) 63%); background-size:200% 100%; animation:sk-shim 1.5s ease-in-out infinite; border-radius:10px; }

        .sk-band {
          position:absolute; top:0; left:0; right:0; height:230px; overflow:hidden;
          background:linear-gradient(135deg,#083344 0%,#155e75 45%,#0891b2 100%);
          -webkit-mask-image:linear-gradient(180deg,#000 84%,transparent 100%);
          mask-image:linear-gradient(180deg,#000 84%,transparent 100%);
        }
        .sk-band-grid {
          position:absolute; inset:0;
          background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size:28px 28px;
        }
        .sk-band-glow {
          position:absolute; top:-90px; right:-60px; width:260px; height:260px; border-radius:50%;
          background:radial-gradient(circle, rgba(6,182,212,0.45) 0%, transparent 70%);
        }

        .sk-wrap { position:relative; max-width:1600px; margin:0 auto; padding:0 16px 100px; }
        @media(min-width:768px){ .sk-wrap { padding:0 32px 100px; } }

        .sk-grid { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:28px; margin-top:-18px; }
        @media(max-width:860px){ .sk-grid { grid-template-columns:1fr; } .sk-side { display:none; } }

        .sk-card { background:#fff; border-radius:16px; border:1px solid #ececea; box-shadow:0 2px 12px rgba(0,0,0,0.05); padding:28px; }
        .sk-chips { display:grid; grid-template-rows:repeat(2,auto); grid-auto-flow:column; gap:16px 14px; overflow:hidden; padding:6px 2px; }
        .sk-tile { display:flex; flex-direction:column; align-items:center; gap:8px; }

        /* Frosted sidebar cards, cyan-bordered like the real ones */
        .sk-side-card {
          border-radius:14px; border:1.5px solid #cffafe; padding:18px;
          background:linear-gradient(135deg,#f6feff,#fbffff);
          box-shadow:0 4px 18px rgba(8,145,178,0.08);
        }
        @media(prefers-reduced-motion:reduce){ .sk,.sk-b { animation:none; background:#e6e5e2; } }
      `}</style>

      <div className="sk-wrap">
        <div className="sk-band" aria-hidden="true">
          <div className="sk-band-grid" />
          <div className="sk-band-glow" />
        </div>

        {/* Band: heading + step bubbles */}
        <div style={{ position: "relative", zIndex: 1, padding: "26px 0 44px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <div className="sk-b" style={{ width: 320, height: 32, borderRadius: 12 }} />
            <div className="sk-b" style={{ width: 160, height: 13, marginTop: 10 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="sk-b" style={{ width: 30, height: 30, borderRadius: "50%" }} />
                {i < 4 && <div className="sk-b" style={{ width: 26, height: 3, borderRadius: 2 }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Content: card + sidebar */}
        <div className="sk-grid">
          <div className="sk-card">
            {/* search bar */}
            <div className="sk" style={{ width: "100%", height: 54, borderRadius: 14 }} />
            {/* "choose a category" label */}
            <div className="sk" style={{ width: 150, height: 11, margin: "24px 0 16px" }} />
            {/* two rows of chips */}
            <div className="sk-chips">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="sk-tile">
                  <div className="sk" style={{ width: 58, height: 58, borderRadius: 19 }} />
                  <div className="sk" style={{ width: 50, height: 9 }} />
                </div>
              ))}
            </div>
            {/* "describe what you're selling" bar */}
            <div className="sk" style={{ width: "100%", height: 52, borderRadius: 12, marginTop: 28 }} />
          </div>

          {/* sidebar cards */}
          <div className="sk-side" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="sk-side-card">
              <div className="sk" style={{ width: 90, height: 10, marginBottom: 12 }} />
              <div className="sk" style={{ width: "100%", height: 10 }} />
              <div className="sk" style={{ width: "80%", height: 10, marginTop: 7 }} />
            </div>
            <div className="sk-side-card">
              <div className="sk" style={{ width: 100, height: 10, marginBottom: 14 }} />
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div className="sk" style={{ width: 16, height: 16, borderRadius: 5, flexShrink: 0 }} />
                  <div className="sk" style={{ width: `${72 - i * 8}%`, height: 9 }} />
                </div>
              ))}
            </div>
            <div className="sk-side-card">
              <div className="sk" style={{ width: 80, height: 10, marginBottom: 14 }} />
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div className="sk" style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0 }} />
                  <div className="sk" style={{ width: `${60 - i * 6}%`, height: 9 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}