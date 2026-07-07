// SERVER-ONLY — import this only from API routes, Server Components, or server actions.
// The RESEND_API_KEY is a secret that must never reach the browser.

// Define the minimal shape of a Resend send-email request body
type ResendEmail = {
  // The sender address (must be from a domain you've verified in your Resend account)
  from: string;
  // The recipient address
  to: string;
  // The email subject line
  subject: string;
  // The plain-text fallback (shown when the HTML isn't rendered)
  text: string;
  // The full HTML body (optional — use it when you want richer formatting)
  html?: string;
};

// Internal helper: sends an email via the Resend REST API
async function sendEmail(email: ResendEmail): Promise<void> {
  // If the RESEND_API_KEY env var isn't set, log a warning and bail — don't crash the caller
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[sendEmail] RESEND_API_KEY is not set — email not sent");
    return;
  }
  try {
    // Call the Resend send endpoint with our email payload
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        // Authenticate with the API key
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // Serialize the email object as JSON
      body: JSON.stringify(email),
    });
    // Log any non-2xx responses so we can diagnose delivery failures in server logs
    if (!response.ok) {
      const body = await response.text();
      console.error("[sendEmail] Resend API error:", response.status, body);
    }
  } catch (err) {
    // Network errors shouldn't crash the calling operation — log and move on
    console.error("[sendEmail] fetch error:", err);
  }
}

// The "from" address used on all outgoing emails — set this to a verified Resend sender
// (add a domain in your Resend dashboard → Domains, or use their onboarding.resend.dev
// sandbox address while testing: "onboarding@resend.dev")
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "noreply@yourdomain.com";

// ── Public email functions — call these from API routes / server actions ────────────────────

// Send a welcome email when a new user completes their phone OTP signup
export async function sendWelcomeEmail(to: string, name: string | null): Promise<void> {
  // The display name, falling back to "there" if the user hasn't set one yet
  const displayName = name ?? "there";
  await sendEmail({
    from: FROM_ADDRESS,
    to,
    subject: "Welcome to the marketplace!",
    // Plain-text version — always include one for email clients that don't render HTML
    text: `Hi ${displayName},\n\nWelcome to our hyperlocal marketplace! You can now browse listings near you, post your own items for sale, and chat directly with buyers and sellers.\n\nHappy buying and selling,\nThe team`,
    // Simple HTML version
    html: `
      <p>Hi <strong>${displayName}</strong>,</p>
      <p>Welcome to our hyperlocal marketplace! You can now:</p>
      <ul>
        <li>Browse listings near you</li>
        <li>Post your own items for sale or rent</li>
        <li>Chat directly with buyers and sellers</li>
        <li>Save your favourite listings and get alerts</li>
      </ul>
      <p>Happy buying and selling!<br/>The team</p>
    `,
  });
}

// Send a "your listing is live" confirmation email when a listing is successfully created
export async function sendListingPublishedEmail(
  to: string,
  listingTitle: string,
  listingId: string
): Promise<void> {
  // Build the public URL to the listing detail page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";
  const listingUrl = `${baseUrl}/listing/${listingId}`;
  await sendEmail({
    from: FROM_ADDRESS,
    to,
    subject: `Your listing "${listingTitle}" is now live`,
    text: `Great news! Your listing "${listingTitle}" has been published and is now visible to buyers near you.\n\nView it here: ${listingUrl}\n\nThe team`,
    html: `
      <p>Great news! Your listing <strong>${listingTitle}</strong> has been published and is now visible to buyers near you.</p>
      <p><a href="${listingUrl}">View your listing →</a></p>
      <p>We'll send you a message when someone reaches out about it.<br/>The team</p>
    `,
  });
}

// Send an expiry-warning email when a listing is ~24 hours from expiring (60-day window)
export async function sendListingExpiringEmail(
  to: string,
  listingTitle: string,
  listingId: string
): Promise<void> {
  // Build the public URL to the listing detail page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";
  const listingUrl = `${baseUrl}/listing/${listingId}`;
  await sendEmail({
    from: FROM_ADDRESS,
    to,
    subject: `Your listing "${listingTitle}" expires in 24 hours`,
    text: `Your listing "${listingTitle}" is expiring in about 24 hours. If it hasn't sold yet, you can renew it from your Listings dashboard.\n\nView listing: ${listingUrl}\n\nThe team`,
    html: `
      <p>Your listing <strong>${listingTitle}</strong> is expiring in about 24 hours.</p>
      <p>If it hasn't sold yet, you can renew it from your <a href="${baseUrl}/my-listings">Listings dashboard</a>.</p>
      <p><a href="${listingUrl}">View listing →</a></p>
      <p>The team</p>
    `,
  });
}
