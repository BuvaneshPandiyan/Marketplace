// Error boundaries must be Client Components
"use client";

// Import the useEffect hook for error logging
import { useEffect } from "react";
// Import Next.js's Link component for client-side navigation
import Link from "next/link";

// Define the props from Next.js's error boundary system
type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// The error boundary for the (main) route group — renders inside the normal layout
// so the header/nav remain visible while the broken page area shows this recovery UI
export default function MainError({ error, reset }: ErrorProps) {
  // Log the error in dev
  useEffect(() => {
    console.error("[MainError]", error);
  }, [error]);

  // Render a centered recovery card inside the existing page layout
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      {/* A friendly emoji header */}
      <p className="mb-3 text-5xl">😕</p>
      {/* The primary heading */}
      <h2 className="mb-2 text-lg font-bold text-neutral-900">Something went wrong</h2>
      {/* A brief explanation */}
      <p className="mb-6 max-w-sm text-sm text-neutral-500">
        This page ran into an unexpected error. You can try again or go back to the home feed.
      </p>
      {/* Action buttons */}
      <div className="flex gap-3">
        {/* Re-render button — triggers Next.js to re-run the failing component */}
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          Try again
        </button>
        {/* Navigate away to safety */}
        <Link
          href="/"
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
