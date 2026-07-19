// Mark this as a Client Component since it's an interactive form
"use client";

// Define the props this component accepts
type DetailsStepProps = {
  // The current title text
  title: string;
  // The current description text
  description: string;
  // The current price, kept as a string for controlled-input purposes
  price: string;
  // The current overall condition: "new" or "used"
  condition: "new" | "used";
  // The current listing type: "sale" or "rent"
  listingType: "sale" | "rent";
  // A non-binding suggested title the seller can choose to apply
  suggestedTitle: string;
  // A callback fired whenever any field changes
  onChange: (field: "title" | "description" | "price" | "condition" | "listingType", value: string) => void;
  // A callback fired when the seller successfully proceeds to the next step
  onNext: () => void;
  // A callback fired when the seller wants to go back to the previous step
  onBack: () => void;
};

// Define and export the DetailsStep component
export function DetailsStep({
  title,
  description,
  price,
  condition,
  listingType,
  suggestedTitle,
  onChange,
  onNext,
  onBack,
}: DetailsStepProps) {
  // Work out whether this step's required fields (title + price) are currently filled in
  const isValid = title.trim().length > 0 && Number(price) > 0;

  // Render the details form
  return (
    // A vertical stack containing every field plus the navigation buttons
    <div className="space-y-4">
      {/* Heading for this step */}
      <h2 className="text-2xl font-black tracking-tight text-neutral-900">Make it <span className="text-cyan-600">shine</span></h2>
      <p className="mb-4 mt-1 text-sm font-medium text-neutral-500">A clear title and fair price sell up to 3× faster.</p>

      {/* The title field */}
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="e.g., Honda Activa 2019, well maintained"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
        />
        {/* Only show the suggestion if we have one and the seller hasn't already typed a title */}
        {suggestedTitle && !title && (
          <p className="mt-1 text-xs text-neutral-500">
            Suggestion: {suggestedTitle}{" "}
            <button
              type="button"
              onClick={() => onChange("title", suggestedTitle)}
              className="font-medium text-cyan-600 hover:text-cyan-700"
            >
              Use this
            </button>
          </p>
        )}
      </div>

      {/* The description field */}
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Description</label>
        <textarea
          value={description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Add any extra details a buyer might want to know..."
          rows={4}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
        />
      </div>

      {/* The price field */}
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">
          {/* Label changes slightly depending on sale vs. rent, for clarity */}
          {listingType === "rent" ? "Monthly rent" : "Price"} <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          value={price}
          onChange={(e) => onChange("price", e.target.value)}
          placeholder="0"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
        />
      </div>

      {/* The sale vs. rent toggle */}
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Listing type</label>
        <div className="flex gap-2">
          {/* The "For Sale" option */}
          <button
            type="button"
            onClick={() => onChange("listingType", "sale")}
            className={`flex-1 rounded-lg border py-2 text-sm ${
              listingType === "sale" ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-neutral-300 text-neutral-600"
            }`}
          >
            For Sale
          </button>
          {/* The "For Rent" option */}
          <button
            type="button"
            onClick={() => onChange("listingType", "rent")}
            className={`flex-1 rounded-lg border py-2 text-sm ${
              listingType === "rent" ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-neutral-300 text-neutral-600"
            }`}
          >
            For Rent
          </button>
        </div>
      </div>

      {/* The new/used condition toggle */}
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">Condition</label>
        <div className="flex gap-2">
          {/* The "Used" option */}
          <button
            type="button"
            onClick={() => onChange("condition", "used")}
            className={`flex-1 rounded-lg border py-2 text-sm ${
              condition === "used" ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-neutral-300 text-neutral-600"
            }`}
          >
            Used
          </button>
          {/* The "New" option */}
          <button
            type="button"
            onClick={() => onChange("condition", "new")}
            className={`flex-1 rounded-lg border py-2 text-sm ${
              condition === "new" ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-neutral-300 text-neutral-600"
            }`}
          >
            New
          </button>
        </div>
      </div>

      {/* The navigation row: Back and Next buttons */}
      <div className="flex gap-2 pt-2">
        {/* The Back button, returns to the dynamic question form */}
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back
        </button>
        {/* The Next button, disabled until title + price are valid */}
        <button
          type="button"
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 rounded-lg bg-cyan-600 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  );
}