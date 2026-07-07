"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { syncListingToSearch } from "@/lib/client/syncSearch";
import type { Listing, QuestionSchema } from "@/types";

type EditListingModalProps = {
  listing: Listing & {
    listing_photos?: { url: string; sort_order: number }[];
    listing_attributes?: { id: string; key: string; value: string | null }[];
    product_types?: { name: string; question_schema: unknown } | null;
  };
  onClose: () => void;
  onSaved: () => void;
};

const INPUT_CLASS =
  "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/20 transition-colors";
const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-neutral-700";

// Toggle button — reused for condition and listing type
function ToggleRow({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
            value === opt.value
              ? "border-orange-500 bg-orange-50 text-orange-700"
              : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function EditListingModal({ listing, onClose, onSaved }: EditListingModalProps) {
  const [supabase] = useState(() => createClient());
  const [mounted, setMounted] = useState(false);

  // Core listing fields — pre-filled from existing listing
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description ?? "");
  const [price, setPrice] = useState(String(listing.price));
  const [condition, setCondition] = useState<"new" | "used">(listing.condition);
  const [listingType, setListingType] = useState<"sale" | "rent">(listing.listing_type);

  // Dynamic attribute fields — driven by the product type's QuestionSchema.
  // question_schema is already included in the page query, so no separate fetch needed.
  const [questionSchema] = useState<QuestionSchema | null>(() => {
    const schema = listing.product_types?.question_schema;
    return schema ? (schema as QuestionSchema) : null;
  });
  const schemaLoading = false;
  const [attrValues, setAttrValues] = useState<Record<string, string>>(() => {
    // Pre-fill from existing listing_attributes
    const map: Record<string, string> = {};
    for (const attr of listing.listing_attributes ?? []) {
      map[attr.key] = attr.value ?? "";
    }
    return map;
  });

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SSR guard
  useEffect(() => { setMounted(true); }, []);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleAttrChange(key: string, value: string) {
    setAttrValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setErrorMessage(null);

    if (!title.trim()) { setErrorMessage("Title can't be empty."); return; }
    if (Number.isNaN(Number(price)) || Number(price) < 0) {
      setErrorMessage("Please enter a valid price.");
      return;
    }

    setIsSaving(true);

    // 1. Update core listing fields.
    // RLS ensures this only succeeds if the current user is the seller.
    const { error: listingError } = await supabase
      .from("listings")
      .update({
        title: title.trim(),
        description: description.trim() || null,
        price: Number(price),
        condition,
        listing_type: listingType,
      })
      .eq("id", listing.id);

    if (listingError) {
      setIsSaving(false);
      setErrorMessage("Failed to save listing details. Please try again.");
      return;
    }

    // 2. Update attribute fields if there is a schema.
    // NOTE: This is a delete-then-insert pattern. If the insert partially fails, the
    // listing will temporarily have fewer attributes than expected. A future
    // update_listing_attributes(p_listing_id, p_attributes) RPC would make this atomic.
    if (questionSchema && questionSchema.fields.length > 0) {
      // Delete all existing attributes for this listing
      const { error: deleteError } = await supabase
        .from("listing_attributes")
        .delete()
        .eq("listing_id", listing.id);

      if (!deleteError) {
        // Re-insert with updated values (only non-empty ones)
        const newAttrs = questionSchema.fields
          .filter((field) => attrValues[field.key]?.trim())
          .map((field) => ({
            listing_id: listing.id,
            key: field.key,
            value: attrValues[field.key].trim(),
          }));

        if (newAttrs.length > 0) {
          await supabase.from("listing_attributes").insert(newAttrs);
        }
      }
    }

    setIsSaving(false);
    syncListingToSearch(listing.id);
    onSaved();
    onClose();
  }

  const modal = (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 20,
          width: "100%",
          maxWidth: 560,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
        }}
      >
        {/* Sticky header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px",
          borderBottom: "1px solid #f3f4f6",
          flexShrink: 0,
          borderRadius: "20px 20px 0 0",
          background: "white",
        }}>
          <p style={{ fontWeight: 700, fontSize: 17, color: "#111827", margin: 0 }}>Edit listing</p>
          <button type="button" onClick={onClose} aria-label="Close"
            style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={2.5}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable form body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* ── Listing type + Condition (top toggles, same as wizard) ── */}
          <div>
            <label className={LABEL_CLASS}>Listing type</label>
            <ToggleRow
              value={listingType}
              options={[{ label: "For Sale", value: "sale" }, { label: "For Rent", value: "rent" }]}
              onChange={(v) => setListingType(v as "sale" | "rent")}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Condition</label>
            <ToggleRow
              value={condition}
              options={[{ label: "Used", value: "used" }, { label: "New", value: "new" }]}
              onChange={(v) => setCondition(v as "new" | "used")}
            />
          </div>

          {/* ── Title ── */}
          <div>
            <label className={LABEL_CLASS}>
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT_CLASS}
              placeholder="e.g. Honda Activa 2019, well maintained"
            />
          </div>

          {/* ── Price ── */}
          <div>
            <label className={LABEL_CLASS}>
              {listingType === "rent" ? "Monthly rent (₹)" : "Price (₹)"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={INPUT_CLASS}
              placeholder="0"
              min="0"
            />
          </div>

          {/* ── Description ── */}
          <div>
            <label className={LABEL_CLASS}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={INPUT_CLASS}
              placeholder="Add details a buyer might want to know…"
              style={{ resize: "vertical", minHeight: 96 }}
            />
          </div>

          {/* ── Dynamic attribute fields (same rendering as DynamicQuestionForm) ── */}
          {schemaLoading && (
            <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse" style={{ height: 42, borderRadius: 12, background: "#f3f4f6" }} />
              ))}
            </div>
          )}

          {!schemaLoading && questionSchema && questionSchema.fields.length > 0 && (
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
              <p className="mb-4 text-sm font-semibold text-neutral-700">Item details</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {questionSchema.fields.map((field) => (
                  <div key={field.key}>
                    <label className={LABEL_CLASS}>
                      {field.label}
                      {field.required && <span className="text-red-500"> *</span>}
                      {field.unit && <span className="text-neutral-400"> ({field.unit})</span>}
                    </label>

                    {field.type === "text" && (
                      <input type="text" value={attrValues[field.key] ?? ""} onChange={(e) => handleAttrChange(field.key, e.target.value)} className={INPUT_CLASS} />
                    )}
                    {field.type === "number" && (
                      <input type="number" value={attrValues[field.key] ?? ""} onChange={(e) => handleAttrChange(field.key, e.target.value)} className={INPUT_CLASS} />
                    )}
                    {field.type === "date" && (
                      <input type="date" value={attrValues[field.key] ?? ""} onChange={(e) => handleAttrChange(field.key, e.target.value)} className={INPUT_CLASS} />
                    )}
                    {field.type === "select" && (
                      <select value={attrValues[field.key] ?? ""} onChange={(e) => handleAttrChange(field.key, e.target.value)} className={INPUT_CLASS}>
                        <option value="">Select…</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                    {field.type === "boolean" && (
                      <ToggleRow
                        value={attrValues[field.key] ?? ""}
                        options={[{ label: "Yes", value: "true" }, { label: "No", value: "false" }]}
                        onChange={(v) => handleAttrChange(field.key, v)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Existing photos (display only — re-shoot via /sell to update) ── */}
          {listing.listing_photos && listing.listing_photos.length > 0 && (
            <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
              <label className={LABEL_CLASS}>Photos</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[...listing.listing_photos]
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((photo, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={photo.url} alt={`Photo ${i + 1}`}
                      style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12, border: "1px solid #e5e7eb" }}
                    />
                  ))}
              </div>
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>
                Photos are set at listing time and can&apos;t be changed here. Re-post via Post Ad to update photos.
              </p>
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#dc2626" }}>
              {errorMessage}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: "12px 0", borderRadius: 100, border: "1px solid #e5e7eb", background: "white", fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving}
              style={{
                flex: 2, padding: "12px 0", borderRadius: 100, border: "none",
                background: "linear-gradient(135deg, #ea580c, #f97316)",
                fontSize: 14, fontWeight: 700, color: "white",
                cursor: isSaving ? "not-allowed" : "pointer",
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(modal, document.body) : null;
}