// Mark this as a Client Component since it manages input state and fetches data
"use client";

// Import React's state and effect hooks
import { useEffect, useState } from "react";
// Import our debounce hook so we don't hit the search API on every keystroke
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
// Import the shared location shape used across our location features
import type { StoredLocation } from "@/lib/client/locationStorage";

// Define the shape of a single raw result returned by our /api/geo/search route
type SearchResult = {
  // The full human-readable label Nominatim returned for this place
  label: string;
  // The result's latitude
  lat: number;
  // The result's longitude
  lng: number;
};

// Define the props this component accepts
type LocationSearchInputProps = {
  // A callback fired when the user picks one of the search results
  onSelect: (location: StoredLocation) => void;
  // Optional placeholder text for the input box
  placeholder?: string;
};

// Define and export the LocationSearchInput component
export function LocationSearchInput({ onSelect, placeholder }: LocationSearchInputProps) {
  // State holding the raw text the user is typing
  const [query, setQuery] = useState("");
  // A debounced copy of the query, only updated 400ms after the user stops typing
  const debouncedQuery = useDebouncedValue(query, 400);
  // State holding the current list of search results to show
  const [results, setResults] = useState<SearchResult[]>([]);
  // State tracking whether a search request is currently in flight
  const [isSearching, setIsSearching] = useState(false);

  // Re-run the actual search whenever the debounced query changes
  useEffect(() => {
    // Define an async function so we can use await inside this effect
    async function runSearch() {
      // Don't bother searching for very short queries — avoids noisy results and wasted requests
      if (debouncedQuery.trim().length < 3) {
        // Clear out any previous results
        setResults([]);
        // Nothing more to do
        return;
      }
      // Mark that a search is now in progress
      setIsSearching(true);
      try {
        // Call our server-side search API route, which proxies to Nominatim
        const response = await fetch(`/api/geo/search?q=${encodeURIComponent(debouncedQuery)}`);
        // Parse the JSON response body
        const data = await response.json();
        // Store the returned results (or an empty list if something went wrong)
        setResults(data.results ?? []);
      } catch {
        // On any network failure, just show no results rather than crashing
        setResults([]);
      } finally {
        // Mark the search as finished either way
        setIsSearching(false);
      }
    }
    // Kick off the search
    runSearch();
  }, [debouncedQuery]);

  // Render the search box and its results dropdown
  return (
    // A relatively positioned wrapper so the results list can be absolutely positioned below it
    <div className="relative">
      {/* The text input the user types their search query into */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "Search for your area..."}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
      />

      {/* Show a small loading hint while a search is in flight */}
      {isSearching && <p className="mt-1 text-xs text-neutral-400">Searching...</p>}

      {/* Only render the results dropdown if we actually have results to show */}
      {results.length > 0 && (
        // An absolutely positioned dropdown list sitting just below the input
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg">
          {/* Loop over each search result and render it as a clickable row */}
          {results.map((result, index) => (
            // Each row is a list item containing a button for the whole clickable area
            <li key={index}>
              <button
                type="button"
                onClick={() => {
                  // Report the chosen location up to the parent, mapping the raw result into our StoredLocation shape
                  onSelect({ lat: result.lat, lng: result.lng, locality: result.label });
                  // Clear the input now that a selection has been made
                  setQuery("");
                  // Clear the results list so the dropdown closes
                  setResults([]);
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
              >
                {/* Display the place's full label/address */}
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
