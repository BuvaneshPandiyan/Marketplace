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
    <div className="mb-4 flex flex-wrap gap-2">
      {/* Category filter — grouped by parent with subcategories inside */}
      <select
        value={filters.categoryId ?? ""}
        onChange={(e) => onFiltersChange({ ...filters, categoryId: e.target.value || null })}
        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="">Category</option>
        {groupedCategories.map(({ parent, children }) =>
          children.length > 0 ? (
            // Parent has subcategories — show them grouped under the parent label
            <optgroup key={parent.id} label={`${parent.icon ?? ""} ${parent.name}`}>
              {/* "All Vehicles" option catches listings filed directly under the parent */}
              <option value={parent.id}>All {parent.name}</option>
              {/* Each subcategory as its own option */}
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </optgroup>
          ) : (
            // Parent has no subcategories — show it as a plain option
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
        className="w-28 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <input
        type="number"
        value={filters.priceMax}
        onChange={(e) => onFiltersChange({ ...filters, priceMax: e.target.value })}
        placeholder="Max price"
        className="w-28 rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
      />

      {/* Condition filter */}
      <select
        value={filters.condition ?? ""}
        onChange={(e) => onFiltersChange({ ...filters, condition: (e.target.value || null) as "new" | "used" | null })}
        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="">Any condition</option>
        <option value="new">New</option>
        <option value="used">Used</option>
      </select>

      {/* Listing type filter */}
      <select
        value={filters.listingType ?? ""}
        onChange={(e) => onFiltersChange({ ...filters, listingType: (e.target.value || null) as "sale" | "rent" | null })}
        className="rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="">Sale or rent</option>
        <option value="sale">For sale</option>
        <option value="rent">For rent</option>
      </select>

      {/* Sort dropdown */}
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="ml-auto rounded-lg border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="relevance">Relevance</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="newest">Newest</option>
        {hasLocation && <option value="distance">Distance</option>}
      </select>

      {/* Clear filters — only shown when filters are active and an onClear handler is provided */}
      {onClear && hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 transition-colors hover:border-orange-400 hover:text-orange-600"
        >
          ✕ Clear
        </button>
      )}
    </div>
  );
}