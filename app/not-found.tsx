// Root-level 404 — the fallback for any path that doesn't match a route group
// (so it renders without the main header/nav). Same content, so the experience
// is identical wherever someone lands.
import { NotFoundContent } from "@/components/ui/NotFoundContent";
export default function RootNotFound() {
  return <NotFoundContent />;
}