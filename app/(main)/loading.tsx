/**
 * Group-level loading fallback for the (main) route group.
 *
 * IMPORTANT: this shows for ANY (main) route during navigation until that route's
 * own loading.tsx resolves. It used to be the full home-feed skeleton (category
 * pills + product grid), which meant navigating to /sell, /wishlist, etc. flashed
 * the home skeleton for a split second before the correct one appeared.
 *
 * Every real page here (home renders instantly; sell, wishlist, search, my-listings,
 * messages, listing all have their own loading.tsx) provides its own skeleton, so
 * this fallback only needs to be a neutral page-coloured surface — no page-specific
 * shapes to flash wrongly.
 */
export default function MainLoading() {
  return <div style={{ background: "#f5f4f2", minHeight: "100vh" }} aria-hidden="true" />;
}