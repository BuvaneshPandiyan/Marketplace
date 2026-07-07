// Mark this as a Client Component since it fetches data and manages search/selection state
"use client";

// Import React's state and effect hooks
import { useEffect, useMemo, useState } from "react";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";
// Import our shared Category and ProductType types
import type { Category, ProductType, QuestionSchema } from "@/types";

// The generic fallback question schema used for any custom ("Other") product type —
// kept simple but still required, so custom listings stay reasonably consistent with official ones
const OTHER_QUESTION_SCHEMA: QuestionSchema = {
  fields: [
    {
      key: "condition_detail",
      label: "Condition",
      type: "select",
      required: true,
      options: ["New", "Like new", "Used", "For parts"],
    },
    { key: "specifications", label: "Brief specifications", type: "text", required: true },
    {
      key: "age_range",
      label: "Age of item",
      type: "select",
      required: true,
      options: ["Under 1 year", "1-2 years", "2-5 years", "5+ years"],
    },
  ],
};

// Define a small helper that turns free text into a URL-friendly, reasonably unique slug
function slugify(name: string): string {
  // Lowercase the name, replace anything that's not a letter/number with a dash, trim stray dashes,
  // then append a short random suffix so two sellers typing the same custom name don't collide
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 7)
  );
}

// Define the props this component accepts
type ProductTypeStepProps = {
  // A callback fired once a product type (official or freshly-created custom) has been chosen
  onSelect: (productType: ProductType) => void;
};

// Define and export the ProductTypeStep component
export function ProductTypeStep({ onSelect }: ProductTypeStepProps) {
  // Create one browser Supabase client instance for this component's lifetime
  const [supabase] = useState(() => createClient());
  // State holding every product type fetched from the database
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  // State holding every category fetched from the database (used to group product types)
  const [categories, setCategories] = useState<Category[]>([]);
  // State tracking whether the initial data fetch is still in progress
  const [isLoading, setIsLoading] = useState(true);
  // State holding the search query the seller types
  const [searchQuery, setSearchQuery] = useState("");
  // State tracking whether the "Other" custom-entry mini-form is currently open
  const [isOtherOpen, setIsOtherOpen] = useState(false);
  // State holding the free-text name typed for a custom product type
  const [customName, setCustomName] = useState("");
  // State holding the chosen category ID for a custom product type
  const [customCategoryId, setCustomCategoryId] = useState("");
  // State tracking whether we're currently saving a new custom product type
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  // State holding any error from saving a custom product type
  const [customError, setCustomError] = useState<string | null>(null);

  // Fetch product types and categories once when this step first mounts
  useEffect(() => {
    // Define an async function so we can use await inside this effect
    async function loadData() {
      // Fetch every product type and every category in parallel for speed
      const [productTypesResult, categoriesResult] = await Promise.all([
        // Fetch all product type rows
        supabase.from("product_types").select("*").order("name"),
        // Fetch all category rows
        supabase.from("categories").select("*").order("name"),
      ]);
      // Store the fetched product types (or an empty list if something went wrong)
      setProductTypes((productTypesResult.data as ProductType[]) ?? []);
      // Store the fetched categories (or an empty list if something went wrong)
      setCategories((categoriesResult.data as Category[]) ?? []);
      // Mark loading as finished
      setIsLoading(false);
    }
    // Kick off the data fetch
    loadData();
  }, [supabase]);

  // Build a quick lookup map from category ID to category, recomputed only when categories change
  const categoryById = useMemo(() => {
    // Build a plain object keyed by category ID
    const map: Record<string, Category> = {};
    // Fill the map from our fetched categories list
    categories.forEach((category) => {
      map[category.id] = category;
    });
    // Return the completed lookup map
    return map;
  }, [categories]);

  // Group the (optionally filtered) product types by their TOP-LEVEL parent category name
  const groupedProductTypes = useMemo(() => {
    // Lowercase the search query once for case-insensitive comparisons
    const query = searchQuery.trim().toLowerCase();
    // Filter the product types to only those matching the search query (or all, if query is empty)
    const filtered = query ? productTypes.filter((pt) => pt.name.toLowerCase().includes(query)) : productTypes;

    // Build a map from group label (top-level category name) to the product types under it
    const groups: Record<string, ProductType[]> = {};
    // Walk through every matching product type
    filtered.forEach((productType) => {
      // Look up this product type's direct category
      const directCategory = categoryById[productType.category_id];
      // Walk up to the top-level parent category, if this category has one
      const parentCategory = directCategory?.parent_id ? categoryById[directCategory.parent_id] : null;
      // Use the parent's name if there is one, otherwise fall back to the direct category's own name
      const groupLabel = parentCategory?.name ?? directCategory?.name ?? "Other";
      // Make sure this group exists in our map
      if (!groups[groupLabel]) groups[groupLabel] = [];
      // Add this product type to its group
      groups[groupLabel].push(productType);
    });
    // Return the completed grouping
    return groups;
  }, [productTypes, searchQuery, categoryById]);

  // Only show top-level categories (no parent_id) in the custom-entry category dropdown
  const topLevelCategories = useMemo(
    // Filter to categories that have no parent
    () => categories.filter((c) => c.parent_id === null),
    [categories]
  );

  // Define the handler for saving a brand-new custom product type
  async function handleSaveCustom() {
    // Clear any previous error
    setCustomError(null);
    // Guard clause: a name is required
    if (!customName.trim()) {
      setCustomError("Please describe what you're selling.");
      return;
    }
    // Guard clause: a category is required
    if (!customCategoryId) {
      setCustomError("Please choose the closest matching category.");
      return;
    }
    // Mark that saving is in progress
    setIsSavingCustom(true);
    // Insert the new custom product type row and ask Supabase to return the created row
    const { data, error } = await supabase
      // Target the product_types table
      .from("product_types")
      // Insert this single new row
      .insert({
        // The chosen category
        category_id: customCategoryId,
        // The seller's own description of what they're selling
        name: customName.trim(),
        // A generated, reasonably unique slug
        slug: slugify(customName),
        // The generic fallback question schema, kept consistent across all custom types
        question_schema: OTHER_QUESTION_SCHEMA,
        // Flag this as custom so it's distinguishable from our official pre-seeded types
        is_custom: true,
      })
      // Ask for the inserted row back so we can pass it straight to the next step
      .select()
      .single();
    // Mark saving as finished
    setIsSavingCustom(false);

    // If the insert failed, show an error and stop
    if (error || !data) {
      setCustomError("Couldn't save that — please try again.");
      return;
    }

    // Success — pass the newly created product type up to the wizard, advancing to Step 2
    onSelect(data as ProductType);
  }

  // Show a simple loading state while the initial data fetch is in progress
  if (isLoading) {
    return <p className="text-sm text-neutral-500">Loading categories...</p>;
  }

  // Render the picker UI
  return (
    // A vertical stack containing the search box, grouped results, and the "Other" option
    <div className="space-y-4">
      {/* Heading for this step */}
      <h2 className="text-lg font-semibold text-neutral-900">What are you listing?</h2>

      {/* The search input for filtering the product type list */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search, e.g., bike, mobile, TV..."
        className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
      />

      {/* The grouped, scrollable list of product types */}
      <div className="max-h-80 space-y-4 overflow-y-auto">
        {/* Loop over each group label and its product types */}
        {Object.entries(groupedProductTypes).map(([groupLabel, typesInGroup]) => (
          // Each group is its own section with a small header
          <div key={groupLabel}>
            {/* The group's header, e.g., "Vehicles" */}
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">{groupLabel}</p>
            {/* The product types within this group, as a simple vertical list */}
            <div className="space-y-1">
              {/* Loop over each product type in this group */}
              {typesInGroup.map((productType) => (
                // Each product type is a clickable row
                <button
                  key={productType.id}
                  type="button"
                  onClick={() => onSelect(productType)}
                  className="block w-full rounded-lg border border-neutral-200 px-3 py-2 text-left text-sm hover:border-orange-300 hover:bg-orange-50"
                >
                  {/* Display the product type's name */}
                  {productType.name}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Show a friendly empty state if the search query matched nothing */}
        {Object.keys(groupedProductTypes).length === 0 && (
          <p className="text-sm text-neutral-500">No matches — try the &quot;Other&quot; option below.</p>
        )}
      </div>

      {/* The "Other" fallback option, always available regardless of search results */}
      <div className="border-t border-neutral-200 pt-4">
        {/* Toggle button that reveals the custom-entry mini-form */}
        {!isOtherOpen ? (
          <button
            type="button"
            onClick={() => setIsOtherOpen(true)}
            className="w-full rounded-lg border border-dashed border-neutral-300 px-3 py-2.5 text-sm text-neutral-600 hover:border-orange-300 hover:text-orange-700"
          >
            Other — describe what you&apos;re selling
          </button>
        ) : (
          // The custom-entry mini-form: free-text name + category picker
          <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
            {/* The free-text name input */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">What is it?</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Antique wooden chair"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
            {/* The closest-matching category picker, needed since every listing belongs to a category */}
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">Closest category</label>
              <select
                value={customCategoryId}
                onChange={(e) => setCustomCategoryId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
              >
                {/* A blank default option forcing an explicit choice */}
                <option value="">Choose a category...</option>
                {/* Loop over every top-level category as an option */}
                {topLevelCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>
            {/* Show any error from the save attempt */}
            {customError && <p className="text-sm text-red-600">{customError}</p>}
            {/* The confirm button for the custom entry */}
            <button
              type="button"
              onClick={handleSaveCustom}
              disabled={isSavingCustom}
              className="w-full rounded-lg bg-orange-600 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {/* Swap label while saving */}
              {isSavingCustom ? "Saving..." : "Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
