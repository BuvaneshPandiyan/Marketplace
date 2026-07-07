// This is a pure presentational component — no state, no Supabase calls here.
// The detection logic lives in ChatPanel; this component only renders the banner.

// Define the props this component accepts
type SafetyWarningBannerProps = {
  // The specific keyword or phrase that triggered the warning — shown in the message
  matchedKeyword: string;
};

// Define and export the SafetyWarningBanner component
export function SafetyWarningBanner({ matchedKeyword }: SafetyWarningBannerProps) {
  // Render a soft amber warning block — not a hard blocker, just an informational heads-up
  return (
    // An attention-grabbing but non-alarming amber banner
    <div className="mx-4 my-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
      {/* The warning heading with an alert icon */}
      <p className="text-xs font-semibold text-amber-800">⚠️ Safety reminder</p>
      {/* The explanatory text — general enough to cover payment scams, phishing, etc. */}
      <p className="mt-0.5 text-xs text-amber-700">
        Be cautious of requests for upfront payment, gift cards, or links to external sites.
        {/* Show the specific matched phrase in quotes so it's clear what triggered this */}
        {" "}The phrase <strong>&quot;{matchedKeyword}&quot;</strong> often appears in scam messages.
      </p>
      {/* A link to a safety advice page (placeholder URL — create a /safety page in Prompt 10) */}
      <a
        href="/safety"
        className="mt-1 inline-block text-[10px] font-medium text-amber-800 underline hover:text-amber-900"
      >
        Learn how to stay safe →
      </a>
    </div>
  );
}
