"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function ListingDescription({ description }: { description: string }) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // Guard for SSR — portals need document to exist
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Detect actual overflow — only show "Show more" when line-clamp really cut content
  useEffect(() => {
    const el = textRef.current;
    if (el) setIsOverflowing(el.scrollHeight > el.clientHeight);
  }, [description]);

  // Lock body scroll while modal is open — prevents the map scrolling into view behind it
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [modalOpen]);

  // Close on Escape
  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setModalOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  return (
    <div>
      <style>{`
        /* Mobile: short clamp. Desktop: fill down to roughly the photo + thumbnail
           height so the "Show more" button lands next to the thumbnail strip. */
        .ld-text {
          display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden;
          -webkit-line-clamp: 5;
        }
        @media (min-width: 1024px) {
          .ld-text { display: block; -webkit-line-clamp: unset; max-height: 372px; }
        }
      `}</style>
      <h2 className="mb-2 text-[17px] font-black tracking-tight text-neutral-900">Description</h2>
      <p ref={textRef} className="ld-text whitespace-pre-line text-sm leading-relaxed text-neutral-700">
        {description}
      </p>
      {isOverflowing && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-2 text-sm font-semibold text-purple-700 hover:text-purple-800"
        >
          Show more
        </button>
      )}

      {/* Portal — renders directly into document.body, completely outside any
          Framer Motion transformed ancestor that would break position:fixed anchoring.
          zIndex 9999 sits well above Leaflet's highest layer (zoom control = 1000). */}
      {mounted && modalOpen && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full description"
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 16,
              maxWidth: 560, width: "100%",
              maxHeight: "80vh", overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>Description</p>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  border: "none", background: "#f3f4f6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.5}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="whitespace-pre-line text-sm text-neutral-700">{description}</p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}