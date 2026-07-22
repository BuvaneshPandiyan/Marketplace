"use client";

/**
 * The "sign in to continue" popup.
 *
 * Shown by AuthGateProvider whenever a logged-out user taps something that
 * needs an account. It never navigates on its own — it explains what's behind
 * the wall, then lets the user choose. Both CTAs carry ?redirect= so people
 * land back where they were instead of on the homepage.
 *
 * Presentation follows the Swiggy/Zepto pattern: a bottom sheet on phones
 * (thumb-reachable, dismissed by tapping the backdrop) and a centred card on
 * desktop. One component, two layouts, switched purely in CSS at 640px.
 */

import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** e.g. "view the seller's phone number" — completes the sentence "Sign in to …" */
  action?: string;
};

// What the user actually gets. Concrete beats "unlock all features".
const PERKS = [
  { icon: "chat", label: "Chat with sellers directly" },
  { icon: "heart", label: "Save ads to your wishlist" },
  { icon: "tag", label: "Post your own ads for free" },
];

function PerkIcon({ name }: { name: string }) {
  const common = {
    width: 13,
    height: 13,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "chat")
    return (
      <svg {...common}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  if (name === "heart")
    return (
      <svg {...common}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

export function AuthGateModal({ isOpen, onClose, action = "continue" }: Props) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const redirect = encodeURIComponent(pathname ?? "/");

  return createPortal(
    <>
      <style>{`
        /* ── ENTRANCE ─────────────────────────────────────────────── */
        @keyframes ag-bg-in    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ag-sheet-in { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes ag-card-in  {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        /* Content rises in behind the card — staggered, so the eye lands on the
           headline first and the buttons last. */
        @keyframes ag-rise {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ag-pop {
          0%   { opacity: 0; transform: scale(0.3) rotate(-18deg); }
          65%  { opacity: 1; transform: scale(1.14) rotate(4deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes ag-ring {
          0%   { transform: scale(0.8); opacity: 0.7; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes ag-shine { to { transform: translateX(220%) skewX(-18deg); } }

        /* ── BACKDROP ─────────────────────────────────────────────── */
        .ag-backdrop {
          position: fixed; inset: 0; z-index: 9990;
          background: rgba(12, 6, 2, 0.58);
          backdrop-filter: blur(6px) saturate(120%);
          -webkit-backdrop-filter: blur(6px) saturate(120%);
          animation: ag-bg-in 220ms ease both;
        }

        /* ── CARD: bottom sheet on phones ─────────────────────────── */
        .ag-card {
          position: fixed; z-index: 9991;
          left: 0; right: 0; bottom: 0;
          background: #fff;
          border-radius: 28px 28px 0 0;
          overflow: hidden;
          box-shadow: 0 -20px 70px rgba(0, 0, 0, 0.3);
          animation: ag-sheet-in 400ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        /* ── CARD: centred on desktop ─────────────────────────────── */
        @media (min-width: 640px) {
          .ag-card {
            top: 50%; left: 50%; right: auto; bottom: auto;
            width: min(92vw, 400px);
            border-radius: 26px;
            transform: translate(-50%, -50%);
            box-shadow: 0 30px 90px rgba(0, 0, 0, 0.3);
            animation: ag-card-in 340ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }
        }

        /* ── GRADIENT HEAD ────────────────────────────────────────── */
        .ag-head {
          position: relative;
          background: linear-gradient(135deg, #6e3b39 0%, #a9645c 45%, #e0a48f 100%);
          padding: 22px 24px 26px;
          text-align: center;
        }
        .ag-head-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 26px 26px;
        }
        .ag-grip {
          width: 38px; height: 4px; border-radius: 100px;
          background: rgba(255,255,255,0.28);
          margin: 0 auto 16px; position: relative;
        }
        @media (min-width: 640px) { .ag-grip { display: none; } }

        .ag-lockwrap { position: relative; display: inline-flex; }
        .ag-lock {
          position: relative;
          width: 62px; height: 62px; border-radius: 50%;
          background: #fff;
          display: flex; align-items: center; justify-content: center;
          color: #b76e63;
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
          animation: ag-pop 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 120ms both;
        }
        /* Two halo rings ping outward once the lock lands */
        .ag-lockwrap::before, .ag-lockwrap::after {
          content: ''; position: absolute; inset: 0;
          border-radius: 50%; border: 2px solid rgba(255,255,255,0.5);
          animation: ag-ring 1.9s ease-out infinite;
          pointer-events: none;
        }
        .ag-lockwrap::before { animation-delay: 700ms; }
        .ag-lockwrap::after  { animation-delay: 1500ms; }

        /* ── BODY ─────────────────────────────────────────────────── */
        .ag-body { padding: 22px 24px 26px; }
        .ag-body > * { animation: ag-rise 420ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .ag-body > *:nth-child(1) { animation-delay: 180ms; }
        .ag-body > *:nth-child(2) { animation-delay: 230ms; }
        .ag-body > *:nth-child(3) { animation-delay: 280ms; }
        .ag-body > *:nth-child(4) { animation-delay: 330ms; }
        .ag-body > *:nth-child(5) { animation-delay: 380ms; }

        .ag-h2 {
          font-size: 21px; font-weight: 900; letter-spacing: -0.04em;
          line-height: 1.2; color: #1a1a1a; text-align: center;
          margin: 0 0 7px;
        }
        @media (min-width: 640px) { .ag-h2 { font-size: 22px; } }
        .ag-sub {
          font-size: 13px; line-height: 1.55; color: #6b7280;
          text-align: center; margin: 0 0 18px;
        }

        /* ── PERKS ────────────────────────────────────────────────── */
        .ag-perks {
          list-style: none; margin: 0 0 20px; padding: 14px 15px;
          background: #fdf4f1; border: 1.5px solid #f0d5cc;
          border-radius: 16px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .ag-perk {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; font-weight: 600; color: #7d4a45;
        }
        .ag-perk-dot {
          width: 24px; height: 24px; border-radius: 8px; flex-shrink: 0;
          background: linear-gradient(135deg, #b76e63, #e8b4a0);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(183,110,99,0.3);
        }

        /* ── CTAs ─────────────────────────────────────────────────── */
        .ag-actions { display: flex; flex-direction: column; gap: 10px; }
        .ag-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px; border-radius: 100px;
          font-size: 14.5px; font-weight: 800; letter-spacing: -0.02em;
          text-decoration: none; cursor: pointer;
        }
        .ag-btn:focus-visible { outline: 3px solid #1a1a1a; outline-offset: 2px; }
        .ag-primary {
          position: relative; overflow: hidden; border: none;
          background: linear-gradient(135deg, #a9645c, #cf8b7a 55%, #e8b4a0);
          color: #fff;
          box-shadow: 0 6px 20px rgba(169,100,92,0.42);
          transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 240ms ease;
        }
        /* Light sweeps across the primary CTA on hover */
        .ag-primary::after {
          content: ''; position: absolute; top: 0; bottom: 0; left: -60%;
          width: 45%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: translateX(-120%) skewX(-18deg);
        }
        .ag-secondary {
          background: #fff; border: 1.5px solid #e5e7eb; color: #374151;
          transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1),
                      border-color 200ms ease, color 200ms ease, background 200ms ease;
        }
        @media (hover: hover) {
          .ag-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(169,100,92,0.55); }
          .ag-primary:hover::after { animation: ag-shine 750ms ease both; }
          .ag-secondary:hover { border-color: #cf8b7a; color: #a9645c; background: #fdf4f1; transform: translateY(-2px); }
        }
        .ag-btn:active { transform: scale(0.97); }

        .ag-foot {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          font-size: 11px; color: #9ca3af; margin: 15px 0 0;
        }

        .ag-close {
          position: absolute; top: 14px; right: 14px; z-index: 2;
          width: 30px; height: 30px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.18);
          color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 160ms ease, transform 160ms ease;
        }
        .ag-close:hover { background: rgba(255,255,255,0.3); transform: rotate(90deg); }
        .ag-close:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

        @media (prefers-reduced-motion: reduce) {
          .ag-backdrop, .ag-card, .ag-lock, .ag-body > * {
            animation: none !important; opacity: 1 !important;
          }
          .ag-card { transform: none !important; }
          .ag-lockwrap::before, .ag-lockwrap::after { animation: none !important; opacity: 0 !important; }
          .ag-primary, .ag-secondary, .ag-close { transition: none !important; }
          .ag-primary:hover, .ag-secondary:hover, .ag-close:hover, .ag-btn:active { transform: none !important; }
        }
        @media (prefers-reduced-motion: reduce) and (min-width: 640px) {
          .ag-card { transform: translate(-50%, -50%) !important; }
        }
      `}</style>

      <div className="ag-backdrop" onClick={onClose} />

      <div className="ag-card" role="dialog" aria-modal="true" aria-labelledby="ag-title">
        {/* ── Gradient head ── */}
        <div className="ag-head">
          <div className="ag-head-grid" aria-hidden="true" />
          <button type="button" className="ag-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="ag-grip" aria-hidden="true" />

          <span className="ag-lockwrap">
            <span className="ag-lock" aria-hidden="true">
              <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="11" width="17" height="10.5" rx="2.5" />
                <path d="M7.5 11V7a4.5 4.5 0 0 1 9 0v4" />
                <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
              </svg>
            </span>
          </span>
        </div>

        {/* ── Body ── */}
        <div className="ag-body">
          <h2 className="ag-h2" id="ag-title">Sign in to {action}</h2>

          <p className="ag-sub">
            It takes about a minute, and you&apos;ll come straight back to this page.
          </p>

          <ul className="ag-perks">
            {PERKS.map((p) => (
              <li className="ag-perk" key={p.label}>
                <span className="ag-perk-dot" aria-hidden="true">
                  <PerkIcon name={p.icon} />
                </span>
                {p.label}
              </li>
            ))}
          </ul>

          <div className="ag-actions">
            <Link href={`/login?redirect=${redirect}`} className="ag-btn ag-primary" onClick={onClose}>
              Sign in
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link href={`/signup?redirect=${redirect}`} className="ag-btn ag-secondary" onClick={onClose}>
              Create an account — it&apos;s free
            </Link>
          </div>

          <p className="ag-foot">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Your data is safe. We never share your info.
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}