-- Migration: 0010_listings_product_type_column.sql
-- Purpose: link each listing to the specific product type the seller picked in Step 1 of
-- the "Post Ad" flow (e.g., "Bike" rather than just the broader "Vehicles" category).

-- Add the product_type_id column if it doesn't already exist
alter table public.listings add column if not exists product_type_id uuid references public.product_types (id);

-- Index it since the listing detail page and any "similar items" feature will look this up often
create index if not exists listings_product_type_id_idx on public.listings (product_type_id);

-- NOTE: product_type_id is nullable at the database level (rather than NOT NULL) to avoid
-- breaking any listings that existed before this column was added. In practice, the
-- create_listing_with_details() function in migration 0012 always requires and sets it for
-- every NEW listing — application code should treat it as effectively required going forward.
