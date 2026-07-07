// Import Next.js types/utilities for working with the request and response in middleware
import { type NextRequest, NextResponse } from "next/server";
// Import the Supabase server-side client creator built for middleware/edge use
import { createServerClient } from "@supabase/ssr";

// Define the list of path PREFIXES that require a logged-in user.
// Add new prefixes here as future prompts build out /wishlist, /messages, etc.
// — middleware then automatically protects them with zero extra work in those prompts.
const PROTECTED_PATH_PREFIXES = ["/onboarding", "/sell", "/my-listings", "/messages", "/wishlist", "/verify", "/admin"];

// Define and export the middleware function Next.js will run on matching requests
export async function middleware(request: NextRequest) {
  // Start building a response that we may attach refreshed cookies to
  let supabaseResponse = NextResponse.next({
    // Pass the original request through unchanged for now
    request,
  });

  // Create a Supabase client configured to work inside middleware (no Server Component context here)
  const supabase = createServerClient(
    // The Supabase project URL from env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // The Supabase public anon key from env vars
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Tell this client how to read/write cookies in the middleware context
      cookies: {
        // Read all cookies off the incoming request
        getAll() {
          // Return the request's current cookies
          return request.cookies.getAll();
        },
        // Write any updated cookies (e.g., a refreshed session token) onto both request and response
        setAll(cookiesToSet) {
          // First, update the cookies on the request object itself
          cookiesToSet.forEach(({ name, value }) =>
            // Set each cookie on the request so downstream code sees the fresh value
            request.cookies.set(name, value)
          );
          // Rebuild the response object so it carries the request's updated cookies
          supabaseResponse = NextResponse.next({
            // Reuse the same (now updated) request
            request,
          });
          // Now also set each cookie on the actual response sent back to the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            // Set the cookie with its original options (e.g., expiry, path)
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Calling getUser() forces Supabase to validate/refresh the session token, and tells us who's logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Read just the path portion of the current URL (e.g., "/sell", "/onboarding/profile")
  const { pathname } = request.nextUrl;

  // Check whether the current path starts with any of our protected prefixes
  const isProtectedPath = PROTECTED_PATH_PREFIXES.some((prefix) =>
    // True if this path starts with the prefix (so "/onboarding/profile" matches "/onboarding")
    pathname.startsWith(prefix)
  );

  // If this is a protected path and nobody is logged in, redirect to login
  if (isProtectedPath && !user) {
    // Build a redirect URL pointing at the login page
    const loginUrl = new URL("/login", request.url);
    // Remember where the user was trying to go, so login can send them back afterward
    loginUrl.searchParams.set("redirect", pathname);
    // Perform the redirect, replacing our normal "next()" response
    return NextResponse.redirect(loginUrl);
  }

  // If an already-logged-in user lands on the login page itself, just send them home —
  // there's no reason for a logged-in user to see the phone/OTP screen again
  if (pathname === "/login" && user) {
    // Redirect them to the home page instead
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Otherwise, return the response, now carrying any refreshed auth cookies
  return supabaseResponse;
}

// Define which routes this middleware should run on
export const config = {
  // Match every route except static files, images, and favicon to avoid unnecessary overhead
  matcher: [
    // Regex: skip Next.js internals, static assets, and common image file extensions
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
