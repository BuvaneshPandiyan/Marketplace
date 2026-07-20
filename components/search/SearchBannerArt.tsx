"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Banner artwork for the search results page. Client component so the page can
 * fall back gracefully — if the image is missing, the ruby gradient shows
 * through. Masked left-fade + scrim so the heading stays readable.
 */
export function SearchBannerArt({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, opacity: 0.34, pointerEvents: "none",
          WebkitMaskImage: "linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.5) 42%, #000 85%)",
          maskImage: "linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.5) 42%, #000 85%)",
        }}
      >
        <Image src={src} alt="" fill sizes="100vw" style={{ objectFit: "cover", objectPosition: "center right" }} onError={() => setFailed(true)} />
      </div>
      <div
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "linear-gradient(90deg, #3d0714 0%, #3d0714f2 34%, #3d0714cc 54%, transparent 84%)",
        }}
      />
    </>
  );
}