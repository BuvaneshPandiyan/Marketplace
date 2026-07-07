// Import our admin utilities
import { requireAdmin, getAdminSupabase } from "@/lib/server/adminUtils";

// The /admin page — analytics overview
export default async function AdminAnalyticsPage() {
  // Guard: will redirect to "/" if the caller isn't an admin
  await requireAdmin();

  // Create the service-role client to fetch stats (bypasses RLS)
  const admin = getAdminSupabase();

  // Call the get_admin_stats() PostgreSQL function — returns all platform metrics in one query
  const { data: statsRows, error } = await admin.rpc("get_admin_stats");
  // Extract the first (and only) row, or use zeros if the function failed
  const stats = (statsRows as unknown as Record<string, number>[] | null)?.[0] ?? null;

  // Render the analytics dashboard
  return (
    <div>
      {/* Page heading */}
      <h1 className="mb-6 text-xl font-bold text-neutral-900">Platform Analytics</h1>

      {/* Show an error state if the stats query failed */}
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Failed to load stats: {error.message}
        </p>
      )}

      {/* The stats card grid — two columns on small screens, three on larger */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Each StatCard renders one metric */}
        <StatCard label="Total Users" value={stats?.total_users ?? 0} icon="👤" />
        <StatCard label="Active Listings" value={stats?.total_active_listings ?? 0} icon="📦" />
        <StatCard label="Listed Today" value={stats?.listings_today ?? 0} icon="🆕" color="blue" />
        <StatCard label="Flagged (Pending)" value={stats?.flagged_listings_pending ?? 0} icon="🚩" color="orange" />
        <StatCard label="Reports Pending" value={stats?.reports_pending ?? 0} icon="📋" color="orange" />
        <StatCard label="Verifications Pending" value={stats?.verifications_pending ?? 0} icon="✅" color="green" />
        <StatCard label="Anomalies Detected" value={stats?.total_anomalies ?? 0} icon="⚠️" color="red" />
      </div>

      {/* A note about data freshness */}
      <p className="mt-6 text-xs text-neutral-400">
        Stats are live (no caching) — refreshed on every page load.
      </p>
    </div>
  );
}

// A small internal component rendering one metric card
function StatCard({
  label,
  value,
  icon,
  color = "neutral",
}: {
  // The metric's display label
  label: string;
  // The numeric value to display
  value: number;
  // An emoji icon for visual identification
  icon: string;
  // The accent colour theme: "neutral", "blue", "orange", "green", or "red"
  color?: "neutral" | "blue" | "orange" | "green" | "red";
}) {
  // Map colour names to Tailwind class strings for the value text
  const valueClass: Record<string, string> = {
    neutral: "text-neutral-900",
    blue: "text-blue-700",
    orange: "text-orange-600",
    green: "text-green-700",
    red: "text-red-700",
  };

  return (
    // A white rounded card with a subtle border
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      {/* The emoji icon + label row */}
      <p className="mb-1 text-xs text-neutral-500">
        {icon} {label}
      </p>
      {/* The big number — uses the colour appropriate for its meaning */}
      <p className={`text-3xl font-bold ${valueClass[color]}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}
