// Import the client component that does all the actual searching/rendering
import { SearchResults } from "@/components/search/SearchResults";

// Define the page component shown at /search?q=... — an async Server Component since
// Next.js 15 makes searchParams a Promise that must be awaited
export default async function SearchPage({
  // Destructure the searchParams prop, which Next.js provides as a Promise in this version
  searchParams,
}: {
  // Type searchParams as a Promise resolving to a simple string-keyed object
  searchParams: Promise<{ q?: string }>;
}) {
  // Await the searchParams to get the actual ?q= value out of the URL
  const { q } = await searchParams;
  // Render the results component, seeded with whatever query was in the URL (or empty)
  return <SearchResults initialQuery={q ?? ""} />;
}
