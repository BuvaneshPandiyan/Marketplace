// A polished, first-visit prompt asking the user to enable location. Styled as a
// sibling of LocationModal (the manual picker it hands off to): the same deep-blue
// → sky gradient hero with a faint grid, a springy entrance, plus a signature
// pulsing location pin, hover micro-interactions and a staggered content reveal.
// All motion is GPU-only (transform/opacity) and reduced-motion is respected, so it
// stays smooth inside the mobile webview.
"use client";

import { useEffect, useState } from "react";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import { LocationModal } from "@/components/location/LocationModal";

// Session key so the prompt doesn't reappear on every navigation once dismissed.
const DISMISS_KEY = "bazar-location-prompt-dismissed";

export function LocationPrompt() {
  const { isReady, needsSetup, locality, detectCurrentLocation } = useActiveLocation();

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"intro" | "detecting" | "denied">("intro");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  // Show only when resolution finished, there's genuinely no location yet, and the
  // user hasn't dismissed it this session.
  useEffect(() => {
    if (!isReady || !needsSetup) return;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* private mode — just show it */
    }
    if (!dismissed) setOpen(true);
  }, [isReady, needsSetup]);

  // Close automatically once a location exists (set by any route).
  useEffect(() => {
    if (locality) setOpen(false);
  }, [locality]);

  function dismissForSession() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  // Primary path: fire the real device/browser permission prompt.
  async function handleEnable() {
    setPhase("detecting");
    setErrorMsg(null);
    const result = await detectCurrentLocation();
    if (result.success) {
      setOpen(false);
    } else {
      setPhase("denied");
      setErrorMsg(
        result.error ??
          "We couldn't access your location. Allow it in your browser settings, or set it manually."
      );
    }
  }

  // Manual path opens the full location picker.
  if (showManual) {
    return <LocationModal onClose={() => setShowManual(false)} />;
  }

  if (!open) return null;

  return (
    <div className="lp-back" role="dialog" aria-modal="true" aria-label="Set your location">
      <div className="lp-card">
        {/* Signature hero: gradient + faint grid + pulsing location pin */}
        <div className="lp-hero" aria-hidden="true">
          <div className="lp-grid" />
          <div className="lp-pinwrap">
            <span className="lp-ring" />
            <span className="lp-ring lp-ring2" />
            <span className="lp-pin">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 21s-6-5.686-6-10a6 6 0 1 1 12 0c0 4.314-6 10-6 10Z"
                  fill="#fff"
                />
                <circle cx="12" cy="11" r="2.4" fill="#0369a1" />
              </svg>
            </span>
          </div>
        </div>

        <div className="lp-body">
          {phase === "detecting" ? (
            <>
              <h2 className="lp-title">Finding you…</h2>
              <p className="lp-sub">Accept the permission request from your browser.</p>
              <div className="lp-spinner" aria-hidden="true" />
            </>
          ) : phase === "denied" ? (
            <>
              <h2 className="lp-title">Location access needed</h2>
              <p className="lp-sub">{errorMsg}</p>
              <button type="button" className="lp-btn lp-btn-primary" onClick={() => setShowManual(true)}>
                Enter location manually
              </button>
              <button type="button" className="lp-btn lp-btn-ghost" onClick={handleEnable}>
                Try device location again
              </button>
              <button type="button" className="lp-btn lp-btn-text" onClick={dismissForSession}>
                Not now
              </button>
            </>
          ) : (
            <>
              <h2 className="lp-title lp-rise" style={{ animationDelay: "60ms" }}>
                Set your location
              </h2>
              <p className="lp-sub lp-rise" style={{ animationDelay: "120ms" }}>
                See what&apos;s for sale near you, and let nearby buyers find your listings.
              </p>
              <button
                type="button"
                className="lp-btn lp-btn-primary lp-rise"
                style={{ animationDelay: "180ms" }}
                onClick={handleEnable}
              >
                Enable location
              </button>
              <button
                type="button"
                className="lp-btn lp-btn-ghost lp-rise"
                style={{ animationDelay: "240ms" }}
                onClick={() => setShowManual(true)}
              >
                Enter it manually
              </button>
              <button
                type="button"
                className="lp-btn lp-btn-text lp-rise"
                style={{ animationDelay: "300ms" }}
                onClick={dismissForSession}
              >
                Not now
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .lp-back {
          position: fixed; inset: 0; z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          background: rgba(8, 20, 38, 0.55);
          -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
          animation: lp-bg 180ms ease both;
        }
        @keyframes lp-bg { from { opacity: 0 } to { opacity: 1 } }

        .lp-card {
          width: 100%; max-width: 380px;
          background: #fff; border-radius: 24px; overflow: hidden;
          box-shadow: 0 30px 90px rgba(2, 12, 27, 0.34);
          transform: translateZ(0); will-change: transform, opacity;
          animation: lp-pop 340ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes lp-pop {
          from { opacity: 0; transform: translateY(14px) scale(0.94) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        /* On phones, rise from the bottom like a sheet */
        @media (max-width: 520px) {
          .lp-back { align-items: flex-end; padding: 0; }
          .lp-card {
            max-width: 100%; border-radius: 26px 26px 0 0;
            animation: lp-sheet 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          @keyframes lp-sheet {
            from { transform: translateY(100%) } to { transform: translateY(0) }
          }
        }

        .lp-hero {
          position: relative; height: 118px; overflow: hidden;
          background: linear-gradient(135deg, #082f49 0%, #075985 45%, #0ea5e9 100%);
        }
        .lp-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 22px 22px;
          -webkit-mask-image: radial-gradient(120% 100% at 50% 0%, #000 40%, transparent 85%);
          mask-image: radial-gradient(120% 100% at 50% 0%, #000 40%, transparent 85%);
        }
        .lp-pinwrap {
          position: absolute; left: 50%; top: 50%;
          transform: translate(-50%, -50%);
          width: 56px; height: 56px;
          display: flex; align-items: center; justify-content: center;
        }
        .lp-pin {
          position: relative; z-index: 2;
          width: 52px; height: 52px; border-radius: 50%;
          background: rgba(255,255,255,0.14);
          display: flex; align-items: center; justify-content: center;
          animation: lp-pindrop 500ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
        @keyframes lp-pindrop {
          from { opacity: 0; transform: translateY(-10px) scale(0.6) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        .lp-ring {
          position: absolute; left: 50%; top: 50%;
          width: 52px; height: 52px; margin: -26px 0 0 -26px;
          border-radius: 50%; border: 2px solid rgba(255,255,255,0.55);
          animation: lp-ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        .lp-ring2 { animation-delay: 1.2s; }
        @keyframes lp-ping {
          0%   { transform: scale(0.7); opacity: 0.6 }
          80%  { opacity: 0 }
          100% { transform: scale(2.1); opacity: 0 }
        }

        .lp-body { padding: 22px 24px 20px; text-align: center; }
        .lp-title {
          font-size: 21px; font-weight: 900; letter-spacing: -0.02em;
          color: #0f172a; margin: 0 0 8px;
        }
        .lp-sub {
          font-size: 14px; line-height: 1.55; color: #6b7280;
          margin: 0 0 18px;
        }

        .lp-btn {
          width: 100%; border-radius: 13px; font-weight: 700;
          cursor: pointer; border: none;
          transition: transform 140ms ease, box-shadow 140ms ease,
                      filter 140ms ease, background 140ms ease;
          transform: translateZ(0);
        }
        .lp-btn-primary {
          padding: 13px 16px; font-size: 15px; color: #fff; margin-bottom: 10px;
          background: linear-gradient(135deg, #0369a1, #0ea5e9);
          box-shadow: 0 8px 20px rgba(3, 105, 161, 0.28);
        }
        .lp-btn-primary:hover { transform: translateY(-2px); filter: brightness(1.06);
          box-shadow: 0 12px 26px rgba(3, 105, 161, 0.36); }
        .lp-btn-primary:active { transform: translateY(0) scale(0.985); }

        .lp-btn-ghost {
          padding: 12px 16px; font-size: 14px; font-weight: 600;
          color: #0369a1; background: #fff; border: 1px solid #e5e7eb;
          margin-bottom: 8px;
        }
        .lp-btn-ghost:hover { background: #f0f9ff; border-color: #bae6fd;
          transform: translateY(-1px); }
        .lp-btn-ghost:active { transform: translateY(0) scale(0.99); }

        .lp-btn-text {
          padding: 8px; font-size: 13px; font-weight: 500;
          color: #9ca3af; background: transparent;
        }
        .lp-btn-text:hover { color: #6b7280; }

        .lp-spinner {
          width: 26px; height: 26px; margin: 8px auto 4px;
          border: 3px solid rgba(3, 105, 161, 0.2); border-top-color: #0ea5e9;
          border-radius: 50%; animation: lp-spin 0.8s linear infinite;
        }
        @keyframes lp-spin { to { transform: rotate(360deg) } }

        /* Staggered content reveal */
        .lp-rise { opacity: 0; animation: lp-rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes lp-rise {
          from { opacity: 0; transform: translateY(12px) }
          to   { opacity: 1; transform: translateY(0) }
        }

        /* Never let motion cost performance or accessibility */
        @media (prefers-reduced-motion: reduce) {
          .lp-back, .lp-card, .lp-pin, .lp-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
          .lp-ring, .lp-spinner { animation: none !important; }
          .lp-btn { transition: background 120ms ease, color 120ms ease; }
          .lp-btn:hover { transform: none; }
        }
      `}</style>
    </div>
  );
}