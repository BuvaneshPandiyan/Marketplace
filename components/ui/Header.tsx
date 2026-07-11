"use client";
/**
 * LAYOUT PADDING:
 * Desktop:  padding-top ~78px (pill ~56px + 12px float + buffer)
 * Mobile:   padding-top 0, padding-bottom calc(80px + env(safe-area-inset-bottom))
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useUser } from "@/lib/hooks/useUser";
import { LocationPill } from "@/components/location/LocationPill";
import { LocationSearchInput } from "@/components/location/LocationSearchInput";
import { SearchBar } from "@/components/search/SearchBar";
import { MessagesLink } from "@/components/ui/MessagesLink";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
import { createClient } from "@/lib/supabase/client";

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24"
      fill={active ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

const PILL: React.CSSProperties = {
  background: "rgba(255,255,255,0.94)",
  backdropFilter: "blur(24px) saturate(180%)",
  WebkitBackdropFilter: "blur(24px) saturate(180%)",
  border: "1px solid rgba(0,0,0,0.07)",
  borderRadius: 100,
};

// Simple icon button
function IBtn({ onClick, active, label, children, href }: {
  onClick?: () => void; active?: boolean; label: string;
  children: React.ReactNode; href?: string;
}) {
  const cls = `hdr-icon${active ? " active" : ""}`;
  if (href) return <Link href={href} className={cls} aria-label={label} style={{ textDecoration: "none" }}>{children}</Link>;
  return <button type="button" onClick={onClick} className={cls} aria-label={label}>{children}</button>;
}

export function Header() {
  const { user, profile, isLoading } = useUser();
  const { locality, needsSetup, detectCurrentLocation } = useActiveLocation();
  const router = useRouter();
  const supabase = useRef(createClient());

  const [locSheetOpen, setLocSheetOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [detectedLocality, setDetectedLocality] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [mlDropOpen, setMlDropOpen] = useState(false);
  const mlDropRef = useRef<HTMLDivElement>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [navMobileVisible, setNavMobileVisible] = useState(true);
  const [wishlistPop, setWishlistPop] = useState(false);
  const [mounted, setMounted] = useState(false);

  const pathname = usePathname();
  const isWishlistActive = pathname === "/wishlist";
  const isMyListingsActive = pathname === "/my-listings";
  const isHomeActive = pathname === "/";

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    setDrawerOpen(false); setMlDropOpen(false); setLocSheetOpen(false);
    setSearchExpanded(false); setLogoutConfirm(false); setNavMobileVisible(true);
  }, [pathname]);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);
  useEffect(() => {
    if (!mlDropOpen) return;
    const fn = (e: MouseEvent) => {
      if (mlDropRef.current && !mlDropRef.current.contains(e.target as Node)) setMlDropOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [mlDropOpen]);

  const handleDetectLocation = useCallback(async () => {
    setIsDetecting(true); setDetectError(null); setDetectedLocality(null);
    const result = await detectCurrentLocation();
    if (result.success) {
      setDetectedLocality(locality || "Location detected");
    } else {
      setDetectError(result.error ?? "Couldn't detect location.");
    }
    setIsDetecting(false);
  }, [detectCurrentLocation, locality]);

  async function handleLogout() {
    setIsSigningOut(true);
    await supabase.current.auth.signOut();
    setLogoutConfirm(false);
    setDrawerOpen(false);
    router.push("/");
    router.refresh();
    setIsSigningOut(false);
  }

  function handleWishlistClick() {
    if (!user) { router.push("/login"); return; }
    setWishlistPop(true);
    setTimeout(() => setWishlistPop(false), 400);
  }

  const prefersReducedMotion = typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Nav links for the drawer
  // Drawer links — Chat and Bell are in the bottom pill, so not duplicated here
  const drawerLinks = [
    { href: "/",           label: "Home",        icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
    { href: "/my-listings",label: "My Listings", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { href: "/wishlist",   label: "Wishlist",    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
    { href: "/contact",    label: "Contact Us",  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.6 1.32h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> },
  ];

  return (
    <>
      <style>{`
        @keyframes heart-pop { 0%{transform:scale(1)} 40%{transform:scale(1.35)} 70%{transform:scale(0.9)} 100%{transform:scale(1)} }
        @keyframes drawer-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes fade-in   { from{opacity:0} to{opacity:1} }

        .hdr-icon { width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:none; background:transparent; cursor:pointer; color:#6b7280; transition:background 150ms ease,color 150ms ease,transform 180ms cubic-bezier(0.34,1.56,0.64,1); flex-shrink:0; }
        .hdr-icon:hover  { background:rgba(234,88,12,0.09); color:#ea580c; transform:scale(1.08); }
        .hdr-icon:active { transform:scale(0.88); }
        .hdr-icon.active { color:#ea580c; background:rgba(234,88,12,0.1); }

        .sell-fab { width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#ea580c,#f97316); box-shadow:0 4px 18px rgba(234,88,12,0.45); border:none; cursor:pointer; text-decoration:none; flex-shrink:0; transition:transform 280ms cubic-bezier(0.34,1.56,0.64,1),box-shadow 280ms ease; }
        .sell-fab:hover  { transform:scale(1.1); box-shadow:0 6px 28px rgba(234,88,12,0.55); }
        .sell-fab:active { transform:scale(0.9); }

        .sell-btn { position:relative; overflow:hidden; transition:transform 300ms cubic-bezier(0.34,1.56,0.64,1),box-shadow 300ms ease; }
        .sell-btn:hover  { transform:scale(1.06); box-shadow:0 6px 24px rgba(234,88,12,0.5); }
        .sell-btn:active { transform:scale(0.94); }

        .heart-pop { animation:heart-pop 0.35s cubic-bezier(0.34,1.56,0.64,1); }

        .nav-link { position:relative; }
        .nav-link::after { content:''; position:absolute; bottom:-2px; left:50%; right:50%; height:2px; background:#ea580c; border-radius:2px; transition:left 200ms ease,right 200ms ease; }
        .nav-link:hover::after,.nav-link.active::after { left:0; right:0; }

        .ml-dropdown { position:absolute; top:calc(100% + 10px); left:0; min-width:200px; background:white; border-radius:16px; box-shadow:0 12px 40px rgba(0,0,0,0.14); border:1px solid rgba(0,0,0,0.06); overflow:hidden; z-index:200; }
        .ml-item { display:block; padding:10px 16px; font-size:13px; font-weight:500; color:#374151; text-decoration:none; transition:background 120ms ease; }
        .ml-item:hover { background:#fff7ed; color:#ea580c; }

        @keyframes nav-restore-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(234,88,12,0.5), 0 4px 18px rgba(234,88,12,0.4); }
          50%      { box-shadow: 0 0 0 10px rgba(234,88,12,0), 0 4px 18px rgba(234,88,12,0.4); }
        }
        @media(prefers-reduced-motion:reduce){
          .hdr-icon,.sell-fab,.sell-btn,.heart-pop { animation:none!important; transition-duration:0ms!important; }
          .hdr-icon:hover { transform:none!important; }
        }
      `}</style>

      {/* ══════════════════════════════
          DESKTOP FLOATING TOP PILL
          ══════════════════════════════ */}
      <AnimatePresence>
        {navVisible && (
          /* Outer div owns centering — Framer Motion y/opacity animate INSIDE without clobbering translateX(-50%) */
          <div className="hidden sm:block" style={{
            position:"fixed", top: scrolled ? 8 : 20,
            left:"50%", transform:"translateX(-50%)",
            zIndex:50, width:"min(94vw, 1400px)",
            transition:"top 300ms ease",
          }}>
            <motion.div
              initial={{ y:-40, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:-40, opacity:0 }}
              transition={prefersReducedMotion ? { duration:0 } : { type:"spring", damping:28, stiffness:280 }}
              style={{
                ...PILL,
                display:"flex", alignItems:"center", justifyContent:"space-between",
                gap:20, padding:"10px 24px",
                boxShadow: scrolled
                  ? "0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)"
                  : "0 4px 20px rgba(0,0,0,0.07)",
              }}
            >
              {/* LEFT: logo + home */}
              <div style={{ display:"flex", alignItems:"center", gap:14, flexShrink:0 }}>
                <Link href="/" style={{ textDecoration:"none", fontWeight:900, fontSize:18, letterSpacing:"-0.03em", color:"#1a1a1a" }}>
                  bazar<span style={{ color:"#ea580c" }}>.</span><span style={{ color:"#9ca3af", fontWeight:400, fontSize:16 }}>in</span>
                </Link>
                <IBtn href="/" label="Home" active={isHomeActive}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={isHomeActive?"currentColor":"none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </IBtn>
              </div>

              {/* CENTER: location + search bar */}
              <div style={{ display:"flex", alignItems:"center", gap:12, flex:1, minWidth:0, justifyContent:"center" }}>
                <div style={{ flexShrink:0 }}><LocationPill /></div>
                <div style={{ minWidth:200, maxWidth:420, flex:1 }}><SearchBar /></div>
              </div>

              {/* RIGHT: nav links + actions */}
              <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                {user && (
                  <div ref={mlDropRef} style={{ position:"relative" }}>
                    <button type="button" onClick={() => setMlDropOpen(o => !o)}
                      className={`nav-link rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isMyListingsActive?"active text-orange-600":"text-neutral-600 hover:text-neutral-900"}`}
                      style={{ background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                      My Listings
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
                        style={{ transform:mlDropOpen?"rotate(180deg)":"rotate(0)", transition:"transform 200ms ease" }}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    {mlDropOpen && (
                      <div className="ml-dropdown">
                        {[["All","/my-listings"],["Active","/my-listings?tab=active"],["Sold","/my-listings?tab=sold"],["Draft","/my-listings?tab=draft"]].map(([l,h])=>(
                          <Link key={h} href={h} className="ml-item" onClick={()=>setMlDropOpen(false)}>{l}</Link>
                        ))}
                        <div style={{ borderTop:"1px solid #f3f4f6", padding:"8px 12px" }}>
                          <Link href="/sell" onClick={()=>setMlDropOpen(false)}
                            style={{ fontSize:12, fontWeight:700, color:"#ea580c", textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
                            Post new listing
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {user && <MessagesLink />}
                {user && (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", width:44, height:44, flexShrink:0 }}>
                    <NotificationBell />
                  </div>
                )}
                <Link href="/sell" prefetch className="sell-btn"
                  style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px", borderRadius:100, background:"linear-gradient(135deg,#ea580c,#f97316)", color:"white", fontWeight:700, fontSize:13, textDecoration:"none", flexShrink:0, whiteSpace:"nowrap" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14"/></svg>
                  + Sell
                </Link>
                {!isLoading && !user && (
                  <Link href="/login" style={{ textDecoration:"none", fontSize:13, fontWeight:600, color:"#374151", padding:"7px 14px", borderRadius:100, border:"1px solid #e5e7eb", flexShrink:0, whiteSpace:"nowrap" }}>Sign in</Link>
                )}
                <div style={{ width:1, height:22, background:"rgba(0,0,0,0.1)", flexShrink:0, margin:"0 4px" }} />
                <button type="button" onClick={() => setNavVisible(false)} title="Hide navbar"
                  className="hdr-icon" style={{ width:34, height:34, flexShrink:0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Restore pill button when collapsed */}
      <AnimatePresence>
        {!navVisible && (
          <motion.button
            className="hidden sm:flex"
            initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.8 }}
            onClick={() => setNavVisible(true)} title="Show navbar"
            style={{ ...PILL, position:"fixed", top:12, right:16, zIndex:50, width:44, height:44, border:"none", cursor:"pointer", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 16px rgba(0,0,0,0.12)", flexShrink:0, padding:0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2.5} strokeLinecap="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════
          MOBILE BOTTOM FLOATING PILL
          ══════════════════════════════ */}
      {navMobileVisible && (
      <motion.div
        layout
        className="sm:hidden"
        style={{
          ...PILL,
          position:"fixed", bottom:16, left:16, right:16, zIndex:60,
          boxShadow:"0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)",
          overflow:"hidden",
          paddingBottom:"env(safe-area-inset-bottom)",
        }}
        transition={prefersReducedMotion ? { duration:0 } : { type:"spring", damping:28, stiffness:300 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!searchExpanded ? (
            <motion.div key="collapsed"
              initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              transition={prefersReducedMotion ? { duration:0 } : { duration:0.14 }}
              style={{ display:"flex", alignItems:"center", justifyContent:"space-around", padding:"6px 6px" }}>

              {/* Location — opens location sheet */}
              <button type="button" onClick={() => setLocSheetOpen(true)} className={`hdr-icon ${!needsSetup?"active":""}`} aria-label="Set location" style={{ flexShrink:0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              </button>

              {/* Search expand */}
              <button type="button" onClick={() => setSearchExpanded(true)} className="hdr-icon" aria-label="Search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </button>

              {/* Sell FAB — center */}
              <Link href="/sell" prefetch className="sell-fab" aria-label="Post an ad" style={{ width:46, height:46 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
              </Link>

              {/* Chats */}
              <IBtn href="/messages" label="Chats" active={pathname?.startsWith("/messages")}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={pathname?.startsWith("/messages")?"currentColor":"none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </IBtn>

              {/* Notification Bell */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <NotificationBell />
              </div>

              {/* Menu ☰ + divider + collapse ‹ — all inside the pill */}
              <div style={{ display:"flex", alignItems:"center", gap:0, flexShrink:0 }}>
                <button type="button" onClick={() => setDrawerOpen(true)} className="hdr-icon" aria-label="Menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                  </svg>
                </button>
                {/* Vertical divider */}
                <div style={{ width:1, height:20, background:"rgba(0,0,0,0.12)", margin:"0 4px", flexShrink:0 }} />
                {/* Collapse ‹ — hides the pill */}
                <button type="button" onClick={() => setNavMobileVisible(false)} aria-label="Hide navigation"
                  className="hdr-icon" style={{ width:32, height:32 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.5} strokeLinecap="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="expanded"
              initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.96 }}
              transition={prefersReducedMotion ? { duration:0 } : { type:"spring", damping:26, stiffness:300 }}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 8px 6px 14px" }}>
              <button type="button" onClick={() => setSearchExpanded(false)} className="hdr-icon" style={{ flexShrink:0 }} aria-label="Close search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div style={{ flex:1, minWidth:0 }}>
                <SearchBar autoFocus onCollapse={() => setSearchExpanded(false)} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      )}

      {/* Glowing restore button — shown when pill is hidden */}
      {!navMobileVisible && (
        <button type="button" className="sm:hidden"
          onClick={() => setNavMobileVisible(true)}
          aria-label="Show navigation"
          style={{
            position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
            zIndex:61, width:40, height:40, borderRadius:"50%",
            background:"linear-gradient(135deg,#ea580c,#f97316)",
            border:"none", cursor:"pointer", display:"flex",
            alignItems:"center", justifyContent:"center",
            boxShadow:"0 0 0 0 rgba(234,88,12,0.5)",
            animation:"nav-restore-pulse 1.8s ease infinite",
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      )}

      {/* ══════════════════════════════
          MOBILE DRAWER — slides UP from bottom
          ══════════════════════════════ */}
      {mounted && drawerOpen && createPortal(
        <>
          {/* Backdrop */}
          <div onClick={() => setDrawerOpen(false)}
            style={{ position:"fixed", inset:0, zIndex:9980, background:"rgba(0,0,0,0.45)", backdropFilter:"blur(3px)", WebkitBackdropFilter:"blur(3px)", animation:"fade-in 200ms ease both" }} />

          {/* Sheet slides up */}
          <div style={{
            position:"fixed", bottom:0, left:0, right:0, zIndex:9981,
            background:"white", borderRadius:"24px 24px 0 0",
            maxHeight:"88vh", display:"flex", flexDirection:"column",
            boxShadow:"0 -12px 48px rgba(0,0,0,0.18)",
            animation:"drawer-up 300ms cubic-bezier(0.22,1,0.36,1) both",
            overflow:"hidden",
          }}>
            {/* Handle + close button */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px 10px", flexShrink:0 }}>
              {/* Drag handle */}
              <div style={{ flex:1 }} />
              <div style={{ width:40, height:4, borderRadius:100, background:"#e5e7eb", margin:"0 auto" }} />
              <div style={{ flex:1, display:"flex", justifyContent:"flex-end" }}>
                <button type="button" onClick={() => setDrawerOpen(false)}
                  style={{ width:30, height:30, borderRadius:"50%", border:"none", background:"#f3f4f6", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>

            {/* User info */}
            {user && (
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 20px 14px", borderBottom:"1px solid #f3f4f6", flexShrink:0 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#ea580c,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:700, fontSize:18, flexShrink:0 }}>
                  {profile?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div>
                  <p style={{ fontSize:15, fontWeight:700, color:"#111", margin:0 }}>{profile?.name ?? "My Account"}</p>
                  <p style={{ fontSize:12, color:"#9ca3af", margin:0 }}>Seller account</p>
                </div>
              </div>
            )}

            {/* Nav links */}
            <nav style={{ overflowY:"auto", flex:1, padding:"8px 0" }}>
              {drawerLinks.map(({ href, label, icon }) => (
                <Link key={href} href={href} prefetch onClick={() => setDrawerOpen(false)}
                  style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 20px", textDecoration:"none", fontSize:14, fontWeight:500, color:pathname===href?"#ea580c":"#374151", background:pathname===href?"rgba(234,88,12,0.06)":"transparent", borderLeft:`3px solid ${pathname===href?"#ea580c":"transparent"}` }}>
                  <span style={{ color:pathname===href?"#ea580c":"#6b7280" }}>{icon}</span>
                  {label}
                </Link>
              ))}


            </nav>

            {/* Login / Logout at bottom */}
            <div style={{ padding:"12px 20px", borderTop:"1px solid #f3f4f6", flexShrink:0, paddingBottom:"calc(12px + env(safe-area-inset-bottom))" }}>
              {user ? (
                <button type="button" onClick={() => setLogoutConfirm(true)}
                  style={{ width:"100%", padding:"12px", borderRadius:100, border:"1.5px solid #fee2e2", background:"#fff5f5", color:"#dc2626", fontWeight:600, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                  Logout
                </button>
              ) : (
                <Link href="/login" onClick={() => setDrawerOpen(false)}
                  style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"12px", borderRadius:100, background:"linear-gradient(135deg,#ea580c,#f97316)", color:"white", fontWeight:700, textDecoration:"none", fontSize:14, gap:8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                  Sign in / Login
                </Link>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ══════════════════════════════
          LOGOUT CONFIRMATION POPUP
          ══════════════════════════════ */}
      {mounted && logoutConfirm && createPortal(
        <>
          <div onClick={() => setLogoutConfirm(false)}
            style={{ position:"fixed", inset:0, zIndex:9990, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", WebkitBackdropFilter:"blur(4px)", animation:"fade-in 150ms ease both" }} />
          <div style={{
            position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
            zIndex:9991, background:"white", borderRadius:20, padding:"28px 24px",
            width:"min(88vw, 360px)", boxShadow:"0 24px 60px rgba(0,0,0,0.22)",
            animation:"fade-in 150ms ease both",
          }}>
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <div style={{ width:56, height:56, borderRadius:"50%", background:"#fff5f5", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              </div>
              <h3 style={{ fontSize:17, fontWeight:700, color:"#111", margin:"0 0 6px" }}>Log out?</h3>
              <p style={{ fontSize:13, color:"#6b7280", margin:0 }}>Are you sure you want to log out of your account?</p>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button type="button" onClick={() => setLogoutConfirm(false)}
                style={{ flex:1, padding:"11px", borderRadius:100, border:"1.5px solid #e5e7eb", background:"white", fontWeight:600, fontSize:14, color:"#374151", cursor:"pointer" }}>
                No, stay
              </button>
              <button type="button" onClick={handleLogout} disabled={isSigningOut}
                style={{ flex:1, padding:"11px", borderRadius:100, border:"none", background:"linear-gradient(135deg,#dc2626,#ef4444)", color:"white", fontWeight:700, fontSize:14, cursor:"pointer", opacity:isSigningOut?0.7:1 }}>
                {isSigningOut ? "Logging out…" : "Yes, logout"}
              </button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ══════════════════════════════
          LOCATION BOTTOM SHEET
          ══════════════════════════════ */}
      <AnimatePresence>
        {locSheetOpen && (
          <>
            <motion.div key="loc-bd" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              onClick={() => { setLocSheetOpen(false); setDetectedLocality(null); setDetectError(null); }}
              style={{ position:"fixed", inset:0, zIndex:9985, background:"rgba(0,0,0,0.4)", backdropFilter:"blur(2px)" }} />
            <motion.div key="loc-sh" initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }}
              transition={{ type:"spring", stiffness:380, damping:32 }}
              style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:9986, background:"white", borderRadius:"24px 24px 0 0", overflow:"hidden", boxShadow:"0 -8px 40px rgba(0,0,0,0.15)" }}>
              <div style={{ maxWidth:560, margin:"0 auto", padding:"20px 20px 32px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                  <p style={{ fontWeight:700, fontSize:16, color:"#111", margin:0 }}>Set location</p>
                  <button type="button" onClick={() => { setLocSheetOpen(false); setDetectedLocality(null); setDetectError(null); }}
                    style={{ width:30, height:30, borderRadius:"50%", border:"none", background:"#f3f4f6", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.5}><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                {/* Current location button — changes to detected location name */}
                <div style={{ position:"relative", marginBottom:12 }}>
                  {detectedLocality ? (
                    /* Shows detected location + Change button */
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 16px", borderRadius:100, border:"1.5px solid #ea580c", background:"rgba(234,88,12,0.04)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2} strokeLinecap="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                        <span style={{ fontSize:14, fontWeight:600, color:"#ea580c" }}>{detectedLocality}</span>
                      </div>
                      <button type="button" onClick={() => { setDetectedLocality(null); }}
                        style={{ fontSize:12, fontWeight:700, color:"#ea580c", border:"none", cursor:"pointer", padding:"4px 10px", borderRadius:100, background:"rgba(234,88,12,0.1)" }}>
                        Change
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={handleDetectLocation} disabled={isDetecting}
                      style={{ width:"100%", padding:"11px 0", borderRadius:100, border:"1px solid #e5e7eb", background:"white", fontSize:14, fontWeight:500, color:"#374151", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2} strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
                      {isDetecting ? "Detecting your location…" : "Use current location"}
                    </button>
                  )}
                </div>

                {detectError && <p style={{ fontSize:12, color:"#dc2626", textAlign:"center", marginBottom:10 }}>{detectError}</p>}
                <LocationSearchInput onSelect={() => { setLocSheetOpen(false); setDetectedLocality(null); }} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}