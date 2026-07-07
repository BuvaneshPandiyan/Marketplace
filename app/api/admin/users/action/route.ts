// Import Next.js helpers
import { NextRequest, NextResponse } from "next/server";
// Import our admin helpers
import { verifyAdminForApi, getAdminSupabase, writeAuditLog } from "@/lib/server/adminUtils";

// The expected request body
type RequestBody = {
  // The user to act on
  userId: string;
  // What to do: "suspend", "unsuspend", or "verify_seller"
  action: "suspend" | "unsuspend" | "verify_seller";
  // Optional notes for the audit log or rejection reason
  notes?: string;
};

// POST /api/admin/users/action — dispatches admin actions on user accounts
export async function POST(request: NextRequest) {
  // Parse and validate
  const body = (await request.json()) as RequestBody;
  if (!body.userId || !body.action) {
    return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
  }

  // Verify admin
  let adminId: string;
  try {
    adminId = await verifyAdminForApi();
  } catch (err) {
    const msg = String(err);
    return NextResponse.json(
      { error: msg.includes("UNAUTHORIZED") ? "Not logged in" : "Not an admin" },
      { status: msg.includes("UNAUTHORIZED") ? 401 : 403 }
    );
  }

  // Service-role client for all mutations
  const admin = getAdminSupabase();

  if (body.action === "suspend") {
    // Call the suspend_user() Postgres function which also flags all active listings
    const { error } = await admin.rpc("suspend_user", {
      p_target_user_id: body.userId,
      p_admin_id: adminId,
      p_notes: body.notes ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // suspend_user() already writes to audit_log internally, but we write a top-level one too
    // for clarity in the admin dashboard's audit view
    await writeAuditLog({ adminId, action: "suspend_user", targetType: "user", targetId: body.userId, notes: body.notes });
  }

  else if (body.action === "unsuspend") {
    // Call the unsuspend_user() Postgres function
    const { error } = await admin.rpc("unsuspend_user", {
      p_target_user_id: body.userId,
      p_admin_id: adminId,
      p_notes: body.notes ?? null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await writeAuditLog({ adminId, action: "unsuspend_user", targetType: "user", targetId: body.userId, notes: body.notes });
  }

  else if (body.action === "verify_seller") {
    // Find the pending verification request for this user
    const { data: verif } = await admin
      .from("verification_requests")
      .select("id")
      .eq("user_id", body.userId)
      .eq("status", "pending")
      .single();
    if (!verif) {
      return NextResponse.json({ error: "No pending verification request found for this user" }, { status: 404 });
    }
    // Call the approve_verification() Postgres function which also sets is_verified_seller = true
    const { error } = await admin.rpc("approve_verification", {
      p_request_id: verif.id,
      p_admin_notes: body.notes ?? "Manually approved by admin",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    // Write the audit log
    await writeAuditLog({ adminId, action: "verify_seller", targetType: "user", targetId: body.userId, notes: body.notes });
  }

  else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
