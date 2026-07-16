// The localStorage key used to store the user's active (possibly overridden) browsing location
const ACTIVE_LOCATION_KEY = "active_location";
// The localStorage key used to store the small list of recently switched-to locations
const RECENT_LOCATIONS_KEY = "recent_locations";
// The maximum number of recent locations we keep in the list
const MAX_RECENT_LOCATIONS = 5;

// Define the shape of a stored location (used for both the active override and recent entries)
export type StoredLocation = {
  // The location's latitude
  lat: number;
  // The location's longitude
  lng: number;
  // The human-readable locality name shown to the user
  locality: string;
};

// Define and export a function that reads the active location override from localStorage
/**
 * Trim a stale locality down to its first two parts.
 *
 * Localities are produced short at the source now (lib/server/nominatim.ts, from
 * Nominatim's structured `address` object). But anything saved BEFORE that fix is
 * still in localStorage as the full postal chain — "Meenambakkam, Grand Southern
 * Trunk Road, CMWSSB Division 159, ..., Tamil Nadu, 600027, India". That stale
 * value is what overflows headings and turns "More across {city}" into "More
 * across India".
 *
 * We deliberately just take the first two segments rather than trying to pick out
 * the "real" city. Once it's a flat string the structure is gone, and guessing
 * lands on the state ("Tamil Nadu") as often as the city. Two segments gives
 * "Meenambakkam, Grand Southern Trunk Road" and "Irumbuliyur, Tambaram" — short,
 * recognisable, and honest about what we know.
 *
 * This only patches legacy data. New selections are already correct.
 */
function shortenLocality(locality: string | null | undefined): string {
  if (!locality) return "";
  return locality
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
}

export function readActiveLocation(): StoredLocation | null {
  // Wrap in try/catch since localStorage can throw in some privacy modes/environments
  try {
    // Read the raw JSON string stored under our active-location key
    const raw = localStorage.getItem(ACTIVE_LOCATION_KEY);
    // If nothing has been stored yet, there's no override to return
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLocation;
    // Normalise anything saved before localities were shortened at the source
    return { ...parsed, locality: shortenLocality(parsed.locality) };
  } catch {
    // If anything went wrong (storage blocked, corrupted JSON, etc.), treat it as "no override"
    return null;
  }
}

// Define and export a function that writes a new active location override to localStorage
export function writeActiveLocation(location: StoredLocation): void {
  // Wrap in try/catch since localStorage can throw if it's unavailable
  try {
    // Serialize and store the location object under our active-location key
    localStorage.setItem(ACTIVE_LOCATION_KEY, JSON.stringify(location));
  } catch {
    // Silently ignore storage failures — the app should still work, just without persistence
  }
}

// Define and export a function that reads the recent-locations list from localStorage
export function readRecentLocations(): StoredLocation[] {
  // Wrap in try/catch since localStorage can throw in some environments
  try {
    // Read the raw JSON string stored under our recent-locations key
    const raw = localStorage.getItem(RECENT_LOCATIONS_KEY);
    // If nothing has been stored yet, return an empty list
    if (!raw) return [];
    // Parse and return the stored array of locations
    // Same normalisation as readActiveLocation — the recents list is rendered
    // in the location sheet and would otherwise show the old long strings.
    return (JSON.parse(raw) as StoredLocation[]).map((l) => ({
      ...l,
      locality: shortenLocality(l.locality),
    }));
  } catch {
    // If anything went wrong, just return an empty list
    return [];
  }
}

// Define and export a function that adds a new location to the front of the recent-locations list
export function addRecentLocation(location: StoredLocation): StoredLocation[] {
  // Start from whatever is currently stored
  const existing = readRecentLocations();
  // Remove any existing entry with the same locality name, so re-selecting moves it to the top
  // instead of creating a duplicate
  const withoutDuplicate = existing.filter((entry) => entry.locality !== location.locality);
  // Build the new list with our location at the front, capped at the max length
  const updated = [location, ...withoutDuplicate].slice(0, MAX_RECENT_LOCATIONS);
  // Wrap the write in try/catch since localStorage can throw
  try {
    // Persist the updated list back to localStorage
    localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
  } catch {
    // Silently ignore storage failures
  }
  // Return the updated list so the caller can update React state immediately
  return updated;
}