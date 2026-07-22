// 404 for anything inside the (main) route group — listings, sellers,
// categories and so on. Rendering here (rather than only at the root) means the
// header and bottom nav stay in place, so a wrong URL still leaves the person
// somewhere they can navigate from.
import { NotFoundContent } from "@/components/ui/NotFoundContent";

export default function MainNotFound() {
  return <NotFoundContent />;
}