"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ShowNumberButtonProps = {
  listingId: string;
  isLoggedIn: boolean;
  size?: "default" | "compact";
};

export function ShowNumberButton({ listingId, isLoggedIn, size = "default" }: ShowNumberButtonProps) {
  const [supabase] = useState(() => createClient());
  const [phone, setPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCompact = size === "compact";

  if (phone) {
    return (
      <a
        href={`tel:${phone}`}
        className={`flex w-full items-center justify-center gap-2 rounded-full border border-green-400 font-semibold text-green-700 transition-colors hover:bg-green-50 ${
          isCompact ? "py-2 text-xs" : "py-3 text-sm gap-2.5"
        }`}
      >
        <svg width={isCompact ? 14 : 17} height={isCompact ? 14 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        {isCompact ? phone.slice(-4).padStart(phone.length, "•") : phone}
      </a>
    );
  }

  if (!isLoggedIn) {
    if (isCompact) {
      return (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-center text-xs text-neutral-600">
          <a href="/login" className="font-semibold text-orange-600 hover:text-orange-700">Log in</a>
          {" "}to view
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-center text-sm text-neutral-600">
        <a href="/login" className="font-semibold text-orange-600 hover:text-orange-700">Log in</a>
        {" "}to see the seller&apos;s phone number.
      </div>
    );
  }

  async function handleReveal() {
    setError(null);
    setIsLoading(true);
    const { data, error: rpcError } = await supabase.rpc("reveal_seller_phone", {
      p_listing_id: listingId,
    });
    setIsLoading(false);
    if (rpcError || !data) {
      setError(rpcError?.message ?? "Could not retrieve the phone number.");
      return;
    }
    setPhone(data as string);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleReveal}
        disabled={isLoading}
        className={`flex w-full items-center justify-center gap-2 rounded-full border border-neutral-300 font-semibold text-neutral-700 transition-colors hover:border-neutral-400 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60 ${
          isCompact ? "py-2 text-xs" : "py-3 text-sm gap-2.5"
        }`}
      >
        <svg width={isCompact ? 14 : 17} height={isCompact ? 14 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.1a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.59 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        {isLoading ? "Loading…" : isCompact ? "Phone" : "Show Phone Number"}
      </button>
      {error && <p className="mt-1.5 text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}