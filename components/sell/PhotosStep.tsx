// Mark this as a Client Component since it's part of the interactive wizard
"use client";

// Import the camera capture component and its photo type
import { CameraCapture, type CapturedPhoto } from "@/components/sell/CameraCapture";

// Define the props this component accepts
type PhotosStepProps = {
  // The current list of captured photos
  photos: CapturedPhoto[];
  // A callback to update the photo list
  onPhotosChange: (photos: CapturedPhoto[]) => void;
  // The logged-in user's ID, passed through to CameraCapture for the storage path
  userId: string;
  // A callback fired when the seller successfully proceeds to the next step
  onNext: () => void;
  // A callback fired when the seller wants to go back to the previous step
  onBack: () => void;
};

// The minimum number of photos required, per the anti-fraud requirement
const MIN_PHOTOS = 3;
// The maximum number of photos allowed
const MAX_PHOTOS = 8;

// Define and export the PhotosStep component
export function PhotosStep({ photos, onPhotosChange, userId, onNext, onBack }: PhotosStepProps) {
  // Work out whether the seller has met the minimum photo requirement
  const isValid = photos.length >= MIN_PHOTOS;

  // Render the photo capture step
  return (
    // A vertical stack containing the heading, camera capture UI, and navigation buttons
    <div className="space-y-4">
      {/* Heading for this step */}
      <h2 className="text-lg font-semibold text-neutral-900">Take some photos</h2>
      {/* A short explanation of why this has to be a live camera, not an upload */}
      <p className="text-xs text-neutral-500">
        Photos must be taken live through your camera right now — this helps keep listings honest
        and free of stock or AI-generated images.
      </p>

      {/* The actual camera capture component */}
      <CameraCapture photos={photos} onPhotosChange={onPhotosChange} minPhotos={MIN_PHOTOS} maxPhotos={MAX_PHOTOS} userId={userId} />

      {/* The navigation row: Back and Next buttons */}
      <div className="flex gap-2 pt-2">
        {/* The Back button, returns to the details step */}
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back
        </button>
        {/* The Next button, disabled until the minimum photo count is reached */}
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 rounded-lg bg-orange-600 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  );
}
