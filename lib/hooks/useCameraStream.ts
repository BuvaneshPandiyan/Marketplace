// Mark this as a Client Component hook since it accesses browser camera APIs
"use client";

// Import React's state and effect hooks
import { useEffect, useState } from "react";

// Define the shape of what this hook returns
type CameraStreamResult = {
  // The live MediaStream once permission is granted, null until then (or if it failed)
  stream: MediaStream | null;
  // A user-facing error message if the camera couldn't be started, null if everything's fine
  error: string | null;
  // Whether we're still waiting on the initial permission prompt/stream setup
  isLoading: boolean;
};

// Define and export the hook
export function useCameraStream(): CameraStreamResult {
  // State holding the active camera stream once we have one
  const [stream, setStream] = useState<MediaStream | null>(null);
  // State holding any error message
  const [error, setError] = useState<string | null>(null);
  // State tracking whether we're still in the initial setup phase
  const [isLoading, setIsLoading] = useState(true);

  // Run this effect once when the component using this hook mounts
  useEffect(() => {
    // Keep a local reference to the stream so we can clean it up even if state hasn't updated yet
    let activeStream: MediaStream | null = null;

    // Define an async function so we can use await inside this effect
    async function startCamera() {
      // Guard clause: some browsers/environments don't expose the camera API at all
      if (!navigator.mediaDevices?.getUserMedia) {
        // Surface a clear error explaining camera access is required
        setError("Camera access isn't available in this browser. A live camera is required to post a listing.");
        // Mark setup as finished (with an error)
        setIsLoading(false);
        // Stop here — there's nothing more we can do
        return;
      }

      try {
        // Ask the browser for a video-only stream, preferring the rear-facing camera on phones
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          // Request video, preferring the environment (rear) camera where available
          video: { facingMode: "environment" },
        });
        // Remember this stream locally for cleanup purposes
        activeStream = mediaStream;
        // Store the stream in state so the component can attach it to a <video> element
        setStream(mediaStream);
      } catch {
        // Any failure here (permission denied, no camera hardware, etc.) gets the same clear message,
        // since we deliberately do NOT want to fall back to a file picker for product photos
        setError("Camera access is required to post a listing. Please allow camera access and try again.");
      } finally {
        // Either way, the initial setup attempt is now finished
        setIsLoading(false);
      }
    }

    // Kick off the camera startup
    startCamera();

    // Cleanup function: runs when the component unmounts, or before this effect re-runs
    return () => {
      // Stop every track (the camera light should turn off) if we ever got a stream
      activeStream?.getTracks().forEach((track) => track.stop());
    };
    // This effect should only run once, when the camera UI first mounts
  }, []);

  // Return the current stream/error/loading state to the calling component
  return { stream, error, isLoading };
}
