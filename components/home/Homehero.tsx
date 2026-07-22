"use client";

/**
 * Homepage hero.
 *
 * Same visual language as the Contact page banner — a dark jewel-tone sweep, the
 * faint grid, the corner bloom, heavy tight type — so the two read as one brand
 * rather than two designers.
 *
 * Deliberately short, especially on phones: headline, two buttons, three trust
 * points. It used to also carry a locality chip and a paragraph of body copy.
 * Both were cut — the locality already appears in the header pill and again in
 * the feed's own "Listings near X" heading, and the paragraph said what the
 * buttons say. On a marketplace the hero's job is to get out of the way of the
 * listings, and every pixel it takes is a pixel of stock the user can't see.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { GatedLink } from "@/components/auth/GatedLink";
import { PROMO_SLIDES, PROMO_THEMES } from "@/lib/promoBanners";

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

  // ── Carousel ──────────────────────────────────────────────────
  // Slide 0 is the hero itself; slides 1..N are the promo slots that used to
  // live in a separate banner below. One track, auto-advancing, swipeable.
  const slideCount = PROMO_SLIDES.length + 1;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [artFailedPromo, setArtFailedPromo] = useState<Set<string>>(new Set());
  const rootRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const go = useCallback(
    (next: number) => setIndex(((next % slideCount) + slideCount) % slideCount),
    [slideCount]
  );

  // Auto-advance, pauses on hover/focus and when off-screen.
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slideCount), 6000);
    return () => clearInterval(t);
  }, [paused, slideCount]);

  // Pause while the hero is scrolled out of view.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPaused((p) => (e.isIntersecting ? false : p)), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <style>{`
        .hh {
          position: relative;
          overflow: hidden;
          border-radius: 0 0 24px 24px;
        }
        @media (min-width: 640px)  { .hh { border-radius: 0 0 32px 32px; } }

        /* Carousel track — slides sit side by side, the track slides left/right. */
        .hh-track {
          display: flex;
          transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1);
          will-change: transform;
        }
        .hh-slide {
          flex: 0 0 100%;
          min-width: 100%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #2a0a2e 0%, #5b1a5e 45%, #9333a8 100%);
          /* Mobile is deliberately tight: headline + buttons and nothing else. */
          padding: 22px 0 40px;
          text-decoration: none;
          display: flex;
          align-items: center;
        }
        @media (min-width: 640px)  { .hh-slide { padding: 22px 0 32px; } }
        @media (min-width: 1024px) { .hh-slide { padding: 28px 0 40px; } }

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
          background: radial-gradient(circle, rgba(192,84,224,0.5) 0%, transparent 70%);
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
          width: 100%;
          max-width: var(--page-max);
          margin: 0 auto;
          padding: 0 16px;
        }
        @media (min-width: 640px) { .hh-wrap { padding: 0 24px; } }

        /* ── Promo slides — typography + buttons inherit the hero's own classes
           (.hh-h1, .hh-sub, .hh-btn) so they match the first slide EXACTLY. Only
           the promo-specific bits live here. ── */
        .hh-promo-motif {
          position: absolute; right: 4%; top: 50%; transform: translateY(-50%);
          font-size: 160px; line-height: 1; opacity: 0.12; pointer-events: none;
          filter: drop-shadow(0 8px 24px rgba(0,0,0,0.3));
          animation: hh-motif-bob 6s ease-in-out infinite;
        }
        @media (max-width: 640px) { .hh-promo-motif { font-size: 110px; right: -2%; opacity: 0.1; } }
        @keyframes hh-motif-bob { 0%,100%{ transform: translateY(-50%) rotate(0); } 50%{ transform: translateY(-58%) rotate(-4deg); } }
        .hh-promo-copy { max-width: 92%; }
        @media (min-width: 640px)  { .hh-promo-copy { max-width: 70%; } }
        @media (min-width: 1024px) { .hh-promo-copy { max-width: 62%; } }
        /* Kicker matches the eyebrow weight/tracking of the hero's small labels */
        .hh-promo-kicker {
          display: inline-block; font-size: 11px; font-weight: 800;
          letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px;
        }
        @media (min-width: 640px) { .hh-promo-kicker { font-size: 12.5px; } }
        /* Title reuses .hh-h1 sizing verbatim; just neutralise the em-only accent bits */
        .hh-promo-title em { color: inherit; }
        .hh-promo-title::after { content: none; }
        /* Trust row only earns its space on bigger screens */
        .hh-promo-trust { display: none; }
        @media (min-width: 640px) {
          .hh-promo-trust {
            display: flex; gap: 18px; margin-top: 22px; flex-wrap: wrap;
            list-style: none; padding: 0;
          }
          .hh-promo-trust li {
            display: inline-flex; align-items: center; gap: 6px;
            color: rgba(255,255,255,0.72); font-size: 12.5px; font-weight: 600;
            letter-spacing: -0.015em;
          }
        }

        /* ── Auto-advance progress line ── */
        .hh-progress {
          position: absolute; left: 0; right: 0; bottom: 0; height: 3px; z-index: 6;
          background: rgba(255,255,255,0.14);
        }
        .hh-progress-fill {
          display: block; height: 100%; width: 0;
          background: rgba(255,255,255,0.85);
          border-radius: 0 3px 3px 0;
          box-shadow: 0 0 10px rgba(255,255,255,0.5);
          animation: hh-progress 6s linear forwards;
        }
        @keyframes hh-progress { from { width: 0; } to { width: 100%; } }

        /* ── Carousel controls ── */
        .hh-arrow {
          position: absolute; top: 50%; transform: translateY(-50%); z-index: 6;
          width: 40px; height: 40px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.28);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          color: #fff; cursor: pointer;
          transition: background 180ms ease, transform 180ms ease;
          opacity: 0; pointer-events: none;
        }
        @media (min-width: 900px) {
          .hh:hover .hh-arrow { opacity: 1; pointer-events: auto; }
          .hh-arrow-prev { left: 14px; }
          .hh-arrow-next { right: 14px; }
          .hh-arrow:hover { background: rgba(255,255,255,0.26); transform: translateY(-50%) scale(1.08); }
        }
        .hh-dots {
          position: absolute; bottom: 12px; left: 0; right: 0; z-index: 6;
          display: flex; justify-content: center; gap: 7px;
        }
        @media (min-width: 640px) { .hh-dots { bottom: 16px; } }
        .hh-dot {
          width: 7px; height: 7px; border-radius: 999px; border: none; cursor: pointer;
          background: rgba(255,255,255,0.4);
          transition: width 260ms var(--spring), background 200ms ease;
        }
        .hh-dot.is-active { width: 22px; background: #fff; }
        .hh-dot:hover { background: rgba(255,255,255,0.7); }

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
        .hh-h1 {
          color: #fff; margin: 0 0 14px;
          font-size: 27px; font-weight: 900;
          letter-spacing: -0.045em; line-height: 1.05;
        }
        @media (min-width: 400px)  { .hh-h1 { font-size: 30px; } }
        @media (min-width: 640px)  { .hh-h1 { font-size: 48px; margin-bottom: 20px; } }
        @media (min-width: 1024px) { .hh-h1 { font-size: 62px; } }
        .hh-h1 em { font-style: normal; color: #e9b8f5; position: relative; }
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
        .hh-h1 em { color: #e9b8f5; }
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
          80%           { text-shadow: 0 0 26px rgba(243,222,250,0.9); }
        }
        .hh-h1 em::after {
          content: ''; position: absolute; left: 0; right: 0; bottom: 2px;
          height: 5px; border-radius: 4px;
          background: rgba(233,184,245,0.38);
          transform-origin: left;
          animation: hh-underline 700ms var(--ease) 620ms both;
        }
        @keyframes hh-underline { from { transform: scaleX(0); } to { transform: scaleX(1); } }

        /* ── Subtitle ─────────────────────────────────────────────
           Hidden on phones. There the hero is headline + buttons and nothing
           else — the line was costing ~60px of vertical space, which on a
           marketplace is a row of stock the user never sees. From 640px up
           there's room to spare and it earns its place, so it comes back:
           tighter than before (one sentence, not three), and it arrives
           between the headline and the buttons in the stagger. */
        .hh-sub { display: none; }
        @media (min-width: 640px) {
          .hh-sub {
            display: block;
            color: rgba(255,255,255,0.7);
            font-size: 15px; font-weight: 500; line-height: 1.5;
            letter-spacing: -0.015em;
            margin: -6px 0 20px; max-width: 44ch;
            animation: bz-rise 460ms var(--ease) 470ms both;
          }
        }
        @media (min-width: 1024px) { .hh-sub { font-size: 16.5px; max-width: 48ch; margin: -2px 0 24px; } }

        /* ── CTAs ─────────────────────────────────────────────────── */
        /* One row on phones. flex:1 1 0 makes the two buttons split the
           available width evenly instead of sizing to their text and wrapping.
           From 640px up they go back to hugging their labels. */
        .hh-ctas { display: flex; flex-wrap: nowrap; gap: 8px; }
        @media (min-width: 640px) { .hh-ctas { flex-wrap: wrap; gap: 10px; } }
        /* They arrive after the headline has finished assembling */
        .hh-ctas > * { animation: bz-rise 480ms var(--spring) both; }
        .hh-ctas > *:nth-child(1) { animation-delay: 540ms; }
        .hh-ctas > *:nth-child(2) { animation-delay: 620ms; }
        .hh-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          flex: 1 1 0; min-width: 0;
          padding: 12px 12px; border-radius: var(--r-pill);
          font-size: 13px; font-weight: 800; letter-spacing: -0.025em;
          white-space: nowrap;
          text-decoration: none; cursor: pointer;
          transition: transform 240ms var(--spring), box-shadow 240ms ease, background 200ms ease;
        }
        @media (min-width: 640px) {
          .hh-btn {
            flex: 0 0 auto; gap: 8px;
            padding: 13px 22px; font-size: 14.5px; letter-spacing: -0.02em;
          }
        }
        /* On the narrowest phones the qualifier goes; the button still reads. */
        @media (max-width: 359px) { .hh-btn-free { display: none; } }
        .hh-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
        .hh-btn-primary {
          position: relative; overflow: hidden;
          background: #fff; color: #7e22ce;
          /* A slow halo, so the primary action keeps a pulse of its own once the
             entrance animations have all settled */
          animation: bz-rise 480ms var(--spring) 540ms both,
                     hh-cta-halo 3.6s ease-out 2.4s infinite;
        }
        @keyframes hh-cta-halo {
          0%,100% { box-shadow: 0 8px 26px rgba(0,0,0,0.24), 0 0 0 0 rgba(255,255,255,0.4); }
          50%     { box-shadow: 0 8px 26px rgba(0,0,0,0.24), 0 0 0 12px rgba(255,255,255,0); }
        }
        .hh-btn-primary:hover { animation-play-state: paused; }
        /* The arrow leads the eye rightward on hover */
        .hh-btn-primary svg { transition: transform 300ms var(--spring); }
        .hh-btn-primary:hover svg { transform: translateX(4px); }
        .hh-btn-primary::after {
          content: ''; position: absolute; top: 0; bottom: 0; left: -60%; width: 45%;
          background: linear-gradient(90deg, transparent, rgba(147,51,168,0.18), transparent);
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
        /* One row on phones too. Three items at 10px with short labels come to
           roughly 250px — comfortable even on a 320px screen. */
        .hh-trust {
          display: flex; flex-wrap: nowrap; gap: 9px;
          margin: 14px 0 0; padding: 0; list-style: none;
        }
        @media (min-width: 640px) { .hh-trust { flex-wrap: wrap; gap: 18px; margin-top: 26px; } }
        .hh-trust li {
          display: flex; align-items: center; gap: 5px;
          color: rgba(255,255,255,0.62);
          font-size: 10px; font-weight: 700; letter-spacing: -0.02em;
          white-space: nowrap;
          animation: bz-rise 460ms var(--ease) both;
        }
        @media (min-width: 640px) { .hh-trust li { font-size: 12.5px; gap: 7px; letter-spacing: -0.015em; } }

        /* Short label on phones, full label from 640px. Swapped in CSS rather
           than with a JS breakpoint — a useMediaQuery here would render one
           string on the server and the other on the client, which is a
           hydration mismatch for no gain. */
        .hh-trust-long { display: none; }
        @media (min-width: 640px) {
          .hh-trust-short { display: none; }
          .hh-trust-long  { display: inline; }
        }
        .hh-trust li:nth-child(1) { animation-delay: 700ms; }
        .hh-trust li:nth-child(2) { animation-delay: 780ms; }
        .hh-trust li:nth-child(3) { animation-delay: 860ms; }
        .hh-tick {
          width: 13px; height: 13px; border-radius: 50%; flex-shrink: 0;
          background: rgba(74,222,128,0.2); color: #4ade80;
          display: flex; align-items: center; justify-content: center;
        }
        @media (min-width: 640px) { .hh-tick { width: 16px; height: 16px; } }

        /* ── Floating category cards ──────────────────────────────── */
        .hh-art { display: none; }
        @media (min-width: 900px) {
          .hh-art { display: block; position: relative; height: 268px; }
        }
        @media (min-width: 1024px) { .hh-art { height: 310px; } }

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
            border-color: rgba(233,184,245,0.6);
            box-shadow: 0 20px 48px rgba(0,0,0,0.34),
                        0 0 0 1px rgba(233,184,245,0.25),
                        0 0 30px rgba(147,51,168,0.4);
          }
          .hh-float:hover .hh-float-emoji {
            transform: rotate(-12deg) scale(1.2);
            background: rgba(233,184,245,0.3);
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
          .hh-track { transition: none !important; }
          .hh-progress-fill, .hh-promo-motif, .hh-promo-cta, .hh-promo-cta svg, .hh-arrow, .hh-dot { animation: none !important; transition: none !important; }
          .hh-progress-fill { width: 100% !important; }
          .hh-glow, .hh-float, .hh-h1 em::after, .hh-art-img,
          .hh-float-face, .hh-word { animation: none !important; }
          .hh-float-inner, .hh-float-emoji { transition: none !important; }
          .hh-float:hover .hh-float-inner,
          .hh-float:hover .hh-float-emoji { transform: none !important; }
          .hh-word { transform: none !important; opacity: 1 !important; }
          .hh-h1 em { color: #e9b8f5 !important; }
          .hh-h1 em .hh-word { animation: none !important; text-shadow: none !important; }
          .hh-h1 em::after { transform: scaleX(1) !important; }
          .hh-btn, .hh-btn-primary svg { transition: none !important; }
          .hh-btn-primary, .hh-ctas > *, .hh-trust li, .hh-sub { animation: none !important; opacity: 1 !important; transform: none !important; }
          .hh-btn-primary:hover, .hh-btn-ghost:hover, .hh-btn:active,
          .hh-btn-primary:hover svg { transform: none !important; }
        }
      `}</style>

      <section className="hh" ref={rootRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 45) go(dx < 0 ? index + 1 : index - 1);
          touchX.current = null;
        }}
        aria-roledescription="carousel"
      >
        <div className="hh-track" style={{ transform: `translateX(-${index * 100}%)` }}>

        {/* ══ SLIDE 0 — the hero ══ */}
        <div className="hh-slide" aria-hidden={index !== 0}>
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

              {/* CSS-hidden below 640px rather than conditionally rendered — a
                  JS breakpoint check would mismatch between server and client
                  and cost a hydration error for no benefit. */}
              <p className="hh-sub">
                Thousands of ads from people near you. No couriers, no
                commission — just meet and deal.
              </p>

              <div className="hh-ctas">
                <GatedLink href="/sell" action="post an ad" className="hh-btn hh-btn-primary">
                  Post an ad<span className="hh-btn-free">&nbsp;— free</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </GatedLink>
                <Link href="/search" className="hh-btn hh-btn-ghost">
                  Browse listings
                </Link>
              </div>

              <ul className="hh-trust">
                {[
                  { short: "Free to post", long: "Free to post" },
                  { short: "Photo checks", long: "Photo checks on every ad" },
                  { short: "Meet locally", long: "Meet locally" },
                ].map((t) => (
                  <li key={t.long}>
                    <span className="hh-tick" aria-hidden="true">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    <span className="hh-trust-short">{t.short}</span>
                    <span className="hh-trust-long">{t.long}</span>
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
        </div>{/* /slide 0 */}

        {/* ══ PROMO SLIDES 1..N ══ */}
        {PROMO_SLIDES.map((slide, i) => {
          const theme = PROMO_THEMES[slide.theme];
          const failed = artFailedPromo.has(slide.id);
          const active = index === i + 1;
          return (
            <div
              key={slide.id}
              className="hh-slide hh-promo"
              aria-hidden={!active}
              style={{ background: theme.bg }}
            >
              {slide.image && !failed && (
                <div className="hh-art-img" aria-hidden="true">
                  <Image
                    src={slide.image}
                    alt=""
                    fill
                    sizes="(max-width: 899px) 100vw, 55vw"
                    style={{ objectFit: "cover", objectPosition: "center right" }}
                    onError={() => setArtFailedPromo((prev) => new Set(prev).add(slide.id))}
                  />
                </div>
              )}
              <div className="hh-grid" aria-hidden="true" />
              <div className="hh-glow" aria-hidden="true" style={{ background: `radial-gradient(circle, ${theme.glow} 0%, transparent 70%)` }} />
              <span className="hh-promo-motif" aria-hidden="true">{slide.motif}</span>

              <div className="hh-wrap">
                <div className="hh-promo-copy">
                  <span className="hh-promo-kicker" style={{ color: theme.accent }}>{slide.motif} {slide.kicker}</span>
                  <h2 className="hh-h1 hh-promo-title">{slide.title}</h2>
                  <p className="hh-sub hh-promo-sub">{slide.subtitle}</p>
                  <div className="hh-ctas">
                    <Link href={slide.href} className="hh-btn hh-btn-primary" tabIndex={active ? 0 : -1} style={{ color: theme.deep }}>
                      {slide.cta}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </Link>
                  </div>
                  <ul className="hh-trust hh-promo-trust">
                    <li>✓ 100% free to list</li>
                    <li>✓ Verified sellers</li>
                    <li>✓ Deals near you</li>
                  </ul>
                </div>
              </div>
            </div>
          );
        })}

        </div>{/* /track */}

        {/* ── Auto-advance progress line ── */}
        <div className="hh-progress" aria-hidden="true">
          <span
            key={index}
            className="hh-progress-fill"
            style={{ animationPlayState: paused ? "paused" : "running" }}
          />
        </div>

        {/* ── Carousel controls ── */}
        <button type="button" className="hh-arrow hh-arrow-prev" onClick={() => go(index - 1)} aria-label="Previous slide">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <button type="button" className="hh-arrow hh-arrow-next" onClick={() => go(index + 1)} aria-label="Next slide">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
        <div className="hh-dots" role="tablist" aria-label="Choose slide">
          {Array.from({ length: slideCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={index === i}
              aria-label={`Slide ${i + 1}`}
              className={`hh-dot ${index === i ? "is-active" : ""}`}
              onClick={() => go(i)}
            />
          ))}
        </div>
      </section>
    </>
  );
}