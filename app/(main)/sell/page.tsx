// Import the main wizard client component
import { SellWizard } from "@/components/sell/SellWizard";

// Define the page component shown at /sell — auth protection for this path is handled
// centrally by middleware.ts (the "/sell" prefix is in its protected list)
export default function SellPage() {
  // Render the interactive multi-step listing creation wizard
  return <SellWizard />;
}
