// Mark this as a Client Component since it's an interactive form control
"use client";

// Import our small hand-picked list of country codes
import { COUNTRY_CODES } from "@/lib/phone";

// Define the props this component accepts
type CountryCodeSelectProps = {
  // The currently selected dial code, e.g., "+91"
  value: string;
  // A callback fired whenever the user picks a different country code
  onChange: (code: string) => void;
};

// Define and export the CountryCodeSelect component
export function CountryCodeSelect({ value, onChange }: CountryCodeSelectProps) {
  // Render a native <select> element for simplicity and built-in accessibility/mobile support
  return (
    // The dropdown itself, styled to sit flush against the phone number input next to it
    <select
      // Controlled value, driven by the parent component's state
      value={value}
      // Notify the parent whenever the selection changes
      onChange={(e) => onChange(e.target.value)}
      // Style the select to look like the left half of a combined input group
      className="rounded-l-lg border border-r-0 border-neutral-300 bg-neutral-50 px-2 py-2.5 text-sm focus:border-orange-500 focus:outline-none"
    >
      {/* Loop over every available country code and render it as an option */}
      {COUNTRY_CODES.map((country) => (
        // Each option's value is the dial code; the label shows flag + code + country name
        <option key={country.code} value={country.code}>
          {/* Display the flag emoji, dial code, and country name together */}
          {country.flag} {country.code} {country.country}
        </option>
      ))}
    </select>
  );
}
