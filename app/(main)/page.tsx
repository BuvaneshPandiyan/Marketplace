import { HomeHero } from "@/components/home/HomeHero";
import { TieredFeed } from "@/components/feed/TieredFeed";

/**
 * Home.
 *
 * A hero carousel that opens with the brand statement, then rotates through the
 * promo slots (post free, nearby, verified, wishlist) — these used to be a
 * separate banner below the hero, now folded into the one carousel — followed by
 * the actual goods.
 */
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <TieredFeed />
    </>
  );
}