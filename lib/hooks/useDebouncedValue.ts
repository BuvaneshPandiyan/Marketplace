// Mark this as a Client Component hook since it uses React state/effects
"use client";

// Import React's state and effect hooks
import { useEffect, useState } from "react";

// Define and export a hook that returns a debounced copy of the given value
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  // State holding the debounced (delayed) copy of the value
  const [debouncedValue, setDebouncedValue] = useState(value);

  // Re-run this effect every time the input value changes
  useEffect(() => {
    // Schedule an update to the debounced value after the given delay
    const timer = setTimeout(() => {
      // Copy the latest value into our debounced state
      setDebouncedValue(value);
    }, delayMs);

    // If the value changes again before the delay finishes, cancel the pending update
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  // Return whatever the debounced value currently is
  return debouncedValue;
}
