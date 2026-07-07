# Supabase Setup — Authentication (Prompt 1)

This project's code is fully built and tested locally (build, lint, type-check, and the dev
server's request/response behavior all pass). What **can't** be tested from this build
environment is anything requiring a live connection to Supabase's servers, since that's outside
this sandbox's network access. Do the following once, against your real Supabase project.

## 1. Run the SQL migrations

Open your Supabase project's **SQL Editor** and run each file in `supabase/migrations/` in
order (`0001_profiles.sql`, `0002_otp_rate_limit.sql`, `0003_profile_photos_bucket.sql`, then
`0004_profile_location_columns.sql`). Each one is safe to re-run if you ever need to (they use
`if not exists` / `drop ... if exists` guards).

Alternatively, if you have the Supabase CLI linked to your project:

```bash
npx supabase db push
```

## 2. Enable phone OTP sign-in

In the Supabase dashboard: **Authentication → Sign In / Providers → Phone**.

- Turn the Phone provider **on**.
- Choose and configure an SMS provider — Supabase doesn't send SMS itself, it relays through
  one of: Twilio, MessageBird, Vonage, or Textlocal. Twilio is the most commonly used; you'll
  need a Twilio account, a phone number capable of sending SMS, and to paste its Account SID,
  Auth Token, and Message Service SID/From-number into the Supabase provider settings.
- Under **Authentication → Sign In / Providers → Phone**, set the OTP expiry (default 60s is
  fine) — this is separate from our own 60-second **resend** cooldown, which is enforced in our
  own code (`components/auth/LoginFlow.tsx`), not by Supabase.

There is no way to fully avoid SMS costs — every provider charges a small per-message fee. Our
own rate limiting (max 3 OTP sends per phone number per 10 minutes, enforced by the
`check_and_log_otp_request` Postgres function) exists specifically to cap how much abuse can
cost you on top of that.

## 3. Set your real environment variables

Make sure `.env.local` (copied from `.env.example`) has your actual project's values, not
placeholders:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-real-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-real-service-role-key
```

## 4. Test the real flow

Once the above is done:

```bash
npm run dev
```

Go to `/login`, enter a real phone number, and confirm you receive an SMS. The first time you
verify a number, the `handle_new_auth_user` trigger fires automatically and creates a row in
`profiles`; since `name` starts out `null`, you'll be redirected to `/onboarding/profile`. Fill
it in, and you'll land on the `/onboarding/location` placeholder (built out in the next prompt).
Logging in again with the same number afterward should take you straight to the home page.

## What was verified in this sandbox (without live Supabase access)

- `npm run build`, `npm run lint`, and `npx tsc --noEmit` all pass cleanly.
- `npm run cf:build` (the Cloudflare/OpenNext build) completes successfully.
- The dev server serves `/`, `/login`, `/onboarding/profile`, and `/onboarding/location`
  without errors.
- The middleware correctly redirects an unauthenticated request to `/onboarding/profile` to
  `/login?redirect=/onboarding/profile`.
- The `/api/auth/send-otp` route correctly rejects malformed phone numbers with a 400, and
  fails *gracefully* (a clean 500 JSON error, not a crash) when Supabase itself is unreachable —
  confirming the error handling is solid even though the actual OTP-sending and database calls
  couldn't be exercised end-to-end here.

---

# Location System (Prompt 2)

## What was verified in this sandbox

Same situation as above, but for a different external service this time: this sandbox's
network access doesn't include `nominatim.openstreetmap.org` either (confirmed directly —
it returns `403 host_not_allowed` from the egress proxy). So while everything *internal* to
the app was fully tested, the actual Nominatim responses were not:

- `npm run build`, `npm run lint`, and `npx tsc --noEmit` all pass cleanly with the new
  location code (migration, API routes, providers, hooks, and UI components).
- `npm run cf:build` still completes successfully.
- `/onboarding/location` correctly redirects to `/login` when not authenticated (same
  middleware protection as `/onboarding/profile`).
- `/api/geo/reverse` and `/api/geo/search` both correctly validate their inputs (400 on
  missing/invalid params) and — this is the important part — **fail gracefully** when the
  Nominatim request itself is blocked: they return `{ "locality": null }` / `{ "results": [] }`
  rather than crashing or returning a 500. That's exactly the behavior you want in production
  too, since Nominatim's free tier can occasionally be slow/unavailable, and the UI (onboarding
  flow, search dropdown) is built to handle empty/null results by falling back to manual entry
  rather than breaking.

What this means for you: once you run this against the real internet, double-check that:

1. Reverse geocoding (`/api/geo/reverse?lat=...&lng=...`) returns a sensible locality string
   for a few real coordinates near where you expect users to be.
2. Forward search (`/api/geo/search?q=...`) returns relevant results for a few real area names
   (e.g., "Tambaram", "Kodambakkam").
3. The full onboarding flow in a real browser: grant location permission, confirm it saves to
   `profiles.default_lat/lng/locality`, and that denying permission correctly falls back to the
   manual search box.
4. The location switcher modal in the header: "Use current location," manual search, and that
   previously chosen locations show up under "Recent" after a page reload (confirms localStorage
   persistence is working, which can't be verified by this sandbox's server-side testing alone).

## Nominatim usage policy — a couple of things to keep in mind

- Nominatim's [usage policy](https://operations.osmfoundation.org/policies/nominatim/) is meant
  for light usage — there's a soft rate limit (around 1 request/second) and they ask for an
  identifying User-Agent or Referer header, which `lib/server/nominatim.ts` already sets (set
  `NOMINATIM_CONTACT_EMAIL` in `.env.local` so it includes a real contact, per their policy).
- If the app's usage grows beyond light/MVP traffic, consider self-hosting a Nominatim instance
  or switching to a paid geocoding provider — both are drop-in replacements for the two
  functions in `lib/server/nominatim.ts` (`reverseGeocode` and `searchPlaces`), since the rest
  of the app only talks to those functions, never to Nominatim directly.
- Search results are currently biased to India (`countrycodes=in` in
  `lib/server/nominatim.ts`) since that's this app's initial market — remove that parameter
  once the app expands to other countries.

---

# Database Schema: Listings & Categories (Prompt 3)

## What was actually verified this time (real database, not just syntax review)

The first two prompts hit a network wall — Supabase and Nominatim weren't reachable from this
sandbox, so the application code was tested as thoroughly as possible but the actual external
service calls couldn't be exercised. This prompt is different: `archive.ubuntu.com` IS
reachable, so PostgreSQL 16 + PostGIS 3.4 were installed locally and every migration in this
prompt was run against a **real local database**, including realistic functional and security
tests — not just "does the SQL parse."

Specifically, this was tested:

- **All 8 migrations (0001-0008) run cleanly in sequence from a fresh database**, with no
  manual intervention — confirming foreign key dependency order is correct (categories and
  profiles exist before listings references them, etc.) and every migration is safely
  re-runnable.
- **The generated PostGIS `geog` column** (the riskiest part of this schema — generated
  columns require the expression to be deterministic/immutable) was confirmed to compute
  correctly: inserting a listing at real Tambaram coordinates produced exactly the expected
  `POINT(lng lat)` geography value.
- **Category seeding**: all 7 top-level categories and 24 sub-categories were verified to
  insert with correct parent/child relationships (31 rows, correctly nested).
- **RLS policies — tested as the actual restricted roles, not as a superuser** (this matters;
  testing RLS as a superuser/table owner doesn't actually test anything, since superusers
  bypass RLS by default):
  - An anonymous (logged-out) role correctly sees only `active` listings.
  - A seller correctly sees their own non-active (e.g., flagged) listings, in addition to all
    active ones.
  - A user attempting to `UPDATE` another user's listing affects exactly 0 rows (silently
    blocked, not erroring — correct behavior for a `USING` clause).
  - A user attempting to `INSERT` a listing with someone else's `seller_id` is rejected outright
    with an explicit RLS violation error.
  - The same owner/non-owner/anon patterns were verified on `listing_attributes` too (the
    EXISTS-subquery-based policies that check the parent listing's ownership).
- **The `get_listings_near()` distance function** was tested with listings placed at real
  coordinates around Tambaram, Chromepet, Pallavaram, central Chennai, and Bangalore:
  - Distances came back correct (e.g., Tambaram→Chromepet computed as 3.77km, which matches a
    manual Haversine sanity check).
  - Results are correctly sorted nearest-first.
  - A tight 5km radius correctly excluded everything past it (Pallavaram at 5.46km and beyond),
    while a 50km radius correctly excluded only the ~290km-away Bangalore listing.
  - The category filter, pagination (`limit`/`offset`), and the exclusion of non-active
    (e.g., sold) listings all worked exactly as expected.
  - The function was also called as the genuinely RLS-restricted `anon` role (not just the
    superuser used for test setup) to confirm the `grant execute` actually works for real
    unprivileged callers in production.

## What you still need to do

Run migrations `0005` through `0008` (in addition to `0001`-`0004` from the earlier prompts, if
you haven't already) against your real Supabase project — same process as before: Supabase SQL
Editor, in order, or `npx supabase db push` if you have the CLI linked. Since `postgis` and
`uuid`/`gen_random_uuid()` are already available on every Supabase project by default, no extra
dashboard configuration is needed for this prompt (unlike the SMS/Nominatim setup from earlier).

One thing to double check once it's live: Supabase's hosted Postgres should already have the
`anon` and `authenticated` roles set up correctly (that's standard on every Supabase project),
so the `grant execute ... to anon, authenticated` statement in `0008` should just work — but
it's worth a quick manual test in the SQL Editor (`select * from get_listings_near(12.9229,
80.1275, 10);`) the first time, to confirm.

---

# Listing Creation, Camera Capture & My Listings (Prompt 4)

## What was actually verified this time

Same approach as Prompt 3 — `archive.ubuntu.com` is reachable here even though Supabase isn't,
so every new migration (`0009` through `0012`) was run against the same real local
PostgreSQL 16 + PostGIS 3.4 instance, with full functional and security testing, not just a
syntax read-through:

- **All 12 migrations (0001-0012) run cleanly in sequence from a brand-new database**, with
  zero manual intervention.
- **All 11 seeded product types** (Bike, Scooter, Car, Bicycle, Mobile Phone, Laptop, TV,
  Gaming Console, Camera, Room for Rent, Furniture) were verified to have well-formed JSONB
  question schemas — the Bike schema specifically was checked field-by-field against the
  spec's literal list (mileage, condition, keys available, km driven, tank capacity,
  registration year, fuel type, owner number, insurance, RC availability — all 10 present).
- **The `create_listing_with_details()` atomic function** — the riskiest part of this prompt,
  since it touches three tables in one call — was tested for both the happy path and every
  server-side validation rule:
  - A full listing (with 4 attributes and 3 photos) was created successfully in one call, and
    all three tables (`listings`, `listing_attributes`, `listing_photos`) were confirmed to
    contain exactly the right rows afterward.
  - Submitting only 2 photos is rejected with a clear error, and **nothing is partially
    saved** — confirmed by checking the listing count was still zero after the rejected
    attempt (this is what "atomic" actually means in practice, not just in theory).
  - Submitting 9 photos is rejected (the 8-photo maximum).
  - Calling the function while logged out is rejected — and this was hardened twice: first
    with an internal "must be logged in" check inside the function, then again at the
    database permission layer itself (`revoke all ... from public`), after testing revealed
    that Postgres's default "execute grants to PUBLIC" behavior meant the anon role could
    otherwise still *invoke* the function (just immediately fail inside it). Both layers are
    now confirmed independently — the internal check AND a real `permission denied for
    function` error if that check were ever accidentally removed.
  - An invalid `product_type_id` and a negative price are both rejected with clear messages.
  - The seller ID is never taken from client input at all (there's no such parameter in the
    function) — it's always read server-side from `auth.uid()`, which structurally rules out
    the "create a listing pretending to be someone else" attack rather than just blocking it.
- **A real, non-obvious bug was caught and fixed during this testing**: a generated column
  using `ST_SetSRID(ST_MakePoint(...))` plus a Postgres function call inside a `plpgsql`
  function body needs the calling role to have schema `USAGE` on `auth`/`storage`, which
  isn't something our migration files need to grant (Supabase's platform already sets this up
  for every project) — but it meant the *local test harness* needed it added explicitly to
  accurately reflect production. This is purely a testing-infrastructure note; nothing in the
  actual migration files needed to change because of it.

## What you still need to do

Run migrations `0009` through `0012` against your real Supabase project, same process as
before. Nothing else needs configuring in the Supabase dashboard for this prompt — the
`listing-photos` Storage bucket and its access policies are created entirely by migration
`0011`.

One thing worth testing manually once it's live and you have a real logged-in session: open
`/sell` on an actual phone (camera capture won't work meaningfully in a desktop browser
without a webcam) and confirm the full flow end-to-end — camera permission prompt, capturing
3+ photos, seeing the before/after compression sizes update, and the listing actually
appearing on `/my-listings` afterward with its photos visible.

---

# Tiered Home Feed & Category Browsing (Prompt 5)

## What was actually verified this time

Same local Postgres+PostGIS approach as Prompts 3 and 4 — migration `0013` was tested against
real data, not just read for syntax correctness, and this time it actually caught a genuine bug
before it could ship:

- **A real bug was found and fixed**: the original design assumed `p_min_radius_km = 0` (the
  default for a plain, non-"ring" query) would act as a harmless no-op. It doesn't — Postgres's
  `ST_DWithin(geog, point, 0)` returns `true` for a listing sitting at the *exact same
  coordinates* as the search center, so the original logic would have silently excluded any
  listing posted at exactly the location someone is browsing from. That's not a rare edge
  case — it's exactly what happens whenever a buyer's search center matches a seller's listing
  location precisely. This was caught by testing with a listing deliberately placed at the
  exact center point, confirmed broken, fixed (the exclusion is now skipped entirely when
  `p_min_radius_km <= 0` rather than relying on a degenerate distance check), and re-verified
  both that the fix works AND that genuine ring-exclusion (e.g., for Tier 2) still correctly
  excludes that same listing when it's actually being used as a lower bound.
- **The exact pagination-correctness scenario this design was built to avoid** was tested
  directly: 5 listings were placed within Tier 1's radius (more than a single page), and Tier
  2's query was confirmed to return only its own 2 ring listings, completely unaffected by
  Tier 1's count — proving the dedicated `p_min_radius_km` "ring" parameter actually solves the
  bug that a naive "fetch 10km then subtract Tier 1's IDs in application code" approach would
  have hit (Tier 2 would simply never appear on the first page in a dense area).
- **Tier 3's recency sort and graceful no-location fallback** were both verified: newer
  listings come first, listings within the exclusion radius are correctly left out, and
  passing `null` for both lat/lng (what happens before a visitor has set any location at all)
  correctly returns every active listing with no spatial filtering at all, rather than
  erroring or returning nothing.
- **Cover photos** were confirmed to populate correctly from a correlated subquery against
  `listing_photos`, and the full 13-migration sequence still applies cleanly to a brand-new
  database with zero manual steps.
- The Next.js side was verified the way it has been every prompt: `tsc --noEmit`, `eslint`,
  `next build`, and the Cloudflare/OpenNext build all pass clean, and both `/` and
  `/category/[slug]` were confirmed to server-render successfully (200 status, expected text
  present) even against this sandbox's placeholder Supabase credentials — since all the actual
  listing data fetching happens client-side after mount via `useActiveLocation()` and
  `supabase.rpc()`, the same boundary as every previous prompt applies: the *real* RPC
  responses, live category chip data, and the in-browser pagination/refresh interactions need
  a real Supabase project and a real browser to exercise end-to-end.

## What you still need to do

Run migration `0013` against your real Supabase project. Nothing new needs configuring in the
Supabase dashboard. Once it's live, a few things worth checking manually: that listings near
your test account's location actually appear under "In {locality}" rather than "Near..." or
"More across...", that the "Show more" buttons correctly fetch additional pages per section
without duplicating or skipping listings, and that the category chips correctly filter the feed
when clicked.

---

# Fuzzy Search with Meilisearch (Prompt 6)

## Getting Meilisearch running

This prompt assumes you'll self-host Meilisearch. The simplest way locally is Docker:

```bash
docker run -p 7700:7700 -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:v1.11 \
  meilisearch --master-key="YOUR_MASTER_KEY_HERE"
```

For production, the cheapest realistic options are: a small VPS (a $5-6/month droplet/instance
running the same Docker command, put behind a reverse proxy with TLS), or
[Meilisearch Cloud's free tier](https://www.meilisearch.com/cloud) if your data stays under its
free limits — either way, all you need afterward is the instance's URL and an API key.

Once you have a running instance:
1. Set `MEILISEARCH_HOST` and `MEILISEARCH_API_KEY` in `.env.local` (use the **admin/master**
   key here, not a restricted search-only key — this app never exposes any Meilisearch key to
   the browser, since every search request is proxied through our own `/api/search/*` routes).
2. Run the one-time index setup script:
   ```bash
   npm run search:setup
   ```
   This creates the `listings` index and configures searchable/filterable/sortable attributes,
   typo tolerance, and the starting synonym list (see `scripts/setup-meilisearch-index.mjs` —
   edit the `SYNONYMS` object there to add more over time as you observe real search behavior).
3. Existing listings won't backfill into the index automatically — this prompt's sync mechanism
   only fires on NEW mutations (create/edit/sold/delete) going forward. If you already have
   listings in Postgres before setting this up, write a small one-off script that loops over
   every active listing and calls `buildListingSearchDocument()` + `upsertListingDocument()` for
   each (both already exported from `lib/server/`) to backfill the index once.

## Why an API-route sync instead of a Postgres trigger

The prompt offered two options for keeping Meilisearch in sync: a Postgres trigger (using
Supabase's `pg_net` extension to call out to an Edge Function) or a simple API route called
after each mutation. This build uses the API-route approach (`lib/client/syncSearch.ts`, called
from `SellWizard`, `MyListingCard`, and `EditListingModal` right after each successful mutation)
for a concrete reason: `pg_net` isn't available as a standard Ubuntu package, so it couldn't be
tested in this sandbox the way every other piece of SQL in this project has been — and rather
than ship untested trigger logic, the simpler, fully-testable approach was chosen instead. If
you'd prefer the trigger-based approach in production (it has the advantage of catching
mutations from *any* source, including ones made directly in the Supabase dashboard, not just
this app's own UI), Supabase's `pg_net` extension is available out of the box on every Supabase
project — you'd write a trigger function calling `net.http_post()` against this same
`/api/search/sync` route (or directly against Meilisearch's REST API) and remove the client-side
`syncListingToSearch()` calls. The route itself doesn't care who calls it, as long as the caller
is authenticated.

## What was actually verified in this sandbox

A real Meilisearch server couldn't be installed here — there's no apt package for it, no Docker
available in this sandbox, and its GitHub release binaries are hosted on a domain
(`release-assets.githubusercontent.com`) outside this sandbox's network allowlist (confirmed
directly: the download redirects there and gets blocked with `403 host_not_allowed`). Compiling
it from source via `cargo` was considered and rejected as impractical here — Meilisearch is a
large Rust project and a from-source build would consume a large, uncertain amount of time for
uncertain payoff.

Instead, a **mock Meilisearch HTTP server** was built for testing purposes — not a fake/stubbed
test, but a real Node.js HTTP server implementing the exact endpoints and response shapes our
app calls, confirmed against the *actual installed SDK's bundled source code* (not assumed from
memory) for: request paths (`indexes/:uid/documents`, `indexes/:uid/search`, `tasks/:uid`,
etc.), the `Authorization: Bearer <key>` header format, and the `taskUid`/`uid` field-naming
distinction between an enqueued task and a completed one. This let every piece of *our own*
integration code be exercised for real, including running the actual production Next.js routes
(not test-only code) against this mock:

- **`buildListingSearchDocument()`** was tested against real local Postgres data (the same
  approach as Prompts 3-5): confirmed it correctly resolves a listing's leaf category name AND
  its top-level parent category name (e.g., "Bikes" → "Vehicles"), correctly flattens multiple
  `listing_attributes` rows into one searchable blob, correctly picks the lowest-`sort_order`
  photo as the cover image (not just the first one inserted), and correctly returns `null`
  instead of throwing for a listing ID that doesn't exist. **A real bug was caught here too**:
  Postgres's raw `numeric` columns can come back as strings depending on the database driver in
  use; the code now defensively coerces `price` with `Number()` regardless, which costs nothing
  and removes any ambiguity (Supabase's real PostgREST layer normally returns proper JSON
  numbers, but there's no reason not to guard against it anyway).
- **`upsertListingDocument()` and `deleteListingDocument()`** were run for real against the mock
  server: confirmed the document actually arrives and is stored, confirmed the `Authorization`
  header is correctly formed, and confirmed deletion actually removes it.
- **The real `/api/search/query` route** (the actual production route, run via `npm run dev`,
  not a copy) was tested end-to-end against the mock server with a realistic 3-document fixture
  (including one `sold` listing, specifically to test that it's correctly excluded): plain text
  matching, the `status = "active"` baseline filter, category filtering, price-range filtering,
  and `price:asc` sorting were all confirmed to return exactly the right subset/order. The
  **geo "ring" filter and distance sort** — the trickiest part, mirroring the Postgres
  `p_min_radius_km` design from Prompt 5 — was confirmed by inspecting the *exact filter string*
  the route sent to Meilisearch: `status = "active" AND _geoRadius(12.9229, 80.1275, 10000) AND
  NOT _geoRadius(12.9229, 80.1275, 3000)` with sort `_geoPoint(12.9229, 80.1275):asc` — valid
  Meilisearch geo-search syntax with correct km-to-meters conversion.
- The **`/api/search/sync` route's auth guard** was confirmed to reject unauthenticated calls
  with a clean `401` rather than crashing, and the **`/api/search/query` route's graceful
  degradation** was confirmed by killing the mock server mid-test and verifying the route still
  returns `200` with an empty result set rather than a `500` or a hang — consistent with every
  other external-service integration in this project (Supabase, Nominatim).
- The full Next.js app — type-check, lint, `next build`, and the Cloudflare/OpenNext build —
  all pass clean, and `/`, `/search?q=...`, and `/search` (no query) were all confirmed to
  render successfully via the real dev server.

## What genuinely could NOT be tested without a real Meilisearch instance

The mock server proves our *own* code sends and handles correctly-shaped requests — it does
**not** implement real fuzzy matching, so it can't verify Meilisearch's actual typo-tolerance or
synonym *behavior* (e.g., that "playstaton 5" genuinely matches "PlayStation 5" via real
Levenshtein-distance fuzzy matching, or that the synonym list actually expands "ps5" to match
"PlayStation 5" documents). Those are Meilisearch's own well-established, heavily-tested
features — the part actually at risk of a bug was always our own integration code (the filter
string construction, the document shaping, the sync triggers), which is what got tested. Once
you have a real instance running, it's worth manually confirming: typo tolerance with a couple
of real misspelled queries, that the synonym list in `scripts/setup-meilisearch-index.mjs`
behaves as expected, and that the "Did you mean" suggestion (which has no native Meilisearch API
to lean on — see the comment in `components/search/SearchResults.tsx` for the reasoning behind
the practical approximation used) feels right in practice.
