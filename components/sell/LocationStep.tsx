// Mark this as a Client Component since it's part of the interactive wizard
"use client";

// Import the reusable manual location search component
import { LocationSearchInput } from "@/components/location/LocationSearchInput";
// Import the shared location shape
import type { StoredLocation } from "@/lib/client/locationStorage";

// Define the props this component accepts
type LocationStepProps = {
  // The currently selected locality name for this listing
  locality: string | null;
  // A callback fired when the seller picks a different location
  onLocationChange: (location: StoredLocation) => void;
  // A callback fired when the seller submits the whole listing
  onSubmit: () => void;
  // A callback fired when the seller wants to go back to the previous step
  onBack: () => void;
  // Whether the final submit is currently in progress
  isSubmitting: boolean;
  // Any error message from a failed submit attempt
  submitError: string | null;
};

// Define and export the LocationStep component
export function LocationStep({ locality, onLocationChange, onSubmit, onBack, isSubmitting, submitError }: LocationStepProps) {
  // Render the location confirmation step
  return (
    // A vertical stack containing the heading, current location, search box, and submit button
    <div className="space-y-4">
      {/* Heading for this step */}
      <h2 className="text-lg font-semibold text-neutral-900">Confirm location</h2>

      {/* Show the currently selected locality, pre-filled from the seller's active browsing location */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700">
        <span aria-hidden="true">📍</span> {locality ?? "No location set"}
      </div>

      {/* Let the seller search for and pick a different location if this listing is elsewhere */}
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Not quite right? Search for another area</label>
        <LocationSearchInput onSelect={onLocationChange} placeholder="Search for a different area..." />
      </div>

      {/* Show any error from a failed submit attempt */}
      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      {/* The navigation row: Back and the final Submit button */}
      <div className="flex gap-2 pt-2">
        {/* The Back button, returns to the photos step */}
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Back
        </button>
        {/* The final submit button, disabled while submitting or if no location is set */}
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || !locality}
          className="flex-1 rounded-lg bg-orange-600 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* Swap the label while submitting */}
          {isSubmitting ? "Posting..." : "Post listing"}
        </button>
      </div>
    </div>
  );
}
