// This module is SERVER-ONLY — it imports the Supabase service-role key, which must never
// reach the browser. Only import it from API routes or Server Components.

// Import the Supabase admin client creator (uses the service-role key, bypasses RLS)
import { createClient } from "@supabase/supabase-js";
// Import the notification type enum
import type { NotificationType } from "@/types";

// Define the shape of a notification to create
export type CreateNotificationPayload = {
  // Who this notification is for
  userId: string;
  // What kind of event triggered it
  type: NotificationType;
  // Bold heading text
  title: string;
  // Secondary body text
  body?: string;
  // An optional deep-link URL
  link?: string;
};

// Create a single Supabase admin client using the service-role key — this bypasses all RLS
// so it can INSERT into notifications (which has no client INSERT policy by design)
function getAdminClient() {
  return createClient(
    // The Supabase project URL — required
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // The service-role key — NEVER expose this to the browser or commit to git
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    // Disable cookie-based auth — the service role key is self-authorizing
    { auth: { persistSession: false } }
  );
}

// Define and export the main notification function — call this from any server-side code
export async function createNotification(payload: CreateNotificationPayload): Promise<void> {
  const supabase = getAdminClient();

  // 1. Insert an in-app notification row — this also fires the Realtime event that the bell
  //    subscribes to, so the user sees it instantly without polling
  const { error: insertError } = await supabase.from("notifications").insert({
    user_id: payload.userId,
    type: payload.type,
    title: payload.title,
    body: payload.body ?? "",
    link: payload.link ?? null,
    read: false,
  });
  if (insertError) {
    // Log the error server-side but don't throw — a failed notification write should never
    // break the operation that triggered it (e.g., marking a listing sold)
    console.error("[createNotification] insert error:", insertError.message);
  }

  // 2. Try to send a push notification via FCM if credentials are configured
  await sendFCMPush(payload);
}

// Internal helper that sends a push notification to every FCM token registered for this user
async function sendFCMPush(payload: CreateNotificationPayload): Promise<void> {
  // FCM requires a service account — if the env var isn't set, skip silently
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) return;

  const supabase = getAdminClient();

  // Fetch all FCM tokens registered for this user
  const { data: tokenRows, error: tokenError } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", payload.userId);
  if (tokenError || !tokenRows || tokenRows.length === 0) return;

  // Parse the Firebase service account JSON — this comes from Firebase console →
  // Project settings → Service accounts → Generate new private key
  let serviceAccount: { client_email: string; private_key: string; project_id: string };
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    // Malformed JSON — log and bail
    console.error("[sendFCMPush] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
    return;
  }

  // Get an OAuth2 access token using the service account (required by FCM HTTP v1)
  const accessToken = await getFCMAccessToken(serviceAccount);
  if (!accessToken) return;

  // Send the push to every registered token in parallel
  await Promise.all(
    tokenRows.map(async (row) => {
      try {
        // Call the FCM HTTP v1 send endpoint
        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: "POST",
            headers: {
              // OAuth2 bearer token for authentication
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: {
                // The specific device token to send to
                token: row.token,
                notification: {
                  // The notification title and body shown in the OS notification tray
                  title: payload.title,
                  body: payload.body ?? "",
                },
                // Extra data carried through to the service worker's onBackgroundMessage handler
                data: payload.link ? { link: payload.link } : {},
              },
            }),
          }
        );
        // If the token is invalid, remove it from the database so we don't try again
        if (response.status === 404) {
          await supabase.from("push_tokens").delete().eq("token", row.token);
        }
      } catch (err) {
        // Log individual send errors but don't let one failure stop the others
        console.error("[sendFCMPush] send error:", err);
      }
    })
  );
}

// Get an OAuth2 access token for the FCM HTTP v1 API using a Firebase service account JWT
async function getFCMAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string | null> {
  try {
    // Build a JWT claim set for the OAuth2 scope we need
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    };
    // Encode the JWT header and payload as base64url strings
    const encoder = new TextEncoder();
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const body = btoa(JSON.stringify(claim)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    // Import the RSA private key from the service account's PEM string
    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      // Convert the PEM string to a raw DER ArrayBuffer
      pemToDer(serviceAccount.private_key),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
    // Sign the JWT
    const signatureBuffer = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, encoder.encode(`${header}.${body}`));
    const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const jwt = `${header}.${body}.${signature}`;
    // Exchange the JWT for a short-lived OAuth2 access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    });
    const tokenData = await tokenResponse.json();
    return (tokenData as { access_token?: string }).access_token ?? null;
  } catch (err) {
    console.error("[getFCMAccessToken] error:", err);
    return null;
  }
}

// Convert a PEM-encoded private key to a raw DER ArrayBuffer for use with WebCrypto
function pemToDer(pem: string): ArrayBuffer {
  // Strip the PEM header/footer lines and any whitespace/newlines
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  // Decode the base64 string to a binary string
  const binaryString = atob(b64);
  // Convert the binary string to a Uint8Array, then return its underlying ArrayBuffer
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
