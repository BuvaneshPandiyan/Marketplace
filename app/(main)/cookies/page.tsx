import type { Metadata } from "next";
import { LegalPage, LegalLink, type LegalTheme } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Cookie Policy — bazar.in",
  description: "What cookies and similar technologies bazar.in uses, why, and how you can control them.",
};

export const dynamic = "force-static";

// AMBER-BROWN theme (fitting for "cookies").
const theme: LegalTheme = {
  band: ["#451a03", "#78350f", "#b45309"],
  eyebrow: "#fcd34d",
  accent: "#b45309",
  accentSoft: "#fbbf24",
  glow: "rgba(217,119,6,0.4)",
  tldrBg: "linear-gradient(135deg, #fffbeb, #fefce8)",
  tldrBorder: "#fde68a",
  tldrHead: "#b45309",
  tldrText: "#78350f",
  chip: "linear-gradient(135deg, #b45309, #d97706)",
  navHover: "#b45309",
};

export default function CookiesPage() {
  return (
    <LegalPage
      theme={theme}
      bandImage="/images/cookies-header.png"
      eyebrow="🍪 Cookies"
      titleLead="Cookie"
      titleAccent="Policy"
      updated="July 2026"
      intro={
        <>
          This policy explains how <strong>bazar.in</strong> uses cookies and similar technologies,
          what they do, and how you can control them. It works alongside our{" "}
          <LegalLink href="/privacy">Privacy Policy</LegalLink>.
        </>
      }
      tldr={{
        heading: "The short version",
        body: (
          <>
            We use a few cookies to keep you logged in, remember your preferences, keep the site
            secure, and understand how it&apos;s used. Essential ones are required for the site to work;
            the rest are optional and you can control them in your browser.
          </>
        ),
      }}
      sections={[
        {
          id: "what", label: "What cookies are", heading: "What cookies are",
          body: (
            <p>
              Cookies are small text files a site stores on your device. They let a site remember
              things between visits — like keeping you signed in. &quot;Similar technologies&quot;
              include local storage and pixels that do comparable jobs. We group them by what they do,
              below.
            </p>
          ),
        },
        {
          id: "types", label: "Types we use", heading: "Types of cookies we use",
          body: (
            <>
              <h3 className="pp-h3">Essential</h3>
              <p>Required for the site to function — signing in, keeping your session, security, and remembering your basic choices. These can&apos;t be switched off without breaking the site.</p>
              <h3 className="pp-h3">Preferences</h3>
              <p>Remember things like your chosen location and language so you don&apos;t have to set them every time.</p>
              <h3 className="pp-h3">Analytics</h3>
              <p>Help us understand, in aggregate, how the site is used so we can improve it. These are optional.</p>
              <h3 className="pp-h3">Security &amp; fraud prevention</h3>
              <p>Help us detect suspicious activity, prevent abuse, and keep accounts safe.</p>
            </>
          ),
        },
        {
          id: "why", label: "Why we use them", heading: "Why we use them",
          body: (
            <ul>
              <li>To keep you logged in and your session secure.</li>
              <li>To remember your preferences (location, language, display choices).</li>
              <li>To protect the platform against fraud and abuse.</li>
              <li>To measure and improve how the site performs, in aggregate.</li>
            </ul>
          ),
        },
        {
          id: "thirdparty", label: "Third parties", heading: "Third-party cookies",
          body: (
            <p>
              Some cookies may be set by trusted service providers we use for things like
              infrastructure, security, or analytics. They&apos;re bound by contract to use this data
              only to provide their service to us, and not for their own unrelated purposes.
            </p>
          ),
        },
        {
          id: "control", label: "Your choices", heading: "Controlling cookies",
          body: (
            <>
              <p>You&apos;re in control:</p>
              <ul>
                <li>Most browsers let you block or delete cookies in their settings.</li>
                <li>You can clear existing cookies at any time.</li>
                <li>Blocking essential cookies may stop parts of the site from working.</li>
                <li>Where required, we&apos;ll ask for your consent to optional cookies and let you change it.</li>
              </ul>
            </>
          ),
        },
        {
          id: "changes", label: "Changes", heading: "Changes to this policy",
          body: (
            <p>
              We may update this Cookie Policy as our practices or the law change. We&apos;ll revise the
              &quot;Last updated&quot; date and, where appropriate, let you know in-app.
            </p>
          ),
        },
        {
          id: "contact", label: "Contact", heading: "Contact",
          body: (
            <p>
              Questions about cookies? Reach us via our{" "}
              <LegalLink href="/contact">contact page</LegalLink>, or read our{" "}
              <LegalLink href="/privacy">Privacy Policy</LegalLink> for the bigger picture.
            </p>
          ),
        },
      ]}
      footerNote={
        <>
          This Cookie Policy is a plain-English template. Confirm your actual cookie inventory and any
          consent-banner requirements with qualified counsel for your jurisdiction before relying on
          it in production.
        </>
      }
    />
  );
}