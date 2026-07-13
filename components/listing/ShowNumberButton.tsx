"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthGate } from "@/components/auth/AuthGateContext";

type Props = {
  listingId: string;
  isLoggedIn: boolean;
  size?: "default" | "compact";
};

export function ShowNumberButton({ listingId, isLoggedIn, size = "default" }: Props) {
  const [supabase]  = useState(() => createClient());
  const [phone,     setPhone]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [revealed,  setRevealed]  = useState(false);
  const { requireAuth } = useAuthGate();

  const compact = size === "compact";

  // ── Phone revealed ───────────────────────────────────────────────────────
  if (phone) {
    return (
      <a href={`tel:${phone}`}
        style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          width:"100%", padding: compact ? "8px 16px" : "13px 20px",
          borderRadius:100, border:"1.5px solid #22c55e",
          background:"rgba(34,197,94,0.06)", color:"#16a34a",
          fontSize: compact ? 12 : 14, fontWeight:700, textDecoration:"none",
          transition:"background 150ms ease",
        }}>
        <svg width={compact?14:18} height={compact?14:18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        {/* Show masked number first, then reveal */}
        {revealed ? phone : `+91 ${phone.slice(-10,-5)}•••••`}
        {!revealed && (
          <span style={{ fontSize:10, fontWeight:700, background:"#16a34a", color:"white", padding:"1px 6px", borderRadius:100 }}>
            TAP TO CALL
          </span>
        )}
      </a>
    );
  }

  // ── Not logged in — show modal on click ─────────────────────────────────
  async function handleClick() {
    if (!requireAuth("view the seller's phone number")) return;
    // Logged in — reveal phone
    setError(null);
    setIsLoading(true);
    const { data, error: rpcError } = await supabase.rpc("reveal_seller_phone", { p_listing_id: listingId });
    setIsLoading(false);
    if (rpcError || !data) {
      setError(rpcError?.message ?? "Could not retrieve the phone number.");
      return;
    }
    setPhone(data as string);
    setRevealed(true);
  }

  if (error) return (
    <p style={{ fontSize:12, color:"#dc2626", textAlign:"center", padding:"8px 0" }}>{error}</p>
  );

  return (
    <button type="button" onClick={handleClick} disabled={isLoading}
      style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        width:"100%", padding: compact ? "8px 16px" : "13px 20px",
        borderRadius:100, border:"1.5px solid #e5e7eb",
        background:"white", color: isLoggedIn ? "#374151" : "#9ca3af",
        fontSize: compact ? 12 : 14, fontWeight:600, cursor:"pointer",
        transition:"all 150ms ease",
      }}>
      <svg width={compact?14:18} height={compact?14:18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
      {isLoading ? "Loading..." : isLoggedIn ? "Show phone number" : "Login to view phone number"}
      {!isLoggedIn && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      )}
    </button>
  );
}