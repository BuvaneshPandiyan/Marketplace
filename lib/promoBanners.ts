/**
 * Homepage promo banners.
 *
 * These are the ad slots that ride at the top of the home feed. Right now they
 * live in code: there's no `promo_banners` table yet, so this array IS the CMS.
 * Add, remove or reorder entries and the carousel updates — no component edits.
 *
 * When you're ready to sell these slots properly, this shape maps 1:1 onto a DB
 * table (id, kicker, title, subtitle, cta, href, theme, starts_at, ends_at), and
 * PromoBanner only needs its data source swapped.
 *
 * Keep titles to ~5 words and subtitles to ~10 — the banner is short and wide,
 * and long copy is what makes these look awkward on phones.
 */

export type PromoTheme = "ember" | "midnight" | "mint" | "grape";

export type PromoSlide = {
  id: string;
  /** Small uppercase label above the title */
  kicker: string;
  title: string;
  subtitle: string;
  /** Button text */
  cta: string;
  /** Where the whole banner links to */
  href: string;
  theme: PromoTheme;
  /** Big translucent emoji used as the slide's backdrop motif */
  motif: string;
  /**
   * Optional background artwork, served from /public.
   * e.g. "/images/promo-sell-free.png"
   *
   * Entirely optional — if the file isn't there, the slide falls back to its
   * gradient + motif and still looks finished. Compose art with its subject on
   * the RIGHT and the left third dark and empty; the copy sits on the left and
   * the image is masked to dissolve into the gradient behind it.
   */
  image?: string;
};

/** Gradients per theme. Orange stays the hero; the others are supporting slots. */
export const PROMO_THEMES: Record<PromoTheme, { bg: string; glow: string; accent: string; deep: string }> = {
  ember: {
    bg: "linear-gradient(115deg, #3d0714 0%, #8b0e2a 45%, #cf1338 100%)",
    glow: "rgba(244,63,94,0.45)",
    accent: "#ff9db0",
    deep: "#cf1338",
  },
  midnight: {
    bg: "linear-gradient(115deg, #0b1020 0%, #1e2a55 48%, #3b5bdb 100%)",
    glow: "rgba(96,132,255,0.45)",
    accent: "#a5c0ff",
    deep: "#3b5bdb",
  },
  mint: {
    bg: "linear-gradient(115deg, #04231a 0%, #0b5f43 48%, #10b981 100%)",
    glow: "rgba(16,185,129,0.45)",
    accent: "#8ee9c8",
    deep: "#059669",
  },
  grape: {
    bg: "linear-gradient(115deg, #1b0a26 0%, #4c1d70 48%, #9333ea 100%)",
    glow: "rgba(168,85,247,0.45)",
    accent: "#dcb4ff",
    deep: "#9333ea",
  },
};

export const PROMO_SLIDES: PromoSlide[] = [
  {
    id: "sell-free",
    image: "/images/promo-sell-free.png",
    kicker: "Zero commission",
    title: "Post your ad for free",
    subtitle: "List in under a minute. Keep every rupee you sell for.",
    cta: "Start selling",
    href: "/sell",
    theme: "ember",
    motif: "🏷️",
  },
  {
    id: "nearby",
    image: "/images/promo-nearby.png",
    kicker: "Hyperlocal",
    title: "Deals within 3 km of you",
    subtitle: "Skip the courier. Meet, inspect, and pay in person.",
    cta: "Browse nearby",
    href: "/search",
    theme: "midnight",
    motif: "📍",
  },
  {
    id: "verified",
    image: "/images/promo-verified.png",
    kicker: "Buy with confidence",
    title: "Verified sellers, real photos",
    subtitle: "We check listing photos for reuse and location mismatches.",
    cta: "How it works",
    href: "/contact",
    theme: "mint",
    motif: "🛡️",
  },
  {
    id: "wishlist",
    image: "/images/promo-wishlist.png",
    kicker: "Never miss a drop",
    title: "Save it, get told when it's cheaper",
    subtitle: "Wishlist an ad and we'll ping you the moment the price falls.",
    cta: "See wishlist",
    href: "/wishlist",
    theme: "grape",
    motif: "💜",
  },
];