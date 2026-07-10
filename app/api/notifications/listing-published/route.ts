// Import the Next.js helpers
import { NextRequest, NextResponse } from "next/server";
// Import the server-side Supabase client to read the caller's session
import { createClient } from "@/lib/supabase/server";
// Import the listing-published email sender
import { sendListingPublishedEmail } from "@/lib/server/email";
// Import the in-app notification creator
import { createNotification } from "@/lib/server/createNotification";

// Define the expected request body
type RequestBody = {
  // The ID of the just-published listing
  listingId: string;
};

// POST /api/notifications/listing-published — called by the sell wizard after a successful listing create
export async function POST(request: NextRequest) {
  // Read the request body
  const body = (await request.json()) as RequestBody;
  // Validate the required field
  if (!body.listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  // Create a server-side Supabase client to identify the caller
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch the listing to get its title (and verify ownership before sending anything)
  const { data: listing } = await supabase
    .from("listings")
    .select("id, title, seller_id")
    .eq("id", body.listingId)
    // Only proceed if this listing belongs to the calling user
    .eq("seller_id", user.id)
    .single();

  // If the listing doesn't exist or doesn't belong to this user, refuse
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  // Create an in-app "listing published" notification with the correct type
  await createNotification({
    userId: user.id,
    type: "listing_published",
    title: `"${listing.title}" is now live`,
    body: "Buyers near you can now see your listing.",
    link: `/listing/${listing.id}`,
  });

  // Optionally send a confirmation email if we have an email address for this user
  // (use the admin client to access auth.users.email)
  try {
    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    const { data: authUser } = await adminClient.auth.admin.getUserById(user.id);
    const email = authUser?.user?.email ?? null;
    if (email) {
      await sendListingPublishedEmail(email, listing.title, listing.id);
    }
  } catch {
    // Don't fail the request if the email send errors — the notification row is already created
  }

  return NextResponse.json({ ok: true });
}