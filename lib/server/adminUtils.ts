// SERVER-ONLY — never import this from a Client Component or browser-side code.
// All functions here use the Supabase service-role key, which must stay on the server.

// Import Next.js's redirect helper (used when a non-admin tries to access /admin/*)
import { redirect } from "next/navigation";
// Import the Supabase admin client builder (service-role key, bypasses RLS)
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
// Import the server-side Supabase client creator (reads the session cookie)
import { createClient } from "@/lib/supabase/server";

// Create (and return) a Supabase admin client using the service-role key.
// This client bypasses ALL Row Level Security policies — only use it on the server,
// only for operations that require seeing data across all users.
export function getAdminSupabase() {
  return createSupabaseAdmin(
    // The Supabase project URL from env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // The service-role key — NEVER expose this to the browser
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    // Disable cookie-based auth — the service role key is self-authorising
    { auth: { persistSession: false } }
  );
}

// Check that the current request comes from a logged-in admin user.
// If not, redirects to the home page (not a 404, to avoid leaking that /admin exists).
// Returns the admin's user ID if everything checks out.
export async function requireAdmin(): Promise<string> {
  // Create a server-side Supabase client that reads the session from the request cookie
  const supabase = await createClient();
  // Ask Supabase who is making this request
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // If nobody is logged in, send them to the home page
  if (!user) redirect("/");

  // Now check whether the logged-in user actually has admin privileges
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  // If they're not an admin (or profile not found), send them home
  if (!profile?.is_admin) redirect("/");

  // Return the admin's user ID so the calling page can pass it to audit log writes
  return user.id;
}

// Verify the caller of an admin API route is an admin, throwing a 401 error response
// if not (for API routes, which can't call redirect()).
// Returns the admin's user ID if everything checks out.
export async function verifyAdminForApi(): Promise<string> {
  // Create a server-side Supabase client that reads the session cookie
  const supabase = await createClient();
  // Check who's calling
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // If not logged in, we'll throw an error that the API route handler catches
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  // Check the admin flag
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  // If not admin, throw so the API route can return a 403
  if (!profile?.is_admin) {
    throw new Error("FORBIDDEN");
  }

  return user.id;
}

// Write a single row to the audit_log table. Called after every admin action.
// Uses the admin client (service-role) since audit_log has no client INSERT policy.
export async function writeAuditLog({
  adminId,
  action,
  targetType,
  targetId,
  notes,
}: {
  // The admin who performed the action
  adminId: string;
  // A short verb, e.g., "approve_listing", "remove_listing", "ban_user"
  action: string;
  // The type of entity acted on: "listing", "user", "report", "verification_request"
  targetType: string;
  // The ID of the entity (as a string, since target_id is text in the schema)
  targetId: string;
  // Optional free-text reason/notes from the admin
  notes?: string | null;
}): Promise<void> {
  // Create the admin client to bypass RLS on audit_log
  const admin = getAdminSupabase();
  // Insert the audit log row — errors are logged but never bubble up to the caller
  // (a failed audit log write should never undo the admin action itself)
  const { error } = await admin.from("audit_log").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    notes: notes ?? null,
  });
  // Log any write failure server-side so it's visible in Cloudflare logs
  if (error) {
    console.error("[writeAuditLog] failed to write audit entry:", error.message);
  }
}
