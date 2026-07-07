// This hook manages Firebase Cloud Messaging registration — it's a plain function the chat
// panel calls manually after the user's first send, not an auto-firing useEffect on mount.

// Import our browser Supabase client creator for the token upsert
import { createClient } from "@/lib/supabase/client";

// Define the shape of what this hook returns — a single "request push" function
export type UsePushNotificationsReturn = {
  // Call this function at the right moment (after first chat send) to ask for permission
  requestPushPermission: () => Promise<void>;
};

// The VAPID public key for your Firebase project — find this in the Firebase console under
// Project Settings → Cloud Messaging → Web Push certificates → Key pair
// This is a public key; it's safe to expose client-side.
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

// Define and export the hook
export function usePushNotifications(): UsePushNotificationsReturn {
  // Define the function that the caller will invoke at the right moment
  async function requestPushPermission() {
    // If the browser doesn't support notifications at all, bail silently — never crash
    if (typeof window === "undefined" || !("Notification" in window)) return;
    // If the user has already denied or granted, don't re-prompt (respect their decision)
    if (Notification.permission === "denied") return;
    if (Notification.permission === "granted") {
      // They already said yes in a previous session — just refresh the token in case it changed
      await registerToken();
      return;
    }
    // Ask the user for push permission — this shows the browser's native permission dialog
    const permission = await Notification.requestPermission();
    // Only register a token if they actually said yes
    if (permission === "granted") {
      await registerToken();
    }
  }

  // Internal function that does the actual Firebase initialization and token storage
  async function registerToken() {
    try {
      // Dynamically import Firebase only in the browser (it uses window/navigator internally)
      const { initializeApp, getApps } = await import("firebase/app");
      // Import the messaging module and its token getter
      const { getMessaging, getToken } = await import("firebase/messaging");

      // Read Firebase config from environment variables (set these in .env.local)
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      // Initialize the Firebase app if it hasn't been done yet in this session
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      // Get the FCM messaging instance for this app
      const messaging = getMessaging(app);

      // Get the FCM registration token for this browser, using the VAPID key for validation
      const token = await getToken(messaging, {
        // The VAPID public key links this token to our Firebase project's push certificate
        vapidKey: VAPID_KEY,
        // Register the service worker that handles background messages
        serviceWorkerRegistration: await navigator.serviceWorker.register("/firebase-messaging-sw.js"),
      });

      // If no token came back (shouldn't happen after permission granted, but guard anyway)
      if (!token) return;

      // Create a browser Supabase client to store the token
      const supabase = createClient();
      // Get the current user so we can link the token to their account
      const { data: { user } } = await supabase.auth.getUser();
      // Don't try to store a token if nobody is logged in
      if (!user) return;

      // Upsert the token — if this exact (user, token) pair already exists, update created_at
      // so we know the token is still active and recently verified
      await supabase.from("push_tokens").upsert(
        // The row to insert or update
        { user_id: user.id, token },
        // On conflict (same user + token already in the table), just touch created_at
        { onConflict: "user_id,token" }
      );
    } catch {
      // If Firebase isn't configured (no env vars), or anything else goes wrong, fail silently
      // — push notifications are enhancement-only and must never break the core chat flow
    }
  }

  // Return the single public function
  return { requestPushPermission };
}
