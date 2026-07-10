// Search results loading skeleton
export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 md:px-8">
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .sk { background: linear-gradient(90deg,#e5e7eb 25%,#f3f4f6 37%,#e5e7eb 63%); background-size: 200% 100%; animation: shimmer 1.6s ease-in-out infinite; border-radius: 8px; }
        @media (prefers-reduced-motion: reduce) { .sk { animation: none; background: #e5e7eb; } }
      `}</style>

      {/* Search heading */}
      <div className="sk h-7 w-64 mb-6" />

      {/* Filter chips row */}
      <div className="mb-6 flex gap-2 overflow-hidden">
        {[90,120,100,110,95].map((w, i) => (
          <div key={i} className="sk h-9 shrink-0" style={{ width: w, borderRadius: 100 }} />
        ))}
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 lg:gap-6">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i}>
            <div className="sk aspect-square w-full mb-2" style={{ borderRadius: 12 }} />
            <div className="sk h-3 w-3/4 mb-1.5" />
            <div className="sk h-4 w-1/2 mb-1" />
            <div className="sk h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}