// Import Next.js's helper types for reading the request and sending a JSON response
import { NextRequest, NextResponse } from "next/server";
// Import our regular (anon-key) server client and the privileged service-role client —
// the regular client sends the OTP, the service-role client handles the rate-limit tables
// (which have no public RLS policies, since they should never be touched directly by users)
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
// Import phone validation plus the app's supported country-code list, which doubles as the
// default allowlist of prefixes we're willing to spend an SMS on.
import { isValidE164, COUNTRY_CODES } from "@/lib/phone";

// The country dial-in prefixes we will actually send OTP SMS to. Defaults to the
// app's own supported set (so no legitimate user loses access), but can be tightened
// in production — e.g. OTP_ALLOWED_COUNTRY_CODES="+91" — without any code change.
// This is the single biggest lever against SMS-pumping fraud, which profits by
// routing OTPs to premium-rate numbers in ranges the app never meant to support.
function allowedCountryCodes(): string[] {
  const fromEnv = process.env.OTP_ALLOWED_COUNTRY_CODES;
  if (fromEnv) {
    return fromEnv.split(",").map((c) => c.trim()).filter(Boolean);
  }
  return COUNTRY_CODES.map((c) => c.code);
}

// Best-effort client IP from the proxy chain. Behind Cloudflare the socket address is
// the proxy's, so the real client sits in x-forwarded-for; the leftmost entry is the one
// our edge observed. It can be spoofed, but it's enough to throttle a single source.
// (Same approach as lib/server/rateLimit.ts.)
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

// Optional Cloudflare Turnstile (CAPTCHA) verification. It is ONLY enforced when
// TURNSTILE_SECRET_KEY is configured, so this server side ships ready-to-go and stays a
// complete no-op until you add the secret and the client-side widget. Turnstile is the
// strongest mitigation here because it stops automated abuse even when the attacker
// rotates IPs and phone numbers.
async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // CAPTCHA not enabled yet — don't block anyone.
  if (!secret) return true;
  // Enabled but no token supplied — reject.
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // A CAPTCHA we couldn't verify is not a pass — fail closed.
    return false;
  }
}

// Define the POST handler — this runs when the client calls POST /api/auth/send-otp
export async function POST(request: NextRequest) {
  // Parse the JSON body, wrapped in try/catch in case it's malformed
  let body: { phone?: string; turnstileToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Pull the phone number out of the parsed body
  const phone = body.phone;

  // Guard clause: make sure a phone number was actually provided
  if (!phone) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  // Guard clause: make sure the phone number is in valid E.164 format (e.g., +919876543210)
  if (!isValidE164(phone)) {
    return NextResponse.json({ error: "Phone number must be in international format." }, { status: 400 });
  }

  // Guard clause: only send to supported country prefixes. Anything outside the
  // allowlist is rejected before we ever spend an SMS.
  const allowed = allowedCountryCodes();
  if (!allowed.some((code) => phone.startsWith(code))) {
    return NextResponse.json(
      { error: "We can't send verification codes to that country yet." },
      { status: 400 }
    );
  }

  // Resolve the caller's IP once, for both the CAPTCHA check and the rate limiter.
  const ip = clientIp(request);

  // If CAPTCHA is enabled, require a valid token before spending an SMS.
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return NextResponse.json(
      { error: "Please complete the verification challenge and try again." },
      { status: 400 }
    );
  }

  // Create a privileged client to call our rate-limiting Postgres function
  const serviceClient = await createServiceRoleClient();

  // Atomic multi-dimensional rate limit: per-phone, per-IP, and a global circuit
  // breaker — all checked and logged in one call so concurrent requests can't race.
  // Returns null when allowed, or a short reason code when a limit tripped.
  const { data: limitReason, error: rpcError } = await serviceClient.rpc(
    "check_and_log_otp_send",
    { p_phone: phone, p_ip: ip }
  );

  // Fail CLOSED: if we can't confirm the request is under the limits, don't send.
  if (rpcError) {
    console.error("OTP rate-limit check failed:", rpcError);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // A non-null reason means a limit was hit. Log which one server-side for
  // monitoring, but return the same generic 429 to the client either way.
  if (limitReason) {
    console.warn(`[otp] blocked send (reason=${limitReason}) ip=${ip}`);
    return NextResponse.json(
      { error: "Too many code requests. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  // Create a regular (non-privileged) server client to actually send the OTP via Supabase Auth
  const supabase = await createClient();

  // Ask Supabase Auth to send a one-time SMS code to this phone number
  const { error: otpError } = await supabase.auth.signInWithOtp({ phone });

  // If Supabase failed to send the OTP (e.g., SMS provider misconfigured), surface a clear error
  if (otpError) {
    console.error("Failed to send OTP:", otpError);
    return NextResponse.json({ error: "Failed to send the OTP. Please try again." }, { status: 500 });
  }

  // Everything succeeded — respond with a simple success payload
  return NextResponse.json({ success: true });
}