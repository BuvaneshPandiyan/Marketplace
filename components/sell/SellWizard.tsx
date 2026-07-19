"use client";

import Image from "next/image";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/useUser";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import { ProductTypeStep } from "@/components/sell/ProductTypeStep";
import { DynamicQuestionForm } from "@/components/sell/DynamicQuestionForm";
import { DetailsStep } from "@/components/sell/DetailsStep";
import { PhotosStep } from "@/components/sell/PhotosStep";
import { LocationStep } from "@/components/sell/LocationStep";
import type { CapturedPhoto } from "@/components/sell/CameraCapture";
import { buildSuggestedTitle } from "@/lib/client/suggestTitle";
import type { StoredLocation } from "@/lib/client/locationStorage";
import type { ProductType } from "@/types";
import { syncListingToSearch } from "@/lib/client/syncSearch";

export function SellWizard() {
  const router    = useRouter();
  const { user }  = useUser();
  const { lat: activeLat, lng: activeLng, locality: activeLocality } = useActiveLocation();
  const [supabase] = useState(() => createClient());

  const [step,             setStep]             = useState(1);
  const [productType,      setProductType]      = useState<ProductType | null>(null);
  const [bandArtFailed,    setBandArtFailed]    = useState(false);
  const [attributeAnswers, setAttributeAnswers] = useState<Record<string, string>>({});
  const [title,            setTitle]            = useState("");
  const [description,      setDescription]      = useState("");
  const [price,            setPrice]            = useState("");
  const [condition,        setCondition]        = useState<"new"|"used">("used");
  const [listingType,      setListingType]      = useState<"sale"|"rent">("sale");
  const [photos,           setPhotos]           = useState<CapturedPhoto[]>([]);
  const [location,         setLocation]         = useState<StoredLocation | null>(null);
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [submitError,      setSubmitError]      = useState<string | null>(null);

  const effectiveLocation: StoredLocation | null =
    location ?? (activeLat !== null && activeLng !== null && activeLocality
      ? { lat: activeLat, lng: activeLng, locality: activeLocality } : null);

  const suggestedTitle = productType ? buildSuggestedTitle(productType.name, attributeAnswers) : "";

  function handleDetailsChange(field: "title"|"description"|"price"|"condition"|"listingType", value: string) {
    if (field === "title")       setTitle(value);
    if (field === "description") setDescription(value);
    if (field === "price")       setPrice(value);
    if (field === "condition")   setCondition(value as "new"|"used");
    if (field === "listingType") setListingType(value as "sale"|"rent");
  }

  async function handleSubmit() {
    if (!user || !productType || !effectiveLocation) {
      setSubmitError("Something's missing — please check every step and try again.");
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);

    const attributesPayload = Object.entries(attributeAnswers).map(([key, value]) => ({ key, value }));
    const photosPayload = photos.map((photo, index) => ({
      url: photo.uploadedUrl,
      exif_lat: photo.exifLat,
      exif_lng: photo.exifLng,
      exif_timestamp: photo.exifTimestamp,
      captured_in_app: true,
      perceptual_hash: photo.perceptualHash ?? null,
      sort_order: index,
    }));

    const { data, error } = await supabase.rpc("create_listing_with_details", {
      p_product_type_id: productType.id,
      p_title:           title,
      p_description:     description || null,
      p_price:           Number(price),
      p_listing_type:    listingType,
      p_condition:       condition,
      p_locality:        effectiveLocation.locality,
      p_lat:             effectiveLocation.lat,
      p_lng:             effectiveLocation.lng,
      p_attributes:      attributesPayload,
      p_photos:          photosPayload,
    });

    setIsSubmitting(false);

    if (error) {
      setSubmitError(error.message || "Failed to post your listing. Please try again.");
      return;
    }

    if (data) {
      const newListingId = data as string;
      syncListingToSearch(newListingId);
      fetch("/api/notifications/listing-published", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: newListingId }),
      }).catch(() => {});
      fetch("/api/listings/check-fraud", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: newListingId }),
      }).catch(() => {});
    }
    router.push("/my-listings");
  }

  /* ── Loading state ─────────────────────────────────────────────────────── */
  if (!user) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
        <style>{`@keyframes sw-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign:"center" }}>
          <div style={{ width:44, height:44, borderRadius:"50%", border:"3px solid #0891b2", borderTopColor:"transparent", margin:"0 auto 12px", animation:"sw-spin 0.8s linear infinite" }} />
          <p style={{ fontSize:14, color:"#9ca3af" }}>Loading...</p>
        </div>
      </div>
    );
  }

  const STEPS = [
    { label:"Category", icon:"📦" },
    { label:"Questions", icon:"📝" },
    { label:"Details",   icon:"✅" },
    { label:"Photos",    icon:"📸" },
    { label:"Location",  icon:"📍" },
  ];

  const TIPS = [
    "Search your exact item — specific categories reach the right buyers faster.",
    "Answer every question honestly — buyers filter on these details.",
    "Write a clear title and a fair price — listings priced right sell 3× faster.",
    "Great photos are your #1 selling tool. Use natural light, capture all angles.",
    "Accurate location helps nearby buyers discover your listing first.",
  ];

  return (
    <div style={{ background:"#f5f4f2", minHeight:"100vh" }}>
      <style>{`
        /* ─── Animations ─────────────────────────────── */
        @keyframes sw-spin  { to{transform:rotate(360deg)} }
        @keyframes sw-in    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sw-done  { 0%{transform:scale(1)} 40%{transform:scale(1.25)} 100%{transform:scale(1)} }

        /* ─── Header ─────────────────────────────────── */
        .swh {
          position: relative;
          background: linear-gradient(135deg, #083344 0%, #155e75 45%, #0891b2 100%);
          padding: 26px 0 42px;
          overflow: hidden;
          /* Same masked bottom fade as every other page's band */
          -webkit-mask-image: linear-gradient(180deg, #000 84%, transparent 100%);
          mask-image: linear-gradient(180deg, #000 84%, transparent 100%);
        }
        .swh-band-art {
          position:absolute; inset:0; opacity:0.42; pointer-events:none;
          -webkit-mask-image: linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.55) 40%, #000 85%);
          mask-image: linear-gradient(90deg, transparent 2%, rgba(0,0,0,0.55) 40%, #000 85%);
          animation: swh-art-in 900ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes swh-art-in { from{opacity:0;transform:scale(1.08)} }
        .swh-band-scrim {
          position:absolute; inset:0; pointer-events:none;
          background: linear-gradient(90deg, rgba(8,51,68,0.82) 0%, rgba(8,51,68,0.4) 45%, transparent 78%);
        }
        .swh-band-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .swh-band-glow {
          position: absolute; top: -100px; right: -60px;
          width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%);
          animation: swh-breathe 9s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes swh-breathe { 0%,100%{transform:scale(1);opacity:0.85} 50%{transform:scale(1.14);opacity:1} }
        .swh-inner {
          position: relative; z-index: 1;
          max-width:1600px; margin:0 auto; padding:0 16px;
          display:flex; align-items:flex-start; justify-content:space-between; gap:20px; flex-wrap:wrap;
        }
        .swh-title { font-size:clamp(20px,3vw,30px); font-weight:900; color:#fff; margin:0; letter-spacing:-0.04em; line-height:1.1; }
        .swh-title em { font-style:normal; color:#67e8f9; }
        .swh-sub   { font-size:12.5px; font-weight:700; letter-spacing:-0.02em; color:rgba(255,255,255,0.75); margin:5px 0 0; }
        .swh-title-wrap { flex:1; min-width:0; }

        /* ─── Step bubbles ───────────────────────────── */
        .sw-steps { display:flex; align-items:center; gap:4px; flex-shrink:0; }
        .sw-bubble {
          width:28px; height:28px; border-radius:50%; flex-shrink:0;
          display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:700;
          transition:background 280ms ease, color 280ms ease, transform 280ms ease;
        }
        .sw-bubble-done   { background:#22c55e; color:white; animation:sw-done 360ms cubic-bezier(0.34,1.56,0.64,1); }
        .sw-bubble-active { background:#0891b2; color:white; }
        .sw-bubble-idle   { background:#f3f4f6; color:#b0b0b0; }
        .sw-line { width:16px; height:2px; border-radius:2px; flex-shrink:0; transition:background 280ms ease; }

        /* ─── Content grid ───────────────────────────── */
        .sw-content { position:relative; z-index:1; max-width:1600px; margin:0 auto; padding:0 16px 100px; margin-top:-18px; }
        @media(min-width:768px){ .sw-content { padding:0 32px 100px; } .swh-inner { padding:0 32px; } }
        /* Card + sidebar rise in on mount */
        .sw-card { min-width:0; max-width:100%; animation: sw-rise 500ms cubic-bezier(0.22,1,0.36,1) both; }
        .sw-side-tip  { animation: sw-rise 500ms cubic-bezier(0.22,1,0.36,1) 80ms both; }
        .sw-side-why  { animation: sw-rise 500ms cubic-bezier(0.22,1,0.36,1) 160ms both; }
        @keyframes sw-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        .sw-grid    { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:28px; align-items:start; }

        /* ─── Main card ──────────────────────────────── */
        .sw-card {
          background:white; border-radius:16px; border:1px solid #ebebeb;
          box-shadow:0 2px 12px rgba(0,0,0,0.05); padding:28px;
          min-width:0; max-width:100%; overflow:hidden;
          animation:sw-in 260ms cubic-bezier(0.22,1,0.36,1) both;
        }

        /* ─── Sidebar ────────────────────────────────── */
        .sw-side { display:flex; flex-direction:column; gap:16px; }
        .sw-side-tip {
          background:white; border-radius:14px;
          border:1.5px solid #a5f3fc;
          padding:18px;
          box-shadow:0 4px 18px rgba(8,145,178,0.1);
          transition:transform 260ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 260ms ease;
        }
        .sw-side-tip:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(8,145,178,0.2); }
        .sw-side-why {
          background:linear-gradient(135deg,#ecfeff,#f0fdff);
          border-radius:14px; border:1.5px solid #a5f3fc; padding:18px;
          box-shadow:0 4px 18px rgba(8,145,178,0.1);
          transition:transform 260ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 260ms ease;
        }
        .sw-side-why:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(8,145,178,0.2); }
        .sw-progress-card {
          background:white; border-radius:14px; border:1.5px solid #a5f3fc; padding:18px;
          box-shadow:0 4px 18px rgba(8,145,178,0.1);
          transition:transform 260ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 260ms ease;
        }
        .sw-progress-card:hover { transform:translateY(-2px); box-shadow:0 10px 30px rgba(8,145,178,0.2); }
        /* Zomato-ish: the perk rows nudge on hover */
        .sw-side-why > div { transition:transform 200ms ease; }
        .sw-side-why > div:hover { transform:translateX(3px); }

        /* ─── Mobile ─────────────────────────────────── */
        @media(max-width:860px){
          .sw-grid   { grid-template-columns:1fr !important; }
          /* Sidebar now shows on mobile, stacked below the card (was display:none).
             This is the Category tip / Why bazar.in / Progress content. */
          .sw-side   { display:flex !important; }
          .sw-card   { padding:18px 16px; border-radius:12px; }
          .swh-inner { flex-wrap:wrap; }
          .sw-steps  { gap:3px; }
          .sw-bubble { width:24px; height:24px; font-size:10px; }
          .sw-line   { width:10px; }
          .sw-content{ padding:12px 10px 80px; }
        }
        @media(prefers-reduced-motion:reduce){
          .sw-bubble,.sw-card { animation:none!important; transition:none!important; }
        }
      `}</style>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="swh">
        {!bandArtFailed && (
          <div className="swh-band-art" aria-hidden="true">
            <Image
              src="/images/sell-header.png"
              alt=""
              fill
              sizes="100vw"
              style={{ objectFit: "cover", objectPosition: "center right" }}
              onError={() => setBandArtFailed(true)}
            />
          </div>
        )}
        <div className="swh-band-scrim" aria-hidden="true" />
        <div className="swh-band-grid" aria-hidden="true" />
        <div className="swh-band-glow" aria-hidden="true" />
        <div className="swh-inner">
          {/* Title */}
          <div className="swh-title-wrap">
            <h1 className="swh-title">Sell something <em>brilliant</em></h1>
            <p className="swh-sub">Step {step} of 5 · {STEPS[step-1].label}</p>

          </div>

          {/* Step bubbles */}
          <div className="sw-steps">
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done   = step > n;
              const active = step === n;
              return (
                <div key={n} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div className={`sw-bubble ${done?"sw-bubble-done":active?"sw-bubble-active":"sw-bubble-idle"}`}>
                    {done ? "✓" : n}
                  </div>
                  {i < 4 && (
                    <div className="sw-line" style={{ background: step > n ? "#22c55e" : "#e5e7eb" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <div className="sw-content">
        <div className="sw-grid">

          {/* ── MAIN CARD — re-animates on every step change ── */}
          <div className="sw-card" key={step}>

            {/* Step 1: product type / category */}
            {step === 1 && (
              <ProductTypeStep
                onSelect={(selected) => {
                  setProductType(selected);
                  setAttributeAnswers({});
                  setStep(2);
                }}
              />
            )}

            {/* Step 2: dynamic category-specific questions */}
            {step === 2 && productType && (
              <DynamicQuestionForm
                schema={productType.question_schema}
                values={attributeAnswers}
                onChange={(key, value) => setAttributeAnswers(prev => ({ ...prev, [key]: value }))}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}

            {/* Step 3: title, description, price, condition */}
            {step === 3 && (
              <DetailsStep
                title={title}
                description={description}
                price={price}
                condition={condition}
                listingType={listingType}
                suggestedTitle={suggestedTitle}
                onChange={handleDetailsChange}
                onNext={() => setStep(4)}
                onBack={() => setStep(2)}
              />
            )}

            {/* Step 4: photos */}
            {step === 4 && (
              <PhotosStep
                photos={photos}
                onPhotosChange={setPhotos}
                userId={user.id}
                onNext={() => setStep(5)}
                onBack={() => setStep(3)}
              />
            )}

            {/* Step 5: location + submit */}
            {step === 5 && (
              <LocationStep
                locality={effectiveLocation?.locality ?? null}
                onLocationChange={setLocation}
                onSubmit={handleSubmit}
                onBack={() => setStep(4)}
                isSubmitting={isSubmitting}
                submitError={submitError}
              />
            )}
          </div>

          {/* ── SIDEBAR (hidden on mobile via CSS) ─────────────────────── */}
          <div className="sw-side">
            {/* Contextual tip */}
            <div className="sw-side-tip">
              <p style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.08em", color:"#0891b2", margin:"0 0 10px" }}>
                {STEPS[step-1].icon} {STEPS[step-1].label}
              </p>
              <p style={{ fontSize:13, color:"#6b7280", lineHeight:1.6, margin:0 }}>
                {TIPS[step-1]}
              </p>
            </div>

            {/* Why bazar.in */}
            <div className="sw-side-why">
              <p style={{ fontSize:11, fontWeight:800, color:"#0891b2", margin:"0 0 12px", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                Why bazar.in?
              </p>
              {[
                ["🚀","Free to list — always"],
                ["👀","Thousands of local buyers"],
                ["📲","Instant enquiry notifications"],
                ["✅","Verified seller community"],
              ].map(([icon, text]) => (
                <div key={text} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <span style={{ fontSize:14 }}>{icon}</span>
                  <p style={{ fontSize:12, color:"#92400e", margin:0, fontWeight:500 }}>{text}</p>
                </div>
              ))}
            </div>

            {/* Step progress mini-card */}
            <div className="sw-progress-card">
              <p style={{ fontSize:11, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.08em", color:"#9ca3af", margin:"0 0 12px" }}>
                Progress
              </p>
              {STEPS.map((s, i) => {
                const n = i + 1;
                const done   = step > n;
                const active = step === n;
                return (
                  <div key={n} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                    <div style={{ width:20, height:20, borderRadius:"50%", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:700, background: done?"#22c55e":active?"#0891b2":"#f3f4f6", color: done||active?"white":"#b0b0b0" }}>
                      {done?"✓":n}
                    </div>
                    <span style={{ fontSize:12, fontWeight:active?700:400, color:active?"#111":done?"#22c55e":"#9ca3af" }}>
                      {s.label}
                    </span>
                    {active && (
                      <span style={{ marginLeft:"auto", fontSize:10, color:"#0891b2", fontWeight:600 }}>
                        Current
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}