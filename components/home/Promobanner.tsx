"use client";

/**
 * The homepage ad banner — a rectangular promo slot.
 *
 * Slides come from lib/promoBanners.ts, so selling a slot is a config edit, not
 * a component edit. Swap that import for a fetch when you build a promo_banners
 * table and nothing else here changes.
 *
 * On "perfect and not awkward at every size": the banner is driven by
 * aspect-ratio, not a fixed height, and the ratio itself steps down as the
 * viewport narrows (2.8:1 wide → 1.9:1 on phones). A single fixed height is
 * exactly what makes banners look squashed on desktop and cramped on mobile.
 * Copy is clamped, and the motif and subtitle drop out below 480px rather than
 * being allowed to collide.
 *
 * Behaviour: auto-advances every 5.5s, pauses on hover and on focus-within (so
 * keyboard users aren't chased), pauses when scrolled out of view, and respects
 * prefers-reduced-motion by not auto-advancing at all. Swipeable on touch.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PROMO_SLIDES, PROMO_THEMES } from "@/lib/promoBanners";

const INTERVAL_MS = 5500;

export function PromoBanner() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  /**
   * Slides whose artwork failed to load. Same trick as the hero: a missing file
   * silently reverts that slide to gradient + motif rather than showing a broken
   * image, so you can add the art one slide at a time.
   */
  const [artFailed, setArtFailed] = useState<Set<string>>(new Set());

  const count = PROMO_SLIDES.length;
  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  // Auto-advance. Skipped entirely under reduced-motion — an auto-rotating
  // carousel is motion whether or not we animate the transition.
  useEffect(() => {
    if (paused || count <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearInterval(t);
  }, [paused, count]);

  // Don't burn frames animating a banner nobody can see
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (count === 0) return null;

  return (
    <>
      <style>{`
        .pb-wrap {
          max-width: var(--page-max);
          margin: 0 auto;
          padding: 20px 16px 0;
        }
        @media (min-width: 640px) { .pb-wrap { padding: 28px 24px 0; } }

        .pb {
          position: relative;
          border-radius: var(--r-lg);
          overflow: hidden;
          /* Ratio, not height — this is what keeps it honest at every width */
          aspect-ratio: 1.9 / 1;
          box-shadow: var(--sh-lg);
          isolation: isolate;
        }
        @media (min-width: 480px)  { .pb { aspect-ratio: 2.4 / 1; } }
        @media (min-width: 768px)  { .pb { aspect-ratio: 3.2 / 1; border-radius: var(--r-xl); } }
        @media (min-width: 1100px) { .pb { aspect-ratio: 4 / 1; } }
        /* Very tall/narrow phones would otherwise get a banner taller than it is
           useful — cap it and let the ratio give way. */
        @media (max-width: 479px)  { .pb { max-height: 210px; } }

        .pb-slide {
          position: absolute; inset: 0;
          display: flex; align-items: center;
          padding: 20px;
          opacity: 0;
          transform: scale(1.04);
          transition: opacity 620ms var(--ease), transform 900ms var(--ease);
          pointer-events: none;
          text-decoration: none;
        }
        @media (min-width: 768px)  { .pb-slide { padding: 28px 36px; } }
        @media (min-width: 1100px) { .pb-slide { padding: 32px 48px; } }
        .pb-slide[data-active="true"] {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }

        /* Artwork sits behind everything, masked so its left edge dissolves into
           the gradient — the copy always lands on flat colour. Scales in slowly
           while its slide is active, which gives the banner some life without
           anything moving under the reader. */
        .pb-art {
          position: absolute; inset: 0;
          pointer-events: none;
          opacity: 0.5;
          -webkit-mask-image: linear-gradient(90deg, transparent 6%, rgba(0,0,0,0.6) 42%, #000 78%);
          mask-image: linear-gradient(90deg, transparent 6%, rgba(0,0,0,0.6) 42%, #000 78%);
        }
        @media (min-width: 768px) { .pb-art { opacity: 0.78; } }
        .pb-slide[data-active="true"] .pb-art {
          animation: pb-art-drift 9s ease-out both;
        }
        @keyframes pb-art-drift {
          from { transform: scale(1.12); }
          to   { transform: scale(1); }
        }

        .pb-mesh {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 26px 26px;
        }
        .pb-glow {
          position: absolute; top: 50%; right: -6%;
          width: 46%; aspect-ratio: 1; border-radius: 50%;
          transform: translateY(-50%);
          pointer-events: none;
          animation: pb-glow-pulse 7s ease-in-out infinite;
        }
        @keyframes pb-glow-pulse {
          0%,100% { transform: translateY(-50%) scale(1);    opacity: 0.8; }
          50%     { transform: translateY(-50%) scale(1.16); opacity: 1; }
        }

        /* The oversized motif — decorative, and the first thing to go when
           space is tight */
        .pb-motif {
          position: absolute; right: 3%; top: 50%;
          transform: translateY(-50%) rotate(-10deg);
          font-size: clamp(70px, 13vw, 150px);
          opacity: 0.16;
          pointer-events: none;
          animation: pb-motif-bob 6s ease-in-out infinite;
        }
        @keyframes pb-motif-bob {
          0%,100% { transform: translateY(-50%) rotate(-10deg) scale(1); }
          50%     { transform: translateY(-56%) rotate(-6deg) scale(1.05); }
        }
        @media (max-width: 479px) { .pb-motif { display: none; } }

        .pb-copy { position: relative; z-index: 1; max-width: 62%; }
        @media (max-width: 479px) { .pb-copy { max-width: 100%; } }

        .pb-kicker {
          display: inline-block;
          font-size: 9.5px; font-weight: 800;
          letter-spacing: 0.12em; text-transform: uppercase;
          padding: 4px 9px; border-radius: var(--r-pill);
          background: rgba(255,255,255,0.16);
          border: 1px solid rgba(255,255,255,0.2);
          margin-bottom: 8px;
        }
        @media (min-width: 768px) { .pb-kicker { font-size: 10.5px; padding: 5px 11px; } }

        .pb-title {
          color: #fff; margin: 0 0 5px;
          font-size: clamp(17px, 3.4vw, 32px);
          font-weight: 900; letter-spacing: -0.04em; line-height: 1.1;
          /* Two lines max — beyond that the banner stops being a banner */
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .pb-sub {
          color: rgba(255,255,255,0.72);
          font-size: 12.5px; font-weight: 500; line-height: 1.45;
          margin: 0 0 12px;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
          overflow: hidden;
        }
        @media (min-width: 768px) { .pb-sub { font-size: 14px; margin-bottom: 14px; } }
        @media (max-width: 479px) { .pb-sub { display: none; } }

        .pb-cta {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 15px; border-radius: var(--r-pill);
          background: #fff; color: #111;
          font-size: 12.5px; font-weight: 800; letter-spacing: -0.02em;
          box-shadow: 0 6px 18px rgba(0,0,0,0.2);
          transition: transform 240ms var(--spring), box-shadow 240ms ease;
        }
        @media (min-width: 768px) { .pb-cta { font-size: 13.5px; padding: 10px 18px; } }
        @media (hover: hover) {
          .pb-slide:hover .pb-cta { transform: translateX(3px); box-shadow: 0 10px 26px rgba(0,0,0,0.28); }
          .pb-slide:hover .pb-cta svg { transform: translateX(3px); }
        }
        .pb-cta svg { transition: transform 240ms var(--spring); }

        /* ── Controls ─────────────────────────────────────────────── */
        .pb-dots {
          position: absolute; bottom: 12px; right: 16px; z-index: 2;
          display: flex; gap: 6px;
        }
        @media (min-width: 768px) { .pb-dots { bottom: 16px; right: 24px; } }
        .pb-dot {
          width: 7px; height: 7px; border-radius: var(--r-pill);
          border: none; padding: 0; cursor: pointer;
          background: rgba(255,255,255,0.4);
          transition: width 320ms var(--ease), background 320ms ease;
        }
        .pb-dot[data-active="true"] { width: 22px; background: #fff; }
        .pb-dot:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

        .pb-arrow {
          position: absolute; top: 50%; z-index: 2;
          transform: translateY(-50%);
          width: 32px; height: 32px; border-radius: 50%;
          border: none; cursor: pointer;
          background: rgba(0,0,0,0.28);
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          color: #fff;
          display: none; align-items: center; justify-content: center;
          transition: background 200ms ease, transform 200ms var(--spring);
          opacity: 0;
        }
        /* Arrows are a desktop affordance — phones swipe */
        @media (min-width: 768px) and (hover: hover) {
          .pb-arrow { display: flex; }
          .pb:hover .pb-arrow { opacity: 1; }
          .pb-arrow:hover { background: rgba(0,0,0,0.5); transform: translateY(-50%) scale(1.12); }
        }
        .pb-arrow:focus-visible { opacity: 1; outline: 2px solid #fff; outline-offset: 2px; }
        .pb-arrow-prev { left: 12px; }
        .pb-arrow-next { right: 12px; }

        /* Progress hairline — shows the slide is on a timer */
        .pb-bar {
          position: absolute; bottom: 0; left: 0; right: 0; height: 3px;
          background: rgba(255,255,255,0.15); z-index: 2;
        }
        .pb-bar-fill {
          height: 100%; background: rgba(255,255,255,0.85);
          transform-origin: left;
          animation: pb-progress ${INTERVAL_MS}ms linear both;
        }
        @keyframes pb-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }

        @media (prefers-reduced-motion: reduce) {
          .pb-slide { transition: none !important; transform: none !important; }
          .pb-glow, .pb-motif { animation: none !important; }
          .pb-slide[data-active="true"] .pb-art { animation: none !important; transform: none !important; }
          .pb-bar { display: none !important; }
          .pb-cta, .pb-cta svg, .pb-arrow, .pb-dot { transition: none !important; }
        }
      `}</style>

      <div className="pb-wrap">
        <div
          className="pb"
          ref={rootRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
            touchX.current = null;
          }}
          role="region"
          aria-roledescription="carousel"
          aria-label="Promotions"
        >
          {PROMO_SLIDES.map((slide, i) => {
            const theme = PROMO_THEMES[slide.theme];
            const active = i === index;
            return (
              <Link
                key={slide.id}
                href={slide.href}
                className="pb-slide"
                data-active={active}
                style={{ background: theme.bg }}
                aria-hidden={!active}
                tabIndex={active ? 0 : -1}
              >
                {slide.image && !artFailed.has(slide.id) && (
                  <span className="pb-art" aria-hidden="true">
                    <Image
                      src={slide.image}
                      alt=""
                      fill
                      sizes="(max-width: 767px) 100vw, 60vw"
                      style={{ objectFit: "cover", objectPosition: "center right" }}
                      onError={() =>
                        setArtFailed((prev) => new Set(prev).add(slide.id))
                      }
                    />
                  </span>
                )}
                <span className="pb-mesh" aria-hidden="true" />
                <span
                  className="pb-glow"
                  aria-hidden="true"
                  style={{ background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)` }}
                />
                <span className="pb-motif" aria-hidden="true">
                  {slide.motif}
                </span>

                <span className="pb-copy">
                  <span className="pb-kicker" style={{ color: theme.accent }}>
                    {slide.kicker}
                  </span>
                  <span className="pb-title" style={{ display: "-webkit-box" }}>
                    {slide.title}
                  </span>
                  <span className="pb-sub" style={{ display: "-webkit-box" }}>
                    {slide.subtitle}
                  </span>
                  <span className="pb-cta">
                    {slide.cta}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </span>
              </Link>
            );
          })}

          {count > 1 && (
            <>
              <button type="button" className="pb-arrow pb-arrow-prev" onClick={() => go(index - 1)} aria-label="Previous promotion">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button type="button" className="pb-arrow pb-arrow-next" onClick={() => go(index + 1)} aria-label="Next promotion">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>

              <div className="pb-dots">
                {PROMO_SLIDES.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    className="pb-dot"
                    data-active={i === index}
                    onClick={() => go(i)}
                    aria-label={`Go to promotion ${i + 1} of ${count}`}
                  />
                ))}
              </div>

              <div className="pb-bar" aria-hidden="true">
                {/* key forces the fill to restart on each slide change */}
                {!paused && <div className="pb-bar-fill" key={index} />}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}