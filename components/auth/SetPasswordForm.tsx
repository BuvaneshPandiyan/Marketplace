"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm() {
  const router       = useRouter();
  const params       = useSearchParams();
  const redirectTo   = params.get("redirect") ?? "/";
  const [supabase]   = useState(() => createClient());

  const [password,   setPassword]  = useState("");
  const [confirm,    setConfirm]   = useState("");
  const [showPw,     setShowPw]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]     = useState<string | null>(null);
  const [done,       setDone]      = useState(false);

  const strength = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength.filter(Boolean).length];
  const strengthColor = ["", "#dc2626", "#f59e0b", "#3b82f6", "#22c55e"][strength.filter(Boolean).length];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8)   { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm)   { setError("Passwords don't match."); return; }
    setSubmitting(true);
    try {
      // Set password on the Supabase auth user
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) { setError(pwErr.message || "Failed to set password. Please try again."); return; }

      // Mark password_set = true in profiles
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ password_set: true }).eq("id", user.id);
      }

      setDone(true);
      setTimeout(() => router.push(redirectTo), 1800);
    } catch { setError("Network error. Please try again."); }
    finally { setSubmitting(false); }
  }

  // ── Success screen ───────────────────────────────────────────────────────
  if (done) return (
    <div style={{ textAlign:"center", padding:"24px 0" }}>
      <div style={{ width:72, height:72, borderRadius:"50%", background:"linear-gradient(135deg,#22c55e,#16a34a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 20px", boxShadow:"0 8px 32px rgba(34,197,94,0.35)" }}>
        ✓
      </div>
      <h2 style={{ fontSize:22, fontWeight:800, color:"#111", margin:"0 0 8px", letterSpacing:"-0.02em" }}>
        Password set!
      </h2>
      <p style={{ fontSize:14, color:"#6b7280", margin:"0 0 4px" }}>
        You can now log in with your phone number and this password.
      </p>
      <p style={{ fontSize:12, color:"#9ca3af" }}>Redirecting you now...</p>
    </div>
  );

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{`.sp-inp:focus{border-color:#ea580c!important;box-shadow:0 0 0 3px rgba(234,88,12,0.10)}`}</style>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#ea580c,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, marginBottom:16, boxShadow:"0 6px 20px rgba(234,88,12,0.30)" }}>
          🔐
        </div>
        <h1 style={{ fontSize:26, fontWeight:900, color:"#111", margin:"0 0 8px", letterSpacing:"-0.03em" }}>
          Set your password
        </h1>
        <p style={{ fontSize:14, color:"#6b7280", margin:0, lineHeight:1.6 }}>
          You signed in with OTP. Set a password so you can log in faster next time — no OTP needed.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>

        {/* Password */}
        <div>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>
            New password <span style={{ color:"#9ca3af", fontWeight:400 }}>(min 8 characters)</span>
          </label>
          <div style={{ position:"relative" }}>
            <input className="sp-inp"
              type={showPw ? "text" : "password"}
              placeholder="Create a strong password"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ width:"100%", padding:"11px 44px 11px 14px", borderRadius:10, border:"1.5px solid #e5e7eb", fontSize:14, outline:"none", background:"white", color:"#111", boxSizing:"border-box", transition:"border-color 150ms ease" }} />
            <button type="button" onClick={() => setShowPw(p => !p)}
              style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#9ca3af" }}>
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Strength bar */}
          {password && (
            <div style={{ marginTop:8 }}>
              <div style={{ display:"flex", gap:4, marginBottom:4 }}>
                {strength.map((ok, i) => (
                  <div key={i} style={{ flex:1, height:3, borderRadius:2, background:ok ? strengthColor : "#e5e7eb", transition:"background 200ms ease" }} />
                ))}
              </div>
              <p style={{ fontSize:11, color:strengthColor, fontWeight:600, margin:0 }}>{strengthLabel}</p>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>
            Confirm password
          </label>
          <input className="sp-inp"
            type="password"
            placeholder="Repeat your password"
            value={confirm} onChange={e => setConfirm(e.target.value)}
            style={{ width:"100%", padding:"11px 14px", borderRadius:10, border:`1.5px solid ${confirm && confirm !== password ? "#dc2626" : "#e5e7eb"}`, fontSize:14, outline:"none", background:"white", color:"#111", boxSizing:"border-box", transition:"border-color 150ms ease" }} />
          {confirm && confirm !== password && (
            <p style={{ fontSize:11, color:"#dc2626", margin:"5px 0 0" }}>Passwords don&apos;t match</p>
          )}
        </div>

        {error && (
          <div style={{ background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.2)", borderRadius:10, padding:"10px 14px" }}>
            <p style={{ fontSize:13, color:"#dc2626", margin:0 }}>{error}</p>
          </div>
        )}

        <button type="submit" disabled={submitting || !password || !confirm}
          style={{ width:"100%", padding:"13px", borderRadius:10, background:"linear-gradient(135deg,#ea580c,#f97316)", color:"white", border:"none", fontSize:14, fontWeight:700, cursor:"pointer", transition:"opacity 150ms ease, transform 150ms ease", opacity: submitting || !password || !confirm ? 0.65 : 1 }}>
          {submitting ? "Setting password..." : "Set Password & Continue →"}
        </button>

        {/* Skip option — they can set it later from profile settings */}
        <button type="button" onClick={() => router.push(redirectTo)}
          style={{ background:"none", border:"none", color:"#9ca3af", fontSize:12, cursor:"pointer", textAlign:"center", textDecoration:"underline" }}>
          Skip for now — I&apos;ll use OTP login
        </button>
      </form>

      <div style={{ marginTop:20, padding:"14px 16px", borderRadius:12, background:"#f9f8f6", border:"1px solid #e5e7eb" }}>
        <p style={{ fontSize:12, color:"#6b7280", margin:0, lineHeight:1.6 }}>
          🔒 Your password is securely hashed — not even we can read it.
          You can always log in with OTP if you forget your password.
        </p>
      </div>
    </div>
  );
}