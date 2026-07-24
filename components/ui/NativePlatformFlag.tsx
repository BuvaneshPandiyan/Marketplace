"use client";

import { useEffect } from "react";

/**
 * Marks the document when running inside the Capacitor app.
 *
 * Android's WebView is not Chrome. It shares the Chromium engine but not the
 * same compositing budget, and on mid-range phones it handles two things very
 * badly: backdrop-filter, and large blur() radii. Both are cheap on desktop
 * because the GPU absorbs them; in a WebView they frequently fall back to
 * software rasterisation, which means real work on the main thread on every
 * single frame.
 *
 * The site currently uses 82 backdrop-filters. That is fine in a browser. But a
 * feed card carries three of them, so one screen of listings asks the WebView
 * for roughly 150 backdrop blurs per frame — which is exactly where the scroll
 * stutter comes from.
 *
 * Rather than strip the design everywhere, this adds a single class to <html>
 * so globals.css can swap the most expensive effects for cheap equivalents,
 * but ONLY inside the app. The website keeps its full look.
 */
export function NativePlatformFlag() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!cancelled && Capacitor.isNativePlatform()) {
          document.documentElement.classList.add("is-native-app");
          // Also expose the platform, in case iOS ever needs different
          // treatment — WKWebView handles blur far better than Android's.
          document.documentElement.dataset.platform = Capacitor.getPlatform();
        }
      } catch {
        // Capacitor isn't installed or we're on the web — nothing to do, and
        // this must never break the page.
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return null;
}