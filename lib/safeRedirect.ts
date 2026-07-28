// Returns `raw` only if it is a safe SAME-ORIGIN relative path (e.g. "/wishlist").
//
// Anything that could send the user off the site collapses to "/". This blocks the
// open-redirect / phishing vector where an attacker crafts a link like
//   /login?redirect=https://evil.com/phish
// and the victim, after signing in, gets bounced to the attacker's page.
//
// Rejected: absolute URLs ("https://evil.com"), protocol-relative ("//evil.com"),
// backslash tricks ("/\evil.com"), and pseudo-schemes ("javascript:alert(1)").
export function safeInternalPath(raw: string | null | undefined): string {
  if (!raw) return "/";

  // Must be anchored at the site root, and must not be a protocol-relative
  // "//host" or a backslash-smuggled "/\host".
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }

  try {
    // Resolve against a throwaway origin. If the result escapes that origin, the
    // input was pointing somewhere external and is rejected.
    const base = "https://internal.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return "/";
    // Re-serialise only path + query + hash so nothing host-like can slip through.
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}