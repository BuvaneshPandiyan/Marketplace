"use client";
import { useEffect, useRef, useState } from "react";

type PhotoCarouselProps = {
  photoUrls: string[];
  // "stacked" (default) = thumbnails below main image — used on mobile and anywhere unchanged.
  // "side-rail" = thumbnails in a vertical strip on the left — desktop-only.
  layout?: "stacked" | "side-rail";
};

export function PhotoCarousel({ photoUrls, layout = "stacked" }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Ref + state for measuring main image height so the thumbnail rail never exceeds it
  const mainImageRef = useRef<HTMLDivElement>(null);
  const [mainImageHeight, setMainImageHeight] = useState<number | null>(null);

  // Keep thumbnail rail height in sync with the main image's actual rendered height
  useEffect(() => {
    if (layout !== "side-rail" || !mainImageRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setMainImageHeight(entry.contentRect.height);
    });
    ro.observe(mainImageRef.current);
    return () => ro.disconnect();
  }, [layout]);

  function goTo(index: number) {
    setCurrentIndex(index);
  }

  if (photoUrls.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        No photos
      </div>
    );
  }

  // ── SIDE-RAIL LAYOUT (desktop) ──────────────────────────────────────────
  if (layout === "side-rail") {
    return (
      <div style={{ display: "flex", flexDirection: "row", gap: 10, alignItems: "flex-start" }}>

        {/* Thumbnail rail — left side, 68px wide, scrolls internally if overflow */}
        {photoUrls.length > 1 && (
          <div
            style={{
              width: 68,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              overflowY: "auto",
              // Constrain rail height to main image height so it never exceeds the photo
              maxHeight: mainImageHeight ?? "none",
              scrollbarWidth: "none",
            }}
          >
            {photoUrls.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => goTo(index)}
                style={{
                  width: 68,
                  height: 68,
                  flexShrink: 0,
                  overflow: "hidden",
                  borderRadius: 10,
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  outline: index === currentIndex ? "2px solid #ea580c" : "2px solid transparent",
                  outlineOffset: 2,
                  opacity: index === currentIndex ? 1 : 0.6,
                  transition: "opacity 150ms ease, outline-color 150ms ease",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Thumbnail ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            ))}
          </div>
        )}

        {/* Main image — fills remaining width */}
        <div
          ref={mainImageRef}
          style={{
            flex: 1,
            aspectRatio: "4/3",
            maxHeight: 520,
            position: "relative",
            overflow: "hidden",
            borderRadius: 16,
            background: "#f3f4f6",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentIndex}
            src={photoUrls[currentIndex]}
            alt={`Photo ${currentIndex + 1} of ${photoUrls.length}`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />

          {/* Prev / Next arrows */}
          {photoUrls.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(currentIndex === 0 ? photoUrls.length - 1 : currentIndex - 1)}
                aria-label="Previous photo"
                className="carousel-btn"
                style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => goTo(currentIndex === photoUrls.length - 1 ? 0 : currentIndex + 1)}
                aria-label="Next photo"
                className="carousel-btn"
                style={{
                  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                  width: 36, height: 36, borderRadius: "50%",
                  background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              {/* Counter */}
              <span style={{
                position: "absolute", bottom: 12, right: 12,
                borderRadius: 100, background: "rgba(0,0,0,0.6)",
                padding: "4px 10px", fontSize: 12, fontWeight: 500, color: "white",
              }}>
                {currentIndex + 1} / {photoUrls.length}
              </span>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── STACKED LAYOUT (default — mobile, unchanged) ─────────────────────────
  return (
    <>
      <style>{`
        .carousel-img {
          transition: transform 300ms ease-out;
          width: 100%; height: 100%; object-fit: cover;
        }
        @media (hover: hover) {
          .carousel-main:hover .carousel-img { transform: scale(1.03); }
          .carousel-btn:hover { transform: scale(1.1); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        }
        .carousel-btn:active { transform: scale(0.9); }
        @media (prefers-reduced-motion: reduce) {
          .carousel-img { transition-duration: 0ms !important; }
          .carousel-main:hover .carousel-img { transform: none; }
          .carousel-btn:hover { transform: none; }
        }
      `}</style>

      <div>
        {/* Main photo */}
        <div className="carousel-main relative w-full overflow-hidden rounded-2xl bg-neutral-100 border border-neutral-100"
          style={{ aspectRatio: "4/3", maxHeight: 580 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={currentIndex}
            src={photoUrls[currentIndex]}
            alt={`Photo ${currentIndex + 1} of ${photoUrls.length}`}
            className="carousel-img"
          />

          {photoUrls.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goTo(currentIndex === 0 ? photoUrls.length - 1 : currentIndex - 1)}
                aria-label="Previous photo"
                className="carousel-btn absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => goTo(currentIndex === photoUrls.length - 1 ? 0 : currentIndex + 1)}
                aria-label="Next photo"
                className="carousel-btn absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
              <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                {currentIndex + 1} / {photoUrls.length}
              </span>
            </>
          )}
        </div>

        {/* Horizontal thumbnail strip — stacked layout */}
        {photoUrls.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {photoUrls.map((url, index) => (
              <button
                key={url}
                type="button"
                onClick={() => goTo(index)}
                className="h-14 w-14 shrink-0 overflow-hidden rounded-xl transition-all"
                style={{
                  outline: index === currentIndex ? "2px solid #ea580c" : "2px solid transparent",
                  outlineOffset: "2px",
                  opacity: index === currentIndex ? 1 : 0.65,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Thumbnail ${index + 1}`} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}