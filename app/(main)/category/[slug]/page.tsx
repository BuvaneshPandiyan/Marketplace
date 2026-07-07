// Import the shared tiered feed component
import { TieredFeed } from "@/components/feed/TieredFeed";

// Define the page component shown at /category/[slug] — an async Server Component since
// Next.js 15 makes route params a Promise that must be awaited
export default async function CategoryPage({
  // Destructure the params prop, which Next.js provides as a Promise in this version
  params,
}: {
  // Type the params prop as a Promise resolving to our one dynamic segment
  params: Promise<{ slug: string }>;
}) {
  // Await the params to get the actual slug value out of the URL
  const { slug } = await params;
  // Render the same tiered feed used on the home page, scoped to this one category
  return <TieredFeed categorySlug={slug} />;
}
