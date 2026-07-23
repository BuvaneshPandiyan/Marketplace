"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usePushNotifications } from "@/lib/client/usePushNotifications";

/**
 * Asks logged-in users to turn on push notifications.
 *
 * WHY A CUSTOM PROMPT RATHER THAN CALLING THE BROWSER DIRECTLY
 * Notification.requestPermission() can only ever be answered once. If someone
 * denies it, the browser remembers that permanently and will not ask again —
 * the site can never recover without the user digging through site settings.
 * Firing it unprompted on page load is therefore the worst thing you can do:
 * people reflexively hit "Block" on a dialog they didn't expect, and you've
 * lost them for good.
 *
 * So this shows a friendly explanation first. The native prompt only appears
 * after someone taps "Turn on", by which point they know what they're agreeing
 * to and are far likelier to accept. "Not now" costs nothing — we can ask again
 * later, which would be impossible after a hard denial.
 */

// Remembering the choice locally means we don't nag on every page view.
const DISMISS_KEY = "bz-push-prompt-dismissed";
// How long before we're allowed to ask a "Not now" user again.
const SNOOZE_DAYS = 7;

export function PushPermissionPrompt() {
  const { requestPushPermission } = usePushNotifications();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function decide() {
      // Server-rendered pass, or a browser with no push support at all.
      if (typeof window === "undefined") return;
      if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

      // Already granted, or permanently denied — nothing useful to show.
      if (Notification.permission !== "default") return;

      // Respect a recent "Not now".
      const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) ?? 0);
      if (dismissedAt && Date.now() - dismissedAt < SNOOZE_DAYS * 86_400_000) return;

      // Only ask people who are signed in — a token is stored against a user,
      // so asking a logged-out visitor achieves nothing.
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // Let the page settle before interrupting; appearing mid-load feels like
      // an ad and gets dismissed on reflex.
      setTimeout(() => { if (!cancelled) setVisible(true); }, 2500);
    }

    decide();
    return () => { cancelled = true; };
  }, []);

  async function handleEnable() {
    setBusy(true);
    try {
      await requestPushPermission();
    } finally {
      // Hide either way: if they accepted we're done, and if the browser
      // dialog was denied we must not ask again.
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
      setBusy(false);
      setVisible(false);
    }
  }

  function handleDismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="pnp" role="dialog" aria-live="polite" aria-label="Enable notifications">
      <style>{`
        .pnp {
          position: fixed; z-index: 120;
          left: 16px; right: 16px; bottom: 88px;
          background: #fff; border-radius: 20px;
          border: 1px solid rgba(14,61,71,0.1);
          box-shadow: 0 18px 50px rgba(7,31,38,0.22), 0 2px 8px rgba(0,0,0,0.06);
          padding: 18px 18px 16px;
          animation: pnp-rise 420ms cubic-bezier(0.22,1,0.36,1) both;
        }
        /* On wider screens it sits as a compact card in the corner rather than
           a full-width bar, which would look like a cookie banner. */
        @media (min-width: 640px) {
          .pnp { left: auto; right: 24px; bottom: 24px; width: 380px; }
        }
        @keyframes pnp-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }

        .pnp-head { display: flex; align-items: flex-start; gap: 12px; }
        .pnp-ic {
          flex-shrink: 0; width: 42px; height: 42px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center; font-size: 20px;
          background: linear-gradient(135deg, #0e3d47, #1a6b7a);
          box-shadow: 0 6px 18px rgba(14,61,71,0.3);
          animation: pnp-pulse 3s ease-in-out infinite;
        }
        @keyframes pnp-pulse {
          0%,100% { box-shadow: 0 6px 18px rgba(14,61,71,0.3), 0 0 0 0 rgba(26,107,122,0.4); }
          50%     { box-shadow: 0 6px 18px rgba(14,61,71,0.3), 0 0 0 10px rgba(26,107,122,0); }
        }
        .pnp-title { font-size: 15.5px; font-weight: 900; letter-spacing: -0.025em; color: #0f2229; margin: 0 0 3px; }
        .pnp-body  { font-size: 13.5px; line-height: 1.5; color: #5b6b72; margin: 0; }

        .pnp-actions { display: flex; gap: 9px; margin-top: 15px; }
        .pnp-btn {
          flex: 1; border: none; cursor: pointer; border-radius: 999px;
          padding: 11px 14px; font-size: 13.5px; font-weight: 800; letter-spacing: -0.015em;
          transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease, background 180ms ease;
        }
        .pnp-enable {
          color: #fff; background: linear-gradient(135deg, #0e3d47, #1a6b7a);
          box-shadow: 0 6px 18px rgba(14,61,71,0.32);
        }
        .pnp-enable:disabled { opacity: 0.65; cursor: default; }
        .pnp-later { color: #6b7a80; background: #f1f4f5; }
        @media (hover: hover) {
          .pnp-enable:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(14,61,71,0.42); }
          .pnp-later:hover { background: #e6ebec; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pnp, .pnp-ic { animation: none !important; }
          .pnp-btn:hover { transform: none !important; }
        }
      `}</style>

      <div className="pnp-head">
        <span className="pnp-ic" aria-hidden="true">🔔</span>
        <div>
          <p className="pnp-title">Never miss a buyer</p>
          <p className="pnp-body">
            Get alerted when someone messages you or an item sells — even when
            bazar.in is closed.
          </p>
        </div>
      </div>

      <div className="pnp-actions">
        <button type="button" className="pnp-btn pnp-later" onClick={handleDismiss}>
          Not now
        </button>
        <button type="button" className="pnp-btn pnp-enable" onClick={handleEnable} disabled={busy}>
          {busy ? "Turning on…" : "Turn on"}
        </button>
      </div>
    </div>
  );
}