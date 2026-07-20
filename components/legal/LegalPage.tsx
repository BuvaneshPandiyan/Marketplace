import Link from "next/link";
import type { ReactNode } from "react";
import { LegalBandArt } from "@/components/legal/LegalBandArt";

/**
 * Shared layout for the site's legal / policy pages (Terms, Cookies, Safety,
 * Privacy can adopt it too). Matches the Privacy page's look — a coloured band
 * with grid texture + glow, a sticky in-page nav, and numbered sections in a
 * white card — but takes a `theme` so each page gets its own distinct colour
 * from the site's palette.
 *
 * Content is passed as structured sections so the pages stay short and readable.
 */

export type LegalTheme = {
  /** band gradient stops, dark → mid → accent */
  band: [string, string, string];
  /** small eyebrow text colour on the band */
  eyebrow: string;
  /** the accent word in the title + numbered chips + inline links */
  accent: string;
  /** lighter accent for the title's highlighted word */
  accentSoft: string;
  /** glow blob colour (rgba) */
  glow: string;
  /** tldr box background gradient + border + heading + text */
  tldrBg: string;
  tldrBorder: string;
  tldrHead: string;
  tldrText: string;
  /** numbered chip gradient */
  chip: string;
  /** sticky-nav hover colour */
  navHover: string;
};

export type LegalSection = {
  id: string;
  label: string;   // shown in the sticky nav
  heading: string; // shown as the section title
  body: ReactNode; // the section content (already-styled with .pp p / ul / etc via className)
};

export function LegalPage({
  eyebrow,
  titleLead,
  titleAccent,
  updated,
  intro,
  tldr,
  sections,
  theme,
  footerNote,
  bandImage,
}: {
  eyebrow: string;
  titleLead: string;
  titleAccent: string;
  updated: string;
  intro: ReactNode;
  tldr: { heading: string; body: ReactNode };
  sections: LegalSection[];
  theme: LegalTheme;
  footerNote: ReactNode;
  /** optional band background image path, e.g. "/images/privacy-header.png" */
  bandImage?: string;
}) {
  return (
    <div className="pp">
      <style>{`
        .pp { background: #f5f4f2; min-height: 100vh; }

        .pp-band {
          position: relative;
          background: linear-gradient(135deg, ${theme.band[0]} 0%, ${theme.band[1]} 55%, ${theme.band[2]} 100%);
          overflow: hidden;
          -webkit-mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          padding: 56px 0 72px;
        }
        .pp-band-art {
          position:absolute; inset:0; opacity:0.4; pointer-events:none;
          -webkit-mask-image: linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.55) 40%, #000 85%);
          mask-image: linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.55) 40%, #000 85%);
          animation: pp-art-in 900ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes pp-art-in { from{opacity:0;transform:scale(1.06)} }
        .pp-band-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        .pp-band-glow {
          position: absolute; top: -110px; right: -60px;
          width: 320px; height: 320px; border-radius: 50%;
          background: radial-gradient(circle, ${theme.glow} 0%, transparent 70%);
          animation: pp-breathe 9s ease-in-out infinite; pointer-events: none;
        }
        @keyframes pp-breathe { 0%,100%{transform:scale(1);opacity:0.85} 50%{transform:scale(1.14);opacity:1} }
        .pp-band-inner { position: relative; z-index: 1; max-width: 1600px; margin: 0 auto; padding: 0 16px; }
        @media(min-width:768px){ .pp-band-inner { padding: 0 32px; } }
        .pp-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
          color: #fff; margin: 0 0 14px;
          padding: 5px 11px; border-radius: 999px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.22);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          text-shadow: 0 1px 8px rgba(0,0,0,0.4);
        }
        .pp-title {
          font-size: clamp(28px, 4vw, 44px); font-weight: 900; letter-spacing: -0.045em;
          line-height: 1.04; color: #fff; margin: 0;
          text-shadow: 0 2px 20px rgba(0,0,0,0.45);
        }
        .pp-title em { font-style: normal; color: ${theme.accentSoft}; }
        .pp-sub {
          font-size: 14.5px; font-weight: 600; color: rgba(255,255,255,0.92);
          margin: 14px 0 0; text-shadow: 0 1px 10px rgba(0,0,0,0.5);
        }

        .pp-wrap {
          max-width: 1600px; margin: 0 auto; padding: 0 16px 100px;
          display: grid; grid-template-columns: 280px minmax(0,1fr); gap: 56px;
          margin-top: -28px; position: relative; z-index: 1;
        }
        @media(min-width:768px){ .pp-wrap { padding: 0 32px 100px; } }
        @media(max-width:820px){ .pp-wrap { grid-template-columns: 1fr; gap: 0; } .pp-nav { display: none; } }
        /* Keep the reading column at a comfortable measure even on wide screens —
           long text lines hurt readability, so the card caps its own width and the
           extra room goes to the sticky nav + generous gutters (like a real
           editorial layout). */
        /* Card fills the full content column — uses the whole screen width like
           the home page. To keep long legal text readable at this width, the body
           text sits in a comfortable measure inside the card (see .pp-card p/li). */
        .pp-card { max-width: none; }
        .pp-card > .pp-intro,
        .pp-card > .pp-tldr,
        .pp-card .pp-section > .pp-h2 { max-width: 100%; }
        /* Body copy caps its line length for readability while the card stays wide;
           lists/paragraphs read comfortably, the card fills the screen. */
        .pp p, .pp li, .pp-intro, .pp-tldr p { max-width: 78ch; }

        .pp-nav { position: sticky; top: 96px; align-self: start; }
        .pp-nav-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin: 0 0 12px; }
        .pp-nav a {
          display: block; font-size: 13px; color: #57534e; text-decoration: none;
          padding: 6px 0; border-left: 2px solid transparent; padding-left: 12px;
          transition: color 160ms ease, border-color 160ms ease;
        }
        .pp-nav a:hover { color: ${theme.navHover}; border-color: ${theme.navHover}; transform: translateX(3px); }

        /* ── Animations ──────────────────────────────── */
        /* Card fades up on load */
        .pp-card { animation: pp-rise 600ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes pp-rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
        /* Sticky-nav items stagger in */
        .pp-nav a { animation: pp-slide-in 500ms cubic-bezier(0.22,1,0.36,1) both; }
        .pp-nav a:nth-child(2){ animation-delay: 40ms; }
        .pp-nav a:nth-child(3){ animation-delay: 80ms; }
        .pp-nav a:nth-child(4){ animation-delay: 120ms; }
        .pp-nav a:nth-child(5){ animation-delay: 160ms; }
        .pp-nav a:nth-child(6){ animation-delay: 200ms; }
        .pp-nav a:nth-child(7){ animation-delay: 240ms; }
        .pp-nav a:nth-child(n+8){ animation-delay: 280ms; }
        @keyframes pp-slide-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
        /* Scroll-reveal each section as it enters the viewport (auto, no JS) */
        .pp-section { animation: pp-reveal linear both; animation-timeline: view(); animation-range: entry 0% cover 22%; }
        @keyframes pp-reveal { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }
        /* Numbered chip: gentle auto float + a pop on section hover */
        .pp-h2 .pp-num { animation: pp-num-float 4.5s ease-in-out infinite; transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1); }
        .pp-section:hover .pp-num { transform: scale(1.12) rotate(-6deg); }
        @keyframes pp-num-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        /* Heading nudges on hover */
        .pp-h2 { transition: color 200ms ease; }
        .pp-section:hover .pp-h2 { color: ${theme.accent}; }
        /* List items slide slightly on hover */
        .pp li { transition: transform 180ms ease, color 180ms ease; }
        .pp li:hover { transform: translateX(4px); color: #1c1917; }
        /* Fallback: browsers without scroll-timeline just show sections normally */
        @supports not (animation-timeline: view()) { .pp-section { opacity: 1; transform: none; animation: none; } }

        .pp-card {
          background: #fff; border-radius: 20px; border: 1px solid #ececea;
          box-shadow: 0 10px 40px rgba(0,0,0,0.07); padding: 44px 48px;
        }
        @media(max-width:820px){ .pp-card { padding: 32px 28px; } }
        @media(max-width:520px){ .pp-card { padding: 24px 18px; border-radius: 14px; } }

        .pp-intro { font-size: 15px; line-height: 1.75; color: #44403c; margin: 0 0 8px; }
        .pp-tldr {
          position: relative; margin: 26px 0 8px; padding: 20px 22px 20px 26px; border-radius: 16px;
          background: ${theme.tldrBg}; border: 1px solid ${theme.tldrBorder};
          box-shadow: 0 6px 22px ${theme.glow};
          overflow: hidden;
        }
        .pp-tldr::before {
          content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
          background: ${theme.chip};
        }
        .pp-tldr h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: ${theme.tldrHead}; margin: 0 0 8px; }
        .pp-tldr p { font-size: 13.5px; line-height: 1.7; color: ${theme.tldrText}; margin: 0; }

        .pp-section { padding-top: 8px; }
        .pp-section + .pp-section { border-top: 1px solid #f0efed; margin-top: 8px; }
        .pp-h2 {
          font-size: 22px; font-weight: 900; letter-spacing: -0.035em; color: #1c1917;
          margin: 36px 0 16px; scroll-margin-top: 96px;
          display: flex; align-items: center; gap: 12px;
        }
        .pp-h2 .pp-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
          background: ${theme.chip}; color: #fff; font-size: 14px; font-weight: 800;
          box-shadow: 0 4px 12px ${theme.glow};
        }
        .pp-h3 { font-size: 15px; font-weight: 800; color: #292524; margin: 22px 0 8px; }
        .pp p, .pp li { font-size: 14.5px; line-height: 1.75; color: #44403c; }
        .pp p { margin: 0 0 14px; }
        .pp ul { margin: 0 0 16px; padding-left: 20px; }
        .pp li { margin-bottom: 8px; }
        .pp li::marker { color: ${theme.accent}; }
        .pp strong { color: #1c1917; font-weight: 700; }
        .pp a.pp-inline { color: ${theme.accent}; font-weight: 600; text-decoration: none; }
        .pp a.pp-inline:hover { text-decoration: underline; }

        .pp-note {
          margin-top: 40px; padding: 18px 20px; border-radius: 12px;
          background: #fafaf9; border: 1px solid #ececea;
          font-size: 12.5px; line-height: 1.7; color: #78716c;
        }

        @media(prefers-reduced-motion:reduce){
          .pp-card, .pp-nav a, .pp-section, .pp-h2 .pp-num, .pp-band-glow, .pp-band-art {
            animation: none !important;
          }
          .pp-card, .pp-section { opacity: 1 !important; transform: none !important; }
          .pp-nav a, .pp li, .pp-h2, .pp-h2 .pp-num { transition: none !important; }
        }
      `}</style>

      <div className="pp-band">
        {bandImage && <LegalBandArt src={bandImage} scrim={theme.band[0]} />}
        <div className="pp-band-grid" aria-hidden="true" />
        <div className="pp-band-glow" aria-hidden="true" />
        <div className="pp-band-inner">
          <p className="pp-eyebrow">{eyebrow}</p>
          <h1 className="pp-title">{titleLead} <em>{titleAccent}</em></h1>
          <p className="pp-sub">Last updated {updated} · Plain-English, and built for real compliance.</p>
        </div>
      </div>

      <div className="pp-wrap">
        <nav className="pp-nav" aria-label="On this page">
          <p className="pp-nav-title">On this page</p>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.label}</a>
          ))}
        </nav>

        <div className="pp-card">
          <p className="pp-intro">{intro}</p>

          <div className="pp-tldr">
            <h3>{tldr.heading}</h3>
            <p>{tldr.body}</p>
          </div>

          {sections.map((s, i) => (
            <div key={s.id} className="pp-section">
              <h2 id={s.id} className="pp-h2"><span className="pp-num">{i + 1}</span> {s.heading}</h2>
              {s.body}
            </div>
          ))}

          <div className="pp-note">{footerNote}</div>
        </div>
      </div>
    </div>
  );
}

/** Inline link helper so pages can point at each other / contact. */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="pp-inline" href={href}>{children}</Link>;
}