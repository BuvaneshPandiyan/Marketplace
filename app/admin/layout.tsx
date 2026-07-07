// Import Next.js's Link for the sidebar navigation
import Link from "next/link";
// Import our admin guard helper — redirects to "/" if the user isn't an admin
import { requireAdmin } from "@/lib/server/adminUtils";

// The layout shared by all /admin/* pages — checks admin privileges and renders the sidebar
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // requireAdmin() reads the session cookie and checks is_admin = true.
  // If the check fails it redirects to "/" — the rest of this layout never renders.
  await requireAdmin();

  return (
    // Full-height flex column on mobile (sidebar above, content below),
    // row on md+ screens (sidebar left, content right) — this makes admin usable on tablets
    <div className="flex min-h-screen flex-col bg-neutral-50 md:flex-row">

      {/* ── Sidebar navigation ── */}
      {/* On mobile: full-width top bar; on md+: fixed-width left column */}
      <aside className="w-full border-b border-neutral-200 bg-white md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        {/* Sidebar heading */}
        <div className="border-b border-neutral-200 px-4 py-3 md:py-4">
          <p className="text-sm font-bold text-orange-600">Admin Dashboard</p>
        </div>

        {/* Navigation links — horizontal scroll on mobile, vertical stack on md+ */}
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:space-y-0.5 md:overflow-x-visible">
          <SidebarLink href="/admin" label="📊 Analytics" />
          <SidebarLink href="/admin/listings" label="🚩 Flagged" />
          <SidebarLink href="/admin/reports" label="📋 Reports" />
          <SidebarLink href="/admin/users" label="👤 Users" />
          <SidebarLink href="/admin/audit" label="📝 Audit" />
          {/* Back to site — hidden on mobile (space constrained), shown on md+ */}
          <Link href="/" className="hidden shrink-0 rounded-lg px-3 py-2 text-xs text-neutral-400 hover:text-neutral-600 md:block">
            ← Back to site
          </Link>
        </nav>
      </aside>

      {/* ── Main content area — horizontally scrollable so wide tables don't break on mobile */}
      <main className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}

// A small sidebar navigation link component — shrinks cleanly on mobile
function SidebarLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="shrink-0 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-orange-50 hover:text-orange-700 md:w-full"
    >
      {label}
    </Link>
  );
}
