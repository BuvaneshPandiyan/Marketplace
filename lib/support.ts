/**
 * Central place for every support / social contact detail the app uses.
 * Change a value here and it updates the contact page, the floating buttons,
 * and every prefilled WhatsApp message at once.
 */

// The address the Contact page's email card opens.
export const SUPPORT_EMAIL = "sandhaisupport@gmail.com";

// The support WhatsApp number, in full international form (country code + number, digits only).
// 7338816479 is an Indian number, so it's prefixed with 91.
export const SUPPORT_WHATSAPP = "917338816479";

// Human-readable version of the same number, for display only.
export const SUPPORT_WHATSAPP_DISPLAY = "+91 73388 16479";

// Support hours shown on the contact page. Purely informational.
export const SUPPORT_HOURS = "Every day, 9:00 AM – 9:00 PM IST";

/**
 * The Instagram handle WITHOUT the leading "@".
 *
 * TODO: set this to your real handle (e.g. "bazar.in") to switch the Instagram
 * button on. While it's null the button simply isn't rendered — that's deliberate,
 * so we never ship a link that 404s.
 */
export const INSTAGRAM_HANDLE: string | null = null;

/** Full Instagram profile URL, or null when no handle is configured. */
export const INSTAGRAM_URL = INSTAGRAM_HANDLE
  ? `https://instagram.com/${INSTAGRAM_HANDLE}`
  : null;

/**
 * Turn any stored phone number into the digits-only form wa.me expects.
 *
 * Handles the shapes we actually store or paste:
 *   "+91 98765 43210" -> "919876543210"
 *   "+919876543210"   -> "919876543210"
 *   "9876543210"      -> "919876543210"  (bare 10-digit Indian number gets 91)
 *   "09876543210"     -> "919876543210"  (drops the domestic trunk 0)
 *
 * Returns null if there aren't enough digits to be a real number, so callers
 * can hide the button instead of opening a broken chat.
 */
export function toWhatsAppNumber(rawPhone: string | null | undefined): string | null {
  if (!rawPhone) return null;

  // Strip spaces, dashes, brackets, and the leading "+"
  let digits = rawPhone.replace(/\D/g, "");

  // A leading 0 is the Indian domestic trunk prefix — WhatsApp doesn't want it
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  // A bare 10-digit number is Indian by convention in this app (default country code is +91)
  if (digits.length === 10) digits = `91${digits}`;

  // Shortest real international number is ~7 digits + country code
  if (digits.length < 10 || digits.length > 15) return null;

  return digits;
}

/** Build a wa.me deep link with a prefilled message. Works on web, iOS and Android. */
export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * The message a buyer sends a seller from a listing page.
 *
 * Kept short and businesslike — it names the item, the asking price and the
 * listing link, so the seller knows exactly which of their ads this is about
 * without having to ask. The two questions are the two every buyer asks anyway.
 */
export function buildListingEnquiryMessage(params: {
  title: string;
  priceFormatted: string;
  listingUrl: string;
}): string {
  const { title, priceFormatted, listingUrl } = params;
  return [
    `Hi, I'm contacting you about your listing on bazar.in.`,
    ``,
    `Item: ${title}`,
    `Asking price: ${priceFormatted}`,
    `Listing: ${listingUrl}`,
    ``,
    `Is it still available? If so, I'd like to know whether the price is negotiable and when I could see it.`,
    ``,
    `Thank you.`,
  ].join("\n");
}

/**
 * The message a user sends support from the contact page.
 *
 * This is the closest thing the app has to a contact form: WhatsApp is the form.
 * So the template does what a form would — it labels the fields support actually
 * needs, and leaves them blank for the user to fill in before hitting send.
 * The blank lines after each label are intentional; they give the user somewhere
 * to type without having to restructure the message.
 */
export function buildSupportEnquiryMessage(topic?: string): string {
  return [
    `Hi bazar.in support,`,
    ``,
    `I need help with the following.`,
    ``,
    `Name:`,
    `Registered phone number:`,
    `Topic: ${topic ?? ""}`,
    `Listing link (if this is about a specific ad):`,
    ``,
    `What's happening:`,
    ``,
    ``,
    `Thank you.`,
  ].join("\n");
}