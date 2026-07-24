# Building bazar.in as a mobile app (Capacitor)

Follow this top to bottom. The code side is already done — this is the setup
around it.

---

## The one thing to understand first

Capacitor normally bundles a folder of static HTML/JS into the app. **This app
cannot do that.** It has 16 API routes, middleware, and 15 files using the
Supabase *server* client — all of which need a running server, and there is no
Node process inside a phone. A static export would simply fail to build.

So the app is a **native shell around your live deployment**. Rendering keeps
happening on your server exactly as it does in a browser.

| | |
| --- | --- |
| ✅ | Everything already works — auth, chat, realtime, RLS, caching |
| ✅ | Shipping a web fix updates the app **instantly**, no store review |
| ✅ | Store submission only needed when native code/plugins change |
| ❌ | No offline mode (fine — a marketplace needs live listings anyway) |
| ⚠️ | Apple rejects "just a website in a wrapper" — see Part 5 |

---

## What's already done

| File | Purpose |
| --- | --- |
| `capacitor.config.ts` | Points the app at your live URL |
| `lib/client/geolocation.ts` | Native GPS, falls back to browser |
| `lib/client/usePushNotifications.ts` | Native push token → same `push_tokens` table |
| `package.json` | Plugins + `cap:*` scripts |

Verified: `next build` still passes with all of it in place.

---

# PART 1 — Point the app at your site

Open `capacitor.config.ts` and check this line:

```ts
server: {
  url: "https://marketplace-lilac-nu.vercel.app",   // ← your deployed site
}
```

**It must be HTTPS.** Android blocks cleartext traffic by default, and the
camera and geolocation APIs refuse to run on an insecure origin — which would
break listing creation entirely.

If you later move to a custom domain, change this and re-submit to the stores
(it's baked into the native build).

Also confirm the app identifier:

```ts
appId: "in.bazar.app",
```

⚠️ **This is permanent once published.** The stores key your app to this string;
changing it later means shipping a brand-new app and losing your reviews and
installs.

---

# PART 2 — Install and add platforms

```bash
npm install
```

Then add the platforms you want:

```bash
# Android — works on Windows, Mac or Linux
npm install @capacitor/android
npx cap add android

# iOS — requires a Mac
npm install @capacitor/ios
npx cap add ios
```

Then sync (copies config and plugins into the native projects):

```bash
npm run cap:sync
```

**Re-run `npm run cap:sync` after any plugin change or config edit.**

---

# PART 3 — Native permissions

The OS blocks camera, location and notifications unless you declare *why* you
need them. Missing entries cause silent failures — or an App Store rejection.

### Android — `android/app/src/main/AndroidManifest.xml`

Add inside `<manifest>`, above `<application>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

### iOS — `ios/App/App/Info.plist`

Add inside the top-level `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>bazar.in uses your camera to take live photos of items you list, which helps buyers trust that the item is real.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>bazar.in uses your location to show listings near you and to record where an item is located.</string>
```

Write these as real explanations. Apple reads them, and a vague string like
"needs camera" is a common rejection reason.

---

# PART 4 — Push notifications

Your server already sends via **FCM v1**, and the native token goes into the
**same `push_tokens` table**. So there are **no backend changes** — only native
config.

### Android

1. Firebase console → your project → **Add app** → **Android**
2. Package name: **`in.bazar.app`** (must match `appId` exactly)
3. Download `google-services.json`
4. Put it at: `android/app/google-services.json`

### iOS

1. Firebase console → **Add app** → **iOS**, bundle ID `in.bazar.app`
2. Download `GoogleService-Info.plist`
3. Add it to `ios/App/App/` **via Xcode** (drag into the project so it's
   registered — copying the file in Finder alone does not work)
4. In the Apple Developer portal, create an **APNs key** and upload it to
   Firebase → Project Settings → Cloud Messaging
5. In Xcode → **Signing & Capabilities** → add **Push Notifications** and
   **Background Modes → Remote notifications**

---

# PART 5 — Avoiding an App Store rejection

Apple's **guideline 4.2** rejects apps that are only a repackaged website. This
is the single most likely reason a submission gets bounced.

You already have three genuine native integrations, and they're the argument:

| Native feature | Why it isn't just a website |
| --- | --- |
| **Camera** | Live capture for listing photos — the anti-fraud core |
| **Location** | Real GPS fix, recorded against the listing |
| **Push** | OS-level delivery when the app is closed |

In the review notes, say plainly what the app does and that these use device
hardware. Include a **test account with a phone number that can receive OTPs**
— reviewers cannot get past a login wall without one, and that alone causes
rejections.

---

# PART 6 — Build and run

### Android

```bash
npm run cap:android          # opens Android Studio
```

Plug in a phone with USB debugging on (or start an emulator) and press ▶ Run.

To publish:
1. **Build → Generate Signed Bundle / APK** → create a keystore
2. ⚠️ **Back up that keystore file and its password.** Lose it and you can never
   update the app again — you'd have to publish a new listing from scratch.
3. Google Play Console → $25 one-time → upload the `.aab`

### iOS (Mac only)

```bash
npm run cap:ios              # opens Xcode
```

Xcode → **Product → Archive** → upload to App Store Connect. $99/year.

No Mac? **Ionic Appflow** or **Capgo** offer cloud iOS builds.

---

# PART 7 — Test on a real device

- [ ] App opens and loads the site
- [ ] Phone OTP login works end to end
- [ ] **Post a listing** — camera opens, photo captures, location is recorded
- [ ] Listing appears at the correct location
- [ ] Chat sends and receives in real time
- [ ] **Push:** grant permission, close the app entirely, message from another
      account → notification arrives
- [ ] Back button behaves (Android)
- [ ] Nothing sits under the notch or home indicator (iOS)

---

# Day-to-day after launch

**Web changes → just deploy.** The app loads your live site, so a fix is live
immediately with no store review. This is the big advantage of this approach.

**Re-submit to the stores only when you:**
- change `capacitor.config.ts` (including the URL)
- add or update a native plugin
- change the app icon, name or splash

---

# Troubleshooting

| Symptom | Cause |
| --- | --- |
| White screen on launch | `server.url` wrong/unreachable, or not HTTPS |
| Camera does nothing | Missing permission entries (Part 3); check the site is HTTPS |
| Location always fails | Missing `NSLocationWhenInUse…` / Android permissions |
| Push never arrives | `google-services.json` / `GoogleService-Info.plist` missing or package name mismatch |
| Login loop | Cookies blocked — confirm the site is HTTPS and not third-party-cookie dependent |
| Plugin "not implemented" | Forgot `npm run cap:sync` after installing it |

---

# Honest limits

I can write and typecheck the integration code, and I have — the web build
passes with all of it in place. But **I cannot run a native build**: no Android
Studio, no Xcode, no device. Parts 2–7 have to be done and verified by you.

The most likely place to hit trouble is **push on iOS** — it needs the APNs key,
the Firebase plist, and the Xcode capabilities all lined up, and it fails
silently if any one is missing. Test that on a real device, not the simulator
(the iOS simulator cannot receive push at all).