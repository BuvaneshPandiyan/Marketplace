// Mark this as a Client Component since it manages interactive form state
"use client";

// Import React's state/effect hooks
import { useEffect, useState } from "react";
// Import Next.js's router (for redirecting after login) and search params reader (for ?redirect=...)
import { useRouter, useSearchParams } from "next/navigation";
// Import our browser Supabase client creator (used to verify the OTP and establish the session)
import { createClient } from "@/lib/supabase/client";
// Import our phone helpers: the default country code and the E.164 combiner function
import { DEFAULT_COUNTRY_CODE, toE164 } from "@/lib/phone";
// Import the country code dropdown subcomponent
import { CountryCodeSelect } from "@/components/auth/CountryCodeSelect";
// Import the 6-box OTP input subcomponent
import { OtpInput } from "@/components/auth/OtpInput";

// Define the two possible screens this flow can show
type Step = "phone" | "otp";

// Define and export the main login flow component
export function LoginFlow() {
  // Get the router so we can navigate the user after a successful login
  const router = useRouter();
  // Read the current URL's search params (e.g., ?redirect=/sell set by the middleware)
  const searchParams = useSearchParams();
  // Create one browser Supabase client instance to reuse across this component's lifetime
  const [supabase] = useState(() => createClient());

  // Track which screen we're currently showing
  const [step, setStep] = useState<Step>("phone");
  // Track the selected country dial code, defaulting to +91
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  // Track the local phone number digits the user types (without the country code)
  const [localNumber, setLocalNumber] = useState("");
  // Track the 6-digit OTP code as the user fills it in
  const [otpCode, setOtpCode] = useState("");
  // Track whether a network request is currently in flight, to disable buttons/show spinners
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track any error message to show the user
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Track how many seconds remain before the "Resend OTP" button becomes clickable again
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Run a countdown timer effect whenever cooldownSeconds is greater than zero
  useEffect(() => {
    // If there's nothing to count down, do nothing
    if (cooldownSeconds <= 0) return;
    // Set up an interval that ticks once per second
    const timer = setInterval(() => {
      // Decrease the remaining cooldown by one second each tick
      setCooldownSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    // Clean up the interval when the effect re-runs or the component unmounts
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Define a function that sends (or re-sends) the OTP to the user's phone
  async function sendOtp() {
    // Clear any previous error before trying again
    setErrorMessage(null);
    // Guard clause: don't let them submit an empty phone number
    if (!localNumber.trim()) {
      // Show a validation error and stop here
      setErrorMessage("Please enter your phone number.");
      return;
    }
    // Combine the selected country code and typed digits into a full E.164 phone number
    const fullPhone = toE164(countryCode, localNumber);
    // Mark that a request is in progress
    setIsSubmitting(true);
    try {
      // Call our own API route, which rate-limits the request before actually sending the SMS
      const response = await fetch("/api/auth/send-otp", {
        // This is a POST request since we're triggering an action (sending an SMS)
        method: "POST",
        // Tell the server we're sending JSON
        headers: { "Content-Type": "application/json" },
        // Send the full phone number in the request body
        body: JSON.stringify({ phone: fullPhone }),
      });
      // Parse the JSON response body
      const result = await response.json();
      // If the server responded with a non-2xx status, show its error message
      if (!response.ok) {
        // Display the server's error message, or a generic fallback if none was given
        setErrorMessage(result.error ?? "Failed to send OTP. Please try again.");
        return;
      }
      // Success — move to the OTP entry screen
      setStep("otp");
      // Start a 60-second cooldown before the user can request another OTP
      setCooldownSeconds(60);
    } catch {
      // Handle network-level failures (e.g., no internet connection)
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      // Always clear the submitting flag, whether we succeeded or failed
      setIsSubmitting(false);
    }
  }

  // Define a function that verifies the OTP code the user entered
  async function verifyOtp(code: string) {
    // Clear any previous error before trying again
    setErrorMessage(null);
    // Combine the country code and number again so we verify against the same phone we texted
    const fullPhone = toE164(countryCode, localNumber);
    // Mark that a request is in progress
    setIsSubmitting(true);
    try {
      // Ask Supabase Auth to verify the entered code against the phone number
      const { data, error } = await supabase.auth.verifyOtp({
        // The phone number the OTP was sent to
        phone: fullPhone,
        // The 6-digit code the user typed in
        token: code,
        // Tell Supabase this is an SMS-based OTP verification
        type: "sms",
      });

      // If verification failed (wrong code, expired code, etc.), show an error and stop
      if (error || !data.user) {
        // Show a clear, user-facing error message
        setErrorMessage("That code didn't work. Please check it and try again.");
        return;
      }

      // Verification succeeded — check whether this user has already finished onboarding
      const { data: profile } = await supabase
        // Query the profiles table
        .from("profiles")
        // Select just the name column, since that's all we need to decide where to send them
        .select("name")
        // Filter to this specific user's row
        .eq("id", data.user.id)
        // We expect exactly one row
        .single();

      // If they don't have a name set yet, they're a brand-new user who needs onboarding
      if (!profile?.name) {
        // Send them to the onboarding form to set their name/photo
        router.push("/onboarding/profile");
        return;
      }

      // Existing, fully onboarded user — send them wherever they were trying to go,
      // falling back to the home page if no redirect target was specified
      const redirectTo = searchParams.get("redirect") ?? "/";
      // Navigate to that destination
      router.push(redirectTo);
    } catch {
      // Handle unexpected network-level failures
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      // Always clear the submitting flag
      setIsSubmitting(false);
    }
  }

  // Automatically attempt verification the moment all 6 digits have been entered
  useEffect(() => {
    // Only auto-submit if we have exactly 6 digits and we're not already submitting
    if (otpCode.length === 6 && !isSubmitting) {
      // Trigger verification with the completed code
      verifyOtp(otpCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-run when the code itself changes
  }, [otpCode]);

  // Render the phone-entry screen
  if (step === "phone") {
    return (
      // A card-style container matching the placeholder styling from the scaffolding step
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        {/* Heading for this screen */}
        <h1 className="mb-1 text-lg font-semibold text-neutral-900">Login / Sign up</h1>
        {/* Short explanatory subtext */}
        <p className="mb-4 text-sm text-neutral-500">We&apos;ll text you a one-time code.</p>

        {/* The phone entry form — prevents default submit so we control the flow with JS */}
        <form
          onSubmit={(e) => {
            // Stop the browser's default full-page form submission
            e.preventDefault();
            // Trigger our own OTP-sending logic instead
            sendOtp();
          }}
        >
          {/* A flex row combining the country code dropdown and the number input visually */}
          <div className="mb-3 flex">
            {/* The country code selector subcomponent */}
            <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
            {/* The local phone number input, styled as the right half of the combined group */}
            <input
              type="tel"
              inputMode="numeric"
              placeholder="98765 43210"
              value={localNumber}
              onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, ""))}
              className="flex-1 rounded-r-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
          </div>

          {/* Conditionally render an error message if one exists */}
          {errorMessage && <p className="mb-3 text-sm text-red-600">{errorMessage}</p>}

          {/* The submit button, disabled while a request is in flight */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-medium text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {/* Swap the label depending on whether we're currently submitting */}
            {isSubmitting ? "Sending..." : "Send OTP"}
          </button>
        </form>
      </div>
    );
  }

  // Render the OTP-entry screen (step === "otp")
  return (
    // A card-style container matching the phone-entry screen above
    <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      {/* Heading for this screen */}
      <h1 className="mb-1 text-lg font-semibold text-neutral-900">Enter the code</h1>
      {/* Subtext confirming which number the code was sent to */}
      <p className="mb-4 text-sm text-neutral-500">
        {/* Show the full phone number the OTP was sent to, for the user's confirmation */}
        Sent to {toE164(countryCode, localNumber)}
      </p>

      {/* The 6-digit OTP input boxes */}
      <div className="mb-4">
        <OtpInput length={6} onChange={setOtpCode} />
      </div>

      {/* Conditionally render an error message if one exists */}
      {errorMessage && <p className="mb-3 text-sm text-red-600">{errorMessage}</p>}

      {/* Show a small loading indicator while we're verifying the code */}
      {isSubmitting && <p className="mb-3 text-sm text-neutral-500">Verifying...</p>}

      {/* A row with "change number" and "resend OTP" actions */}
      <div className="flex items-center justify-between text-sm">
        {/* Lets the user go back and fix a mistyped phone number */}
        <button
          type="button"
          onClick={() => {
            // Go back to the phone entry screen
            setStep("phone");
            // Clear out the partially entered code
            setOtpCode("");
            // Clear any leftover error message
            setErrorMessage(null);
          }}
          className="text-neutral-500 hover:text-neutral-700"
        >
          Change number
        </button>

        {/* The resend button, disabled until the cooldown timer reaches zero */}
        <button
          type="button"
          disabled={cooldownSeconds > 0 || isSubmitting}
          onClick={sendOtp}
          className="font-medium text-orange-600 hover:text-orange-700 disabled:cursor-not-allowed disabled:text-neutral-400"
        >
          {/* Show the countdown while it's active, otherwise show a plain "Resend OTP" label */}
          {cooldownSeconds > 0 ? `Resend OTP in ${cooldownSeconds}s` : "Resend OTP"}
        </button>
      </div>
    </div>
  );
}
