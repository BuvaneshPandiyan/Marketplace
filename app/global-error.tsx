// Error boundaries must be Client Components — they use React class-based error catching
"use client";

// Import React's useEffect hook for logging the error
import { useEffect } from "react";

// Define the props this component receives from Next.js's error boundary system
type ErrorProps = {
  // The error that was thrown — passed by Next.js automatically
  error: Error & { digest?: string };
  // A function to attempt re-rendering the failed subtree — passed by Next.js automatically
  reset: () => void;
};

// Define and export the global error boundary component.
// Next.js renders this instead of the page whenever an unhandled error escapes a Server Component.
export default function GlobalError({ error, reset }: ErrorProps) {
  // Log the error to the console in development so we can debug it easily
  useEffect(() => {
    // Only log in non-production environments to avoid polluting production logs with user-facing errors
    console.error("[GlobalError]", error);
  }, [error]);

  // Render a minimal recovery screen — no app shell, since the root layout may itself have failed
  return (
    // A full-screen centered layout using plain HTML (no imported components that might also fail)
    <html lang="en">
      <body>
        {/* A centered card with just enough information to tell the user what happened */}
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
            padding: "24px",
            backgroundColor: "#fafafa",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            {/* A large emoji instead of an icon (no asset imports that could fail) */}
            <p style={{ fontSize: 48, marginBottom: 12 }}>😕</p>
            {/* The error heading */}
            <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: "#111" }}>
              Something went wrong
            </h1>
            {/* A brief explanation */}
            <p style={{ fontSize: 14, color: "#666", marginBottom: 24 }}>
              An unexpected error occurred. We&apos;ve been notified and are looking into it.
            </p>
            {/* Two recovery options: try again or go home */}
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  padding: "10px 20px",
                  background: "#ea580c",
                  color: "white",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              {/* A plain <a> tag is intentional here — this component renders outside the Next.js
                  router (it's the global fallback), so next/link is not available */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{
                  padding: "10px 20px",
                  background: "white",
                  color: "#374151",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
