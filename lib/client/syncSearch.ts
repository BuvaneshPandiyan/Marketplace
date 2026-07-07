// Define and export a function that asks our server to sync one listing's current state into
// (or out of) the search index. Deliberately "fire and forget" from the caller's perspective —
// a sync failure should never block or fail the user's actual action (creating/editing/deleting
// a listing), since search being briefly out of date is a much smaller problem than that.
export async function syncListingToSearch(listingId: string): Promise<void> {
  try {
    // Call our own sync API route with the listing's ID
    await fetch("/api/search/sync", {
      // This is a POST request since it triggers a write (to the search index)
      method: "POST",
      // Tell the server we're sending JSON
      headers: { "Content-Type": "application/json" },
      // Send the listing ID in the request body
      body: JSON.stringify({ listingId }),
    });
  } catch {
    // Intentionally swallow any network-level failure — see the comment above for why
  }
}
