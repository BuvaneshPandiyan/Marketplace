"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Band artwork for the legal pages. Split into its own client component because
 * the legal pages themselves are static server components (force-static) and
 * can't use onError. If the image is missing, it quietly disappears and the
 * band's gradient + grid + glow show through.
 *
 * `scrim` is the band's darkest stop, used for a left-side scrim so the heading
 * stays readable over the image.
 */
export function LegalBandArt({ src, scrim }: { src: string; scrim: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <>
      <div className="pp-band-art" aria-hidden="true">
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
          background: `linear-gradient(90deg, ${scrim} 0%, ${scrim}99 42%, transparent 78%)`,
        }}
      />
    </>
  );
}