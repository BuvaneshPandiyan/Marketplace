// Mark as Client Component since it manages open/close state and a Supabase insert
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import type { ReportTargetType, ReportReason } from "@/types";

const REASON_LABELS: Record<ReportReason, string> = {
  fake_listing: "Fake or misleading listing",
  scam: "Scam or fraud",
  inappropriate: "Inappropriate content",
  wrong_category: "Wrong category",
  other: "Other",
};

type ReportButtonProps = {
  targetType: ReportTargetType;
  targetId: string;
  isLoggedIn: boolean;
};

export function ReportButton({ targetType, targetId, isLoggedIn }: ReportButtonProps) {
  const [supabase] = useState(() => createClient());
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("fake_listing");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Portal needs the document — guard against SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll + close on Escape while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, [isOpen]);

  async function submit() {
    setError(null);
    setIsSubmitting(true);
    const { error: insertError } = await supabase.from("reports").insert({
      reporter_id: (await supabase.auth.getUser()).data.user?.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      comment: comment.trim() || null,
    });
    setIsSubmitting(false);
    if (insertError) {
      setError(insertError.code === "23505" ? "You've already reported this." : insertError.message);
      return;
    }
    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <p className="text-xs text-neutral-500">
        ✓ Report submitted. Thank you for helping keep the marketplace safe.
      </p>
    );
  }

  const modal = isOpen && (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Report this ${targetType}`}
      onClick={() => setIsOpen(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
        background: "rgba(15,10,20,0.55)",
        backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        animation: "rpt-fade 160ms ease both",
      }}
    >
      <style>{`
        @keyframes rpt-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes rpt-pop { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }
        .rpt-card { animation: rpt-pop 220ms cubic-bezier(0.22,1,0.36,1) both; }
        .rpt-field { transition: border-color 180ms ease, box-shadow 180ms ease; }
        .rpt-field:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.13); outline: none; }
        .rpt-submit { transition: background 180ms ease, transform 160ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 180ms ease; }
        .rpt-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(220,38,38,0.4); }
        .rpt-cancel { transition: background 160ms ease, border-color 160ms ease; }
        @media(prefers-reduced-motion:reduce){ .rpt-card, .rpt-submit:hover { animation: none; transform: none; } }
      `}</style>

      <div
        className="rpt-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 400, background: "#fff", borderRadius: 20,
          padding: 24, boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg,#dc2626,#f87171)", boxShadow: "0 4px 12px rgba(220,38,38,0.35)",
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </span>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em", color: "#111827", margin: 0 }}>
              Report this {targetType}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "1px 0 0" }}>Help us keep bazar.in safe.</p>
          </div>
        </div>

        <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", margin: "16px 0 6px" }}>Reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as ReportReason)}
          className="rpt-field"
          style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e5e7eb", padding: "11px 13px", fontSize: 14, fontWeight: 600, color: "#111827", background: "#fff" }}
        >
          {(Object.keys(REASON_LABELS) as ReportReason[]).map((key) => (
            <option key={key} value={key}>{REASON_LABELS[key]}</option>
          ))}
        </select>

        <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#9ca3af", margin: "14px 0 6px" }}>Details (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add more detail…"
          rows={3}
          className="rpt-field"
          style={{ width: "100%", borderRadius: 12, border: "1.5px solid #e5e7eb", padding: "11px 13px", fontSize: 14, resize: "none", color: "#111827" }}
        />

        {error && <p style={{ fontSize: 12.5, color: "#dc2626", fontWeight: 600, margin: "10px 0 0" }}>{error}</p>}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rpt-cancel"
            style={{ flex: 1, borderRadius: 100, border: "1.5px solid #e5e7eb", padding: "11px", fontSize: 14, fontWeight: 700, color: "#6b7280", background: "#fff", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={submit}
            className="rpt-submit"
            style={{ flex: 1, borderRadius: 100, border: "none", padding: "11px", fontSize: 14, fontWeight: 800, color: "#fff", cursor: "pointer", background: "linear-gradient(135deg,#dc2626,#ef4444)", opacity: isSubmitting ? 0.65 : 1 }}
          >
            {isSubmitting ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!isLoggedIn) { window.location.href = "/login"; return; }
          setIsOpen(true);
        }}
        className="text-xs text-neutral-400 hover:text-red-600"
      >
        Report
      </button>
      {mounted && modal && createPortal(modal, document.body)}
    </>
  );
}