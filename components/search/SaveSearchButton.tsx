// Mark as Client Component since it manages save state and calls Supabase
"use client";

// Import React's state hook
import { useState } from "react";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";
// Import the filter shape we defined on the search results page
import type { SearchFilterValues } from "@/components/search/SearchFilters";

// Define the props this component accepts
type SaveSearchButtonProps = {
  // The current search query text
  query: string;
  // The current filter state on the search page
  filters: SearchFilterValues;
  // Whether the user is logged in — show a login nudge if not
  isLoggedIn: boolean;
};

// Define and export the SaveSearchButton component
export function SaveSearchButton({ query, filters, isLoggedIn }: SaveSearchButtonProps) {
  // Create a Supabase browser client once for this component's lifetime
  const [supabase] = useState(() => createClient());
  // Whether the save call is in flight
  const [isSaving, setIsSaving] = useState(false);
  // Whether the search was already saved this session (swap button to a success checkmark)
  const [isSaved, setIsSaved] = useState(false);
  // Any error from the save attempt
  const [error, setError] = useState<string | null>(null);

  // If not logged in, show a small nudge instead of a non-functional button
  if (!isLoggedIn) {
    return (
      <p className="text-xs text-neutral-500">
        <a href="/login" className="font-medium text-orange-600 hover:text-orange-700">
          Log in
        </a>{" "}
        to save this search.
      </p>
    );
  }

  // If already saved this session, show a success state (no second save needed)
  if (isSaved) {
    return <p className="text-xs font-medium text-green-700">✓ Search saved</p>;
  }

  // Define the save handler
  async function handleSave() {
    setError(null);
    setIsSaving(true);
    // Get the current user so we can associate the saved search with their account
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not logged in."); setIsSaving(false); return; }

    // Build a human-readable label from the query and any active filter values
    const labelParts: string[] = [];
    if (query.trim()) labelParts.push(`"${query.trim()}"`);
    if (filters.categoryId) labelParts.push("filtered");
    if (filters.priceMin || filters.priceMax) {
      // Format a price range like "₹500–₹5000"
      const range = [filters.priceMin && `₹${filters.priceMin}`, filters.priceMax && `₹${filters.priceMax}`]
        .filter(Boolean).join("–");
      labelParts.push(range);
    }
    // Fall back to "My saved search" if nothing to show
    const label = labelParts.length > 0 ? labelParts.join(", ") : "My saved search";

    // Insert the saved search row — the cron job will later check new listings against it
    const { error: insertError } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      query: query.trim(),
      // Store the full filter state as JSON so the cron job can replay the search
      filters: {
        categoryId: filters.categoryId,
        priceMin: filters.priceMin || null,
        priceMax: filters.priceMax || null,
        condition: filters.condition,
        listingType: filters.listingType,
      },
      label,
    });
    setIsSaving(false);
    if (insertError) { setError(insertError.message); return; }
    // Mark as saved — the button becomes a success checkmark until the page is navigated away
    setIsSaved(true);
  }

  // Render the save button
  return (
    <div>
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-60"
      >
        {/* Swap label while saving */}
        {isSaving ? "Saving…" : "🔔 Save this search"}
      </button>
      {/* Show any error inline */}
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
