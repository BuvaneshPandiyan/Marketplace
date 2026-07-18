"use client";

/**
 * Location switcher.
 *
 * Rebuilt to match the rest of the app's modals (AuthGateModal, the chats
 * popover): gradient header with the faint grid, bottom sheet on phones and a
 * centred card from 640px, portalled to body so no ancestor's overflow or
 * transform can clip it.
 *
 * What it replaced: a plain white box at `pt-20` with an invisible backdrop, a
 * ✕ character for close, and 📍/🕑 emoji as icons. It worked, but it looked like
 * a different application to everything around it.
 *
 * Behaviour is unchanged — same detect, same search, same recents, same
 * setActiveLocation call.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import { LocationSearchInput } from "@/components/location/LocationSearchInput";
import type { StoredLocation } from "@/lib/client/locationStorage";

type LocationModalProps = {
  onClose: () => void;
};

export function LocationModal({ onClose }: LocationModalProps) {
  const { setActiveLocation, detectCurrentLocation, locality } = useActiveLocation();
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  /**
   * The place we just pinned, if the user detected one in this session. Holding
   * it here (rather than closing straight away) is the point: detection used to
   * dismiss the modal instantly, so you never saw WHICH place it decided on and
   * had no idea whether it got you right.
   */
  const [captured, setCaptured] = useState<string | null>(null);
  /**
   * Whether the user pinned a location during THIS session (vs. arriving with one
   * already set). Kept separate from `captured` so the name can safely fall back
   * to context — see handleUseCurrentLocation.
   */
  const [justPinned, setJustPinned] = useState(false);
  // True once the user asks to change an already-set location
  const [changing, setChanging] = useState(false);
  const [mounted, setMounted] = useState(false);
  /**
   * Header artwork is optional. Missing file -> onError flips this and the
   * header falls back to the plain gradient, which is what it looks like today.
   * Same pattern as HomeHero: no broken image, no layout shift, drop the file in
   * and it appears with no code change.
   */
  const [artFailed, setArtFailed] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  async function handleUseCurrentLocation() {
    setIsDetecting(true);
    setErrorMessage(null);
    const result = await detectCurrentLocation();
    setIsDetecting(false);
    if (!result.success) {
      setErrorMessage(result.error ?? "Couldn't get your location.");
      return;
    }
    /**
     * Deliberately no "Current location" fallback here. If detect doesn't hand a
     * name back, `pinnedName` falls through to `locality` from context — which
     * setActiveLocation has just set to the real one. Inventing a placeholder
     * meant a provider that didn't return the name showed "Current location"
     * while every other part of the app showed "Tambaram".
     */
    setCaptured(result.locality ?? null);
    setJustPinned(true);
    setChanging(false);
  }

  function handleSelectLocation(location: StoredLocation) {
    setActiveLocation(location);
    setCaptured(location.locality);
    setJustPinned(true);
    // Leave "changing" mode, or showPinned stays false and the modal sits on the
    // picker even though the location just changed. This is why selecting a
    // recent updated the navbar but not the modal.
    setChanging(false);
    setErrorMessage(null);
  }

  /**
   * What the modal is currently for. If we just pinned something, or a location
   * is already set and the user hasn't asked to change it, this is a
   * confirmation. Otherwise it's a picker.
   */
  const pinnedName = captured ?? locality ?? null;
  const showPinned = Boolean(pinnedName) && !changing;

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes lm-bg    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lm-sheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes lm-card  {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes lm-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes lm-ping { 0% { transform: scale(0.8); opacity: 0.7; } 100% { transform: scale(1.9); opacity: 0; } }

        .lm-back {
          position: fixed; inset: 0; z-index: 9990;
          background: rgba(12,6,2,0.55);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          animation: lm-bg 180ms ease both;
        }

        .lm-card {
          position: fixed; z-index: 9991;
          left: 0; right: 0; bottom: 0;
          background: #fff;
          /* Radius and timing still match the chats/notification sheets, but NOT
             a fixed height. Those two hold long scrolling lists, so 65vh is
             right for them. This one holds two controls and a result list — a
             fixed 65vh forced an inner scroll box, and that scroll box clipped
             the search results. Auto-height means the sheet hugs its content and
             grows when results appear, so nothing ever needs scrolling to. */
          border-radius: 24px 24px 0 0;
          overflow: hidden;
          height: auto;
          max-height: 82vh;
          display: flex; flex-direction: column;
          box-shadow: 0 -16px 56px rgba(0,0,0,0.25);
          /* Promote to its own layer before the slide starts, so the first frame
             isn't spent rasterising a blurred, shadowed, rounded box */
          will-change: transform;
          animation: lm-sheet 320ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @media (min-width: 640px) {
          .lm-card {
            top: 50%; left: 50%; right: auto; bottom: auto;
            width: min(92vw, 420px);
            border-radius: var(--r-xl, 26px);
            transform: translate(-50%,-50%);
            max-height: 84vh;
            box-shadow: 0 30px 90px rgba(0,0,0,0.3);
            animation: lm-card 300ms cubic-bezier(0.34,1.56,0.64,1) both;
          }
        }

        /* ── Header ───────────────────────────────────────────────── */
        .lm-head {
          position: relative; flex-shrink: 0;
          background: linear-gradient(135deg,#082f49 0%,#075985 45%,#0284c7 100%);
          padding: 16px 20px 20px;
        }
        /* Artwork sits behind the grid and the copy. Masked so it fades out
           toward the left, where the title and subtitle sit — they always land
           on flat colour. */
        .lm-head-art {
          position: absolute; inset: 0;
          pointer-events: none;
          opacity: 0.55;
          -webkit-mask-image: linear-gradient(90deg, transparent 4%, rgba(0,0,0,0.5) 38%, #000 82%);
          mask-image: linear-gradient(90deg, transparent 4%, rgba(0,0,0,0.5) 38%, #000 82%);
          animation: lm-art 900ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes lm-art { from { opacity: 0; transform: scale(1.1); } }
        /* Keeps the header legible whatever the artwork does */
        .lm-head-scrim {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(90deg, rgba(8,47,73,0.85) 0%, rgba(8,47,73,0.35) 55%, transparent 100%);
        }

        .lm-head-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 26px 26px;
        }
        .lm-grip {
          width: 36px; height: 4px; border-radius: 100px;
          background: rgba(255,255,255,0.25);
          margin: 0 auto 14px; position: relative;
        }
        @media (min-width: 640px) { .lm-grip { display: none; } }
        .lm-head-row {
          position: relative;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .lm-title { display: flex; align-items: center; gap: 10px; }
        .lm-title-pin {
          width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
          background: rgba(255,255,255,0.16);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          animation: lm-pin-bob 3.4s ease-in-out 600ms infinite;
        }
        @keyframes lm-pin-bob {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%     { transform: translateY(-3px) rotate(-4deg); }
        }
        .lm-h2 {
          font-size: 16px; font-weight: 900; letter-spacing: -0.035em;
          color: #fff; margin: 0;
        }
        .lm-sub { font-size: 11.5px; color: rgba(255,255,255,0.62); margin: 1px 0 0; font-weight: 600; }
        .lm-x {
          width: 30px; height: 30px; border-radius: 50%; border: none; flex-shrink: 0;
          background: rgba(255,255,255,0.16); color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 160ms ease, transform 200ms ease;
        }
        .lm-x:hover { background: rgba(255,255,255,0.3); transform: rotate(90deg); }
        .lm-x:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

        /* ── Body ─────────────────────────────────────────────────── */
        .lm-body {
          padding: 18px 20px 22px;
          flex: 1; min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding-bottom: calc(22px + env(safe-area-inset-bottom));
        }
        .lm-body > * { animation: lm-rise 380ms cubic-bezier(0.22,1,0.36,1) both; }
        .lm-body > *:nth-child(1) { animation-delay: 70ms; }
        .lm-body > *:nth-child(2) { animation-delay: 110ms; }
        .lm-body > *:nth-child(3) { animation-delay: 150ms; }
        .lm-body > *:nth-child(4) { animation-delay: 190ms; }
        .lm-body > *:nth-child(5) { animation-delay: 230ms; }

        /* ── Pinned card ──────────────────────────────────────────
           The confirmation. Green tick, the place name big and bold, and a
           Change button — because "captured" with no name told the user
           nothing, and no way back out told them less. */
        .lm-pinned {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 15px; border-radius: var(--r-md, 16px);
          background: #f0fdf4; border: 1.5px solid #bbf7d0;
          animation: lm-pin-in 480ms cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes lm-pin-in {
          0%   { opacity: 0; transform: scale(0.94) translateY(8px); }
          60%  { opacity: 1; transform: scale(1.02); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .lm-pinned-tick {
          width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, #16a34a, #22c55e);
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 12px rgba(34,197,94,0.4);
          animation: lm-tick 520ms cubic-bezier(0.34,1.56,0.64,1) 120ms both;
        }
        @keyframes lm-tick {
          0%   { transform: scale(0.3) rotate(-25deg); opacity: 0; }
          60%  { transform: scale(1.18) rotate(6deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); }
        }
        .lm-pinned-body { flex: 1; min-width: 0; }
        .lm-pinned-k {
          display: block;
          font-size: 9.5px; font-weight: 900;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: #15803d;
        }
        .lm-pinned-v {
          display: block;
          font-size: 15px; font-weight: 900; letter-spacing: -0.035em;
          color: #14532d; margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .lm-change {
          flex-shrink: 0;
          padding: 7px 13px; border-radius: var(--r-pill, 100px);
          border: 1.5px solid #bbf7d0; background: #fff;
          color: #15803d; font-size: 11.5px; font-weight: 900;
          letter-spacing: -0.02em; cursor: pointer;
          transition: transform 220ms var(--spring), background 200ms ease, border-color 200ms ease;
        }
        @media (hover: hover) {
          .lm-change:hover { background: #dcfce7; border-color: #86efac; transform: translateY(-2px); }
        }
        .lm-change:active { transform: scale(0.94); }
        .lm-change:focus-visible { outline: 2px solid #16a34a; outline-offset: 2px; }

        /* Primary confirm */
        .lm-done {
          position: relative; overflow: hidden;
          width: 100%; margin-top: 12px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px; border-radius: var(--r-pill, 100px); border: none;
          background: var(--brand-grad, linear-gradient(135deg,#0284c7,#0ea5e9));
          color: #fff; font-size: 14.5px; font-weight: 900; letter-spacing: -0.025em;
          cursor: pointer;
          box-shadow: 0 6px 20px rgba(2,132,199,0.46);
          transition: transform 240ms var(--spring), box-shadow 240ms ease;
        }
        .lm-done::after {
          content: ''; position: absolute; top: 0; bottom: 0; left: -60%; width: 45%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
          transform: translateX(-120%) skewX(-18deg);
        }
        @media (hover: hover) {
          .lm-done:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(2,132,199,0.55); }
          .lm-done:hover::after { animation: bz-shine 750ms ease both; }
          .lm-done:hover svg { transform: translateX(3px); }
        }
        .lm-done:active { transform: scale(0.97); }
        .lm-done svg { transition: transform 240ms var(--spring); }

        /* Detect button — the primary path, so it looks like it */
        .lm-detect {
          position: relative;
          width: 100%;
          display: flex; align-items: center; gap: 11px;
          padding: 13px 15px; border-radius: var(--r-md, 16px);
          border: 1.5px solid var(--brand-border, #bae6fd);
          background: var(--brand-tint, #f0f9ff);
          cursor: pointer; text-align: left;
          transition: transform 220ms var(--spring), box-shadow 220ms ease, background 200ms ease;
        }
        @media (hover: hover) {
          .lm-detect:not(:disabled):hover {
            background: #fff; transform: translateY(-2px);
            box-shadow: 0 8px 22px rgba(2,132,199,0.22);
          }
        }
        .lm-detect:disabled { opacity: 0.65; cursor: default; }
        .lm-detect:focus-visible { outline: 2px solid var(--brand, #0284c7); outline-offset: 2px; }
        @media (hover: hover) {
          .lm-detect:not(:disabled):hover .lm-detect-ico { transform: scale(1.1) rotate(-8deg); }
          .lm-detect:not(:disabled):hover .lm-detect-t   { color: var(--brand, #0284c7); }
        }
        .lm-detect-ico {
          position: relative;
          transition: transform 280ms var(--spring);
          width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
          background: var(--brand-grad, linear-gradient(135deg,#0284c7,#0ea5e9));
          color: #fff;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 10px rgba(2,132,199,0.4);
        }
        .lm-detect-ico::after {
          content: ''; position: absolute; inset: 0; border-radius: 11px;
          border: 2px solid rgba(2,132,199,0.5);
          animation: lm-ping 2.2s ease-out infinite;
          pointer-events: none;
        }
        .lm-detect-t { transition: color 200ms ease; font-size: 13.5px; font-weight: 800; letter-spacing: -0.02em; color: var(--brand-dark, #075985); }
        .lm-detect-s { font-size: 11px; color: #0369a1; margin-top: 1px; font-weight: 600; }
        @keyframes lm-spin { to { transform: rotate(360deg); } }
        .lm-spin { animation: lm-spin 700ms linear infinite; }

        .lm-err {
          margin: 10px 0 0; padding: 9px 12px;
          border-radius: 12px; background: #fef2f2; border: 1.5px solid #fecaca;
          color: #dc2626; font-size: 12px; font-weight: 600; line-height: 1.4;
        }

        /* Divider with a word in it */
        .lm-or {
          display: flex; align-items: center; gap: 10px;
          margin: 18px 0 12px;
        }
        .lm-or::before, .lm-or::after {
          content: ''; flex: 1; height: 1px; background: var(--line, #f0f0f0);
        }
        .lm-or span {
          font-size: 9.5px; font-weight: 900; letter-spacing: 0.1em;
          text-transform: uppercase; color: var(--ink-faint, #9ca3af);
        }

        /* Recents are gone: the modal is now detect-or-search only. They were
           the thing the search dropdown kept colliding with, and a stale list of
           places you've already left isn't worth a stacking-context fight. */

        @media (prefers-reduced-motion: reduce) {
          .lm-back, .lm-card, .lm-body > *, .lm-detect-ico::after, .lm-spin, .lm-head-art { animation: none !important; opacity: 1 !important; }
          .lm-head-art { opacity: 0.55 !important; transform: none !important; }
          .lm-card { transform: none !important; }
          .lm-detect, .lm-x, .lm-detect-ico, .lm-detect-t,
          .lm-change, .lm-done, .lm-done svg { transition: none !important; }
          .lm-pinned, .lm-pinned-tick { animation: none !important; opacity: 1 !important; transform: none !important; }
          .lm-change:hover, .lm-done:hover, .lm-done:active, .lm-change:active { transform: none !important; }
          .lm-title-pin { animation: none !important; }
          .lm-detect:hover .lm-detect-ico { transform: none !important; }
          .lm-detect:hover, .lm-x:hover { transform: none !important; }
        }
        @media (prefers-reduced-motion: reduce) and (min-width: 640px) {
          .lm-card { transform: translate(-50%,-50%) !important; }
        }
      `}</style>

      <div className="lm-back" onClick={onClose} aria-hidden="true" />

      <div className="lm-card" role="dialog" aria-modal="true" aria-labelledby="lm-title">
        <div className="lm-head">
          {!artFailed && (
            <div className="lm-head-art" aria-hidden="true">
              <Image
                src="/images/location-header.png"
                alt=""
                fill
                sizes="(max-width: 639px) 100vw, 420px"
                style={{ objectFit: "cover", objectPosition: "center right" }}
                onError={() => setArtFailed(true)}
              />
            </div>
          )}
          {!artFailed && <div className="lm-head-scrim" aria-hidden="true" />}
          <div className="lm-head-grid" aria-hidden="true" />
          <div className="lm-grip" aria-hidden="true" />
          <div className="lm-head-row">
            <div className="lm-title">
              <span className="lm-title-pin" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                </svg>
              </span>
              <div>
                <h2 className="lm-h2" id="lm-title">Where are you?</h2>
                <p className="lm-sub">We&apos;ll show what&apos;s close by first</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="lm-x" aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="lm-body">
          {/* ── Pinned state ──
              Shown right after detecting/choosing, and also on open when a
              location is already set. The picker below stays hidden until the
              user explicitly asks to change it — otherwise the modal reads as
              "pick a location" to someone who already has one. */}
          {showPinned && (
            <div className="lm-pinned">
              <span className="lm-pinned-tick" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <span className="lm-pinned-body">
                <span className="lm-pinned-k">{justPinned ? "Location pinned" : "You're browsing"}</span>
                <span className="lm-pinned-v">{pinnedName}</span>
              </span>
              <button type="button" className="lm-change" onClick={() => { setChanging(true); setCaptured(null); setJustPinned(false); }}>
                Change
              </button>
            </div>
          )}

          {showPinned && (
            <button type="button" className="lm-done" onClick={onClose}>
              Browse {pinnedName}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          )}

          {!showPinned && (
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isDetecting}
            className="lm-detect"
          >
            <span className="lm-detect-ico" aria-hidden="true">
              {isDetecting ? (
                <svg className="lm-spin" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              )}
            </span>
            <span>
              <span className="lm-detect-t" style={{ display: "block" }}>
                {isDetecting ? "Finding you…" : "Use my current location"}
              </span>
              <span className="lm-detect-s" style={{ display: "block" }}>
                {isDetecting ? "One moment" : "Fastest way to get accurate results"}
              </span>
            </span>
          </button>
          )}

          {errorMessage && <p className="lm-err" role="alert">{errorMessage}</p>}

          {!showPinned && <div className="lm-or"><span>or search</span></div>}

          {!showPinned && (
            <div className="lm-search">
              <LocationSearchInput onSelect={handleSelectLocation} />
            </div>
          )}

        </div>
      </div>
    </>,
    document.body
  );
}