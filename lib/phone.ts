// A small, hand-picked list of country codes for the phone input's country selector.
// Kept short and dependency-free (no need to pull in a big country-data package for an MVP).
export const COUNTRY_CODES = [
  // India is listed first since it's the default for this app's initial market
  { code: "+91", country: "India", flag: "🇮🇳" },
  // A handful of other common codes, alphabetical-ish by likely relevance
  { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  // Add more entries here as the app expands to new countries
] as const;

// The default country code dial-in value, used to pre-select India in the UI
export const DEFAULT_COUNTRY_CODE = "+91";

// Define a regular expression that matches a valid E.164 phone number
// (a "+" followed by 7 to 15 digits, no spaces or dashes — the format Supabase Auth expects)
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

// Define and export a function that checks whether a given string is a valid E.164 phone number
export function isValidE164(phone: string): boolean {
  // Test the input string against the E.164 pattern and return the boolean result
  return E164_REGEX.test(phone);
}

// Define and export a function that combines a country code and a local number into one E.164 string
export function toE164(countryCode: string, localNumber: string): string {
  // Strip out anything that isn't a digit from the local number part (spaces, dashes, etc.)
  const digitsOnly = localNumber.replace(/\D/g, "");
  // Concatenate the country code and the cleaned digits into a single E.164-formatted string
  return `${countryCode}${digitsOnly}`;
}
