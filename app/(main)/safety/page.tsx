import type { Metadata } from "next";
import { LegalPage, LegalLink, type LegalTheme } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Safety & Trust — bazar.in",
  description: "How to buy and sell safely on bazar.in — meeting tips, payment safety, spotting scams, and how we help keep the marketplace trustworthy.",
};

export const dynamic = "force-static";

// TEAL-GREEN theme.
const theme: LegalTheme = {
  band: ["#042f2e", "#0f766e", "#14b8a6"],
  eyebrow: "#5eead4",
  accent: "#0d9488",
  accentSoft: "#2dd4bf",
  glow: "rgba(20,184,166,0.4)",
  tldrBg: "linear-gradient(135deg, #f0fdfa, #ecfeff)",
  tldrBorder: "#99f6e4",
  tldrHead: "#0f766e",
  tldrText: "#134e4a",
  chip: "linear-gradient(135deg, #0f766e, #14b8a6)",
  navHover: "#0d9488",
};

export default function SafetyPage() {
  return (
    <LegalPage
      theme={theme}
      bandImage="/images/safety-header.png"
      eyebrow="🛡️ Safety & trust"
      titleLead="Safety &"
      titleAccent="Trust"
      updated="July 2026"
      intro={
        <>
          Most people on <strong>bazar.in</strong> are genuine and friendly — but a little care keeps
          it that way. This guide covers how to buy and sell safely, spot scams, and get help. Please
          read it before your first deal.
        </>
      }
      tldr={{
        heading: "The golden rules",
        body: (
          <>
            Meet in a public place in daylight. Inspect the item before you pay. Prefer cash or
            secure payment on handover. Never send money in advance to someone you haven&apos;t met, and
            trust your instincts — if a deal feels off, walk away.
          </>
        ),
      }}
      sections={[
        {
          id: "meeting", label: "Meeting safely", heading: "Meeting safely",
          body: (
            <ul>
              <li>Meet in a <strong>busy public place</strong> — a café, mall, or police-station safe-exchange zone — in daylight.</li>
              <li>Bring a friend, and tell someone where you&apos;re going and who you&apos;re meeting.</li>
              <li>For big items, don&apos;t go alone to a stranger&apos;s home; meet outside first.</li>
              <li>Keep your first contact and chat inside bazar.in so there&apos;s a record.</li>
            </ul>
          ),
        },
        {
          id: "paying", label: "Paying safely", heading: "Paying & getting paid safely",
          body: (
            <ul>
              <li><strong>Inspect first, pay after</strong> — check the item works and matches the listing before money changes hands.</li>
              <li>Prefer cash or a secure instant payment <strong>at the moment of handover</strong>.</li>
              <li>Sellers: confirm the payment has actually cleared before handing over the item.</li>
              <li>Be wary of overpayment, &quot;courier&quot;, or partial-advance tricks (see scams below).</li>
            </ul>
          ),
        },
        {
          id: "scams", label: "Spotting scams", heading: "Spotting common scams",
          body: (
            <>
              <p>Walk away if you see any of these red flags:</p>
              <ul>
                <li><strong>Advance payment</strong> requests before you&apos;ve met or seen the item.</li>
                <li><strong>Deals too good to be true</strong> — heavily underpriced items are often bait.</li>
                <li><strong>&quot;I&apos;m travelling / abroad&quot;</strong> stories with a courier who needs a fee up front.</li>
                <li><strong>Overpayment</strong> — a &quot;buyer&quot; sends too much and asks you to refund the difference.</li>
                <li>Pressure to move the chat off-platform or pay via unusual links or gift cards.</li>
                <li>Requests for your OTP, password, or bank/card details — <strong>never share these</strong>.</li>
              </ul>
            </>
          ),
        },
        {
          id: "listing-safe", label: "Selling safely", heading: "Tips for sellers",
          body: (
            <ul>
              <li>Use clear, honest photos and descriptions — it builds trust and avoids disputes.</li>
              <li>Don&apos;t share your exact home address until you&apos;ve agreed a safe meeting spot.</li>
              <li>Keep records of the buyer&apos;s messages and the agreed price.</li>
            </ul>
          ),
        },
        {
          id: "prohibited", label: "What's not allowed", heading: "What's not allowed",
          body: (
            <p>
              Illegal, stolen, counterfeit and unsafe items are banned, along with scams, harassment
              and anything that endangers others. See the full list in our{" "}
              <LegalLink href="/terms">Terms of Service</LegalLink>. Breaking these rules can get an
              account removed.
            </p>
          ),
        },
        {
          id: "report", label: "Reporting", heading: "Reporting a problem",
          body: (
            <p>
              If a listing, message, or user seems fraudulent, unsafe, or abusive, report it to us
              through the <LegalLink href="/contact">contact page</LegalLink>. Share as much detail as
              you can — screenshots, the listing link, and what happened. We review reports and act on
              violations.
            </p>
          ),
        },
        {
          id: "our-part", label: "How we help", heading: "How we help keep bazar safe",
          body: (
            <ul>
              <li>We work to detect fraud, spam and prohibited listings, and remove them.</li>
              <li>We offer verification signals to help confirm genuine users.</li>
              <li>We keep chat on-platform so there&apos;s a record if something goes wrong.</li>
              <li>We act on reports and cooperate with authorities where the law requires.</li>
            </ul>
          ),
        },
        {
          id: "emergency", label: "In an emergency", heading: "In an emergency",
          body: (
            <p>
              If you ever feel unsafe or believe a crime has occurred, contact your local police
              immediately. bazar.in is a venue that connects people — your safety in the real world
              always comes first.
            </p>
          ),
        },
      ]}
      footerNote={
        <>
          This Safety &amp; Trust guide offers general good-practice advice for a local marketplace and
          is not legal or security advice. Always use your own judgement, follow local laws, and
          contact the authorities in an emergency.
        </>
      }
    />
  );
}