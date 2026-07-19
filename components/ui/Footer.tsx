"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

/**
 * Site footer — premium, editorial, restrained.
 *
 * The sticky header carries all app navigation (browse / search / wishlist /
 * sell), so this footer does NOT duplicate those. It keeps only what belongs at
 * the bottom of a real site: brand + pitch, a compact "get the app" row, the
 * Company and Legal columns, a trust strip, socials, and a clean copyright bar.
 *
 * Palette: deep FOREST / PINE green (kept exactly). The upgrade here is
 * typography, spacing and rhythm — not colour.
 *
 * Typography note: this builds on the site's existing self-hosted font
 * (Figtree, exposed as --font-sans via next/font in app/layout.tsx). We do NOT
 * pull Plus Jakarta Sans via next/font/google, because this project can't reach
 * fonts.gstatic.com at build time and a second family would fight Figtree across
 * the site. Figtree is a geometric-humanist sans with a full 300–900 range —
 * the same friendly-but-premium character the brief asks for — so the footer
 * stays cohesive with the rest of the app with zero new asset/network dep.
 *
 * Backgrounds: masked desktop + mobile images with a bgFailed fallback to the
 * plain gradient. prefers-reduced-motion disables all motion.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const [bgFailed, setBgFailed] = useState(false);

  const company = [
    { label: "About us", href: "#" },
    { label: "Contact", href: "/contact" },
    { label: "Careers", href: "#" },
    { label: "Blog", href: "#" },
  ];
  const legal = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
    { label: "Safety & trust", href: "#" },
  ];
  const trust = [
    { icon: "🔒", label: "Secure & verified sellers" },
    { icon: "📍", label: "Local buyers near you" },
    { icon: "🆓", label: "Free to list, always" },
    { icon: "💬", label: "Chat directly, no middleman" },
  ];

  return (
    <footer className="bzf" aria-labelledby="footer-heading">
      <style>{`
        .bzf {
          position: relative;
          margin-top: 32px;
          background: linear-gradient(160deg, #052e21 0%, #064e3b 55%, #0b5d43 100%);
          color: #9fb3a9;
          overflow: hidden;
          isolation: isolate;
          font-family: var(--font-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          font-feature-settings: "liga" 1, "calt" 1;
        }

        /* Soft top inner-glow + faint grain for depth (subtle) */
        .bzf::after {
          content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(120% 60% at 50% -10%, rgba(52,211,153,0.10), transparent 60%);
        }

        /* Background images (masked), fallback to gradient */
        .bzf-bg { position: absolute; inset: 0; z-index: -1; opacity: 0.28; pointer-events: none; }
        .bzf-bg-desktop {
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.45) 46%, #000 92%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.45) 46%, #000 92%);
        }
        .bzf-bg-mobile {
          -webkit-mask-image: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.45) 42%, #000 90%);
          mask-image: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.45) 42%, #000 90%);
        }
        .bzf-bg-mobile { display: block; }
        .bzf-bg-desktop { display: none; }
        @media(min-width:641px){
          .bzf-bg-mobile { display: none; }
          .bzf-bg-desktop { display: block; }
        }
        .bzf-scrim {
          position: absolute; inset: 0; z-index: -1; pointer-events: none;
          background: linear-gradient(160deg, rgba(5,46,33,0.74) 0%, rgba(6,78,59,0.56) 55%, rgba(11,93,67,0.5) 100%);
        }

        .bzf-inner {
          position: relative; z-index: 1;
          max-width: 1440px; margin: 0 auto;
          padding: 44px 24px 24px;
        }
        @media(min-width:768px){ .bzf-inner { padding: 52px 40px 26px; } }

        /* ── Type primitives ─────────────────────────────── */
        .bzf a { text-decoration: none; }
        .bzf a:focus-visible,
        .bzf button:focus-visible {
          outline: 2px solid #34d399;
          outline-offset: 3px;
          border-radius: 6px;
        }

        /* ── Top: brand + app row / columns ──────────────── */
        .bzf-top {
          display: grid;
          grid-template-columns: 1.7fr 1fr 1fr;
          gap: 44px;
          padding-bottom: 32px;
        }
        @media(max-width:820px){ .bzf-top { grid-template-columns: 1fr 1fr; gap: 40px 28px; } }
        @media(max-width:520px){ .bzf-top { grid-template-columns: 1fr 1fr; gap: 28px; } }

        .bzf-brand { max-width: 360px; }
        @media(max-width:820px){ .bzf-brand { grid-column: 1 / -1; max-width: none; } }

        .bzf-logo {
          font-size: 28px; font-weight: 900; letter-spacing: -0.045em;
          line-height: 1; color: #ecfdf5; margin: 0 0 14px;
        }
        .bzf-logo span { color: #34d399; }

        .bzf-tag {
          font-size: 13.5px; font-weight: 500; line-height: 1.6;
          color: #9fb3a9; margin: 0 0 18px; max-width: 340px;
        }

        /* Region chip */
        .bzf-region {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 12px; font-weight: 550; letter-spacing: -0.01em;
          color: #c7d6ce;
          padding: 5px 11px; border-radius: 999px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 24px;
        }

        .bzf-app-row { display: flex; gap: 10px; flex-wrap: wrap; }
        .bzf-store {
          display: inline-flex; align-items: center; gap: 9px;
          padding: 9px 14px; border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.11);
          color: #ecfdf5;
          transition: transform 180ms cubic-bezier(0.22,1,0.36,1), background 180ms ease, border-color 180ms ease;
        }
        .bzf-store:hover { transform: translateY(-2px); background: rgba(52,211,153,0.12); border-color: rgba(52,211,153,0.4); }
        .bzf-store svg { flex-shrink: 0; animation: bzf-float 5s ease-in-out infinite; }
        .bzf-store:nth-child(2) svg { animation-delay: 0.6s; }
        .bzf-store-txt { display: flex; flex-direction: column; line-height: 1.15; }
        .bzf-store-txt small { font-size: 9px; font-weight: 500; letter-spacing: 0.04em; color: #9fb3a9; text-transform: uppercase; }
        .bzf-store-txt strong { font-size: 13.5px; font-weight: 700; letter-spacing: -0.02em; }

        /* Columns */
        .bzf-col-title {
          font-size: 11.5px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.14em; color: #ecfdf5;
          margin: 0 0 16px;
        }
        .bzf-links { display: flex; flex-direction: column; gap: 11px; }
        .bzf-link {
          position: relative;
          font-size: 13.5px; font-weight: 550; letter-spacing: -0.015em;
          color: #9fb3a9; width: fit-content;
          transition: color 160ms ease;
        }
        /* refined underline-grow indicator */
        .bzf-link::after {
          content: ""; position: absolute; left: 0; bottom: -3px;
          width: 0; height: 1.5px; border-radius: 2px;
          background: #34d399;
          transition: width 180ms cubic-bezier(0.22,1,0.36,1);
        }
        .bzf-link { animation: bzf-link-breathe 6s ease-in-out infinite; }
        .bzf-link:nth-child(2){ animation-delay: 0.4s; }
        .bzf-link:nth-child(3){ animation-delay: 0.8s; }
        .bzf-link:nth-child(4){ animation-delay: 1.2s; }
        @keyframes bzf-link-breathe { 0%,100%{color:#9fb3a9} 50%{color:#b6c7be} }
        .bzf-link:hover { color: #ecfdf5; animation: none; }
        .bzf-link:hover::after { width: 100%; }

        /* ── Divider ─────────────────────────────────────── */
        .bzf-rule { height: 1px; background: rgba(255,255,255,0.09); border: 0; margin: 0; }

        /* ── Trust strip ─────────────────────────────────── */
        .bzf-meta-row {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 20px; padding: 24px 0;
        }
        .bzf-meta-row .bzf-trust { flex: 1; justify-content: center; }
        @media(max-width:900px){
          .bzf-meta-row { flex-direction: column; gap: 20px; }
          .bzf-meta-row .bzf-trust { justify-content: center; }
        }
        /* Mobile: hide the trust badges entirely; show socials first, then app badges */
        @media(max-width:640px){
          .bzf-trust { display: none !important; }
          .bzf-meta-row { flex-direction: column; align-items: center; gap: 18px; }
          .bzf-socials { order: 1; }
          .bzf-app-row { order: 2; justify-content: center; }
        }
        .bzf-trust {
          display: flex; flex-wrap: wrap; gap: 10px;
        }
        .bzf-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 7px 12px; border-radius: 999px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          font-size: 12px; font-weight: 550; letter-spacing: -0.015em;
          color: #b6c7be;
          transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
        }
        .bzf-badge .bzf-badge-ic { font-size: 14px; line-height: 1; display: inline-block; animation: bzf-pulse 3.5s ease-in-out infinite; }
        .bzf-badge:nth-child(1) .bzf-badge-ic { animation-delay: 0s; }
        .bzf-badge:nth-child(2) .bzf-badge-ic { animation-delay: 0.5s; }
        .bzf-badge:nth-child(3) .bzf-badge-ic { animation-delay: 1s; }
        .bzf-badge:nth-child(4) .bzf-badge-ic { animation-delay: 1.5s; }
        @keyframes bzf-pulse { 0%,88%,100%{transform:scale(1)} 94%{transform:scale(1.28)} }
        .bzf-badge:hover { background: rgba(52,211,153,0.08); border-color: rgba(52,211,153,0.28); transform: translateY(-1px); }

        /* ── Socials ─────────────────────────────────────── */
        .bzf-socials { display: flex; gap: 10px; }
        .bzf-soc {
          position: relative;
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; border: 1px solid transparent; overflow: hidden;
          transition: transform 200ms cubic-bezier(0.22,1,0.36,1), box-shadow 220ms ease, border-color 200ms ease;
        }
        .bzf-soc svg { position: relative; z-index: 1; }
        /* Auto float — always on, staggered per icon */
        .bzf-soc { animation: bzf-float 4.5s ease-in-out infinite; }
        .bzf-soc:nth-child(1){ animation-delay: 0s; }
        .bzf-soc:nth-child(2){ animation-delay: 0.4s; }
        .bzf-soc:nth-child(3){ animation-delay: 0.8s; }
        .bzf-soc:nth-child(4){ animation-delay: 1.2s; }
        @keyframes bzf-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        /* Brand colours at rest */
        .bzf-soc-ig { background: linear-gradient(45deg, #f09433, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888); }
        .bzf-soc-fb { background: #1877f2; }
        .bzf-soc-x  { background: #000; border-color: rgba(255,255,255,0.2); }
        .bzf-soc-yt { background: #ff0000; }
        /* Tasteful hover: soft lift + brand glow */
        .bzf-soc:hover { transform: translateY(-3px); }
        .bzf-soc-ig:hover { box-shadow: 0 8px 20px rgba(220,39,67,0.45); }
        .bzf-soc-fb:hover { box-shadow: 0 8px 20px rgba(24,119,242,0.45); }
        .bzf-soc-x:hover  { box-shadow: 0 8px 20px rgba(0,0,0,0.5); border-color: rgba(255,255,255,0.32); }
        .bzf-soc-yt:hover { box-shadow: 0 8px 20px rgba(255,0,0,0.45); }

        /* ── Bottom bar ──────────────────────────────────── */
        .bzf-bottom {
          display: flex; align-items: center; justify-content: center;
          gap: 20px; flex-wrap: wrap; padding-top: 18px; text-align: center;
        }
        .bzf-copy {
          font-size: 12px; font-weight: 500; letter-spacing: -0.015em;
          color: #6f8479; margin: 0;
        }
        .bzf-copy .bzf-year { font-variant-numeric: tabular-nums; }

        @media(prefers-reduced-motion:reduce){
          .bzf-store, .bzf-store svg, .bzf-link, .bzf-link::after, .bzf-badge,
          .bzf-badge-ic, .bzf-soc {
            transition: none !important; animation: none !important;
          }
        }
      `}</style>

      {/* Background images + scrim */}
      {!bgFailed && (
        <>
          <div className="bzf-bg bzf-bg-desktop" aria-hidden="true">
            <Image
              src="/images/footer-bg.png"
              alt=""
              fill
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "center right" }}
              onError={() => setBgFailed(true)}
            />
          </div>
          <div className="bzf-bg bzf-bg-mobile" aria-hidden="true">
            <Image
              src="/images/footer-bg-mobile.png"
              alt=""
              fill
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "center top" }}
              onError={() => setBgFailed(true)}
            />
          </div>
        </>
      )}
      <div className="bzf-scrim" aria-hidden="true" />

      <div className="bzf-inner">
        <h2 id="footer-heading" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Footer
        </h2>

        {/* Top: brand + Company + Legal */}
        <div className="bzf-top">
          <div className="bzf-brand">
            <p className="bzf-logo">bazar<span>.in</span></p>
            <p className="bzf-tag">
              India&apos;s friendly local marketplace. Buy, sell and rent anything —
              from phones to furniture — with real people near you.
            </p>

            <span className="bzf-region">🇮🇳 India · English</span>
          </div>

          <div>
            <p className="bzf-col-title">Company</p>
            <div className="bzf-links">
              {company.map((l) => (
                <Link key={l.label} href={l.href} className="bzf-link">{l.label}</Link>
              ))}
            </div>
          </div>

          <div>
            <p className="bzf-col-title">Legal</p>
            <div className="bzf-links">
              {legal.map((l) => (
                <Link key={l.label} href={l.href} className="bzf-link">{l.label}</Link>
              ))}
            </div>
          </div>
        </div>

        <hr className="bzf-rule" />

        {/* App badges (left) · trust (center) · socials (right) — one row */}
        <div className="bzf-meta-row">
          <div className="bzf-app-row">
            <a className="bzf-store" href="#" aria-label="Download on the App Store">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.7c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.2 0 1.9-1 2.6-2 .8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.5zM14.2 6.2c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.2z"/></svg>
              <span className="bzf-store-txt"><small>Download on the</small><strong>App Store</strong></span>
            </a>
            <a className="bzf-store" href="#" aria-label="Get it on Google Play">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.6 2.3c-.3.3-.5.8-.5 1.4v16.6c0 .6.2 1.1.5 1.4l.1.1 9.3-9.3v-.2L3.6 2.3zM16.3 15.3l-3.1-3.1v-.2l3.1-3.1.1.1 3.7 2.1c1 .6 1 1.6 0 2.2l-3.7 2.1-.1-.1zM15.9 15.7l-3.2-3.2-9.3 9.3c.4.3 1 .4 1.6 0l10.9-6.1zM15.9 8.3L5 2.2c-.6-.4-1.2-.3-1.6 0l9.3 9.3 3.2-3.2z"/></svg>
              <span className="bzf-store-txt"><small>Get it on</small><strong>Google Play</strong></span>
            </a>
          </div>

          <div className="bzf-trust">
            {trust.map((t) => (
              <span key={t.label} className="bzf-badge">
                <span className="bzf-badge-ic" aria-hidden="true">{t.icon}</span>{t.label}
              </span>
            ))}
          </div>

          <div className="bzf-socials">
            <a className="bzf-soc bzf-soc-ig" href="#" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 1.62c-3.15 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.22-.94.47-1.35.88-.41.41-.66.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.59-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.22.55.47.94.88 1.35.41.41.8.66 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.22.94-.47 1.35-.88.41-.41.66-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.59-.07-4.74-.07Zm0 2.76a5.42 5.42 0 1 1 0 10.84 5.42 5.42 0 0 1 0-10.84Zm0 8.94a3.52 3.52 0 1 0 0-7.04 3.52 3.52 0 0 0 0 7.04Zm6.9-9.15a1.27 1.27 0 1 1-2.53 0 1.27 1.27 0 0 1 2.53 0Z"/></svg>
            </a>
            <a className="bzf-soc bzf-soc-fb" href="#" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"/></svg>
            </a>
            <a className="bzf-soc bzf-soc-x" href="#" aria-label="Twitter / X" target="_blank" rel="noopener noreferrer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.9 1.2h3.7l-8 9.1 9.4 12.5h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9zM17.6 20.6h2L6.5 3.2H4.3z"/></svg>
            </a>
            <a className="bzf-soc bzf-soc-yt" href="#" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z"/></svg>
            </a>
          </div>
        </div>

        <hr className="bzf-rule" />

        {/* Copyright */}
        <div className="bzf-bottom">
          <p className="bzf-copy">© <span className="bzf-year">{year}</span> bazar.in — All rights reserved. Made with care in India.</p>
        </div>
      </div>
    </footer>
  );
}