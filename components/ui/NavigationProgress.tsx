"use client";
// Thin orange progress bar at the top of the viewport during Next.js client-side navigation.
// Appears on route changes only (not initial page load). Matches the app's orange brand colour.
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const isFirst = useRef(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clear() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  useEffect(() => {
    // Skip the very first render — only animate on subsequent navigations
    if (isFirst.current) { isFirst.current = false; return; }

    clear();
    setVisible(true);
    setWidth(0);

    // Rapid start to 20%, then slow crawl to 85% while waiting for the page
    timers.current.push(setTimeout(() => setWidth(20), 30));
    timers.current.push(setTimeout(() => setWidth(60), 120));
    timers.current.push(setTimeout(() => setWidth(85), 350));

    // Complete and fade out
    timers.current.push(setTimeout(() => setWidth(100), 420));
    timers.current.push(setTimeout(() => setVisible(false), 650));
    timers.current.push(setTimeout(() => setWidth(0), 700));

    return clear;
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 99999,
        height: 3, pointerEvents: "none",
      }}
    >
      <div style={{
        height: "100%",
        width: `${width}%`,
        background: "linear-gradient(90deg, #ea580c, #f97316, #fb923c)",
        transition: width === 100
          ? "width 200ms ease-out"
          : "width 350ms cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: "0 0 8px rgba(234,88,12,0.6)",
      }} />
    </div>
  );
}