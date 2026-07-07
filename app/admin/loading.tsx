// Loading skeleton for all /admin/* pages (shown inside the admin layout which has the sidebar)
export default function AdminLoading() {
  return (
    // Match the admin page content padding
    <div className="space-y-4">
      {/* Page heading placeholder */}
      <div className="h-7 w-48 animate-pulse rounded bg-neutral-200" />
      {/* Subtitle placeholder */}
      <div className="h-4 w-64 animate-pulse rounded bg-neutral-200" />
      {/* Stat card grid placeholder — matches the analytics page layout */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4">
            {/* Label row placeholder */}
            <div className="mb-3 h-3 w-24 animate-pulse rounded bg-neutral-200" />
            {/* Big number placeholder */}
            <div className="h-9 w-16 animate-pulse rounded bg-neutral-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
