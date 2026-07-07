// A short, priority-ordered list of attribute keys worth pulling into a suggested title,
// when they happen to exist in the seller's answers — not every product type has these,
// so this stays generic rather than hardcoded per category
const INTERESTING_KEYS = ["brand", "model", "screen_size_inches", "storage", "bhk", "km_driven", "condition_detail"];

// Define and export a function that builds a friendly, non-binding title suggestion
export function buildSuggestedTitle(productTypeName: string, attributeAnswers: Record<string, string>): string {
  // Start the suggestion with the product type's own name, e.g., "Bike"
  const parts: string[] = [productTypeName];

  // Walk through our priority list and pick up to 2 answered values to add as extra detail
  for (const key of INTERESTING_KEYS) {
    // Stop once we already have the product type name plus 2 extra details
    if (parts.length >= 3) break;
    // Read this key's answer, if the seller has filled it in
    const value = attributeAnswers[key];
    // Only use it if it actually has a value
    if (value && value.trim()) {
      // Add a small unit suffix for the one numeric key where it reads naturally
      parts.push(key === "km_driven" ? `${value} km` : value);
    }
  }

  // Join every collected part with an em dash, e.g., "Bike — 15,000 km — Mint"
  return parts.join(" — ");
}
