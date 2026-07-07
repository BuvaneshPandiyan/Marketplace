// Import the official Meilisearch JS client SDK
import { Meilisearch } from "meilisearch";

// Read the Meilisearch host from the environment — this script runs standalone (outside Next.js),
// so we read straight from process.env rather than our app's lib/server/meilisearch.ts helper
const host = process.env.MEILISEARCH_HOST;
// Read the Meilisearch admin API key from the environment
const apiKey = process.env.MEILISEARCH_API_KEY;

// Guard clause: fail loudly and immediately if either required variable is missing
if (!host || !apiKey) {
  // Print a clear, actionable error message
  console.error("MEILISEARCH_HOST and MEILISEARCH_API_KEY must both be set before running this script.");
  // Exit with a non-zero code so this failure is obvious in CI/deploy logs
  process.exit(1);
}

// The name of the index this whole app uses for listing search — must match
// lib/server/meilisearch.ts's LISTINGS_INDEX_NAME constant
const INDEX_NAME = "listings";

// A small starting set of synonyms — easy to extend as real search behavior is observed in
// production. Each key maps to every OTHER phrase that should be treated as equivalent to it.
const SYNONYMS = {
  ps5: ["playstation 5", "sony ps5"],
  "playstation 5": ["ps5", "sony ps5"],
  "sony ps5": ["ps5", "playstation 5"],
  tv: ["television"],
  television: ["tv"],
  iphone: ["apple iphone"],
  "apple iphone": ["iphone"],
  bike: ["motorcycle", "motorbike"],
  motorcycle: ["bike", "motorbike"],
  motorbike: ["bike", "motorcycle"],
  fridge: ["refrigerator"],
  refrigerator: ["fridge"],
};

// Define the main async function that performs the actual setup
async function setupMeilisearchIndex() {
  // Create the configured client
  const client = new Meilisearch({ host, apiKey });

  // Create the index if it doesn't already exist — primaryKey "id" matches our document shape's
  // "id" field (see ListingSearchDocument in lib/server/meilisearch.ts). If the index already
  // exists, Meilisearch returns an error we can safely ignore here.
  try {
    // Ask Meilisearch to create the index, and wait for that task to finish
    await client.createIndex(INDEX_NAME, { primaryKey: "id" }).waitTask();
    console.log(`Created index "${INDEX_NAME}".`);
  } catch {
    // If it already exists, that's fine — log and move on rather than failing the whole script
    console.log(`Index "${INDEX_NAME}" already exists, continuing.`);
  }

  // Get a handle to the index so we can configure its settings
  const index = client.index(INDEX_NAME);

  // Apply every setting in one combined call, and wait for it to finish processing
  await index
    .updateSettings({
      // Which fields a typed query actually searches against — order matters somewhat, as
      // Meilisearch weighs earlier fields slightly more heavily by default
      searchableAttributes: ["title", "category_name", "subcategory_parent_name", "attributes_blob", "description"],
      // Which fields can be used in filter expressions (see app/api/search/query/route.ts) —
      // "_geo" must be listed here for _geoRadius() filtering to work at all
      filterableAttributes: ["status", "category_id", "price", "condition", "listing_type", "locality", "_geo"],
      // Which fields can be used as a sort key — "_geo" must be listed here too for
      // _geoPoint() distance sorting to work
      sortableAttributes: ["price", "created_at", "_geo"],
      // Explicitly confirm typo tolerance is ON, with Meilisearch's sensible default thresholds:
      // a 5+ letter word allows one typo, a 9+ letter word allows two typos — this is what makes
      // a query like "playstaton 5" still match a listing titled "PlayStation 5"
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 },
      },
      // Our starting synonym list, so abbreviations and common alternate names also match
      synonyms: SYNONYMS,
    })
    .waitTask();

  // Confirm success
  console.log(`Configured settings for index "${INDEX_NAME}": searchable/filterable/sortable attributes, typo tolerance, and synonyms.`);
}

// Run the setup function and make sure the script actually exits afterward (success or failure)
setupMeilisearchIndex()
  .then(() => {
    console.log("Meilisearch index setup complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Meilisearch index setup failed:", error);
    process.exit(1);
  });
