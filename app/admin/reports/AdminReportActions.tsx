// Mark as Client Component
"use client";

// Import React's state hook
import { useState } from "react";
// Import Next.js's router for page refresh
import { useRouter } from "next/navigation";

// Define props
type AdminReportActionsProps = {
  // The report to act on
  reportId: string;
  // The current status — hide action buttons for already-resolved reports
  currentStatus: string;
};

// Define and export the component
export function AdminReportActions({ reportId, currentStatus }: AdminReportActionsProps) {
  // Get the router for page refresh after action
  const router = useRouter();
  // Which action is currently in flight
  const [pending, setPending] = useState<string | null>(null);
  // Any error from the API
  const [error, setError] = useState<string | null>(null);
  // Whether this row has been acted on (hides buttons)
  const [done, setDone] = useState(false);

  // Show a simple status badge for already-actioned reports
  if (done || currentStatus === "resolved" || currentStatus === "dismissed") {
    return (
      <span className={`text-xs font-medium ${
        currentStatus === "resolved" || done ? "text-green-700" : "text-neutral-500"
      }`}>
        {done ? "✓ Done" : currentStatus}
      </span>
    );
  }

  // Dispatch an action to the API route
  async function dispatch(action: "resolve" | "dismiss") {
    setPending(action);
    setError(null);
    const response = await fetch("/api/admin/reports/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, action }),
    });
    setPending(null);
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Failed");
      return;
    }
    setDone(true);
    router.refresh();
  }

  // Render the two action buttons
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => dispatch("resolve")}
        disabled={pending !== null}
        className="rounded px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-300 hover:bg-green-50 disabled:opacity-60"
      >
        {pending === "resolve" ? "…" : "Resolve"}
      </button>
      <button
        type="button"
        onClick={() => dispatch("dismiss")}
        disabled={pending !== null}
        className="rounded px-2 py-1 text-xs font-medium text-neutral-600 ring-1 ring-neutral-300 hover:bg-neutral-50 disabled:opacity-60"
      >
        {pending === "dismiss" ? "…" : "Dismiss"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
