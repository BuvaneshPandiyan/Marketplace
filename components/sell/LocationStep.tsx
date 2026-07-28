// Mark this as a Client Component since it's part of the interactive wizard
"use client";

import { useState } from "react";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import type { StoredLocation } from "@/lib/client/locationStorage";

// Define the props this component accepts
type LocationStepProps = {
  // Kept for API compatibility with SellWizard (the active location is the source of truth)
  locality?: string | null;
  onLocationChange?: (location: StoredLocation) => void;
  // Fired when the seller submits the whole listing
  onSubmit: () => void;
  // Fired when the seller wants to go back to the previous step
  onBack: () => void;
  // Whether the final submit is currently in progress
  isSubmitting: boolean;
  // Any error message from a failed submit attempt
  submitError: string | null;
};

// Define and export the LocationStep component
export function LocationStep({ onSubmit, onBack, isSubmitting, submitError }: LocationStepProps) {
  // The active location is the single source of truth; detecting updates it globally.
  const { locality, detectCurrentLocation } = useActiveLocation();

  // Whether we're currently detecting the device location
  const [detecting, setDetecting] = useState(false);
  // A friendly error if detection failed (usually a denied permission)
  const [detectError, setDetectError] = useState<string | null>(null);
  // Set true when the seller presses Post without a location — drives the notice
  const [requiredNotice, setRequiredNotice] = useState(false);

  // Do we currently have a usable location?
  const hasLocation = !!locality;

  // Trigger the device/browser location permission prompt and capture a fix.
  async function handleDetect() {
    setDetecting(true);
    setDetectError(null);
    setRequiredNotice(false);
    const result = await detectCurrentLocation();
    setDetecting(false);
    if (!result.success) {
      setDetectError(
        result.error ??
          "We couldn't get your location. Please allow location access and try again."
      );
    }
  }

  // Professional gate: if there's no location, don't silently do nothing — tell the
  // seller clearly that a location is required, rather than a dead disabled button.
  function handlePost() {
    if (!hasLocation) {
      setRequiredNotice(true);
      return;
    }
    onSubmit();
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black tracking-tight text-neutral-900">
        Where&apos;s it <span className="text-cyan-600">at?</span>
      </h2>
      <p className="mb-4 mt-1 text-sm font-medium text-neutral-500">
        Your item is listed at your exact current location, so nearby buyers find it first.
      </p>

      {hasLocation ? (
        // Confirmed location — captured exactly as-is (no manual override, so the
        // photo/location anti-scam match stays intact).
        <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-3 text-sm font-semibold text-neutral-800">
          <span aria-hidden="true">📍</span> {locality}
        </div>
      ) : (
        // No location yet — give the seller a clear, prominent way to set it right here.
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-4">
          <p className="mb-3 text-sm font-medium text-neutral-600">
            We need your location to post this listing.
          </p>
          <button
            type="button"
            onClick={handleDetect}
            disabled={detecting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {detecting ? "Getting your location…" : "📍 Use my current location"}
          </button>
          {detectError && (
            <p className="mt-2 text-sm text-red-600">{detectError}</p>
          )}
        </div>
      )}

      {/* Professional required-notice shown when Post is pressed without a location */}
      {requiredNotice && !hasLocation && (
        <div
          role="alert"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-800"
        >
          You need to set your location before you can post. Tap{" "}
          <span className="font-semibold">“Use my current location”</span> above.
        </div>
      )}

      {/* Any error from a failed submit attempt */}
      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      {/* Navigation row: Back and the final Post button */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Back
        </button>
        {/* The Post button stays pressable without a location so we can explain why
            it can't proceed — only disabled while an actual submit is in flight. */}
        <button
          type="button"
          onClick={handlePost}
          disabled={isSubmitting}
          aria-disabled={!hasLocation}
          className={
            "flex-1 rounded-lg py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 " +
            (hasLocation ? "bg-cyan-600 hover:bg-cyan-700" : "bg-cyan-600/60 hover:bg-cyan-600/70")
          }
        >
          {isSubmitting ? "Posting..." : "Post listing"}
        </button>
      </div>
    </div>
  );
}