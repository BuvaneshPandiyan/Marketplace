// Mark this as a Client Component since it's a controlled form
"use client";

// Import React's useMemo hook for computing the grouped category structure
import { useMemo } from "react";
// Import our shared Category type
import type { Category } from "@/types";

// Define the shape of the filter values this component manages
export type SearchFilterValues = {
  categoryId: string | null;
  priceMin: string;
  priceMax: string;
  condition: "new" | "used" | null;
  listingType: "sale" | "rent" | null;
};

// The small set of sort options this page supports
export type SortOption = "relevance" | "price_asc" | "price_desc" | "newest" | "distance";

// Define the props this component accepts
type SearchFiltersProps = {
  categories: Category[];
  filters: SearchFilterValues;
  onFiltersChange: (filters: SearchFilterValues) => void;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
  hasLocation: boolean;
  // Optional clear handler — when provided, a "Clear" button appears when filters are active
  onClear?: () => void;
};

export function SearchFilters({ categories, filters, onFiltersChange, sort, onSortChange, hasLocation, onClear }: SearchFiltersProps) {
  // Whether any filter is currently active (used to show/hide the Clear button)
  const hasActiveFilters = !!(
    filters.categoryId || filters.priceMin || filters.priceMax ||
    filters.condition || filters.listingType || sort !== "relevance"
  );
  // Group categories: parents with their children nested underneath.
  // This lets us use <optgroup> so the user sees a proper hierarchy
  // and can pick the right specific subcategory every time.
  const groupedCategories = useMemo(() => {
    const parents = categories.filter((c) => c.parent_id === null);
    const children = categories.filter((c) => c.parent_id !== null);
    return parents.map((parent) => ({
      parent,
      children: children.filter((c) => c.parent_id === parent.id),
    }));
  }, [categories]);

  return (
    <div className="sf-bar mb-4 flex flex-wrap items-center gap-2.5">
      <style>{`
        /* ── Search filter controls: ruby theme, premium styling ── */
        .sf-bar { --sf-accent: #cf1338; }
        .sf-field {
          appearance: none; -webkit-appearance: none;
          border: 1.5px solid #ecdfe2; background: #fff; color: #1c1917;
          border-radius: 12px; padding: 9px 13px; font-size: 13.5px; font-weight: 600;
          letter-spacing: -0.01em; cursor: pointer; outline: none;
          transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms cubic-bezier(0.34,1.56,0.64,1), background 200ms ease;
        }
        .sf-field::placeholder { color: #a8a29e; font-weight: 500; }
        .sf-field:hover { border-color: #f0b8c2; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(207,19,56,0.1); }
        .sf-field:focus { border-color: var(--sf-accent); box-shadow: 0 0 0 3px rgba(207,19,56,0.14); transform: translateY(-1px); }
        /* Custom chevron for selects */
        .sf-select {
          padding-right: 34px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23cf1338' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 12px center;
        }
        .sf-price { width: 116px; }
        /* Fade/slide the whole bar in, staggered per control */
        .sf-field { animation: sf-in 450ms cubic-bezier(0.22,1,0.36,1) both; }
        .sf-field:nth-child(2){ animation-delay: 40ms; }
        .sf-field:nth-child(3){ animation-delay: 80ms; }
        .sf-field:nth-child(4){ animation-delay: 120ms; }
        .sf-field:nth-child(5){ animation-delay: 160ms; }
        .sf-field:nth-child(6){ animation-delay: 200ms; }
        @keyframes sf-in { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        .sf-sort { margin-left: auto; }
        .sf-clear {
          flex-shrink: 0; border-radius: 999px; border: 1.5px solid #ecdfe2;
          padding: 8px 15px; font-size: 13px; font-weight: 700; color: #78716c;
          background: #fff; cursor: pointer;
          transition: border-color 180ms ease, color 180ms ease, background 180ms ease, transform 180ms ease;
        }
        .sf-clear:hover { border-color: var(--sf-accent); color: var(--sf-accent); background: #fff1f3; transform: translateY(-1px); }
        @media(prefers-reduced-motion:reduce){ .sf-field { animation: none !important; } .sf-field:hover, .sf-field:focus, .sf-clear:hover { transform: none; } }
      `}</style>

      {/* Category filter — grouped by parent with subcategories inside */}
      <select
        value={filters.categoryId ?? ""}
        onChange={(e) => onFiltersChange({ ...filters, categoryId: e.target.value || null })}
        className="sf-field sf-select"
      >
        <option value="">📂 Category</option>
        {groupedCategories.map(({ parent, children }) =>
          children.length > 0 ? (
            <optgroup key={parent.id} label={`${parent.icon ?? ""} ${parent.name}`}>
              <option value={parent.id}>All {parent.name}</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={parent.id} value={parent.id}>
              {parent.icon ?? ""} {parent.name}
            </option>
          )
        )}
      </select>

      {/* Price range filters */}
      <input
        type="number"
        value={filters.priceMin}
        onChange={(e) => onFiltersChange({ ...filters, priceMin: e.target.value })}
        placeholder="Min price"
        className="sf-field sf-price"
      />
      <input
        type="number"
        value={filters.priceMax}
        onChange={(e) => onFiltersChange({ ...filters, priceMax: e.target.value })}
        placeholder="Max price"
        className="sf-field sf-price"
      />

      {/* Condition filter */}
      <select
        value={filters.condition ?? ""}
        onChange={(e) => onFiltersChange({ ...filters, condition: (e.target.value || null) as "new" | "used" | null })}
        className="sf-field sf-select"
      >
        <option value="">Any condition</option>
        <option value="new">New</option>
        <option value="used">Used</option>
      </select>

      {/* Listing type filter */}
      <select
        value={filters.listingType ?? ""}
        onChange={(e) => onFiltersChange({ ...filters, listingType: (e.target.value || null) as "sale" | "rent" | null })}
        className="sf-field sf-select"
      >
        <option value="">Sale or rent</option>
        <option value="sale">For sale</option>
        <option value="rent">For rent</option>
      </select>

      {/* Sort dropdown */}
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="sf-field sf-select sf-sort"
      >
        <option value="relevance">Relevance</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="newest">Newest</option>
        {hasLocation && <option value="distance">Distance</option>}
      </select>

      {/* Clear filters */}
      {onClear && hasActiveFilters && (
        <button type="button" onClick={onClear} className="sf-clear">
          ✕ Clear
        </button>
      )}
    </div>
  );
}