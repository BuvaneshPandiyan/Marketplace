/**
 * Floating WhatsApp + Instagram buttons, used only on the Contact page.
 *
 * Deliberately a SERVER component: these are plain <a> tags with CSS-only
 * hover/labels, so this ships zero JavaScript to the browser. Nothing here
 * needs state, so nothing here should cost the user a hydration pass.
 *
 * Positioning note: the mobile nav is a floating pill pinned to bottom:12px
 * (~64px tall), so on mobile these sit above it. On desktop the nav is at the
 * top, so they drop back down to the corner.
 */
import {
  SUPPORT_WHATSAPP,
  INSTAGRAM_URL,
  INSTAGRAM_HANDLE,
  buildWhatsAppUrl,
  buildSupportEnquiryMessage,
} from "@/lib/support";

export function FloatingSocials() {
  const whatsappUrl = buildWhatsAppUrl(
    SUPPORT_WHATSAPP,
    buildSupportEnquiryMessage()
  );

  return (
    <>
      <style>{`
        /* Always fixed bottom-right. This page has no sticky action bar, so the
           only obstruction is the nav pill below 640px (bottom:12, ~54px tall,
           full width) — 76px clears it. From 640px up the nav moves to the top
           of the screen and the real corner is free. Matches the listing page's
           WhatsApp dock exactly, so the button doesn't jump between pages. */
        .fs-dock {
          position: fixed;
          right: 16px;
          bottom: calc(76px + env(safe-area-inset-bottom));
          z-index: 95;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (min-width: 640px) {
          .fs-dock { right: 24px; bottom: 24px; gap: 14px; }
        }

        .fs-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          position: relative;
          color: #fff;
          transition: transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 260ms ease;
        }
        @media (min-width: 640px) { .fs-btn { width: 56px; height: 56px; } }
        .fs-btn:hover  { transform: scale(1.09); }
        .fs-btn:active { transform: scale(0.92); }
        .fs-btn:focus-visible {
          outline: 3px solid #1a1a1a;
          outline-offset: 3px;
        }

        .fs-wa {
          background: linear-gradient(135deg, #25d366, #128c7e);
          box-shadow: 0 6px 22px rgba(37, 211, 102, 0.42);
        }
        .fs-wa:hover { box-shadow: 0 8px 30px rgba(37, 211, 102, 0.55); }

        .fs-ig {
          background: linear-gradient(135deg, #833ab4 0%, #e1306c 55%, #fcaf45 100%);
          box-shadow: 0 6px 22px rgba(193, 53, 132, 0.42);
        }
        .fs-ig:hover { box-shadow: 0 8px 30px rgba(193, 53, 132, 0.55); }

        /* Label slides out on hover — CSS only, no JS tooltip */
        .fs-label {
          position: absolute;
          right: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%) translateX(6px);
          background: #1a1a1a;
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: -0.01em;
          padding: 6px 12px;
          border-radius: 100px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 160ms ease, transform 160ms ease;
        }
        .fs-btn:hover .fs-label,
        .fs-btn:focus-visible .fs-label {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
        /* Touch devices can't hover — the label would just never show, so hide it */
        @media (hover: none) { .fs-label { display: none; } }

        /* Gentle attention pulse on the WhatsApp ring, once the page settles */
        @keyframes fs-pulse {
          0%, 100% { box-shadow: 0 6px 22px rgba(37,211,102,0.42), 0 0 0 0 rgba(37,211,102,0.45); }
          50%      { box-shadow: 0 6px 22px rgba(37,211,102,0.42), 0 0 0 12px rgba(37,211,102,0); }
        }
        .fs-wa { animation: fs-pulse 2.6s ease-out 1.2s infinite; }

        @media (prefers-reduced-motion: reduce) {
          .fs-btn, .fs-label { transition: none !important; }
          .fs-wa { animation: none !important; }
          .fs-btn:hover { transform: none !important; }
        }
      `}</style>

      <div className="fs-dock">
        {/* Instagram sits above WhatsApp so the primary channel stays closest to the thumb */}
        {INSTAGRAM_URL && (
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="fs-btn fs-ig"
            aria-label={`Follow bazar.in on Instagram${INSTAGRAM_HANDLE ? ` (@${INSTAGRAM_HANDLE})` : ""}`}
          >
            <span className="fs-label" aria-hidden="true">Instagram</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
            </svg>
          </a>
        )}

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fs-btn fs-wa"
          aria-label="Chat with bazar.in support on WhatsApp"
        >
          <span className="fs-label" aria-hidden="true">Chat with support</span>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413" />
          </svg>
        </a>
      </div>
    </>
  );
}