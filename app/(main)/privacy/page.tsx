import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — bazar.in",
  description:
    "How bazar.in collects, uses, shares and protects your personal data, and the rights you have over it. Compliant with India's DPDP Act 2023 and the GDPR.",
};

// Static page — no data fetching, safe to fully pre-render.
export const dynamic = "force-static";

/**
 * Privacy Policy.
 *
 * Written to be genuinely useful and readable, not just a wall of legalese, while
 * still covering the commitments a marketplace like this needs: what we collect,
 * why, the legal bases, who we share it with, how long we keep it, and the rights
 * users have under India's Digital Personal Data Protection Act 2023 and the GDPR.
 *
 * This is a strong, plain-English template. It is NOT a substitute for review by a
 * qualified lawyer before you rely on it in production — company name, address,
 * grievance officer, and retention specifics must be confirmed for your entity.
 */

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "collect", label: "What we collect" },
  { id: "use", label: "How we use it" },
  { id: "legal-basis", label: "Legal bases" },
  { id: "share", label: "Who we share with" },
  { id: "cookies", label: "Cookies & tracking" },
  { id: "retention", label: "How long we keep it" },
  { id: "rights", label: "Your rights" },
  { id: "security", label: "Security" },
  { id: "children", label: "Children" },
  { id: "transfers", label: "International transfers" },
  { id: "changes", label: "Changes" },
  { id: "contact", label: "Contact us" },
];

export default function PrivacyPage() {
  const updated = "July 2026";

  return (
    <div className="pp">
      <style>{`
        .pp { background: #f5f4f2; min-height: 100vh; }

        /* Band */
        .pp-band {
          position: relative;
          background: linear-gradient(135deg, #0c0a09 0%, #431407 55%, #9a3412 100%);
          overflow: hidden;
          -webkit-mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 86%, transparent 100%);
          padding: 44px 0 60px;
        }
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
          background: radial-gradient(circle, rgba(234,88,12,0.4) 0%, transparent 70%);
          animation: pp-breathe 9s ease-in-out infinite; pointer-events: none;
        }
        @keyframes pp-breathe { 0%,100%{transform:scale(1);opacity:0.85} 50%{transform:scale(1.14);opacity:1} }
        .pp-band-inner {
          position: relative; z-index: 1;
          max-width: 1100px; margin: 0 auto; padding: 0 20px;
        }
        @media(min-width:768px){ .pp-band-inner { padding: 0 32px; } }
        .pp-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 11.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
          color: #fdba74; margin: 0 0 14px;
        }
        .pp-title {
          font-size: clamp(28px, 4vw, 42px); font-weight: 900; letter-spacing: -0.045em;
          line-height: 1.05; color: #fff; margin: 0;
        }
        .pp-title em { font-style: normal; color: #fb923c; }
        .pp-sub { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.72); margin: 12px 0 0; }

        /* Layout */
        .pp-wrap {
          max-width: 1100px; margin: 0 auto; padding: 0 20px 100px;
          display: grid; grid-template-columns: 220px minmax(0,1fr); gap: 40px;
          margin-top: -28px; position: relative; z-index: 1;
        }
        @media(min-width:768px){ .pp-wrap { padding: 0 32px 100px; } }
        @media(max-width:820px){ .pp-wrap { grid-template-columns: 1fr; gap: 0; } .pp-nav { display: none; } }

        /* Sticky in-page nav */
        .pp-nav { position: sticky; top: 96px; align-self: start; }
        .pp-nav-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin: 0 0 12px; }
        .pp-nav a {
          display: block; font-size: 13px; color: #57534e; text-decoration: none;
          padding: 6px 0; border-left: 2px solid transparent; padding-left: 12px;
          transition: color 160ms ease, border-color 160ms ease;
        }
        .pp-nav a:hover { color: #ea580c; border-color: #ea580c; }

        /* Content card */
        .pp-card {
          background: #fff; border-radius: 18px; border: 1px solid #ececea;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05);
          padding: 40px;
        }
        @media(max-width:520px){ .pp-card { padding: 26px 20px; border-radius: 14px; } }

        .pp-intro { font-size: 15px; line-height: 1.75; color: #44403c; margin: 0 0 8px; }
        .pp-tldr {
          margin: 22px 0 8px; padding: 18px 20px; border-radius: 14px;
          background: linear-gradient(135deg, #fff7ed, #fffbeb);
          border: 1px solid #fed7aa;
        }
        .pp-tldr h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #c2410c; margin: 0 0 8px; }
        .pp-tldr p { font-size: 13.5px; line-height: 1.7; color: #7c2d12; margin: 0; }

        .pp-h2 {
          font-size: 21px; font-weight: 900; letter-spacing: -0.03em; color: #1c1917;
          margin: 40px 0 14px; scroll-margin-top: 96px;
          display: flex; align-items: center; gap: 10px;
        }
        .pp-h2 .pp-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0;
          background: linear-gradient(135deg, #ea580c, #f97316); color: #fff;
          font-size: 13px; font-weight: 800;
        }
        .pp-h3 { font-size: 15px; font-weight: 800; color: #292524; margin: 22px 0 8px; }
        .pp p, .pp li { font-size: 14.5px; line-height: 1.75; color: #44403c; }
        .pp p { margin: 0 0 14px; }
        .pp ul { margin: 0 0 16px; padding-left: 20px; }
        .pp li { margin-bottom: 8px; }
        .pp li::marker { color: #ea580c; }
        .pp strong { color: #1c1917; font-weight: 700; }
        .pp a.pp-inline { color: #ea580c; font-weight: 600; text-decoration: none; }
        .pp a.pp-inline:hover { text-decoration: underline; }

        .pp-note {
          margin-top: 40px; padding: 18px 20px; border-radius: 12px;
          background: #fafaf9; border: 1px solid #ececea;
          font-size: 12.5px; line-height: 1.7; color: #78716c;
        }
      `}</style>

      {/* Band */}
      <div className="pp-band">
        <div className="pp-band-grid" aria-hidden="true" />
        <div className="pp-band-glow" aria-hidden="true" />
        <div className="pp-band-inner">
          <p className="pp-eyebrow">🔒 Your privacy</p>
          <h1 className="pp-title">Privacy <em>Policy</em></h1>
          <p className="pp-sub">Last updated {updated} · Plain-English, and built for real compliance.</p>
        </div>
      </div>

      <div className="pp-wrap">
        {/* Sticky nav */}
        <nav className="pp-nav" aria-label="On this page">
          <p className="pp-nav-title">On this page</p>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.label}</a>
          ))}
        </nav>

        {/* Content */}
        <div className="pp-card">
          <p className="pp-intro">
            At <strong>bazar.in</strong> (&quot;bazar&quot;, &quot;we&quot;, &quot;us&quot;), your trust is the
            whole business. This policy explains — in plain language — what personal data we
            collect, why we collect it, who we share it with, how long we keep it, and the rights
            you have to control it. It applies to everyone who uses our website and app.
          </p>

          <div className="pp-tldr">
            <h3>The short version</h3>
            <p>
              We collect only what we need to run a safe marketplace, we never sell your
              personal data, we use it mainly to connect buyers and sellers and keep bad actors
              out, and you can access, correct or delete your data at any time. The details are
              below.
            </p>
          </div>

          <h2 id="overview" className="pp-h2"><span className="pp-num">1</span> Overview</h2>
          <p>
            bazar.in is a local classifieds marketplace where people list items and services for
            sale or rent and connect with nearby buyers. To make that work — and to keep it safe —
            we need to handle some personal data. We are the <strong>data fiduciary</strong> (under
            India&apos;s Digital Personal Data Protection Act, 2023) and the <strong>data
            controller</strong> (under the EU/UK GDPR) responsible for that data.
          </p>

          <h2 id="collect" className="pp-h2"><span className="pp-num">2</span> What we collect</h2>
          <h3 className="pp-h3">Information you give us</h3>
          <ul>
            <li><strong>Account details</strong> — name, phone number, email, and password (stored only as a secure hash).</li>
            <li><strong>Profile</strong> — optional photo, bio, and preferred locality.</li>
            <li><strong>Listings</strong> — titles, descriptions, prices, categories, attributes, and the photos you upload.</li>
            <li><strong>Messages</strong> — the content of chats you send to other users through the platform.</li>
            <li><strong>Verification data</strong> — where verification is needed, limited identity signals to confirm you are a real person.</li>
            <li><strong>Support requests</strong> — anything you tell us when you contact us.</li>
          </ul>
          <h3 className="pp-h3">Information we collect automatically</h3>
          <ul>
            <li><strong>Location</strong> — your chosen or approximate device location, so we can show listings near you. You control this.</li>
            <li><strong>Device &amp; usage</strong> — device type, browser, IP address, pages viewed, and actions taken, used for security and to improve the product.</li>
            <li><strong>Photo metadata</strong> — where you capture photos in-app, we may read technical EXIF data (such as capture time and location) to help detect fraud and confirm listings are genuine.</li>
            <li><strong>Cookies &amp; similar</strong> — see the <a className="pp-inline" href="#cookies">Cookies</a> section.</li>
          </ul>

          <h2 id="use" className="pp-h2"><span className="pp-num">3</span> How we use your data</h2>
          <ul>
            <li>To create and manage your account and show your listings to buyers.</li>
            <li>To connect buyers and sellers, including chat and enquiry notifications.</li>
            <li>To show relevant, nearby listings using your location and preferences.</li>
            <li>To keep the marketplace safe — detecting fraud, spam, scams, and prohibited items.</li>
            <li>To provide customer support and respond to your requests.</li>
            <li>To send you service messages (and, only with your consent, marketing you can opt out of anytime).</li>
            <li>To understand how the product is used so we can improve it.</li>
            <li>To comply with legal obligations and enforce our terms.</li>
          </ul>
          <p>We do <strong>not</strong> sell your personal data to third parties. Ever.</p>

          <h2 id="legal-basis" className="pp-h2"><span className="pp-num">4</span> Legal bases</h2>
          <p>Where the GDPR applies, we rely on these legal bases:</p>
          <ul>
            <li><strong>Contract</strong> — to provide the marketplace you signed up for.</li>
            <li><strong>Consent</strong> — for optional things like precise location and marketing, which you can withdraw anytime.</li>
            <li><strong>Legitimate interests</strong> — to keep the platform secure, prevent fraud, and improve our service, balanced against your rights.</li>
            <li><strong>Legal obligation</strong> — where the law requires us to retain or disclose data.</li>
          </ul>
          <p>Under the DPDP Act 2023, we process your data on the basis of your consent or for legitimate uses permitted by the Act.</p>

          <h2 id="share" className="pp-h2"><span className="pp-num">5</span> Who we share with</h2>
          <ul>
            <li><strong>Other users</strong> — your public profile, listings, and the messages you choose to send are visible to the people you interact with.</li>
            <li><strong>Service providers</strong> — vetted partners who host our infrastructure, send notifications, or help us fight fraud, bound by contracts to protect your data and use it only as we instruct.</li>
            <li><strong>Legal &amp; safety</strong> — authorities where we are legally required, or to protect the rights, safety, and property of our users and the public.</li>
            <li><strong>Business transfers</strong> — if bazar is involved in a merger or acquisition, data may transfer as part of that deal, subject to this policy.</li>
          </ul>

          <h2 id="cookies" className="pp-h2"><span className="pp-num">6</span> Cookies &amp; tracking</h2>
          <p>
            We use cookies and similar technologies to keep you logged in, remember your
            preferences, keep the site secure, and understand aggregate usage. Essential cookies
            are required for the site to work; analytics and preference cookies are optional and
            you can control them through your browser settings or our cookie controls.
          </p>

          <h2 id="retention" className="pp-h2"><span className="pp-num">7</span> How long we keep it</h2>
          <p>
            We keep your personal data only as long as needed for the purposes above — typically
            for as long as your account is active. When you delete your account, we delete or
            anonymise your personal data within a reasonable period, except where we must retain
            certain records to comply with the law, resolve disputes, or prevent fraud and abuse.
          </p>

          <h2 id="rights" className="pp-h2"><span className="pp-num">8</span> Your rights</h2>
          <p>Depending on where you live, you have the right to:</p>
          <ul>
            <li><strong>Access</strong> a copy of the personal data we hold about you.</li>
            <li><strong>Correct</strong> data that is inaccurate or incomplete.</li>
            <li><strong>Delete</strong> your data (&quot;right to be forgotten&quot;), subject to legal limits.</li>
            <li><strong>Withdraw consent</strong> at any time, without affecting prior processing.</li>
            <li><strong>Object to or restrict</strong> certain processing, including direct marketing.</li>
            <li><strong>Data portability</strong> — receive your data in a portable format.</li>
            <li><strong>Grievance redressal</strong> — nominate someone to exercise your rights on your behalf (as provided under the DPDP Act), and complain to the Data Protection Board of India or your local supervisory authority.</li>
          </ul>
          <p>To exercise any of these, contact us using the details below. We&apos;ll respond within the timeframes the law requires.</p>

          <h2 id="security" className="pp-h2"><span className="pp-num">9</span> Security</h2>
          <p>
            We use appropriate technical and organisational measures — encryption in transit,
            hashed passwords, access controls, and continuous monitoring — to protect your data.
            No system is perfectly secure, but we work hard to keep yours safe and will notify you
            and the relevant authorities of a breach where the law requires.
          </p>

          <h2 id="children" className="pp-h2"><span className="pp-num">10</span> Children</h2>
          <p>
            bazar.in is not intended for anyone under 18. We do not knowingly collect data from
            children. If you believe a child has provided us data, contact us and we will remove
            it. Where required, we obtain verifiable parental consent before processing any data of
            a person who is a minor.
          </p>

          <h2 id="transfers" className="pp-h2"><span className="pp-num">11</span> International transfers</h2>
          <p>
            Your data is primarily processed in India. Where we transfer data to service providers
            in other countries, we ensure appropriate safeguards are in place so your data receives
            a comparable level of protection, and only to jurisdictions permitted under applicable law.
          </p>

          <h2 id="changes" className="pp-h2"><span className="pp-num">12</span> Changes to this policy</h2>
          <p>
            We may update this policy as our service and the law evolve. When we make material
            changes, we&apos;ll update the &quot;Last updated&quot; date above and, where appropriate,
            notify you in the app or by email. Please check back from time to time.
          </p>

          <h2 id="contact" className="pp-h2"><span className="pp-num">13</span> Contact us</h2>
          <p>
            Questions, requests, or complaints about your privacy? Reach our Grievance Officer /
            Data Protection contact through our <Link className="pp-inline" href="/contact">contact page</Link>.
            We take every request seriously and will get back to you promptly.
          </p>

          <div className="pp-note">
            This Privacy Policy is provided in good faith and written to reflect the requirements of
            India&apos;s Digital Personal Data Protection Act, 2023 and the EU/UK GDPR. It is a
            template and should be reviewed by qualified legal counsel — and have your company&apos;s
            registered name, address, and Grievance Officer details filled in — before you rely on
            it for your live business.
          </div>
        </div>
      </div>
    </div>
  );
}