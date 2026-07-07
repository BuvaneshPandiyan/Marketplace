// Import Next.js's redirect helper for sending unauthenticated visitors elsewhere
import { redirect } from "next/navigation";
// Import our server-side Supabase client creator
import { createClient } from "@/lib/supabase/server";
// Import the actual onboarding form client component
import { OnboardingProfileForm } from "@/components/auth/OnboardingProfileForm";

// Define the page component shown at /onboarding/profile — an async Server Component
export default async function OnboardingProfilePage() {
  // Create a server-side Supabase client for this request
  const supabase = await createClient();
  // Ask Supabase who the current logged-in user is, if any
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If nobody is logged in, this page makes no sense — send them to login first
  if (!user) {
    // Redirect to the login screen, remembering to come back here afterward
    redirect("/login?redirect=/onboarding/profile");
  }

  // Render the actual interactive onboarding form now that we know someone is logged in
  return <OnboardingProfileForm />;
}
