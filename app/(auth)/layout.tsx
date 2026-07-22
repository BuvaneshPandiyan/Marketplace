import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight:"100svh", display:"flex", fontFamily:"inherit" }}>
      <style>{`
        /* ── Floating card animations ── */
        @keyframes fl-1 { 0%,100%{transform:translate(0,0) rotate(-3deg)} 50%{transform:translate(10px,-16px) rotate(2deg)} }
        @keyframes fl-2 { 0%,100%{transform:translate(0,0) rotate(4deg)}  50%{transform:translate(-12px,12px) rotate(-2deg)} }
        @keyframes fl-3 { 0%,100%{transform:translate(0,0) rotate(-1deg)} 50%{transform:translate(8px,14px) rotate(3deg)} }
        @keyframes fl-4 { 0%,100%{transform:translate(0,0) rotate(6deg)}  50%{transform:translate(-8px,-10px) rotate(-1deg)} }
        @keyframes fl-5 { 0%,100%{transform:translate(0,0) rotate(-5deg)} 50%{transform:translate(14px,8px) rotate(2deg)} }
        @keyframes fl-6 { 0%,100%{transform:translate(0,0) rotate(2deg)}  50%{transform:translate(-10px,16px) rotate(-4deg)} }
        @keyframes fl-7 { 0%,100%{transform:translate(0,0) rotate(-2deg)} 50%{transform:translate(6px,-12px) rotate(5deg)} }
        @keyframes fl-8 { 0%,100%{transform:translate(0,0) rotate(3deg)}  50%{transform:translate(-14px,6px) rotate(-2deg)} }
        @keyframes shimmer-bg { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes fade-slide-up { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes orb-pulse { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.08);opacity:0.7} }
        @keyframes badge-in  { from{opacity:0;transform:scale(0.8) translateY(10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes scan-line { 0%{top:0%} 100%{top:100%} }

        .auth-card-1 { animation:fl-1 8s  ease-in-out infinite; }
        .auth-card-2 { animation:fl-2 10s ease-in-out infinite; }
        .auth-card-3 { animation:fl-3 7s  ease-in-out infinite; }
        .auth-card-4 { animation:fl-4 9s  ease-in-out infinite 1s; }
        .auth-card-5 { animation:fl-5 11s ease-in-out infinite 0.5s; }
        .auth-card-6 { animation:fl-6 8s  ease-in-out infinite 1.5s; }
        .auth-card-7 { animation:fl-7 12s ease-in-out infinite 2s; }
        .auth-card-8 { animation:fl-8 9s  ease-in-out infinite 2.5s; }
        .auth-orb    { animation:orb-pulse 5s ease-in-out infinite; }
        .auth-form   { animation:fade-slide-up 400ms cubic-bezier(0.22,1,0.36,1) both 100ms; }
        .auth-badge  { animation:badge-in 400ms cubic-bezier(0.34,1.56,0.64,1) both; }
        .auth-badge:nth-child(2){ animation-delay:80ms; }
        .auth-badge:nth-child(3){ animation-delay:160ms; }

        @media(max-width:768px){
          .auth-left  { display:none !important; }
          .auth-right { padding:24px 16px !important; padding-top:48px !important; }
          /* Mobile no longer gets a flat empty background — it gets its own
             burgundy ambience so the page feels designed, not blank. */
          .auth-right {
            background:
              radial-gradient(900px 420px at 100% -8%, rgba(122,31,61,0.16), transparent 62%),
              radial-gradient(700px 380px at -10% 106%, rgba(212,175,106,0.13), transparent 58%),
              linear-gradient(180deg, #fbf7f8 0%, #f6eef0 100%) !important;
          }
          .auth-mobile-brand { display:flex !important; }
        }

        /* ── Ambient burgundy orbs behind the form (all screens) ── */
        .auth-amb {
          position:absolute; border-radius:50%; pointer-events:none; filter:blur(46px);
          animation:auth-drift 14s ease-in-out infinite;
        }
        @keyframes auth-drift {
          0%,100%{ transform:translate(0,0) scale(1); opacity:0.55; }
          50%    { transform:translate(16px,-22px) scale(1.12); opacity:0.8; }
        }

        /* ── The form card: glowing burgundy border, fades up on load ── */
        .auth-card {
          position:relative; width:100%; max-width:400px;
          background:rgba(255,255,255,0.86);
          -webkit-backdrop-filter:blur(14px); backdrop-filter:blur(14px);
          border:1.5px solid rgba(122,31,61,0.14);
          border-radius:24px; padding:26px 22px;
          box-shadow:
            0 18px 60px rgba(61,10,32,0.14),
            0 2px 8px rgba(61,10,32,0.06),
            inset 0 1px 0 rgba(255,255,255,0.85);
          animation:auth-card-rise 560ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes auth-card-rise { from{opacity:0; transform:translateY(22px) scale(0.98);} to{opacity:1; transform:none;} }
        /* A soft champagne-gold halo breathing around the card */
        .auth-card::before {
          content:''; position:absolute; inset:-1.5px; border-radius:24px; z-index:-1;
          background:linear-gradient(135deg, rgba(212,175,106,0.5), rgba(122,31,61,0.35), rgba(212,175,106,0.5));
          background-size:220% 220%;
          animation:auth-halo 7s ease infinite;
          filter:blur(7px); opacity:0.55;
        }
        @keyframes auth-halo { 0%,100%{background-position:0% 50%; opacity:0.4;} 50%{background-position:100% 50%; opacity:0.75;} }

        /* ── Inputs inside the auth card: burgundy focus glow ── */
        .auth-card input:not([type="checkbox"]):not([type="radio"]),
        .auth-card select, .auth-card textarea {
          transition:border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;
        }
        .auth-card input:not([type="checkbox"]):not([type="radio"]):focus,
        .auth-card select:focus, .auth-card textarea:focus {
          border-color:#7a1f3d !important;
          box-shadow:0 0 0 4px rgba(122,31,61,0.13) !important;
          outline:none !important;
        }

        /* ── Mobile brand lockup above the card ── */
        .auth-mobile-brand {
          display:none; flex-direction:column; align-items:center; gap:6px;
          margin-bottom:20px; text-align:center;
          animation:auth-card-rise 520ms cubic-bezier(0.22,1,0.36,1) both;
        }
        .auth-mb-mark {
          width:56px; height:56px; border-radius:18px; display:flex;
          align-items:center; justify-content:center; font-size:27px;
          background:linear-gradient(135deg,#5c1330,#9c3050);
          box-shadow:0 10px 28px rgba(92,19,48,0.34), inset 0 1px 0 rgba(255,255,255,0.2);
          animation:auth-mark-pulse 3.4s ease-in-out infinite;
        }
        @keyframes auth-mark-pulse {
          0%,100%{ box-shadow:0 10px 28px rgba(92,19,48,0.34), 0 0 0 0 rgba(212,175,106,0.45), inset 0 1px 0 rgba(255,255,255,0.2); }
          50%    { box-shadow:0 10px 28px rgba(92,19,48,0.34), 0 0 0 12px rgba(212,175,106,0), inset 0 1px 0 rgba(255,255,255,0.2); }
        }
        .auth-mb-name { font-size:23px; font-weight:900; letter-spacing:-0.04em; color:#3d0a20; margin:2px 0 0; }
        .auth-mb-tag  { font-size:12.5px; font-weight:600; color:#8a6b74; margin:0; }

        @media(prefers-reduced-motion:reduce){
          .auth-card-1,.auth-card-2,.auth-card-3,.auth-card-4,
          .auth-card-5,.auth-card-6,.auth-card-7,.auth-card-8,
          .auth-orb,.auth-form,.auth-badge,
          .auth-amb,.auth-card,.auth-card::before,
          .auth-mobile-brand,.auth-mb-mark { animation:none!important; }
        }
      `}</style>

      {/* ═══════════════════════════════════════════════════════
          LEFT — brand panel with animated listing cards
      ═══════════════════════════════════════════════════════ */}
      <div className="auth-left" style={{
        flex:"0 0 52%", position:"relative", overflow:"hidden",
        background:"linear-gradient(160deg, #14040d 0%, #3d0a20 30%, #5c1330 65%, #7a1f3d 85%, #9c3050 100%)",
        backgroundSize:"200% 200%",
        animation:"shimmer-bg 12s ease infinite",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      }}>

        {/* Grid overlay */}
        <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize:"48px 48px" }} />

        {/* Scan line (dramatic effect) */}
        <div style={{ position:"absolute", left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", animation:"scan-line 8s linear infinite", zIndex:1 }} />

        {/* Glow orbs */}
        {[
          { w:500, h:500, t:-120, l:-100, delay:"0s" },
          { w:350, h:350, b:-80,  r:-60,  delay:"2.5s" },
          { w:250, h:250, t:"38%",r:"8%", delay:"1.2s" },
        ].map(({ w, h, delay, ...pos }, i) => (
          <div key={i} className="auth-orb" style={{
            position:"absolute", width:w, height:h, borderRadius:"50%",
            background:"rgba(255,255,255,0.06)",
            animationDelay:delay, ...pos,
          }} />
        ))}

        {/* ── Floating listing cards ── */}
        {[
          { icon:"📱", label:"iPhone 14 Pro",     price:"₹68,000",    tag:"Like New",   top:"7%",    left:"4%",   cls:"auth-card-1", color:"#3b82f6" },
          { icon:"🚗", label:"Maruti Swift",       price:"₹4,20,000",  tag:"2022",       top:"12%",   right:"4%",  cls:"auth-card-2", color:"#d4af6a" },
          { icon:"🏠", label:"2BHK Apartment",     price:"₹18k/mo",   tag:"Furnished",  top:"38%",   left:"2%",   cls:"auth-card-3", color:"#10b981" },
          { icon:"💻", label:"MacBook Air M2",     price:"₹82,000",    tag:"Good Cond.", bottom:"34%",right:"4%",  cls:"auth-card-4", color:"#64748b" },
          { icon:"📷", label:"Sony Alpha A7III",   price:"₹1,30,000",  tag:"With Lens",  top:"6%",    left:"42%",  cls:"auth-card-5", color:"#a855f7" },
          { icon:"🎸", label:"Yamaha Acoustic",    price:"₹8,500",     tag:"3 yrs old",  bottom:"22%",left:"5%",   cls:"auth-card-6", color:"#ef4444" },
          { icon:"🛋️", label:"L-Shaped Sofa",     price:"₹24,000",    tag:"Teak wood",  top:"60%",   right:"2%",  cls:"auth-card-7", color:"#f59e0b" },
          { icon:"🏍️", label:"Royal Enfield",     price:"₹1,85,000",  tag:"1st owner",  bottom:"6%", left:"38%",  cls:"auth-card-8", color:"#22c55e" },
        ].map(({ icon, label, price, tag, cls, color, ...pos }) => (
          <div key={label} className={cls} style={{
            position:"absolute", ...pos,
            background:"rgba(255,255,255,0.10)",
            backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
            borderRadius:16, padding:"12px 16px",
            border:"1px solid rgba(255,255,255,0.18)",
            boxShadow:"0 12px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
            minWidth:140, zIndex:2,
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:`${color}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, border:`1px solid ${color}44` }}>
                {icon}
              </div>
              <div>
                <p style={{ fontSize:11, fontWeight:800, color:"white", margin:0, whiteSpace:"nowrap" }}>{label}</p>
                <p style={{ fontSize:13, fontWeight:900, color:"white", margin:"1px 0 0", letterSpacing:"-0.02em" }}>{price}</p>
                <span style={{ fontSize:9, fontWeight:700, color:color, background:`${color}22`, padding:"1px 6px", borderRadius:100, display:"inline-block", marginTop:2 }}>
                  {tag}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Center brand block */}
        <div style={{ position:"relative", zIndex:3, textAlign:"center", padding:"0 40px" }}>
          <div style={{ fontSize:56, marginBottom:12, filter:"drop-shadow(0 4px 20px rgba(0,0,0,0.4))" }}>🛍️</div>
          <h1 style={{ fontSize:"clamp(32px,4vw,48px)", fontWeight:900, color:"white", margin:"0 0 10px", letterSpacing:"-0.04em", lineHeight:1, textShadow:"0 2px 20px rgba(0,0,0,0.4)" }}>
            bazar.in
          </h1>
          <p style={{ fontSize:16, color:"rgba(255,255,255,0.8)", margin:"0 0 4px", fontWeight:400, lineHeight:1.5 }}>
            Buy &amp; sell anything locally.
          </p>
          <p style={{ fontSize:13, color:"rgba(255,255,255,0.5)", margin:"0 0 32px" }}>
            Thousands of listings near you.
          </p>

          {/* Trust badges */}
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            {[["🔒","Secure & Safe"],["⚡","Instant Listing"],["✅","Verified Users"]].map(([icon,label],i) => (
              <div key={label} className="auth-badge" style={{
                display:"flex", alignItems:"center", gap:6,
                background:"rgba(255,255,255,0.10)", backdropFilter:"blur(8px)",
                borderRadius:100, padding:"7px 14px",
                border:"1px solid rgba(255,255,255,0.2)",
                animationDelay:`${i*80}ms`,
              }}>
                <span style={{ fontSize:14 }}>{icon}</span>
                <span style={{ fontSize:12, color:"white", fontWeight:600 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          RIGHT — form panel
      ═══════════════════════════════════════════════════════ */}
      <div className="auth-right" style={{
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"40px 28px", background:"#fbf7f8",
        overflowY:"auto", minHeight:"100svh",
        position:"relative",
      }}>
        {/* Ambient burgundy / champagne glow behind the form */}
        <div className="auth-amb" aria-hidden="true" style={{ width:320, height:320, top:"-6%", right:"-12%", background:"rgba(122,31,61,0.20)" }} />
        <div className="auth-amb" aria-hidden="true" style={{ width:260, height:260, bottom:"-8%", left:"-10%", background:"rgba(212,175,106,0.22)", animationDelay:"3s" }} />

        <div style={{ width:"100%", maxWidth:400, position:"relative", zIndex:1 }}>
          {/* Brand lockup — only shows on mobile, where the left panel is hidden */}
          <div className="auth-mobile-brand">
            <span className="auth-mb-mark" aria-hidden="true">🛍️</span>
            <p className="auth-mb-name">bazar.in</p>
            <p className="auth-mb-tag">Buy &amp; sell anything locally.</p>
          </div>

          <div className="auth-card auth-form">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}