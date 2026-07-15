import type { Metadata } from "next";
import { FloatingSocials } from "@/components/contact/FloatingSocials";
import {
  SUPPORT_EMAIL,
  SUPPORT_WHATSAPP,
  SUPPORT_WHATSAPP_DISPLAY,
  SUPPORT_HOURS,
  buildWhatsAppUrl,
  buildSupportEnquiryMessage,
} from "@/lib/support";

/**
 * PERFORMANCE
 * -----------
 * This page reads no cookies, hits no database and holds no state, so it is
 * rendered once at build time and served from Cloudflare's edge cache as static
 * HTML. `force-static` makes that explicit rather than leaving it to inference.
 *
 * It's also a Server Component with no "use client" child except none at all —
 * the FAQ uses <details>, the buttons are <a> tags, the hover effects are CSS.
 * Net page-specific JavaScript: zero bytes.
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Contact us · bazar.in",
  description:
    "Get help with your listings, your account, or a buyer or seller you've dealt with. Reach bazar.in support on WhatsApp or by email.",
};

// The topics people actually message a classifieds platform about. Each chip
// opens WhatsApp with that topic already filled into the message template, so
// support gets a categorised enquiry instead of "hi".
const HELP_TOPICS = [
  "My listing was removed or flagged",
  "I can't log in or receive my OTP",
  "Reporting a suspicious buyer or seller",
  "Editing or deleting my ad",
  "Seller verification",
  "Something else",
];

const FAQS = [
  {
    q: "How do I contact a seller about an item?",
    a: "Open the listing and use the WhatsApp button, the chat, or the phone number. The WhatsApp button writes the message for you with the item, price and link already filled in — you just hit send. You'll need to be logged in first, so sellers aren't exposed to scrapers.",
  },
  {
    q: "Why was my listing taken down?",
    a: "Listings get flagged automatically when photos look reused from another ad, when a photo's location doesn't match the listing's location, or when the text matches something on our blocked list. If you think that's wrong, message us on WhatsApp with the listing link and we'll take a look.",
  },
  {
    q: "Is my phone number visible to everyone?",
    a: "No. Your number is hidden until a logged-in buyer taps to reveal it on your listing, and every reveal is recorded. It's never in the page for search engines or scrapers to pick up.",
  },
  {
    q: "How do I stay safe when buying or selling?",
    a: "Meet in a public place during daylight, inspect the item fully before paying, and don't pay any advance, token or delivery fee to someone you haven't met. Nobody from bazar.in will ever ask you for an OTP or a payment.",
  },
  {
    q: "How long until someone replies?",
    a: `WhatsApp is fastest — usually well under an hour during support hours (${SUPPORT_HOURS}). Email typically gets a reply within one working day.`,
  },
];

export default function ContactPage() {
  const whatsappUrl = buildWhatsAppUrl(
    SUPPORT_WHATSAPP,
    buildSupportEnquiryMessage()
  );
  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Support request — bazar.in"
  )}`;

  return (
    <>
      <style>{`
        /* ─────────────────────────────────────────────────────────────
           CONTACT PAGE
           Type is doing the heavy lifting: heavy weights, tight tracking,
           big steps between sizes. No web font is loaded — the system stack
           renders on the first paint, which is the whole point.
           ───────────────────────────────────────────────────────────── */

        .ct-page {
          --ct-orange: #ea580c;
          --ct-orange-light: #f97316;
          --ct-tint: #fff7ed;
          --ct-ink: #1a1a1a;
          --ct-muted: #6b7280;
          --ct-line: #f0f0f0;
          --ct-wa: #25d366;
          --ct-wa-deep: #128c7e;
          background: #fff;
          min-height: 100vh;
          padding-bottom: 40px;
        }

        .ct-wrap { max-width: var(--page-max); margin: 0 auto; padding: 0 16px; }
        @media (min-width: 640px) { .ct-wrap { padding: 0 24px; } }

        /* ── HERO ───────────────────────────────────────────────────── */
        .ct-hero {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #1a0a00 0%, #7c2000 45%, #ea580c 100%);
          padding: 40px 0 44px;
        }
        @media (min-width: 640px) { .ct-hero { padding: 64px 0 68px; border-radius: 0 0 32px 32px; } }
        @media (min-width: 1024px) { .ct-hero { padding: 80px 0 84px; } }

        .ct-hero-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        /* Soft warm bloom in the corner, so the gradient isn't a flat sweep */
        .ct-hero-glow {
          position: absolute; top: -120px; right: -80px;
          width: 380px; height: 380px; border-radius: 50%;
          background: radial-gradient(circle, rgba(249,115,22,0.5) 0%, transparent 70%);
          pointer-events: none;
        }
        .ct-hero-inner { position: relative; }

        .ct-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.14);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.08em; text-transform: uppercase;
          padding: 6px 13px; border-radius: 100px;
          margin-bottom: 18px;
        }
        .ct-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #4ade80; flex-shrink: 0;
          box-shadow: 0 0 0 3px rgba(74,222,128,0.25);
        }

        .ct-h1 {
          color: #fff; margin: 0 0 12px;
          font-size: 34px; font-weight: 900;
          letter-spacing: -0.045em; line-height: 1.04;
        }
        @media (min-width: 640px)  { .ct-h1 { font-size: 52px; } }
        @media (min-width: 1024px) { .ct-h1 { font-size: 62px; } }
        .ct-h1 em { font-style: normal; color: #fdba74; }

        .ct-sub {
          color: rgba(255,255,255,0.72);
          font-size: 15px; font-weight: 500; line-height: 1.5;
          margin: 0; max-width: 30ch;
        }
        @media (min-width: 640px) { .ct-sub { font-size: 17px; max-width: 52ch; } }

        /* ── METHOD CARDS ───────────────────────────────────────────── */
        .ct-methods {
          display: grid; grid-template-columns: 1fr; gap: 14px;
          margin-top: -28px; position: relative; z-index: 2;
        }
        @media (min-width: 768px) {
          .ct-methods { grid-template-columns: 1fr 1fr; gap: 18px; margin-top: -40px; }
        }

        /* ── WIDE LAYOUT ──────────────────────────────────────────────
           Below 1100px the page reads as one column. Above it, topics and
           FAQ sit side by side — the FAQ is the taller of the two, so it
           takes the wider track and the columns finish at roughly the same
           height instead of leaving a ragged gap. */
        .ct-cols { display: block; }
        @media (min-width: 1100px) {
          .ct-cols {
            display: grid;
            grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
            gap: 56px;
            align-items: start;
          }
          .ct-cols > .ct-section { margin-top: 60px; }
          .ct-methods { grid-template-columns: 1fr 1fr; }
        }

        .ct-card {
          display: flex; align-items: center; gap: 15px;
          background: #fff; border: 1px solid var(--ct-line);
          border-radius: 20px; padding: 18px;
          text-decoration: none;
          box-shadow: 0 4px 20px rgba(0,0,0,0.07);
          transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 240ms ease, border-color 240ms ease;
        }
        @media (min-width: 640px) { .ct-card { padding: 24px; border-radius: 24px; gap: 18px; } }
        @media (hover: hover) {
          .ct-card:hover { transform: translateY(-4px); box-shadow: 0 14px 38px rgba(0,0,0,0.11); }
          .ct-card:hover .ct-card-arrow { transform: translateX(4px); }
        }
        .ct-card:active { transform: scale(0.985); }
        .ct-card:focus-visible { outline: 3px solid var(--ct-orange); outline-offset: 3px; }
        .ct-card--wa:hover { border-color: rgba(37,211,102,0.45); }
        .ct-card--mail:hover { border-color: #fdba74; }

        .ct-icon {
          width: 50px; height: 50px; border-radius: 15px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; color: #fff;
        }
        @media (min-width: 640px) { .ct-icon { width: 56px; height: 56px; border-radius: 17px; } }
        .ct-icon--wa   { background: linear-gradient(135deg, var(--ct-wa), var(--ct-wa-deep)); }
        .ct-icon--mail { background: linear-gradient(135deg, var(--ct-orange), var(--ct-orange-light)); }

        .ct-card-body { flex: 1; min-width: 0; }
        .ct-card-kicker {
          font-size: 10px; font-weight: 800; letter-spacing: 0.09em;
          text-transform: uppercase; color: var(--ct-muted); margin: 0 0 3px;
        }
        .ct-card-title {
          font-size: 17px; font-weight: 800; letter-spacing: -0.025em;
          color: var(--ct-ink); margin: 0 0 3px;
        }
        @media (min-width: 640px) { .ct-card-title { font-size: 19px; } }
        .ct-card-value {
          font-size: 13px; font-weight: 600; color: var(--ct-muted); margin: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ct-card-arrow {
          flex-shrink: 0; color: #d1d5db;
          transition: transform 240ms cubic-bezier(0.34,1.56,0.64,1);
        }

        .ct-badge {
          display: inline-block; font-size: 10px; font-weight: 800;
          padding: 2px 7px; border-radius: 100px; margin-left: 6px;
          background: rgba(37,211,102,0.13); color: #0f7a4a;
          letter-spacing: 0.02em; vertical-align: middle;
        }

        /* ── SECTION HEADINGS ───────────────────────────────────────── */
        .ct-section { margin-top: 44px; }
        @media (min-width: 640px) { .ct-section { margin-top: 60px; } }
        .ct-h2 {
          font-size: 22px; font-weight: 900; letter-spacing: -0.035em;
          color: var(--ct-ink); margin: 0 0 4px;
        }
        @media (min-width: 640px) { .ct-h2 { font-size: 28px; } }
        .ct-h2-sub {
          font-size: 14px; font-weight: 500; color: var(--ct-muted);
          margin: 0 0 18px;
        }

        /* ── TOPIC CHIPS ────────────────────────────────────────────── */
        .ct-chips { display: flex; flex-wrap: wrap; gap: 9px; }
        .ct-chip {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 15px; border-radius: 100px;
          border: 1.5px solid #eee; background: #fff;
          font-size: 13px; font-weight: 600; color: #374151;
          text-decoration: none;
          transition: border-color 160ms ease, background 160ms ease,
                      color 160ms ease, transform 160ms ease;
        }
        @media (hover: hover) {
          .ct-chip:hover {
            border-color: var(--ct-orange); background: var(--ct-tint);
            color: var(--ct-orange); transform: translateY(-2px);
          }
        }
        .ct-chip:active { transform: scale(0.96); }
        .ct-chip:focus-visible { outline: 3px solid var(--ct-orange); outline-offset: 2px; }
        .ct-chip svg { color: var(--ct-wa); flex-shrink: 0; }

        /* ── FAQ (pure CSS, <details>) ──────────────────────────────── */
        .ct-faq { border-top: 1px solid var(--ct-line); }
        .ct-faq-item { border-bottom: 1px solid var(--ct-line); }
        .ct-faq-q {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 18px 2px; cursor: pointer;
          font-size: 15px; font-weight: 700; letter-spacing: -0.02em;
          color: var(--ct-ink); list-style: none;
          transition: color 160ms ease;
        }
        @media (min-width: 640px) { .ct-faq-q { font-size: 16px; padding: 21px 2px; } }
        .ct-faq-q::-webkit-details-marker { display: none; }
        .ct-faq-q:hover { color: var(--ct-orange); }
        .ct-faq-q:focus-visible { outline: 3px solid var(--ct-orange); outline-offset: -2px; border-radius: 8px; }
        .ct-faq-icon {
          flex-shrink: 0; width: 26px; height: 26px; border-radius: 50%;
          background: var(--ct-tint); color: var(--ct-orange);
          display: flex; align-items: center; justify-content: center;
          transition: transform 240ms cubic-bezier(0.22,1,0.36,1);
        }
        .ct-faq-item[open] .ct-faq-icon { transform: rotate(45deg); }
        .ct-faq-item[open] .ct-faq-q { color: var(--ct-orange); }
        .ct-faq-a {
          font-size: 14px; line-height: 1.65; color: var(--ct-muted);
          margin: 0; padding: 0 40px 20px 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .ct-faq-icon { transition: none !important; }
        }

        /* ── SAFETY NOTE ────────────────────────────────────────────── */
        .ct-safety {
          display: flex; gap: 13px; align-items: flex-start;
          margin-top: 40px; padding: 17px 18px;
          border-radius: 18px;
          background: var(--ct-tint); border: 1.5px solid #fed7aa;
        }
        .ct-safety-icon { flex-shrink: 0; color: var(--ct-orange); margin-top: 1px; }
        .ct-safety-title {
          font-size: 14px; font-weight: 800; color: #9a3412;
          margin: 0 0 3px; letter-spacing: -0.02em;
        }
        .ct-safety-text { font-size: 13px; line-height: 1.6; color: #9a3412; margin: 0; opacity: 0.85; }

        @media (prefers-reduced-motion: reduce) {
          .ct-card, .ct-chip, .ct-card-arrow { transition: none !important; }
          .ct-card:hover, .ct-chip:hover { transform: none !important; }
        }
      `}</style>

      <div className="ct-page">
        {/* ══ HERO ══════════════════════════════════════════════════ */}
        <section className="ct-hero">
          <div className="ct-hero-grid" aria-hidden="true" />
          <div className="ct-hero-glow" aria-hidden="true" />
          <div className="ct-wrap ct-hero-inner">
            <span className="ct-eyebrow">
              <span className="ct-dot" aria-hidden="true" />
              {SUPPORT_HOURS}
            </span>
            <h1 className="ct-h1">
              Stuck on something?<br />
              <em>Let&apos;s sort it out.</em>
            </h1>
            <p className="ct-sub">
              Message us on WhatsApp and you&apos;ll usually hear back within the hour.
              Tell us what&apos;s going on and we&apos;ll take it from there.
            </p>
          </div>
        </section>

        <div className="ct-wrap">
          {/* ══ CONTACT METHODS ═════════════════════════════════════ */}
          <section className="ct-methods">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ct-card ct-card--wa"
            >
              <span className="ct-icon ct-icon--wa" aria-hidden="true">
                <svg width="27" height="27" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413" />
                </svg>
              </span>
              <span className="ct-card-body">
                <span className="ct-card-kicker">Fastest</span>
                <span className="ct-card-title">
                  WhatsApp us
                  <span className="ct-badge">Replies in ~1 hr</span>
                </span>
                <span className="ct-card-value">{SUPPORT_WHATSAPP_DISPLAY}</span>
              </span>
              <svg className="ct-card-arrow" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>

            <a href={mailtoUrl} className="ct-card ct-card--mail">
              <span className="ct-icon ct-icon--mail" aria-hidden="true">
                <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="3" />
                  <path d="M2.5 7l8.4 5.6a2 2 0 0 0 2.2 0L21.5 7" />
                </svg>
              </span>
              <span className="ct-card-body">
                <span className="ct-card-kicker">For detailed issues</span>
                <span className="ct-card-title">Email us</span>
                <span className="ct-card-value">{SUPPORT_EMAIL}</span>
              </span>
              <svg className="ct-card-arrow" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </a>
          </section>

          <div className="ct-cols">
          {/* ══ TOPIC CHIPS ═════════════════════════════════════════ */}
          <section className="ct-section">
            <h2 className="ct-h2">What do you need help with?</h2>
            <p className="ct-h2-sub">
              Pick one and we&apos;ll open WhatsApp with your message already started.
            </p>
            <div className="ct-chips">
              {HELP_TOPICS.map((topic) => (
                <a
                  key={topic}
                  href={buildWhatsAppUrl(
                    SUPPORT_WHATSAPP,
                    buildSupportEnquiryMessage(topic)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ct-chip"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413A11.82 11.82 0 0 0 12.05 0m0 21.785h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                  </svg>
                  {topic}
                </a>
              ))}
            </div>
          </section>

          {/* ══ FAQ ═════════════════════════════════════════════════ */}
          <section className="ct-section">
            <h2 className="ct-h2">Common questions</h2>
            <p className="ct-h2-sub">Worth a look before you message — it might be quicker.</p>
            <div className="ct-faq">
              {FAQS.map(({ q, a }) => (
                <details key={q} className="ct-faq-item">
                  <summary className="ct-faq-q">
                    {q}
                    <span className="ct-faq-icon" aria-hidden="true">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="ct-faq-a">{a}</p>
                </details>
              ))}
            </div>
          </section>
          </div>

          {/* ══ SAFETY NOTE ═════════════════════════════════════════ */}
          <aside className="ct-safety">
            <svg className="ct-safety-icon" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
            <div>
              <p className="ct-safety-title">We will never ask for your OTP or a payment</p>
              <p className="ct-safety-text">
                Nobody from bazar.in will ask you for an OTP, a UPI PIN, or an advance
                fee — not on WhatsApp, not by email, not on a call. If someone claims
                to be us and asks, it&apos;s a scam. Report it on the number above.
              </p>
            </div>
          </aside>
        </div>

        {/* Floating WhatsApp + Instagram — this page only */}
        <FloatingSocials />
      </div>
    </>
  );
}