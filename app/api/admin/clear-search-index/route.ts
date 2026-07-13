import { NextResponse } from "next/server";
import { getMeilisearchClient, LISTINGS_INDEX_NAME } from "@/lib/server/meilisearch";

export async function POST() {
  try {
    const client = getMeilisearchClient();
    // deleteAllDocuments returns a task — call .waitTask() on it directly
    // (same pattern used in upsertListingDocument and deleteListingDocument)
    await client.index(LISTINGS_INDEX_NAME).deleteAllDocuments().waitTask();
    return NextResponse.json({ success: true, message: "Search index cleared." });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}