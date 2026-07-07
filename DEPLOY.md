# Deployment Guide

This guide walks you through deploying the marketplace app from a local repository to production
on **Cloudflare Pages** with a **Hostinger domain**, **Supabase** for the database, **Meilisearch**
for search, and **Firebase** for push notifications.

Estimated time: 2–4 hours for a first deployment.

---

## Prerequisites

- A GitHub account with the project already pushed to a repository
- A Cloudflare account (free plan is fine)
- A Supabase account (free plan: 500 MB DB, 1 GB storage, 50,000 MAU)
- A domain purchased on Hostinger (or any registrar)
- A Google/Firebase account (free Spark plan is sufficient for FCM)
- A Resend account for transactional email (free: 3,000 emails/month)
- Node.js 20+ installed locally for running migrations

---

## Step 1 — Supabase: create and configure your project

### 1.1 Create the project

1. Log in to [app.supabase.com](https://app.supabase.com) and click **New project**.
2. Choose a region close to your target users (e.g., `ap-south-1` for India).
3. Set a strong database password and store it somewhere safe.
4. Wait for provisioning (~2 minutes).

### 1.2 Enable PostGIS

1. Go to **Database → Extensions** in the Supabase dashboard.
2. Search for `postgis` and toggle it **on**.
   - This enables the `geography` column type and the `ST_Point()` / `ST_DWithin()` functions
     used by the nearby-listings queries.

### 1.3 Run the migrations

Run all 25 migration files in order against your Supabase project.
The simplest way is to paste each file's contents into **SQL Editor → New query** and run it.

Alternatively, install the Supabase CLI and run:

```bash
# Install the Supabase CLI if you haven't already
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations in order
supabase db push
```

After running all 25 migrations:
- Check **Database → Tables** — you should see ~20 tables including `listings`, `conversations`,
  `messages`, `notifications`, `reports`, `audit_log`, etc.
- Check **Database → Extensions** — `postgis` should be listed as enabled.

### 1.4 Verify RLS is active

1. Go to **Database → Tables** and click any table (e.g., `listings`).
2. The "Row Level Security" toggle should be **enabled** (green).
   - If any table shows RLS as disabled, the migrations didn't complete — re-run the affected file.

### 1.5 Set up Supabase Auth — phone OTP

1. Go to **Authentication → Providers → Phone**.
2. Toggle phone auth **on**.
3. Under **SMS provider**, choose **Twilio** (or MessageBird / Vonage).
4. Enter your Twilio Account SID, Auth Token, and a Twilio phone number or Messaging Service SID.
   - Twilio free trial gives ~$15 credit, enough for initial testing.
5. Under **Authentication → URL Configuration**, set:
   - **Site URL**: `https://yourdomain.com`
   - **Redirect URLs**: `https://yourdomain.com/**` and `http://localhost:3000/**`

### 1.6 Set up Storage buckets

The migrations create the buckets automatically (`listing-photos`, `profile-photos`,
`chat-images`, `verif-docs`). Verify them under **Storage** in the dashboard.

### 1.7 Enable Realtime on the messages table

1. Go to **Database → Replication**.
2. Under **Source**, click **0 tables** (or however many are already enabled).
3. Toggle on: `messages`, `notifications`.
   - These are the two tables that have Supabase Realtime subscriptions in the app.

### 1.8 Note your API keys

From **Project Settings → API**, copy:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret)

---

## Step 2 — Meilisearch: deploy the search engine

You have two options:

### Option A: Meilisearch Cloud (simplest, free tier available)

1. Go to [cloud.meilisearch.com](https://cloud.meilisearch.com) and create a free project.
2. Copy the **Host URL** and **Default API Key**.
3. Skip to Step 2.4.

### Option B: Self-host on a VPS (more control, ~$5–6/month)

1. Get a small VPS from DigitalOcean, Hetzner, or Linode (1 vCPU / 1 GB RAM is enough).
2. SSH into the server and install Docker:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Run Meilisearch:
   ```bash
   docker run -d \
     --name meilisearch \
     --restart unless-stopped \
     -p 7700:7700 \
     -v /opt/meili_data:/meili_data \
     -e MEILI_MASTER_KEY="your_long_random_master_key_here" \
     getmeili/meilisearch:v1.11
   ```
4. Point a subdomain (e.g., `search.yourdomain.com`) at the VPS IP via your DNS provider.
5. Set up a reverse proxy (Caddy is easiest) for HTTPS:
   ```bash
   apt install caddy
   # In /etc/caddy/Caddyfile:
   # search.yourdomain.com {
   #   reverse_proxy localhost:7700
   # }
   caddy reload
   ```

### 2.4 Configure the search index

Once Meilisearch is running, run the one-time index setup script locally:

```bash
# Set the env vars first
export MEILISEARCH_HOST=https://search.yourdomain.com
export MEILISEARCH_API_KEY=your_master_key

# Run the setup script
npm run search:setup
```

This creates the `listings` index and configures searchable/filterable attributes,
typo tolerance, geo-search, and the initial synonym list.

---

## Step 3 — Firebase: set up Cloud Messaging for push notifications

1. Go to [console.firebase.google.com](https://console.firebase.google.com).
2. Click **Add project** and follow the prompts.
3. In your project, click **Add app** → **Web** (the `</>` icon).
4. Register the app and copy the `firebaseConfig` object — each field maps to a
   `NEXT_PUBLIC_FIREBASE_*` env var (see `.env.example`).
5. Go to **Project Settings → Cloud Messaging → Web Push certificates**.
6. Click **Generate key pair** and copy the **Key pair** (VAPID public key) →
   `NEXT_PUBLIC_FIREBASE_VAPID_KEY`.
7. Go to **Project Settings → Service accounts → Generate new private key**.
8. Download the JSON file. Paste the entire contents (as a single-line JSON string)
   into `FIREBASE_SERVICE_ACCOUNT_JSON`.

Update `public/firebase-messaging-sw.js` with your real config values — the service worker
uses `self.__FIREBASE_*__` placeholders that you replace with the actual values:

```javascript
// In public/firebase-messaging-sw.js, replace the placeholder references:
firebase.initializeApp({
  apiKey: "YOUR_REAL_API_KEY",          // not self.__FIREBASE_API_KEY__
  authDomain: "your-project.firebaseapp.com",
  // ... rest of your config
});
```

> **Why not env vars in the service worker?** Service workers are plain JS files served as
> static assets — Next.js's env substitution doesn't run on them. Hardcode the Firebase
> config values directly (they're all public-safe).

---

## Step 4 — Resend: configure transactional email

1. Sign up at [resend.com](https://resend.com).
2. Go to **Domains → Add domain** and enter your domain (e.g., `yourdomain.com`).
3. Add the DNS records Resend shows you (SPF, DKIM, DMARC) to Cloudflare DNS.
4. Once verified, you can send from any `@yourdomain.com` address.
5. Go to **API Keys → Create API key** and copy it → `RESEND_API_KEY`.
6. Update `EMAIL_FROM` in your env vars to match your verified sender (e.g., `noreply@yourdomain.com`).

While testing (before domain verification), use `onboarding@resend.dev` as the `EMAIL_FROM`
value — Resend allows this sandbox sender address for new accounts.

---

## Step 5 — Cloudflare Pages: deploy the Next.js app

### 5.1 Push your code to GitHub

```bash
git add -A
git commit -m "chore: ready for deployment"
git push origin main
```

### 5.2 Create a Cloudflare Pages project

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
2. Go to **Workers & Pages → Create application → Pages → Connect to Git**.
3. Select your GitHub repository and click **Begin setup**.
4. Configure the build settings:
   - **Build command**: `npx opennextjs-cloudflare build`
   - **Build output directory**: `.open-next`
   - **Node.js version**: `20` (set in Environment Variables → `NODE_VERSION=20`)

### 5.3 Add environment variables

In Cloudflare Pages → your project → **Settings → Environment variables**:

Add **all** variables from `.env.example`. For each one:
- **Plain text variables** (safe for build logs): all `NEXT_PUBLIC_*` vars
- **Encrypted secrets** (toggle "Encrypt"): everything else

Set variables for **both Production and Preview** environments.

```
NEXT_PUBLIC_SUPABASE_URL          = https://your-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     = eyJ...
NEXT_PUBLIC_APP_URL               = https://yourdomain.com
NEXT_PUBLIC_FIREBASE_API_KEY      = AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN  = your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID   = your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 123456789
NEXT_PUBLIC_FIREBASE_APP_ID       = 1:...:web:...
NEXT_PUBLIC_FIREBASE_VAPID_KEY    = BK...
MEILISEARCH_HOST                  = https://search.yourdomain.com
EMAIL_FROM                        = noreply@yourdomain.com
NOMINATIM_CONTACT_EMAIL           = your@email.com

# Encrypted secrets:
SUPABASE_SERVICE_ROLE_KEY         = eyJ...
MEILISEARCH_API_KEY               = your_master_key
FIREBASE_SERVICE_ACCOUNT_JSON     = {"type":"service_account",...}
RESEND_API_KEY                    = re_...
CRON_SECRET                       = your_long_random_secret
```

### 5.4 Deploy

Click **Save and deploy**. The first build takes 3–5 minutes.

Once it's green, Cloudflare gives you a `*.pages.dev` preview URL — open it and confirm
the home page loads and the login form appears.

### 5.5 Set up the Cloudflare Cron Trigger

1. Go to **Workers & Pages → your project → Settings → Functions → Cron Triggers**.
2. Add a trigger: `0 * * * *` (every hour on the hour).
3. Set the trigger to call your cron handler. Since opennextjs-cloudflare routes everything
   through a fetch handler, configure the cron to **HTTP POST** to your production domain:
   - URL: `https://yourdomain.com/api/cron/notifications`
   - Method: `POST`
   - Headers: `x-cron-secret: your_cron_secret_value`

   You can do this by adding a small Cloudflare Worker that fires the POST:

   ```javascript
   // In Cloudflare Dashboard → Workers → Create Worker
   export default {
     async scheduled(event, env, ctx) {
       await fetch("https://yourdomain.com/api/cron/notifications", {
         method: "POST",
         headers: { "x-cron-secret": env.CRON_SECRET },
       });
     }
   };
   ```

   Add `CRON_SECRET` as an environment variable on the Worker too.

---

## Step 6 — Hostinger domain: point DNS to Cloudflare

### 6.1 Purchase the domain

1. Go to [hostinger.com](https://hostinger.com) and search for your domain.
2. Complete the purchase (domains typically cost $10–15/year for a `.com`).

### 6.2 Add the domain to Cloudflare

1. In Cloudflare dashboard, click **Add a Site**.
2. Enter your domain name and click **Continue**.
3. Select the **Free** plan and click **Continue**.
4. Cloudflare scans your existing DNS records — click **Continue** on the records page.
5. Cloudflare shows you two nameservers, e.g.:
   - `alice.ns.cloudflare.com`
   - `bob.ns.cloudflare.com`

### 6.3 Update nameservers on Hostinger

1. In your Hostinger dashboard, go to **Domains → your domain → DNS / Nameservers**.
2. Click **Change nameservers** and enter the two Cloudflare nameservers from Step 6.2.
3. Save. DNS propagation takes 1–48 hours (usually under 30 minutes).
4. Back in Cloudflare, click **Done, check nameservers** — it will eventually show "Active".

### 6.4 Attach the domain to your Cloudflare Pages project

1. Go to **Workers & Pages → your Pages project → Custom domains**.
2. Click **Set up a custom domain** and enter `yourdomain.com` (and optionally `www.yourdomain.com`).
3. Cloudflare adds a CNAME record automatically and issues an SSL certificate within minutes.
4. Once the domain shows **Active** here, your site is live on the custom domain.

### 6.5 Update Supabase redirect URLs

Now that you have your final domain, update the Supabase Auth redirect URLs:
1. **Authentication → URL Configuration → Site URL**: `https://yourdomain.com`
2. **Authentication → URL Configuration → Redirect URLs**: add `https://yourdomain.com/**`

---

## Step 7 — Make yourself an admin

After your first login on the production site, run this in the Supabase SQL Editor
(replace the email/phone with your account's identifier):

```sql
-- Find your user ID (look for your phone number)
SELECT id, name FROM public.profiles LIMIT 20;

-- Set your account as admin (replace the UUID below)
UPDATE public.profiles
SET is_admin = true
WHERE id = 'your-user-uuid-here';
```

You should now be able to visit `https://yourdomain.com/admin` and see the dashboard.

---

## Step 8 — Seed the Meilisearch index with existing listings

If you already have listings in Supabase before setting up Meilisearch, run a one-time
backfill from the Supabase SQL Editor:

```sql
-- This outputs listing IDs you can loop over in a script to call /api/search/sync
SELECT id FROM public.listings WHERE status = 'active';
```

Or write a short script using the service-role key:

```javascript
// scripts/backfill-search.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: listings } = await supabase.from("listings").select("id").eq("status", "active");

for (const { id } of listings) {
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/search/sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer YOUR_ANON_KEY` },
    body: JSON.stringify({ listingId: id }),
  });
  console.log("synced", id);
}
```

---

## Post-Launch Verification Checklist

Work through this list after deployment. Fix anything that fails before announcing the launch.

### Auth & Onboarding

- [ ] **OTP login on a real phone**: enter a real mobile number, receive the SMS within 30
      seconds, enter the code, and land on the profile onboarding screen (new accounts) or
      home feed (returning accounts).
- [ ] **New-user onboarding**: after the first login, confirm the flow is
      `profile form → location screen → home feed`.
- [ ] **Returning user**: log out and back in — should skip onboarding and go straight to
      the feed.

### Camera & Photo Compression

- [ ] **Android Chrome**: go to `/sell`, tap "Open camera", take a photo, confirm the
      preview appears and the "Before/After" compression sizes are shown.
- [ ] **iOS Safari**: same test. Note: iOS requires `capture="environment"` on the file
      input — confirm the rear camera opens by default for listing photos.
- [ ] **Compression quality**: zoom in on a compressed photo in the listing detail view.
      It should look sharp at the sizes used (cover thumbnail, detail carousel).

### Location & Feed

- [ ] **Location permission**: on first load, the browser prompts for location access.
      Grant it and confirm Tier 1 listings appear under "In [your locality]".
- [ ] **Location switcher**: change the active location to a different city and confirm
      the feed and Tier 1 section header update correctly.
- [ ] **Feed tiers**: if you have listings in your database, confirm they appear in the
      correct tier based on distance from the active location.

### Search

- [ ] **Basic search**: search for a listing title that exists and confirm it appears in results.
- [ ] **Typo tolerance**: search for a misspelled version (e.g., "playstaton" → "PlayStation")
      and confirm Meilisearch's fuzzy matching returns the correct result.
- [ ] **Filter**: apply a price range filter and confirm results are constrained correctly.
- [ ] **Save search**: save a search and confirm the row appears in the `saved_searches` table
      in Supabase (SQL Editor: `SELECT * FROM saved_searches LIMIT 5`).

### Listing Detail & Chat

- [ ] **Listing card → detail**: click a listing card on the home feed and confirm navigation
      to `/listing/[id]` with the carousel, attributes, seller profile, and map visible.
- [ ] **Map pin**: the map should show a pin slightly offset from the declared location
      (privacy fuzzing) with a 150m circle.
- [ ] **Chat flow**: click "Chat with Seller" on a listing you don't own, confirm a conversation
      is created and you land on the chat thread.
- [ ] **Realtime**: open the conversation in two browser tabs (one as buyer, one as seller in
      an incognito window) and send a message — confirm it appears instantly in both tabs.

### Flagged Listings Stay Hidden

- [ ] In the Supabase SQL Editor, find an active listing and manually set its status to `flagged`:
      ```sql
      UPDATE listings SET status = 'flagged' WHERE id = 'your-listing-id';
      ```
- [ ] Refresh the home feed — the listing should **not** appear.
- [ ] Search for the listing's title — it should **not** appear in results.
- [ ] As an admin, go to `/admin/listings` — the listing **should** appear in the queue.
- [ ] Click Approve — the listing should reappear in the feed and search within seconds.

### Domain & HTTPS

- [ ] `https://yourdomain.com` loads the home page with a valid SSL certificate (padlock icon).
- [ ] `http://yourdomain.com` redirects to `https://` (Cloudflare enforces this automatically).
- [ ] `www.yourdomain.com` redirects to the apex domain (set up a Page Rule in Cloudflare if needed).
- [ ] Open Graph preview: paste `https://yourdomain.com/listing/[any-active-id]` into
      [opengraph.xyz](https://www.opengraph.xyz/) and confirm the listing title, price, and
      cover photo appear in the preview card.

### Notifications

- [ ] **Push permission**: on the chat page, send a message and confirm the browser shows a
      notification permission prompt.
- [ ] **In-app bell**: create a test notification directly in Supabase:
      ```sql
      INSERT INTO notifications (user_id, type, title, body)
      VALUES ('your-user-id', 'welcome', 'Test 🔔', 'This is a test notification.');
      ```
      Refresh the page — the bell icon should show an unread badge immediately (Realtime).

### Admin Dashboard

- [ ] Log in as your admin account and visit `/admin` — confirm the analytics numbers match
      the Supabase table counts (run `SELECT COUNT(*) FROM profiles` to cross-check).
- [ ] Try accessing `/admin` in an incognito window (not logged in) — should redirect to `/`.
- [ ] Try accessing `/admin` logged in as a non-admin account — should redirect to `/`.
