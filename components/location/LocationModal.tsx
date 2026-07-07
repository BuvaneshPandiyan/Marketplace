// Mark this as a Client Component since it's an interactive modal with its own state
"use client";

// Import React's state hook
import { useState } from "react";
// Import our useActiveLocation hook to read/update the active browsing location
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
// Import the reusable manual search input component
import { LocationSearchInput } from "@/components/location/LocationSearchInput";
// Import the shared location shape
import type { StoredLocation } from "@/lib/client/locationStorage";

// Define the props this component accepts
type LocationModalProps = {
  // A callback fired when the modal should close (backdrop click, selection made, etc.)
  onClose: () => void;
};

// Define and export the LocationModal component
export function LocationModal({ onClose }: LocationModalProps) {
  // Pull location state/actions from our location context
  const { recentLocations, setActiveLocation, detectCurrentLocation } = useActiveLocation();
  // Track whether we're currently detecting the device's GPS position
  const [isDetecting, setIsDetecting] = useState(false);
  // Track any error message from the "use current location" attempt
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Define the click handler for the "Use current location" button
  async function handleUseCurrentLocation() {
    // Clear any previous error
    setErrorMessage(null);
    // Mark that we're now detecting the device's position
    setIsDetecting(true);
    // Call our context's geolocation-detection function
    const result = await detectCurrentLocation();
    // Mark detection as finished
    setIsDetecting(false);
    // If it succeeded, close the modal — the new location is already applied
    if (result.success) {
      // Close the modal now that we have a new active location
      onClose();
    } else {
      // Otherwise, show the error message returned by the hook
      setErrorMessage(result.error ?? "Something went wrong.");
    }
  }

  // Define the handler for picking either a manual search result or a recent location
  function handleSelectLocation(location: StoredLocation) {
    // Apply the chosen location as the new active browsing location
    setActiveLocation(location);
    // Close the modal now that a selection has been made
    onClose();
  }

  // Render the modal
  return (
    // A full-screen fixed overlay that darkens the background and centers the modal content
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
      {/* Clicking the backdrop itself (not its children) closes the modal */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* The actual modal card, positioned above the backdrop */}
      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        {/* A header row with a title and a close button */}
        <div className="mb-4 flex items-center justify-between">
          {/* Modal title */}
          <h2 className="text-base font-semibold text-neutral-900">Choose your location</h2>
          {/* The close button, an X-style icon made from text for simplicity */}
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* The "use current location" button */}
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isDetecting}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 py-2.5 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* A small location-pin emoji for visual flair */}
          <span aria-hidden="true">📍</span>
          {/* Swap the label while detection is in progress */}
          {isDetecting ? "Detecting..." : "Use current location"}
        </button>

        {/* Show an error message if the current-location attempt failed */}
        {errorMessage && <p className="mb-4 text-sm text-red-600">{errorMessage}</p>}

        {/* A small divider label between the GPS option and manual search */}
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">Or search manually</p>

        {/* The reusable manual search input, wired to apply+close on selection */}
        <div className="mb-4">
          <LocationSearchInput onSelect={handleSelectLocation} />
        </div>

        {/* Only show the recent-locations section if there's actually history to show */}
        {recentLocations.length > 0 && (
          // A small section listing previously chosen locations for quick re-selection
          <div>
            {/* Section label */}
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">Recent</p>
            {/* The list of recent locations */}
            <ul className="space-y-1">
              {/* Loop over each recent location and render it as a clickable row */}
              {recentLocations.map((location, index) => (
                // Each row is a list item containing a button for the whole clickable area
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => handleSelectLocation(location)}
                    className="block w-full rounded-lg px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    {/* A small clock emoji hinting this is a past selection */}
                    <span aria-hidden="true">🕑</span> {location.locality}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}