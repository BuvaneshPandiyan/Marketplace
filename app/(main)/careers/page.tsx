import Link from "next/link";
import type { Metadata } from "next";
import { BannerArt } from "@/components/ui/BannerArt";

export const metadata: Metadata = {
  title: "Careers — bazar.in",
  description:
    "bazar.in isn't hiring right now. Here's what we're building, and how to reach us when we do open roles.",
};

// Nothing here is per-user or time-sensitive, so this renders once at build.
export const dynamic = "force-static";

export default function CareersPage() {
  return (
    <div className="cr-page">
      <style>{`
        /* ── CAREERS — graphite + lime ──────────────────────────── */
        .cr-page { background: #fafafa; }

        .cr-band {
          position: relative; overflow: hidden;
          background: linear-gradient(135deg, #18181b 0%, #2f2f35 52%, #52525b 100%);
          -webkit-mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          padding: 56px 0 76px;
        }
        @media(max-width:640px){ .cr-band { padding: 38px 0 56px; } }
        .cr-band-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
          background-size: 30px 30px;
        }
        .cr-band-glow {
          position: absolute; top: -110px; right: -60px; width: 320px; height: 320px;
          border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, rgba(163,230,53,0.28) 0%, transparent 70%);
          animation: cr-breathe 9s ease-in-out infinite;
        }
        @keyframes cr-breathe { 0%,100%{transform:scale(1);opacity:0.8} 50%{transform:scale(1.15);opacity:1} }
        .cr-band::before {
          content:""; position:absolute; top:0; bottom:0; left:-30%; width:30%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.07), transparent);
          transform: skewX(-18deg); animation: cr-shine 7s ease-in-out infinite;
          pointer-events:none; z-index:1;
        }
        @keyframes cr-shine { 0%{left:-30%} 55%,100%{left:130%} }

        .cr-band-inner {
          position: relative; z-index: 2; max-width: 1600px; margin: 0 auto; padding: 0 16px;
        }
        @media(min-width:768px){ .cr-band-inner { padding: 0 32px; } }

        .cr-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
          color: #fff; margin: 0 0 14px; padding: 5px 12px; border-radius: 999px;
          background: rgba(163,230,53,0.16); border: 1px solid rgba(163,230,53,0.4);
          backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        }
        .cr-title {
          font-size: clamp(28px, 5vw, 50px); font-weight: 900; letter-spacing: -0.045em;
          line-height: 1.03; color: #fff; margin: 0; max-width: 18ch;
          text-shadow: 0 2px 22px rgba(0,0,0,0.45);
          animation: cr-rise 560ms cubic-bezier(0.22,1,0.36,1) both;
        }
        .cr-title em { font-style: normal; color: #bef264; }
        @keyframes cr-rise { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        .cr-sub {
          font-size: 15px; font-weight: 500; color: rgba(255,255,255,0.78);
          margin: 14px 0 0; max-width: 56ch; line-height: 1.55;
          animation: cr-rise 560ms cubic-bezier(0.22,1,0.36,1) 110ms both;
        }

        .cr-wrap { max-width: 1600px; margin: -30px auto 0; padding: 0 16px 90px; position: relative; z-index: 2; }
        @media(min-width:768px){ .cr-wrap { padding: 0 32px 100px; } }

        /* On wide screens the page splits: the story on the left, a sticky
           facts rail on the right, so the extra width carries content rather
           than empty margin. */
        .cr-layout { display: grid; gap: 22px; }
        @media(min-width:1100px){ .cr-layout { grid-template-columns: minmax(0,1fr) 340px; align-items: start; } }

        .cr-card {
          background: #fff; border-radius: 24px; border: 1px solid #ececef;
          box-shadow: 0 16px 54px rgba(0,0,0,0.07);
          padding: 30px 24px; margin-bottom: 26px;
          animation: cr-rise 620ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @media(min-width:768px){ .cr-card { padding: 42px 46px; } }
        @media(min-width:1100px){ .cr-card { margin-bottom: 0; } }

        /* ── Sticky facts rail ── */
        .cr-rail { display: grid; gap: 14px; }
        @media(min-width:1100px){ .cr-rail { position: sticky; top: 96px; } }
        .cr-fact {
          background: #fff; border: 1px solid #ececef; border-radius: 18px;
          padding: 18px 20px; box-shadow: 0 8px 26px rgba(0,0,0,0.05);
          animation: cr-rise 620ms cubic-bezier(0.22,1,0.36,1) both;
          transition: transform 240ms cubic-bezier(0.22,1,0.36,1), box-shadow 240ms ease, border-color 240ms ease;
        }
        .cr-fact:nth-child(2){ animation-delay: 90ms; }
        .cr-fact:nth-child(3){ animation-delay: 180ms; }
        @media(hover:hover){
          .cr-fact:hover { transform: translateY(-3px); border-color: #bef264; box-shadow: 0 14px 34px rgba(101,163,13,0.14); }
        }
        .cr-fact-n {
          font-size: 30px; font-weight: 900; letter-spacing: -0.05em; margin: 0;
          background: linear-gradient(135deg, #4d7c0f, #a3e635);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }
        .cr-fact-l { font-size: 12.5px; font-weight: 700; color: #71717a; margin: 3px 0 0; letter-spacing: -0.01em; }
        .cr-fact-d { font-size: 12.5px; color: #a1a1aa; margin: 8px 0 0; line-height: 1.5; }

        /* The headline answer — big, unmissable, no hunting for it */
        .cr-status {
          display: flex; align-items: flex-start; gap: 16px;
          padding: 22px; border-radius: 18px;
          background: linear-gradient(135deg, #f7fee7, #ecfccb);
          border: 1.5px solid #d9f99d; margin-bottom: 30px;
        }
        .cr-status-ic {
          width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 22px;
          background: linear-gradient(135deg, #65a30d, #a3e635);
          box-shadow: 0 6px 18px rgba(101,163,13,0.32);
        }
        .cr-status-h { font-size: 19px; font-weight: 900; letter-spacing: -0.03em; color: #1a2e05; margin: 0 0 5px; }
        .cr-status-p { font-size: 14.5px; color: #3f4f24; margin: 0; line-height: 1.55; font-weight: 500; }

        .cr-h2 {
          font-size: 20px; font-weight: 900; letter-spacing: -0.035em; color: #18181b;
          margin: 0 0 12px; display: flex; align-items: center; gap: 10px;
        }
        .cr-h2::before {
          content: ""; width: 4px; height: 20px; border-radius: 4px; flex-shrink: 0;
          background: linear-gradient(135deg, #65a30d, #a3e635);
        }
        .cr-p { font-size: 15px; line-height: 1.7; color: #3f3f46; margin: 0 0 16px; max-width: 72ch; }
        .cr-p:last-child { margin-bottom: 0; }
        .cr-section { margin-bottom: 34px; }
        .cr-section:last-child { margin-bottom: 0; }

        /* What we'd look for, one day */
        .cr-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
        @media(min-width:640px){ .cr-list { grid-template-columns: 1fr 1fr; } }
        @media(min-width:1500px){ .cr-list { grid-template-columns: repeat(2, 1fr); } }
        .cr-item {
          display: flex; gap: 11px; align-items: flex-start;
          padding: 15px 16px; border-radius: 15px;
          background: #fafafa; border: 1px solid #ececed;
          transition: border-color 220ms ease, transform 220ms ease, box-shadow 220ms ease;
        }
        @media(hover:hover){
          .cr-item:hover { border-color: #bef264; transform: translateY(-2px); box-shadow: 0 8px 22px rgba(101,163,13,0.12); }
        }
        .cr-item-ic { font-size: 19px; flex-shrink: 0; line-height: 1.3; }
        .cr-item-h { font-size: 14.5px; font-weight: 800; letter-spacing: -0.02em; color: #18181b; margin: 0 0 3px; }
        .cr-item-p { font-size: 13.5px; color: #52525b; margin: 0; line-height: 1.5; }

        /* Closing call to action */
        .cr-cta {
          border-radius: 22px; padding: 34px 26px; text-align: center;
          background: linear-gradient(135deg, #18181b 0%, #2f2f35 55%, #52525b 100%);
          position: relative; overflow: hidden;
        }
        .cr-cta-h { font-size: 23px; font-weight: 900; letter-spacing: -0.035em; color: #fff; margin: 0 0 8px; }
        .cr-cta-h em { font-style: normal; color: #bef264; }
        .cr-cta-p { font-size: 14.5px; color: rgba(255,255,255,0.76); margin: 0 0 22px; line-height: 1.6; }
        .cr-btns { display: flex; gap: 11px; justify-content: center; flex-wrap: wrap; }
        .cr-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 12px 24px; border-radius: 999px; text-decoration: none;
          font-size: 14px; font-weight: 800; letter-spacing: -0.02em;
          transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms ease, background 200ms ease;
        }
        .cr-btn-primary { background: linear-gradient(135deg, #65a30d, #a3e635); color: #14200a; box-shadow: 0 8px 24px rgba(101,163,13,0.4); }
        .cr-btn-ghost { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.24); }
        @media(hover:hover){
          .cr-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 14px 32px rgba(101,163,13,0.55); }
          .cr-btn-ghost:hover { background: rgba(255,255,255,0.2); transform: translateY(-3px); }
        }

        /* Sections reveal as they scroll into view. Uses the native scroll
           timeline where supported; browsers without it just show the content. */
        @supports (animation-timeline: view()) {
          .cr-section, .cr-cta {
            animation: cr-reveal linear both;
            animation-timeline: view();
            animation-range: entry 0% cover 26%;
          }
        }
        @keyframes cr-reveal { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }

        /* Item icons drift on their own, so the page is never fully still */
        .cr-item-ic { animation: cr-bob 5s ease-in-out infinite; }
        .cr-item:nth-child(2) .cr-item-ic { animation-delay: -1.2s; }
        .cr-item:nth-child(3) .cr-item-ic { animation-delay: -2.4s; }
        .cr-item:nth-child(4) .cr-item-ic { animation-delay: -3.6s; }
        @keyframes cr-bob { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(-4px) rotate(-6deg)} }

        /* The status badge keeps a soft pulse */
        .cr-status-ic { animation: cr-pulse 3.2s ease-in-out infinite; }
        @keyframes cr-pulse {
          0%,100% { box-shadow: 0 6px 18px rgba(101,163,13,0.32), 0 0 0 0 rgba(163,230,53,0.5); }
          50%     { box-shadow: 0 6px 18px rgba(101,163,13,0.32), 0 0 0 12px rgba(163,230,53,0); }
        }

        @media(prefers-reduced-motion:reduce){
          .cr-section, .cr-cta, .cr-item-ic, .cr-status-ic, .cr-fact { animation: none !important; opacity: 1 !important; transform: none !important; }
          .cr-band-glow, .cr-band::before, .cr-title, .cr-sub, .cr-card,
          .cr-item, .cr-btn { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* ── BANNER ── */}
      <div className="cr-band">
        <BannerArt variant="glyphs" tint="#a3e635" tint2="#84cc16" id="careers" />
        <div className="cr-band-grid" aria-hidden="true" />
        <div className="cr-band-glow" aria-hidden="true" />
        <div className="cr-band-inner">
          <p className="cr-eyebrow">💼 Careers</p>
          <h1 className="cr-title">
            We&apos;re not hiring <em>right now</em>
          </h1>
          <p className="cr-sub">
            bazar.in is a small, focused project — and honestly, that&apos;s the whole point.
            There are no open roles today, but here&apos;s what we&apos;re building and how to
            find us when that changes.
          </p>
        </div>
      </div>

      <div className="cr-wrap">
        <div className="cr-layout">
        <div className="cr-card">
          {/* The answer, up front */}
          <div className="cr-status">
            <span className="cr-status-ic" aria-hidden="true">🌱</span>
            <div>
              <p className="cr-status-h">No open positions at the moment</p>
              <p className="cr-status-p">
                We aren&apos;t accepting applications right now, and we&apos;d rather tell you
                that plainly than leave a form up that nobody reads. When we do open a role,
                it&apos;ll be posted on this page first.
              </p>
            </div>
          </div>

          <div className="cr-section">
            <h2 className="cr-h2">Why so small?</h2>
            <p className="cr-p">
              bazar.in was built to fix one specific problem: people getting scammed by
              sellers who never had the item in the first place. Solving that well matters
              more to us than growing headcount. A small team means every decision — what
              gets built, what gets refused, how a listing is verified — stays close to
              that original purpose.
            </p>
            <p className="cr-p">
              We&apos;d rather be a marketplace people trust than a company that looks
              impressive on paper.
            </p>
          </div>

          <div className="cr-section">
            <h2 className="cr-h2">What we&apos;d look for</h2>
            <p className="cr-p">
              If and when we do hire, these are the things that would matter to us — worth
              knowing in advance if you think you&apos;d be a fit.
            </p>
            <ul className="cr-list">
              <li className="cr-item">
                <span className="cr-item-ic" aria-hidden="true">🛡️</span>
                <div>
                  <p className="cr-item-h">Care about trust</p>
                  <p className="cr-item-p">Anti-fraud isn&apos;t a feature here, it&apos;s the reason the product exists.</p>
                </div>
              </li>
              <li className="cr-item">
                <span className="cr-item-ic" aria-hidden="true">🇮🇳</span>
                <div>
                  <p className="cr-item-h">Understand local commerce</p>
                  <p className="cr-item-p">How people actually buy and sell in Indian neighbourhoods, not in theory.</p>
                </div>
              </li>
              <li className="cr-item">
                <span className="cr-item-ic" aria-hidden="true">🔨</span>
                <div>
                  <p className="cr-item-h">Build things end to end</p>
                  <p className="cr-item-p">Comfortable owning a problem from idea through to what users actually see.</p>
                </div>
              </li>
              <li className="cr-item">
                <span className="cr-item-ic" aria-hidden="true">✂️</span>
                <div>
                  <p className="cr-item-h">Know what to leave out</p>
                  <p className="cr-item-p">Saying no to features is harder, and usually more valuable, than adding them.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="cr-section">
            <h2 className="cr-h2">Still want to get in touch?</h2>
            <p className="cr-p">
              Go ahead. If you&apos;ve built something in this space, spotted a flaw in how we
              verify listings, or just think there&apos;s a role we haven&apos;t thought of —
              we&apos;d genuinely like to hear it. We read everything, though we can&apos;t
              always reply quickly.
            </p>
          </div>
        </div>

        {/* Sticky facts rail — carries the extra width on large screens */}
        <aside className="cr-rail">
          <div className="cr-fact">
            <p className="cr-fact-n">0</p>
            <p className="cr-fact-l">Open roles</p>
            <p className="cr-fact-d">Nothing available today. This page updates first when that changes.</p>
          </div>
          <div className="cr-fact">
            <p className="cr-fact-n">100%</p>
            <p className="cr-fact-l">Free to list</p>
            <p className="cr-fact-d">No listing fees, no commission — the marketplace stays free to use.</p>
          </div>
          <div className="cr-fact">
            <p className="cr-fact-n">1</p>
            <p className="cr-fact-l">Problem we care about</p>
            <p className="cr-fact-d">Stopping people from being scammed by sellers who never had the item.</p>
          </div>
        </aside>
        </div>

        {/* Closing CTA */}
        <div className="cr-cta">
          <p className="cr-cta-h">
            Nothing open — but <em>say hello</em> anyway
          </p>
          <p className="cr-cta-p">
            Ideas, feedback and bug reports are always welcome.
          </p>
          <div className="cr-btns">
            <Link href="/contact" className="cr-btn cr-btn-primary">
              Contact us
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </Link>
            <Link href="/about" className="cr-btn cr-btn-ghost">Read our story</Link>
          </div>
        </div>
      </div>
    </div>
  );
}