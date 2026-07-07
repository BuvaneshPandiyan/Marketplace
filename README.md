# Marketplace App — Project Scaffold

A hyperlocal classifieds marketplace (like OLX), built with Next.js + Supabase, deployed on Cloudflare Pages/Workers via the OpenNext Cloudflare adapter.

> This is the scaffolding step only. Authentication, location, listings, search, chat, and the
> rest of the features are built in the prompts that follow this one.

## Stack

- **Next.js 15.5 (App Router) + TypeScript + Tailwind CSS** — frontend and API routes
- **Supabase** — Postgres database (with PostGIS for geo queries), Auth, Storage, Realtime
- **Cloudflare Workers (via `@opennextjs/cloudflare`)** — hosting/deployment
- **Hostinger** — domain registration (DNS gets pointed to Cloudflare once a domain is chosen)

### A note on the Next.js version

This project is pinned to **Next.js 15.5.x** rather than the newest Next.js 16.x release.
Next 16 changed Middleware (now called "Proxy") to default to the Node.js runtime, and
Cloudflare's OpenNext adapter currently only supports Edge-runtime middleware — so Next 16 +
this adapter combination doesn't work yet for apps that need middleware (which this app does,
for refreshing the Supabase auth session on every request). Next 15.5 doesn't have this
restriction. Re-evaluate this pin once `@opennextjs/cloudflare` adds Node.js middleware support.

### A known harmless build warning

You'll see this warning during `npm run build` / `npm run cf:build`:

```
A Node.js API is used (process.version at line: 27) which is not supported in the Edge Runtime.
```

This comes from `@supabase/supabase-js` (a dependency of `@supabase/ssr`) referencing
`process.version` internally. It's a build-time lint warning, not a build failure — the build
still completes successfully, and Cloudflare Workers' `nodejs_compat` flag (already enabled in
`wrangler.jsonc`) polyfills `process` at runtime. Keep an eye on it after deploying; if anything
ever breaks at runtime because of it, the fix is to import Supabase's server/browser clients
from their specific submodule paths instead of the package's combined index.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the example environment file and fill in your real Supabase project values:
   ```bash
   cp .env.example .env.local
   ```
   Get these values from your Supabase project dashboard under **Project Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — server-only, never exposed to the browser)
3. Run the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  layout.tsx          # Root layout (HTML shell, metadata, wraps app in UserProvider + LocationProvider)
  globals.css          # Tailwind import + base styles
  api/
    auth/send-otp/route.ts  # Rate-limits and sends the OTP (server-only, never call Supabase directly from the client for this)
    geo/
      reverse/route.ts        # Coordinates -> locality name, proxied through our server (sets a proper User-Agent for Nominatim)
      search/route.ts          # Free-text query -> matching places, same proxy reasoning
    search/
      query/route.ts            # The single shared Meilisearch search endpoint (autocomplete + full results page)
      sync/route.ts               # Pushes one listing's current state into (or out of) the search index
  (auth)/               # Route group for login/onboarding screens
    layout.tsx
    login/page.tsx       # Phone + OTP login flow
    onboarding/
      profile/page.tsx    # New-user onboarding: name + optional photo (protected — requires login)
      location/page.tsx    # New-user onboarding: GPS permission -> reverse geocode -> save default location
  (main)/               # Route group for the main app (shares the header)
    layout.tsx
    page.tsx              # The home feed — renders <TieredFeed /> with no category filter
    category/[slug]/page.tsx # Same tiered feed, scoped to one category
    search/page.tsx           # Search results — tiered (default) or flat (explicit sort), with filters
    sell/page.tsx           # The Post Ad wizard (protected — requires login)
    my-listings/page.tsx     # Seller dashboard: status, view count, edit/sold/delete (protected)
components/
  ui/
    Header.tsx            # Logo, location pill, search bar, Sell/My Listings links, login/logout state
  auth/
    LoginFlow.tsx           # Two-step phone/OTP UI, resend cooldown, redirect logic
    OtpInput.tsx              # 6-box OTP input with auto-focus
    CountryCodeSelect.tsx      # Country code dropdown (defaults to +91)
    OnboardingProfileForm.tsx   # Name + photo upload form for new users
    OnboardingLocationFlow.tsx   # GPS-permission-then-fallback-to-search onboarding step
    LogoutButton.tsx              # Signs out and redirects home
  location/
    LocationPill.tsx                # The "📍 Locality ▾" pill shown in the header
    LocationModal.tsx                # The switcher: use current location, search, recents
    LocationSearchInput.tsx           # Reusable debounced search box (used by onboarding + switcher + sell wizard)
  sell/
    SellWizard.tsx                     # Orchestrates all 5 steps + the final atomic submit
    ProductTypeStep.tsx                 # Step 1: searchable product type picker + "Other" custom entry
    DynamicQuestionForm.tsx              # Step 2: generic schema-driven question renderer
    DetailsStep.tsx                       # Step 3: title (with suggestion), description, price, condition
    PhotosStep.tsx                          # Step 4: wraps CameraCapture with step navigation
    CameraCapture.tsx                        # The live, camera-only capture + compression + upload UI
  listings/
    MyListingCard.tsx                          # One listing's card: status badge, Edit/Sold/Delete actions
    EditListingModal.tsx                         # Lightweight edit: title/description/price
  feed/
    TieredFeed.tsx                                 # Orchestrates the 3 location tiers, pagination, refresh
    ListingCard.tsx                                 # One listing's card on the feed: photo, price, distance, date
    CategoryChips.tsx                                # The category shortcut row above the feed
  search/
    SearchBar.tsx                                      # Header search input + debounced autocomplete dropdown
    SearchResults.tsx                                   # The full results page: tiered/flat modes, did-you-mean
    SearchFilters.tsx                                    # Category/price/condition/listing-type filters + sort dropdown
  providers/
    UserProvider.tsx                   # Tracks the logged-in user/profile across the app
    LocationProvider.tsx                # Resolves + manages the active browsing location
lib/
  supabase/
    client.ts            # Supabase client for use in the browser ('use client' components)
    server.ts             # Supabase client(s) for use on the server (Server Components, routes)
  server/
    nominatim.ts           # Server-only Nominatim calls (reverse geocode + search), with a proper User-Agent
    meilisearch.ts          # Meilisearch client wrapper: connection config, upsert/delete document functions
    buildListingSearchDocument.ts # Fetches a listing's full data from Supabase and shapes it for Meilisearch
  client/
    geolocation.ts          # Promise-wrapped browser Geolocation API
    locationStorage.ts        # localStorage helpers for the active-location override + recent list
    imageCapture.ts             # Canvas-based frame capture + resize/compression for listing photos
    suggestTitle.ts               # Builds a non-binding suggested title from product type + answers
    formatRelativeDate.ts          # "2 days ago"-style date formatting for feed cards
    syncSearch.ts                    # Calls /api/search/sync after every listing mutation
    searchHitAdapter.ts                # Adapts a raw Meilisearch hit into the shape ListingCard expects
  hooks/
    useUser.ts              # Hook to read { user, profile, isLoading, refreshProfile } anywhere
    useActiveLocation.ts      # Hook to read { lat, lng, locality, needsSetup, ... } anywhere
    useDebouncedValue.ts       # Small generic debounce hook (used by location search)
    useCameraStream.ts          # Manages the live getUserMedia camera stream lifecycle
  geo.ts                    # Haversine distance + friendly distance formatting (for later feed/search ranking)
  feedConfig.ts               # Tunable home feed constants: tier radii, page size, locality-name count
  phone.ts                   # Country code list + E.164 validation/formatting helpers
  utils.ts                    # Small shared helpers (e.g., className combiner)
middleware.ts                 # Refreshes the Supabase session AND redirects protected routes (/onboarding, /sell, /my-listings) to /login
supabase/
  migrations/                 # SQL files to run against your real Supabase project (see SETUP.md)
    0001-0004                   # Profiles, OTP rate limiting, profile photos, location columns
    0005_categories.sql           # Categories + sub-categories, seeded with the marketplace's verticals
    0006_listings.sql              # The core listings table, with a generated PostGIS geography column
    0007_listing_attributes_and_photos.sql # Flexible per-category fields + photo metadata
    0008_nearby_listings_function.sql       # get_listings_near() — reused by the feed and search later
    0009_product_types.sql                    # Product types + their JSONB question schemas, seeded
    0010_listings_product_type_column.sql      # Links listings to their specific product type
    0011_listing_photos_bucket.sql               # The listing-photos Storage bucket + RLS policies
    0012_create_listing_function.sql              # create_listing_with_details() — the atomic submit
    0013_tiered_feed_functions.sql                  # Tier 1/2 ring queries + get_listings_far() for Tier 3
scripts/
  setup-meilisearch-index.mjs   # One-time index config: searchable/filterable/sortable attrs, typo tolerance, synonyms (run via `npm run search:setup`)
types/
  index.ts                     # Shared TypeScript types: Profile, Category, ProductType, Listing, etc.
```

## Deploying to Cloudflare

This project deploys as a Cloudflare Worker (using Cloudflare's static assets + Workers
combination under the hood) via the OpenNext adapter, rather than the older Cloudflare Pages
"Pages Functions" model.

1. **Build for Cloudflare:**
   ```bash
   npm run cf:build
   ```
2. **Preview locally against the real Cloudflare runtime (Workers, not just Node):**
   ```bash
   npm run cf:preview
   ```
3. **Set secrets** (do this once, before your first deploy, and again any time a value changes):
   ```bash
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   ```
   Public variables (`NEXT_PUBLIC_*`) are baked in at build time from `.env.local` / your CI
   environment — they don't need to be set as Wrangler secrets, but make sure they're present
   wherever `npm run cf:build` actually runs (e.g., in your CI/CD pipeline's environment
   variables, or set as a "Build variable" in the Cloudflare dashboard if you connect this repo
   for automatic deploys).
4. **Deploy:**
   ```bash
   npm run cf:deploy
   ```
   The first deploy will create a new Worker on your Cloudflare account, reachable at a
   `*.workers.dev` subdomain.

## Connecting a Hostinger-Purchased Domain

1. Buy the domain through Hostinger (name not finalized yet — replace `[APP NAME]` throughout
   the codebase, especially in `app/layout.tsx` and `components/ui/Header.tsx`, once it is).
2. In the Cloudflare dashboard, add the domain as a new site (this gives you Cloudflare
   nameservers).
3. In Hostinger's domain management panel, change the domain's nameservers to the two Cloudflare
   nameservers shown in step 2 (this is the only change needed on Hostinger's side — DNS, SSL,
   and routing are then all managed through Cloudflare).
4. Once DNS has propagated (can take a few hours), go to your Worker's settings in the
   Cloudflare dashboard and add the custom domain under **Triggers → Custom Domains**.
5. Cloudflare automatically issues and renews an SSL certificate for the domain.

## What's Next

Phone OTP authentication, the location system, the core database schema, the full "Post Ad"
listing creation flow, a My Listings dashboard, the tiered home feed, and now fuzzy/typo-tolerant
search (Meilisearch, with the same tiered location ranking as the feed) are all built — see
`SETUP.md` for the one-time dashboard/config steps, including how to get Meilisearch running.
The listing detail page, chat, wishlist, and the rest of the feature set are still built
incrementally in the prompts that follow. See the full prompt sequence document for the order
to build them in.
