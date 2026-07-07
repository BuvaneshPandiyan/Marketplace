import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MyListingsDashboard } from "@/components/listings/MyListingsDashboard";

// Supabase query and auth guard preserved exactly as-is
export default async function MyListingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/my-listings");
  }

  const { data: listings } = await supabase
    .from("listings")
    .select("*, listing_photos(url, sort_order), listing_attributes(id, key, value), product_types(name, question_schema)")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <MyListingsDashboard listings={listings ?? []} />
  );
}