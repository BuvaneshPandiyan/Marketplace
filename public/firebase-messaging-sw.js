// This file is the Firebase Cloud Messaging service worker. It must be served at the root path
// (/firebase-messaging-sw.js) so Firebase can register it automatically when the app calls
// getToken(). Place this file in the Next.js `public/` folder — Next.js serves everything in
// public/ at the root of the domain with no transformations.

// Import the Firebase app and messaging SDKs from the CDN (service workers can't use npm imports)
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Initialize the Firebase app inside this service worker — the config values here must match
// exactly what's in your Firebase project settings (Project Overview → App settings → SDK config)
firebase.initializeApp({
  apiKey: "AIzaSyAoapQG-mQJ974Pf23j_rEbtL4RumgAaVk",
  authDomain: "marketplace-bfe4c.firebaseapp.com",
  projectId: "marketplace-bfe4c",
  storageBucket: "marketplace-bfe4c.firebasestorage.app",
  messagingSenderId: "173258140030",
  appId: "1:173258140030:web:44e8f39942e7f4a3f6ab2f",
});

// Get the messaging instance so we can listen for background messages
const messaging = firebase.messaging();

// Handle messages received while the browser tab is in the background or closed.
// When the tab is open and in focus, the foreground handler (in usePushNotifications.ts)
// will display the notification instead — this handler only fires when the tab can't.
messaging.onBackgroundMessage((payload) => {
  // Extract the notification fields from the FCM payload
  const { title, body } = payload.notification ?? {};
  // Show a native browser notification (requires notification permission, which the app
  // requests contextually after the user's first chat message)
  self.registration.showNotification(title ?? "New notification", {
    // The notification body text
    body: body ?? "",
    // The icon to show in the notification — use the app's logo from /public/
    icon: "/icon-192.png",
    // The badge (small monochrome icon shown in the status bar on Android)
    badge: "/icon-192.png",
    // Attach any extra data from the FCM payload (e.g., a deep-link URL) so we can use
    // it in the notificationclick handler below
    data: payload.data,
  });
});

// Listen for the user tapping a displayed notification — open or focus the relevant page
self.addEventListener("notificationclick", (event) => {
  // Dismiss the notification itself
  event.notification.close();
  // The deep-link URL, if one was attached to the notification's data payload
  const link = event.notification.data?.link;
  // If there's a link, navigate to it; otherwise just focus the app's main window
  event.waitUntil(
    clients
      // Find all open windows/tabs belonging to this origin
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If an existing tab is already open, focus it and navigate there
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if (link) client.navigate(link);
            return;
          }
        }
        // No existing tab — open a new one
        if (clients.openWindow) {
          clients.openWindow(link ?? "/");
        }
      })
  );
});
