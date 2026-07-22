// Mark this as a Client Component since it's an interactive form with file handling
"use client";

// Import React's state hook
import { useState } from "react";
// Import Next.js's router for navigating onward once onboarding is saved
import { useRouter } from "next/navigation";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";
// Import our useUser hook so we can refresh the cached profile after saving
import { useUser } from "@/lib/hooks/useUser";

// Define and export the onboarding profile form component
export function OnboardingProfileForm() {
  // Get the router so we can navigate to the next onboarding step once this form is saved
  const router = useRouter();
  // Pull the current user and the refreshProfile function from our auth context
  const { user, refreshProfile } = useUser();
  // Create one browser Supabase client instance for this component's lifetime
  const [supabase] = useState(() => createClient());

  // State holding the name the user types in
  const [name, setName] = useState("");
  // State holding the actual File object if they pick a profile photo
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  // State holding a local preview URL for the chosen photo, so they can see it before saving
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  // State tracking whether the form is currently submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State holding any error message to show the user
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Define a handler for when the user picks a photo file from their device
  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Grab the first selected file, if any
    const file = event.target.files?.[0];
    // If they didn't actually pick a file (e.g., cancelled the picker), do nothing further
    if (!file) return;
    // Store the chosen file in state so we can upload it on submit
    setPhotoFile(file);
    // Generate a temporary local URL so we can preview the image immediately
    setPhotoPreviewUrl(URL.createObjectURL(file));
  }

  // Define the form submission handler
  async function handleSubmit(event: React.FormEvent) {
    // Prevent the browser's default full-page form submission
    event.preventDefault();
    // Clear any previous error
    setErrorMessage(null);

    // Guard clause: a name is required before continuing
    if (!name.trim()) {
      // Show a validation error and stop here
      setErrorMessage("Please enter your name.");
      return;
    }

    // Guard clause: we need a logged-in user to know which profile row to update
    if (!user) {
      // This shouldn't normally happen since the page itself is auth-protected, but guard anyway
      setErrorMessage("You need to be logged in to continue.");
      return;
    }

    // Mark the form as submitting
    setIsSubmitting(true);

    try {
      // Start with no photo URL — we'll fill this in only if a photo was selected
      let profilePhotoUrl: string | null = null;

      // If the user selected a photo, upload it to Supabase Storage first
      if (photoFile) {
        // Build a storage path scoped to this user's own folder (matches our RLS policy)
        const filePath = `${user.id}/${Date.now()}-${photoFile.name}`;
        // Upload the file to the profile-photos bucket
        const { error: uploadError } = await supabase.storage
          // Target the profile-photos bucket created in our SQL migration
          .from("profile-photos")
          // Upload the file to the path we just built
          .upload(filePath, photoFile, {
            // Allow overwriting if the same path somehow already exists
            upsert: true,
          });

        // If the upload failed, show an error and stop before touching the profiles table
        if (uploadError) {
          // Show a clear error message
          setErrorMessage("Failed to upload your photo. Please try again.");
          return;
        }

        // Get the public URL for the file we just uploaded
        const { data: publicUrlData } = supabase.storage
          // Target the same bucket
          .from("profile-photos")
          // Ask for the public URL of the uploaded file
          .getPublicUrl(filePath);

        // Store the resulting public URL for saving into the profiles table
        profilePhotoUrl = publicUrlData.publicUrl;
      }

      // Update the user's profile row with their name and (if uploaded) photo URL
      const { error: updateError } = await supabase
        // Target the profiles table
        .from("profiles")
        // Update these specific columns
        .update({
          // Save the trimmed name
          name: name.trim(),
          // Only overwrite the photo URL if we actually uploaded a new one
          ...(profilePhotoUrl ? { profile_photo_url: profilePhotoUrl } : {}),
        })
        // Only update this user's own row
        .eq("id", user.id);

      // If the update failed, show an error and stop
      if (updateError) {
        // Show a clear error message
        setErrorMessage("Failed to save your profile. Please try again.");
        return;
      }

      // Refresh the cached profile in our UserProvider context so the rest of the app sees the update
      await refreshProfile();

      // Fire the welcome notification + email — call the server-side route so it runs with the
      // service-role key without exposing secrets to the browser. Fire-and-forget: don't await
      // so it doesn't delay the navigation if the email provider is slow
      fetch("/api/notifications/welcome", { method: "POST" }).catch(() => {
        // Swallow errors — a missed welcome notification should never block onboarding
      });

      // Move on to the next onboarding step (location setup, built in a later prompt)
      router.push("/onboarding/location");
    } catch {
      // Catch any unexpected network-level failure
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      // Always clear the submitting flag
      setIsSubmitting(false);
    }
  }

  // Render the onboarding form
  return (
    // A card-style container, consistent with the login screens
    <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {/* Heading for this screen */}
      <h1 className="mb-1 text-lg font-semibold text-neutral-900">Tell us about you</h1>
      {/* Short explanatory subtext */}
      <p className="mb-4 text-sm text-neutral-500">Just a couple of details to get started.</p>

      {/* The onboarding form itself */}
      <form onSubmit={handleSubmit}>
        {/* A centered circular photo picker/preview */}
        <div className="mb-4 flex justify-center">
          {/* The clickable label wraps a hidden file input, styled to look like an avatar circle */}
          <label className="relative h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-neutral-300 bg-neutral-50 hover:border-rose-400">
            {/* Show the chosen photo preview if one exists, otherwise show a placeholder icon */}
            {photoPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a local blob preview URL doesn't work with next/image
              <img
                src={photoPreviewUrl}
                alt="Profile preview"
                className="h-full w-full object-cover"
              />
            ) : (
              // A simple placeholder icon shown when no photo has been chosen yet
              <span className="flex h-full w-full items-center justify-center text-2xl text-neutral-400">
                📷
              </span>
            )}
            {/* The actual file input, visually hidden but still accessible/clickable via the label */}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        </div>
        {/* A small caption clarifying this photo is optional and handled differently from listing photos */}
        <p className="mb-4 text-center text-xs text-neutral-400">
          Optional — you can upload this from your gallery
        </p>

        {/* The name input field */}
        <label className="mb-1 block text-sm font-medium text-neutral-700">Your name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Priya Sharma"
          className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
        />

        {/* Conditionally render an error message if one exists */}
        {errorMessage && <p className="mb-3 text-sm text-red-600">{errorMessage}</p>}

        {/* The submit button, disabled while saving */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-rose-900 py-2.5 text-sm font-medium text-white transition hover:bg-rose-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {/* Swap the label depending on whether we're currently saving */}
          {isSubmitting ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}