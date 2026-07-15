import { HomeHero } from "@/components/home/Homehero";
import { PromoBanner } from "@/components/home/Promobanner";
import { TieredFeed } from "@/components/feed/TieredFeed";

/**
 * Home.
 *
 * Reads top to bottom the way Zomato's does: a hero that says what this place
 * is, a promo slot that can be sold, then the actual goods. Previously this
 * file rendered <TieredFeed /> and nothing else, which is why the homepage had
 * no identity — it opened straight into a grid with no framing.
 *
 * Hero and banner are edge-aware (they manage their own max-width), so they sit
 * outside TieredFeed's container rather than being squeezed by it.
 */
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <PromoBanner />
      <TieredFeed />
    </>
  );
}