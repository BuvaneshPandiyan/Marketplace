// Import Next.js helpers
import { NextRequest, NextResponse } from "next/server";
// Import our admin helpers
import { verifyAdminForApi, getAdminSupabase, writeAuditLog } from "@/lib/server/adminUtils";

// The expected request body
type RequestBody = {
  // The report to update
  reportId: string;
  // The new status to set
  action: "resolve" | "dismiss";
  // Optional admin notes
  notes?: string;
};

// POST /api/admin/reports/action — marks a report resolved or dismissed
export async function POST(request: NextRequest) {
  // Parse and validate
  const body = (await request.json()) as RequestBody;
  if (!body.reportId || !body.action) {
    return NextResponse.json({ error: "reportId and action are required" }, { status: 400 });
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

  // Service-role client for the mutation
  const admin = getAdminSupabase();

  // Map the action verb to the report_status enum value
  const newStatus = body.action === "resolve" ? "resolved" : "dismissed";

  // Update the report's status
  const { error } = await admin
    .from("reports")
    .update({ status: newStatus })
    .eq("id", body.reportId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Write the audit log
  await writeAuditLog({
    adminId,
    action: `${body.action}_report`,
    targetType: "report",
    targetId: body.reportId,
    notes: body.notes ?? null,
  });

  return NextResponse.json({ ok: true });
}
