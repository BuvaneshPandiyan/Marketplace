// Import the actual onboarding location flow client component
import { OnboardingLocationFlow } from "@/components/auth/OnboardingLocationFlow";

// Define the page component shown at /onboarding/location — auth protection for this path
// is already handled centrally by middleware.ts (the "/onboarding" prefix is in its protected list)
export default function OnboardingLocationPage() {
  // Render the interactive location-setup flow
  return <OnboardingLocationFlow />;
}
