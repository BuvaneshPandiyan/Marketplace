"use client";
/**
 * LAYOUT PADDING:
 * Desktop:  padding-top ~78px (pill ~56px + 12px float + buffer)
 * Mobile:   padding-top 0, padding-bottom calc(80px + env(safe-area-inset-bottom))
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";
import { GatedLink } from "@/components/auth/GatedLink";
import { LocationModal } from "@/components/location/LocationModal";
import Image from "next/image";
import { LocationPill } from "@/components/location/LocationPill";
import { SearchBar } from "@/components/search/SearchBar";
import { ChatsPopover } from "@/components/chat/ChatsPopover";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import { createClient } from "@/lib/supabase/client";

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

const PILL: React.CSSProperties = {
  background: "rgba(255,255,255,0.94)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(0,0,0,0.07)",
  borderRadius: 100,
};

// Simple icon button

// Tooltip wrapper — dark pill fading in below icon on hover/focus
function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {children}
      {show && (
        <div aria-hidden="true" style={{
          position: "absolute", top: "calc(100% + 6px)", left: "50%",
          transform: "translateX(-50%)",
          background: "#1c1917", color: "white",
          fontSize: 11, fontWeight: 700, letterSpacing: "-0.015em",
          padding: "5px 11px",
          borderRadius: 100, whiteSpace: "nowrap",
          boxShadow: "0 4px 14px rgba(124,32,0,0.22)",
          pointerEvents: "none", zIndex: 300,
          animation: "tip-in 120ms ease both",
        }}>{label}</div>
      )}
    </div>
  );
}

export function Header() {
  const { user, profile, isLoading } = useUser();
  // LocationModal owns detection and setting now — Header only needs to know
  // whether a location exists (for the pin's active state) and what to show.
  const { needsSetup } = useActiveLocation();
  const router = useRouter();
  const supabase = useRef(createClient());

  // ── state ──────────────────────────────────────────────────────────
  const [locSheetOpen, setLocSheetOpen]       = useState(false);
  // Optional drawer header artwork — falls back to the plain gradient if absent.
  const [drawerArtFailed, setDrawerArtFailed] = useState(false);
  const [scrolled, setScrolled]               = useState(false);
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [logoutConfirm, setLogoutConfirm]     = useState(false);
  const [isSigningOut, setIsSigningOut]       = useState(false);
  const [searchExpanded, setSearchExpanded]   = useState(false);
  const [navMobileVisible, setNavMobileVisible] = useState(true);
  const [wishlistPop, setWishlistPop]         = useState(false);
  const [mounted, setMounted]                 = useState(false);
  // ── no navVisible/navCollapsed (collapse removed) ─────────────────
  // ── no mlDropOpen/mlDropRef (dropdown removed) ────────────────────

  const pathname = usePathname();
  const isWishlistActive  = pathname === "/wishlist";
  const isMyListingsActive= pathname === "/my-listings";
  const isHomeActive       = pathname === "/";

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    setDrawerOpen(false); setLocSheetOpen(false);
    setSearchExpanded(false); setLogoutConfirm(false); setNavMobileVisible(true);
  }, [pathname]);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else            document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  async function handleLogout() {
    setIsSigningOut(true);
    await supabase.current.auth.signOut();
    setLogoutConfirm(false); setDrawerOpen(false);
    router.push("/"); router.refresh();
    setIsSigningOut(false);
  }

  // Only ever fires when logged in — GatedLink intercepts logged-out clicks and
  // opens the sign-in popup instead of silently redirecting to /login.
  function handleWishlistClick() {
    setWishlistPop(true);
    setTimeout(() => setWishlistPop(false), 400);
  }

  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Mobile drawer links ────────────────────────────────────────────
  const drawerLinks: { href: string; label: string; action?: string; icon: React.ReactNode }[] = [
    { href: "/",            label: "Home",       icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { href: "/my-listings", label: "My Listings", action: "manage your listings", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { href: "/wishlist",    label: "Wishlist",   action: "save items to your wishlist", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    { href: "/contact",     label: "Contact Us", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.6 1.32h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> },
  ];

  return (
    <>
      <style>{`
        @keyframes heart-pop  { 0%{transform:scale(1)} 40%{transform:scale(1.35)} 70%{transform:scale(0.9)} 100%{transform:scale(1)} }
        @keyframes drawer-up  { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes fade-in    { from{opacity:0} to{opacity:1} }
        @keyframes tip-in     { from{opacity:0;transform:translateX(-50%) translateY(-4px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes nav-restore-pulse {
          0%,100% { box-shadow:0 0 0 0 rgba(234,88,12,0.5),0 4px 18px rgba(234,88,12,0.4); }
          50%     { box-shadow:0 0 0 10px rgba(234,88,12,0),0 4px 18px rgba(234,88,12,0.4); }
        }
        @keyframes loc-success-in {
          0%   { opacity:0; transform:scale(0.92) translateY(-4px); }
          60%  { opacity:1; transform:scale(1.02) translateY(1px); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes loc-dot-pulse {
          0%,100% { transform:scale(1); opacity:1; }
          50%     { transform:scale(1.6); opacity:0.5; }
        }

        .hdr-icon { width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:none; background:transparent; cursor:pointer; color:#6b7280; transition:background 150ms ease,color 150ms ease,transform 180ms cubic-bezier(0.34,1.56,0.64,1); flex-shrink:0; }
        .hdr-icon:hover  { background:rgba(234,88,12,0.09); color:#ea580c; transform:scale(1.08); }
        .hdr-icon:active { transform:scale(0.88); }
        .hdr-icon.active { color:#ea580c; background:rgba(234,88,12,0.1); }

          /* ── Mobile icon overrides — smaller so all items fit comfortably ── */
        @media(max-width:639px){
          /* Everything up a step. The bar was 32px targets with 15px glyphs at
             stroke 2 — under Apple's 44px minimum and visually thin against a
             heavy brand. 40px targets, 20px glyphs, stroke 2.4. */
          .mob-pill .hdr-icon { width:40px; height:40px; }
          .mob-pill .hdr-icon svg { width:20px; height:20px; stroke-width:2.4; }
          .mob-pill .sell-fab  { width:48px; height:48px; }
          .mob-pill .sell-fab svg { width:22px; height:22px; stroke-width:2.8; }
          .mob-pill .collapse-btn { width:26px; height:26px; }
          /* ChatsPopover and NotificationBell own their own 44px button — pull
             them in line with the rest of the row */
          .mob-pill .chatpop-btn, .mob-pill .bell-btn { width:40px !important; height:40px !important; }
          .mob-pill .chatpop-btn svg, .mob-pill .bell-btn svg { width:20px; height:20px; }
        }

        /* ── Nav-icon entrance: each icon bounces in with a stagger ── */
        @keyframes icon-bounce-in {
          0%   { opacity:0; transform:translateY(8px) scale(0.8); }
          60%  { opacity:1; transform:translateY(-3px) scale(1.05); }
          80%  { transform:translateY(1px) scale(0.97); }
          100% { opacity:1; transform:translateY(0) scale(1); }
        }
        .mob-pill .nav-item { animation: icon-bounce-in 420ms cubic-bezier(0.34,1.56,0.64,1) both; }
        .mob-pill .nav-item:nth-child(1) { animation-delay: 0ms; }
        .mob-pill .nav-item:nth-child(2) { animation-delay: 50ms; }
        .mob-pill .nav-item:nth-child(3) { animation-delay: 100ms; }
        .mob-pill .nav-item:nth-child(4) { animation-delay: 140ms; }
        .mob-pill .nav-item:nth-child(5) { animation-delay: 180ms; }
        .mob-pill .nav-item:nth-child(6) { animation-delay: 210ms; }

        /* ── Active icon glow ring ── */
        .hdr-icon.active::after {
          content:'';
          position:absolute; inset:-3px;
          border-radius:50%;
          border:1.5px solid rgba(234,88,12,0.35);
          animation: icon-glow 2s ease infinite;
          pointer-events:none;
        }
        @keyframes icon-glow {
          0%,100% { opacity:0.6; transform:scale(1); }
          50%     { opacity:0.2; transform:scale(1.15); }
        }

        /* ── Tap press spring ── */
        .mob-pill .hdr-icon:active { transform:scale(0.82); transition-duration:80ms; }
        .mob-pill .sell-fab:active  { transform:scale(0.88); }

        /* Desktop sell = labelled gradient pill.
           It was a bare 44px "+" circle, which reads as "add" — could be anything.
           OLX and Zomato both put a word on their primary action for a reason;
           the label is what makes it unmissable. */
        .sell-circle {
          height:44px; padding:0 20px 0 15px; border-radius:100px;
          display:flex; align-items:center; justify-content:center; gap:6px;
          background:linear-gradient(135deg,#ea580c,#f97316);
          color:#fff; font-size:14px; font-weight:900; letter-spacing:-0.03em;
          box-shadow:0 3px 12px rgba(234,88,12,0.4);
          border:none; cursor:pointer; text-decoration:none; flex-shrink:0;
          white-space:nowrap;
          transition:transform 260ms cubic-bezier(0.34,1.56,0.64,1),box-shadow 260ms ease;
        }
        /* Below 1100px the pill would squeeze the search bar — drop the label */
        @media (max-width: 1099px) {
          .sell-circle { width:44px; padding:0; gap:0; }
          .sell-circle-label { display:none; }
        }
        .sell-circle:hover  { transform:scale(1.12); box-shadow:0 5px 20px rgba(234,88,12,0.55); }
        .sell-circle:active { transform:scale(0.9); }

        /* Mobile sell FAB stays bigger */
        .sell-fab { width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#ea580c,#f97316); box-shadow:0 4px 18px rgba(234,88,12,0.45); border:none; cursor:pointer; text-decoration:none; flex-shrink:0; transition:transform 280ms cubic-bezier(0.34,1.56,0.64,1),box-shadow 280ms ease; }
        .sell-fab:hover  { transform:scale(1.1); box-shadow:0 6px 28px rgba(234,88,12,0.55); }
        .sell-fab:active { transform:scale(0.9); }

        .sell-btn { position:relative; overflow:hidden; transition:transform 300ms cubic-bezier(0.34,1.56,0.64,1),box-shadow 300ms ease; }
        .sell-btn:hover  { transform:scale(1.06); box-shadow:0 6px 24px rgba(234,88,12,0.5); }
        .sell-btn:active { transform:scale(0.94); }

        .heart-pop { animation:heart-pop 0.35s cubic-bezier(0.34,1.56,0.64,1); }

        @media(prefers-reduced-motion:reduce){
          .hdr-icon,.sell-fab,.sell-btn,.sell-circle,.heart-pop { animation:none!important; transition-duration:0ms!important; }
          .hdr-icon:hover,.sell-circle:hover { transform:none!important; }
          .tip-in { animation:none!important; }
        }

        /* ══════════════════════════════════════════════════════════
           NAV MOTION LAYER
           Additive — everything above still applies. Kept to transform,
           opacity and box-shadow only, so the pill composites on the GPU
           and scrolling never jitters.
           ══════════════════════════════════════════════════════════ */

        /* ── Sell button: a slow ambient shine, faster on hover ──── */
        .sell-circle, .sell-fab { position: relative; overflow: hidden; }
        .sell-circle::after, .sell-fab::after {
          content: ''; position: absolute; top: -50%; bottom: -50%; left: -70%;
          width: 55%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent);
          transform: translateX(-140%) skewX(-20deg);
          animation: sell-shine 4.5s ease-in-out 1.5s infinite;
          pointer-events: none;
        }
        @keyframes sell-shine {
          0%      { transform: translateX(-140%) skewX(-20deg); }
          22%,100%{ transform: translateX(320%)  skewX(-20deg); }
        }
        /* A soft halo that breathes — makes Sell the obvious primary action */
        @keyframes sell-halo {
          0%,100% { box-shadow: 0 3px 12px rgba(234,88,12,0.4), 0 0 0 0 rgba(234,88,12,0.35); }
          50%     { box-shadow: 0 3px 12px rgba(234,88,12,0.4), 0 0 0 9px rgba(234,88,12,0); }
        }
        .sell-circle { animation: sell-halo 3.4s ease-out 2s infinite; }
        .sell-fab    { animation: sell-halo 3.4s ease-out 2s infinite; }
        .sell-circle:hover, .sell-fab:hover { animation-play-state: paused; }
        /* The + rotates a quarter turn on hover */
        .sell-circle svg, .sell-fab svg { transition: transform 320ms cubic-bezier(0.34,1.56,0.64,1); }
        .sell-circle:hover svg, .sell-fab:hover svg { transform: rotate(90deg); }

        /* ── Icons: springier hover, ripple on press ──────────────── */
        .hdr-icon { position: relative; overflow: hidden; }
        .hdr-icon::before {
          content: ''; position: absolute; inset: 0; border-radius: 50%;
          background: radial-gradient(circle, rgba(234,88,12,0.28) 0%, transparent 60%);
          transform: scale(0); opacity: 0;
          pointer-events: none;
        }
        .hdr-icon:active::before { animation: icon-ripple 480ms ease-out; }
        @keyframes icon-ripple {
          0%   { transform: scale(0);   opacity: 0.9; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @media (hover: hover) {
          .hdr-icon:hover svg { transform: scale(1.12); }
        }
        .hdr-icon svg { transition: transform 280ms cubic-bezier(0.34,1.56,0.64,1); }

        /* ── Active tab: a dot that pops in underneath ────────────── */
        .hdr-icon.active::after {
          content: ''; position: absolute; bottom: 5px; left: 50%;
          width: 4px; height: 4px; border-radius: 50%;
          background: #ea580c;
          transform: translateX(-50%);
          animation: nav-dot-in 380ms cubic-bezier(0.34,1.56,0.64,1) both;
        }
        @keyframes nav-dot-in {
          from { transform: translateX(-50%) scale(0) translateY(6px); }
          to   { transform: translateX(-50%) scale(1) translateY(0); }
        }

        /* ── The pill itself reacts to scroll ─────────────────────── */
        .hdr-pill {
          transition: transform 380ms cubic-bezier(0.22,1,0.36,1),
                      background 300ms ease, box-shadow 300ms ease,
                      border-color 300ms ease;
        }
        /* Tightens very slightly once you leave the top — reads as "docked" */
        .hdr-pill[data-scrolled="true"] { transform: scale(0.975); }

        /* ── Mobile pill: active item lifts and glows ─────────────── */
        .mob-pill .hdr-icon.active {
          transform: translateY(-3px);
        }
        .mob-pill .hdr-icon { transition: transform 320ms cubic-bezier(0.34,1.56,0.64,1); }
        .mob-pill .hdr-icon.active::after { bottom: 1px; }

        @media (prefers-reduced-motion: reduce) {
          .sell-circle::after, .sell-fab::after,
          .sell-circle, .sell-fab { animation: none !important; }
          .sell-circle:hover svg, .sell-fab:hover svg { transform: none !important; }
          .hdr-icon::before, .hdr-icon.active::after { animation: none !important; }
          .hdr-icon svg, .hdr-pill, .mob-pill .hdr-icon { transition: none !important; }
          .hdr-pill[data-scrolled="true"], .mob-pill .hdr-icon.active { transform: none !important; }
        }

        /* ══════════════════════════════════════════════════════════
           NAV STYLING LAYER 2
           ══════════════════════════════════════════════════════════ */

        /* A faint warm gradient hairline around the pill — catches the eye
           without adding a hard border. Uses a mask so only the 1px edge paints. */
        .hdr-pill::before, .mob-pill::before {
          content: '';
          position: absolute; inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(120deg,
            rgba(234,88,12,0.5) 0%,
            rgba(249,115,22,0.12) 30%,
            rgba(234,88,12,0.06) 50%,
            rgba(249,115,22,0.12) 70%,
            rgba(234,88,12,0.5) 100%);
          background-size: 220% 100%;
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          pointer-events: none;
          animation: pill-edge 9s linear infinite;
        }
        @keyframes pill-edge {
          to { background-position: 220% 0; }
        }

        /* Icons get a soft tinted bed on hover rather than a flat grey */
        @media (hover: hover) {
          .hdr-icon:hover {
            background: radial-gradient(circle at 50% 55%, rgba(234,88,12,0.14), rgba(234,88,12,0.05)) !important;
          }
        }

        /* The active icon sits on a permanent warm bed */
        .hdr-icon.active {
          background: radial-gradient(circle at 50% 55%, rgba(234,88,12,0.16), rgba(234,88,12,0.06)) !important;
        }

        /* Logo: the full stop gets a slow heartbeat. It's a text node, so this
           animates scale only — box-shadow on a glyph looks wrong. */
        .hdr-logo-dot {
          display: inline-block;
          transform-origin: center 78%;
          animation: logo-beat 3.4s ease-in-out infinite;
        }
        @keyframes logo-beat {
          0%,100% { transform: scale(1);   }
          50%     { transform: scale(1.55); }
        }

        /* ── Mobile pill: floats a touch, and lifts as you scroll ── */
        .mob-pill {
          position: relative;
          transition: transform 380ms cubic-bezier(0.22,1,0.36,1), box-shadow 300ms ease;
        }
        /* Warm underglow so the pill reads as floating. Done with box-shadow
           rather than a z-index:-1 pseudo — the pill's backdrop-filter creates a
           stacking context, so a negative-z child would hide behind its own
           background. */
        .mob-pill { animation: mob-underglow 4.2s ease-in-out infinite; }
        @keyframes mob-underglow {
          0%,100% { box-shadow: 0 8px 30px rgba(0,0,0,0.13), 0 4px 18px rgba(234,88,12,0.16); }
          50%     { box-shadow: 0 8px 30px rgba(0,0,0,0.13), 0 7px 26px rgba(234,88,12,0.34); }
        }

        @media (prefers-reduced-motion: reduce) {
          .hdr-pill::before, .mob-pill::before,
          .hdr-logo-dot, .mob-pill { animation: none !important; }
          .mob-pill { transition: none !important; }
        }

        /* ══════════════════════════════════════════════════════════
           NAV COLOUR + TYPE
           ══════════════════════════════════════════════════════════ */

        .hdr-logo {
          text-decoration: none;
          font-size: 20px; font-weight: 900;
          letter-spacing: -0.05em;
          color: #1a1a1a;
          display: inline-flex; align-items: baseline;
          transition: transform 260ms cubic-bezier(0.34,1.56,0.64,1);
        }
        @media (hover: hover) { .hdr-logo:hover { transform: scale(1.04); } }
        .hdr-logo:active { transform: scale(0.96); }
        /* ".in" carries the brand colour — the old grey 400-weight "in" read as
           an afterthought rather than part of the name. */
        .hdr-logo-in { color: #ea580c; font-weight: 900; }
        .hdr-logo-dot { color: #ea580c; }

        /* Pill: pure white once scrolled, with a warmer shadow than plain black.
           A neutral drop shadow under a warm palette reads as dirty. */
        .hdr-pill[data-scrolled="true"] {
          box-shadow: 0 10px 34px rgba(124,32,0,0.13), 0 2px 8px rgba(124,32,0,0.07) !important;
        }

        /* Icons: warm grey at rest, brand on hover. Cool #374151 against orange
           was the main reason the bar felt like a different product. */
        .hdr-icon { color: #57534e; }
        @media (hover: hover) { .hdr-icon:hover { color: #ea580c; } }
        .hdr-icon.active { color: #ea580c; }

        .sell-circle svg, .sell-fab svg { stroke: #fff; }

        @media (prefers-reduced-motion: reduce) {
          .hdr-logo { transition: none !important; }
          .hdr-logo:hover, .hdr-logo:active { transform: none !important; }
        }

        /* ── Mobile pill ──────────────────────────────────────────
           Same warm treatment as desktop, so the two don't read as two
           different apps at the 640px boundary. */
        .mob-pill .hdr-icon { color: #57534e; }
        .mob-pill .hdr-icon.active { color: #ea580c; }

        /* The Sell FAB gets a white ring so it reads as lifted off the pill
           rather than pasted onto it */
        .sell-fab {
          border: 3px solid #fff !important;
          box-sizing: border-box;
        }


        /* Shared header-artwork treatment (mirrors ChatsPopover / NotificationBell) */
        .pop-art {
          position: absolute; inset: 0; pointer-events: none;
          opacity: 0.5;
          -webkit-mask-image: linear-gradient(90deg, transparent 4%, rgba(0,0,0,0.5) 40%, #000 82%);
          mask-image: linear-gradient(90deg, transparent 4%, rgba(0,0,0,0.5) 40%, #000 82%);
          animation: pop-art-in 900ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes pop-art-in { from { opacity: 0; transform: scale(1.1); } }
        .pop-art-scrim {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(90deg, rgba(26,10,0,0.85) 0%, rgba(26,10,0,0.35) 55%, transparent 100%);
        }
        @media (prefers-reduced-motion: reduce) {
          .pop-art { animation: none !important; opacity: 0.5 !important; transform: none !important; }
        }

        /* ══════════════════════════════════════════════════════════
           MOBILE NAV — PER-ICON MOTION
           Phones have no hover, so these fire on :active. Each icon moves the
           way its own thing moves: the pin drops, the lens zooms, the bubble
           wobbles, the plus turns, the bell swings, the bars squeeze.

           Transform/opacity only, all CSS, no JS — nothing here delays the
           first paint or costs a hydration pass.
           ══════════════════════════════════════════════════════════ */
        @media (max-width: 639px) {
          .mob-pill { padding: 6px 7px; }

          /* Bigger tap target = the icon needs room to move inside it */
          .mob-pill .hdr-icon svg,
          .mob-pill .chatpop-btn svg,
          .mob-pill .bell-btn svg,
          .mob-pill .sell-fab svg {
            transition: transform 260ms cubic-bezier(0.34,1.56,0.64,1);
          }

          /* Location — the pin drops in */
          .mob-pill [aria-label="Set location"]:active svg { animation: mob-pin 480ms cubic-bezier(0.34,1.56,0.64,1); }
          @keyframes mob-pin {
            0%   { transform: translateY(-5px) scale(1.15); }
            55%  { transform: translateY(2px) scale(0.92); }
            100% { transform: translateY(0) scale(1); }
          }

          /* Search — the lens zooms */
          .mob-pill [aria-label="Search"]:active svg { animation: mob-zoom 440ms cubic-bezier(0.34,1.56,0.64,1); }
          @keyframes mob-zoom {
            0%   { transform: scale(1) rotate(0deg); }
            45%  { transform: scale(1.28) rotate(-14deg); }
            100% { transform: scale(1) rotate(0deg); }
          }

          /* Chats — the bubble wobbles */
          .mob-pill .chatpop-btn:active svg { animation: mob-wobble 520ms ease; }
          @keyframes mob-wobble {
            0%,100% { transform: rotate(0deg); }
            25%     { transform: rotate(-11deg) scale(1.1); }
            55%     { transform: rotate(8deg) scale(1.05); }
            80%     { transform: rotate(-3deg); }
          }

          /* Sell — the plus turns */
          .mob-pill .sell-fab:active svg { transform: rotate(135deg) scale(1.1); }

          /* Bell — it rings */
          .mob-pill .bell-btn:active svg { animation: mob-ring 620ms ease; }
          @keyframes mob-ring {
            0%,100% { transform: rotate(0deg); }
            15%     { transform: rotate(16deg); }
            35%     { transform: rotate(-13deg); }
            55%     { transform: rotate(9deg); }
            75%     { transform: rotate(-5deg); }
          }

          /* Menu — the bars squeeze together */
          .mob-pill [aria-label="Menu"]:active svg { animation: mob-squeeze 420ms cubic-bezier(0.34,1.56,0.64,1); }
          @keyframes mob-squeeze {
            0%   { transform: scaleY(1) scaleX(1); }
            45%  { transform: scaleY(0.62) scaleX(1.14); }
            100% { transform: scaleY(1) scaleX(1); }
          }

          /* The whole button dips under the finger — reads as a real press */
          .mob-pill .hdr-icon:active,
          .mob-pill .chatpop-btn:active,
          .mob-pill .bell-btn:active { transform: scale(0.88); }
          .mob-pill .sell-fab:active { transform: scale(0.9); }
        }

        @media (prefers-reduced-motion: reduce) {
          .mob-pill .hdr-icon svg, .mob-pill .chatpop-btn svg,
          .mob-pill .bell-btn svg, .mob-pill .sell-fab svg {
            animation: none !important; transition: none !important; transform: none !important;
          }
          .mob-pill .hdr-icon:active, .mob-pill .chatpop-btn:active,
          .mob-pill .bell-btn:active, .mob-pill .sell-fab:active { transform: none !important; }
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP PILL — always visible, no collapse
          Three groups: LEFT (logo+home) | CENTER (location+search) | RIGHT (all icon actions)
          Outer div owns centering; inner div owns layout — Framer Motion NOT used here
          so translateX(-50%) is never clobbered by animation transforms.
          ══════════════════════════════════════════════════════════════ */}
      <div
        className="hidden sm:block"
        style={{
          position: "fixed",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          width: "min(94vw, 1400px)",
          /* top is fixed, no transition */
        }}
      >
        <div className="hdr-pill" data-scrolled={scrolled} style={{
          background: scrolled ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.94)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "8px 20px",
          boxShadow: scrolled
            ? "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)"
            : "0 4px 20px rgba(0,0,0,0.07)",
          
        }}>

          {/* LEFT: logo + home */}
          <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
            {/* Wordmark. NOTE: no background-clip gradient here — .hdr-logo-dot
                is animated (scale), and a transformed child gets its own layer
                that a clipped background can't paint into, so the text would
                vanish. Solid colours only. */}
            <Link href="/" className="hdr-logo" aria-label="bazar.in home">
              bazar<span className="hdr-logo-dot">.</span><span className="hdr-logo-in">in</span>
            </Link>
            <Tip label="Home">
              <Link href="/" className={`hdr-icon${isHomeActive?" active":""}`} aria-label="Home" style={{ textDecoration:"none" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill={isHomeActive?"currentColor":"none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </Link>
            </Tip>
          </div>

          {/* CENTER: location + search */}
          <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0, justifyContent:"center" }}>
            <div style={{ flexShrink:0 }}><LocationPill /></div>
            <div style={{ minWidth:180, maxWidth:380, flex:1 }}><SearchBar /></div>
          </div>

          {/* RIGHT: all icon actions */}
          <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>

            {/* My Listings — plain icon link, no dropdown */}
            <Tip label="My Listings">
              <GatedLink href="/my-listings" action="manage your listings" className={`hdr-icon${isMyListingsActive?" active":""}`} aria-label="My Listings" style={{ textDecoration:"none" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </GatedLink>
            </Tip>

            {/* Wishlist — always visible; logged-out taps open the sign-in popup */}
            <Tip label="Wishlist">
              <GatedLink href="/wishlist" action="save items to your wishlist"
                className={`hdr-icon${wishlistPop?" heart-pop":""}${isWishlistActive?" active":""}`}
                aria-label="Wishlist" style={{ textDecoration:"none" }} onClick={handleWishlistClick}>
                <HeartIcon active={isWishlistActive} />
              </GatedLink>
            </Tip>

            {/* Chats — opens a dropdown panel; ChatsPopover gates the click itself */}
            <Tip label="Chats">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:44, height:44, flexShrink:0 }}>
                <ChatsPopover />
              </div>
            </Tip>

            {/* Notifications — always visible; NotificationBell gates the click itself */}
            <Tip label="Notifications">
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:44, height:44, flexShrink:0 }}>
                <NotificationBell />
              </div>
            </Tip>

            {/* Contact Us — NOTE: /contact route needs to be created if it doesn't exist */}
            <Tip label="Contact Us">
              <Link href="/contact" className="hdr-icon" aria-label="Contact Us" style={{ textDecoration:"none" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.6 1.32h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
              </Link>
            </Tip>

            {/* Avatar / account */}
            {user && (
              <Tip label={profile?.name ?? "Account"}>
                <div className="hdr-icon" style={{ cursor:"default", color:"#ea580c" }}>
                  {profile?.profile_photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.profile_photo_url} alt={profile.name ?? ""}
                      style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover" }} />
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  )}
                </div>
              </Tip>
            )}

            {/* Logout — opens confirm modal, NOT instant */}
            {user && (
              <Tip label="Logout">
                <button type="button" onClick={() => setLogoutConfirm(true)} className="hdr-icon" aria-label="Logout">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </button>
              </Tip>
            )}

            {/* Sign in (guest) */}
            {!isLoading && !user && (
              <Tip label="Sign in">
                <Link href="/login" className="hdr-icon" aria-label="Sign in" style={{ textDecoration:"none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10 17 15 12 10 7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                </Link>
              </Tip>
            )}

            {/* Sell — gradient circle, primary CTA */}
            <Tip label="Sell">
              <GatedLink href="/sell" action="post an ad" prefetch className="sell-circle" aria-label="Sell">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span className="sell-circle-label">Sell</span>
              </GatedLink>
            </Tip>
          </div>
        </div>
      </div>
      {/* ══════════════════════════════
          MOBILE BOTTOM FLOATING PILL
          ══════════════════════════════ */}
      {navMobileVisible && (
      <motion.div
        layout
        className="sm:hidden mob-pill"
        style={{
          ...PILL,
          position:"fixed", bottom:12, left:16, right:16, zIndex:100,
          boxShadow:"0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
          overflow:"hidden",
          /* Compositor layer — prevents URL bar show/hide from triggering a repaint/reposition */
          willChange: "transform",
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
        }}
        transition={prefersReducedMotion ? { duration:0 } : { type:"spring", damping:28, stiffness:300 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!searchExpanded ? (
            <motion.div key="collapsed"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              transition={prefersReducedMotion ? { duration:0 } : { duration:0.14 }}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-evenly", padding:"6px 4px" }}>

              {/* Location */}
              <div className="nav-item" style={{ position:"relative" }}>
                <button type="button" onClick={() => setLocSheetOpen(true)} className={`hdr-icon ${!needsSetup?"active":""}`} aria-label="Set location" style={{ flexShrink:0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                </button>
                {/* Status dot — green if location set, pulsing orange if not */}
                <span style={{
                  position:"absolute", bottom:4, right:4,
                  width:7, height:7, borderRadius:"50%",
                  background: needsSetup ? "#f97316" : "#22c55e",
                  border:"1.5px solid white",
                  animation: needsSetup ? "loc-dot-pulse 2s ease infinite" : "none",
                  display:"block",
                }} />
              </div>

              {/* Search */}
              <div className="nav-item" style={{ position:"relative" }}>
                <button type="button" onClick={() => setSearchExpanded(true)} className="hdr-icon" aria-label="Search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                </button>
              </div>

              {/* Chats — opens the same 65vh sheet as the bell */}
              <div className="nav-item" style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <ChatsPopover />
              </div>

              {/* Sell FAB — center */}
              <div className="nav-item" style={{ position:"relative" }}>
                <GatedLink href="/sell" action="post an ad" prefetch className="sell-fab" aria-label="Post an ad" style={{ width:48, height:48 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                </GatedLink>
              </div>

              {/* Notification Bell */}
              <div className="nav-item" style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <NotificationBell />
              </div>

              {/* ☰ Menu + divider + ‹ collapse */}
              <div className="nav-item" style={{ position:"relative", display:"flex", alignItems:"center", flexShrink:0 }}>
                <button type="button" onClick={() => setDrawerOpen(true)} className="hdr-icon" aria-label="Menu">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                <div style={{ width:1, height:14, background:"rgba(0,0,0,0.12)", margin:"0 2px", flexShrink:0 }} />
                <button type="button" onClick={() => setNavMobileVisible(false)} aria-label="Hide navigation"
                  className="hdr-icon collapse-btn" style={{ width:28, height:28 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="expanded"
              initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.96 }}
              transition={prefersReducedMotion ? { duration:0 } : { type:"spring", damping:26, stiffness:300 }}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px 6px 14px" }}>
              <button type="button" onClick={() => setSearchExpanded(false)} className="hdr-icon" style={{ flexShrink:0 }} aria-label="Close search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div style={{ flex:1, minWidth:0 }}>
                <SearchBar autoFocus onCollapse={() => setSearchExpanded(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      )}

      {/* Glowing restore button — shown when pill is hidden */}
      {!navMobileVisible && (
        <button type="button" className="sm:hidden"
          onClick={() => setNavMobileVisible(true)}
          aria-label="Show navigation"
          style={{
            position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
            zIndex:61, width:40, height:40, borderRadius:"50%",
            background:"linear-gradient(135deg,#ea580c,#f97316)",
            border:"none", cursor:"pointer", display:"flex",
            alignItems:"center", justifyContent:"center",
            boxShadow:"0 0 0 0 rgba(234,88,12,0.5)",
            animation:"nav-restore-pulse 1.8s ease infinite",
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      )}

      {/* ══════════════════════════════
          MOBILE DRAWER — slides UP from bottom
          ══════════════════════════════ */}
      {mounted && drawerOpen && createPortal(
        <>
          {/* Backdrop */}
          <div onClick={() => setDrawerOpen(false)}
            style={{ position:"fixed", inset:0, zIndex:9980, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)", animation:"fade-in 200ms ease both" }} />

          {/* Sheet slides up */}
          <div style={{
            position:"fixed", bottom:0, left:0, right:0, zIndex:9981,
            background:"white", borderRadius:"24px 24px 0 0",
            height:"65vh", display:"flex", flexDirection:"column",
            boxShadow:"0 -16px 56px rgba(0,0,0,0.25)",
            animation:"drawer-up 300ms cubic-bezier(0.22,1,0.36,1) both",
            overflow:"hidden",
          }}>

            {/* ── GRADIENT HEADER — matches notification bell style ── */}
            <div style={{
              background:"linear-gradient(135deg, #4c0519 0%, #881337 45%, #be123c 100%)",
              overflow:"hidden",
              padding:"14px 20px 16px", flexShrink:0,
              position:"relative",
            }}>
              {!drawerArtFailed && (
                <>
                  {/* Optional artwork, masked left so the title stays on flat colour */}
                  <div className="pop-art" aria-hidden="true">
                    <Image
                      src="/images/header-menu.png"
                      alt=""
                      fill
                      sizes="320px"
                      style={{ objectFit: "cover", objectPosition: "center right" }}
                      onError={() => setDrawerArtFailed(true)}
                    />
                  </div>
                  <div className="pop-art-scrim" aria-hidden="true" />
                </>
              )}
              {/* Subtle grid overlay */}
              <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)", backgroundSize:"28px 28px", borderRadius:"24px 24px 0 0" }} />

              {/* Drag handle */}
              <div style={{ width:36, height:4, borderRadius:100, background:"rgba(255,255,255,0.25)", margin:"0 auto 14px" }} />

              {/* User info row */}
              {user ? (
                <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative" }}>
                  {/* Avatar */}
                  <div style={{ width:46, height:46, borderRadius:"50%", overflow:"hidden", flexShrink:0, background:"rgba(255,255,255,0.15)", border:"2px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {profile?.profile_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.profile_photo_url} alt={profile.name ?? "Profile"} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} />
                    ) : (
                      <span style={{ color:"white", fontWeight:800, fontSize:20 }}>
                        {profile?.name?.[0]?.toUpperCase() ?? "U"}
                      </span>
                    )}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:16, fontWeight:900, letterSpacing:"-0.035em", color:"white", margin:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {profile?.name ?? "My Account"}
                    </p>
                    <p style={{ fontSize:11.5, fontWeight:600, color:"rgba(255,255,255,0.62)", margin:"1px 0 0" }}>
                      bazar.in member
                    </p>
                  </div>
                  {/* Close button */}
                  <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu"
                    style={{ width:30, height:30, borderRadius:"50%", border:"none", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <p style={{ fontSize:16, fontWeight:900, letterSpacing:"-0.035em", color:"white", margin:0 }}>Menu</p>
                    <p style={{ fontSize:11.5, fontWeight:600, color:"rgba(255,255,255,0.62)", margin:"1px 0 0" }}>Sign in to buy and sell</p>
                  </div>
                  <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu"
                    style={{ width:30, height:30, borderRadius:"50%", border:"none", background:"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Nav links */}
            <nav style={{ overflowY:"auto", flex:1, padding:"8px 0" }}>
              {drawerLinks.map(({ href, label, icon, action }) => {
                const linkStyle = { display:"flex", alignItems:"center", gap:14, padding:"14px 20px", textDecoration:"none", fontSize:14, fontWeight:500, color:pathname===href?"#be123c":"#374151", background:pathname===href?"rgba(190,18,60,0.08)":"transparent", borderLeft:`3px solid ${pathname===href?"#be123c":"transparent"}` } as const;
                const inner = (
                  <>
                    <span style={{ color:pathname===href?"#be123c":"#6b7280" }}>{icon}</span>
                    {label}
                  </>
                );
                // Gated entries close the drawer first so the popup isn't hidden behind it
                return action ? (
                  <GatedLink key={href} href={href} action={action} prefetch
                    onClick={() => setDrawerOpen(false)}
                    onBlocked={() => setDrawerOpen(false)}
                    style={linkStyle}>
                    {inner}
                  </GatedLink>
                ) : (
                  <Link key={href} href={href} prefetch onClick={() => setDrawerOpen(false)} style={linkStyle}>
                    {inner}
                  </Link>
                );
              })}


            </nav>

            {/* Login / Logout at bottom */}
            <div style={{ padding:"12px 20px", borderTop:"1px solid #f3f4f6", flexShrink:0, paddingBottom:"calc(12px + env(safe-area-inset-bottom))" }}>
              {user ? (
                <button type="button" onClick={() => setLogoutConfirm(true)}
                  style={{ width:"100%", padding:"12px", borderRadius:100, border:"1.5px solid #fee2e2", background:"#fff5f5", color:"#dc2626", fontWeight:600, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Logout
                </button>
              ) : (
                <Link href="/login" onClick={() => setDrawerOpen(false)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"12px", borderRadius:100, background:"linear-gradient(135deg,#9f1239,#be123c)", color:"white", fontWeight:700, textDecoration:"none", fontSize:14, gap:8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  Sign in / Login
                </Link>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ══════════════════════════════
          LOGOUT CONFIRMATION POPUP
          ══════════════════════════════ */}
      {mounted && logoutConfirm && createPortal(
        <>
          <div onClick={() => setLogoutConfirm(false)}
            style={{ position:"fixed", inset:0, zIndex:9990, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)", animation:"fade-in 150ms ease both" }} />
          <div style={{
            position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
            zIndex:9991, background:"white", borderRadius:20, padding:"28px 24px",
            width:"min(88vw, 360px)", boxShadow:"0 24px 60px rgba(0,0,0,0.22)",
            animation:"fade-in 150ms ease both",
          }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"#fff5f5", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
              <h3 style={{ fontSize:17, fontWeight:700, color:"#111", margin:"0 0 6px" }}>Log out?</h3>
              <p style={{ fontSize:13, color:"#6b7280", margin:0 }}>Are you sure you want to log out of your account?</p>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button type="button" onClick={() => setLogoutConfirm(false)}
                style={{ flex:1, padding:"11px", borderRadius:100, border:"1.5px solid #e5e7eb", background:"white", fontWeight:600, fontSize:14, color:"#374151", cursor:"pointer" }}>
                No, stay
              </button>
              <button type="button" onClick={handleLogout} disabled={isSigningOut}
                style={{ flex:1, padding:"11px", borderRadius:100, border:"none", background:"linear-gradient(135deg,#dc2626,#ef4444)", color:"white", fontWeight:700, fontSize:14, cursor:"pointer", opacity:isSigningOut?0.7:1 }}>
                {isSigningOut ? "Logging out…" : "Yes, logout"}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ══════════════════════════════
          LOCATION BOTTOM SHEET
          ══════════════════════════════ */}
      <AnimatePresence>
        {/* Mobile location picker.
            This used to be a bespoke bottom sheet living right here — a second
            implementation of what LocationModal already does. That duplication
            is what caused the "picking a location does nothing on mobile" bug:
            this copy's onSelect discarded its argument while LocationModal's
            called setActiveLocation correctly.

            LocationModal is already a bottom sheet below 640px and a centred
            card above it, so pointing mobile at it gives the same design on
            both breakpoints AND leaves one place for location bugs to live. */}
        {locSheetOpen && <LocationModal onClose={() => setLocSheetOpen(false)} />}
      </AnimatePresence>
    </>
  );
}