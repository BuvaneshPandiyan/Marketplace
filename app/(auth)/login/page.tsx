// Import React's Suspense, required because LoginFlow uses useSearchParams() internally
import { Suspense } from "react";
// Import the actual login flow client component
import { LoginFlow } from "@/components/auth/LoginFlow";

// Define the page component shown at the /login route
export default function LoginPage() {
  // Render LoginFlow inside a Suspense boundary (Next.js requires this for useSearchParams)
  return (
    // Suspense shows the fallback briefly while the client component initializes
    <Suspense fallback={<LoginFallback />}>
      {/* The real interactive phone/OTP login flow */}
      <LoginFlow />
    </Suspense>
  );
}

// Define a small fallback shown for the brief moment before LoginFlow takes over
function LoginFallback() {
  // Render a simple skeleton card matching the real component's size, to avoid layout shift
  return (
    // A card-shaped placeholder with a pulsing animation to indicate loading
    <div className="h-64 w-full max-w-sm animate-pulse rounded-xl border border-neutral-200 bg-white p-6 shadow-sm" />
  );
}
