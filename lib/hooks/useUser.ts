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

  // If there's no provider above this component in the tree, fail loudly with a clear error
  if (context === undefined) {
    // Throw a descriptive error so the mistake (forgetting to wrap the app) is easy to spot
    throw new Error("useUser() must be used inside a <UserProvider>.");
  }

  // Return the context value (user, profile, isLoading, refreshProfile) to the calling component
  return context;
}
