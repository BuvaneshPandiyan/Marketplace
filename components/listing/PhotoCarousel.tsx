"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type PhotoCarouselProps = {
  photoUrls: string[];
  // "stacked" (default) = thumbnails below the main image — used on mobile.
  // "side-rail" = thumbnails in a vertical strip on the left — desktop-only.
  layout?: "stacked" | "side-rail";
};

/**
 * Premium product photo carousel.
 * - Glassy, blurred nav controls that fade in on hover (always visible on touch).
 * - Smooth crossfade between photos.
 * - Plum-glow active thumbnails with a subtle lift.
 * - Keyboard navigation (← →).
 * - Plum / aubergine accents to match the listing page.
 */
export function PhotoCarousel({ photoUrls, layout = "stacked" }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const [mainImageHeight, setMainImageHeight] = useState<number | null>(null);

  const count = photoUrls.length;

  const goTo = useCallback((index: number) => {
    setCurrentIndex((index + count) % count);
  }, [count]);
  const next = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
  const prev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

  // Keep the side-rail height in sync with the main image
  useEffect(() => {
    if (layout !== "side-rail" || !mainImageRef.current) return;
    const ro = new ResizeObserver(([entry]) => setMainImageHeight(entry.contentRect.height));
    ro.observe(mainImageRef.current);
    return () => ro.disconnect();
  }, [layout]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  if (count === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        No photos
      </div>
    );
  }

  const styleBlock = (
    <style>{`
      /* ── Frame ── */
      .pc-frame {
        position: relative; overflow: hidden; border-radius: 20px;
        aspect-ratio: 1 / 1; max-height: 620px;
        background: #f3f0f5;
        border: 1px solid #ece3f3;
        box-shadow: 0 18px 50px rgba(147,51,168,0.16), 0 3px 10px rgba(0,0,0,0.05);
        transition: box-shadow 340ms cubic-bezier(0.22,1,0.36,1), border-color 340ms ease;
      }
      @media(min-width:1024px){ .pc-frame { aspect-ratio: 4 / 3; max-height: 580px; } }
      @media (hover: hover) {
        .pc-frame:hover { box-shadow: 0 26px 66px rgba(147,51,168,0.24), 0 6px 16px rgba(0,0,0,0.06); border-color: #dcc4e8; }
      }
      /* Crossfade stack */
      .pc-stage { position: absolute; inset: 0; }
      .pc-slide {
        position: absolute; inset: 0; opacity: 0;
        transition: opacity 420ms ease, transform 6s ease-out;
        transform: scale(1.001);
      }
      .pc-slide.is-active { opacity: 1; }
      .pc-slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
      @media (hover: hover) {
        .pc-frame:hover .pc-slide.is-active { transform: scale(1.04); }
      }
      /* Gradient veil at the bottom so overlays read on any photo */
      .pc-veil {
        position: absolute; inset: 0; pointer-events: none;
        background: linear-gradient(180deg, transparent 62%, rgba(20,4,24,0.28) 100%);
        opacity: 0; transition: opacity 280ms ease;
      }
      @media (hover: hover) { .pc-frame:hover .pc-veil { opacity: 1; } }

      /* ── Controls ── */
      .pc-arrow {
        position: absolute; top: 50%; transform: translateY(-50%) scale(1);
        width: 42px; height: 42px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,0.82); border: 1px solid rgba(255,255,255,0.7);
        backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.16); cursor: pointer;
        color: #4a1d5c; opacity: 0;
        transition: opacity 240ms ease, transform 220ms cubic-bezier(0.34,1.56,0.64,1), background 200ms ease;
      }
      .pc-arrow-l { left: 14px; }
      .pc-arrow-r { right: 14px; }
      @media (hover: hover) { .pc-frame:hover .pc-arrow { opacity: 1; } }
      @media (hover: none) { .pc-arrow { opacity: 0.92; } }
      .pc-arrow:hover { background: #fff; transform: translateY(-50%) scale(1.12); }
      .pc-arrow:active { transform: translateY(-50%) scale(0.94); }

      .pc-count {
        position: absolute; bottom: 14px; right: 14px;
        border-radius: 999px; background: rgba(20,4,24,0.62);
        backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        padding: 5px 12px; font-size: 12px; font-weight: 700; letter-spacing: -0.01em; color: #fff;
        font-variant-numeric: tabular-nums;
      }

      /* Progress dots (mobile-friendly) */
      .pc-dots { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; }
      .pc-dot { width: 6px; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.55); transition: all 260ms ease; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
      .pc-dot.is-active { width: 20px; background: #fff; }

      /* ── Thumbnails ── */
      /* NOTE: the scroll containers carry padding so the active thumb's ring +
         glow + scale never get clipped at the edges. */
      .pc-rail { padding: 4px; }
      .pc-strip { padding: 6px 4px; }
      .pc-thumb {
        position: relative; flex-shrink: 0; overflow: hidden; border: none; padding: 0; cursor: pointer;
        border-radius: 12px; background: #eee;
        transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 240ms ease, opacity 200ms ease;
        opacity: 0.62; transform: scale(1);
      }
      .pc-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .pc-thumb::after {
        content: ""; position: absolute; inset: 0; border-radius: 12px;
        box-shadow: inset 0 0 0 0 #9333a8; transition: box-shadow 220ms ease;
      }
      @media (hover: hover) { .pc-thumb:hover { opacity: 1; transform: scale(1.05); } }
      .pc-thumb.is-active { opacity: 1; box-shadow: 0 6px 18px rgba(147,51,168,0.34); }
      .pc-thumb.is-active::after { box-shadow: inset 0 0 0 2.5px #9333a8; }
      .pc-rail::-webkit-scrollbar, .pc-strip::-webkit-scrollbar { display: none; }

      @media (prefers-reduced-motion: reduce) {
        .pc-slide, .pc-arrow, .pc-thumb, .pc-frame { transition: none !important; animation: none !important; }
        .pc-frame:hover .pc-slide.is-active { transform: none; }
      }
    `}</style>
  );

  // Shared main-image stage (crossfade) + overlays
  const stage = (opts: { rounded: number; showDots: boolean }) => (
    <div
      ref={layout === "side-rail" ? mainImageRef : undefined}
      className="pc-frame"
      style={{ borderRadius: opts.rounded }}
    >
      <div className="pc-stage">
        {photoUrls.map((url, i) => (
          <div key={url} className={`pc-slide ${i === currentIndex ? "is-active" : ""}`} aria-hidden={i !== currentIndex}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${i + 1} of ${count}`} />
          </div>
        ))}
      </div>
      <div className="pc-veil" aria-hidden="true" />

      {count > 1 && (
        <>
          <button type="button" className="pc-arrow pc-arrow-l" aria-label="Previous photo"
            onClick={(e) => { e.stopPropagation(); prev(); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" className="pc-arrow pc-arrow-r" aria-label="Next photo"
            onClick={(e) => { e.stopPropagation(); next(); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>

          {opts.showDots && count <= 8 ? (
            <div className="pc-dots" aria-hidden="true">
              {photoUrls.map((u, i) => <span key={u} className={`pc-dot ${i === currentIndex ? "is-active" : ""}`} />)}
            </div>
          ) : (
            <span className="pc-count">{currentIndex + 1} / {count}</span>
          )}
        </>
      )}
    </div>
  );

  // ── SIDE-RAIL LAYOUT (desktop) ──
  if (layout === "side-rail") {
    return (
      <>
        {styleBlock}
        <div style={{ display: "flex", flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
          {count > 1 && (
            <div className="pc-rail" style={{ width: 80, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: mainImageHeight ?? "none", scrollbarWidth: "none" }}>
              {photoUrls.map((url, index) => (
                <button key={url} type="button" className={`pc-thumb ${index === currentIndex ? "is-active" : ""}`}
                  style={{ width: 72, height: 72 }}
                  onClick={() => goTo(index)} onMouseEnter={() => goTo(index)} aria-label={`View photo ${index + 1}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Thumbnail ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {stage({ rounded: 20, showDots: false })}
          </div>
        </div>
      </>
    );
  }

  // ── STACKED LAYOUT (mobile / default) ──
  return (
    <>
      {styleBlock}
      <div>
        {stage({ rounded: 20, showDots: true })}
        {count > 1 && (
          <div className="pc-strip" style={{ marginTop: 8, display: "flex", gap: 8, overflowX: "auto" }}>
            {photoUrls.map((url, index) => (
              <button key={url} type="button" className={`pc-thumb ${index === currentIndex ? "is-active" : ""}`}
                style={{ width: 60, height: 60 }}
                onClick={() => goTo(index)} onMouseEnter={() => goTo(index)} aria-label={`View photo ${index + 1}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Thumbnail ${index + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}