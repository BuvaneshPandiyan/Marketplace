// The Earth's average radius in kilometers, used as a constant in the Haversine formula below
const EARTH_RADIUS_KM = 6371;

// Define and export a function that converts an angle from degrees to radians
function toRadians(degrees: number): number {
  // The standard degrees-to-radians conversion: multiply by pi/180
  return (degrees * Math.PI) / 180;
}

// Define and export a function that calculates the straight-line distance (in km) between
// two latitude/longitude points using the Haversine formula — accurate enough for ranking
// nearby listings, even though it doesn't account for actual roads/walking routes.
export function haversineDistanceKm(
  // The first point's latitude, in degrees
  lat1: number,
  // The first point's longitude, in degrees
  lng1: number,
  // The second point's latitude, in degrees
  lat2: number,
  // The second point's longitude, in degrees
  lng2: number
): number {
  // Convert the difference in latitude between the two points into radians
  const dLat = toRadians(lat2 - lat1);
  // Convert the difference in longitude between the two points into radians
  const dLng = toRadians(lng2 - lng1);

  // The core Haversine formula's first half: a combination of sine and cosine terms
  const a =
    // The squared sine of half the latitude difference
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    // Multiplied/added with the cosine of each point's latitude and the squared sine of half the longitude difference
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  // The second half of the formula: converts "a" into an angular distance in radians
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  // Multiply the angular distance by Earth's radius to get an actual distance in kilometers
  return EARTH_RADIUS_KM * c;
}

// Define and export a function that turns a raw kilometer distance into a friendly display string
export function formatDistance(km: number): string {
  // For very close distances, show meters instead of a tiny fraction of a kilometer
  if (km < 1) {
    // Convert to meters, round to the nearest 10m, and label it
    return `${Math.round((km * 1000) / 10) * 10} m away`;
  }
  // For distances under 10km, show one decimal place of precision (e.g., "2.3 km away")
  if (km < 10) {
    // Round to one decimal place
    return `${km.toFixed(1)} km away`;
  }
  // For longer distances, a whole number of kilometers is precise enough
  return `${Math.round(km)} km away`;
}
