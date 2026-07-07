// The base URL for OpenStreetMap's free Nominatim geocoding API
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

// Nominatim's usage policy requires a way to identify the application making requests —
// either a custom User-Agent or a Referer header. We build a User-Agent string here,
// optionally including a contact email if one is set, so OSM can reach us if there's ever
// an issue with our usage (e.g., if we're accidentally sending too many requests).
const USER_AGENT = process.env.NOMINATIM_CONTACT_EMAIL
  // If a contact email is configured, include it in the User-Agent string
  ? `[APP NAME]-marketplace/0.1 (${process.env.NOMINATIM_CONTACT_EMAIL})`
  // Otherwise, fall back to a generic (but still identifying) User-Agent string
  : "[APP NAME]-marketplace/0.1 (contact: set NOMINATIM_CONTACT_EMAIL in .env.local)";

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
  // A neighbourhood-level name, when available
  suburb?: string;
  // An alternate neighbourhood-level name some regions use instead of "suburb"
  neighbourhood?: string;
  // A city-district-level name, used in some large cities
  city_district?: string;
  // The city name, when available
  city?: string;
  // The town name, used for smaller urban areas instead of "city"
  town?: string;
  // The village name, used for rural areas
  village?: string;
  // The broader state/province name, used as a last-resort fallback
  state?: string;
};

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

  // Pick the most specific "neighbourhood-level" name available, trying several possible fields
  const neighbourhoodLevel = address.suburb ?? address.neighbourhood ?? address.city_district;
  // Pick the most specific "city-level" name available, trying several possible fields
  const cityLevel = address.city ?? address.town ?? address.village ?? address.state;

  // If we have both a neighbourhood and a city, combine them into "Neighbourhood, City"
  if (neighbourhoodLevel && cityLevel) {
    // Return the combined, comma-separated locality string
    return `${neighbourhoodLevel}, ${cityLevel}`;
  }

  // If we only have one of the two, just return whichever one we have
  if (neighbourhoodLevel || cityLevel) {
    // Return the single available piece of location info
    return neighbourhoodLevel ?? cityLevel ?? null;
  }

  // If neither was found, fall back to Nominatim's own generated display name, if present
  return data.display_name ?? null;
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
  });

  // If the request failed, just return an empty list rather than throwing
  if (!response.ok) {
    // No results to show
    return [];
  }

  // Parse the JSON array of raw results
  const results = await response.json();

  // Transform Nominatim's raw result shape into our simpler PlaceSearchResult shape
  return results.map(
    (result: { display_name: string; lat: string; lon: string }): PlaceSearchResult => ({
      // Use Nominatim's full display name as our label
      label: result.display_name,
      // Parse the latitude string into a number
      lat: parseFloat(result.lat),
      // Parse the longitude string into a number
      lng: parseFloat(result.lon),
    })
  );
}
