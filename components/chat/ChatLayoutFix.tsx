"use client";
// Locks document scroll while mounted (chat page only).
// This forces the body to stay still, so only the messages div scrolls.
// Runs on every route that includes this component; cleans up on unmount.
import { useEffect } from "react";

export function ChatLayoutFix() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return null;
}