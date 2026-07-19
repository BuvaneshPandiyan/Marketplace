"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

/**
 * Site footer.
 *
 * Sits at the bottom of every (main) page. The sticky header already carries all
 * the app navigation (browse, search, wishlist, sell, etc.), so the footer does
 * NOT duplicate those as link columns — it only keeps what belongs at the bottom
 * of a site: the company links (About / Contact / Careers / Blog), the legal
 * links (Privacy / Terms / Cookies / Safety), socials, and the copyright bar.
 *
 * Colour: deep FOREST / PINE green — a premium tone not used anywhere else on the
 * site (distinct from the bright emerald contact page: this is deeper and muted).
 * A masked background image (public/images/footer-bg.png) sits behind it and fades
 * out, matching the band treatment used across the site.
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

  return (
    <footer className="bz-footer" aria-labelledby="footer-heading">
      <style>{`
        .bz-footer {
          position: relative;
          margin-top: 40px;
          background: linear-gradient(160deg, #052e21 0%, #064e3b 55%, #0b5d43 100%);
          color: #c8d8cf;
          overflow: hidden;
          isolation: isolate;
        }
        /* Background image, masked + faded so it never fights the text.
           Two images: a wide one for desktop (fades from the left) and a taller
           one for mobile (fades from the top), since a wide banner gets cropped
           to nothing on a narrow phone screen. */
        .bz-footer-bg {
          position: absolute; inset: 0; z-index: -1; opacity: 0.3;
          pointer-events: none;
        }
        .bz-footer-bg-desktop {
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 45%, #000 90%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.5) 45%, #000 90%);
        }
        .bz-footer-bg-mobile {
          -webkit-mask-image: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 40%, #000 88%);
          mask-image: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 40%, #000 88%);
        }
        /* Show the right one per breakpoint */
        .bz-footer-bg-mobile { display: block; }
        .bz-footer-bg-desktop { display: none; }
        @media(min-width:641px){
          .bz-footer-bg-mobile { display: none; }
          .bz-footer-bg-desktop { display: block; }
        }
        .bz-footer-scrim {
          position: absolute; inset: 0; z-index: -1; pointer-events: none;
          background: linear-gradient(160deg, rgba(5,46,33,0.72) 0%, rgba(6,78,59,0.55) 55%, rgba(11,93,67,0.5) 100%);
        }
        .bz-footer::before {
          content: ""; position: absolute; top: -120px; left: -80px; z-index: -1;
          width: 340px; height: 340px; border-radius: 50%;
          background: radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .bz-footer-inner {
          position: relative; z-index: 1;
          max-width: 1600px; margin: 0 auto;
          padding: 52px 16px 28px;
        }
        @media(min-width:768px){ .bz-footer-inner { padding: 60px 32px 32px; } }

        .bz-footer-top {
          display: grid;
          grid-template-columns: 1.8fr 1fr 1fr;
          gap: 48px;
          padding-bottom: 40px;
          border-bottom: 1px solid rgba(255,255,255,0.09);
        }
        @media(max-width:760px){ .bz-footer-top { grid-template-columns: 1fr 1fr; gap: 34px 24px; } }
        @media(max-width:520px){ .bz-footer-top { grid-template-columns: 1fr; gap: 30px; } }

        .bz-footer-brand-col { max-width: 340px; }
        @media(max-width:760px){ .bz-footer-brand-col { grid-column: 1 / -1; max-width: none; } }

        .bz-footer-logo {
          font-size: 26px; font-weight: 900; letter-spacing: -0.04em;
          color: #fff; margin: 0 0 12px;
        }
        .bz-footer-logo span { color: #34d399; }
        .bz-footer-tag { font-size: 13.5px; line-height: 1.6; color: #9fb3a9; margin: 0 0 18px; }

        .bz-footer-socials { display: flex; gap: 10px; }
        .bz-soc {
          position: relative;
          width: 40px; height: 40px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff; overflow: hidden;
          transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms ease, border-color 300ms ease;
          /* gentle auto-float, staggered per icon (set below) */
          animation: bz-soc-float 4.5s ease-in-out infinite;
        }
        .bz-soc svg { position: relative; z-index: 1; }
        /* Brand-coloured wash that fades in on hover (each icon its real colour) */
        .bz-soc::before {
          content: ""; position: absolute; inset: 0; opacity: 0;
          transition: opacity 300ms ease;
        }
        .bz-soc:hover::before { opacity: 1; }
        /* Shine sweep on hover */
        .bz-soc::after {
          content: ""; position: absolute; top: -60%; bottom: -60%; left: -80%;
          width: 45%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
          transform: translateX(-160%) skewX(-20deg);
          z-index: 2; pointer-events: none;
        }
        .bz-soc:hover::after { animation: bz-soc-shine 700ms ease both; }
        .bz-soc:hover { transform: translateY(-4px) scale(1.08); border-color: transparent; }

        /* Per-brand hover wash + glow */
        .bz-soc-ig::before   { background: linear-gradient(45deg, #f09433, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888); }
        .bz-soc-ig:hover     { box-shadow: 0 8px 22px rgba(220,39,67,0.5); }
        .bz-soc-fb::before   { background: #1877f2; }
        .bz-soc-fb:hover     { box-shadow: 0 8px 22px rgba(24,119,242,0.5); }
        .bz-soc-x::before    { background: #000; }
        .bz-soc-x:hover      { box-shadow: 0 8px 22px rgba(0,0,0,0.55); border-color: rgba(255,255,255,0.25); }
        .bz-soc-yt::before   { background: #ff0000; }
        .bz-soc-yt:hover     { box-shadow: 0 8px 22px rgba(255,0,0,0.5); }

        .bz-soc:nth-child(1) { animation-delay: 0s; }
        .bz-soc:nth-child(2) { animation-delay: 0.5s; }
        .bz-soc:nth-child(3) { animation-delay: 1s; }
        .bz-soc:nth-child(4) { animation-delay: 1.5s; }
        @keyframes bz-soc-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes bz-soc-shine { to { transform: translateX(320%) skewX(-20deg); } }

        .bz-footer-col-title {
          position: relative;
          font-size: 12px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.08em; color: #ecfdf5; margin: 0 0 18px;
          padding-bottom: 10px;
        }
        /* Self-drawing underline under each column title */
        .bz-footer-col-title::after {
          content: ""; position: absolute; left: 0; bottom: 0;
          width: 26px; height: 2px; border-radius: 2px;
          background: linear-gradient(90deg, #34d399, transparent);
        }
        .bz-footer-links { display: flex; flex-direction: column; gap: 11px; }
        .bz-footer-link {
          position: relative;
          font-size: 13.5px; color: #9fb3a9; text-decoration: none;
          width: fit-content; padding-left: 0;
          transition: color 200ms ease, padding-left 200ms ease;
        }
        /* Arrow that slides in on hover */
        .bz-footer-link::before {
          content: "→"; position: absolute; left: -16px; opacity: 0;
          color: #34d399; transition: opacity 200ms ease, left 200ms ease;
        }
        .bz-footer-link:hover { color: #34d399; padding-left: 18px; }
        .bz-footer-link:hover::before { opacity: 1; left: 0; }

        .bz-footer-trust {
          display: flex; flex-wrap: wrap; gap: 22px;
          padding: 26px 0;
          border-bottom: 1px solid rgba(255,255,255,0.09);
        }
        .bz-trust-item {
          display: flex; align-items: center; gap: 9px;
          font-size: 12.5px; color: #9fb3a9; font-weight: 500;
          transition: color 200ms ease, transform 200ms ease;
        }
        .bz-trust-item span:first-child { font-size: 16px; transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1); display: inline-block; }
        .bz-trust-item:hover { color: #ecfdf5; transform: translateY(-2px); }
        .bz-trust-item:hover span:first-child { transform: scale(1.25) rotate(-8deg); }

        .bz-footer-bottom {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap; padding-top: 24px;
        }
        .bz-footer-copy { font-size: 12.5px; color: #6f8479; margin: 0; }

        @media(prefers-reduced-motion:reduce){
          .bz-soc, .bz-footer-link, .bz-trust-item, .bz-trust-item span:first-child { transition: none; animation: none !important; }
          .bz-soc:hover::after { animation: none; }
        }
      `}</style>

      {/* Background image + scrim */}
      {!bgFailed && (
        <>
          {/* Desktop: wide banner, fades from the left */}
          <div className="bz-footer-bg bz-footer-bg-desktop" aria-hidden="true">
            <Image
              src="/images/footer-bg.png"
              alt=""
              fill
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "center right" }}
              onError={() => setBgFailed(true)}
            />
          </div>
          {/* Mobile: taller image, fades from the top */}
          <div className="bz-footer-bg bz-footer-bg-mobile" aria-hidden="true">
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
      <div className="bz-footer-scrim" aria-hidden="true" />

      <div className="bz-footer-inner">
        <h2 id="footer-heading" className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
          Footer
        </h2>

        {/* Top: brand + Company + Legal (no nav duplication — the header covers that) */}
        <div className="bz-footer-top">
          <div className="bz-footer-brand-col">
            <p className="bz-footer-logo">bazar<span>.in</span></p>
            <p className="bz-footer-tag">
              India&apos;s friendly local marketplace. Buy, sell and rent anything —
              from phones to furniture — with real people near you.
            </p>
            <div className="bz-footer-socials">
              <a className="bz-soc bz-soc-ig" href="#" aria-label="Instagram" target="_blank" rel="noopener noreferrer">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 1.62c-3.15 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.22-.94.47-1.35.88-.41.41-.66.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.59-.07 4.74s.01 3.5.07 4.74c.05 1.14.24 1.76.4 2.17.22.55.47.94.88 1.35.41.41.8.66 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.59.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.22.94-.47 1.35-.88.41-.41.66-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.59.07-4.74s-.01-3.5-.07-4.74c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.59-.07-4.74-.07Zm0 2.76a5.42 5.42 0 1 1 0 10.84 5.42 5.42 0 0 1 0-10.84Zm0 8.94a3.52 3.52 0 1 0 0-7.04 3.52 3.52 0 0 0 0 7.04Zm6.9-9.15a1.27 1.27 0 1 1-2.53 0 1.27 1.27 0 0 1 2.53 0Z"/></svg>
              </a>
              <a className="bz-soc bz-soc-fb" href="#" aria-label="Facebook" target="_blank" rel="noopener noreferrer">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"/></svg>
              </a>
              <a className="bz-soc bz-soc-x" href="#" aria-label="Twitter / X" target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 1.2h3.7l-8 9.1 9.4 12.5h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.2h7.6l5.2 6.9zM17.6 20.6h2L6.5 3.2H4.3z"/></svg>
              </a>
              <a className="bz-soc bz-soc-yt" href="#" aria-label="YouTube" target="_blank" rel="noopener noreferrer">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z"/></svg>
              </a>
            </div>
          </div>

          <div>
            <p className="bz-footer-col-title">Company</p>
            <div className="bz-footer-links">
              {company.map((l) => (
                <Link key={l.label} href={l.href} className="bz-footer-link">{l.label}</Link>
              ))}
            </div>
          </div>

          <div>
            <p className="bz-footer-col-title">Legal</p>
            <div className="bz-footer-links">
              {legal.map((l) => (
                <Link key={l.label} href={l.href} className="bz-footer-link">{l.label}</Link>
              ))}
            </div>
          </div>
        </div>

        {/* Trust row */}
        <div className="bz-footer-trust">
          <div className="bz-trust-item"><span>🔒</span><span>Secure &amp; verified sellers</span></div>
          <div className="bz-trust-item"><span>📍</span><span>Local buyers near you</span></div>
          <div className="bz-trust-item"><span>🆓</span><span>Free to list, always</span></div>
          <div className="bz-trust-item"><span>💬</span><span>Chat directly, no middleman</span></div>
        </div>

        {/* Bottom bar — copyright only (legal links live in the Legal column
            above; no need to repeat them here) */}
        <div className="bz-footer-bottom">
          <p className="bz-footer-copy">© {year} bazar.in — All rights reserved. Made with care in India.</p>
        </div>
      </div>
    </footer>
  );
}