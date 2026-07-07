// Import the function that creates a Supabase client meant to run on the server
import { createServerClient } from "@supabase/ssr";
// Import Next.js's helper for reading and writing cookies on the server
import { cookies } from "next/headers";

// Define and export an async function that creates and returns a server Supabase client
export async function createClient() {
  // Get access to the current request's cookie store (must be awaited in Next.js App Router)
  const cookieStore = await cookies();

  // Create and return the server client, wired up to read/write cookies for auth sessions
  return createServerClient(
    // The Supabase project URL — comes from env vars, safe to expose
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // The Supabase public "anon" key — comes from env vars, safe to expose
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Tell the Supabase client how to interact with cookies in this server environment
      cookies: {
        // Define how the client should read all current cookies
        getAll() {
          // Return every cookie currently stored for this request
          return cookieStore.getAll();
        },
        // Define how the client should write new/updated cookies (e.g., after login/logout)
        setAll(cookiesToSet) {
          // Wrap in try/catch because setting cookies can fail in some contexts (e.g., during render)
          try {
            // Loop through every cookie the Supabase client wants to set
            cookiesToSet.forEach(({ name, value, options }) =>
              // Set each cookie using Next.js's cookie store API
              cookieStore.set(name, value, options)
            );
            // If we're in a context where cookies can't be set (e.g., a Server Component render),
          } catch {
            // it's safe to ignore — middleware will refresh the session instead
          }
        },
      },
    }
  );
}

// Define and export a function that creates a Supabase client using the SERVICE ROLE key
// This bypasses Row Level Security — only ever use this on the server, never expose to the browser
export async function createServiceRoleClient() {
  // Get access to the current request's cookie store (kept for consistency, not strictly needed here)
  const cookieStore = await cookies();

  // Create and return a privileged client using the secret service role key
  return createServerClient(
    // The Supabase project URL — comes from env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // The SECRET service role key — must never be exposed to the browser/client bundle
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      // Cookie handling config, same shape as the regular server client above
      cookies: {
        // Read all cookies (not really used for privileged calls, but required by the type)
        getAll() {
          // Return the current cookies
          return cookieStore.getAll();
        },
        // No-op setter since this privileged client shouldn't manage user auth cookies
        setAll() {
          // Intentionally empty — the service role client doesn't manage a user session
        },
      },
    }
  );
}
