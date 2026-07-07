// Mark this as a Client Component since it requests browser geolocation and manages form state
"use client";

// Import React's state and effect hooks
import { useEffect, useState } from "react";
// Import Next.js's router so we can move on to the home page once location is saved
import { useRouter } from "next/navigation";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";
// Import our useUser hook (for the current user's ID and refreshing the cached profile)
import { useUser } from "@/lib/hooks/useUser";
// Import our useActiveLocation hook (to immediately reflect the new location this session)
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
// Import our Promise-based geolocation wrapper and its error type
import { getCurrentPositionAsync, GeolocationError } from "@/lib/client/geolocation";
// Import the reusable manual search input component
import { LocationSearchInput } from "@/components/location/LocationSearchInput";
// Import the shared location shape
import type { StoredLocation } from "@/lib/client/locationStorage";

// Define the possible states this onboarding screen can be in
type Status = "requesting" | "manual" | "saving";

// Define and export the onboarding location flow component
export function OnboardingLocationFlow() {
  // Get the router so we can navigate to the home page once we're done
  const router = useRouter();
  // Pull the current user and the refreshProfile function from our auth context
  const { user, refreshProfile } = useUser();
  // Pull the setActiveLocation function from our location context
  const { setActiveLocation } = useActiveLocation();
  // Create one browser Supabase client instance for this component's lifetime
  const [supabase] = useState(() => createClient());

  // Track which screen state we're currently showing — starts by trying GPS automatically
  const [status, setStatus] = useState<Status>("requesting");
  // Track any error message to show the user
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Define a function that saves a resolved location to the profile and moves on
  async function saveLocationAndContinue(location: StoredLocation) {
    // Show a saving state while we write to the database
    setStatus("saving");

    // Guard clause: we need a logged-in user to know which profile row to update
    if (!user) {
      // This page is already auth-protected by middleware, but guard defensively anyway
      setErrorMessage("You need to be logged in to continue.");
      // Fall back to the manual screen so the user isn't stuck
      setStatus("manual");
      return;
    }

    // Update the profile's default AND current location columns — this is the user's first-ever
    // location, so it makes sense to treat it as both at once
    await supabase
      // Target the profiles table
      .from("profiles")
      // Update these specific columns
      .update({
        // Save as the default location (used as a fallback whenever there's no active override)
        default_lat: location.lat,
        default_lng: location.lng,
        default_locality: location.locality,
        // Also save as the "current" (most recently detected) location
        current_lat: location.lat,
        current_lng: location.lng,
        current_locality: location.locality,
      })
      // Only update this user's own row
      .eq("id", user.id);

    // Immediately reflect this location as the active one for the rest of this session
    setActiveLocation(location);
    // Refresh our cached profile so the rest of the app sees the new default location too
    await refreshProfile();
    // Move on to the home page now that onboarding is complete
    router.push("/");
  }

  // Automatically attempt to get the device's GPS position the moment this screen loads
  useEffect(() => {
    // Define an async function so we can use await inside this effect
    async function attemptGeolocation() {
      try {
        // Ask the browser for the device's current position (this triggers the permission prompt)
        const coords = await getCurrentPositionAsync();
        // Ask our server-side reverse-geocoding route to turn coordinates into a locality name
        const response = await fetch(`/api/geo/reverse?lat=${coords.lat}&lng=${coords.lng}`);
        // Parse the JSON response body
        const result = await response.json();
        // Fall back to a generic label if reverse geocoding didn't find a specific locality name
        const resolvedLocality = result.locality ?? "Your area";
        // Save this as the user's location and move on
        await saveLocationAndContinue({ lat: coords.lat, lng: coords.lng, locality: resolvedLocality });
      } catch (error) {
        // If the user denied permission or geolocation otherwise failed, fall back to manual entry
        const message =
          // Use our custom error's message if this was a recognized GeolocationError
          error instanceof GeolocationError
            ? error.message
            : // Otherwise, fall back to a generic error message
              "We couldn't detect your location automatically.";
        // Show that message above the manual search box
        setErrorMessage(message);
        // Switch to the manual-entry screen
        setStatus("manual");
      }
    }
    // Kick off the automatic geolocation attempt
    attemptGeolocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only run once, on mount
  }, []);

  // Render the "requesting permission" / "saving" screen while we wait on the browser's GPS prompt
  if (status === "requesting" || status === "saving") {
    return (
      // A card-style container, consistent with the other onboarding screens
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        {/* Heading for this screen */}
        <h1 className="mb-2 text-lg font-semibold text-neutral-900">Finding your area</h1>
        {/* Explanatory text, wording depends on which sub-state we're in */}
        <p className="text-sm text-neutral-500">
          {/* Show different copy depending on whether we're waiting for permission or saving */}
          {status === "requesting"
            ? "Allow location access so we can show you listings near you."
            : "Saving your location..."}
        </p>
      </div>
    );
  }

  // Render the manual-entry fallback screen (status === "manual")
  return (
    // A card-style container, consistent with the other onboarding screens
    <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {/* Heading for this screen */}
      <h1 className="mb-2 text-lg font-semibold text-neutral-900">Where are you located?</h1>
      {/* Show the reason we fell back to manual entry, if we have one */}
      {errorMessage && <p className="mb-3 text-sm text-amber-600">{errorMessage}</p>}
      {/* General instructions for the manual search box */}
      <p className="mb-4 text-sm text-neutral-500">Search for your area so we can show you nearby listings.</p>
      {/* The reusable debounced search input, wired to save+continue on selection */}
      <LocationSearchInput onSelect={saveLocationAndContinue} placeholder="e.g., Tambaram, Chennai" />
    </div>
  );
}
