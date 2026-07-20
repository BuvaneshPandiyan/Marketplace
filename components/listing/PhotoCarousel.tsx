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
 * - Keyboard navigation (← →), and a click-to-zoom fullscreen lightbox.
 * - Plum / aubergine accents to match the listing page.
 */
export function PhotoCarousel({ photoUrls, layout = "stacked" }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
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

  // Keyboard navigation + lightbox escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setLightbox(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Lock scroll while the lightbox is open
  useEffect(() => {
    if (!lightbox) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, [lightbox]);

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
        background: #f3f0f5;
        border: 1px solid #ece3f3;
        box-shadow: 0 18px 50px rgba(147,51,168,0.16), 0 3px 10px rgba(0,0,0,0.05);
        transition: box-shadow 340ms cubic-bezier(0.22,1,0.36,1), border-color 340ms ease;
      }
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
      .pc-frame.pc-clickable { cursor: zoom-in; }

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
      /* On touch devices, keep arrows visible */
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
      .pc-expand {
        position: absolute; bottom: 14px; left: 14px;
        width: 38px; height: 38px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        background: rgba(20,4,24,0.55); color: #fff; border: none; cursor: pointer;
        backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        opacity: 0; transition: opacity 240ms ease, transform 200ms ease, background 200ms ease;
      }
      @media (hover: hover) { .pc-frame:hover .pc-expand { opacity: 1; } }
      @media (hover: none) { .pc-expand { opacity: 0.9; } }
      .pc-expand:hover { background: rgba(147,51,168,0.9); transform: scale(1.08); }

      /* Progress dots (mobile-friendly) */
      .pc-dots { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; }
      .pc-dot { width: 6px; height: 6px; border-radius: 999px; background: rgba(255,255,255,0.55); transition: all 260ms ease; box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
      .pc-dot.is-active { width: 20px; background: #fff; }

      /* ── Thumbnails ── */
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

      /* ── Lightbox ── */
      .pc-lb { position: fixed; inset: 0; z-index: 100; display: flex; align-items: center; justify-content: center;
        background: rgba(12,2,16,0.92); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        animation: pc-lb-in 240ms ease both; }
      @keyframes pc-lb-in { from { opacity: 0; } to { opacity: 1; } }
      .pc-lb-img { max-width: 92vw; max-height: 86vh; border-radius: 14px; object-fit: contain;
        box-shadow: 0 30px 90px rgba(0,0,0,0.6); animation: pc-lb-pop 320ms cubic-bezier(0.22,1,0.36,1) both; }
      @keyframes pc-lb-pop { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
      .pc-lb-close { position: absolute; top: 22px; right: 22px; width: 44px; height: 44px; border-radius: 50%;
        background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2); color: #fff; cursor: pointer;
        display: flex; align-items: center; justify-content: center; transition: background 200ms ease, transform 200ms ease; }
      .pc-lb-close:hover { background: rgba(255,255,255,0.24); transform: rotate(90deg); }
      .pc-lb-arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 52px; height: 52px; border-radius: 50%;
        background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; cursor: pointer;
        display: flex; align-items: center; justify-content: center; transition: background 200ms ease, transform 200ms ease; }
      .pc-lb-arrow:hover { background: rgba(147,51,168,0.7); }
      .pc-lb-arrow-l { left: 3vw; } .pc-lb-arrow-r { right: 3vw; }
      .pc-lb-arrow:hover.pc-lb-arrow-l { transform: translateY(-50%) translateX(-3px); }
      .pc-lb-arrow:hover.pc-lb-arrow-r { transform: translateY(-50%) translateX(3px); }
      .pc-lb-count { position: absolute; bottom: 26px; left: 50%; transform: translateX(-50%);
        color: rgba(255,255,255,0.85); font-size: 13px; font-weight: 600; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }

      @media (prefers-reduced-motion: reduce) {
        .pc-slide, .pc-arrow, .pc-thumb, .pc-frame, .pc-lb, .pc-lb-img { transition: none !important; animation: none !important; }
        .pc-frame:hover .pc-slide.is-active { transform: none; }
      }
    `}</style>
  );

  // Shared main-image stage (crossfade) + overlays
  const stage = (opts: { rounded: number; clickToZoom: boolean; showDots: boolean }) => (
    <div
      ref={layout === "side-rail" ? mainImageRef : undefined}
      className={`pc-frame ${opts.clickToZoom ? "pc-clickable" : ""}`}
      style={{ aspectRatio: "4/3", maxHeight: 580, borderRadius: opts.rounded }}
      onClick={opts.clickToZoom ? () => setLightbox(true) : undefined}
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

          {opts.clickToZoom && (
            <button type="button" className="pc-expand" aria-label="View fullscreen"
              onClick={(e) => { e.stopPropagation(); setLightbox(true); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
            </button>
          )}

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

  const lightboxEl = lightbox && (
    <div className="pc-lb" onClick={() => setLightbox(false)} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button type="button" className="pc-lb-close" aria-label="Close" onClick={(e) => { e.stopPropagation(); setLightbox(false); }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={currentIndex} className="pc-lb-img" src={photoUrls[currentIndex]} alt={`Photo ${currentIndex + 1} of ${count}`} onClick={(e) => e.stopPropagation()} />
      {count > 1 && (
        <>
          <button type="button" className="pc-lb-arrow pc-lb-arrow-l" aria-label="Previous" onClick={(e) => { e.stopPropagation(); prev(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" className="pc-lb-arrow pc-lb-arrow-r" aria-label="Next" onClick={(e) => { e.stopPropagation(); next(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <span className="pc-lb-count">{currentIndex + 1} / {count}</span>
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
            <div className="pc-rail" style={{ width: 72, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: mainImageHeight ?? "none", scrollbarWidth: "none" }}>
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
            {stage({ rounded: 20, clickToZoom: true, showDots: false })}
          </div>
        </div>
        {lightboxEl}
      </>
    );
  }

  // ── STACKED LAYOUT (mobile / default) ──
  return (
    <>
      {styleBlock}
      <div>
        {stage({ rounded: 20, clickToZoom: true, showDots: true })}
        {count > 1 && (
          <div className="pc-strip" style={{ marginTop: 12, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
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
      {lightboxEl}
    </>
  );
}