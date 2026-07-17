"use client";

/**
 * A <Link> that shows the sign-in popup instead of navigating, when the visitor
 * is logged out.
 *
 * Why this exists: middleware already blocks /sell, /my-listings, /messages and
 * /wishlist for logged-out users — but it blocks them by *redirecting to /login*,
 * which dumps people on a login screen with no explanation of what they tapped or
 * why. This intercepts the click first and explains, so the redirect only ever
 * happens as a backstop (someone pasting the URL directly, say).
 *
 * It renders a real <Link href> rather than a button, so middle-click, "open in
 * new tab" and hover-prefetch all still behave, and the markup stays accessible.
 *
 * Usage:
 *   <GatedLink href="/sell" action="post an ad" className="sell-circle">…</GatedLink>
 */

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useAuthGate } from "@/components/auth/AuthGateContext";
import { useUser } from "@/lib/hooks/useUser";

type Props = ComponentProps<typeof Link> & {
  /** Completes the sentence "Sign in to …", e.g. "post an ad" */
  action: string;
  /**
   * Fires when the click was blocked because the user is logged out.
   * Use it to clean up surrounding UI — e.g. close a drawer so the popup
   * isn't stacked on top of it.
   */
  onBlocked?: () => void;
};

export function GatedLink({ action, onBlocked, onClick, prefetch, ...linkProps }: Props) {
  const { requireAuth } = useAuthGate();
  const { user } = useUser();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // requireAuth returns true when already logged in — let the navigation happen.
    // When it returns false it has opened the popup, so cancel the navigation.
    if (!requireAuth(action)) {
      e.preventDefault();
      onBlocked?.();
      return;
    }
    onClick?.(e);
  }

  /**
   * DO NOT PREFETCH THESE WHILE LOGGED OUT.
   *
   * <Link> prefetches by default. Every one of these points at a
   * middleware-protected route, so a logged-out prefetch gets back "redirect to
   * /login" — and Next stores that redirect in the Router Cache. Sign in, tap the
   * link, and the router serves the cached redirect instead of asking the server:
   * you land on /login despite having a valid session. A manual refresh drops the
   * Router Cache, the prefetch re-runs with the cookie, and it works — which is
   * exactly the "fails once, fine after F5" symptom.
   *
   * Prefetching a route the user cannot currently visit buys nothing anyway.
   */
  return (
    <Link
      {...linkProps}
      prefetch={user ? prefetch : false}
      onClick={handleClick}
    />
  );
}