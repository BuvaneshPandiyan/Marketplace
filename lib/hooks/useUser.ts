// Mark this as a Client Component since it relies on React Context, a browser/client-only feature
"use client";

// Import React's useContext hook to read values out of a context
import { useContext } from "react";
// Import the context object defined alongside our UserProvider
import { UserContext } from "@/components/providers/UserProvider";

// Define and export the useUser hook — components call this to get the current user/profile
export function useUser() {
  // Read whatever value the nearest UserProvider above this component is providing
  const context = useContext(UserContext);

  // During Next.js 15 / React 19 SSR, the context may not yet be initialised in the
  // first render pass (client component islands are hydrated separately from the provider).
  // Return safe defaults so the UI renders a loading/logged-out shell rather than crashing.
  // On the client after hydration, the real context from UserProvider takes over immediately.
  if (context === undefined) {
    return {
      user: null,
      profile: null,
      isLoading: true,                       // show skeleton/loading states, not errors
      refreshProfile: async () => {},        // no-op until provider is ready
    };
  }

  // Return the context value (user, profile, isLoading, refreshProfile) to the calling component
  return context;
}