"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Banner artwork for the listing detail page. Separate client component so the
 * static-ish server page can still fall back gracefully — if the image is
 * missing, the plum gradient band shows through. Masked with a left-fade + scrim
 * so the item title stays readable.
 */
export function ListingBannerArt({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.34,
          pointerEvents: "none",
          WebkitMaskImage: "linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.5) 42%, #000 85%)",
          maskImage: "linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.5) 42%, #000 85%)",
        }}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes="100vw"
          style={{ objectFit: "cover", objectPosition: "center right" }}
          onError={() => setFailed(true)}
        />
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "linear-gradient(90deg, #2a0a2e 0%, #2a0a2ef2 34%, #2a0a2ecc 54%, transparent 84%)",
        }}
      />
    </>
  );
}