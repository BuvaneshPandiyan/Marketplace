// Define the shape of a successful geolocation result we'll return
export type GeolocationCoords = {
  // The detected latitude
  lat: number;
  // The detected longitude
  lng: number;
};

// Define a custom error type so calling code can distinguish "permission denied" from other failures
export class GeolocationError extends Error {
  // Whether this failure was specifically because the user denied permission
  public readonly isPermissionDenied: boolean;

  // The constructor accepts a message and whether this was a permission-denial case
  constructor(message: string, isPermissionDenied: boolean) {
    // Call the base Error constructor with our message
    super(message);
    // Store whether this was a permission-denial case
    this.isPermissionDenied = isPermissionDenied;
    // Set a proper error name for easier debugging in stack traces
    this.name = "GeolocationError";
  }
}

/**
 * Location, using the native plugin inside the app and the browser API on web.
 *
 * Inside a WebView the browser geolocation API is unreliable — it can be
 * blocked by the host app's own permission state, and gives no way to request
 * OS permission properly. The native plugin talks to the platform directly, so
 * it triggers the real system prompt and returns a GPS fix rather than a coarse
 * network estimate.
 *
 * The accuracy matters here specifically: a listing's coordinates are captured
 * at creation and compared against the photo's EXIF GPS, so a vague fix turns
 * into false "location mismatch" flags on perfectly genuine listings.
 */
export async function getCurrentPositionAsync(): Promise<GeolocationCoords> {
  const { Capacitor } = await import("@capacitor/core");

  if (Capacitor.isNativePlatform()) {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");

      // Ask explicitly: on iOS the OS prompt only appears when requested, so
      // without this the first call just fails.
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== "granted") {
        const asked = await Geolocation.requestPermissions();
        if (asked.location !== "granted") {
          throw new GeolocationError(
            "Location permission is required to post a listing.",
            true
          );
        }
      }

      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch (error) {
      // A denied permission is a real answer — surface it. Anything else falls
      // through to the browser API rather than blocking the user outright.
      if (error instanceof GeolocationError) throw error;
    }
  }

  return getBrowserPosition();
}

// The original browser implementation, now the fallback path.
function getBrowserPosition(): Promise<GeolocationCoords> {
  // Return a new Promise wrapping the callback-based browser API
  return new Promise((resolve, reject) => {
    // Guard clause: some environments (very old browsers, certain embedded webviews) lack this API entirely
    if (!("geolocation" in navigator)) {
      // Reject immediately with a clear, non-permission-related error
      reject(new GeolocationError("Geolocation is not supported by this browser.", false));
      // Stop here — there's no API to call
      return;
    }

    // Ask the browser for the current position, which triggers the permission prompt if needed
    navigator.geolocation.getCurrentPosition(
      // The success callback, called once the browser has a position fix
      (position) => {
        // Resolve our Promise with just the lat/lng we actually need
        resolve({
          // Pull the latitude out of the browser's position object
          lat: position.coords.latitude,
          // Pull the longitude out of the browser's position object
          lng: position.coords.longitude,
        });
      },
      // The error callback, called if the user denies permission or something else goes wrong
      (error) => {
        // Check the browser's standard error code for "permission denied" (code 1)
        const isPermissionDenied = error.code === error.PERMISSION_DENIED;
        // Reject our Promise with a clear error, flagging whether it was a permission issue
        reject(
          new GeolocationError(
            // A human-readable message depending on the failure type
            isPermissionDenied ? "Location permission was denied." : "Could not determine your location.",
            isPermissionDenied
          )
        );
      },
      // Options: a reasonably generous timeout, and don't accept a very stale cached position
      { timeout: 10000, maximumAge: 60000 }
    );
  });
}