// Mark this as a Client Component since it manages whether the modal is open
"use client";

// Import React's state hook
import { useState } from "react";
// Import our useActiveLocation hook to display the currently active locality
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
// Import the modal component this pill opens when clicked
import { LocationModal } from "@/components/location/LocationModal";

// Define and export the LocationPill component
export function LocationPill() {
  // Pull the active locality name and setup status from our location context
  const { locality, needsSetup } = useActiveLocation();
  // Track whether the location-switcher modal is currently open
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Render the pill button, plus the modal when it's open
  return (
    // A React Fragment since we need to render two siblings: the button and the conditional modal
    <>
      {/* The clickable pill itself, shown in the header */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="hidden shrink-0 items-center gap-1 rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 sm:flex"
      >
        {/* A simple pin emoji standing in for a location icon */}
        <span aria-hidden="true">📍</span>
        {/* Show the active locality if we have one, otherwise prompt the user to set one */}
        <span className="max-w-[10rem] truncate">{needsSetup ? "Set location" : locality}</span>
        {/* A small chevron hinting that this button opens a dropdown/modal */}
        <span aria-hidden="true">▾</span>
      </button>

      {/* Only render the modal when it's actually open, to keep it out of the DOM otherwise */}
      {isModalOpen && <LocationModal onClose={() => setIsModalOpen(false)} />}
    </>
  );
}
