"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Optional prop: iconOnly renders a compact icon button instead of the text version
type LogoutButtonProps = { iconOnly?: boolean };

export function LogoutButton({ iconOnly = false }: LogoutButtonProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showTip, setShowTip] = useState(false);
  const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleLogout() {
    setIsSigningOut(true);
    setShowTip(true);
    if (tipTimer.current) clearTimeout(tipTimer.current);
    tipTimer.current = setTimeout(() => setShowTip(false), 1500);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // Desktop text version — unchanged
  if (!iconOnly) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isSigningOut}
        className="text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-60"
      >
        {isSigningOut ? "Logging out..." : "Logout"}
      </button>
    );
  }

  // Mobile icon-only version with tooltip
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        onClick={handleLogout}
        onFocus={() => setShowTip(true)}
        onBlur={() => setShowTip(false)}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        disabled={isSigningOut}
        aria-label="Logout"
        style={{
          width: 44, height: 44, borderRadius: "50%",
          border: "none", background: "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0, opacity: isSigningOut ? 0.5 : 1,
          color: "#6b7280", transition: "background 150ms ease, color 150ms ease",
        }}
        onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.06)"; }}
        onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        {/* Door-with-arrow logout icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>

      {/* Tooltip — fades in on hover/focus/tap */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: "50%",
          transform: `translateX(-50%) translateY(${showTip ? "0" : "-4px"})`,
          opacity: showTip ? 1 : 0,
          pointerEvents: "none",
          transition: "opacity 150ms ease, transform 150ms ease",
          background: "#1a1a1a",
          color: "white",
          fontSize: 11,
          fontWeight: 600,
          padding: "4px 10px",
          borderRadius: 100,
          whiteSpace: "nowrap",
          zIndex: 200,
        }}
      >
        Logout
      </div>
    </div>
  );
}