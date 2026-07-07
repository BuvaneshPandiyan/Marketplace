// Import our admin utilities
import { requireAdmin, getAdminSupabase } from "@/lib/server/adminUtils";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";
import Link from "next/link";

// Row type for audit log entries with joined admin profile
type AuditRow = {
  id: string; action: string; target_type: string; target_id: string;
  notes: string | null; created_at: string;
  profiles: { name: string | null } | null;
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10));
  const PAGE_SIZE = 50;
  const offset = (pageNum - 1) * PAGE_SIZE;
  const admin = getAdminSupabase();

  const { data: rawEntries, error, count } = await admin
    .from("audit_log")
    .select("id, action, target_type, target_id, notes, created_at, profiles!audit_log_admin_id_fkey(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const entries = (rawEntries as unknown as AuditRow[]) ?? [];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-neutral-900">Audit Log</h1>
      <p className="mb-4 text-sm text-neutral-500">{count ?? 0} total entries — every admin action is permanently recorded here.</p>

      {error && <p className="mb-4 text-sm text-red-600">{(error as { message: string }).message}</p>}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs text-neutral-500">
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Admin</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Target</th>
              <th className="px-4 py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-neutral-50">
                <td className="px-4 py-3 text-xs text-neutral-400">{formatRelativeDate(entry.created_at)}</td>
                <td className="px-4 py-3 font-medium text-neutral-700">{entry.profiles?.name ?? "Admin"}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono font-medium text-neutral-800">
                    {entry.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-500">
                  <span className="font-medium">{entry.target_type}</span>{" "}
                  <span className="font-mono">{entry.target_id.slice(0, 8)}…</span>
                </td>
                <td className="max-w-xs px-4 py-3"><p className="truncate text-xs text-neutral-500">{entry.notes ?? "—"}</p></td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <p className="p-6 text-center text-sm text-neutral-500">No audit log entries yet.</p>}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          {pageNum > 1 ? (
            <Link href={`/admin/audit?page=${pageNum - 1}`} className="text-sm font-medium text-orange-600 hover:text-orange-700">← Previous</Link>
          ) : <span />}
          <p className="text-sm text-neutral-500">Page {pageNum} of {totalPages}</p>
          {pageNum < totalPages ? (
            <Link href={`/admin/audit?page=${pageNum + 1}`} className="text-sm font-medium text-orange-600 hover:text-orange-700">Next →</Link>
          ) : <span />}
        </div>
      )}
    </div>
  );
}
