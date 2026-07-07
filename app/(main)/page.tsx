// Import the tiered feed component — this page just renders it with no category filter
import { TieredFeed } from "@/components/feed/TieredFeed";

// Define the Home page component — this renders at the root URL "/"
export default function HomePage() {
  // Render the full tiered, location-ranked feed with no category restriction
  return <TieredFeed />;
}
