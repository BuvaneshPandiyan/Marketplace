// Messages list loading skeleton
export default function MessagesLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .sk { background: linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 37%,#e5e7eb 63%); background-size: 200% 100%; animation: shimmer 1.6s ease-in-out infinite; border-radius: 8px; }
        @media (prefers-reduced-motion: reduce) { .sk { animation: none; background: #e5e7eb; } }
      `}</style>
      <div className="sk h-7 w-36 mb-6" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
          <div className="sk shrink-0 h-12 w-12" style={{ borderRadius: "50%" }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div className="sk h-4 w-32" />
              <div className="sk h-3 w-16" />
            </div>
            <div className="sk h-3 w-3/4 mb-1.5" />
            <div className="sk h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}