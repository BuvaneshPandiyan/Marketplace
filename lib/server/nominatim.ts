// The base URL for OpenStreetMap's free Nominatim geocoding API
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// Nominatim's usage policy requires a way to identify the application making requests —
// either a custom User-Agent or a Referer header. We build a User-Agent string here,
// optionally including a contact email if one is set, so OSM can reach us if there's ever
// an issue with our usage (e.g., if we're accidentally sending too many requests).
const USER_AGENT = process.env.NOMINATIM_CONTACT_EMAIL
  // If a contact email is configured, include it in the User-Agent string
  ? `bazar.in/1.0 (${process.env.NOMINATIM_CONTACT_EMAIL})`
  // Otherwise, fall back to a generic (but still identifying) User-Agent string
  : "bazar.in/1.0 (contact: set NOMINATIM_CONTACT_EMAIL in .env.local)";

// Restrict search results to this country by default, since this app's initial market is India —
// remove this constant (and its usage below) once the app expands to other countries
const DEFAULT_COUNTRY_CODE = "in";

// Define the shape of a single forward-search result we return to our own API routes
export type PlaceSearchResult = {
  // A human-readable label for this place, e.g., "Tambaram, Chennai, Tamil Nadu, India"
  label: string;
  // The place's latitude, parsed into a number
  lat: number;
  // The place's longitude, parsed into a number
  lng: number;
};

// Define the shape Nominatim's "address" object roughly takes (we only type the fields we use)
type NominatimAddress = {
  // Neighbourhood-level names, in the order we prefer them
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city_district?: string;
  hamlet?: string;
  road?: string;
  // City-level names, in the order we prefer them
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state_district?: string;
  state?: string;
};

/**
 * Collapse a Nominatim address into a short, human "Area, City" label.
 *
 * Nominatim's `display_name` is the full postal chain — e.g. "Meenambakkam,
 * Grand Southern Trunk Road, CMWSSB Division 159, Ward 159, Zone 12 Alandur,
 * Chennai Corporation, Alandur, Chennai, Tamil Nadu, 600027, India". Nobody
 * describes where they live that way. They say "Meenambakkam, Chennai".
 *
 * That string ends up in a page heading, a nav chip and every listing card, so
 * its length isn't cosmetic — it decides whether those layouts hold together.
 * We take ONE neighbourhood-level part and ONE city-level part from the
 * structured `address` object and join them. Two parts, never more.
 */
function toShortLabel(address: NominatimAddress, fallback?: string): string | null {
  const area =
    address.suburb ??
    address.neighbourhood ??
    address.quarter ??
    address.city_district ??
    address.hamlet ??
    address.road;
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.county ??
    address.state_district ??
    address.state;

  if (area && city && area !== city) return `${area}, ${city}`;
  if (area || city) return (area ?? city) as string;

  // No structured parts at all — take the first two segments of the postal
  // chain rather than returning the whole thing.
  if (fallback) {
    const parts = fallback.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 2);
    return parts.length ? parts.join(", ") : null;
  }
  return null;
}

// Define and export a function that turns coordinates into a human-readable locality string
export async function reverseGeocode(
  // The latitude to look up
  lat: number,
  // The longitude to look up
  lng: number
): Promise<string | null> {
  // Build the reverse-geocoding request URL with our coordinates and desired response format
  const url = `${NOMINATIM_BASE_URL}/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&zoom=14`;

  // Make the actual HTTP request to Nominatim, including our identifying User-Agent header
  const response = await fetch(url, {
    // Attach the headers Nominatim's usage policy expects
    headers: { "User-Agent": USER_AGENT },
    // Cache hard. A place name and a coordinate's locality are effectively
    // static, so repeated lookups — map panning, reopening the picker, many
    // users in the same area — should never reach Nominatim again. This is the
    // main thing protecting us from their rate limit, more so than throttling.
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  // If Nominatim responded with an error status, treat this as "couldn't determine a locality"
  if (!response.ok) {
    // Return null so the calling code can fall back to manual entry
    return null;
  }

  // Parse the JSON response body
  const data = await response.json();
  // Pull out the address breakdown object, defaulting to an empty object if missing
  const address: NominatimAddress = data.address ?? {};

  // Previously this fell through to `data.display_name` — the full postal
  // chain. toShortLabel keeps it to two parts.
  return toShortLabel(address, data.display_name);
}

// Define and export a function that searches for places matching a free-text query
export async function searchPlaces(
  // The text the user typed, e.g., "Tambaram" or "Kodambakkam"
  query: string
): Promise<PlaceSearchResult[]> {
  // Don't bother calling Nominatim for very short queries — they tend to return noisy results
  if (query.trim().length < 3) {
    // Return an empty list instead of making a wasted network request
    return [];
  }

  // Build the search request URL, biasing results toward our default country and limiting to 5 results
  const url = `${NOMINATIM_BASE_URL}/search?q=${encodeURIComponent(
    query
  )}&format=jsonv2&addressdetails=1&limit=5&countrycodes=${DEFAULT_COUNTRY_CODE}`;

  // Make the actual HTTP request to Nominatim, including our identifying User-Agent header
  const response = await fetch(url, {
    // Attach the headers Nominatim's usage policy expects
    headers: { "User-Agent": USER_AGENT },
    // Cache hard. A place name and a coordinate's locality are effectively
    // static, so repeated lookups — map panning, reopening the picker, many
    // users in the same area — should never reach Nominatim again. This is the
    // main thing protecting us from their rate limit, more so than throttling.
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  // If the request failed, just return an empty list rather than throwing
  if (!response.ok) {
    // No results to show
    return [];
  }

  // Parse the JSON array of raw results
  const results = await response.json();

  // Transform Nominatim's raw result shape into our simpler PlaceSearchResult shape
  /**
   * This request already asks for addressdetails=1 — the old code then ignored
   * them and returned `display_name` verbatim. That's why choosing a place from
   * search set your location to a 12-part postal address, while "use current
   * location" (which goes through reverseGeocode) produced a clean one. Both
   * paths now yield the same short label.
   */
  return results.map(
    (result: {
      display_name: string;
      lat: string;
      lon: string;
      address?: NominatimAddress;
      name?: string;
    }): PlaceSearchResult => ({
      label:
        toShortLabel(result.address ?? {}, result.display_name) ??
        result.name ??
        result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
    })
  );
}