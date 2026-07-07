// A tiny utility for conditionally joining CSS class names together (similar to the popular "clsx" pattern)
// We write our own minimal version here instead of adding another dependency just for this.

// Define and export a function called "cn" (short for "classNames")
export function cn(...classes: Array<string | false | null | undefined>) {
  // Filter out any falsy values (false, null, undefined, empty string), then join the rest with a space
  return classes.filter(Boolean).join(" ");
  // Example: cn("p-4", isActive && "bg-blue-500", null) => "p-4 bg-blue-500" when isActive is true
}

// Note: location-based distance utilities (e.g., Haversine formula) are intentionally NOT included
// here yet — they belong to the location-system build step, not this initial scaffolding step.
