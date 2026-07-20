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
          padding: 44px 0 60px;
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
        .pp-band-inner { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 0 20px; }
        @media(min-width:768px){ .pp-band-inner { padding: 0 32px; } }
        .pp-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
          color: ${theme.eyebrow}; margin: 0 0 14px;
        }
        .pp-title {
          font-size: clamp(28px, 4vw, 42px); font-weight: 900; letter-spacing: -0.045em;
          line-height: 1.05; color: #fff; margin: 0;
        }
        .pp-title em { font-style: normal; color: ${theme.accentSoft}; }
        .pp-sub { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.72); margin: 12px 0 0; }

        .pp-wrap {
          max-width: 1100px; margin: 0 auto; padding: 0 20px 100px;
          display: grid; grid-template-columns: 220px minmax(0,1fr); gap: 40px;
          margin-top: -28px; position: relative; z-index: 1;
        }
        @media(min-width:768px){ .pp-wrap { padding: 0 32px 100px; } }
        @media(max-width:820px){ .pp-wrap { grid-template-columns: 1fr; gap: 0; } .pp-nav { display: none; } }

        .pp-nav { position: sticky; top: 96px; align-self: start; }
        .pp-nav-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin: 0 0 12px; }
        .pp-nav a {
          display: block; font-size: 13px; color: #57534e; text-decoration: none;
          padding: 6px 0; border-left: 2px solid transparent; padding-left: 12px;
          transition: color 160ms ease, border-color 160ms ease;
        }
        .pp-nav a:hover { color: ${theme.navHover}; border-color: ${theme.navHover}; }

        .pp-card {
          background: #fff; border-radius: 18px; border: 1px solid #ececea;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05); padding: 40px;
        }
        @media(max-width:520px){ .pp-card { padding: 26px 20px; border-radius: 14px; } }

        .pp-intro { font-size: 15px; line-height: 1.75; color: #44403c; margin: 0 0 8px; }
        .pp-tldr {
          margin: 22px 0 8px; padding: 18px 20px; border-radius: 14px;
          background: ${theme.tldrBg}; border: 1px solid ${theme.tldrBorder};
        }
        .pp-tldr h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: ${theme.tldrHead}; margin: 0 0 8px; }
        .pp-tldr p { font-size: 13.5px; line-height: 1.7; color: ${theme.tldrText}; margin: 0; }

        .pp-h2 {
          font-size: 21px; font-weight: 900; letter-spacing: -0.03em; color: #1c1917;
          margin: 40px 0 14px; scroll-margin-top: 96px;
          display: flex; align-items: center; gap: 10px;
        }
        .pp-h2 .pp-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0;
          background: ${theme.chip}; color: #fff; font-size: 13px; font-weight: 800;
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
            <div key={s.id}>
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