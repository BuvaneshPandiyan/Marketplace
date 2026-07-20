"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Band artwork for the About page. Separate client component so the static
 * About page can still use an onError fallback — if the image is missing, the
 * bordeaux gradient band shows through cleanly.
 */
export function AboutBandArt({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.4,
          pointerEvents: "none",
          WebkitMaskImage: "linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.55) 40%, #000 85%)",
          maskImage: "linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.55) 40%, #000 85%)",
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
          background: "linear-gradient(90deg, #2b0a10 0%, #2b0a10f2 32%, #2b0a10cc 52%, transparent 82%)",
        }}
      />
    </>
  );
}