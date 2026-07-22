/**
 * BannerArt — decorative banner backgrounds, drawn entirely in CSS + inline SVG.
 *
 * Replaces the per-surface <img> banners. Nothing is downloaded, nothing can
 * 404, and every variant tints itself from the surface's own colour, so a
 * banner always matches the page it sits on.
 *
 * Variants
 *   aurora  — drifting blurred colour fields (soft, premium, text-safe)
 *   glass   — floating frosted panels with subtle depth
 *   topo    — layered contour lines (quiet, technical)
 *   glyphs  — marketplace object outlines scattered as a faint pattern
 *
 * All variants keep the LEFT side clear so headlines stay readable, and all
 * respect prefers-reduced-motion.
 */

export type BannerVariant = "aurora" | "glass" | "topo" | "glyphs";

type Props = {
  /** Which artwork to draw. */
  variant: BannerVariant;
  /** Accent colour for the art — pass the surface's own hue. */
  tint: string;
  /** Secondary accent. Falls back to `tint` when omitted. */
  tint2?: string;
  /** Unique suffix so multiple instances don't share SVG ids. */
  id: string;
  /** Overall strength, 0–1. Default 1. */
  intensity?: number;
};

export function BannerArt({ variant, tint, tint2, id, intensity = 1 }: Props) {
  const t2 = tint2 ?? tint;
  const k = `ba-${id}`;

  return (
    <div className={`ba ${k}`} aria-hidden="true">
      <style>{`
        .ba {
          position: absolute; inset: 0; pointer-events: none; overflow: hidden;
          /* Repaints inside the art can't invalidate anything outside it. */
          contain: paint;
        }
        /* Everything fades out toward the left so headline text never fights it */
        .${k} {
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 34%, #000 78%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.35) 34%, #000 78%);
          opacity: ${intensity};
        }

        /* ── AURORA ─────────────────────────────────────────────── */
        .${k} .ba-blob {
          position: absolute; border-radius: 50%;
          /* 40px reads the same as 58px once it's this diffuse, and costs less */
          filter: blur(40px);
          animation: ba-drift 18s ease-in-out infinite;
          /* Rasterise the blur once, then move the layer on the GPU */
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .${k} .ba-blob:nth-child(2) { animation-duration: 23s; animation-delay: -6s; }
        .${k} .ba-blob:nth-child(3) { animation-duration: 27s; animation-delay: -12s; }
        @keyframes ba-drift {
          0%,100% { transform: translate3d(0,0,0);        opacity: 0.75; }
          33%     { transform: translate3d(30px,-24px,0); opacity: 1; }
          66%     { transform: translate3d(-22px,18px,0); opacity: 0.65; }
        }

        /* ── GLASS ──────────────────────────────────────────────── */
        .${k} .ba-pane {
          position: absolute; border-radius: 20px;
          background: linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05));
          border: 1px solid rgba(255,255,255,0.22);
          -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          box-shadow: 0 18px 50px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.28);
          animation: ba-float 13s ease-in-out infinite;
        }
        .${k} .ba-pane:nth-child(2) { animation-duration: 17s; animation-delay: -4s; }
        .${k} .ba-pane:nth-child(3) { animation-duration: 21s; animation-delay: -9s; }
        .${k} .ba-pane:nth-child(4) { animation-duration: 15s; animation-delay: -2s; }
        @keyframes ba-float {
          0%,100% { transform: translateY(0)     rotate(var(--r,0deg)); }
          50%     { transform: translateY(-22px) rotate(calc(var(--r,0deg) + 4deg)); }
        }

        /* ── TOPO + GLYPHS (SVG) ────────────────────────────────── */
        .${k} .ba-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
        .${k} .ba-topo path { animation: ba-breathe 9s ease-in-out infinite; }
        .${k} .ba-topo path:nth-child(2n) { animation-delay: -2s; }
        .${k} .ba-topo path:nth-child(3n) { animation-delay: -4s; }
        @keyframes ba-breathe { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        .${k} .ba-glyph { animation: ba-bob 11s ease-in-out infinite; transform-origin: center; }
        .${k} .ba-glyph:nth-child(2n) { animation-duration: 14s; animation-delay: -3s; }
        .${k} .ba-glyph:nth-child(3n) { animation-duration: 17s; animation-delay: -7s; }
        @keyframes ba-bob {
          0%,100% { transform: translateY(0)    rotate(0deg); }
          50%     { transform: translateY(-14px) rotate(5deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .${k} .ba-blob, .${k} .ba-pane,
          .${k} .ba-topo path, .${k} .ba-glyph { animation: none !important; }
        }
      `}</style>

      {variant === "aurora" && (
        <>
          <span className="ba-blob" style={{ width: 420, height: 420, top: "-30%", right: "4%",  background: tint }} />
          <span className="ba-blob" style={{ width: 320, height: 320, bottom: "-34%", right: "26%", background: t2 }} />
          <span className="ba-blob" style={{ width: 260, height: 260, top: "18%",  right: "44%", background: tint }} />
        </>
      )}

      {variant === "glass" && (
        <>
          <span className="ba-pane" style={{ width: 190, height: 128, top: "12%",  right: "6%",  ["--r" as string]: "-8deg",  background: `linear-gradient(135deg, ${tint}3d, ${t2}14)` }} />
          <span className="ba-pane" style={{ width: 140, height: 140, bottom: "8%", right: "22%", ["--r" as string]: "6deg",   background: `linear-gradient(135deg, ${t2}38, ${tint}12)` }} />
          <span className="ba-pane" style={{ width: 108, height: 84,  top: "8%",   right: "31%", ["--r" as string]: "12deg",  background: `linear-gradient(135deg, ${tint}30, ${t2}0f)` }} />
          <span className="ba-pane" style={{ width: 84,  height: 84,  bottom: "26%", right: "44%", ["--r" as string]: "-14deg", background: `linear-gradient(135deg, ${t2}2b, ${tint}0d)` }} />
        </>
      )}

      {variant === "topo" && (
        <svg className="ba-svg ba-topo" viewBox="0 0 800 260" preserveAspectRatio="xMaxYMid slice" fill="none">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <path
              key={i}
              d={`M-40 ${52 + i * 30} C 150 ${16 + i * 30}, 300 ${92 + i * 30}, 460 ${50 + i * 30} S 720 ${8 + i * 30}, 860 ${58 + i * 30}`}
              stroke={i % 2 === 0 ? tint : t2}
              strokeWidth={i % 3 === 0 ? 1.7 : 1}
              strokeOpacity={0.34}
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}

      {variant === "glyphs" && (
        <svg className="ba-svg" viewBox="0 0 800 260" preserveAspectRatio="xMaxYMid slice" fill="none"
             stroke={tint} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" strokeOpacity={0.4}>
          {/* phone */}
          <g className="ba-glyph" transform="translate(620 40)">
            <rect x="0" y="0" width="34" height="56" rx="6" />
            <line x1="12" y1="48" x2="22" y2="48" />
          </g>
          {/* camera */}
          <g className="ba-glyph" transform="translate(700 140)" stroke={t2}>
            <rect x="0" y="8" width="54" height="38" rx="7" />
            <circle cx="27" cy="27" r="12" />
            <path d="M16 8l6-8h10l6 8" />
          </g>
          {/* bicycle */}
          <g className="ba-glyph" transform="translate(500 150)">
            <circle cx="14" cy="34" r="14" />
            <circle cx="62" cy="34" r="14" />
            <path d="M14 34l16-24h14l18 24M30 10h14" />
          </g>
          {/* guitar */}
          <g className="ba-glyph" transform="translate(430 34)" stroke={t2}>
            <path d="M18 34c-10 0-18 8-18 18s8 18 18 18 18-8 18-18c0-6 8-10 8-18s-8-12-8-18V4" />
            <circle cx="18" cy="52" r="6" />
          </g>
          {/* sofa */}
          <g className="ba-glyph" transform="translate(560 190)">
            <rect x="0" y="14" width="62" height="26" rx="6" />
            <path d="M8 14V8a6 6 0 0 1 6-6h34a6 6 0 0 1 6 6v6M8 40v6M54 40v6" />
          </g>
          {/* watch */}
          <g className="ba-glyph" transform="translate(760 56)" stroke={t2}>
            <circle cx="18" cy="24" r="15" />
            <path d="M12 9V2h12v7M12 39v7h12v-7M18 16v8l6 4" />
          </g>
        </svg>
      )}
    </div>
  );
}