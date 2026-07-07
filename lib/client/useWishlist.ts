// Mark that this module uses client-side hooks (state, effects) — it should only be imported
// by Client Components
"use client";

// Import React's state and effect hooks
import { useCallback, useEffect, useState } from "react";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";

// Define the props this hook accepts
type UseWishlistProps = {
  // The listing to track wishlist state for
  listingId: string;
  // The listing's current price — stored alongside the wishlist entry so we can detect price drops later
  currentPrice: number;
};

// Define what this hook returns
type UseWishlistReturn = {
  // Whether this listing is currently in the user's wishlist
  isWishlisted: boolean;
  // Whether the toggle call is in flight
  isLoading: boolean;
  // A function the component calls when the user taps the heart icon
  toggle: () => Promise<void>;
};

// Define and export the hook
export function useWishlist({ listingId, currentPrice }: UseWishlistProps): UseWishlistReturn {
  // Create a Supabase browser client once for this hook's lifetime
  const [supabase] = useState(() => createClient());
  // The current wishlist state — null means "not yet loaded"
  const [isWishlisted, setIsWishlisted] = useState(false);
  // Whether an async operation is in flight
  const [isLoading, setIsLoading] = useState(false);

  // On mount, fetch the current user and check whether this listing is already wishlisted
  useEffect(() => {
    async function checkWishlist() {
      // Get the current user — the heart should only be interactive when logged in
      const { data: { user } } = await supabase.auth.getUser();
      // Don't bother querying if nobody is logged in
      if (!user) return;
      // Check whether a wishlist row for (user, listing) already exists
      const { data } = await supabase
        .from("wishlist")
        .select("id")
        .eq("user_id", user.id)
        .eq("listing_id", listingId)
        .maybeSingle();
      // Set the initial state based on whether we found a row
      setIsWishlisted(!!data);
    }
    // Kick off the check
    checkWishlist();
  }, [supabase, listingId]);

  // Define the toggle function — the component calls this when the heart is tapped
  const toggle = useCallback(async () => {
    // Don't double-fire while a request is already in flight
    if (isLoading) return;
    // Fetch the current user to guard against unauthenticated toggles
    const { data: { user } } = await supabase.auth.getUser();
    // Silently bail if not logged in — the UI should hide the button anyway
    if (!user) return;

    // OPTIMISTIC UPDATE: flip the UI state immediately for instant feedback,
    // then reverse it only if the server call actually fails
    setIsWishlisted((prev) => !prev);
    setIsLoading(true);

    if (isWishlisted) {
      // Currently wishlisted — remove it
      const { error } = await supabase
        .from("wishlist")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);
      // If deletion failed, roll back the optimistic state
      if (error) setIsWishlisted(true);
    } else {
      // Not wishlisted yet — add it, storing today's price for future price-drop detection
      const { error } = await supabase
        .from("wishlist")
        .insert({ user_id: user.id, listing_id: listingId, price_at_save: currentPrice });
      // If insertion failed, roll back the optimistic state
      if (error) setIsWishlisted(false);
    }

    // Mark the operation as complete
    setIsLoading(false);
  }, [supabase, listingId, currentPrice, isWishlisted, isLoading]);

  // Return the state and toggle function to the component
  return { isWishlisted, isLoading, toggle };
}
