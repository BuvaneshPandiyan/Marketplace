// Mark this as a Client Component since it manages multi-step wizard state
"use client";

// Import React's state hook
import { useState } from "react";
// Import Next.js's router for redirecting after a successful submit
import { useRouter } from "next/navigation";
// Import our browser Supabase client creator
import { createClient } from "@/lib/supabase/client";
// Import our auth hook, for the logged-in user's ID
import { useUser } from "@/lib/hooks/useUser";
// Import our active-location hook, to pre-fill Step 5
import { useActiveLocation } from "@/lib/hooks/useActiveLocation";
// Import every step component
import { ProductTypeStep } from "@/components/sell/ProductTypeStep";
import { DynamicQuestionForm } from "@/components/sell/DynamicQuestionForm";
import { DetailsStep } from "@/components/sell/DetailsStep";
import { PhotosStep } from "@/components/sell/PhotosStep";
import { LocationStep } from "@/components/sell/LocationStep";
// Import the captured-photo type
import type { CapturedPhoto } from "@/components/sell/CameraCapture";
// Import our title-suggestion helper
import { buildSuggestedTitle } from "@/lib/client/suggestTitle";
// Import the shared location shape
import type { StoredLocation } from "@/lib/client/locationStorage";
// Import our shared ProductType type
import type { ProductType } from "@/types";
// Import our search-sync helper, called right after a listing is successfully created
import { syncListingToSearch } from "@/lib/client/syncSearch";

// Define and export the main wizard component
export function SellWizard() {
  // Get the router so we can redirect once the listing is successfully posted
  const router = useRouter();
  // Pull the logged-in user from our auth context (this page is already protected by middleware)
  const { user } = useUser();
  // Pull the active browsing location, used to pre-fill Step 5
  const { lat: activeLat, lng: activeLng, locality: activeLocality } = useActiveLocation();
  // Create one browser Supabase client instance for this component's lifetime
  const [supabase] = useState(() => createClient());

  // Track which of the 5 steps we're currently showing
  const [step, setStep] = useState(1);
  // Track the chosen product type (official or custom)
  const [productType, setProductType] = useState<ProductType | null>(null);
  // Track the dynamic question answers, keyed by field key
  const [attributeAnswers, setAttributeAnswers] = useState<Record<string, string>>({});
  // Track the listing title
  const [title, setTitle] = useState("");
  // Track the listing description
  const [description, setDescription] = useState("");
  // Track the listing price (kept as a string for the controlled input)
  const [price, setPrice] = useState("");
  // Track the overall condition
  const [condition, setCondition] = useState<"new" | "used">("used");
  // Track sale vs. rent
  const [listingType, setListingType] = useState<"sale" | "rent">("sale");
  // Track the captured (and already-uploaded) photos
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  // Track the listing's location, pre-filled lazily from the active location once it's ready
  const [location, setLocation] = useState<StoredLocation | null>(null);
  // Track whether the final submit is currently in progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track any error from a failed final submit
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Work out the location to show in Step 5 — the seller's explicit pick, or the active location as a default
  const effectiveLocation: StoredLocation | null =
    location ?? (activeLat !== null && activeLng !== null && activeLocality ? { lat: activeLat, lng: activeLng, locality: activeLocality } : null);

  // Build a non-binding suggested title from the chosen product type and current answers
  const suggestedTitle = productType ? buildSuggestedTitle(productType.name, attributeAnswers) : "";

  // Define a generic handler for updating a single field in the Step 3 details form
  function handleDetailsChange(field: "title" | "description" | "price" | "condition" | "listingType", value: string) {
    // Route the update to the right piece of state based on which field changed
    if (field === "title") setTitle(value);
    if (field === "description") setDescription(value);
    if (field === "price") setPrice(value);
    if (field === "condition") setCondition(value as "new" | "used");
    if (field === "listingType") setListingType(value as "sale" | "rent");
  }

  // Define the final submit handler, called from Step 5
  async function handleSubmit() {
    // Guard clause: we need a logged-in user, a product type, and a location to proceed
    if (!user || !productType || !effectiveLocation) {
      setSubmitError("Something's missing — please check every step and try again.");
      return;
    }
    // Clear any previous error
    setSubmitError(null);
    // Mark that submission is now in progress
    setIsSubmitting(true);

    // Build the attributes array in the shape our RPC function expects
    const attributesPayload = Object.entries(attributeAnswers).map(([key, value]) => ({ key, value }));
    // Build the photos array in the shape our RPC function expects, preserving capture order
    const photosPayload = photos.map((photo, index) => ({
      url: photo.uploadedUrl,
      exif_lat: photo.exifLat,
      exif_lng: photo.exifLng,
      exif_timestamp: photo.exifTimestamp,
      captured_in_app: true,
      // Include the perceptual hash so the fraud-check API can compare it server-side
      perceptual_hash: photo.perceptualHash ?? null,
      sort_order: index,
    }));

    // Call our atomic Postgres function to create the listing, its attributes, and its photos together
    const { data, error } = await supabase.rpc("create_listing_with_details", {
      p_product_type_id: productType.id,
      p_title: title,
      p_description: description || null,
      p_price: Number(price),
      p_listing_type: listingType,
      p_condition: condition,
      p_locality: effectiveLocation.locality,
      p_lat: effectiveLocation.lat,
      p_lng: effectiveLocation.lng,
      p_attributes: attributesPayload,
      p_photos: photosPayload,
    });

    // Mark submission as finished
    setIsSubmitting(false);

    // If the database rejected the submission (e.g., failed validation), show its message
    if (error) {
      setSubmitError(error.message || "Failed to post your listing. Please try again.");
      return;
    }

    // Success — the function returned the new listing's ID in `data`; sync it into the search
    // index right away (non-blocking — see syncListingToSearch's own comments for why) before
    // navigating to the seller's dashboard where they'll see it appear
    if (data) {
      const newListingId = data as string;
      // Fire off the search-index sync without awaiting it, so it doesn't delay the redirect below
      syncListingToSearch(newListingId);
      // Fire the listing-published confirmation notification + email (fire-and-forget)
      fetch("/api/notifications/listing-published", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: newListingId }),
      }).catch(() => {
        // Swallow errors — a missed notification should never block the user's flow
      });
      // Fire the fraud check — runs EXIF GPS mismatch + perceptual-hash duplicate detection.
      // Fire-and-forget: if the check flags the listing the seller will see it as 'flagged'
      // on their dashboard, but we don't delay the UI waiting for the check to complete.
      fetch("/api/listings/check-fraud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: newListingId }),
      }).catch(() => {
        // Swallow errors — a failed fraud check is never worth blocking the seller's flow
      });
    }
    router.push("/my-listings");
  }

  // If we don't know who's logged in yet, show a brief loading state rather than a broken form
  if (!user) {
    return <p className="text-sm text-neutral-500">Loading...</p>;
  }

  // Render the wizard shell: a progress indicator plus whichever step is currently active
  return (
    // A centered, card-width container matching the rest of the app's form styling
    <div className="mx-auto max-w-md px-4 py-8">
      {/* A simple "Step X of 5" progress indicator */}
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-neutral-400">Step {step} of 5</p>

      {/* Step 1: product type selection */}
      {step === 1 && (
        <ProductTypeStep
          onSelect={(selected) => {
            // Store the chosen product type
            setProductType(selected);
            // Reset any previous answers, since a new product type means a new question set
            setAttributeAnswers({});
            // Advance to Step 2
            setStep(2);
          }}
        />
      )}

      {/* Step 2: dynamic, type-specific questions — only rendered once a product type is chosen */}
      {step === 2 && productType && (
        <DynamicQuestionForm
          schema={productType.question_schema}
          values={attributeAnswers}
          onChange={(key, value) => setAttributeAnswers((prev) => ({ ...prev, [key]: value }))}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {/* Step 3: title, description, price, condition */}
      {step === 3 && (
        <DetailsStep
          title={title}
          description={description}
          price={price}
          condition={condition}
          listingType={listingType}
          suggestedTitle={suggestedTitle}
          onChange={handleDetailsChange}
          onNext={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {/* Step 4: camera-only photo capture */}
      {step === 4 && (
        <PhotosStep
          photos={photos}
          onPhotosChange={setPhotos}
          userId={user.id}
          onNext={() => setStep(5)}
          onBack={() => setStep(3)}
        />
      )}

      {/* Step 5: confirm location and submit */}
      {step === 5 && (
        <LocationStep
          locality={effectiveLocation?.locality ?? null}
          onLocationChange={setLocation}
          onSubmit={handleSubmit}
          onBack={() => setStep(4)}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      )}
    </div>
  );
}
