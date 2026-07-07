// Mark this as a Client Component since it relies on React Context, a browser/client-only feature
"use client";

// Import React's useContext hook to read values out of a context
import { useContext } from "react";
// Import the context object defined alongside our LocationProvider
import { LocationContext } from "@/components/providers/LocationProvider";

// Define and export the useActiveLocation hook — components call this to get the active location
export function useActiveLocation() {
  // Read whatever value the nearest LocationProvider above this component is providing
  const context = useContext(LocationContext);

  // If there's no provider above this component in the tree, fail loudly with a clear error
  if (context === undefined) {
    // Throw a descriptive error so the mistake (forgetting to wrap the app) is easy to spot
    throw new Error("useActiveLocation() must be used inside a <LocationProvider>.");
  }

  // Return the context value (lat, lng, locality, isReady, needsSetup, etc.) to the calling component
  return context;
}
