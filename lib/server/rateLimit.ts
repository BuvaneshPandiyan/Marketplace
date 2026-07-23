// Small wrapper around the check_rate_limit() database function.
//
// Kept here rather than inlined in each route so every throttled endpoint
// behaves the same way — including how it fails.

import { NextRequest } from "next/server";
import { getAdminSupabase } from "@/lib/server/adminUtils";

/**
 * Best-effort identity for an anonymous caller.
 *
 * Behind a proxy (Vercel, Cloudflare) the socket address is the proxy's, so the
 * real client sits in x-forwarded-for. That header is a comma-separated chain
 * and can be spoofed by the client — but the LEFTMOST entry the proxy appends
 * is the one it observed, and everything before it is untrusted. We take the
 * first entry, which is the standard approach; it is not proof of identity, but
 * it is enough to stop casual abuse from a single machine.
 */
function clientKey(request: NextRequest, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

/**
 * Returns true when the request may proceed.
 *
 * FAILS OPEN on purpose. If the rate-limit check itself errors — database
 * hiccup, migration not yet applied — we allow the request through rather than
 * blocking it. Throttling protects a third-party quota; it is not a security
 * control, and it should never be the reason the site stops working. A failure
 * is logged so it does not pass unnoticed.
 */
export async function allowRequest(
  request: NextRequest,
  scope: string,
  maxRequests = 30,
  windowSeconds = 60
): Promise<boolean> {
  try {
    const { data, error } = await getAdminSupabase().rpc("check_rate_limit", {
      p_key: clientKey(request, scope),
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.warn(`[ratelimit] check failed for "${scope}" — allowing:`, error.message);
      return true;
    }
    return data !== false;
  } catch (error) {
    console.warn(
      `[ratelimit] check threw for "${scope}" — allowing:`,
      error instanceof Error ? error.message : error
    );
    return true;
  }
}