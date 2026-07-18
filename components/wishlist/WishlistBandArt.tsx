"use client";

/**
 * The wishlist hero band's optional artwork.
 *
 * Split into its own client component purely so it can use onError — the page is
 * a server component and can't. If /images/header-wishlist.png is absent, this
 * hides itself and the band shows its plain teal gradient, same optional-artwork
 * behaviour as every other header on the site.
 */

import Image from "next/image";
import { useState } from "react";

export function WishlistBandArt() {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="wp-band-art">
      <Image
        src="/images/header-wishlist.png"
        alt=""
        fill
        sizes="100vw"
        style={{ objectFit: "cover", objectPosition: "top right" }}
        onError={() => setFailed(true)}
      />
    </div>
  );
}