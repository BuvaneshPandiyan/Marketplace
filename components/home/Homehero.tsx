"use client";

/**
 * Homepage hero.
 *
 * Same visual language as the Contact page banner — the dark→orange sweep, the
 * faint grid, the corner bloom, heavy tight type — so the two read as one brand
 * rather than two designers. Where Contact is a flat statement, this one earns
 * its height with drifting category cards on the right and a live locality chip.
 *
 * The locality comes from the existing location cookie/hook, so the headline is
 * personalised the moment the user has set a location, and degrades to a generic
 * line when they haven't. No layout shift either way — the chip reserves space.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { GatedLink } from "@/components/auth/GatedLink";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";

/**
 * The category pool the hero cycles through. Add or remove freely — the slots
 * below just draw from this list, so the layout doesn't care how long it is.
 */
const CATEGORY_POOL = [
  { emoji: "📱", label: "Mobiles" },
  { emoji: "🛵", label: "Scooters" },
  { emoji: "🪑", label: "Furniture" },
  { emoji: "🎮", label: "Gaming" },
  { emoji: "🏠", label: "Rentals" },
  { emoji: "💻", label: "Laptops" },
  { emoji: "🚗", label: "Cars" },
  { emoji: "📺", label: "TVs" },
  { emoji: "🚲", label: "Bicycles" },
  { emoji: "👗", label: "Fashion" },
  { emoji: "🎸", label: "Music gear" },
  { emoji: "🧊", label: "Appliances" },
  { emoji: "📚", label: "Books" },
  { emoji: "🔧", label: "Tools" },
  { emoji: "🐕", label: "Pets" },
  { emoji: "⌚", label: "Watches" },
];

/**
 * Fixed positions in the hero's right-hand side. Each slot holds one category
 * at a time and swaps to a new one on a rotation. Positions are deliberately
 * uneven — a tidy grid reads as a chart, a scatter reads as a marketplace.
 */
/**
 * Slot positions.
 *
 * KEEP THE CENTRE CLEAR. Roughly 30–70% across and 10–55% down is where the
 * artwork's people are — a card parked there lands on someone's face. These
 * six hug the perimeter and the lower-middle instead, which stays readable
 * whatever illustration you swap in, since hero art almost always puts its
 * subject centre-frame.
 */
const SLOTS = [
  { top: "1%",  left: "2%",  delay: "0s",   dur: "7s"   }, // top-left
  { top: "36%", left: "-4%", delay: "1.1s", dur: "8.5s" }, // mid-left
  { top: "72%", left: "4%",  delay: "0.5s", dur: "7.8s" }, // bottom-left
  { top: "3%",  left: "64%", delay: "0.6s", dur: "7.4s" }, // top-right
  { top: "80%", left: "38%", delay: "1.8s", dur: "9s"   }, // bottom-centre
  { top: "56%", left: "70%", delay: "2.2s", dur: "8.2s" }, // right, below the faces
];

// How long each slot holds before swapping. Staggered so they never flip in unison.
const SWAP_MS = 2100;


export function HomeHero() {
  const { locality } = useActiveLocation();
  /**
   * The artwork is optional. If /public/images/hero-marketplace.png isn't there
   * yet, onError flips this and we fall back to the plain gradient — no broken
   * image icon, no layout shift, hero still looks finished. Drop the file in and
   * it appears on the next load with no code change.
   */
  const [artFailed, setArtFailed] = useState(false);

  /**
   * Which pool item each slot is showing. One slot swaps every SWAP_MS, round
   * robin, so the wall is always gently changing but never all at once. We skip
   * any category currently on screen, so you never see the same one twice.
   */
  const [slotItems, setSlotItems] = useState<number[]>(() => SLOTS.map((_, i) => i));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let slot = 0;
    const t = setInterval(() => {
      setSlotItems((prev) => {
        const next = [...prev];
        const onScreen = new Set(prev);
        let cand = (prev[slot] + SLOTS.length) % CATEGORY_POOL.length;
        let guard = 0;
        while (onScreen.has(cand) && guard++ < CATEGORY_POOL.length) {
          cand = (cand + 1) % CATEGORY_POOL.length;
        }
        next[slot] = cand;
        return next;
      });
      slot = (slot + 1) % SLOTS.length;
    }, SWAP_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style>{`
        .hh {
          position: relative;
          overflow: hidden;
          background: var(--brand-hero);
          padding: 38px 0 44px;
        }
        @media (min-width: 640px)  { .hh { padding: 60px 0 66px; border-radius: 0 0 32px 32px; } }
        @media (min-width: 1024px) { .hh { padding: 76px 0 84px; } }

        .hh-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .hh-glow {
          position: absolute; top: -140px; right: -90px;
          width: 420px; height: 420px; border-radius: 50%;
          background: radial-gradient(circle, rgba(249,115,22,0.5) 0%, transparent 70%);
          pointer-events: none;
          animation: hh-breathe 9s ease-in-out infinite;
        }
        @keyframes hh-breathe {
          0%,100% { transform: scale(1); opacity: 0.85; }
          50%     { transform: scale(1.14); opacity: 1; }
        }

        /* ── Hero artwork ─────────────────────────────────────────
           Right-hand 58% on desktop, masked to nothing at the left so text
           stays legible. On phones it spans the full width but drops to low
           opacity and sits behind everything — decoration, never competition. */
        .hh-art-img {
          position: absolute;
          inset: 0 0 0 auto;
          width: 100%;
          z-index: 0;
          opacity: 0.28;
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 65%);
          mask-image: linear-gradient(90deg, transparent 0%, #000 65%);
          animation: hh-art-in 1100ms var(--ease) both;
        }
        @media (min-width: 900px) {
          .hh-art-img {
            width: 58%;
            opacity: 0.85;
            -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.65) 32%, #000 70%);
            mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.65) 32%, #000 70%);
          }
        }
        @keyframes hh-art-in {
          from { opacity: 0; transform: scale(1.08); }
        }

        .hh-wrap {
          position: relative;
          z-index: 1;
          max-width: var(--page-max);
          margin: 0 auto;
          padding: 0 16px;
        }
        @media (min-width: 640px) { .hh-wrap { padding: 0 24px; } }

        /* Two columns once there's room for the floaters to not crowd the text */
        .hh-cols { display: block; }
        @media (min-width: 900px) {
          .hh-cols {
            display: grid;
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
            gap: 40px;
            align-items: center;
          }
        }

        /* ── Copy ─────────────────────────────────────────────────── */
        .hh-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 6px 13px; border-radius: var(--r-pill);
          margin-bottom: 18px;
          /* Reserve height so the locality resolving doesn't shift the headline */
          min-height: 27px;
        }
        .hh-pin { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; flex-shrink: 0; box-shadow: 0 0 0 3px rgba(74,222,128,0.25); }

        .hh-h1 {
          color: #fff; margin: 0 0 14px;
          font-size: 34px; font-weight: 900;
          letter-spacing: -0.045em; line-height: 1.03;
        }
        @media (min-width: 640px)  { .hh-h1 { font-size: 52px; } }
        @media (min-width: 1024px) { .hh-h1 { font-size: 64px; } }
        .hh-h1 em { font-style: normal; color: #fdba74; position: relative; }
        /* The underline draws itself in once, after the headline lands */
        /* Words clip against their own line box and slide up into it */
        .hh-line { display: block; overflow: hidden; padding-bottom: 0.06em; }
        .hh-word {
          display: inline-block;
          margin-right: 0.25em;
          animation: hh-word-up 620ms var(--ease) both;
        }
        @keyframes hh-word-up {
          from { transform: translateY(105%) rotate(3deg); opacity: 0; }
          to   { transform: translateY(0) rotate(0);       opacity: 1; }
        }
        /* Accent line.
           NOTE: do NOT use background-clip:text here. The words inside carry
           their own transforms (from hh-word-up, fill-mode both), and a
           transformed descendant gets its own compositing layer that a clipped
           background cannot paint into — the text renders invisible. Glow via
           text-shadow instead, which composites fine alongside transforms. */
        .hh-h1 em { color: #fdba74; }
        .hh-h1 em .hh-word {
          animation: hh-word-up 620ms var(--ease) both,
                     hh-glow 4.2s ease-in-out infinite;
        }
        /* Each word lights up a beat after the one before it, so the glow reads
           as a wave travelling along the line rather than the line flashing. */
        .hh-h1 em .hh-word:nth-child(1) { animation-delay: 360ms, 1.4s; }
        .hh-h1 em .hh-word:nth-child(2) { animation-delay: 435ms, 1.55s; }
        .hh-h1 em .hh-word:nth-child(3) { animation-delay: 510ms, 1.7s; }
        .hh-h1 em .hh-word:nth-child(4) { animation-delay: 585ms, 1.85s; }
        @keyframes hh-glow {
          0%, 65%, 100% { text-shadow: 0 0 0 rgba(255,255,255,0); }
          80%           { text-shadow: 0 0 26px rgba(255,236,210,0.85); }
        }
        .hh-h1 em::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: 2px;
          height: 5px; border-radius: 4px;
          background: rgba(253,186,116,0.35);
          transform-origin: left;
          animation: hh-underline 700ms var(--ease) 620ms both;
        }
        @keyframes hh-underline { from { transform: scaleX(0); } to { transform: scaleX(1); } }

        .hh-sub {
          color: rgba(255,255,255,0.72);
          font-size: 15px; font-weight: 500; line-height: 1.55;
          margin: 0 0 24px; max-width: 34ch;
        }
        @media (min-width: 640px) { .hh-sub { font-size: 17px; max-width: 44ch; } }

        /* ── CTAs ─────────────────────────────────────────────────── */
        .hh-ctas { display: flex; flex-wrap: wrap; gap: 10px; }
        .hh-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 22px; border-radius: var(--r-pill);
          font-size: 14.5px; font-weight: 800; letter-spacing: -0.02em;
          text-decoration: none; cursor: pointer;
          transition: transform 240ms var(--spring), box-shadow 240ms ease, background 200ms ease;
        }
        .hh-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
        .hh-btn-primary {
          position: relative; overflow: hidden;
          background: #fff; color: var(--brand);
          box-shadow: 0 8px 26px rgba(0,0,0,0.24);
        }
        .hh-btn-primary::after {
          content: ''; position: absolute; top: 0; bottom: 0; left: -60%; width: 45%;
          background: linear-gradient(90deg, transparent, rgba(234,88,12,0.18), transparent);
          transform: translateX(-120%) skewX(-18deg);
        }
        .hh-btn-ghost {
          background: rgba(255,255,255,0.12);
          border: 1.5px solid rgba(255,255,255,0.28);
          color: #fff;
        }
        @media (hover: hover) {
          .hh-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 14px 36px rgba(0,0,0,0.32); }
          .hh-btn-primary:hover::after { animation: bz-shine 750ms ease both; }
          .hh-btn-ghost:hover { background: rgba(255,255,255,0.2); transform: translateY(-3px); }
        }
        .hh-btn:active { transform: scale(0.97); }

        /* ── Trust row ────────────────────────────────────────────── */
        .hh-trust {
          display: flex; flex-wrap: wrap; gap: 18px;
          margin: 26px 0 0; padding: 0; list-style: none;
        }
        .hh-trust li {
          display: flex; align-items: center; gap: 7px;
          color: rgba(255,255,255,0.66);
          font-size: 12.5px; font-weight: 600;
        }
        .hh-tick {
          width: 16px; height: 16px; border-radius: 50%; flex-shrink: 0;
          background: rgba(74,222,128,0.2); color: #4ade80;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── Floating category cards ──────────────────────────────── */
        .hh-art { display: none; }
        @media (min-width: 900px) {
          .hh-art { display: block; position: relative; height: 300px; }
        }
        @media (min-width: 1024px) { .hh-art { height: 340px; } }

        /* Outer: position + the idle bob only */
        .hh-float {
          position: absolute;
          perspective: 500px;
          animation: hh-bob var(--dur) ease-in-out var(--delay) infinite,
                     bz-pop 500ms var(--spring) var(--delay) both;
        }
        /* Inner: all the chrome, and the hover transform */
        .hh-float-inner {
          display: flex; align-items: center; gap: 9px;
          padding: 11px 15px 11px 11px;
          border-radius: var(--r-md);
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.16);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.18);
          color: #fff; font-size: 13px; font-weight: 700;
          white-space: nowrap;
          cursor: default;
          transition: transform 320ms var(--spring),
                      background 260ms ease, border-color 260ms ease,
                      box-shadow 260ms ease;
        }
        @media (hover: hover) {
          /* Freeze the bob so the card doesn't drift out from under the cursor */
          .hh-float:hover { animation-play-state: paused; z-index: 4; }
          .hh-float:hover .hh-float-inner {
            transform: translateY(-7px) scale(1.1);
            background: rgba(255,255,255,0.24);
            border-color: rgba(253,186,116,0.6);
            box-shadow: 0 20px 48px rgba(0,0,0,0.34),
                        0 0 0 1px rgba(253,186,116,0.25),
                        0 0 30px rgba(249,115,22,0.35);
          }
          .hh-float:hover .hh-float-emoji {
            transform: rotate(-12deg) scale(1.2);
            background: rgba(253,186,116,0.3);
          }
        }
        /* The face flips over when its category swaps */
        .hh-float-face {
          display: inline-flex; align-items: center; gap: 9px;
          animation: hh-flip 520ms var(--spring) both;
          transform-origin: center;
        }
        @keyframes hh-flip {
          0%   { transform: rotateX(-88deg) scale(0.8); opacity: 0; }
          60%  { transform: rotateX(12deg)  scale(1.04); opacity: 1; }
          100% { transform: rotateX(0)      scale(1); }
        }
        .hh-float-emoji {
          width: 32px; height: 32px; border-radius: 10px;
          background: rgba(255,255,255,0.14);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; flex-shrink: 0;
          transition: transform 320ms var(--spring), background 260ms ease;
        }
        @keyframes hh-bob {
          0%,100% { transform: translateY(0) rotate(0deg); }
          50%     { transform: translateY(-14px) rotate(-1.5deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .hh-glow, .hh-float, .hh-h1 em::after, .hh-art-img,
          .hh-float-face, .hh-word { animation: none !important; }
          .hh-float-inner, .hh-float-emoji { transition: none !important; }
          .hh-float:hover .hh-float-inner,
          .hh-float:hover .hh-float-emoji { transform: none !important; }
          .hh-word { transform: none !important; opacity: 1 !important; }
          .hh-h1 em { color: #fdba74 !important; }
          .hh-h1 em .hh-word { animation: none !important; text-shadow: none !important; }
          .hh-h1 em::after { transform: scaleX(1) !important; }
          .hh-btn { transition: none !important; }
          .hh-btn-primary:hover, .hh-btn-ghost:hover, .hh-btn:active { transform: none !important; }
        }
      `}</style>

      <section className="hh">
        {/* Artwork sits furthest back, behind the grid and bloom, and is masked
            so its left edge dissolves into the gradient — the headline always
            lands on flat colour, never on busy pixels. */}
        {!artFailed && (
          <div className="hh-art-img" aria-hidden="true">
            <Image
              src="/images/hero-marketplace.png"
              alt=""
              fill
              priority
              sizes="(max-width: 899px) 100vw, 55vw"
              style={{ objectFit: "cover", objectPosition: "center right" }}
              onError={() => setArtFailed(true)}
            />
          </div>
        )}
        <div className="hh-grid" aria-hidden="true" />
        <div className="hh-glow" aria-hidden="true" />

        <div className="hh-wrap">
          <div className="hh-cols">
            {/* ── Copy column ── */}
            <div className="bz-stagger">
              <span className="hh-eyebrow">
                <span className="hh-pin" aria-hidden="true" />
                {locality ? `Live in ${locality}` : "Buy & sell in your neighbourhood"}
              </span>

              <h1 className="hh-h1">
                {/* Each word is its own span so it can rise on its own beat —
                    the line assembles itself rather than fading in as a block */}
                <span className="hh-line">
                  {"Everything you need,".split(" ").map((w, i) => (
                    <span className="hh-word" key={w + i} style={{ animationDelay: `${120 + i * 75}ms` }}>
                      {w}
                    </span>
                  ))}
                </span>
                <span className="hh-line">
                  <em>
                    {/* No inline animationDelay here — the accent words run two
                        animations (rise + glow) and the pairs are set in CSS via
                        nth-child. An inline delay would clobber the second one. */}
                    {"right down the road.".split(" ").map((w, i) => (
                      <span className="hh-word" key={w + i}>
                        {w}
                      </span>
                    ))}
                  </em>
                </span>
              </h1>

              <p className="hh-sub">
                Thousands of ads from people near you — phones, scooters, furniture,
                flats. No couriers, no commission. Just meet and deal.
              </p>

              <div className="hh-ctas">
                <GatedLink href="/sell" action="post an ad" className="hh-btn hh-btn-primary">
                  Post an ad — free
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </GatedLink>
                <Link href="/search" className="hh-btn hh-btn-ghost">
                  Browse listings
                </Link>
              </div>

              <ul className="hh-trust">
                {["Free to post", "Photo checks on every ad", "Meet locally"].map((t) => (
                  <li key={t}>
                    <span className="hh-tick" aria-hidden="true">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Drifting, rotating category cards ── */}
            <div className="hh-art" aria-hidden="true">
              {SLOTS.map((slot, i) => {
                const item = CATEGORY_POOL[slotItems[i]];
                return (
                  <span
                    key={i}
                    className="hh-float"
                    style={
                      {
                        top: slot.top,
                        left: slot.left,
                        "--delay": slot.delay,
                        "--dur": slot.dur,
                      } as React.CSSProperties
                    }
                  >
                    {/* Three transform layers, deliberately: .hh-float bobs,
                        .hh-float-inner handles hover, .hh-float-face flips on
                        change. They can't share an element — an animation's
                        transform always beats a hover rule's transform. */}
                    <span className="hh-float-inner">
                      <span className="hh-float-face" key={slotItems[i]}>
                        <span className="hh-float-emoji">{item.emoji}</span>
                        {item.label}
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}