import type { Metadata } from "next";
import { LegalPage, LegalLink, type LegalTheme } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — bazar.in",
  description: "The rules for using bazar.in — your account, listings, conduct, payments, disputes and the limits of our role as a marketplace venue.",
};

export const dynamic = "force-static";

// SLATE-BLUE theme.
const theme: LegalTheme = {
  band: ["#0f172a", "#1e3a5f", "#2563eb"],
  eyebrow: "#93c5fd",
  accent: "#2563eb",
  accentSoft: "#60a5fa",
  glow: "rgba(37,99,235,0.4)",
  tldrBg: "linear-gradient(135deg, #eff6ff, #f0f9ff)",
  tldrBorder: "#bfdbfe",
  tldrHead: "#1d4ed8",
  tldrText: "#1e3a8a",
  chip: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
  navHover: "#2563eb",
};

export default function TermsPage() {
  return (
    <LegalPage
      theme={theme}
      eyebrow="📜 The rules"
      titleLead="Terms of"
      titleAccent="Service"
      updated="July 2026"
      intro={
        <>
          These Terms are the agreement between you and <strong>bazar.in</strong> for using our
          website and app. By creating an account or using the platform, you accept them. They keep
          the marketplace fair and safe for everyone — please read them.
        </>
      }
      tldr={{
        heading: "The short version",
        body: (
          <>
            bazar.in is a venue that connects buyers and sellers — we&apos;re not a party to your deals.
            You&apos;re responsible for your listings and conduct, you must be 18+, no illegal or
            prohibited items, and be honest and respectful. Meet safely and verify before paying.
          </>
        ),
      }}
      sections={[
        {
          id: "eligibility", label: "Eligibility", heading: "Eligibility",
          body: (
            <p>
              You must be at least <strong>18 years old</strong> and able to form a binding contract
              to use bazar.in. By using the platform you confirm you meet these requirements and that
              the information you give us is accurate.
            </p>
          ),
        },
        {
          id: "account", label: "Your account", heading: "Your account",
          body: (
            <ul>
              <li>You&apos;re responsible for your account and for keeping your login secure.</li>
              <li>One person, one account — don&apos;t impersonate others or create accounts to evade a ban.</li>
              <li>Tell us promptly if you suspect unauthorised use of your account.</li>
              <li>You&apos;re responsible for everything posted or done through your account.</li>
            </ul>
          ),
        },
        {
          id: "venue", label: "Our role", heading: "Our role — a venue, not a party",
          body: (
            <p>
              bazar.in is a <strong>venue</strong> that lets users list items and connect with each
              other. We are <strong>not a party</strong> to any transaction, we don&apos;t own, inspect,
              or guarantee any listed item, and we don&apos;t take part in the actual buying, selling,
              payment or delivery. Any deal is strictly between the buyer and seller. See our{" "}
              <LegalLink href="/safety">Safety &amp; Trust</LegalLink> guidance before you transact.
            </p>
          ),
        },
        {
          id: "listings", label: "Listings", heading: "Listings & content",
          body: (
            <>
              <p>When you post a listing or any content, you agree that:</p>
              <ul>
                <li>It&apos;s accurate, lawful, and something you have the right to sell.</li>
                <li>You own or have permission to use the photos and text you upload.</li>
                <li>You grant bazar.in a licence to host and display your content to operate the service.</li>
                <li>We may remove any listing that breaks these Terms or the law, at our discretion.</li>
              </ul>
            </>
          ),
        },
        {
          id: "prohibited", label: "Prohibited items", heading: "Prohibited items & conduct",
          body: (
            <>
              <p>You may not list, sell, or use bazar.in for:</p>
              <ul>
                <li>Illegal, stolen, counterfeit, recalled, or hazardous goods.</li>
                <li>Weapons, drugs, tobacco, alcohol, or other regulated/restricted items where prohibited.</li>
                <li>Live animals in violation of law, adult content, or anything that exploits or endangers minors.</li>
                <li>Spam, scams, fraud, phishing, or misleading listings.</li>
                <li>Harassment, hate speech, threats, or infringing others&apos; rights.</li>
              </ul>
            </>
          ),
        },
        {
          id: "payments", label: "Payments", heading: "Payments & fees",
          body: (
            <p>
              Listing on bazar.in is currently <strong>free</strong>. If we introduce paid features,
              we&apos;ll show the price clearly before you pay. Any payment between a buyer and seller is
              arranged directly between them — we don&apos;t process or hold those funds, and we
              recommend caution with advance payments.
            </p>
          ),
        },
        {
          id: "termination", label: "Suspension", heading: "Suspension & termination",
          body: (
            <p>
              We may suspend or terminate your access if you break these Terms, put others at risk, or
              use the platform unlawfully. You can stop using bazar.in and delete your account at any
              time. Some provisions (like liability limits) survive termination.
            </p>
          ),
        },
        {
          id: "disclaimer", label: "Disclaimers", heading: "Disclaimers",
          body: (
            <p>
              The platform is provided &quot;as is&quot;. We don&apos;t warrant that listings are accurate,
              that users are who they claim to be, or that the service will be uninterrupted or
              error-free. You use bazar.in and transact with other users at your own risk.
            </p>
          ),
        },
        {
          id: "liability", label: "Liability", heading: "Limitation of liability",
          body: (
            <p>
              To the fullest extent permitted by law, bazar.in is not liable for disputes between
              users, the quality, safety or legality of listed items, or any loss arising from a
              transaction. Nothing here limits liability that cannot be excluded under applicable law.
            </p>
          ),
        },
        {
          id: "law", label: "Governing law", heading: "Governing law",
          body: (
            <p>
              These Terms are governed by the laws of India, and any disputes are subject to the
              jurisdiction of the competent courts in India, unless a mandatory local law provides
              otherwise for you as a consumer.
            </p>
          ),
        },
        {
          id: "changes", label: "Changes", heading: "Changes to these Terms",
          body: (
            <p>
              We may update these Terms as the service evolves. Material changes will be reflected in
              the &quot;Last updated&quot; date and, where appropriate, notified in-app. Continuing to use
              bazar.in after changes means you accept the updated Terms.
            </p>
          ),
        },
        {
          id: "contact", label: "Contact", heading: "Contact",
          body: (
            <p>
              Questions about these Terms? Reach us through our{" "}
              <LegalLink href="/contact">contact page</LegalLink>. See also our{" "}
              <LegalLink href="/privacy">Privacy Policy</LegalLink> and{" "}
              <LegalLink href="/cookies">Cookie Policy</LegalLink>.
            </p>
          ),
        },
      ]}
      footerNote={
        <>
          These Terms of Service are a plain-English template written for a local marketplace like
          bazar.in. They are not legal advice — have them reviewed by qualified counsel, with your
          company&apos;s registered name, jurisdiction and any paid-feature terms confirmed, before you
          rely on them in production.
        </>
      }
    />
  );
}