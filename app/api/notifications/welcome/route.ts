// Import the Next.js response helper
import { NextResponse } from "next/server";
// Import our server-side Supabase client (reads the session cookie to identify the caller)
import { createClient } from "@/lib/supabase/server";
// Import the admin client builder (bypasses RLS — needed to insert into notifications)
import { createClient as createAdminClient } from "@supabase/supabase-js";
// Import the in-app + push notification creator
import { createNotification } from "@/lib/server/createNotification";
// Import the welcome email sender
import { sendWelcomeEmail } from "@/lib/server/email";

// POST /api/notifications/welcome — called by the onboarding form after the first profile save
export async function POST() {
  // Create a server-side Supabase client to read the caller's session
  const supabase = await createClient();
  // Identify who's calling — they must be logged in
  const { data: { user } } = await supabase.auth.getUser();
  // Return 401 if nobody is logged in
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch the profile to get the user's name and email
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  // The user's phone-derived email won't exist for phone-OTP accounts, so we check the
  // auth.users email field — in Supabase this is populated if the user used an email provider
  // or if you set it manually; for SMS-only users it will be null and we skip the email send
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  // Fetch the auth user record to check for an email address
  const { data: authUser } = await adminClient.auth.admin.getUserById(user.id);
  const email = authUser?.user?.email ?? null;

  // Fire the in-app welcome notification (creates a row + Realtime event)
  await createNotification({
    userId: user.id,
    type: "welcome",
    title: "Welcome to the marketplace! 👋",
    body: "Browse listings near you, or post your first item to sell.",
    link: "/",
  });

  // Fire the welcome email if we have an address (fire-and-forget — don't fail the request)
  if (email) {
    await sendWelcomeEmail(email, profile?.name ?? null);
  }

  // Respond with success — the client doesn't need the notification details
  return NextResponse.json({ ok: true });
}
