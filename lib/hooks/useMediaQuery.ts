"use client";

import { useEffect, useState } from "react";

// A simple hook that returns true when the given CSS media query matches.
// SSR-safe: defaults to false on the server to avoid hydration mismatches.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    // Set the initial value
    setMatches(mql.matches);
    // Update when it changes (e.g. window resize crosses a breakpoint)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}