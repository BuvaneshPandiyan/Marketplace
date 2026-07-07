// Mark this as a Client Component since it holds the star/comment form state
"use client";

// Import React's state hook
import { useState } from "react";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";

// Define the props this component accepts
type RatingPromptProps = {
  // Which listing this rating is for
  listingId: string;
  // Who is doing the rating (the current user)
  raterId: string;
  // Who is being rated (the other party in the conversation)
  ratedUserId: string;
  // The other person's display name, for the prompt text
  ratedUserName: string | null;
  // A callback fired once the rating has been submitted successfully, so the parent
  // can hide this modal and not show it again
  onDismiss: () => void;
};

// Define and export the RatingPrompt component
export function RatingPrompt({ listingId, raterId, ratedUserId, ratedUserName, onDismiss }: RatingPromptProps) {
  // Create one browser Supabase client instance for this component's lifetime
  const [supabase] = useState(() => createClient());
  // State holding the selected star rating (null until the user taps a star)
  const [selectedStars, setSelectedStars] = useState<number | null>(null);
  // State holding an optional written comment
  const [comment, setComment] = useState("");
  // State tracking whether the submit call is in flight
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State holding any error from the submission
  const [error, setError] = useState<string | null>(null);

  // Define the rating submission handler
  async function handleSubmit() {
    // Don't submit if no stars were selected yet
    if (!selectedStars) return;
    // Clear any previous error
    setError(null);
    // Mark as submitting
    setIsSubmitting(true);
    // Insert the rating row — the trigger will recompute the rated user's profile average
    const { error: insertError } = await supabase.from("ratings").insert({
      // Which listing/transaction this rating is for
      listing_id: listingId,
      // Who is leaving the rating
      rater_id: raterId,
      // Who is being rated
      rated_user_id: ratedUserId,
      // The selected star count
      stars: selectedStars,
      // The optional comment (null if empty)
      comment: comment.trim() || null,
    });
    // Mark as done
    setIsSubmitting(false);
    // If the insert failed, show the error
    if (insertError) {
      setError(insertError.message);
      return;
    }
    // Success — tell the parent to hide this prompt
    onDismiss();
  }

  // Render the rating modal
  return (
    // A semi-transparent overlay covering the chat panel
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95 px-4">
      {/* The modal card */}
      <div className="w-full max-w-xs rounded-xl border border-neutral-200 bg-white p-5 shadow-lg">
        {/* Prompt heading */}
        <h3 className="mb-1 text-base font-semibold text-neutral-900">Rate your experience</h3>
        {/* Prompt sub-text naming the person being rated */}
        <p className="mb-4 text-sm text-neutral-500">
          How was your transaction with {ratedUserName ?? "the other party"}?
        </p>

        {/* The five star buttons */}
        <div className="mb-3 flex justify-center gap-2">
          {/* Loop over the star values 1-5 */}
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setSelectedStars(star)}
              className={`text-2xl transition-transform hover:scale-110 ${
                // Highlight filled stars up to the selected value
                selectedStars !== null && star <= selectedStars ? "opacity-100" : "opacity-30"
              }`}
            >
              ⭐
            </button>
          ))}
        </div>

        {/* An optional comment textarea */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment (optional)"
          rows={3}
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        />

        {/* Show any submission error */}
        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

        {/* Action buttons: skip or submit */}
        <div className="flex gap-2">
          {/* The "maybe later" / skip button */}
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            Skip
          </button>
          {/* The submit button, disabled until a star count is selected */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedStars || isSubmitting}
            className="flex-1 rounded-lg bg-orange-600 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {/* Swap label while submitting */}
            {isSubmitting ? "Submitting..." : "Submit rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
