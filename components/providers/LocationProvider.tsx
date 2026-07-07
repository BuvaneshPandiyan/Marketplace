// Mark this as a Client Component since it uses browser storage, geolocation, and React state
"use client";

// Import React's context/state/effect hooks
import { createContext, useEffect, useState, type ReactNode } from "react";
// Import our useUser hook to read the logged-in user's profile defaults
import { useUser } from "@/lib/hooks/useUser";
// Import our browser Supabase client creator (to persist "current location" back to the profile)
import { createClient } from "@/lib/supabase/client";
// Import our Promise-based geolocation wrapper and its error type
import { getCurrentPositionAsync, GeolocationError } from "@/lib/client/geolocation";
// Import our localStorage helpers for the active override and recent-locations list
import {
  readActiveLocation,
  writeActiveLocation,
  readRecentLocations,
  addRecentLocation,
  type StoredLocation,
} from "@/lib/client/locationStorage";

// Define the shape of data this context provides to the rest of the app
type LocationContextValue = {
  // The currently active latitude (override if set, otherwise the profile default, otherwise null)
  lat: number | null;
  // The currently active longitude
  lng: number | null;
  // The currently active locality name, e.g., "Tambaram, Chennai"
  locality: string | null;
  // True once we've finished checking localStorage and the profile, so the UI can avoid flashing
  isReady: boolean;
  // True if there's genuinely no location available yet anywhere (override or profile default)
  needsSetup: boolean;
  // The last 5 locations the user has switched to, most recent first
  recentLocations: StoredLocation[];
  // Manually set the active browsing location (e.g., after picking a manual search result)
  setActiveLocation: (location: StoredLocation) => void;
  // Re-detect the device's real GPS position, use it as the active location, and save it as
  // the profile's "current location" (only meaningfully persists if the user is logged in)
  detectCurrentLocation: () => Promise<{ success: boolean; error?: string }>;
};

// Create the actual React Context object, starting undefined until a provider sets it
export const LocationContext = createContext<LocationContextValue | undefined>(undefined);

// Define and export the provider component that wraps the app and supplies the context value
export function LocationProvider({ children }: { children: ReactNode }) {
  // Read the logged-in user's profile (for its default_lat/lng/locality fallback)
  const { profile } = useUser();
  // Create one browser Supabase client instance for this provider's lifetime
  const [supabase] = useState(() => createClient());

  // State holding the currently active latitude
  const [lat, setLat] = useState<number | null>(null);
  // State holding the currently active longitude
  const [lng, setLng] = useState<number | null>(null);
  // State holding the currently active locality name
  const [locality, setLocality] = useState<string | null>(null);
  // State tracking whether we've finished the initial resolution (override vs. profile default)
  const [isReady, setIsReady] = useState(false);
  // State holding the recent-locations list, read from localStorage on mount
  const [recentLocations, setRecentLocations] = useState<StoredLocation[]>([]);
  // State tracking whether THIS browser has an explicit override saved (vs. just inheriting the profile default)
  const [hasOverride, setHasOverride] = useState(false);

  // On first mount, check localStorage for an explicit override and load the recent-locations list
  useEffect(() => {
    // Try to read a previously saved active-location override
    const override = readActiveLocation();
    // If one exists, use it immediately as our active location
    if (override) {
      // Apply the override's latitude
      setLat(override.lat);
      // Apply the override's longitude
      setLng(override.lng);
      // Apply the override's locality name
      setLocality(override.locality);
      // Remember that this came from an explicit override, not the profile default
      setHasOverride(true);
      // We have a usable location now, so the rest of the app can render location-aware UI
      setIsReady(true);
    }
    // Load whatever recent locations were previously saved, regardless of override status
    setRecentLocations(readRecentLocations());
    // This effect intentionally only runs once, on mount — it's checking one-time browser storage
  }, []);

  // Whenever the profile loads/changes, fall back to its default location IF we don't already
  // have an explicit override saved in this browser
  useEffect(() => {
    // If we already have an override, the profile default should never overwrite it
    if (hasOverride) return;
    // If the profile has a usable default location, adopt it as our active location
    if (profile?.default_lat != null && profile?.default_lng != null && profile?.default_locality) {
      // Apply the profile's default latitude
      setLat(profile.default_lat);
      // Apply the profile's default longitude
      setLng(profile.default_lng);
      // Apply the profile's default locality name
      setLocality(profile.default_locality);
    }
    // Either way (whether the profile had a default or not), we've now finished resolving
    setIsReady(true);
  }, [profile, hasOverride]);

  // Define the function exposed to consumers for manually setting the active location
  function setActiveLocation(location: StoredLocation) {
    // Update our in-memory state immediately so the UI reflects the change right away
    setLat(location.lat);
    // Update the active longitude
    setLng(location.lng);
    // Update the active locality name
    setLocality(location.locality);
    // Mark that we now have an explicit override, so future profile updates won't overwrite it
    setHasOverride(true);
    // Persist this choice to localStorage so it survives page reloads
    writeActiveLocation(location);
    // Add this location to the recent-locations list and update our state with the new list
    setRecentLocations(addRecentLocation(location));
  }

  // Define the function exposed to consumers for re-detecting the device's real GPS position
  async function detectCurrentLocation(): Promise<{ success: boolean; error?: string }> {
    try {
      // Ask the browser for the device's current GPS coordinates (triggers the permission prompt if needed)
      const coords = await getCurrentPositionAsync();
      // Ask our server-side reverse-geocoding API route to turn those coordinates into a locality name
      const response = await fetch(`/api/geo/reverse?lat=${coords.lat}&lng=${coords.lng}`);
      // Parse the JSON response body
      const result = await response.json();
      // Fall back to a generic label if reverse geocoding didn't find a specific locality name
      const resolvedLocality = result.locality ?? "Current location";

      // Apply this as the new active browsing location (updates state, localStorage, and recents)
      setActiveLocation({ lat: coords.lat, lng: coords.lng, locality: resolvedLocality });

      // If a user is logged in, also persist this as their "current location" on the profile row
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // Only attempt the database update if we actually have a logged-in user
      if (user) {
        // Update the profile's current_lat/current_lng/current_locality columns
        await supabase
          // Target the profiles table
          .from("profiles")
          // Update these specific columns
          .update({
            // Save the freshly detected latitude
            current_lat: coords.lat,
            // Save the freshly detected longitude
            current_lng: coords.lng,
            // Save the freshly resolved locality name
            current_locality: resolvedLocality,
          })
          // Only update this user's own row
          .eq("id", user.id);
      }

      // Report success back to the calling UI
      return { success: true };
    } catch (error) {
      // If the browser's geolocation API failed, build a clear, user-facing error message
      const message =
        // Use our custom error's message if this was a recognized GeolocationError
        error instanceof GeolocationError
          ? error.message
          : // Otherwise, fall back to a generic error message
            "Couldn't get your current location. Please try again.";
      // Report the failure back to the calling UI
      return { success: false, error: message };
    }
  }

  // Compute whether the app genuinely has no location to work with yet (for prompting setup)
  const needsSetup = isReady && lat === null;

  // Render the context provider, passing down all the resolved state and action functions
  return (
    // Supply the context value to every descendant component
    <LocationContext.Provider
      value={{ lat, lng, locality, isReady, needsSetup, recentLocations, setActiveLocation, detectCurrentLocation }}
    >
      {/* Render whatever the app tree looks like below this provider */}
      {children}
    </LocationContext.Provider>
  );
}
