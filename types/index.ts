// This file holds shared TypeScript types used across the app.
// Once more tables exist, consider generating types automatically with:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts

// The shape of a row in the public.profiles table (see supabase/migrations/0001_profiles.sql and 0004_profile_location_columns.sql)
export type Profile = {
  // The profile's ID — same as the Supabase auth user's ID
  id: string;
  // The user's phone number in E.164 format, e.g., "+919876543210"
  phone: string;
  // The user's display name — null until they finish onboarding
  name: string | null;
  // URL to the user's profile photo in Supabase Storage, null if not set
  profile_photo_url: string | null;
  // ISO timestamp string of when the profile was created
  created_at: string;
  // Whether this seller has completed ID verification
  is_verified_seller: boolean;
  // Average rating (0-5) from past transactions
  rating_avg: number;
  // How many ratings this user has received
  rating_count: number;
  // The default latitude set during onboarding, null until location setup is completed
  default_lat: number | null;
  // The default longitude set during onboarding
  default_lng: number | null;
  // The default human-readable locality name, e.g., "Tambaram, Chennai"
  default_locality: string | null;
  // The most recently detected real GPS latitude (updated via "Use current location")
  current_lat: number | null;
  // The most recently detected real GPS longitude
  current_lng: number | null;
  // The most recently detected real GPS locality name
  current_locality: string | null;
};

// The shape of a single question field within a product type's question_schema
// (see supabase/migrations/0009_product_types.sql for real examples)
export type QuestionField = {
  // The attribute key this field saves to in listing_attributes, e.g., "km_driven"
  key: string;
  // The human-readable label shown above the input, e.g., "Kilometers driven"
  label: string;
  // Which kind of input to render for this field
  type: "text" | "number" | "select" | "boolean" | "date";
  // The list of choices, only present when type is "select"
  options?: string[];
  // Whether the seller must fill this in before continuing
  required: boolean;
  // An optional unit shown next to the input, e.g., "km/l" or "sq.ft"
  unit?: string;
};

// The overall shape of a product type's question_schema JSONB column
export type QuestionSchema = {
  // The ordered list of fields to render for this product type
  fields: QuestionField[];
};

// The shape of a row in the public.product_types table (see 0009_product_types.sql)
export type ProductType = {
  // The product type's unique ID
  id: string;
  // Which category this product type belongs to
  category_id: string;
  // The display name, e.g., "Bike" or "Mobile Phone"
  name: string;
  // The URL-friendly identifier
  slug: string;
  // The dynamic question schema for this product type
  question_schema: QuestionSchema;
  // Whether this was created on-the-fly via the "Other" picker option
  is_custom: boolean;
  // ISO timestamp string of when this product type was created
  created_at: string;
};


export type Category = {
  // The category's unique ID
  id: string;
  // The display name, e.g., "Vehicles" or "Bikes"
  name: string;
  // The URL-friendly identifier, e.g., "vehicles" or "bikes"
  slug: string;
  // The parent category's ID, null for top-level categories
  parent_id: string | null;
  // An emoji/icon shown next to the category in the UI, null if not set
  icon: string | null;
};

// The two ways a listing can be offered (see the listing_type_enum in 0006_listings.sql)
export type ListingType = "sale" | "rent";

// Whether an item is brand new or previously used (see the condition_enum in 0006_listings.sql)
export type ListingCondition = "new" | "used";

// Every state a listing can be in throughout its lifecycle (see listing_status_enum in 0006_listings.sql)
export type ListingStatus = "active" | "sold" | "expired" | "flagged" | "removed";

// The shape of a row in the public.listings table (see supabase/migrations/0006_listings.sql)
export type Listing = {
  // The listing's unique ID
  id: string;
  // The ID of the profile who posted this listing
  seller_id: string;
  // The ID of the category this listing belongs to
  category_id: string;
  // The ID of the specific product type this listing is (e.g., "Bike"), null for old pre-Prompt-4 rows
  product_type_id: string | null;
  // The listing's headline
  title: string;
  // The full free-text description, null if the seller left it blank
  description: string | null;
  // The asking price
  price: number;
  // Whether this is for sale or for rent
  listing_type: ListingType;
  // Whether the item is new or used
  condition: ListingCondition;
  // The listing's current lifecycle status
  status: ListingStatus;
  // The human-readable locality name, e.g., "Tambaram, Chennai"
  locality: string | null;
  // The listing's latitude
  lat: number;
  // The listing's longitude
  lng: number;
  // ISO timestamp string of when the listing was created
  created_at: string;
  // ISO timestamp string of when the listing was last updated
  updated_at: string;
  // How many times this listing's detail page has been viewed
  view_count: number;
};

// The shape of a row in the public.listing_attributes table (see 0007_listing_attributes_and_photos.sql)
export type ListingAttribute = {
  // The attribute row's unique ID
  id: string;
  // Which listing this attribute belongs to
  listing_id: string;
  // The attribute's name, e.g., "km_driven" or "bhk"
  key: string;
  // The attribute's value, always stored as text regardless of its logical type
  value: string | null;
};

// The shape of a row in the public.listing_photos table (see 0007_listing_attributes_and_photos.sql)
export type ListingPhoto = {
  // The photo row's unique ID
  id: string;
  // Which listing this photo belongs to
  listing_id: string;
  // The public URL where this photo can be viewed
  url: string;
  // The latitude embedded in the photo at capture time, null if unavailable
  exif_lat: number | null;
  // The longitude embedded in the photo at capture time, null if unavailable
  exif_lng: number | null;
  // ISO timestamp string embedded in the photo at capture time, null if unavailable
  exif_timestamp: string | null;
  // Whether this photo was taken live through the in-app camera
  captured_in_app: boolean;
  // A perceptual hash used later to detect duplicate/reused photos, null until computed
  perceptual_hash: string | null;
  // The display order of this photo within the listing's gallery (0 = cover photo)
  sort_order: number;
  // ISO timestamp string of when this photo row was created
  created_at: string;
};

// The shape of a single listing as returned by get_listings_near() or get_listings_far()
// (see supabase/migrations/0013_tiered_feed_functions.sql) — used by the home feed
export type FeedListingItem = {
  // The listing's unique ID
  id: string;
  // The listing's title
  title: string;
  // The listing's price
  price: number;
  // Whether it's for sale or rent
  listing_type: ListingType;
  // The item's condition
  condition: ListingCondition;
  // The listing's locality name
  locality: string | null;
  // The listing's latitude
  lat: number;
  // The listing's longitude
  lng: number;
  // ISO timestamp string of when the listing was created
  created_at: string;
  // Who posted it
  seller_id: string;
  // Which category it's in
  category_id: string;
  // How many views it has
  view_count: number;
  // The listing's cover photo URL, null if it somehow has none
  cover_photo_url: string | null;
  // The distance from the search point, in kilometers — only present for Tier 1/Tier 2 results
  // (get_listings_far doesn't compute this, since Tier 3 is sorted by recency, not distance)
  distance_km?: number;
};

// The shape of a row in the public.conversations table (see 0014_chat_and_contact_reveals.sql)
export type Conversation = {
  // The conversation's unique ID
  id: string;
  // Which listing this conversation is about
  listing_id: string;
  // The buyer's profile ID
  buyer_id: string;
  // The seller's profile ID
  seller_id: string;
  // ISO timestamp string of when this conversation started
  created_at: string;
};

/**
 * What kind of message a row represents.
 *
 * Mirrors the CHECK constraint on messages.message_type:
 *   text   — written by a participant, rendered as a chat bubble
 *   system — generated by the platform (e.g. "This item has been marked as
 *            sold"), rendered as a centred notice instead of a bubble
 *
 * Modelled as a union rather than `string` so a typo like "sytem" fails to
 * compile instead of silently never matching at runtime.
 */
export type MessageType = "text" | "system";

// The shape of a row in the public.messages table
export type Message = {
  // The message's unique ID
  id: string;
  // Which conversation this message belongs to
  conversation_id: string;
  // Who sent it
  sender_id: string;
  // The text content, null for an image-only message
  text: string | null;
  // An attached image's URL, null for a text-only message
  image_url: string | null;
  // ISO timestamp string of when this message was sent
  created_at: string;
  // Whether the other participant has read this message
  read: boolean;
  // Whether this is a participant's own message or a platform notice.
  // NOT optional: the column is `not null default 'text'`, so every row has it.
  message_type: MessageType;
};

// The shape of a row in the public.ratings table
export type Rating = {
  // The rating's unique ID
  id: string;
  // Which listing/transaction this rating is about
  listing_id: string;
  // Who gave the rating
  rater_id: string;
  // Who the rating is about
  rated_user_id: string;
  // The star rating, 1-5
  stars: number;
  // An optional written comment
  comment: string | null;
  // ISO timestamp string of when this rating was given
  created_at: string;
};

// The shape of a row in the public.wishlist table (see 0017_wishlist_and_saved_searches.sql)
export type WishlistEntry = {
  // The wishlist row's unique ID
  id: string;
  // Who wishlisted this listing
  user_id: string;
  // Which listing was wishlisted
  listing_id: string;
  // The listing's price at the time it was wishlisted (used to detect price drops)
  price_at_save: number;
  // ISO timestamp string of when it was wishlisted
  created_at: string;
};

// The shape of a row in the public.saved_searches table
export type SavedSearch = {
  // The saved search's unique ID
  id: string;
  // Who saved this search
  user_id: string;
  // The plain-text query string
  query: string;
  // The active filter state at save time, as a JSON blob
  filters: Record<string, string | null>;
  // An optional human-readable label
  label: string | null;
  // ISO timestamp of when it was saved
  created_at: string;
};

// The allowed notification type values (mirrors the notification_type enum in migration 0018)
export type NotificationType =
  | "new_match"         // A new listing matches a saved search
  | "price_drop"        // A wishlisted listing dropped in price
  | "new_message"       // A new chat message arrived
  | "listing_sold"      // A listing the user is involved with was marked sold
  | "listing_expiring"  // The user's own listing is about to expire
  | "listing_published" // The user's newly posted listing is now live
  | "welcome";          // Account-creation welcome

// The shape of a row in the public.notifications table
export type AppNotification = {
  // The notification's unique ID
  id: string;
  // Who this notification is for
  user_id: string;
  // What kind of notification (drives icon/colour in the UI)
  type: NotificationType;
  // The bold first line
  title: string;
  // The secondary body text
  body: string;
  // An optional deep-link URL the bell row taps to
  link: string | null;
  // Whether the user has seen/dismissed this notification
  read: boolean;
  // ISO timestamp of when this was created
  created_at: string;
};

// The allowed values for a report's target_type column (mirrors the report_target_type enum)
export type ReportTargetType = "listing" | "user" | "message";

// The allowed values for a report's reason column
export type ReportReason = "fake_listing" | "scam" | "inappropriate" | "wrong_category" | "other";

// The allowed values for a report's status column
export type ReportStatus = "pending" | "reviewed" | "resolved" | "dismissed";

// The shape of a row in the public.reports table (see 0020_reports_keywords_anomalies.sql)
export type Report = {
  // The report's unique ID
  id: string;
  // Who filed the report
  reporter_id: string;
  // What kind of thing is being reported
  target_type: ReportTargetType;
  // The ID of the listing, user, or message being reported (stored as text)
  target_id: string;
  // The selected reason category
  reason: ReportReason;
  // An optional freeform comment from the reporter
  comment: string | null;
  // ISO timestamp of when this report was filed
  created_at: string;
  // The current moderation status
  status: ReportStatus;
};

// The allowed status values for a verification request
export type VerificationStatus = "pending" | "approved" | "rejected";

// The shape of a row in the public.verification_requests table (see 0021_verification_requests.sql)
export type VerificationRequest = {
  // The request's unique ID
  id: string;
  // The user who submitted the request
  user_id: string;
  // Storage URL of the government ID photo
  id_photo_url: string;
  // Storage URL of the live selfie
  selfie_url: string;
  // ISO timestamp of when the request was submitted
  created_at: string;
  // Current status
  status: VerificationStatus;
  // ISO timestamp of when an admin reviewed it, or null while pending
  reviewed_at: string | null;
  // Optional admin note (e.g., "ID unreadable — please resubmit")
  admin_notes: string | null;
};

// The shape of a row in the public.audit_log table (see 0024_admin_and_audit_log.sql)
export type AuditLogEntry = {
  // The entry's unique ID
  id: string;
  // Which admin performed the action
  admin_id: string;
  // A short verb describing what was done (e.g., "approve_listing", "ban_user")
  action: string;
  // What kind of entity was acted on (e.g., "listing", "user", "report")
  target_type: string;
  // The ID of the entity acted on
  target_id: string;
  // Optional notes from the admin explaining the decision
  notes: string | null;
  // ISO timestamp of when the action was taken
  created_at: string;
};