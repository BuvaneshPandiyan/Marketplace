"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AuthGateModal } from "@/components/auth/AuthGateModal";

type AuthGateCtx = {
  /** Call this to show the "sign in to …" popup */
  requireAuth: (action?: string) => boolean;
};

const Ctx = createContext<AuthGateCtx>({ requireAuth: () => false });

/**
 * Wrap your app with this provider so any component can call `useAuthGate().requireAuth()`
 * to show a login prompt instead of silently failing.
 */
export function AuthGateProvider({
  children,
  isLoggedIn,
}: {
  children: React.ReactNode;
  isLoggedIn: boolean;
}) {
  const [open,   setOpen]   = useState(false);
  const [action, setAction] = useState("continue");

  const requireAuth = useCallback(
    (msg = "continue") => {
      if (isLoggedIn) return true;   // already logged in — caller can proceed
      setAction(msg);
      setOpen(true);
      return false;                  // not logged in — modal shown, caller should stop
    },
    [isLoggedIn]
  );

  return (
    <Ctx.Provider value={{ requireAuth }}>
      {children}
      <AuthGateModal isOpen={open} onClose={() => setOpen(false)} action={action} />
    </Ctx.Provider>
  );
}

/** Hook: call `requireAuth("view the phone number")` to gate any action */
export function useAuthGate() {
  return useContext(Ctx);
}