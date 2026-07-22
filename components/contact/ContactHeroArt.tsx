/**
 * The contact hero's artwork.
 *
 * Now a thin wrapper over the shared CSS art system — no image, no failure
 * state, nothing to download. Kept as its own component so the contact page
 * (a force-static server component) keeps a stable import.
 */

import { BannerArt } from "@/components/ui/BannerArt";

export function ContactHeroArt() {
  return <BannerArt variant="glass" tint="#6ee7b7" tint2="#059669" id="contact" />;
}