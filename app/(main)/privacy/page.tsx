import type { Metadata } from "next";
import { LegalPage, LegalLink, type LegalTheme } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — bazar.in",
  description:
    "How bazar.in collects, uses, shares and protects your personal data, and the rights you have over it. Compliant with India's DPDP Act 2023 and the GDPR.",
};

export const dynamic = "force-static";

// Deep VIOLET theme (recoloured from orange).
const theme: LegalTheme = {
  band: ["#2e1065", "#5b21b6", "#7c3aed"],
  eyebrow: "#c4b5fd",
  accent: "#7c3aed",
  accentSoft: "#a78bfa",
  glow: "rgba(124,58,237,0.4)",
  tldrBg: "linear-gradient(135deg, #f5f3ff, #faf5ff)",
  tldrBorder: "#ddd6fe",
  tldrHead: "#6d28d9",
  tldrText: "#4c1d95",
  chip: "linear-gradient(135deg, #6d28d9, #8b5cf6)",
  navHover: "#7c3aed",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      theme={theme}
      bandImage="/images/privacy-header.png"
      eyebrow="🔒 Your privacy"
      titleLead="Privacy"
      titleAccent="Policy"
      updated="July 2026"
      intro={
        <>
          At <strong>bazar.in</strong> (&quot;bazar&quot;, &quot;we&quot;, &quot;us&quot;), your trust is the
          whole business. This policy explains — in plain language — what personal data we
          collect, why, who we share it with, how long we keep it, and the rights you have to
          control it. It applies to everyone who uses our website and app.
        </>
      }
      tldr={{
        heading: "The short version",
        body: (
          <>
            We collect only what we need to run a safe marketplace, we never sell your personal
            data, we use it mainly to connect buyers and sellers and keep bad actors out, and you
            can access, correct or delete your data at any time. The details are below.
          </>
        ),
      }}
      sections={[
        {
          id: "overview", label: "Overview", heading: "Overview",
          body: (
            <p>
              bazar.in is a local classifieds marketplace where people list items and services for
              sale or rent and connect with nearby buyers. To make that work — and keep it safe — we
              handle some personal data. We are the <strong>data fiduciary</strong> (under India&apos;s
              Digital Personal Data Protection Act, 2023) and the <strong>data controller</strong>
              (under the EU/UK GDPR) responsible for that data.
            </p>
          ),
        },
        {
          id: "collect", label: "What we collect", heading: "What we collect",
          body: (
            <>
              <h3 className="pp-h3">Information you give us</h3>
              <ul>
                <li><strong>Account details</strong> — name, phone number, email, and password (stored only as a secure hash).</li>
                <li><strong>Profile</strong> — optional photo, bio, and preferred locality.</li>
                <li><strong>Listings</strong> — titles, descriptions, prices, categories, attributes, and photos you upload.</li>
                <li><strong>Messages</strong> — the content of chats you send other users through the platform.</li>
                <li><strong>Verification data</strong> — limited identity signals, where verification is needed, to confirm you are a real person.</li>
                <li><strong>Support requests</strong> — anything you tell us when you contact us.</li>
              </ul>
              <h3 className="pp-h3">Information we collect automatically</h3>
              <ul>
                <li><strong>Location</strong> — your chosen or approximate device location, to show listings near you. You control this.</li>
                <li><strong>Device &amp; usage</strong> — device type, browser, IP address, pages viewed and actions taken, for security and to improve the product.</li>
                <li><strong>Photo metadata</strong> — for in-app captures we may read technical EXIF data (capture time and location) to help detect fraud and confirm listings are genuine.</li>
                <li><strong>Cookies &amp; similar</strong> — see our <LegalLink href="/cookies">Cookie Policy</LegalLink>.</li>
              </ul>
            </>
          ),
        },
        {
          id: "use", label: "How we use it", heading: "How we use your data",
          body: (
            <>
              <ul>
                <li>To create and manage your account and show your listings to buyers.</li>
                <li>To connect buyers and sellers, including chat and enquiry notifications.</li>
                <li>To show relevant, nearby listings using your location and preferences.</li>
                <li>To keep the marketplace safe — detecting fraud, spam, scams and prohibited items.</li>
                <li>To provide customer support and respond to your requests.</li>
                <li>To send service messages (and, only with your consent, marketing you can opt out of anytime).</li>
                <li>To understand how the product is used so we can improve it.</li>
                <li>To comply with legal obligations and enforce our terms.</li>
              </ul>
              <p>We do <strong>not</strong> sell your personal data to third parties. Ever.</p>
            </>
          ),
        },
        {
          id: "legal-basis", label: "Legal bases", heading: "Legal bases",
          body: (
            <>
              <p>Where the GDPR applies, we rely on these legal bases:</p>
              <ul>
                <li><strong>Contract</strong> — to provide the marketplace you signed up for.</li>
                <li><strong>Consent</strong> — for optional things like precise location and marketing, which you can withdraw anytime.</li>
                <li><strong>Legitimate interests</strong> — to keep the platform secure, prevent fraud, and improve our service, balanced against your rights.</li>
                <li><strong>Legal obligation</strong> — where the law requires us to retain or disclose data.</li>
              </ul>
              <p>Under the DPDP Act 2023, we process your data on the basis of your consent or for legitimate uses permitted by the Act.</p>
            </>
          ),
        },
        {
          id: "share", label: "Who we share with", heading: "Who we share with",
          body: (
            <ul>
              <li><strong>Other users</strong> — your public profile, listings, and the messages you choose to send are visible to the people you interact with.</li>
              <li><strong>Service providers</strong> — vetted partners who host our infrastructure, send notifications, or help fight fraud, bound by contract to protect your data and use it only as instructed.</li>
              <li><strong>Legal &amp; safety</strong> — authorities where legally required, or to protect the rights, safety and property of our users and the public.</li>
              <li><strong>Business transfers</strong> — if bazar is involved in a merger or acquisition, data may transfer as part of that deal, subject to this policy.</li>
            </ul>
          ),
        },
        {
          id: "rights", label: "Your rights", heading: "Your rights",
          body: (
            <>
              <p>Depending on where you live, you have the right to:</p>
              <ul>
                <li><strong>Access</strong> a copy of the personal data we hold about you.</li>
                <li><strong>Correct</strong> data that is inaccurate or incomplete.</li>
                <li><strong>Delete</strong> your data (&quot;right to be forgotten&quot;), subject to legal limits.</li>
                <li><strong>Withdraw consent</strong> at any time, without affecting prior processing.</li>
                <li><strong>Object to or restrict</strong> certain processing, including direct marketing.</li>
                <li><strong>Data portability</strong> — receive your data in a portable format.</li>
                <li><strong>Grievance redressal</strong> — nominate someone to exercise your rights (per the DPDP Act), and complain to the Data Protection Board of India or your local supervisory authority.</li>
              </ul>
              <p>To exercise any of these, reach us via our <LegalLink href="/contact">contact page</LegalLink>. We respond within the timeframes the law requires.</p>
            </>
          ),
        },
        {
          id: "security", label: "Security", heading: "Security",
          body: (
            <p>
              We use appropriate technical and organisational measures — encryption in transit,
              hashed passwords, access controls and continuous monitoring — to protect your data. No
              system is perfectly secure, but we work hard to keep yours safe and will notify you and
              the relevant authorities of a breach where the law requires.
            </p>
          ),
        },
        {
          id: "retention", label: "Retention", heading: "How long we keep it",
          body: (
            <p>
              We keep your personal data only as long as needed for the purposes above — typically
              while your account is active. When you delete your account, we delete or anonymise your
              personal data within a reasonable period, except where we must retain records to comply
              with the law, resolve disputes, or prevent fraud and abuse.
            </p>
          ),
        },
        {
          id: "children", label: "Children", heading: "Children",
          body: (
            <p>
              bazar.in is not intended for anyone under 18. We do not knowingly collect data from
              children. If you believe a child has provided us data, contact us and we will remove it.
              Where required, we obtain verifiable parental consent before processing any data of a
              minor.
            </p>
          ),
        },
        {
          id: "changes", label: "Changes", heading: "Changes to this policy",
          body: (
            <p>
              We may update this policy as our service and the law evolve. When we make material
              changes, we&apos;ll update the &quot;Last updated&quot; date and, where appropriate, notify you in
              the app or by email. Please check back from time to time.
            </p>
          ),
        },
        {
          id: "contact", label: "Contact us", heading: "Contact us",
          body: (
            <p>
              Questions, requests or complaints about your privacy? Reach our Grievance Officer / Data
              Protection contact through our <LegalLink href="/contact">contact page</LegalLink>. We
              take every request seriously and will get back to you promptly.
            </p>
          ),
        },
      ]}
      footerNote={
        <>
          This Privacy Policy is provided in good faith and written to reflect India&apos;s Digital
          Personal Data Protection Act, 2023 and the EU/UK GDPR. It is a template and should be
          reviewed by qualified legal counsel — with your company&apos;s registered name, address and
          Grievance Officer details filled in — before you rely on it for your live business.
        </>
      }
    />
  );
}