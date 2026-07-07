// This file is automatically used by Next.js as the Suspense fallback for any page
// inside the (main) route group while its Server Component data is still loading.
// It does NOT need "use client" — it's a plain Server Component (or even just JSX).

// Export the loading skeleton shown while any (main) page streams in
export default function MainLoading() {
  return (
    // Match the max-width and padding used by most (main) pages so there's no layout shift
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* A single pulse-animated banner to indicate "page is loading" — generic enough to
          work for the home feed, listing detail, messages, wishlist, and search pages */}
      <div className="space-y-4">
        {/* A wide placeholder bar mimicking a page heading */}
        <div className="h-7 w-40 animate-pulse rounded-lg bg-neutral-200" />
        {/* Three card-sized placeholder blocks mimicking feed items or a content grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            // One card skeleton per placeholder item
            <div key={i} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              {/* Square photo placeholder */}
              <div className="aspect-square w-full animate-pulse bg-neutral-200" />
              {/* Text content placeholder */}
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-neutral-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
