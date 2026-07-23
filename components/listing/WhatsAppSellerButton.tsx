"use client";

/**
 * Floating "WhatsApp the seller" button, shown on every listing page.
 *
 * WHY THIS CALLS AN RPC INSTEAD OF JUST RENDERING A LINK
 * -----------------------------------------------------
 * The obvious build is to pass the seller's phone in as a prop and render a
 * plain <a href="https://wa.me/...">. Don't. Migration 0016 revokes SELECT on
 * profiles.phone from both `anon` and `authenticated` precisely so numbers are
 * never in the page source — otherwise any scraper could pull every seller's
 * number off the site by walking /listing/<id>.
 *
 * So this mirrors ShowNumberButton: the number is fetched on click, through the
 * `reveal_seller_phone` SECURITY DEFINER function, which checks the viewer is
 * logged in, checks the listing is active, refuses if it's your own listing,
 * and records the reveal in contact_reveals. The WhatsApp handoff then happens
 * client-side with the number that RPC returned. Same privacy guarantees as the
 * existing phone button, same audit trail.
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthGate } from "@/components/auth/AuthGateContext";
import {
  toWhatsAppNumber,
  buildWhatsAppUrl,
  buildListingEnquiryMessage,
} from "@/lib/support";

type Props = {
  listingId: string;
  /** Listing title, e.g. "PlayStation 5 Slim" — goes into the prefilled message */
  title: string;
  /** Already-formatted price, e.g. "₹35,000" — the page has this, so don't reformat it here */
  priceFormatted: string;
  /** True when the viewer is the seller — we hide the button entirely in that case */
  isOwnListing: boolean;
};

export function WhatsAppSellerButton({
  listingId,
  title,
  priceFormatted,
  isOwnListing,
}: Props) {
  const [supabase] = useState(() => createClient());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { requireAuth } = useAuthGate();

  /**
   * Note: this component used to `return null` when isOwnListing was true.
   * That made it impossible to tell "hidden on purpose" apart from "broken",
   * so now it always renders and simply disables itself on your own listing.
   * reveal_seller_phone raises 'This is your own listing.' anyway, so there's
   * nothing useful to click — but you can at least see what buyers see.
   */

  async function handleClick() {
    // Clicking your own listing does nothing — the RPC would refuse it
    if (isOwnListing) return;

    // Same gate as the phone reveal. If they're logged out this opens the auth
    // modal and returns false, and we stop here without opening any window.
    if (!requireAuth("message the seller on WhatsApp")) return;

    setError(null);
    setIsLoading(true);

    /**
     * Open the tab NOW, synchronously, while we're still inside the click
     * handler's user-gesture window. If we wait until after the `await` below,
     * Safari and Firefox treat the resulting window.open() as an unrequested
     * popup and block it. We park it on about:blank and redirect it once we
     * have the number.
     *
     * Do NOT pass "noopener" here: window.open() returns null whenever noopener
     * is set, which would throw away the handle we need to redirect. We get the
     * same protection by nulling the child's opener ourselves straight after.
     */
    const popup = window.open("", "_blank");
    if (popup) popup.opener = null;

    const { data, error: rpcError } = await supabase.rpc("reveal_seller_phone", {
      p_listing_id: listingId,
    });

    setIsLoading(false);

    if (rpcError || !data) {
      popup?.close();
      setError(rpcError?.message ?? "Couldn't reach this seller right now.");
      return;
    }

    const waNumber = toWhatsAppNumber(data as string);
    if (!waNumber) {
      popup?.close();
      setError("This seller's number isn't set up for WhatsApp.");
      return;
    }

    const url = buildWhatsAppUrl(
      waNumber,
      buildListingEnquiryMessage({
        title,
        priceFormatted,
        // Built at click time so it's always the canonical public URL of this page
        listingUrl: window.location.href,
      })
    );

    // Redirect the tab we already opened; if the browser blocked it anyway, navigate in place
    if (popup) popup.location.href = url;
    else window.location.href = url;
  }

  return (
    <>
      <style>{`
        /* ── DOCK POSITION ────────────────────────────────────────────
           Always fixed to the bottom-right. Never hides, never moves on
           scroll. The only thing pinned to the bottom edge of this page is
           the nav pill, and only below 640px:

             < 640px    nav pill   bottom:12, left:16 right:16, z-100 (full width)
             >= 640px   nothing

           (MobileStickyBar.tsx exists but is imported by nothing, and the
           .mobile-action-bar rule in this page's <style> is left over from
           an earlier version — the mobile action buttons render inline in
           normal flow instead. So there is no bar to clear above 640px.)

           Below 640px the pill spans edge to edge, so bottom:16 would put
           this button *behind* it. 76px is the lowest it can sit and still
           be visible: 12 + ~54 tall + a small gap. From 640px up the nav
           moves to the top of the screen and the real corner is free.
           ──────────────────────────────────────────────────────────── */
        .wa-seller-dock {
          position: fixed;
          right: 16px;
          bottom: calc(76px + env(safe-area-inset-bottom));
          /* Below the nav pill (100) — if they ever collide, navigation wins */
          z-index: 95;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        @media (min-width: 640px) {
          .wa-seller-dock { right: 24px; bottom: 24px; }
        }

        .wa-seller-btn {
          display: flex; align-items: center; gap: 9px;
          height: 52px; padding: 0 18px;
          border: none; border-radius: 100px;
          background: linear-gradient(135deg, #25d366, #128c7e);
          color: #fff;
          font-size: 14px; font-weight: 800; letter-spacing: -0.02em;
          cursor: pointer;
          box-shadow: 0 6px 22px rgba(37, 211, 102, 0.45);
          transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 260ms ease;
        }
        @media (min-width: 1024px) { .wa-seller-btn { height: 56px; padding: 0 22px; font-size: 15px; } }
        .wa-seller-btn:hover:not(:disabled)  { transform: scale(1.05); box-shadow: 0 9px 30px rgba(37,211,102,0.58); }
        .wa-seller-btn:active:not(:disabled) { transform: scale(0.94); }
        .wa-seller-btn:disabled { opacity: 0.75; cursor: default; }
        .wa-seller-btn:focus-visible { outline: 3px solid #1a1a1a; outline-offset: 3px; }

        /* The label is the reason this is a pill and not a circle: "Chat" alone
           doesn't tell you it opens WhatsApp with a message already written. */
        .wa-seller-label { white-space: nowrap; }
        @media (max-width: 400px) { .wa-seller-label { display: none; } }
        @media (max-width: 400px) { .wa-seller-btn { padding: 0; width: 52px; justify-content: center; } }

        .wa-seller-err {
          max-width: 230px;
          background: #fff; border: 1.5px solid #fecaca;
          color: #dc2626; font-size: 12px; font-weight: 600; line-height: 1.4;
          padding: 8px 12px; border-radius: 12px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }

        @keyframes wa-spin { to { transform: rotate(360deg); } }
        .wa-spinner { animation: wa-spin 700ms linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .wa-seller-btn { transition: none !important; }
          .wa-seller-btn:hover:not(:disabled) { transform: none !important; }
          .wa-spinner { animation-duration: 2s; }
        }
      `}</style>

      <div className="wa-seller-dock">
        {error && (
          <p className="wa-seller-err" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleClick}
          disabled={isLoading || isOwnListing}
          className="wa-seller-btn"
          aria-label={
            isOwnListing
              ? "This is your own listing"
              : "Message the seller about this item on WhatsApp"
          }
        >
          {isLoading ? (
            <svg className="wa-spinner" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413" />
            </svg>
          )}
          <span className="wa-seller-label">
            {isOwnListing
              ? "Your listing"
              : isLoading
                ? "Opening…"
                : "WhatsApp seller"}
          </span>
        </button>
      </div>
    </>
  );
}