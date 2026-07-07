// Import our shared types
import type { ListingAttribute, QuestionSchema } from "@/types";

// Define the props this component accepts
type ListingAttributesDisplayProps = {
  // The raw key/value attribute rows for this listing
  attributes: ListingAttribute[];
  // The product type's question schema, used to look up nice labels/units — null if unavailable
  schema: QuestionSchema | null;
};

// Define and export the ListingAttributesDisplay component
export function ListingAttributesDisplay({ attributes, schema }: ListingAttributesDisplayProps) {
  // Don't render anything if there are no attributes to show at all
  if (attributes.length === 0) return null;

  // Render a simple two-column grid of label/value pairs
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(140px,1fr))] lg:gap-x-6 lg:gap-y-3">
      {/* Loop over every attribute row this listing has */}
      {attributes.map((attribute) => {
        // Try to find this attribute's matching field definition in the schema, for a nice label
        const field = schema?.fields.find((f) => f.key === attribute.key);
        // Use the schema's label if we found one, otherwise fall back to the raw key
        const label = field?.label ?? attribute.key;
        // Figure out the right display value: booleans become Yes/No, everything else shown as-is
        const displayValue =
          field?.type === "boolean"
            ? attribute.value === "true"
              ? "Yes"
              : "No"
            : // Append the unit (e.g., "km", "sq.ft") if the schema defines one for this field
              `${attribute.value}${field?.unit ? ` ${field.unit}` : ""}`;

        // Render this one attribute as a small label/value block
        return (
          <div key={attribute.id}>
            {/* The attribute's label, in muted small text */}
            <p className="text-xs text-neutral-400">{label}</p>
            {/* The attribute's value, in slightly bolder text */}
            <p className="text-sm font-medium text-neutral-800">{displayValue}</p>
          </div>
        );
      })}
    </div>
  );
}