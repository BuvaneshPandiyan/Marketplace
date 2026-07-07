// Mark as Client Component
"use client";

// Import React's state hook
import { useState } from "react";
// Import Next.js's router for page refresh
import { useRouter } from "next/navigation";

// Define props
type AdminUserActionsProps = {
  // The user to act on
  userId: string;
  // Current suspension state — determines which button to show
  isSuspended: boolean;
  // Whether this user has a pending verification request
  hasPendingVerif: boolean;
  // Whether this user is an admin — admins can't be suspended from the UI
  isAdmin: boolean;
};

// Define and export the component
export function AdminUserActions({ userId, isSuspended, hasPendingVerif, isAdmin }: AdminUserActionsProps) {
  // Next.js router for page refresh
  const router = useRouter();
  // Which action is currently in flight
  const [pending, setPending] = useState<string | null>(null);
  // Any error from the API
  const [error, setError] = useState<string | null>(null);

  // Dispatch an action to the user action API route
  async function dispatch(action: "suspend" | "unsuspend" | "verify_seller", confirmMsg?: string) {
    // For suspend, show a confirmation prompt
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setPending(action);
    setError(null);
    const response = await fetch("/api/admin/users/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    setPending(null);
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Action failed");
      return;
    }
    // Refresh the page to reflect the updated state
    router.refresh();
  }

  // Render the action buttons
  return (
    <div className="flex flex-col gap-1.5">
      {/* Don't allow admins to be suspended from the UI (safety measure) */}
      {!isAdmin && (
        isSuspended ? (
          // Show "Unsuspend" when the user is suspended
          <button
            type="button"
            onClick={() => dispatch("unsuspend")}
            disabled={pending !== null}
            className="rounded px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-300 hover:bg-green-50 disabled:opacity-60"
          >
            {pending === "unsuspend" ? "…" : "Unsuspend"}
          </button>
        ) : (
          // Show "Suspend" when the user is active
          <button
            type="button"
            onClick={() => dispatch("suspend", "Suspend this user? Their active listings will be flagged.")}
            disabled={pending !== null}
            className="rounded px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-red-300 hover:bg-red-50 disabled:opacity-60"
          >
            {pending === "suspend" ? "…" : "Suspend"}
          </button>
        )
      )}

      {/* "Verify" button — only shown when a verification request is pending */}
      {hasPendingVerif && (
        <button
          type="button"
          onClick={() => dispatch("verify_seller", "Approve this seller's ID verification?")}
          disabled={pending !== null}
          className="rounded px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-300 hover:bg-blue-50 disabled:opacity-60"
        >
          {pending === "verify_seller" ? "…" : "Verify ✅"}
        </button>
      )}

      {/* Inline error display */}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
