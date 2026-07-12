// Chat page loading skeleton — matches the ChatPanel layout exactly
// so there's zero layout shift when the real content arrives
export default function ChatLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100svh - 60px)", background: "white" }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .sk { background: linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 37%,#e5e7eb 63%); background-size:200% 100%; animation:shimmer 1.5s ease-in-out infinite; border-radius:8px; }
        @media(prefers-reduced-motion:reduce){.sk{animation:none;background:#e5e7eb;}}
      `}</style>

      {/* Chat header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <div className="sk" style={{ width: 40, height: 40, borderRadius: "50%" }} />
        <div style={{ flex: 1 }}>
          <div className="sk h-4 w-40 mb-2" />
          <div className="sk h-3 w-24" />
        </div>
      </div>

      {/* Message bubbles */}
      <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: 12, overflowY: "hidden" }}>
        {/* Incoming */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="sk" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} />
          <div className="sk h-10" style={{ width: "55%", borderRadius: "18px 18px 18px 4px" }} />
        </div>
        {/* Outgoing */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div className="sk h-10" style={{ width: "45%", borderRadius: "18px 18px 4px 18px" }} />
        </div>
        {/* Incoming */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="sk" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} />
          <div className="sk h-16" style={{ width: "65%", borderRadius: "18px 18px 18px 4px" }} />
        </div>
        {/* Outgoing */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div className="sk h-10" style={{ width: "50%", borderRadius: "18px 18px 4px 18px" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div className="sk h-10" style={{ width: "35%", borderRadius: "18px 18px 4px 18px" }} />
        </div>
        {/* Incoming */}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="sk" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} />
          <div className="sk h-10" style={{ width: "48%", borderRadius: "18px 18px 18px 4px" }} />
        </div>
      </div>

      {/* Input bar */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8, flexShrink: 0 }}>
        <div className="sk" style={{ flex: 1, height: 40, borderRadius: 100 }} />
        <div className="sk" style={{ width: 40, height: 40, borderRadius: "50%" }} />
      </div>
    </div>
  );
}