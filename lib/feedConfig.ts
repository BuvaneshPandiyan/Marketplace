// The outer radius (in kilometers) for Tier 1 — listings treated as "in" the user's own locality
export const TIER_1_RADIUS_KM = 3;

// The outer radius (in kilometers) for Tier 2 — listings treated as "nearby areas".
// Tier 2 actually queries the RING between TIER_1_RADIUS_KM and TIER_2_RADIUS_KM, not from zero.
export const TIER_2_RADIUS_KM = 10;

// How many listings to fetch per "page" within a single tier, both on initial load and
// every time the seller/buyer clicks "Show more" in that section
export const FEED_PAGE_SIZE = 6;

// How many distinct locality names to show in Tier 2's dynamic section header,
// e.g., "Near Chromepet, Pallavaram" uses up to this many names
export const TIER_2_LOCALITY_NAMES_SHOWN = 3;

// Page sizes for the paginated grid layout
// Desktop (lg, 7 columns): 7 cols × 6 rows = 42 items per page
export const DESKTOP_FEED_PAGE_SIZE = 42;
// Mobile (2 columns): 2 cols × 9 rows = 18 items per page
export const MOBILE_FEED_PAGE_SIZE = 18;