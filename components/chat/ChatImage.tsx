"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Renders a chat image from a PRIVATE storage bucket. `imageUrl` is the storage
// path stored in messages.image_url (post-migration 0031). We mint a short-lived
// signed URL at render time — the read policy only lets conversation participants
// do this, so images stay private. `onExpand` receives the resolved signed URL so
// the parent's lightbox shows the same working URL.
export default function ChatImage({
  imageUrl,
  onExpand,
}: {
  imageUrl: string;
  onExpand: (url: string) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Backward-compat: any legacy row that still holds a full URL is used as-is.
    if (/^https?:\/\//.test(imageUrl)) {
      setSignedUrl(imageUrl);
      return;
    }

    const supabase = createClient();
    supabase.storage
      .from("chat-images")
      .createSignedUrl(imageUrl, 60 * 60) // valid for one hour
      .then(({ data }) => {
        if (active && data?.signedUrl) setSignedUrl(data.signedUrl);
      });

    return () => {
      active = false;
    };
  }, [imageUrl]);

  // Placeholder while the signed URL is being fetched.
  if (!signedUrl) {
    return (
      <div
        style={{
          width: 200,
          height: 140,
          borderRadius: 14,
          background: "rgba(0,0,0,0.06)",
        }}
      />
    );
  }

  return (
    <div
      onClick={() => onExpand(signedUrl)}
      style={{
        cursor: "pointer",
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        maxWidth: 200,
        transition: "transform 150ms ease",
      }}
      className="hover:scale-[1.02]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={signedUrl}
        alt="Shared image"
        style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }}
      />
      <div
        style={{
          background: "rgba(0,0,0,0.45)",
          padding: "4px 10px",
          fontSize: 10,
          color: "rgba(255,255,255,0.8)",
          textAlign: "center",
        }}
      >
        Tap to expand
      </div>
    </div>
  );
}