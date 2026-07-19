"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { SearchHit } from "@/lib/client/searchHitAdapter";

export function SearchBar({ autoFocus = false, onCollapse }: { autoFocus?: boolean; onCollapse?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [suggestions, setSuggestions] = useState<SearchHit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchSuggestions() {
      if (debouncedQuery.trim().length < 2) { setSuggestions([]); return; }
      try {
        const response = await fetch(`/api/search/query?q=${encodeURIComponent(debouncedQuery)}&limit=5`);
        const data = await response.json();
        setSuggestions(data.hits ?? []);
      } catch { setSuggestions([]); }
    }
    fetchSuggestions();
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToResults(searchText: string) {
    setIsOpen(false);
    router.push(`/search?q=${encodeURIComponent(searchText)}`);
    onCollapse?.();
  }

  return (
    <>
      <style>{`
        .sb-field { position: relative; display: flex; align-items: center; }

        .sb-lens {
          position: absolute; left: 15px; z-index: 1;
          color: var(--ink-faint, #9ca3af); pointer-events: none;
          transition: color 200ms ease, transform 260ms cubic-bezier(0.34,1.56,0.64,1);
        }

        .sb-input {
          width: 100%;
          height: 44px;
          padding: 0 46px 0 42px;
          border-radius: var(--r-pill, 100px);
          border: 1.5px solid #bbf7d0;
          background: #f6f5f3;
          font-size: 13.5px; font-weight: 600; letter-spacing: -0.02em;
          color: var(--ink, #1a1a1a);
          outline: none;
          transition: border-color 200ms ease, background 200ms ease, box-shadow 200ms ease;
        }
        .sb-input::placeholder { color: var(--ink-faint, #9ca3af); font-weight: 500; }
        .sb-input:focus {
          border-color: #22c55e;
          background: #fff;
          box-shadow: 0 0 0 3.5px rgba(34,197,94,0.16);
        }
        /* Lens wakes up with the field */
        .sb-field:focus-within .sb-lens { color: #ca8a04; transform: scale(1.08); }

        .sb-go {
          position: absolute; right: 5px;
          width: 34px; height: 34px; border-radius: 50%; border: none;
          background: linear-gradient(135deg,#eab308,#facc15);
          color: #fff; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 3px 10px rgba(234,179,8,0.42);
          transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 220ms ease;
        }
        @media (hover: hover) {
          .sb-go:hover { transform: scale(1.1); box-shadow: 0 6px 18px rgba(234,179,8,0.55); }
          .sb-go:hover svg { transform: translateX(2px); }
        }
        .sb-go:active { transform: scale(0.9); }
        .sb-go:focus-visible { outline: 2px solid #eab308; outline-offset: 2px; }
        .sb-go svg { transition: transform 220ms cubic-bezier(0.34,1.56,0.64,1); }

        @media (prefers-reduced-motion: reduce) {
          .sb-lens, .sb-input, .sb-go, .sb-go svg { transition: none !important; }
          .sb-field:focus-within .sb-lens, .sb-go:hover, .sb-go:active, .sb-go:hover svg { transform: none !important; }
        }
      `}</style>

    <div ref={wrapperRef} className="relative flex-1">
      <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) goToResults(query); }}>
        {/* Input + submit button wrapper */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <input
            type="text"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search for cars, mobiles, furniture and more..."
            className="w-full rounded-full border border-neutral-300 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-orange-500 focus:bg-white focus:outline-none"
            style={{
              paddingTop: 8, paddingBottom: 8,
              paddingLeft: 16,
              // Extra right padding so text never slides under the button
              paddingRight: 48,
            }}
          />

          {/* Visible search submit button — gradient circle docked at right edge */}
          <button
            type="submit"
            aria-label="Search"
            style={{
              position: "absolute",
              right: 4,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: "linear-gradient(135deg, #eab308, #facc15)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
              transition: "transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease",
              boxShadow: "0 2px 8px rgba(234,179,8,0.4)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 16px rgba(234,179,8,0.5)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(234,179,8,0.4)";
            }}
            onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.92)"; }}
            onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </div>
      </form>

      {/* Autocomplete dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg">
          {suggestions.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                onClick={() => goToResults(hit.title)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-50"
              >
                <span className="truncate">{hit.title}</span>
                <span className="ml-2 shrink-0 text-xs text-neutral-400">{hit.category_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
    </>
  );
}