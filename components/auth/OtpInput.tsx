// Mark this as a Client Component since it manages focus and keyboard interaction
"use client";

// Import React's ref/state hooks
import { useRef, useState } from "react";

// Define the props this component accepts
type OtpInputProps = {
  // How many digit boxes to render (we'll always pass 6, but keep this configurable)
  length: number;
  // A callback fired every time the full code changes, with the combined string so far
  onChange: (code: string) => void;
};

// Define and export the OtpInput component
export function OtpInput({ length, onChange }: OtpInputProps) {
  // State holding each digit individually, starting as an array of empty strings
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(""));
  // A ref array so we can programmatically focus specific input boxes by index
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Define a helper that updates a single digit and reports the combined code upward
  function updateDigit(index: number, value: string) {
    // Build a new array so React notices the state change (never mutate state directly)
    const newDigits = [...digits];
    // Store only the last character typed, in case of weird multi-character input
    newDigits[index] = value.slice(-1);
    // Save the updated digits array into state
    setDigits(newDigits);
    // Tell the parent component the latest full code (joining all digits together)
    onChange(newDigits.join(""));

    // If a digit was actually entered (not cleared) and we're not on the last box yet
    if (value && index < length - 1) {
      // Move focus to the next input box automatically
      inputRefs.current[index + 1]?.focus();
    }
  }

  // Define a handler for keydown events, specifically to support backspace navigation
  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    // If the user pressed Backspace on an already-empty box, move focus to the previous box
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      // Shift focus one box to the left
      inputRefs.current[index - 1]?.focus();
    }
  }

  // Define a handler for pasting a full code at once (common when copying from an SMS app)
  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    // Prevent the default paste behavior so we can control it manually
    event.preventDefault();
    // Read the pasted text and strip out anything that isn't a digit
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "");
    // Split the pasted digits into an array, padded/truncated to match our box count
    const newDigits = Array(length)
      // Create an array of the right length
      .fill("")
      // Fill each position with the corresponding pasted character, or keep it empty
      .map((_, i) => pasted[i] ?? "");
    // Save the new digits into state
    setDigits(newDigits);
    // Report the combined code to the parent
    onChange(newDigits.join(""));
    // Focus the last filled box (or the last box if the whole code was pasted)
    const lastFilledIndex = Math.min(pasted.length, length - 1);
    // Move focus there
    inputRefs.current[lastFilledIndex]?.focus();
  }

  // Render one input box per digit position
  return (
    // A horizontal flex container spacing out the digit boxes evenly
    <div className="flex justify-between gap-2">
      {/* Loop over the digits array to render one input per position */}
      {digits.map((digit, index) => (
        // Each box is a single-character text input styled to look like a big digit cell
        <input
          // React needs a stable key for each item in a list
          key={index}
          // Store a reference to this specific input so we can focus it programmatically
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          // Restrict the on-screen keyboard to numbers on mobile devices
          inputMode="numeric"
          // Only allow a single character to be typed visually
          maxLength={1}
          // Controlled input value, taken from our digits state array
          value={digit}
          // Update state whenever this box's value changes
          onChange={(e) => updateDigit(index, e.target.value.replace(/\D/g, ""))}
          // Handle backspace-to-previous-box navigation
          onKeyDown={(e) => handleKeyDown(index, e)}
          // Handle pasting a full code into any box
          onPaste={handlePaste}
          // Style each box as a square-ish, centered, large-text cell
          className="h-12 w-12 rounded-lg border border-neutral-300 text-center text-lg font-semibold focus:border-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
        />
      ))}
    </div>
  );
}