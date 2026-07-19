"use client";

/**
 * The contact hero's optional artwork.
 *
 * Split into its own client component so it can use onError — the contact page is
 * force-static and a pure server component, which can't. If
 * /images/contact-header.png is absent, this hides itself and the hero shows its
 * plain emerald gradient. Same optional-artwork pattern as every other header
 * (WishlistBandArt, the chats/notifications/menu headers).
 */

import Image from "next/image";
import { useState } from "react";

export function ContactHeroArt() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="ct-hero-art" aria-hidden="true">
      <Image
        src="/images/contact-header.png"
        alt=""
        fill
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "center right" }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}