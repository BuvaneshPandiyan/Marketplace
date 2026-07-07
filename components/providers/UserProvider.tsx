// Mark this as a Client Component since it uses React state/effects and browser APIs
"use client";

// Import React's hooks for context, state, side effects, and memoization
import { createContext, useEffect, useState, type ReactNode } from "react";
// Import Supabase's User type so we can type our state correctly
import type { User } from "@supabase/supabase-js";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";
// Import our shared Profile type to type the profile data we'll fetch
import type { Profile } from "@/types";

// Define the shape of the data this context will provide to the rest of the app
type UserContextValue = {
  // The currently logged-in Supabase auth user, or null if logged out
  user: User | null;
  // The matching row from our public.profiles table, or null if not loaded/logged out
  profile: Profile | null;
  // Whether we're still figuring out the initial auth state (avoids flashing "logged out" UI)
  isLoading: boolean;
  // A function components can call to re-fetch the profile (e.g., after onboarding updates it)
  refreshProfile: () => Promise<void>;
};

// Create the actual React Context object, starting with undefined until a provider sets it
export const UserContext = createContext<UserContextValue | undefined>(undefined);

// Define and export the provider component that wraps the app and supplies the context value
export function UserProvider({ children }: { children: ReactNode }) {
  // Create a single browser Supabase client instance for this provider's lifetime
  const [supabase] = useState(() => createClient());
  // State holding the current auth user, starts as null until we check
  const [user, setUser] = useState<User | null>(null);
  // State holding the current user's profile row, starts as null until we fetch it
  const [profile, setProfile] = useState<Profile | null>(null);
  // State tracking whether the initial auth check has finished yet
  const [isLoading, setIsLoading] = useState(true);

  // Define a function that fetches the profile row for a given user ID
  async function fetchProfile(userId: string) {
    // Query the profiles table for the row matching this user's ID
    const { data } = await supabase
      // Target the profiles table
      .from("profiles")
      // Select every column
      .select("*")
      // Filter to just this user's row
      .eq("id", userId)
      // We only expect a single row back
      .single();
    // Store whatever we got (or null if the query failed) into state
    setProfile((data as Profile) ?? null);
  }

  // Define the function exposed to consumers for manually refreshing the profile
  async function refreshProfile() {
    // Only attempt a refresh if we actually have a logged-in user
    if (user) {
      // Re-run the profile fetch for the current user's ID
      await fetchProfile(user.id);
    }
  }

  // Run this effect once when the provider first mounts
  useEffect(() => {
    // Define an async function so we can use await inside useEffect
    async function loadInitialSession() {
      // Ask Supabase for the current logged-in user, if any (validates the session token)
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      // Store the user (or null) into state
      setUser(currentUser);
      // If there is a logged-in user, also fetch their profile row
      if (currentUser) {
        // Fetch the profile for this user
        await fetchProfile(currentUser.id);
      }
      // Mark the initial loading phase as complete either way
      setIsLoading(false);
    }
    // Kick off the initial session check
    loadInitialSession();

    // Subscribe to future auth state changes (login, logout, token refresh) anywhere in the app
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Update our user state to match whatever the new session says
      setUser(session?.user ?? null);
      // If the new session has a user, fetch their profile; otherwise clear it
      if (session?.user) {
        // Fetch the profile for the newly logged-in user
        fetchProfile(session.user.id);
      } else {
        // Clear the profile since nobody is logged in anymore
        setProfile(null);
      }
    });

    // Clean up the subscription when this provider unmounts, to avoid memory leaks
    return () => {
      // Unsubscribe from auth state changes
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client is stable across renders
  }, []);

  // Render the context provider, passing down the current state and the refresh function
  return (
    // Supply the context value to every descendant component
    <UserContext.Provider value={{ user, profile, isLoading, refreshProfile }}>
      {/* Render whatever the app tree looks like below this provider */}
      {children}
    </UserContext.Provider>
  );
}
