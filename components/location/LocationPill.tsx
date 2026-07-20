"use client";

/**
 * The header's location selector.
 *
 * Zomato pattern: no box. A pin, the place name in heavy tight type, a chevron,
 * and a dashed underline that goes solid on hover — it reads as "this word is
 * editable" rather than as a form control sitting in the nav. The old version
 * was a grey-bordered pill with a 📍 emoji and a ▾ character, which looked like
 * a filter chip and used two glyphs that render differently on every platform.
 */

import { useState } from "react";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import { LocationModal } from "@/components/location/LocationModal";

export function LocationPill() {
  const { locality, needsSetup } = useActiveLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <style>{`
        .lp {
          display: none;
          align-items: center; gap: 7px;
          flex-shrink: 0;
          border: none; background: transparent;
          padding: 7px 10px; border-radius: var(--r-pill, 100px);
          cursor: pointer;
          transition: background 200ms ease;
        }
        @media (min-width: 640px) { .lp { display: flex; } }
        @media (hover: hover) { .lp:hover { background: #e0f2fe; } }
        .lp:focus-visible { outline: 2px solid #0284c7; outline-offset: 2px; }

        .lp-pin {
          color: #0284c7;
          flex-shrink: 0;
          transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1);
        }
        @media (hover: hover) { .lp:hover .lp-pin { transform: scale(1.15) translateY(-1px); } }
        /* A slow blip so the pin reads as "live", matching the nav's other motion */
        @keyframes lp-ping {
          0%, 82%, 100% { transform: scale(1); }
          88%           { transform: scale(1.22) translateY(-2px); }
          94%           { transform: scale(0.96); }
        }
        .lp-pin { animation: lp-ping 6s ease-in-out 3s infinite; }
        .lp:hover .lp-pin { animation-play-state: paused; }

        .lp-text {
          max-width: 11rem;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          font-size: 13.5px; font-weight: 800; letter-spacing: -0.03em;
          color: var(--ink, #1a1a1a);
          border-bottom: 1.5px dashed #d6d3d1;
          padding-bottom: 1px;
          transition: border-color 200ms ease, color 200ms ease;
        }
        @media (hover: hover) {
          .lp:hover .lp-text { border-bottom-color: #0284c7; color: #0284c7; }
        }
        /* No location yet — say so in brand colour so it reads as an action */
        .lp[data-setup="true"] .lp-text { color: #0284c7; border-bottom-color: #bae6fd; }

        .lp-caret {
          color: #a8a29e; flex-shrink: 0;
          transition: transform 260ms cubic-bezier(0.34,1.56,0.64,1), color 200ms ease;
        }
        @media (hover: hover) { .lp:hover .lp-caret { color: #0284c7; transform: translateY(1px); } }
        .lp[data-open="true"] .lp-caret { transform: rotate(180deg); color: #0284c7; }

        @media (prefers-reduced-motion: reduce) {
          .lp, .lp-pin, .lp-text, .lp-caret { transition: none !important; animation: none !important; }
          .lp:hover .lp-pin, .lp:hover .lp-caret { transform: none !important; }
        }
      `}</style>

      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="lp"
        data-setup={needsSetup}
        data-open={isModalOpen}
        aria-label={needsSetup ? "Set your location" : `Change location, currently ${locality}`}
        aria-expanded={isModalOpen}
      >
        <svg className="lp-pin" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
        </svg>
        <span className="lp-text">{needsSetup ? "Set location" : locality}</span>
        <svg className="lp-caret" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isModalOpen && <LocationModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}