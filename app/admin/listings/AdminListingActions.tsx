// Mark as Client Component since the buttons need state (loading/error/confirmation)
"use client";

// Import React's state hook
import { useState } from "react";
// Import Next.js's router for refreshing the page after a successful action
import { useRouter } from "next/navigation";

// Define the props this component accepts
type AdminListingActionsProps = {
  // The listing to act on
  listingId: string;
  // The seller's ID (used for the ban confirmation message)
  sellerId: string;
  // The seller's display name (used in the confirmation prompt)
  sellerName: string;
};

// Define and export the action buttons component
export function AdminListingActions({ listingId, sellerId, sellerName }: AdminListingActionsProps) {
  // Next.js router for refreshing the queue after an action
  const router = useRouter();
  // Which action is currently in flight ("approve", "remove", "ban_seller", or null)
  const [pending, setPending] = useState<string | null>(null);
  // Any error returned by the API route
  const [error, setError] = useState<string | null>(null);
  // Whether this card has been acted on (hides the buttons after success)
  const [done, setDone] = useState(false);

  // If the card was acted on, show a simple "Done" badge instead of the buttons
  if (done) {
    return <p className="text-xs font-medium text-green-700">✓ Action taken</p>;
  }

  // Define the action dispatcher
  async function dispatch(action: "approve" | "remove" | "ban_seller", confirmMsg?: string) {
    // For destructive actions, show a native browser confirmation prompt first
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    // Mark this action as in flight
    setPending(action);
    setError(null);
    // Call the admin listings action API route
    const response = await fetch("/api/admin/listings/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, sellerId, action }),
    });
    setPending(null);
    // Handle errors from the API
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Action failed");
      return;
    }
    // Success — hide the buttons and refresh the queue so the acted-on card disappears
    setDone(true);
    router.refresh();
  }

  // Render the three action buttons in a horizontal row
  return (
    <div className="flex items-center gap-3">
      {/* Approve button — restores the listing to active */}
      <button
        type="button"
        onClick={() => dispatch("approve")}
        disabled={pending !== null}
        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-60"
      >
        {pending === "approve" ? "Approving…" : "Approve"}
      </button>

      {/* Remove button — permanently removes the listing */}
      <button
        type="button"
        onClick={() => dispatch("remove", "Remove this listing permanently? This cannot be undone.")}
        disabled={pending !== null}
        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending === "remove" ? "Removing…" : "Remove"}
      </button>

      {/* Ban seller button — suspends the seller AND removes this listing */}
      <button
        type="button"
        onClick={() =>
          dispatch(
            "ban_seller",
            `Suspend ${sellerName} and remove all their active listings? This is reversible from the Users page.`
          )
        }
        disabled={pending !== null}
        className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-900 disabled:opacity-60"
      >
        {pending === "ban_seller" ? "Banning…" : "Ban Seller"}
      </button>

      {/* Show any error message inline */}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
