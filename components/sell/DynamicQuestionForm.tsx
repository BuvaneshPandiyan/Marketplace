// Mark this as a Client Component since it manages form input state and validation
"use client";

// Import React's state hook
import { useState } from "react";
// Import our shared QuestionSchema/QuestionField types
import type { QuestionSchema } from "@/types";

// Define the props this component accepts
type DynamicQuestionFormProps = {
  // The schema describing which fields to render, taken from the chosen product type
  schema: QuestionSchema;
  // The current answers, keyed by field key, all stored as strings (matching listing_attributes.value)
  values: Record<string, string>;
  // A callback fired whenever any field's value changes
  onChange: (key: string, value: string) => void;
  // A callback fired when the seller successfully proceeds to the next step
  onNext: () => void;
  // A callback fired when the seller wants to go back to the previous step
  onBack: () => void;
};

// Define and export the DynamicQuestionForm component
export function DynamicQuestionForm({ schema, values, onChange, onNext, onBack }: DynamicQuestionFormProps) {
  // Track whether the seller has attempted to proceed, so we only show validation errors after that
  const [hasTriedToProceed, setHasTriedToProceed] = useState(false);

  // Define a helper that checks whether a single required field currently has a value
  function isFieldFilled(key: string): boolean {
    // A field counts as filled if its trimmed value is non-empty
    return Boolean(values[key]?.trim());
  }

  // Compute whether every required field in the schema is currently filled in
  const isFormValid = schema.fields.every((field) => !field.required || isFieldFilled(field.key));

  // Define the handler for the "Next" button
  function handleNext() {
    // Remember that the seller has now tried to proceed, so error styling can show if needed
    setHasTriedToProceed(true);
    // Only actually advance if every required field is filled in
    if (isFormValid) {
      onNext();
    }
  }

  // Render the dynamic form
  return (
    // A vertical stack containing every field plus the navigation buttons
    <div className="space-y-4">
      {/* Heading for this step */}
      <h2 className="text-lg font-semibold text-neutral-900">Tell us more</h2>

      {/* Loop over every field defined in this product type's schema */}
      {schema.fields.map((field) => {
        // Work out whether THIS specific field should currently show an error state
        const showError = hasTriedToProceed && field.required && !isFieldFilled(field.key);

        // Render a labeled wrapper around whichever input type this field needs
        return (
          <div key={field.key}>
            {/* The field's label, with a red asterisk if it's required */}
            <label className="mb-1 block text-sm font-medium text-neutral-700">
              {field.label}
              {field.required && <span className="text-red-500"> *</span>}
              {/* Show the unit (e.g., "km/l") next to the label, if one is defined */}
              {field.unit && <span className="text-neutral-400"> ({field.unit})</span>}
            </label>

            {/* Render a plain text input for "text" fields */}
            {field.type === "text" && (
              <input
                type="text"
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  showError
                    ? "border-red-400 focus:ring-red-200"
                    : "border-neutral-300 focus:border-orange-500 focus:ring-orange-200"
                }`}
              />
            )}

            {/* Render a number input for "number" fields */}
            {field.type === "number" && (
              <input
                type="number"
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  showError
                    ? "border-red-400 focus:ring-red-200"
                    : "border-neutral-300 focus:border-orange-500 focus:ring-orange-200"
                }`}
              />
            )}

            {/* Render a dropdown for "select" fields */}
            {field.type === "select" && (
              <select
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  showError
                    ? "border-red-400 focus:ring-red-200"
                    : "border-neutral-300 focus:border-orange-500 focus:ring-orange-200"
                }`}
              >
                {/* A blank default option so nothing is pre-selected by accident */}
                <option value="">Select...</option>
                {/* Loop over every option this field defines */}
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {/* Render a date input for "date" fields */}
            {field.type === "date" && (
              <input
                type="date"
                value={values[field.key] ?? ""}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
                  showError
                    ? "border-red-400 focus:ring-red-200"
                    : "border-neutral-300 focus:border-orange-500 focus:ring-orange-200"
                }`}
              />
            )}

            {/* Render a Yes/No toggle for "boolean" fields */}
            {field.type === "boolean" && (
              <div className="flex gap-2">
                {/* The "Yes" option */}
                <button
                  type="button"
                  onClick={() => onChange(field.key, "true")}
                  className={`flex-1 rounded-lg border py-2 text-sm ${
                    values[field.key] === "true"
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-neutral-300 text-neutral-600"
                  }`}
                >
                  Yes
                </button>
                {/* The "No" option */}
                <button
                  type="button"
                  onClick={() => onChange(field.key, "false")}
                  className={`flex-1 rounded-lg border py-2 text-sm ${
                    values[field.key] === "false"
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-neutral-300 text-neutral-600"
                  }`}
                >
                  No
                </button>
              </div>
            )}

            {/* Show a small "required" hint beneath the field if it's currently invalid */}
            {showError && <p className="mt-1 text-xs text-red-600">This field is required.</p>}
          </div>
        );
      })}

      {/* The navigation row: Back and Next buttons */}
      <div className="flex gap-2 pt-2">
        {/* The Back button, returns to product type selection */}
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Back
        </button>
        {/* The Next button, validates required fields before advancing */}
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 rounded-lg bg-orange-600 py-2.5 text-sm font-medium text-white hover:bg-orange-700"
        >
          Next
        </button>
      </div>
    </div>
  );
}
