/**
 * The shared 404 body.
 *
 * Used by both not-found routes: the one inside (main) — which renders with the
 * header and nav intact — and the root-level fallback for anything outside that
 * group. Keeping the content here means the joke only lives in one place.
 */

import Link from "next/link";
import { BannerArt } from "@/components/ui/BannerArt";

// A few different quips, picked per render so the page isn't identical every
// time someone mistypes a URL.
const QUIPS = [
  "Someone bought this page. Cash, no receipt.",
  "This page was last seen 3 km away. It has not been seen since.",
  "We searched every listing. Nothing. Not even a blurry photo.",
  "This page sold in under a minute. We were as surprised as you.",
  "No listings here. No page here either, frankly.",
];

export function NotFoundContent() {
  const quip = QUIPS[Math.floor(Math.random() * QUIPS.length)];

  return (
    <div className="nf-page">
      <style>{`
        /* ── 404 — charcoal + marigold ──────────────────────────── */
        .nf-page {
          position: relative; overflow: hidden;
          background: linear-gradient(150deg, #16141a 0%, #2a2530 48%, #463d4f 100%);
          min-height: 74vh;
          display: flex; align-items: center; justify-content: center;
          padding: 60px 16px 80px;
          border-radius: 0 0 28px 28px;
        }
        .nf-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        .nf-glow {
          position: absolute; top: -120px; right: -60px; width: 340px; height: 340px;
          border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, rgba(251,191,36,0.22) 0%, transparent 70%);
          animation: nf-breathe 9s ease-in-out infinite;
        }
        @keyframes nf-breathe { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.16);opacity:1} }

        .nf-inner { position: relative; z-index: 2; text-align: center; max-width: 620px; }

        /* The big price-tag 404 */
        .nf-tag {
          display: inline-flex; align-items: center; gap: 12px;
          padding: 12px 26px 12px 20px; border-radius: 999px; margin-bottom: 26px;
          background: linear-gradient(135deg, #f59e0b, #fbbf24);
          box-shadow: 0 16px 44px rgba(245,158,11,0.4);
          animation: nf-swing 4.5s ease-in-out infinite;
          transform-origin: 22px -10px;
        }
        @keyframes nf-swing {
          0%,100% { transform: rotate(-2.5deg); }
          50%     { transform: rotate(2.5deg); }
        }
        .nf-tag-hole {
          width: 14px; height: 14px; border-radius: 50%;
          background: #16141a; box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
        }
        .nf-tag-n {
          font-size: 40px; font-weight: 900; letter-spacing: -0.05em; color: #2a1a02;
          line-height: 1;
        }
        @media(min-width:640px){ .nf-tag-n { font-size: 52px; } }

        .nf-h1 {
          font-size: clamp(26px, 5.5vw, 44px); font-weight: 900; letter-spacing: -0.045em;
          line-height: 1.06; color: #fff; margin: 0 0 14px;
          text-shadow: 0 2px 24px rgba(0,0,0,0.5);
          animation: nf-rise 560ms cubic-bezier(0.22,1,0.36,1) both;
        }
        .nf-h1 em { font-style: normal; color: #fbbf24; }
        @keyframes nf-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }

        .nf-quip {
          font-size: 16px; font-weight: 500; color: rgba(255,255,255,0.74);
          margin: 0 0 8px; line-height: 1.55;
          animation: nf-rise 560ms cubic-bezier(0.22,1,0.36,1) 110ms both;
        }
        .nf-note {
          font-size: 13.5px; color: rgba(255,255,255,0.44); margin: 0 0 30px;
          animation: nf-rise 560ms cubic-bezier(0.22,1,0.36,1) 180ms both;
        }

        .nf-btns { display: flex; gap: 11px; justify-content: center; flex-wrap: wrap; }
        .nf-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 26px; border-radius: 999px; text-decoration: none;
          font-size: 14.5px; font-weight: 800; letter-spacing: -0.02em;
          animation: nf-rise 560ms cubic-bezier(0.22,1,0.36,1) 250ms both;
          transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 240ms ease, background 200ms ease;
        }
        .nf-btn-primary {
          background: linear-gradient(135deg, #f59e0b, #fbbf24); color: #2a1a02;
          box-shadow: 0 10px 30px rgba(245,158,11,0.42);
        }
        .nf-btn-ghost {
          background: rgba(255,255,255,0.1); color: #fff;
          border: 1px solid rgba(255,255,255,0.24);
        }
        .nf-btn svg { transition: transform 260ms cubic-bezier(0.34,1.56,0.64,1); }
        @media(hover:hover){
          .nf-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 16px 38px rgba(245,158,11,0.58); }
          .nf-btn-ghost:hover   { transform: translateY(-3px); background: rgba(255,255,255,0.2); }
          .nf-btn:hover svg { transform: translateX(4px); }
        }

        /* Floating "lost item" props drifting behind everything */
        .nf-prop {
          position: absolute; font-size: 30px; opacity: 0.14; pointer-events: none;
          animation: nf-drift 14s ease-in-out infinite;
        }
        .nf-prop:nth-child(2){ animation-duration: 17s; animation-delay: -4s; }
        .nf-prop:nth-child(3){ animation-duration: 20s; animation-delay: -8s; }
        .nf-prop:nth-child(4){ animation-duration: 12s; animation-delay: -2s; }
        .nf-prop:nth-child(5){ animation-duration: 16s; animation-delay: -6s; }
        @keyframes nf-drift {
          0%,100% { transform: translate(0,0) rotate(-6deg); }
          50%     { transform: translate(16px,-22px) rotate(8deg); }
        }
        @media(max-width:640px){ .nf-prop { font-size: 22px; opacity: 0.1; } }

        @media(prefers-reduced-motion:reduce){
          .nf-glow, .nf-tag, .nf-h1, .nf-quip, .nf-note, .nf-btn, .nf-prop {
            animation: none !important; opacity: 1 !important; transform: none !important;
          }
        }
      `}</style>

      <BannerArt variant="glyphs" tint="#fbbf24" tint2="#f59e0b" id="notfound" />
      <div className="nf-grid" aria-hidden="true" />
      <div className="nf-glow" aria-hidden="true" />

      {/* Lost odds and ends floating past */}
      <span className="nf-prop" style={{ top: "14%", left: "8%" }} aria-hidden="true">📦</span>
      <span className="nf-prop" style={{ top: "70%", left: "13%" }} aria-hidden="true">🔦</span>
      <span className="nf-prop" style={{ top: "22%", right: "10%" }} aria-hidden="true">🧦</span>
      <span className="nf-prop" style={{ bottom: "16%", right: "14%" }} aria-hidden="true">🔑</span>
      <span className="nf-prop" style={{ top: "48%", left: "4%" }} aria-hidden="true">🧭</span>

      <div className="nf-inner">
        <div className="nf-tag">
          <span className="nf-tag-hole" aria-hidden="true" />
          <span className="nf-tag-n">404</span>
        </div>

        <h1 className="nf-h1">
          This page is <em>no longer available</em>
        </h1>
        <p className="nf-quip">{quip}</p>
        <p className="nf-note">
          The link may be broken, or whatever was here has since been taken down.
        </p>

        <div className="nf-btns">
          <Link href="/" className="nf-btn nf-btn-primary">
            Back to listings
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
          <Link href="/search" className="nf-btn nf-btn-ghost">Search instead</Link>
        </div>
      </div>
    </div>
  );
}