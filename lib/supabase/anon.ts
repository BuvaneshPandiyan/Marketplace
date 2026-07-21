// A COOKIE-FREE Supabase client for reading PUBLIC data on cacheable pages.
//
// Why this exists:
//   The normal server client (lib/supabase/server.ts) reads cookies to resolve
//   the logged-in session. Any cookie access marks a Next.js route as *dynamic*,
//   which silently disables full-route caching / ISR. Pages that only need public
//   data (a listing, a seller profile, a category's listings) don't need the
//   session at all — so we read them with this stateless anon client instead.
//   With no cookie access, those routes can be statically cached + revalidated,
//   which is what lets the site serve popular pages from the edge instead of
//   hitting Postgres on every visit.
//
// Safety: this client authenticates as the `anon` Postgres role, so RLS still
//   applies. It can ONLY read what your policies expose to the public:
//     - listings:  "Active listings are publicly readable"  (status = 'active')
//     - profiles:  "Profiles are publicly readable"         (using (true))
//   It must NEVER be used for per-user or privileged data.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAnonClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // No session persistence — this client is stateless and cookie-free by design.
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}