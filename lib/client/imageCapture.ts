// The maximum dimension (longest side) we compress captured photos down to, in pixels
const MAX_DIMENSION_PX = 1600;
// The JPEG quality we compress captured photos to (0 to 1) — high enough to look sharp,
// low enough to keep file sizes small
const COMPRESSED_QUALITY = 0.8;

// Define the shape of what a single capture produces
export type CaptureResult = {
  // The full-resolution blob, used only to measure the "before" file size for the UI
  beforeBlob: Blob;
  // The resized + compressed blob — this is the one we actually upload and store
  afterBlob: Blob;
};

// Define and export a function that draws the video's CURRENT frame onto a canvas at its
// native resolution, used to measure how large an uncompressed capture would have been
function captureFullResolutionBlob(video: HTMLVideoElement): Promise<Blob> {
  // Create an off-screen canvas element to draw onto
  const canvas = document.createElement("canvas");
  // Size the canvas to match the video's native resolution
  canvas.width = video.videoWidth;
  // Match the canvas height to the video's native height
  canvas.height = video.videoHeight;
  // Get a 2D drawing context for this canvas
  const context = canvas.getContext("2d");
  // Draw the current video frame onto the canvas at full size
  context?.drawImage(video, 0, 0, canvas.width, canvas.height);
  // Convert the canvas contents into a Blob, wrapped in a Promise since toBlob is callback-based
  return new Promise((resolve, reject) => {
    // Ask the canvas to encode itself as a high-quality JPEG
    canvas.toBlob(
      // The callback receives the resulting Blob (or null on failure)
      (blob) => {
        // If encoding failed, reject the Promise
        if (!blob) {
          reject(new Error("Failed to capture the photo."));
          // Stop here
          return;
        }
        // Otherwise resolve with the resulting blob
        resolve(blob);
      },
      // Use JPEG format
      "image/jpeg",
      // Use a near-lossless quality since this is just our size-comparison baseline
      0.95
    );
  });
}

// Define and export a function that draws the video's current frame onto a SCALED-DOWN canvas,
// producing the smaller, compressed version we actually keep and upload
function captureCompressedBlob(video: HTMLVideoElement): Promise<Blob> {
  // Start from the video's native width/height
  const nativeWidth = video.videoWidth;
  // The video's native height
  const nativeHeight = video.videoHeight;
  // Figure out the scale factor needed so the longest side is at most MAX_DIMENSION_PX
  const scale = Math.min(1, MAX_DIMENSION_PX / Math.max(nativeWidth, nativeHeight));
  // Compute the scaled-down width, rounded to a whole pixel
  const targetWidth = Math.round(nativeWidth * scale);
  // Compute the scaled-down height, rounded to a whole pixel
  const targetHeight = Math.round(nativeHeight * scale);

  // Create an off-screen canvas sized to our target (compressed) dimensions
  const canvas = document.createElement("canvas");
  // Set the canvas width to our computed target width
  canvas.width = targetWidth;
  // Set the canvas height to our computed target height
  canvas.height = targetHeight;
  // Get a 2D drawing context for this canvas
  const context = canvas.getContext("2d");
  // Draw the video frame onto the canvas, scaled down to the target dimensions in one step —
  // this single drawImage call does both the resizing AND the frame capture together
  context?.drawImage(video, 0, 0, targetWidth, targetHeight);

  // Convert the canvas contents into a compressed JPEG Blob
  return new Promise((resolve, reject) => {
    // Ask the canvas to encode itself as a JPEG at our chosen compression quality
    canvas.toBlob(
      // The callback receives the resulting Blob (or null on failure)
      (blob) => {
        // If encoding failed, reject the Promise
        if (!blob) {
          reject(new Error("Failed to compress the photo."));
          // Stop here
          return;
        }
        // Otherwise resolve with the resulting compressed blob
        resolve(blob);
      },
      // Use JPEG format
      "image/jpeg",
      // Use our chosen compression quality constant
      COMPRESSED_QUALITY
    );
  });
}

// Define and export the main function the camera UI calls — produces both blobs at once
export async function captureAndCompress(video: HTMLVideoElement): Promise<CaptureResult> {
  // Capture the full-resolution version first, purely to show the "before" size in the UI
  const beforeBlob = await captureFullResolutionBlob(video);
  // Capture the resized/compressed version — this is the one we actually keep
  const afterBlob = await captureCompressedBlob(video);
  // Return both blobs together
  return { beforeBlob, afterBlob };
}

// Define and export a small helper that formats a byte count into a friendly string like "340 KB"
export function formatFileSize(bytes: number): string {
  // For anything under 1MB, show kilobytes
  if (bytes < 1024 * 1024) {
    // Round to the nearest whole kilobyte
    return `${Math.round(bytes / 1024)} KB`;
  }
  // For anything 1MB or larger, show megabytes with one decimal place
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
