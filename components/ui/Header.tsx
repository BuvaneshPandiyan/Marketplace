"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { LocationPill } from "@/components/location/LocationPill";
import { LocationSearchInput } from "@/components/location/LocationSearchInput";
import { SearchBar } from "@/components/search/SearchBar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import type { StoredLocation } from "@/lib/client/locationStorage";

// ── Shared heart icon ──────────────────────────────────────────────────
function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// ── Unified user avatar ────────────────────────────────────────────────
// Shows profile photo if available (avatarUrl), falls back to orange person icon.
// NOTE: profile.avatarUrl is not yet a real field — add it to the profiles table
// and useUser hook when photo upload is implemented. Until then, always shows icon.
function UserAvatar({ profile, iconSize = 22 }: {
  profile: { name?: string | null; avatarUrl?: string | null } | null;
  iconSize?: number;
}) {
  const avatarUrl = profile?.avatarUrl;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={profile?.name ?? "Account"}
        style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
      />
    );
  }
  // Fallback: orange person/user outline icon
  return (
    <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none"
      stroke="#ea580c" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function Header() {
  const { user, profile, isLoading } = useUser();
  const { locality, needsSetup, recentLocations, setActiveLocation, detectCurrentLocation } = useActiveLocation();
  const [scrolled, setScrolled] = useState(false);
  const [wishlistPop, setWishlistPop] = useState(false);
  const [locSheetOpen, setLocSheetOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const locTriggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const isWishlistActive = pathname === "/wishlist";
  const isMyListingsActive = pathname === "/my-listings";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleWishlistClick() {
    setWishlistPop(true);
    setTimeout(() => setWishlistPop(false), 400);
  }

  const openLocSheet = useCallback(() => {
    setLocSheetOpen(true);
    setDetectError(null);
    document.body.style.overflow = "hidden";
  }, []);

  const closeLocSheet = useCallback(() => {
    setLocSheetOpen(false);
    document.body.style.overflow = "";
    setTimeout(() => locTriggerRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (!locSheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeLocSheet(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [locSheetOpen, closeLocSheet]);

  useEffect(() => () => { document.body.style.overflow = ""; }, []);

  async function handleDetectLocation() {
    setDetectError(null);
    setIsDetecting(true);
    const result = await detectCurrentLocation();
    setIsDetecting(false);
    if (result.success) closeLocSheet();
    else setDetectError(result.error ?? "Couldn't detect location.");
  }

  function handleSelectLocation(location: StoredLocation) {
    setActiveLocation(location);
    closeLocSheet();
  }

  return (
    <>
      <style>{`
        @keyframes border-hue {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .logo-link { transition: letter-spacing 200ms ease-out, transform 200ms ease-out; }
        .logo-link:hover { letter-spacing: -0.05em; transform: scale(1.03); }

        /* Unified icon button — location, avatar (fallback), logout, bell, wishlist */
        .header-icon-btn {
          width: 44px; height: 44px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 50%; border: none; background: transparent;
          color: #4b5563; cursor: pointer; flex-shrink: 0;
          transition: transform 150ms ease, background 150ms ease;
        }
        .header-icon-btn:active { transform: scale(0.93); background: rgba(234,88,12,0.08); }
        .header-icon-btn:hover  { background: rgba(0,0,0,0.04); }

        .sell-btn {
          transition: transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms ease;
          position: relative; overflow: hidden;
        }
        .sell-btn::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          transform: translateX(-100%); transition: transform 0s;
        }
        .sell-btn:hover { transform: scale(1.05); box-shadow: 0 6px 24px rgba(234,88,12,0.5); }
        .sell-btn:hover::after { transform: translateX(100%); transition: transform 0.4s ease; }
        .sell-btn:active { transform: scale(0.95); }

        .nav-link { position: relative; }
        .nav-link::after {
          content: ''; position: absolute; bottom: -2px;
          left: 50%; right: 50%; height: 2px;
          background: #ea580c; border-radius: 2px;
          transition: left 200ms ease, right 200ms ease;
        }
        .nav-link:hover::after, .nav-link.active::after { left: 0; right: 0; }

        @keyframes heart-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.35); }
          70%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .heart-pop { animation: heart-pop 0.35s cubic-bezier(0.34,1.56,0.64,1); }

        .location-hover { transition: background 200ms ease; }
        .location-hover:hover { background: rgba(234,88,12,0.06); }

        /* Mobile logo badge */
        @keyframes logo-row-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .logo-row-item { animation: logo-row-in 280ms ease 20ms both; }
        .logo-badge-link {
          display: inline-flex; align-items: center;
          transition: transform 150ms ease;
        }
        .logo-badge-link:active { transform: scale(0.96); }

        /* Row 2 staggered entrance */
        @keyframes row2-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .row2-item-1 { animation: row2-in 250ms ease  50ms both; }
        .row2-item-2 { animation: row2-in 250ms ease 100ms both; }
        .row2-item-3 { animation: row2-in 250ms ease 150ms both; }
        .row2-item-4 { animation: row2-in 250ms ease 200ms both; }

        .loc-row { transition: background 150ms ease; }
        .loc-row:hover, .loc-row:focus-visible { background: rgba(234,88,12,0.06); outline: none; }
        .loc-row:active { background: rgba(234,88,12,0.12); }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
        @media (min-width: 640px) {
          .sm-flex { display: flex !important; }
        }
      `}</style>

      <header
        className="sticky top-0 z-50 w-full"
        style={{
          background: scrolled ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "none",
          transition: "background 300ms ease",
        }}
      >
        {/* Animated gradient bottom border */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 1.5,
          background: "linear-gradient(90deg, #ea580c, #f97316, #fbbf24, #ea580c)",
          backgroundSize: "300% 100%", animation: "border-hue 8s ease infinite",
          opacity: scrolled ? 1 : 0.4, transition: "opacity 300ms ease",
        }} />

        {/* ══════════════════════════════════════════
            DESKTOP ROW — hidden sm:flex
            Fix 1: Only LocationPill here, NO icon button (that's mobile-only).
            Fix 2: Unified UserAvatar replaces the old black-circle-with-initial.
            Fix 3: LogoutButton iconOnly on desktop too.
        ══════════════════════════════════════════ */}
        <div
          className="hidden w-full items-center gap-3 px-4 sm:flex md:px-8"
          style={{ height: scrolled ? 52 : 60, transition: "height 300ms ease" }}
        >
          {/* Logo — desktop only */}
          <Link href="/" className="logo-link shrink-0 font-black"
            style={{ fontSize: 20, letterSpacing: "-0.03em", textDecoration: "none", color: "#1a1a1a" }}
          >
            bazar
            <span style={{ color: "#ea580c", fontWeight: 900 }}>.</span>
            <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 18 }}>in</span>
          </Link>

          {/* Fix 1: LocationPill ONLY on desktop — no icon button here */}
          <div className="location-hover shrink-0 rounded-full">
            <LocationPill />
          </div>

          {/* Search bar */}
          <div className="min-w-0 flex-1">
            <SearchBar />
          </div>

          {/* Right nav */}
          {isLoading ? (
            <div className="h-9 w-16 shrink-0 animate-pulse rounded-full bg-neutral-100" />
          ) : user ? (
            <div className="flex shrink-0 items-center" style={{ gap: 4 }}>
              <Link href="/my-listings"
                className={`nav-link rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isMyListingsActive ? "active text-orange-600" : "text-neutral-600 hover:text-neutral-900"
                }`}
                style={{ textDecoration: "none" }}
              >
                My Listings
              </Link>
              <Link href="/wishlist" aria-label="Wishlist" onClick={handleWishlistClick}
                className={`flex items-center justify-center rounded-full transition-colors ${
                  wishlistPop ? "heart-pop" : ""
                } ${isWishlistActive ? "bg-red-50 text-red-500" : "text-neutral-400 hover:bg-neutral-100 hover:text-red-400"}`}
                style={{ width: 44, height: 44, textDecoration: "none", flexShrink: 0 }}
              >
                <HeartIcon active={isWishlistActive} />
              </Link>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44 }}>
                <NotificationBell />
              </div>
              {/* Fix 2: Unified UserAvatar — no more black-circle-with-initial on desktop */}
              <div className="header-icon-btn" title={profile?.name ?? "Account"}
                style={{ color: "#ea580c", cursor: "default" }}
              >
                <UserAvatar profile={profile} iconSize={22} />
              </div>
              {/* Fix 3: LogoutButton iconOnly everywhere */}
              <LogoutButton iconOnly />
              <Link href="/sell"
                className="sell-btn flex shrink-0 items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                  boxShadow: "0 2px 16px rgba(234,88,12,0.35)",
                  textDecoration: "none", letterSpacing: "-0.01em",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Sell
              </Link>
            </div>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/login"
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm"
                style={{ textDecoration: "none" }}
              >
                Sign in
              </Link>
              <Link href="/sell"
                className="sell-btn flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                  boxShadow: "0 2px 16px rgba(234,88,12,0.35)",
                  textDecoration: "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Start selling
              </Link>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            MOBILE ROW 1 — sm:hidden
            Fix 4: CSS Grid (auto 1fr auto) guarantees logo stays
            truly centered regardless of left/right group widths.
            Left:   location icon button
            Center: bazar.in logo pill (larger: 17px, px-5 py-2)
            Right:  unified UserAvatar + LogoutButton iconOnly
        ══════════════════════════════════════════ */}
        <div
          className="grid sm:hidden"
          style={{
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            padding: "4px 12px",
            gap: 8,
          }}
        >
          {/* LEFT — location icon only (Fix 1: icon is mobile-only, never on desktop) */}
          <button
            ref={locTriggerRef}
            type="button"
            onClick={openLocSheet}
            aria-label={needsSetup ? "Set location" : `Location: ${locality}`}
            aria-haspopup="dialog"
            className="header-icon-btn logo-row-item"
            style={{
              background: needsSetup ? "transparent" : "rgba(234,88,12,0.08)",
              color: needsSetup ? "#9ca3af" : "#ea580c",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          </button>

          {/* CENTER — logo pill, truly centered by the grid's 1fr column */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Link href="/" className="logo-badge-link logo-row-item"
              style={{
                padding: "7px 20px",
                borderRadius: 100,
                background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                boxShadow: "0 2px 12px rgba(234,88,12,0.25)",
                textDecoration: "none",
              }}
            >
              <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: "-0.03em", color: "white", lineHeight: 1 }}>
                bazar
              </span>
              <span style={{ fontWeight: 400, fontSize: 16, letterSpacing: "-0.02em", color: "rgba(255,255,255,0.72)", lineHeight: 1 }}>
                .in
              </span>
            </Link>
          </div>

          {/* RIGHT — unified avatar + logout */}
          {isLoading ? (
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f3f4f6" }} />
          ) : user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {/* Fix 2: Unified UserAvatar — orange person icon, same .header-icon-btn sizing */}
              <button type="button" className="header-icon-btn logo-row-item"
                title={profile?.name ?? "Account"}
                style={{ color: "#ea580c", cursor: "default" }}
                // TODO: onPress could open an account sheet/menu in a future iteration
              >
                <UserAvatar profile={profile} iconSize={22} />
              </button>
              {/* Fix 3: LogoutButton iconOnly on mobile too */}
              <div className="logo-row-item">
                <LogoutButton iconOnly />
              </div>
            </div>
          ) : (
            <Link href="/login"
              style={{
                textDecoration: "none", fontSize: 13, fontWeight: 600,
                color: "#374151", padding: "6px 12px", borderRadius: 100,
                border: "1px solid #e5e7eb", whiteSpace: "nowrap",
              }}
            >
              Sign in
            </Link>
          )}
        </div>

        {/* ══════════════════════════════════════════
            MOBILE ROW 2 — sm:hidden, logged-in only
            Wishlist / SearchBar / Bell / Sell
            Content and order completely unchanged.
        ══════════════════════════════════════════ */}
        <div className="flex items-center gap-2 px-4 pb-2.5 pt-1 sm:hidden">
            <Link href="/wishlist" aria-label="Wishlist" onClick={handleWishlistClick}
              className={`header-icon-btn row2-item-1 ${wishlistPop ? "heart-pop" : ""} ${
                isWishlistActive ? "text-red-500" : ""
              }`}
              style={{ textDecoration: "none", background: isWishlistActive ? "rgba(239,68,68,0.08)" : undefined }}
            >
              <HeartIcon active={isWishlistActive} />
            </Link>

            <div className="row2-item-2 min-w-0 flex-1"
              style={{ height: 44, display: "flex", alignItems: "center" }}
            >
              <SearchBar />
            </div>

            <div className="row2-item-3 header-icon-btn" style={{ flexShrink: 0 }}>
              <NotificationBell />
            </div>

            <Link href="/sell"
              className="sell-btn row2-item-4 flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                boxShadow: "0 2px 12px rgba(234,88,12,0.4)",
                textDecoration: "none", height: 44,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Sell
            </Link>
          </div>
      </header>

      {/* Location Bottom Sheet — completely unchanged */}
      <AnimatePresence>
        {locSheetOpen && (
          <>
            <motion.div
              key="loc-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeLocSheet}
              style={{
                position: "fixed", inset: 0, zIndex: 200,
                background: "rgba(0,0,0,0.4)",
                backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
              }}
              aria-hidden="true"
            />
            <motion.div
              key="loc-sheet"
              role="dialog" aria-modal="true" aria-label="Select your location"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280, mass: 0.8 }}
              style={{
                position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201,
                height: "58vh", background: "white",
                borderRadius: "20px 20px 0 0",
                display: "flex", flexDirection: "column", overflow: "hidden",
                boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4, flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, borderRadius: 100, background: "#e5e7eb" }} />
              </div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 20px 14px", flexShrink: 0, borderBottom: "1px solid #f3f4f6",
              }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Select Location</p>
                <button type="button" onClick={closeLocSheet} aria-label="Close"
                  style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.5}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
                <motion.button type="button" onClick={handleDetectLocation} disabled={isDetecting}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="loc-row"
                  style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "0 20px", minHeight: 56, border: "none", background: "transparent", cursor: "pointer", opacity: isDetecting ? 0.6 : 1 }}
                >
                  <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "rgba(234,88,12,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2} strokeLinecap="round">
                      <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                    </svg>
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#ea580c", textAlign: "left" }}>
                    {isDetecting ? "Detecting…" : "Use current location"}
                  </span>
                </motion.button>
                {detectError && <p style={{ margin: "0 20px 8px", fontSize: 13, color: "#dc2626" }}>{detectError}</p>}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  style={{ padding: "8px 20px 12px" }}
                >
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                    Search manually
                  </p>
                  <LocationSearchInput onSelect={handleSelectLocation} />
                </motion.div>
                {recentLocations.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 20px 8px" }}>
                      Recent
                    </p>
                    {recentLocations.slice(0, 5).map((loc, i) => (
                      <motion.button key={i} type="button" onClick={() => handleSelectLocation(loc)}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + i * 0.04 }}
                        className="loc-row"
                        style={{ display: "flex", alignItems: "center", gap: 14, width: "100%", padding: "0 20px", minHeight: 52, border: "none", background: "transparent", cursor: "pointer" }}
                      >
                        <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: "rgba(107,114,128,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2} strokeLinecap="round">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "#374151", textAlign: "left", flex: 1 }}>
                          {loc.locality}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}