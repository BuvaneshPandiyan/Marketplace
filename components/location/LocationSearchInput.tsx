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
    <>
      <style>{`
        .lsi { position: relative; }

        .lsi-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: var(--r-md, 16px);
          border: 1.5px solid var(--line-strong, #e5e7eb);
          background: #fff;
          font-size: 13.5px; font-weight: 700; letter-spacing: -0.02em;
          color: var(--ink, #1a1a1a);
          outline: none;
          transition: border-color 200ms ease, box-shadow 200ms ease;
        }
        .lsi-input::placeholder { color: var(--ink-faint, #9ca3af); font-weight: 600; }
        .lsi-input:focus {
          border-color: var(--brand, #ea580c);
          box-shadow: 0 0 0 3px rgba(234,88,12,0.13);
        }

        .lsi-hint { margin-top: 6px; font-size: 11px; color: var(--ink-faint, #9ca3af); font-weight: 600; }

        /* Opaque, and lifted clear of the input. The ordering that actually
           decided the overlap lives in the modal (.lm-search vs
           .lm-recent-wrap) — this z-index only competes locally. */
        .lsi-results {
          position: absolute;
          top: calc(100% + 6px); left: 0; right: 0;
          z-index: 20;
          margin: 0; padding: 5px;
          list-style: none;
          border-radius: var(--r-md, 16px);
          border: 1.5px solid var(--brand-border, #fed7aa);
          background: #fff;
          box-shadow: 0 16px 44px rgba(124,32,0,0.2), 0 3px 10px rgba(124,32,0,0.08);
          max-height: 240px; overflow-y: auto;
          animation: lsi-in 200ms cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes lsi-in {
          from { opacity: 0; transform: translateY(-6px) scale(0.98); }
          to   { opacity: 1; transform: none; }
        }

        .lsi-row {
          display: block; width: 100%;
          padding: 10px 11px;
          border: none; background: transparent;
          border-radius: 10px;
          text-align: left; cursor: pointer;
          font-size: 13px; font-weight: 700; letter-spacing: -0.02em;
          color: var(--ink-soft, #374151);
          transition: background 160ms ease, color 160ms ease, transform 160ms ease;
        }
        @media (hover: hover) {
          .lsi-row:hover {
            background: var(--brand-tint, #fff7ed);
            color: var(--brand, #ea580c);
            transform: translateX(3px);
          }
        }
        .lsi-row:focus-visible { outline: 2px solid var(--brand, #ea580c); outline-offset: -2px; }

        @media (prefers-reduced-motion: reduce) {
          .lsi-results { animation: none !important; }
          .lsi-row, .lsi-input { transition: none !important; }
          .lsi-row:hover { transform: none !important; }
        }
      `}</style>

    {/* Relatively positioned wrapper so the results list can sit below the input */}
    <div className="lsi">
      {/* The text input the user types their search query into */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder ?? "Search for your area..."}
        className="lsi-input"
      />

      {/* Show a small loading hint while a search is in flight */}
      {isSearching && <p className="lsi-hint">Searching...</p>}

      {/* Only render the results dropdown if we actually have results to show */}
      {results.length > 0 && (
        // An absolutely positioned dropdown list sitting just below the input
        <ul className="lsi-results">
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
                className="lsi-row"
              >
                {/* Display the place's full label/address */}
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
    </>
  );
}