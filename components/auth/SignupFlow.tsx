"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_COUNTRY_CODE, toE164 } from "@/lib/phone";
import { CountryCodeSelect } from "@/components/auth/CountryCodeSelect";
import { OtpInput } from "@/components/auth/OtpInput";
import Link from "next/link";

type Step = "details" | "otp";

export function SignupFlow() {
  const router     = useRouter();
  const [supabase] = useState(() => createClient());
  const fileRef    = useRef<HTMLInputElement>(null);

  // Form fields
  const [name,         setName]       = useState("");
  const [username,     setUsername]   = useState("");
  const [countryCode,  setCC]         = useState(DEFAULT_COUNTRY_CODE);
  const [phone,        setPhone]      = useState("");
  const [password,     setPassword]   = useState("");
  const [confirmPw,    setConfirmPw]  = useState("");
  const [photoFile,    setPhotoFile]  = useState<File|null>(null);
  const [photoPreview, setPreview]    = useState<string|null>(null);
  const [showPw,       setShowPw]     = useState(false);

  // OTP step
  const [step,         setStep]       = useState<Step>("details");
  const [otpCode,      setOtpCode]    = useState("");
  const [cooldown,     setCooldown]   = useState(0);

  // State
  const [isSubmitting, setSubmitting] = useState(false);
  const [error,        setError]      = useState<string|null>(null);
  const [usernameErr,  setUnErr]      = useState<string|null>(null);
  const [checkingUn,   setCheckingUn] = useState(false);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(p => Math.max(0,p-1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otpCode.length === 6 && !isSubmitting) completeSignup(otpCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpCode]);

  // Debounced username check
  useEffect(() => {
    if (!username || username.length < 3) { setUnErr(null); return; }
    setCheckingUn(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("username", username.toLowerCase()).maybeSingle();
      setUnErr(data ? "This username is taken." : null);
      setCheckingUn(false);
    }, 600);
    return () => clearTimeout(t);
  }, [username, supabase]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim())     { setError("Please enter your name."); return; }
    if (!username.trim()) { setError("Please choose a username."); return; }
    if (username.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(username.toLowerCase())) {
      setError("Username: letters, numbers, underscores only (3–20 chars)."); return;
    }
    if (usernameErr)      { setError("That username is already taken."); return; }
    if (!phone.trim())    { setError("Please enter your phone number."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPw) { setError("Passwords don't match."); return; }

    setSubmitting(true);
    try {
      const fullPhone = toE164(countryCode, phone);

      // ── Check if phone is already registered ──────────────────────────
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", fullPhone)
        .maybeSingle();

      if (existing) {
        setError("This phone number already has an account. Please log in instead.");
        setSubmitting(false);
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
    finally { setSubmitting(false); }
  }

  async function sendOtp() {
    setError(null); setSubmitting(true);
    try {
      const fullPhone = toE164(countryCode, phone);
      const res = await fetch("/api/auth/send-otp", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ phone: fullPhone }),
      });
      if (!res.ok) { const j = await res.json(); setError(j.error ?? "Failed."); return; }
      setCooldown(60);
    } catch { setError("Network error."); }
    finally { setSubmitting(false); }
  }

  async function completeSignup(code: string) {
    setError(null); setSubmitting(true);
    try {
      const fullPhone = toE164(countryCode, phone);

      // 1. Verify OTP
      const { data, error: otpErr } = await supabase.auth.verifyOtp({
        phone: fullPhone, token: code, type: "sms",
      });
      if (otpErr || !data.user) { setError("Invalid OTP. Please try again."); return; }

      // 2. Set password
      const { error: pwErr } = await supabase.auth.updateUser({ password });
      if (pwErr) console.warn("Password set failed:", pwErr.message);

      // 3. Upload profile photo if provided
      let photoUrl: string|null = null;
      if (photoFile) {
        const path = `${data.user.id}/${Date.now()}-${photoFile.name}`;
        const { error: upErr } = await supabase.storage.from("profile-photos").upload(path, photoFile, { upsert:true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
          photoUrl = urlData.publicUrl;
        }
      }

      // 4. Upsert profile (handles race with trigger — upsert is safe either way)
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id:                data.user.id,
        name:              name.trim(),
        username:          username.toLowerCase().trim(),
        phone:             fullPhone,
        password_set:      true,
        ...(photoUrl ? { profile_photo_url: photoUrl } : {}),
      }, { onConflict: "id" });

      // 5. Welcome notification (fire-and-forget)
      fetch("/api/notifications/welcome", { method:"POST" }).catch(()=>{});

      router.push("/");
    } catch { setError("Something went wrong. Please try again."); }
    finally { setSubmitting(false); }
  }

  // Shared styles
  const inp: React.CSSProperties = {
    width:"100%", padding:"11px 14px", borderRadius:10, fontSize:14,
    border:"1.5px solid #e5e7eb", outline:"none", background:"white",
    color:"#111", boxSizing:"border-box", transition:"border-color 150ms ease",
  };

  // ── OTP Step ────────────────────────────────────────────────────────────
  if (step === "otp") return (
    <div>
      <style>{`.auth-inp:focus{border-color:#ea580c!important;box-shadow:0 0 0 3px rgba(234,88,12,0.10)}`}</style>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ width:56, height:56, borderRadius:"50%", background:"linear-gradient(135deg,#ea580c,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, margin:"0 auto 16px" }}>
          📱
        </div>
        <h2 style={{ fontSize:24, fontWeight:800, color:"#111", margin:"0 0 6px", letterSpacing:"-0.02em" }}>Verify your number</h2>
        <p style={{ fontSize:14, color:"#6b7280", margin:0 }}>We sent a 6-digit code to {toE164(countryCode, phone)}</p>
      </div>
      <div style={{ marginBottom:20 }}>
        <OtpInput length={6} onChange={setOtpCode} />
      </div>
      {error && <p style={{ color:"#dc2626", fontSize:13, marginBottom:12, textAlign:"center" }}>{error}</p>}
      {isSubmitting && (
        <p style={{ color:"#9ca3af", fontSize:13, marginBottom:12, textAlign:"center" }}>
          {otpCode.length === 6 ? "Setting up your account..." : "Sending..."}
        </p>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
        <button type="button" style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer" }}
          onClick={() => { setStep("details"); setOtpCode(""); setError(null); }}>
          ← Go back
        </button>
        <button type="button" disabled={cooldown>0||isSubmitting}
          style={{ background:"none", border:"none", color:cooldown>0?"#9ca3af":"#ea580c", fontWeight:600, cursor:cooldown>0?"not-allowed":"pointer" }}
          onClick={sendOtp}>
          {cooldown>0 ? `Resend in ${cooldown}s` : "Resend OTP"}
        </button>
      </div>
    </div>
  );

  // ── Details Step ────────────────────────────────────────────────────────
  return (
    <div>
      <style>{`
        .auth-inp:focus{border-color:#ea580c!important;box-shadow:0 0 0 3px rgba(234,88,12,0.10)}
        .auth-inp{transition:border-color 150ms ease}
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:28, fontWeight:900, color:"#111", margin:"0 0 6px", letterSpacing:"-0.03em" }}>Create account</h1>
        <p style={{ fontSize:14, color:"#6b7280", margin:0 }}>
          Already have one?{" "}
          <Link href="/login" style={{ color:"#ea580c", fontWeight:700, textDecoration:"none" }}>Sign in</Link>
        </p>
      </div>

      <form onSubmit={handleSendOtp} style={{ display:"flex", flexDirection:"column", gap:14 }}>

        {/* Profile photo */}
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:4 }}>
          <div
            style={{ width:68, height:68, borderRadius:"50%", border:"2px dashed #d1d5db", overflow:"hidden", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#f9f8f6", position:"relative" }}
            onClick={() => fileRef.current?.click()}>
            {photoPreview
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={photoPreview} alt="Preview" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
              : <span style={{ fontSize:26 }}>📷</span>
            }
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:"#374151", margin:"0 0 2px" }}>Profile photo</p>
            <button type="button" style={{ fontSize:12, color:"#ea580c", fontWeight:600, background:"none", border:"none", cursor:"pointer", padding:0 }}
              onClick={() => fileRef.current?.click()}>
              {photoPreview ? "Change photo" : "Upload photo (optional)"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhotoChange} />
        </div>

        {/* Name */}
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>Full name *</label>
          <input className="auth-inp" style={inp} type="text" placeholder="e.g. Priya Sharma"
            value={name} onChange={e => setName(e.target.value)} />
        </div>

        {/* Username */}
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>Username *</label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#9ca3af", fontSize:14 }}>@</span>
            <input className="auth-inp" style={{ ...inp, paddingLeft:28 }}
              type="text" placeholder="yourname" maxLength={20}
              value={username}
              onChange={e => setUsername(e.target.value.replace(/[^a-z0-9_]/gi,"").toLowerCase())} />
            {checkingUn && <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:12, color:"#9ca3af" }}>Checking...</span>}
            {!checkingUn && username.length >= 3 && !usernameErr && <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:16 }}>✅</span>}
          </div>
          {usernameErr && <p style={{ fontSize:11, color:"#dc2626", margin:"4px 0 0" }}>{usernameErr}</p>}
          <p style={{ fontSize:11, color:"#9ca3af", margin:"4px 0 0" }}>3–20 chars, letters/numbers/underscores</p>
        </div>

        {/* Phone */}
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>Phone number *</label>
          <div style={{ display:"flex" }}>
            <CountryCodeSelect value={countryCode} onChange={setCC} />
            <input className="auth-inp" style={{ ...inp, borderRadius:"0 10px 10px 0", borderLeft:"none" }}
              type="tel" inputMode="numeric" placeholder="98765 43210"
              value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,""))} />
          </div>
        </div>

        {/* Password */}
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>Password * (min 8 characters)</label>
          <div style={{ position:"relative" }}>
            <input className="auth-inp" style={inp} type={showPw?"text":"password"}
              placeholder="Create a strong password" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:14 }}
              onClick={() => setShowPw(p=>!p)}>{showPw?"🙈":"👁️"}</button>
          </div>
          {/* Password strength indicator */}
          {password && (
            <div style={{ display:"flex", gap:4, marginTop:6 }}>
              {[password.length>=8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].map((ok,i) => (
                <div key={i} style={{ flex:1, height:3, borderRadius:2, background:ok?"#22c55e":"#e5e7eb", transition:"background 200ms ease" }} />
              ))}
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>Confirm password *</label>
          <input className="auth-inp" style={{ ...inp, borderColor: confirmPw && confirmPw!==password?"#dc2626":"#e5e7eb" }}
            type="password" placeholder="Repeat your password"
            value={confirmPw} onChange={e => setConfirmPw(e.target.value)} />
          {confirmPw && confirmPw !== password && <p style={{ fontSize:11, color:"#dc2626", margin:"4px 0 0" }}>Passwords don&apos;t match</p>}
        </div>

        {error && (
          <div>
            <p style={{ color:"#dc2626", fontSize:13, margin:0 }}>{error}</p>
            {error.includes("already has an account") && (
              <Link href="/login" style={{ fontSize:13, color:"#ea580c", fontWeight:700, textDecoration:"none", display:"inline-block", marginTop:6 }}>
                → Sign in to your account
              </Link>
            )}
          </div>
        )}

        <button type="submit" disabled={isSubmitting || !!usernameErr}
          style={{ width:"100%", padding:"13px", borderRadius:10, background:"linear-gradient(135deg,#ea580c,#f97316)", color:"white", border:"none", fontSize:14, fontWeight:700, cursor:"pointer", opacity: isSubmitting||!!usernameErr ? 0.7:1 }}>
          {isSubmitting ? "Sending OTP..." : "Create Account →"}
        </button>

        <p style={{ fontSize:11, color:"#9ca3af", textAlign:"center", margin:0 }}>
          By creating an account you agree to our Terms &amp; Privacy Policy.
        </p>
      </form>
    </div>
  );
}