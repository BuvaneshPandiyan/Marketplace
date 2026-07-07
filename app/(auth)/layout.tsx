// Import the type for React's children prop
import type { ReactNode } from "react";

// Define the layout component that wraps every page inside the (auth) route group
export default function AuthLayout({ children }: { children: ReactNode }) {
  // Render a simple centered container — real auth styling comes in the auth-build prompt
  return (
    // A full-height flex container that centers its content both vertically and horizontally
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      {/* Render whatever page (login, OTP, onboarding) is nested inside this layout */}
      {children}
    </div>
  );
}
