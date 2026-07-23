"use client";

import { useAuthGate } from "@/components/auth/AuthGateContext";

/**
 * "View exact location", gated behind sign-in.
 *
 * A listing's approximate area is public — that is what makes browsing useful.
 * The precise coordinates are not: they point at where a stranger keeps the
 * item, often their home. So this sits behind a login for the same reason the
 * phone number and chat do, and it means an actual account is attached to
 * anyone collecting addresses.
 *
 * Exists as a client component because the listing page is a Server Component
 * and cannot run the auth-gate hook itself.
 */
export function ViewLocationButton({
  lat,
  lng,
  className,
}: {
  lat: number;
  lng: number;
  className?: string;
}) {
  const { requireAuth } = useAuthGate();
  const href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(e) => {
        // requireAuth() opens the sign-in prompt and returns false when nobody
        // is logged in. Kept as a real <a> with a working href so middle-click
        // and "open in new tab" still behave for signed-in users, and screen
        // readers announce it as a link — the handler only intercepts a plain
        // click.
        if (!requireAuth("view the exact location")) {
          e.preventDefault();
        }
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
      View exact location
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M7 17L17 7M7 7h10v10" />
      </svg>
    </a>
  );
}