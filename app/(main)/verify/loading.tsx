// Skeleton for the seller verification page — matches its narrow centered form.
export default function VerifyLoading() {
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <style>{`
        @keyframes vlk-sh { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .vlk { background: linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 37%,#e5e7eb 63%); background-size:200% 100%; animation: vlk-sh 1.5s ease-in-out infinite; border-radius:12px; }
        @media(prefers-reduced-motion:reduce){ .vlk { animation:none; } }
      `}</style>

      <div className="vlk" style={{ width: 200, height: 22, marginBottom: 10 }} />
      <div className="vlk" style={{ width: "90%", height: 14, marginBottom: 28 }} />

      {/* Form card */}
      <div style={{ border: "1px solid #ececec", borderRadius: 16, padding: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div className="vlk" style={{ width: 100, height: 13, marginBottom: 8 }} />
            <div className="vlk" style={{ width: "100%", height: 46, borderRadius: 12 }} />
          </div>
        ))}
        <div className="vlk" style={{ width: "100%", height: 50, borderRadius: 999, marginTop: 8 }} />
      </div>
    </div>
  );
}