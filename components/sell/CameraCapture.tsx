// Mark this as a Client Component since it drives a live camera feed and canvas operations
"use client";

// Import React's ref/state/effect hooks
import { useEffect, useRef, useState } from "react";
// Import our camera stream lifecycle hook
import { useCameraStream } from "@/lib/hooks/useCameraStream";
// Import our capture/compression helpers
import { captureAndCompress, formatFileSize } from "@/lib/client/imageCapture";
// Import our Promise-based geolocation wrapper (best-effort geotagging per photo)
import { getCurrentPositionAsync } from "@/lib/client/geolocation";
// Import our browser Supabase client creator, to upload each photo as soon as it's captured
import { createClient } from "@/lib/supabase/client";
// Import our perceptual hash utility — computed here so we can store it alongside the photo
import { computeDHash } from "@/lib/client/dHash";

// Define the shape of a single captured-and-uploaded photo
export type CapturedPhoto = {
  // A local-only ID used as a React key and for removal
  id: string;
  // A local object URL used to show the thumbnail preview
  previewUrl: string;
  // The public URL of the already-uploaded compressed photo in Supabase Storage
  uploadedUrl: string;
  // The size, in bytes, of the uncompressed capture (shown as the "before" figure)
  beforeSizeBytes: number;
  // The size, in bytes, of the compressed capture actually stored (the "after" figure)
  afterSizeBytes: number;
  // The latitude captured at the moment this photo was taken, null if geolocation failed
  exifLat: number | null;
  // The longitude captured at the moment this photo was taken
  exifLng: number | null;
  // The ISO timestamp captured at the moment this photo was taken
  exifTimestamp: string;
  // The dHash (difference perceptual hash) of the compressed image, or null if computation failed
  perceptualHash: string | null;
};

// Define the props this component accepts
type CameraCaptureProps = {
  // The current list of captured photos, owned by the parent wizard
  photos: CapturedPhoto[];
  // A callback to update the photo list in the parent wizard's state
  onPhotosChange: (photos: CapturedPhoto[]) => void;
  // The minimum number of photos required before the seller can proceed
  minPhotos: number;
  // The maximum number of photos allowed
  maxPhotos: number;
  // The currently logged-in user's ID, used to build the Storage upload path
  userId: string;
};

// Define and export the CameraCapture component
export function CameraCapture({ photos, onPhotosChange, minPhotos, maxPhotos, userId }: CameraCaptureProps) {
  // Start the live camera stream via our hook
  const { stream, error: cameraError, isLoading: isCameraLoading } = useCameraStream();
  // A ref to the <video> element we'll attach the live stream to
  const videoRef = useRef<HTMLVideoElement>(null);
  // Create one browser Supabase client instance for this component's lifetime
  const [supabase] = useState(() => createClient());
  // Track whether a capture-and-upload is currently in progress, to disable the button mid-action
  const [isCapturing, setIsCapturing] = useState(false);
  // Track any error from a failed capture/upload attempt
  const [captureError, setCaptureError] = useState<string | null>(null);

  // Attach the live stream to the <video> element once it's available
  useEffect(() => {
    // Only proceed if we actually have both the stream and the video element
    if (stream && videoRef.current) {
      // Set the video element's source to our live camera stream
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Define the click handler for the "Capture" button
  async function handleCapture() {
    // Guard clause: don't do anything if the video isn't ready yet
    if (!videoRef.current) return;
    // Clear any previous error
    setCaptureError(null);
    // Mark that a capture is now in progress
    setIsCapturing(true);

    try {
      // Grab both the full-resolution and compressed versions of the current frame
      const { beforeBlob, afterBlob } = await captureAndCompress(videoRef.current);

      // Best-effort geotagging — if this fails (e.g., permission revoked mid-session), we still
      // keep the photo, just without exif coordinates, rather than blocking the whole capture
      let exifLat: number | null = null;
      let exifLng: number | null = null;
      try {
        // Ask the browser for the current position (usually instant, since it's cached from earlier)
        const coords = await getCurrentPositionAsync();
        // Store the latitude
        exifLat = coords.lat;
        // Store the longitude
        exifLng = coords.lng;
      } catch {
        // Silently proceed without coordinates — this isn't fatal to capturing the photo
      }

      // Build a storage path scoped to this user's own folder, matching our RLS policy
      const filePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      // Upload the COMPRESSED blob (not the full-resolution one) to Supabase Storage
      const { error: uploadError } = await supabase.storage
        // Target the listing-photos bucket created in migration 0011
        .from("listing-photos")
        // Upload the compressed image to our generated path
        .upload(filePath, afterBlob, { contentType: "image/jpeg" });

      // If the upload failed, surface an error and don't add this photo to the list
      if (uploadError) {
        setCaptureError("Failed to upload the photo. Please try capturing it again.");
        return;
      }

      // Get the public URL Supabase Storage assigned to the file we just uploaded
      const { data: publicUrlData } = supabase.storage.from("listing-photos").getPublicUrl(filePath);

      // Compute the perceptual hash of the compressed image — done here (client-side) because
      // we have access to the raw blob; the server never gets the binary data, only the URL.
      // computeDHash is browser-only (uses HTMLCanvasElement) and fails gracefully if unavailable.
      const perceptualHash = await computeDHash(afterBlob);

      // Build the full CapturedPhoto object representing this successful capture
      const newPhoto: CapturedPhoto = {
        // A random local ID for React keys and removal
        id: crypto.randomUUID(),
        // A local preview URL generated straight from the compressed blob (avoids re-downloading it)
        previewUrl: URL.createObjectURL(afterBlob),
        // The now-public Storage URL for this photo
        uploadedUrl: publicUrlData.publicUrl,
        // The full-resolution blob's size, for the "before" comparison figure
        beforeSizeBytes: beforeBlob.size,
        // The compressed blob's size, for the "after" comparison figure
        afterSizeBytes: afterBlob.size,
        // The geotag latitude, if we got one
        exifLat,
        // The geotag longitude, if we got one
        exifLng,
        // The exact moment this photo was captured
        exifTimestamp: new Date().toISOString(),
        // The perceptual hash for duplicate detection (null if canvas unavailable)
        perceptualHash,
      };

      // Add the new photo to the end of the parent's photo list
      onPhotosChange([...photos, newPhoto]);
    } catch {
      // Catch any unexpected failure during the capture/compress step itself
      setCaptureError("Something went wrong capturing the photo. Please try again.");
    } finally {
      // Always clear the capturing flag
      setIsCapturing(false);
    }
  }

  // Define the handler for removing an already-captured photo from the list
  function handleRemovePhoto(id: string) {
    // Find the photo being removed so we can release its local preview URL
    const photoToRemove = photos.find((p) => p.id === id);
    // Release the temporary object URL to free up browser memory
    if (photoToRemove) URL.revokeObjectURL(photoToRemove.previewUrl);
    // Update the parent's photo list, filtering out the removed photo
    onPhotosChange(photos.filter((p) => p.id !== id));
  }

  // If the camera couldn't be started at all, show a clear blocking message —
  // deliberately no fallback file-upload option, per the anti-fraud requirement
  if (cameraError) {
    return (
      // A warning-styled card explaining camera access is required
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {/* The blocking error message */}
        {cameraError}
      </div>
    );
  }

  // Render the live camera UI
  return (
    // A vertical stack containing the live preview, capture button, and thumbnail grid
    <div className="space-y-4">
      {/* The live camera preview area */}
      <div className="relative overflow-hidden rounded-xl bg-black">
        {/* Show a loading message while the camera is still starting up */}
        {isCameraLoading && (
          <div className="flex h-[60vh] max-h-[560px] min-h-[340px] items-center justify-center text-sm font-medium text-white">Starting camera…</div>
        )}
        {/* The actual live video feed — muted/autoplay/playsInline are required for iOS Safari to autoplay */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={isCameraLoading ? "hidden" : "h-[60vh] max-h-[560px] min-h-[340px] w-full rounded-xl object-cover"}
        />
      </div>

      {/* Show any capture/upload error */}
      {captureError && <p className="text-sm text-red-600">{captureError}</p>}

      {/* The capture button, disabled while busy or once the max photo count is reached */}
      <button
        type="button"
        onClick={handleCapture}
        disabled={isCapturing || isCameraLoading || photos.length >= maxPhotos}
        className="w-full rounded-lg bg-cyan-600 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {/* Swap the label depending on state */}
        {isCapturing
          ? "Capturing..."
          : photos.length >= maxPhotos
            ? "Maximum photos reached"
            : `Capture photo (${photos.length}/${maxPhotos})`}
      </button>

      {/* A small helper line showing progress toward the minimum requirement */}
      <p className="text-xs text-neutral-500">
        {/* Tell the seller how many more photos they need, or confirm they're good to proceed */}
        {photos.length < minPhotos
          ? `At least ${minPhotos - photos.length} more photo${minPhotos - photos.length === 1 ? "" : "s"} needed.`
          : "Minimum photo requirement met — you can continue or add more."}
      </p>

      {/* Only render the thumbnail grid if there's at least one captured photo */}
      {photos.length > 0 && (
        // A responsive grid of thumbnails
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {/* Loop over every captured photo and render its thumbnail */}
          {photos.map((photo) => (
            // Each thumbnail is a relatively positioned container so we can overlay the remove button
            <div key={photo.id} className="relative">
              {/* The photo thumbnail itself — a local blob preview, so a plain <img> is correct here */}
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview URL, not a remote/static asset */}
              <img
                src={photo.previewUrl}
                alt="Captured listing photo"
                className="aspect-square w-full rounded-lg object-cover"
              />
              {/* The remove button, overlaid in the top-right corner of the thumbnail */}
              <button
                type="button"
                onClick={() => handleRemovePhoto(photo.id)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
              >
                ✕
              </button>
              {/* The before/after compression size badge */}
              <p className="mt-1 text-center text-[10px] text-neutral-500">
                {/* Show the size reduction, e.g., "2.4 MB → 340 KB" */}
                {formatFileSize(photo.beforeSizeBytes)} → {formatFileSize(photo.afterSizeBytes)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}