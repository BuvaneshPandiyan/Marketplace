// Mark this as a Client Component since it's part of the interactive wizard
"use client";

// Import the shared location shape
import type { StoredLocation } from "@/lib/client/locationStorage";

// Define the props this component accepts
type LocationStepProps = {
  // The currently selected locality name for this listing
  locality: string | null;
  // Kept for API compatibility with SellWizard; no longer used for a manual
  // override — the exact captured location is what gets listed.
  onLocationChange?: (location: StoredLocation) => void;
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
export function LocationStep({ locality, onSubmit, onBack, isSubmitting, submitError }: LocationStepProps) {
  // Render the location confirmation step
  return (
    // A vertical stack containing the heading, current location, and submit button
    <div className="space-y-4">
      {/* Heading for this step */}
      <h2 className="text-2xl font-black tracking-tight text-neutral-900">Where&apos;s it <span className="text-cyan-600">at?</span></h2>
      <p className="mb-4 mt-1 text-sm font-medium text-neutral-500">
        Your item is listed at your exact current location, so nearby buyers find it first.
      </p>

      {/* The captured location, used exactly as-is. There is deliberately no manual
          override here: letting sellers pick a different area would break the
          photo/location match that the anti-scam checks depend on. */}
      <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-3 text-sm font-semibold text-neutral-800">
        <span aria-hidden="true">📍</span> {locality ?? "Detecting your location..."}
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
          className="flex-1 rounded-lg bg-cyan-600 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* Swap the label while submitting */}
          {isSubmitting ? "Posting..." : "Post listing"}
        </button>
      </div>
    </div>
  );
}