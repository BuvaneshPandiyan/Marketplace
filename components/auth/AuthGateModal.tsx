"use client";
import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** e.g. "view the seller's phone number" */
  action?: string;
};

export function AuthGateModal({ isOpen, onClose, action = "continue" }: Props) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", fn); document.body.style.overflow = ""; };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const redirect = encodeURIComponent(pathname ?? "/");

  return createPortal(
    <>
      <style>{`
        @keyframes ag-bg-in  { from{opacity:0} to{opacity:1} }
        @keyframes ag-card-in{ from{opacity:0;transform:translate(-50%,-50%) scale(0.92)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position:"fixed", inset:0, zIndex:9990,
        background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)",
        animation:"ag-bg-in 200ms ease both",
      }} />

      {/* Modal card */}
      <div style={{
        position:"fixed", top:"50%", left:"50%", zIndex:9991,
        transform:"translate(-50%,-50%)",
        background:"white", borderRadius:20,
        padding:"32px 28px", width:"min(92vw,380px)",
        boxShadow:"0 24px 80px rgba(0,0,0,0.25)",
        animation:"ag-card-in 250ms cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        {/* Close */}
        <button type="button" onClick={onClose}
          style={{ position:"absolute", top:14, right:14, width:28, height:28, borderRadius:"50%", border:"none", background:"#f3f4f6", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#6b7280" }}>
          ✕
        </button>

        {/* Icon */}
        <div style={{ width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#ea580c,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 16px" }}>
          🔐
        </div>

        <h2 style={{ fontSize:20, fontWeight:800, color:"#111", textAlign:"center", margin:"0 0 8px", letterSpacing:"-0.02em" }}>
          Sign in to {action}
        </h2>
        <p style={{ fontSize:13, color:"#6b7280", textAlign:"center", margin:"0 0 24px", lineHeight:1.6 }}>
          Create a free account or log in to unlock this and all other features on bazar.in.
        </p>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <Link href={`/login?redirect=${redirect}`}
            style={{ display:"block", textAlign:"center", padding:"12px", borderRadius:10, background:"linear-gradient(135deg,#ea580c,#f97316)", color:"white", fontWeight:700, fontSize:14, textDecoration:"none" }}
            onClick={onClose}>
            Sign In
          </Link>
          <Link href={`/signup?redirect=${redirect}`}
            style={{ display:"block", textAlign:"center", padding:"12px", borderRadius:10, border:"1.5px solid #e5e7eb", color:"#374151", fontWeight:600, fontSize:14, textDecoration:"none", background:"white" }}
            onClick={onClose}>
            Create Account — It&apos;s Free
          </Link>
        </div>

        <p style={{ fontSize:11, color:"#9ca3af", textAlign:"center", margin:"16px 0 0" }}>
          🔒 Your data is safe. We never share your info.
        </p>
      </div>
    </>,
    document.body
  );
}