// Mark as Client Component since it manages open/close state and a Supabase insert
"use client";

// Import React's state hook
import { useState } from "react";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";
// Import the report-related types
import type { ReportTargetType, ReportReason } from "@/types";

// The human-readable labels for each report reason, shown in the dropdown
const REASON_LABELS: Record<ReportReason, string> = {
  fake_listing: "Fake or misleading listing",
  scam: "Scam or fraud",
  inappropriate: "Inappropriate content",
  wrong_category: "Wrong category",
  other: "Other",
};

// Define the props this component accepts
type ReportButtonProps = {
  // What kind of thing is being reported
  targetType: ReportTargetType;
  // The ID of the thing being reported (listing ID, user ID, or message ID)
  targetId: string;
  // Whether the current user is logged in — show a nudge if not
  isLoggedIn: boolean;
};

// Define and export the ReportButton component
export function ReportButton({ targetType, targetId, isLoggedIn }: ReportButtonProps) {
  // Create one browser Supabase client for this component's lifetime
  const [supabase] = useState(() => createClient());
  // Whether the report form modal is currently open
  const [isOpen, setIsOpen] = useState(false);
  // The currently selected reason from the dropdown
  const [reason, setReason] = useState<ReportReason>("fake_listing");
  // The optional freeform comment
  const [comment, setComment] = useState("");
  // Whether the submit call is in flight
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Whether the report was successfully submitted (swaps button to a thank-you message)
  const [isSubmitted, setIsSubmitted] = useState(false);
  // Any error from the submission
  const [error, setError] = useState<string | null>(null);

  // After a successful report, show a small thank-you message instead of the button
  if (isSubmitted) {
    return (
      <p className="text-xs text-neutral-500">
        ✓ Report submitted. Thank you for helping keep the marketplace safe.
      </p>
    );
  }

  // The report form modal (shown only when isOpen is true)
  if (isOpen) {
    return (
      // An inline card that replaces the button when open — keeping it inline avoids the z-index
      // issues of an overlay modal and keeps the form accessible on small screens
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-md">
        {/* Modal heading */}
        <p className="mb-3 text-sm font-semibold text-neutral-900">Report this {targetType}</p>

        {/* Reason dropdown */}
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as ReportReason)}
          className="mb-2 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        >
          {/* Render one option per reason */}
          {(Object.keys(REASON_LABELS) as ReportReason[]).map((key) => (
            <option key={key} value={key}>
              {REASON_LABELS[key]}
            </option>
          ))}
        </select>

        {/* Optional comment textarea */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional: add more detail"
          rows={2}
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
        />

        {/* Show any submission error */}
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

        {/* Cancel / Submit row */}
        <div className="flex gap-2">
          {/* Cancel button — closes the form without submitting */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex-1 rounded-lg border border-neutral-300 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
          {/* Submit button */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={async () => {
              // Clear previous error
              setError(null);
              // Mark as submitting
              setIsSubmitting(true);
              // Insert the report row — the unique constraint will reject a duplicate
              const { error: insertError } = await supabase.from("reports").insert({
                // reporter_id is set server-side by RLS; still pass it for the INSERT policy check
                reporter_id: (await supabase.auth.getUser()).data.user?.id,
                target_type: targetType,
                target_id: targetId,
                reason,
                // Only include the comment if the user actually typed something
                comment: comment.trim() || null,
              });
              setIsSubmitting(false);
              if (insertError) {
                // The unique constraint gives a specific error code we can show a nicer message for
                setError(
                  insertError.code === "23505"
                    ? "You've already reported this."
                    : insertError.message
                );
                return;
              }
              // Success — swap to the thank-you state
              setIsSubmitted(true);
            }}
            className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isSubmitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    );
  }

  // Default state: the small "Report" trigger button
  return (
    <button
      type="button"
      onClick={() => {
        // If not logged in, nudge them to login instead of opening the form
        if (!isLoggedIn) {
          window.location.href = "/login";
          return;
        }
        // Open the form
        setIsOpen(true);
      }}
      className="text-xs text-neutral-400 hover:text-red-600"
    >
      Report
    </button>
  );
}
