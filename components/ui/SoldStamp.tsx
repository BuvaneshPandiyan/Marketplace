"use client";

/**
 * The SOLD stamp — an auctioneer's gavel coming down.
 *
 * Two modes:
 *   variant="slam"  — plays the full impact sequence once. Use it the moment a
 *                     listing is actually marked sold, as a reward.
 *   variant="static" — already-landed state, no animation. Use it when rendering
 *                     a listing that was already sold before the page loaded;
 *                     replaying the slam on every render would be exhausting.
 *
 * The sequence: the stamp drops from above, oversized and rotated, hits at ~55%,
 * overshoots, then settles. On impact the whole thing recoils, a shockwave ring
 * pushes outward, and dust flecks scatter. Total 900ms — long enough to feel
 * weighty, short enough not to block the user.
 *
 * All of it is transform/opacity only, so it composites on the GPU and doesn't
 * trigger layout on any frame.
 */

type Props = {
  variant?: "slam" | "static";
  /** Roughly the stamp's width in px. Scales the whole thing. */
  size?: number;
  className?: string;
};

export function SoldStamp({ variant = "static", size = 108, className = "" }: Props) {
  const isSlam = variant === "slam";

  return (
    <>
      <style>{`
        .sold-stamp {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 3;
          pointer-events: none;
          display: grid;
          place-items: center;
        }

        /* ── The drop ──────────────────────────────────────────────
           Falls from above at a slight angle, lands hard, overshoots,
           settles. The cubic-bezier is deliberately not a spring — a
           gavel doesn't bounce gently, it cracks down. */
        @keyframes sold-slam {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(2.6) rotate(-24deg); }
          45%  { opacity: 1; }
          55%  { opacity: 1; transform: translate(-50%,-50%) scale(0.86) rotate(-11deg); }
          68%  { transform: translate(-50%,-50%) scale(1.1) rotate(-13deg); }
          82%  { transform: translate(-50%,-50%) scale(0.97) rotate(-12deg); }
          100% { opacity: 1; transform: translate(-50%,-50%) scale(1) rotate(-12deg); }
        }
        /* Resting pose — matches the slam's final frame exactly */
        .sold-stamp--static .sold-stamp-inner {
          transform: translate(-50%,-50%) rotate(-12deg);
        }
        .sold-stamp--slam .sold-stamp-inner {
          animation: sold-slam 620ms cubic-bezier(0.7, 0, 0.3, 1) both;
        }
        .sold-stamp-inner {
          position: absolute;
          top: 50%; left: 50%;
        }

        /* ── The badge itself ─────────────────────────────────────── */
        .sold-badge {
          position: relative;
          border: 3px solid #dc2626;
          border-radius: 8px;
          background: rgba(255,255,255,0.94);
          color: #dc2626;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 18px rgba(220,38,38,0.3), inset 0 0 0 2px rgba(220,38,38,0.15);
          /* Slightly rough edge — a real rubber stamp never prints clean */
          text-shadow: 0 1px 0 rgba(255,255,255,0.6);
        }

        /* ── Impact: shockwave ring ───────────────────────────────── */
        @keyframes sold-shock {
          0%, 48%  { opacity: 0; transform: translate(-50%,-50%) scale(0.3); }
          56%      { opacity: 0.85; transform: translate(-50%,-50%) scale(0.75); }
          100%     { opacity: 0; transform: translate(-50%,-50%) scale(2.1); }
        }
        .sold-shock {
          position: absolute; top: 50%; left: 50%;
          border-radius: 50%;
          border: 3px solid rgba(220,38,38,0.55);
          animation: sold-shock 800ms cubic-bezier(0.2, 0.8, 0.3, 1) both;
          pointer-events: none;
        }

        /* ── Impact: recoil of the whole card area ────────────────── */
        @keyframes sold-recoil {
          0%, 50% { transform: translate(0,0); }
          56%     { transform: translate(0, 3px) scale(0.985); }
          62%     { transform: translate(-2px, -1px); }
          68%     { transform: translate(2px, 1px); }
          74%     { transform: translate(-1px, 0); }
          100%    { transform: translate(0,0); }
        }
        .sold-stamp--slam .sold-shake { animation: sold-recoil 820ms ease-out both; }

        /* ── Impact: dust ─────────────────────────────────────────── */
        @keyframes sold-dust {
          0%, 50% { opacity: 0; transform: translate(0,0) scale(0.4); }
          58%     { opacity: 0.9; }
          100%    { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1); }
        }
        .sold-dust {
          position: absolute; top: 50%; left: 50%;
          width: 5px; height: 5px; border-radius: 50%;
          background: rgba(220,38,38,0.5);
          animation: sold-dust 780ms ease-out both;
          pointer-events: none;
        }

        /* A sold listing should read as past-tense — the photo behind
           the stamp desaturates. Applied by the parent via .is-sold. */
        @media (prefers-reduced-motion: reduce) {
          .sold-stamp--slam .sold-stamp-inner {
            animation: none !important;
            transform: translate(-50%,-50%) rotate(-12deg) !important;
            opacity: 1 !important;
          }
          .sold-shock, .sold-dust { display: none !important; }
          .sold-stamp--slam .sold-shake { animation: none !important; }
        }
      `}</style>

      <div
        className={`sold-stamp ${isSlam ? "sold-stamp--slam" : "sold-stamp--static"} ${className}`}
        aria-hidden="true"
      >
        <div className="sold-shake">
          {isSlam && (
            <>
              <span
                className="sold-shock"
                style={{ width: size * 1.5, height: size * 1.5 }}
              />
              {/* Eight flecks thrown out radially from the point of impact */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const dist = size * (0.62 + (i % 3) * 0.14);
                return (
                  <span
                    key={deg}
                    className="sold-dust"
                    style={
                      {
                        "--dx": `${Math.cos(rad) * dist}px`,
                        "--dy": `${Math.sin(rad) * dist}px`,
                        animationDelay: `${(i % 4) * 18}ms`,
                      } as React.CSSProperties
                    }
                  />
                );
              })}
            </>
          )}

          <div className="sold-stamp-inner">
            <div
              className="sold-badge"
              style={{
                width: size,
                height: size * 0.4,
                fontSize: size * 0.22,
              }}
            >
              Sold
            </div>
          </div>
        </div>
      </div>
    </>
  );
}