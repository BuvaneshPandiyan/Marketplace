// Mark as Client Component since it manages camera state and Supabase uploads
"use client";

// Import React's state and effect hooks
import { useEffect, useRef, useState } from "react";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";
// Import the VerificationRequest type
import type { VerificationRequest } from "@/types";

// ── VerificationPage component ──────────────────────────────────────────────────────────
// Define and export the page component
export default function VerificationPage() {
  // Create a browser Supabase client once for this page's lifetime
  const [supabase] = useState(() => createClient());
  // The current user's ID, fetched on mount
  const [userId, setUserId] = useState<string | null>(null);
  // The user's existing verification request, if any
  const [existingRequest, setExistingRequest] = useState<VerificationRequest | null | undefined>(undefined);
  // Whether the upload is in progress
  const [isUploading, setIsUploading] = useState(false);
  // Error message to show if something goes wrong
  const [error, setError] = useState<string | null>(null);
  // A blob captured for the government ID photo
  const [idPhotoBlob, setIdPhotoBlob] = useState<Blob | null>(null);
  // A blob captured for the live selfie
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  // Preview URLs for the two captured images
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);
  // Track which photo is currently being captured ("id" or "selfie" or null)
  const [capturingFor, setCapturingFor] = useState<"id" | "selfie" | null>(null);
  // A ref to the video element for the live camera feed
  const videoRef = useRef<HTMLVideoElement>(null);
  // A ref to the canvas used for frame capture
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The active camera MediaStream, so we can stop it later
  const streamRef = useRef<MediaStream | null>(null);

  // Fetch the current user and their existing verification request on mount
  useEffect(() => {
    async function load() {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      // Look for an existing verification request for this user
      const { data } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setExistingRequest((data as VerificationRequest) ?? null);
    }
    load();
  }, [supabase]);

  // Start the camera for the given capture type (ID or selfie)
  async function startCamera(captureType: "id" | "selfie") {
    setCapturingFor(captureType);
    try {
      // Request camera access — use the rear camera for the ID, the front for the selfie
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          // facingMode: 'user' = front camera (selfie); 'environment' = rear camera (ID)
          facingMode: captureType === "selfie" ? "user" : "environment",
        },
      });
      // Store the stream so we can stop it later
      streamRef.current = stream;
      // Attach the stream to the video element to show the live preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      // Camera permission denied or not available
      setError("Camera not available. Please ensure camera permissions are granted.");
      setCapturingFor(null);
    }
  }

  // Capture the current camera frame and store it as a blob
  function captureFrame() {
    // Make sure the video and canvas are ready
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // Size the canvas to match the video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Draw the current frame onto the canvas
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    // Convert the canvas to a JPEG blob for upload
    canvas.toBlob((blob) => {
      if (!blob) return;
      // Create a preview URL from the blob to show the capture result
      const previewUrl = URL.createObjectURL(blob);
      if (capturingFor === "id") {
        setIdPhotoBlob(blob);
        setIdPreviewUrl(previewUrl);
      } else if (capturingFor === "selfie") {
        setSelfieBlob(blob);
        setSelfiePreviewUrl(previewUrl);
      }
      // Stop the camera stream now that we have the capture
      stopCamera();
    }, "image/jpeg", 0.85);
  }

  // Stop the camera stream and reset the capturing state
  function stopCamera() {
    // Stop every track in the stream to release the camera hardware
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCapturingFor(null);
  }

  // Upload both captured photos and submit the verification request
  async function handleSubmit() {
    // Both photos are required before we can submit
    if (!idPhotoBlob || !selfieBlob || !userId) return;
    setError(null);
    setIsUploading(true);

    try {
      // Upload the government ID photo to the private verif-docs bucket
      const idPath = `${userId}/id-${Date.now()}.jpg`;
      const { error: idUploadError } = await supabase.storage
        .from("verif-docs")
        .upload(idPath, idPhotoBlob, { contentType: "image/jpeg", upsert: true });
      if (idUploadError) throw new Error("ID photo upload failed: " + idUploadError.message);

      // Upload the selfie photo to the same private bucket
      const selfiePath = `${userId}/selfie-${Date.now()}.jpg`;
      const { error: selfieUploadError } = await supabase.storage
        .from("verif-docs")
        .upload(selfiePath, selfieBlob, { contentType: "image/jpeg", upsert: true });
      if (selfieUploadError) throw new Error("Selfie upload failed: " + selfieUploadError.message);

      // Build the signed URLs (private bucket — signed URL valid for 1 year)
      const { data: idSigned } = await supabase.storage
        .from("verif-docs")
        .createSignedUrl(idPath, 60 * 60 * 24 * 365);
      const { data: selfieSigned } = await supabase.storage
        .from("verif-docs")
        .createSignedUrl(selfiePath, 60 * 60 * 24 * 365);

      // Upsert the verification_requests row — on conflict (same user), update the photos
      // so users can re-submit after a rejection without creating a second row
      const { error: upsertError } = await supabase
        .from("verification_requests")
        .upsert(
          {
            user_id: userId,
            id_photo_url: idSigned?.signedUrl ?? "",
            selfie_url: selfieSigned?.signedUrl ?? "",
            status: "pending",
            reviewed_at: null,
            admin_notes: null,
          },
          { onConflict: "user_id" }
        );
      if (upsertError) throw new Error("Submission failed: " + upsertError.message);

      // Reload the request to show the new pending status
      const { data: updated } = await supabase
        .from("verification_requests")
        .select("*")
        .eq("user_id", userId)
        .single();
      setExistingRequest(updated as VerificationRequest);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsUploading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Page heading */}
      <h1 className="mb-1 text-lg font-bold text-neutral-900">Seller Verification</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Verify your identity to show a ✅ badge on your profile and listings, which builds buyer trust.
        Our team manually reviews your documents within 24 hours.
      </p>

      {/* Show status if the user has already submitted a request */}
      {existingRequest !== undefined && existingRequest !== null ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-semibold text-neutral-900">Verification status</p>
          {existingRequest.status === "pending" && (
            <p className="mt-1 text-sm text-amber-700">⏳ Your documents are under review. We&apos;ll notify you once done.</p>
          )}
          {existingRequest.status === "approved" && (
            <p className="mt-1 text-sm text-green-700">✅ You&apos;re verified! Your badge is now visible on your listings.</p>
          )}
          {existingRequest.status === "rejected" && (
            <>
              <p className="mt-1 text-sm text-red-700">❌ Verification rejected.</p>
              {existingRequest.admin_notes && (
                <p className="mt-0.5 text-xs text-neutral-600">Reason: {existingRequest.admin_notes}</p>
              )}
              <p className="mt-2 text-sm text-neutral-500">You can re-submit updated photos below.</p>
            </>
          )}
        </div>
      ) : existingRequest === null ? (
        // No request yet — show the capture form
        <></>
      ) : (
        // Still loading
        <p className="text-sm text-neutral-400">Loading…</p>
      )}

      {/* The capture form — shown to users with no request or a rejected one */}
      {(existingRequest === null || existingRequest?.status === "rejected") && (
        <div className="mt-4 space-y-4">
          {/* Step 1: Government ID photo */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-neutral-800">Step 1: Government ID photo</p>
            <p className="mb-3 text-xs text-neutral-500">
              Take a photo of a government-issued ID (Aadhaar, PAN card, driving licence, passport).
              The details must be clearly readable.
            </p>
            {idPreviewUrl ? (
              // Show the captured ID preview with a "Retake" option
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element -- user-captured blob preview */}
                <img src={idPreviewUrl} alt="ID preview" className="mb-2 w-full rounded-lg object-contain" style={{maxHeight: 200}} />
                <button type="button" onClick={() => { setIdPhotoBlob(null); setIdPreviewUrl(null); }}
                  className="text-xs text-orange-600 hover:text-orange-700">Retake</button>
              </div>
            ) : (
              <button type="button" onClick={() => startCamera("id")}
                className="w-full rounded-lg border border-neutral-300 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                📷 Open camera for ID
              </button>
            )}
          </div>

          {/* Step 2: Live selfie */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="mb-2 text-sm font-semibold text-neutral-800">Step 2: Live selfie</p>
            <p className="mb-3 text-xs text-neutral-500">
              Take a clear selfie of your face. Look directly at the camera.
            </p>
            {selfiePreviewUrl ? (
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element -- user-captured blob preview */}
                <img src={selfiePreviewUrl} alt="Selfie preview" className="mb-2 w-full rounded-lg object-contain" style={{maxHeight: 200}} />
                <button type="button" onClick={() => { setSelfieBlob(null); setSelfiePreviewUrl(null); }}
                  className="text-xs text-orange-600 hover:text-orange-700">Retake</button>
              </div>
            ) : (
              <button type="button" onClick={() => startCamera("selfie")}
                className="w-full rounded-lg border border-neutral-300 py-2 text-sm text-neutral-700 hover:bg-neutral-50">
                🤳 Open front camera for selfie
              </button>
            )}
          </div>

          {/* Camera view — shown while actively capturing */}
          {capturingFor && (
            <div className="rounded-xl border border-neutral-200 bg-black p-2">
              {/* The live video feed */}
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
              {/* Action buttons below the live view */}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={captureFrame}
                  className="flex-1 rounded-lg bg-orange-600 py-2 text-sm font-medium text-white">
                  📸 Capture
                </button>
                <button type="button" onClick={stopCamera}
                  className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm text-neutral-700 bg-white">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Hidden canvas used for frame capture — never displayed to the user */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Show any error */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Submit button — only enabled when both photos are captured */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!idPhotoBlob || !selfieBlob || isUploading}
            className="w-full rounded-lg bg-orange-600 py-3 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {isUploading ? "Uploading…" : "Submit for verification"}
          </button>

          <p className="text-xs text-neutral-400 text-center">
            Your documents are stored securely and are only accessible to our moderation team.
          </p>
        </div>
      )}
    </div>
  );
}
