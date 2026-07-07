// Import our admin utilities
import { requireAdmin, getAdminSupabase } from "@/lib/server/adminUtils";
import { AdminUserActions } from "@/app/admin/users/AdminUserActions";
import { formatRelativeDate } from "@/lib/client/formatRelativeDate";

// Row type for profile rows from the admin client
type AdminProfileRow = {
  id: string; name: string | null; profile_photo_url: string | null;
  is_admin: boolean; is_suspended: boolean; is_verified_seller: boolean;
  rating_avg: number | null; rating_count: number | null; created_at: string;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const admin = getAdminSupabase();

  let profileQuery = admin
    .from("profiles")
    .select("id, name, is_admin, is_suspended, is_verified_seller, rating_avg, rating_count, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (q.trim()) profileQuery = profileQuery.ilike("name", `%${q.trim()}%`);

  const { data: rawProfiles, error } = await profileQuery;
  const profiles = (rawProfiles as unknown as AdminProfileRow[]) ?? [];

  // Enrich each profile with counts
  type EnrichedProfile = AdminProfileRow & { listingCount: number; reportCount: number; hasPendingVerif: boolean };
  const enriched: EnrichedProfile[] = [];
  for (const profile of profiles) {
    const { count: listingCount } = await admin.from("listings").select("id", { count: "exact", head: true }).eq("seller_id", profile.id).eq("status", "active");
    const { count: reportCount } = await admin.from("reports").select("id", { count: "exact", head: true }).eq("target_type", "user").eq("target_id", profile.id).eq("status", "pending");
    const { count: verifCount } = await admin.from("verification_requests").select("id", { count: "exact", head: true }).eq("user_id", profile.id).eq("status", "pending");
    enriched.push({ ...profile, listingCount: listingCount ?? 0, reportCount: reportCount ?? 0, hasPendingVerif: (verifCount ?? 0) > 0 });
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-neutral-900">Users</h1>
      <form className="mb-4" method="GET">
        <input type="text" name="q" defaultValue={q} placeholder="Search by name…"
          className="w-64 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none" />
        <button type="submit" className="ml-2 rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-white">Search</button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{(error as { message: string }).message}</p>}

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs text-neutral-500">
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Listings</th>
              <th className="px-4 py-2">Reports</th>
              <th className="px-4 py-2">Rating</th>
              <th className="px-4 py-2">Joined</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {enriched.map((user) => (
              <tr key={user.id} className={`hover:bg-neutral-50 ${user.is_suspended ? "opacity-60" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">
                    {user.name ?? "Unnamed"}
                    {user.is_admin && <span className="ml-1 text-xs text-orange-600">(admin)</span>}
                  </p>
                  {user.hasPendingVerif && <span className="text-xs font-medium text-amber-700">⏳ Verif. pending</span>}
                  {user.is_verified_seller && <span className="text-xs text-green-700">✅ Verified</span>}
                </td>
                <td className="px-4 py-3 text-neutral-500">{user.listingCount}</td>
                <td className={`px-4 py-3 ${user.reportCount > 0 ? "font-semibold text-red-600" : "text-neutral-500"}`}>{user.reportCount}</td>
                <td className="px-4 py-3 text-neutral-500">{(user.rating_count ?? 0) > 0 ? `⭐ ${(user.rating_avg ?? 0).toFixed(1)}` : "—"}</td>
                <td className="px-4 py-3 text-xs text-neutral-400">{formatRelativeDate(user.created_at)}</td>
                <td className="px-4 py-3">
                  {user.is_suspended
                    ? <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-700">Suspended</span>
                    : <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">Active</span>}
                </td>
                <td className="px-4 py-3">
                  <AdminUserActions userId={user.id} isSuspended={user.is_suspended ?? false} hasPendingVerif={user.hasPendingVerif} isAdmin={user.is_admin ?? false} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {enriched.length === 0 && <p className="p-6 text-center text-sm text-neutral-500">No users found.</p>}
      </div>
    </div>
  );
}
