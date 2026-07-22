// Error boundaries must be Client Components
"use client";

import { useEffect } from "react";
import Link from "next/link";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * The error boundary for the (main) route group.
 *
 * Renders inside the normal layout so the header and nav stay put — someone
 * hitting a broken page can still navigate away. Visually it matches the 404,
 * but uses a coral accent rather than marigold so "something broke" reads
 * differently from "this doesn't exist".
 */
export default function MainError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[MainError]", error);
  }, [error]);

  return (
    <div className="er-page">
      <style>{`
        .er-page {
          position: relative; overflow: hidden;
          background: linear-gradient(150deg, #1a1416 0%, #33232a 48%, #573a44 100%);
          min-height: 74vh;
          display: flex; align-items: center; justify-content: center;
          padding: 60px 16px 80px;
          border-radius: 0 0 28px 28px;
        }
        .er-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .er-glow {
          position: absolute; top: -120px; right: -60px; width: 340px; height: 340px;
          border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, rgba(255,138,122,0.24) 0%, transparent 70%);
          animation: er-breathe 9s ease-in-out infinite;
        }
        @keyframes er-breathe { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.16);opacity:1} }

        .er-inner { position: relative; z-index: 2; text-align: center; max-width: 600px; }

        /* A slightly rattled toolbox */
        .er-ic {
          width: 84px; height: 84px; border-radius: 26px; margin: 0 auto 24px;
          display: flex; align-items: center; justify-content: center; font-size: 38px;
          background: linear-gradient(135deg, #e05a4a, #ff8a7a);
          box-shadow: 0 16px 44px rgba(224,90,74,0.42);
          animation: er-wobble 3.4s ease-in-out infinite;
        }
        @keyframes er-wobble {
          0%,100% { transform: rotate(-4deg) translateY(0); }
          50%     { transform: rotate(4deg) translateY(-6px); }
        }

        .er-h1 {
          font-size: clamp(25px, 5vw, 40px); font-weight: 900; letter-spacing: -0.045em;
          line-height: 1.07; color: #fff; margin: 0 0 14px;
          text-shadow: 0 2px 24px rgba(0,0,0,0.5);
          animation: er-rise 560ms cubic-bezier(0.22,1,0.36,1) both;
        }
        .er-h1 em { font-style: normal; color: #ff8a7a; }
        @keyframes er-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }

        .er-quip {
          font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.74);
          margin: 0 0 8px; line-height: 1.55;
          animation: er-rise 560ms cubic-bezier(0.22,1,0.36,1) 110ms both;
        }
        .er-note {
          font-size: 13.5px; color: rgba(255,255,255,0.44); margin: 0 0 30px;
          animation: er-rise 560ms cubic-bezier(0.22,1,0.36,1) 180ms both;
        }

        .er-btns { display: flex; gap: 11px; justify-content: center; flex-wrap: wrap; }
        .er-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 26px; border-radius: 999px; text-decoration: none;
          font-size: 14.5px; font-weight: 800; letter-spacing: -0.02em;
          border: none; cursor: pointer;
          animation: er-rise 560ms cubic-bezier(0.22,1,0.36,1) 250ms both;
          transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 240ms ease, background 200ms ease;
        }
        .er-btn-primary {
          background: linear-gradient(135deg, #e05a4a, #ff8a7a); color: #2b0f0a;
          box-shadow: 0 10px 30px rgba(224,90,74,0.42);
        }
        .er-btn-ghost {
          background: rgba(255,255,255,0.1); color: #fff;
          border: 1px solid rgba(255,255,255,0.24);
        }
        .er-btn svg { transition: transform 420ms cubic-bezier(0.34,1.56,0.64,1); }
        @media(hover:hover){
          .er-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 16px 38px rgba(224,90,74,0.58); }
          .er-btn-ghost:hover   { transform: translateY(-3px); background: rgba(255,255,255,0.2); }
          .er-btn-primary:hover svg { transform: rotate(-180deg); }
        }

        .er-digest {
          margin-top: 26px; font-size: 11.5px; letter-spacing: 0.04em;
          color: rgba(255,255,255,0.3); font-family: ui-monospace, monospace;
        }

        /* Loose screws drifting past */
        .er-prop {
          position: absolute; font-size: 28px; opacity: 0.13; pointer-events: none;
          animation: er-drift 15s ease-in-out infinite;
        }
        .er-prop:nth-child(2){ animation-duration: 18s; animation-delay: -5s; }
        .er-prop:nth-child(3){ animation-duration: 13s; animation-delay: -9s; }
        @keyframes er-drift {
          0%,100% { transform: translate(0,0) rotate(-8deg); }
          50%     { transform: translate(18px,-20px) rotate(10deg); }
        }
        @media(max-width:640px){ .er-prop { font-size: 21px; opacity: 0.1; } }

        @media(prefers-reduced-motion:reduce){
          .er-glow, .er-ic, .er-h1, .er-quip, .er-note, .er-btn, .er-prop {
            animation: none !important; opacity: 1 !important; transform: none !important;
          }
        }
      `}</style>

      <div className="er-grid" aria-hidden="true" />
      <div className="er-glow" aria-hidden="true" />
      <span className="er-prop" style={{ top: "18%", left: "9%" }} aria-hidden="true">🔩</span>
      <span className="er-prop" style={{ bottom: "18%", right: "12%" }} aria-hidden="true">🔧</span>
      <span className="er-prop" style={{ top: "62%", left: "6%" }} aria-hidden="true">⚙️</span>

      <div className="er-inner">
        <div className="er-ic" aria-hidden="true">🧰</div>

        <h1 className="er-h1">
          Well, <em>that wasn&apos;t supposed to happen</em>
        </h1>
        <p className="er-quip">
          Something on our side fell over. It&apos;s not you, and it&apos;s not
          anything you clicked.
        </p>
        <p className="er-note">
          Give it another go — most of the time that&apos;s genuinely all it takes.
        </p>

        <div className="er-btns">
          <button type="button" onClick={reset} className="er-btn er-btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
            Try again
          </button>
          <Link href="/" className="er-btn er-btn-ghost">Back to listings</Link>
        </div>

        {/* Handy when someone reports a problem — gives support something to match on */}
        {error.digest && <p className="er-digest">Reference: {error.digest}</p>}
      </div>
    </div>
  );
}