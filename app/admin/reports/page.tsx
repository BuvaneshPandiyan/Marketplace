// Import our admin utilities
import { requireAdmin, getAdminSupabase } from "@/lib/server/adminUtils";
import Link from "next/link";
import { AdminReportActions } from "@/app/admin/reports/AdminReportActions";

// Row type for reports with joined reporter profile
type AdminReportRow = {
  id: string; reporter_id: string; target_type: string; target_id: string;
  reason: string; comment: string | null; created_at: string; status: string;
  profiles: { name: string | null } | null;
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  await requireAdmin();
  const { status = "pending", type = "" } = await searchParams;
  const admin = getAdminSupabase();

  let query = admin
    .from("reports")
    .select("id, reporter_id, target_type, target_id, reason, comment, created_at, status, profiles!reports_reporter_id_fkey(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("target_type", type);

  const { data: rawReports, error } = await query;
  const reports = (rawReports as unknown as AdminReportRow[]) ?? [];

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-neutral-900">Reports</h1>

      {/* Filter tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending","reviewed","resolved","dismissed"] as const).map((s) => (
          <Link key={s} href={`/admin/reports?status=${s}${type ? `&type=${type}` : ""}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${status === s ? "bg-orange-600 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
        <span className="mx-1 text-neutral-300">|</span>
        {["","listing","user","message"].map((t) => (
          <Link key={t} href={`/admin/reports?status=${status}${t ? `&type=${t}` : ""}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${type === t ? "bg-neutral-800 text-white" : "border border-neutral-300 text-neutral-600 hover:bg-neutral-50"}`}>
            {t || "All types"}
          </Link>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{(error as { message: string }).message}</p>}

      {reports.length === 0 && (
        <p className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
          No {status} reports{type ? ` of type "${type}"` : ""}.
        </p>
      )}

      {reports.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs text-neutral-500">
                <th className="px-4 py-2">Type / Target</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Reporter</th>
                <th className="px-4 py-2">Comment</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium">{report.target_type}</span>
                    <br />
                    {report.target_type === "listing" ? (
                      <Link href={`/listing/${report.target_id}`} target="_blank" className="text-xs text-orange-600 hover:underline">
                        {report.target_id.slice(0, 8)}…
                      </Link>
                    ) : (
                      <span className="text-xs text-neutral-400">{report.target_id.slice(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-neutral-700">{report.reason.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{report.profiles?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 max-w-xs"><p className="truncate text-xs text-neutral-500">{report.comment ?? "—"}</p></td>
                  <td className="px-4 py-3">
                    <AdminReportActions reportId={report.id} currentStatus={report.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
