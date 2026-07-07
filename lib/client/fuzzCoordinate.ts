// The radius (in meters) we fuzz a listing's exact pin by, for privacy on the map preview
const FUZZ_RADIUS_METERS = 150;

// Define and export a function that takes an exact lat/lng and a stable seed (the listing's ID)
// and returns a nearby-but-not-exact point, always the SAME fuzzed point for the same listing
export function fuzzCoordinate(lat: number, lng: number, seed: string): { lat: number; lng: number } {
  // Build a simple numeric hash from the seed string, so the same seed always produces the
  // same "random-looking" offset — this is NOT cryptographic, just a deterministic scrambler
  let hash = 0;
  // Walk through every character in the seed string
  for (let i = 0; i < seed.length; i++) {
    // A classic, simple string-hashing formula (multiply-and-add with the character code)
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    // Force the result back into a 32-bit integer range to avoid runaway growth
    hash |= 0;
  }

  // Turn the hash into two pseudo-random values between 0 and 1, using different multipliers
  // so the angle and distance don't end up correlated with each other (sin's output is already
  // bounded to [-1, 1], so Math.abs alone is enough to land us in [0, 1])
  const pseudoRandomA = Math.abs(Math.sin(hash));
  const pseudoRandomB = Math.abs(Math.sin(hash * 2.0));

  // Pick a random angle (in radians) around the full circle, based on the first pseudo-random value
  const angle = pseudoRandomA * 2 * Math.PI;
  // Pick a random distance (in meters) up to our fuzz radius, based on the second pseudo-random value
  const distance = pseudoRandomB * FUZZ_RADIUS_METERS;

  // Convert that distance into a latitude offset — 1 degree of latitude is about 111,320 meters everywhere
  const latOffset = (distance * Math.cos(angle)) / 111320;
  // Convert it into a longitude offset — 1 degree of longitude shrinks as you move away from the equator,
  // so we adjust by the cosine of the current latitude
  const lngOffset = (distance * Math.sin(angle)) / (111320 * Math.cos((lat * Math.PI) / 180));

  // Return the fuzzed coordinates, nudged away from the exact point
  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
  };
}
