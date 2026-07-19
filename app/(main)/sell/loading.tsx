/**
 * Sell page loading skeleton — mirrors the sidebar SellWizard layout (band +
 * content card with category chips + sidebar cards). Shown by Next while the
 * route segment loads; the wizard's own in-component skeleton takes over for the
 * client-side category fetch, and the two match so there's no jump.
 */
export default function SellLoading() {
  return (
    <div style={{ background: "#f5f4f2", minHeight: "100vh" }}>
      <style>{`
        @keyframes sk-shim { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
        .sk  { background:linear-gradient(90deg,#e8e7e5 25%,#f0efed 37%,#e8e7e5 63%); background-size:200% 100%; animation:sk-shim 1.5s ease-in-out infinite; border-radius:10px; }
        .sk-b{ background:linear-gradient(90deg,rgba(255,255,255,0.13) 25%,rgba(255,255,255,0.22) 37%,rgba(255,255,255,0.13) 63%); background-size:200% 100%; animation:sk-shim 1.5s ease-in-out infinite; border-radius:10px; }
        .sk-band { position:absolute; top:0; left:0; right:0; height:150px; background:linear-gradient(135deg,#083344 0%,#155e75 45%,#0891b2 100%); -webkit-mask-image:linear-gradient(180deg,#000 84%,transparent 100%); mask-image:linear-gradient(180deg,#000 84%,transparent 100%); }
        .sk-grid { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:28px; margin-top:-18px; }
        @media(max-width:860px){ .sk-grid { grid-template-columns:1fr; } .sk-side { display:none; } }
        @media(prefers-reduced-motion:reduce){ .sk,.sk-b { animation:none; background:#e8e7e5; } }
      `}</style>

      <div style={{ position: "relative", maxWidth: 1600, margin: "0 auto", padding: "0 16px 100px" }}>
        <div className="sk-band" />

        {/* Band heading */}
        <div style={{ position: "relative", zIndex: 1, padding: "26px 0 42px" }}>
          <div className="sk-b" style={{ width: 300, height: 30 }} />
          <div className="sk-b" style={{ width: 150, height: 13, marginTop: 9 }} />
        </div>

        {/* Content: card + sidebar */}
        <div className="sk-grid">
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #ebebeb", padding: 28 }}>
            <div className="sk" style={{ width: "100%", height: 52, borderRadius: 12 }} />
            <div className="sk" style={{ width: 140, height: 12, margin: "22px 0 14px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,74px)", gap: 14 }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div className="sk" style={{ width: 58, height: 58, borderRadius: 19 }} />
                  <div className="sk" style={{ width: 52, height: 9 }} />
                </div>
              ))}
            </div>
          </div>

          <div className="sk-side" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[92, 150, 240].map((h, i) => (
              <div key={i} className="sk" style={{ width: "100%", height: h, borderRadius: 14, background: "#eeede9" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}