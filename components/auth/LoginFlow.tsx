"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_COUNTRY_CODE, toE164 } from "@/lib/phone";
import { CountryCodeSelect } from "@/components/auth/CountryCodeSelect";
import { OtpInput } from "@/components/auth/OtpInput";
import Link from "next/link";

type Mode = "password" | "otp";
type Step = "credentials" | "otp";

export function LoginFlow() {
  const searchParams = useSearchParams();
  const [supabase]   = useState(() => createClient());

  const [mode,          setMode]         = useState<Mode>("password");
  const [step,          setStep]         = useState<Step>("credentials");
  const [countryCode,   setCountryCode]  = useState(DEFAULT_COUNTRY_CODE);
  const [localNumber,   setLocalNumber]  = useState("");
  const [usernameOrPhone, setUoP]        = useState("");  // for password mode
  const [password,      setPassword]     = useState("");
  const [showPassword,  setShowPw]       = useState(false);
  const [otpCode,       setOtpCode]      = useState("");
  const [isSubmitting,  setIsSubmitting] = useState(false);
  const [error,         setError]        = useState<string|null>(null);
  const [cooldown,      setCooldown]     = useState(0);
  const [showSignupHint,setShowSignupHint] = useState(false);

  const redirectTo = searchParams.get("redirect") ?? "/";

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(p => Math.max(0, p-1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // ── Password login ──────────────────────────────────────────────────────
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!usernameOrPhone.trim() || !password) { setError("Please fill in all fields."); return; }
    setIsSubmitting(true);
    try {
      let phone = usernameOrPhone.trim();
      // If it doesn't look like a phone number, treat as username → look up phone
      if (!/^\+?\d{7,}$/.test(phone.replace(/\s/g,""))) {
        const { data: prof } = await supabase
          .from("profiles").select("phone").eq("username", phone.toLowerCase()).single();
        if (!prof?.phone) { setError("Username not found."); return; }
        phone = prof.phone;
      } else {
        // Normalize to E.164 if just digits
        if (!phone.startsWith("+")) phone = toE164(countryCode, phone.replace(/\D/g,""));
      }

      const { error: authErr } = await supabase.auth.signInWithPassword({ phone, password });
      if (authErr) { setError("Incorrect password. Try OTP login if you've forgotten it."); return; }
      /**
       * HARD navigation, deliberately — not router.push().
       *
       * A client-side push keeps Next's Router Cache alive, and that cache may
       * already hold a prefetched "redirect to /login" for every protected route
       * (the header prefetched them while we were logged out). Signing in doesn't
       * invalidate those entries, so the first tap on Wishlist serves the cached
       * redirect and bounces the user back here, still holding a valid session.
       * router.refresh() doesn't help: it refreshes the CURRENT route, not other
       * routes' prefetches.
       *
       * assign() throws the whole client away and asks the server fresh, with the
       * cookie attached. It costs one full page load — on a screen the user hits
       * once per session, to fix an auth bug. Correct beats fast here.
       */
      window.location.assign(redirectTo);
    } catch {
      setError("Network error. Please try again.");
    } finally { setIsSubmitting(false); }
  }

  // ── OTP send ────────────────────────────────────────────────────────────
  async function sendOtp() {
    setError(null);
    if (!localNumber.trim()) { setError("Please enter your phone number."); return; }
    const fullPhone = toE164(countryCode, localNumber);
    setIsSubmitting(true);
    try {
      // ── Check if this phone is registered before sending OTP ──────────
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", fullPhone)
        .maybeSingle();

      if (!existing) {
        setError(
          "No account found with this number. New here? Create a free account →"
        );
        setIsSubmitting(false);
        setShowSignupHint(true);
        return;
      }

      const res = await fetch("/api/auth/send-otp", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ phone: fullPhone }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to send OTP."); return; }
      setStep("otp"); setCooldown(60);
    } catch { setError("Network error. Please try again."); }
    finally { setIsSubmitting(false); }
  }

  // ── OTP verify ─────────────────────────────────────────────────────────
  async function verifyOtp(code: string) {
    setError(null);
    const fullPhone = toE164(countryCode, localNumber);
    setIsSubmitting(true);
    try {
      const { data, error: authErr } = await supabase.auth.verifyOtp({
        phone: fullPhone, token: code, type: "sms",
      });
      if (authErr || !data.user) { setError("That code didn't work. Please check and try again."); return; }

      // Use maybeSingle — single() throws if no row, maybeSingle returns null safely
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, username, password_set")
        .eq("id", data.user.id)
        .maybeSingle();

      // Hard navigation for every branch, same reasoning as the password path.
      // /onboarding is middleware-protected too, so a client-side push here can
      // bounce a brand-new user off their own onboarding page.

      // No profile at all → brand new user, needs onboarding
      if (!profile) {
        window.location.assign("/onboarding/profile"); return;
      }
      // Profile incomplete (name or username missing) → finish onboarding
      if (!profile.name || !profile.username) {
        window.location.assign("/onboarding/profile"); return;
      }
      // Existing user, profile complete but no password set → prompt once
      if (!profile.password_set) {
        window.location.assign(`/onboarding/set-password?redirect=${encodeURIComponent(redirectTo)}`); return;
      }
      // All good — existing user, profile + password complete
      window.location.assign(redirectTo);
    } catch { setError("Network error. Please try again."); }
    finally { setIsSubmitting(false); }
  }

  useEffect(() => {
    if (otpCode.length === 6 && !isSubmitting) verifyOtp(otpCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode]);

  // ── Shared styles ───────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width:"100%", padding:"11px 14px", borderRadius:10, fontSize:14,
    border:"1.5px solid #e5e7eb", outline:"none", background:"white", color:"#111",
    boxSizing:"border-box", transition:"border-color 150ms ease",
  };
  // Buttons use auth-btn-primary CSS class

  // ── OTP screen ─────────────────────────────────────────────────────────
  if (step === "otp") return (
    <div>
      <style>{`.auth-inp:focus{border-color:#7a1f3d!important;box-shadow:0 0 0 3px rgba(122,31,61,0.10)}`}</style>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:24, fontWeight:800, color:"#111", margin:"0 0 6px", letterSpacing:"-0.02em" }}>Enter the code</h2>
        <p style={{ fontSize:14, color:"#6b7280", margin:0 }}>Sent to {toE164(countryCode, localNumber)}</p>
      </div>
      <div style={{ marginBottom:20 }}>
        <OtpInput length={6} onChange={setOtpCode} />
      </div>
      {error && <p style={{ color:"#dc2626", fontSize:13, marginBottom:12 }}>{error}</p>}
      {isSubmitting && <p style={{ color:"#9ca3af", fontSize:13, marginBottom:12 }}>Verifying...</p>}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13 }}>
        <button type="button" style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer", fontSize:13 }}
          onClick={() => { setStep("credentials"); setOtpCode(""); setError(null); }}>
          ← Change number
        </button>
        <button type="button" disabled={cooldown>0||isSubmitting}
          style={{ background:"none", border:"none", color:cooldown>0?"#9ca3af":"#7a1f3d", cursor:cooldown>0?"not-allowed":"pointer", fontWeight:600, fontSize:13 }}
          onClick={sendOtp}>
          {cooldown>0 ? `Resend in ${cooldown}s` : "Resend OTP"}
        </button>
      </div>
    </div>
  );

  // ── Main login screen ───────────────────────────────────────────────────
  return (
    <div>
      <style>{`
        .auth-inp:focus{border-color:#7a1f3d!important;box-shadow:0 0 0 3px rgba(122,31,61,0.10)}
        .auth-tab{padding:9px 16px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all 180ms ease;flex:1;text-align:center;}
        .auth-tab-on{background:#7a1f3d;color:white;box-shadow:0 4px 14px rgba(122,31,61,0.35)}
        .auth-tab-off{background:transparent;color:#6b7280}
        .auth-tab-off:hover{color:#7a1f3d}
        .auth-btn-primary{width:100%;padding:13px;border-radius:10px;background:linear-gradient(135deg,#7a1f3d,#9c3050);color:white;border:none;font-size:14px;font-weight:700;cursor:pointer;transition:opacity 150ms ease,transform 150ms ease;letter-spacing:-0.01em}
        .auth-btn-primary:hover:not(:disabled){opacity:0.92;transform:translateY(-1px)}
        .auth-btn-primary:active{transform:scale(0.98)}
        .auth-btn-primary:disabled{opacity:0.65;cursor:not-allowed}
      `}</style>

      {/* Bazar logo on mobile (left panel hidden) */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:28 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#7a1f3d,#9c3050)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:"0 4px 14px rgba(122,31,61,0.3)" }}>
          🛍️
        </div>
        <div>
          <h1 style={{ fontSize:22, fontWeight:900, color:"#111", margin:0, letterSpacing:"-0.03em" }}>Welcome back</h1>
          <p style={{ fontSize:12, color:"#9ca3af", margin:0 }}>Sign in to your bazar.in account</p>
        </div>
      </div>

      <p style={{ fontSize:13, color:"#6b7280", margin:"0 0 20px" }}>
        New to bazar.in?{" "}
        <Link href="/signup" style={{ color:"#7a1f3d", fontWeight:700, textDecoration:"none" }}>Create a free account</Link>
      </p>

      {/* Mode toggle */}
      <div style={{ display:"flex", background:"#f3f4f6", borderRadius:11, padding:4, marginBottom:24, gap:2 }}>
        <button className={`auth-tab ${mode==="password"?"auth-tab-on":"auth-tab-off"}`}
          type="button" onClick={() => { setMode("password"); setError(null); }}>
          🔐 Password
        </button>
        <button className={`auth-tab ${mode==="otp"?"auth-tab-on":"auth-tab-off"}`}
          type="button" onClick={() => { setMode("otp"); setError(null); }}>
          📱 OTP Login
        </button>
      </div>

      {/* Password login form */}
      {mode === "password" && (
        <form onSubmit={handlePasswordLogin} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>
              Phone number or Username
            </label>
            <input className="auth-inp" style={inputStyle} type="text"
              placeholder="e.g. +91 98765 43210 or @yourname"
              value={usernameOrPhone}
              onChange={e => setUoP(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>
              Password
            </label>
            <div style={{ position:"relative" }}>
              <input className="auth-inp" style={inputStyle}
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button"
                style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", fontSize:14 }}
                onClick={() => setShowPw(p=>!p)}>
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          {error && <p style={{ color:"#dc2626", fontSize:13, margin:0 }}>{error}</p>}
          <button type="submit" className="auth-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
          <button type="button"
            style={{ background:"none", border:"none", color:"#7a1f3d", fontSize:13, fontWeight:600, cursor:"pointer", textAlign:"center" }}
            onClick={() => setMode("otp")}>
            Forgot password? Use OTP instead →
          </button>
        </form>
      )}

      {/* OTP login form */}
      {mode === "otp" && (
        <form onSubmit={e => { e.preventDefault(); sendOtp(); }} style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>
              Phone number
            </label>
            <div style={{ display:"flex", gap:0 }}>
              <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
              <input className="auth-inp" style={{ ...inputStyle, borderRadius:"0 10px 10px 0", borderLeft:"none" }}
                type="tel" inputMode="numeric" placeholder="98765 43210"
                value={localNumber} onChange={e => setLocalNumber(e.target.value.replace(/\D/g,""))} />
            </div>
          </div>
          {error && <p style={{ color:"#dc2626", fontSize:13, margin:0 }}>{error}</p>}
          {showSignupHint && (
            <div style={{ background:"rgba(122,31,61,0.05)", border:"1.5px solid rgba(122,31,61,0.2)", borderRadius:10, padding:"12px 14px" }}>
              <p style={{ fontSize:13, color:"#92400e", margin:"0 0 8px", fontWeight:600 }}>
                This number isn&apos;t registered yet.
              </p>
              <Link href="/signup" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", borderRadius:8, background:"linear-gradient(135deg,#7a1f3d,#9c3050)", color:"white", fontWeight:700, fontSize:13, textDecoration:"none" }}>
                Create a free account →
              </Link>
            </div>
          )}
          <button type="submit" className="auth-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Checking..." : "Send OTP"}
          </button>
        </form>
      )}
    </div>
  );
}