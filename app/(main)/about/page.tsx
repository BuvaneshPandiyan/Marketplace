import type { Metadata } from "next";
import Link from "next/link";
import { BannerArt } from "@/components/ui/BannerArt";

export const metadata: Metadata = {
  title: "About us — bazar.in",
  description:
    "Why bazar.in exists: a local marketplace built to connect real buyers and sellers and shut out scammers with real-time photo and location capture.",
};

export const dynamic = "force-static";

/**
 * About us — the founder story.
 *
 * Deep BORDEAUX / oxblood-wine theme (warmer and browner than the hamburger's
 * bright cherry, so the two don't clash) with a blush rose-gold accent. Matches
 * the site's band + masked-fade + scroll-animation style.
 */
export default function AboutPage() {
  return (
    <div className="ab">
      <style>{`
        .ab { background: #f5f4f2; min-height: 100vh; }

        /* ── Band ─────────────────────────────────────── */
        .ab-band {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #2b0a10 0%, #6b2130 52%, #9d3450 100%);
          -webkit-mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          padding: 60px 0 80px;
        }
        .ab-band-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        .ab-band-glow {
          position: absolute; top: -120px; right: -60px;
          width: 340px; height: 340px; border-radius: 50%;
          background: radial-gradient(circle, rgba(179,74,99,0.45) 0%, transparent 70%);
          animation: ab-breathe 9s ease-in-out infinite; pointer-events: none;
        }
        @keyframes ab-breathe { 0%,100%{transform:scale(1);opacity:0.85} 50%{transform:scale(1.14);opacity:1} }
        .ab-band-inner {
          position: relative; z-index: 1;
          max-width: 1600px; margin: 0 auto; padding: 0 16px;
        }
        @media(min-width:768px){ .ab-band-inner { padding: 0 32px; } }
        .ab-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
          color: #fff; margin: 0 0 16px;
          padding: 5px 12px; border-radius: 999px;
          background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.22);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
          text-shadow: 0 1px 8px rgba(0,0,0,0.4);
        }
        .ab-title {
          font-size: clamp(30px, 5vw, 52px); font-weight: 900; letter-spacing: -0.045em;
          line-height: 1.02; color: #fff; margin: 0; max-width: 900px;
          text-shadow: 0 2px 22px rgba(0,0,0,0.4);
        }
        .ab-title em { font-style: normal; color: #f0a8b4; }
        .ab-sub {
          font-size: clamp(15px, 2vw, 18px); font-weight: 600; line-height: 1.55;
          color: rgba(255,255,255,0.9); margin: 18px 0 0; max-width: 620px;
          text-shadow: 0 1px 10px rgba(0,0,0,0.4);
        }

        /* ── Body ─────────────────────────────────────── */
        .ab-wrap {
          max-width: 1600px; margin: -32px auto 0; padding: 0 16px 100px;
          position: relative; z-index: 1;
        }
        @media(min-width:768px){ .ab-wrap { padding: 0 32px 100px; } }

        .ab-card {
          background: #fff; border-radius: 22px; border: 1px solid #ececea;
          box-shadow: 0 12px 44px rgba(0,0,0,0.07);
          padding: 48px; max-width: 1400px; margin: 0 auto;
          animation: ab-rise 650ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @media(max-width:820px){ .ab-card { padding: 32px 26px; } }
        @media(max-width:520px){ .ab-card { padding: 26px 20px; border-radius: 16px; } }
        @keyframes ab-rise { from{opacity:0;transform:translateY(26px)} to{opacity:1;transform:none} }

        /* Stat strip */
        .ab-stats {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
          margin-bottom: 44px;
        }
        @media(max-width:640px){ .ab-stats { grid-template-columns: 1fr; gap: 12px; } }
        .ab-stat {
          padding: 20px 22px; border-radius: 16px;
          background: linear-gradient(135deg, #fdf2f4, #fff5f6);
          border: 1px solid #f6cdd5;
          animation: ab-reveal linear both; animation-timeline: view(); animation-range: entry 0% cover 20%;
        }
        @keyframes ab-reveal { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        .ab-stat-n { font-size: 28px; font-weight: 900; letter-spacing: -0.03em; color: #9d3450; line-height: 1; }
        .ab-stat-l { font-size: 12.5px; font-weight: 600; color: #6b7280; margin-top: 6px; }

        /* Prose */
        .ab-section { animation: ab-reveal linear both; animation-timeline: view(); animation-range: entry 0% cover 18%; }
        @supports not (animation-timeline: view()) { .ab-section, .ab-stat { opacity: 1; transform: none; animation: none; } }
        .ab-h2 {
          font-size: clamp(22px, 3vw, 28px); font-weight: 900; letter-spacing: -0.035em;
          color: #1c1917; margin: 44px 0 16px; scroll-margin-top: 96px;
          display: flex; align-items: center; gap: 12px;
          transition: color 220ms ease;
        }
        .ab-section:hover .ab-h2 { color: #9d3450; }
        .ab-h2 .ab-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
          background: linear-gradient(135deg, #6b2130, #9d3450); color: #fff;
          font-size: 15px; font-weight: 800; box-shadow: 0 4px 14px rgba(157,52,80,0.35);
          animation: ab-num-float 4.5s ease-in-out infinite;
          transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1);
        }
        .ab-section:hover .ab-num { transform: scale(1.12) rotate(-6deg); }
        @keyframes ab-num-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }

        .ab p { font-size: 15.5px; line-height: 1.8; color: #44403c; margin: 0 0 18px; max-width: 76ch; }
        .ab p.ab-lead { font-size: 18px; line-height: 1.7; color: #292524; font-weight: 500; }
        .ab strong { color: #1c1917; font-weight: 700; }
        .ab em.ab-hl { font-style: normal; background: linear-gradient(180deg, transparent 62%, #f6cdd5 62%); padding: 0 2px; }

        /* Pull-quote */
        .ab-quote {
          margin: 32px 0; padding: 24px 28px; border-radius: 16px;
          background: linear-gradient(135deg, #2b0a10, #6b2130); color: #fff;
          position: relative; overflow: hidden;
        }
        .ab-quote::before {
          content: "“"; position: absolute; top: -10px; left: 16px;
          font-size: 90px; color: rgba(255,255,255,0.12); font-family: Georgia, serif; line-height: 1;
        }
        .ab-quote p { font-size: clamp(17px, 2.4vw, 21px); font-weight: 700; line-height: 1.5; color: #fff; margin: 0; max-width: none; position: relative; }

        /* Values grid */
        .ab-values { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0 8px; }
        @media(max-width:760px){ .ab-values { grid-template-columns: 1fr; } }
        .ab-value {
          padding: 22px; border-radius: 16px; background: #fafaf9; border: 1px solid #ececea;
          transition: transform 260ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 260ms ease, border-color 260ms ease;
        }
        .ab-value:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(157,52,80,0.14); border-color: #f6cdd5; }
        .ab-value-ic { font-size: 26px; line-height: 1; margin-bottom: 12px; display: inline-block; transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1); }
        .ab-value:hover .ab-value-ic { transform: scale(1.18) rotate(-6deg); }
        .ab-value h3 { font-size: 16px; font-weight: 800; letter-spacing: -0.02em; color: #1c1917; margin: 0 0 6px; }
        .ab-value p { font-size: 13.5px; line-height: 1.6; color: #57534e; margin: 0; max-width: none; }

        /* Founder note */
        .ab-founder {
          margin-top: 44px; padding: 28px 30px; border-radius: 18px;
          background: linear-gradient(135deg, #fdf2f4, #fff5f6); border: 1px solid #f6cdd5;
        }
        .ab-founder p { font-style: italic; color: #44403c; }
        .ab-sign { font-size: 15px; font-weight: 800; color: #9d3450; margin-top: 6px; font-style: normal; }
        .ab-sign small { display: block; font-size: 12.5px; font-weight: 600; color: #78716c; margin-top: 2px; }

        /* CTA */
        .ab-cta {
          margin-top: 44px; text-align: center; padding: 40px 24px; border-radius: 18px;
          background: linear-gradient(135deg, #2b0a10, #6b2130 55%, #9d3450);
          position: relative; overflow: hidden;
        }
        .ab-cta h2 { font-size: clamp(22px, 3vw, 30px); font-weight: 900; letter-spacing: -0.04em; color: #fff; margin: 0 0 8px; }
        .ab-cta p { color: rgba(255,255,255,0.82); font-size: 14.5px; margin: 0 auto 20px; max-width: 460px; }
        .ab-cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .ab-btn {
          display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; border-radius: 999px;
          font-size: 14px; font-weight: 700; text-decoration: none;
          transition: transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease;
        }
        .ab-btn-primary { background: #fff; color: #9d3450; }
        .ab-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,0,0,0.25); }
        .ab-btn-ghost { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.25); }
        .ab-btn-ghost:hover { transform: translateY(-2px); background: rgba(255,255,255,0.16); }

        @media(prefers-reduced-motion:reduce){
          .ab-card, .ab-section, .ab-stat, .ab-num, .ab-band-glow, .ab-value, .ab-value-ic, .ab-btn {
            animation: none !important; transition: none !important;
          }
          .ab-card, .ab-section, .ab-stat { opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* Band */}
      <div className="ab-band">
        <BannerArt variant="aurora" tint="#b34a63" tint2="#f0a8b4" id="about" />
        <div className="ab-band-grid" aria-hidden="true" />
        <div className="ab-band-glow" aria-hidden="true" />
        <div className="ab-band-inner">
          <p className="ab-eyebrow">✦ Our story</p>
          <h1 className="ab-title">A marketplace built on <em>trust</em>, not luck.</h1>
          <p className="ab-sub">
            bazar.in exists to connect real buyers and sellers near you — and to shut the door on
            the scammers who have made every other marketplace feel like a gamble.
          </p>
        </div>
      </div>

      <div className="ab-wrap">
        <div className="ab-card">
          {/* Stats */}
          <div className="ab-stats">
            <div className="ab-stat"><div className="ab-stat-n">100%</div><div className="ab-stat-l">Listings verified at the source</div></div>
            <div className="ab-stat"><div className="ab-stat-n">0</div><div className="ab-stat-l">Tolerance for fake photos</div></div>
            <div className="ab-stat"><div className="ab-stat-n">1</div><div className="ab-stat-l">Simple promise: real people, real items</div></div>
          </div>

          <p className="ab-lead">
            Every big idea starts with a small, annoying moment. Ours started with a phone, a
            &quot;too-good-to-be-true&quot; deal, and the sinking feeling of being played.
          </p>

          <div className="ab-section">
            <h2 className="ab-h2"><span className="ab-num">1</span> Where it began</h2>
            <p>
              I was twenty-four, saving up for months to buy a second-hand camera. I found the
              perfect one on a popular marketplace app — mint condition, great price, glossy photos.
              I messaged the seller. He was friendly, quick to reply, and just a little too eager. He
              asked for a small advance to &quot;hold&quot; it because, he said, three other people
              were interested. I paid. The chat went silent. The account vanished. The photos, I
              later realised, had been lifted from a shopping website months earlier.
            </p>
            <p>
              It wasn&apos;t even a lot of money. But it stung in a way money doesn&apos;t usually
              explain. I had done everything &quot;right&quot; — and the platform had done nothing to
              stop it. When I complained, I got an automated reply and a shrug. I started reading, and
              I realised I wasn&apos;t alone: <strong>the internet was full of people who&apos;d been
              burned the exact same way.</strong> Stolen photos. Fake sellers. Advance-payment traps.
              Entire marketplaces where half the &quot;deals&quot; were bait.
            </p>
          </div>

          <div className="ab-quote">
            <p>The problem was never the buyers or the sellers. It was that nobody could prove who was real.</p>
          </div>

          <div className="ab-section">
            <h2 className="ab-h2"><span className="ab-num">2</span> The realisation</h2>
            <p>
              The more I dug, the clearer it got. Almost every scam I read about had <em className="ab-hl">one thing in common</em>: the
              scammer never had the item. They used photos pulled from Google, a stock listing, or
              someone else&apos;s old post. They were selling a picture, not a product. And because the
              platforms let anyone upload any image from anywhere, there was nothing standing between a
              genuine seller and a con artist. A real listing and a fake one looked identical.
            </p>
            <p>
              That was the insight that wouldn&apos;t leave me alone: <strong>if you could force the
              photo to be taken right there, in the moment, of the actual item — a scammer&apos;s
              whole game falls apart.</strong> You can steal a photo. You can&apos;t steal a live
              camera pointed at something you don&apos;t have.
            </p>
          </div>

          <div className="ab-section">
            <h2 className="ab-h2"><span className="ab-num">3</span> The idea that became bazar</h2>
            <p>
              So I built the thing I wished had existed the day I got scammed. On bazar.in, you
              can&apos;t just upload any picture from your gallery and call it a listing. When you list
              an item, we ask you to <strong>capture it live</strong> — a real-time photo, taken
              through the app, of the actual thing you&apos;re selling. Alongside it, we capture your{" "}
              <strong>location at the moment of listing</strong>. Two small frictions that change
              everything.
            </p>
            <p>
              A scammer sitting in a boiler room with a folder of stolen images suddenly has nothing.
              They can&apos;t point a live camera at a camera they don&apos;t own. They can&apos;t fake
              being in the neighbourhood they claim to sell from. The people left standing are the ones
              who actually have the item, in their hands, near you. <em className="ab-hl">That&apos;s the whole point.</em>
            </p>
          </div>

          <div className="ab-section">
            <h2 className="ab-h2"><span className="ab-num">4</span> How we keep it real</h2>
            <div className="ab-values">
              <div className="ab-value">
                <span className="ab-value-ic" aria-hidden="true">📸</span>
                <h3>Real-time photo capture</h3>
                <p>Listings are shot live through the app, of the real item — no stolen or stock images sneaking in.</p>
              </div>
              <div className="ab-value">
                <span className="ab-value-ic" aria-hidden="true">📍</span>
                <h3>Location at listing</h3>
                <p>We capture where an item is listed, so &quot;local&quot; actually means local — and distant scammers stand out.</p>
              </div>
              <div className="ab-value">
                <span className="ab-value-ic" aria-hidden="true">🛡️</span>
                <h3>Safety by design</h3>
                <p>On-platform chat, verification signals, and scam detection built in from day one, not bolted on later.</p>
              </div>
            </div>
          </div>

          <div className="ab-section">
            <h2 className="ab-h2"><span className="ab-num">5</span> What we&apos;re really building</h2>
            <p>
              bazar.in isn&apos;t trying to be the biggest marketplace. It&apos;s trying to be the one
              you can <strong>trust</strong>. A place where a student selling an old phone and a family
              furnishing a new home can meet without either one wondering if the other is a ghost. A
              place that feels like your neighbourhood — real people, real things, close by.
            </p>
            <p>
              I started this alone, with a laptop and a grudge against scammers. It&apos;s grown into
              something with a clear soul: <strong>connect real buyers and sellers, and make life
              miserable for the fakes.</strong> Every feature we build gets measured against that.
            </p>
          </div>

          {/* Founder note */}
          <div className="ab-founder">
            <p>
              &quot;I built bazar.in because I was tired of feeling like buying something second-hand
              meant rolling the dice. If this app saves even one person the sinking feeling I had that
              day, it was worth every late night. Thanks for being here — let&apos;s make trading
              feel human again.&quot;
            </p>
            <p className="ab-sign">
              — The Founder
              <small>Founder &amp; builder, bazar.in</small>
            </p>
          </div>

          {/* CTA */}
          <div className="ab-cta">
            <h2>Ready to buy or sell the honest way?</h2>
            <p>Join a marketplace where every listing is real, local, and captured in the moment.</p>
            <div className="ab-cta-btns">
              <Link href="/sell" className="ab-btn ab-btn-primary">Post your first listing →</Link>
              <Link href="/" className="ab-btn ab-btn-ghost">Browse listings</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}