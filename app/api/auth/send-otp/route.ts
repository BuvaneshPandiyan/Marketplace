// Import Next.js's helper types for reading the request and sending a JSON response
import { NextRequest, NextResponse } from "next/server";
// Import our regular (anon-key) server client and the privileged service-role client —
// the regular client sends the OTP, the service-role client handles the rate-limit table
// (which has no public RLS policies, since it should never be touched directly by users)
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
// Import our phone validation helper to reject malformed numbers before doing anything else
import { isValidE164 } from "@/lib/phone";

// Define the POST handler — this runs when the client calls POST /api/auth/send-otp
export async function POST(request: NextRequest) {
  // Parse the JSON body of the incoming request, wrapped in try/catch in case it's malformed
  let body: { phone?: string };
  try {
    // Attempt to parse the request body as JSON
    body = await request.json();
  } catch {
    // If parsing fails, the request body wasn't valid JSON at all
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Pull the phone number out of the parsed body
  const phone = body.phone;

  // Guard clause: make sure a phone number was actually provided
  if (!phone) {
    // Respond with a 400 Bad Request if the phone field is missing
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  // Guard clause: make sure the phone number is in valid E.164 format (e.g., +919876543210)
  if (!isValidE164(phone)) {
    // Respond with a 400 Bad Request if the format is wrong
    return NextResponse.json({ error: "Phone number must be in international format." }, { status: 400 });
  }

  // Create a privileged client to call our rate-limiting Postgres function
  const serviceClient = await createServiceRoleClient();

  // Call the check_and_log_otp_request() Postgres function we defined in the SQL migration —
  // it atomically checks AND logs this attempt in one step, avoiding race conditions
  const { data: isAllowed, error: rpcError } = await serviceClient.rpc(
    // The name of the Postgres function to call
    "check_and_log_otp_request",
    // The function's single argument: the phone number being rate-limited
    { p_phone: phone }
  );

  // If the rate-limit check itself failed (e.g., DB connection issue), fail safely with a 500
  if (rpcError) {
    // Log the underlying error on the server for debugging (never shown to the user)
    console.error("OTP rate-limit check failed:", rpcError);
    // Respond with a generic 500 error so we don't leak internal details
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  // If the rate limit has been exceeded, block this request with a 429 Too Many Requests
  if (!isAllowed) {
    // Respond with a clear, user-facing rate-limit message
    return NextResponse.json(
      { error: "Too many OTP requests. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  // Create a regular (non-privileged) server client to actually send the OTP via Supabase Auth
  const supabase = await createClient();

  // Ask Supabase Auth to send a one-time SMS code to this phone number
  const { error: otpError } = await supabase.auth.signInWithOtp({
    // The phone number to send the OTP to, already validated above
    phone,
  });

  // If Supabase failed to send the OTP (e.g., SMS provider misconfigured), surface a clear error
  if (otpError) {
    // Log the underlying error on the server for debugging
    console.error("Failed to send OTP:", otpError);
    // Respond with a 500 error and a user-facing message
    return NextResponse.json({ error: "Failed to send the OTP. Please try again." }, { status: 500 });
  }

  // Everything succeeded — respond with a simple success payload
  return NextResponse.json({ success: true });
}
