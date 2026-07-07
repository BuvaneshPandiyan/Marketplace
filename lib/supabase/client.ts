// Import the function that creates a Supabase client meant to run in the browser
import { createBrowserClient } from "@supabase/ssr";

// Define and export a function that creates and returns a browser Supabase client
export function createClient() {
  // Create the browser client using our project URL and public anon key
  return createBrowserClient(
    // The Supabase project URL — safe to expose publicly, comes from env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // The Supabase public "anon" key — safe to expose publicly, comes from env vars
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  // The "!" after each env var tells TypeScript "trust me, this will be defined at runtime"
}
