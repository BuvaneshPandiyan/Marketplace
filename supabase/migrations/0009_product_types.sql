-- Migration: 0009_product_types.sql
-- Purpose: create the product_types table — each row defines a specific kind of item
-- (e.g., "Bike", "TV", "Mobile Phone") along with a JSONB "question_schema" describing
-- exactly which extra fields the listing-creation form should ask for that type.
-- This is what lets the "Post Ad" flow ask bike-specific questions for a bike and
-- TV-specific questions for a TV, all from one generic, schema-driven form renderer.

-- Create the product_types table if it doesn't already exist
create table if not exists public.product_types (
  -- A unique ID for this product type
  id uuid primary key default gen_random_uuid(),
  -- Which category this product type belongs to (usually the most specific sub-category)
  category_id uuid not null references public.categories (id) on delete cascade,
  -- The display name, e.g., "Bike" or "Mobile Phone"
  name text not null,
  -- A URL-friendly identifier, e.g., "bike" or "mobile-phone"
  slug text not null unique,
  -- The JSONB schema describing this type's extra question fields — see the seed data below
  -- for the exact shape: { "fields": [ { "key", "label", "type", "options"?, "required", "unit"? } ] }
  question_schema jsonb not null default '{"fields": []}'::jsonb,
  -- Whether this row was created on-the-fly by a seller picking "Other" rather than pre-seeded by us —
  -- custom types start out usable immediately, but are flagged so an admin can review/merge them later
  is_custom boolean not null default false,
  -- When this product type was created
  created_at timestamptz not null default now()
);

-- Index category_id since the product-type picker filters/groups by category
create index if not exists product_types_category_id_idx on public.product_types (category_id);

-- Turn on Row Level Security so the policies below actually get enforced
alter table public.product_types enable row level security;

-- Anyone can browse the list of product types (needed to even show the picker to a logged-out visitor)
drop policy if exists "Product types are publicly readable" on public.product_types;
create policy "Product types are publicly readable"
  on public.product_types
  for select
  using (true);

-- Any logged-in user can create a NEW custom product type (the "Other" path) — but only ever
-- flagged as custom; they can't sneak in a fake "official" (non-custom) entry this way
drop policy if exists "Authenticated users can add custom product types" on public.product_types;
create policy "Authenticated users can add custom product types"
  on public.product_types
  for insert
  with check (
    -- The caller must be logged in
    auth.uid() is not null
    -- And the row they're inserting must be marked as custom
    and is_custom = true
  );

-- NOTE: there are no update/delete policies for regular users — editing or merging custom
-- product types (e.g., an admin renaming a messy "other" entry into a clean official one)
-- is left for the admin tooling built in a later prompt.

-- ============================================================================================
-- SEED DATA — pre-defined product types with their question schemas.
-- Each insert looks up its category by slug (set up in migration 0005_categories.sql).
-- ============================================================================================

-- Bike — the fully detailed example from the spec
insert into public.product_types (category_id, name, slug, question_schema)
select id, 'Bike', 'bike', '{
  "fields": [
    {"key": "mileage_kmpl", "label": "Mileage", "type": "number", "unit": "km/l", "required": false},
    {"key": "condition_detail", "label": "Condition", "type": "select", "required": true,
      "options": ["Mint", "Minor scratches", "Major scratches", "Needs repair"]},
    {"key": "keys_available", "label": "Number of keys available", "type": "number", "required": false},
    {"key": "km_driven", "label": "Kilometers driven", "type": "number", "unit": "km", "required": true},
    {"key": "tank_capacity_litres", "label": "Tank capacity", "type": "number", "unit": "litres", "required": false},
    {"key": "registration_year", "label": "Registration year", "type": "number", "required": false},
    {"key": "fuel_type", "label": "Fuel type", "type": "select", "required": true, "options": ["Petrol", "Electric"]},
    {"key": "owner_number", "label": "Owner number", "type": "select", "required": true, "options": ["1st", "2nd", "3rd+"]},
    {"key": "insurance_valid_until", "label": "Insurance valid until", "type": "date", "required": false},
    {"key": "rc_available", "label": "RC available", "type": "boolean", "required": false}
  ]
}'::jsonb
from public.categories where slug = 'bikes'
on conflict (slug) do nothing;

-- Scooter — a trimmed-down sibling of the Bike schema
insert into public.product_types (category_id, name, slug, question_schema)
select id, 'Scooter', 'scooter', '{
  "fields": [
    {"key": "mileage_kmpl", "label": "Mileage", "type": "number", "unit": "km/l", "required": false},
    {"key": "condition_detail", "label": "Condition", "type": "select", "required": true,
      "options": ["Mint", "Minor scratches", "Major scratches", "Needs repair"]},
    {"key": "km_driven", "label": "Kilometers driven", "type": "number", "unit": "km", "required": true},
    {"key": "registration_year", "label": "Registration year", "type": "number", "required": false},
    {"key": "fuel_type", "label": "Fuel type", "type": "select", "required": true, "options": ["Petrol", "Electric"]},
    {"key": "owner_number", "label": "Owner number", "type": "select", "required": true, "options": ["1st", "2nd", "3rd+"]}
  ]
}'::jsonb
from public.categories where slug = 'scooters'
on conflict (slug) do nothing;

-- Car
insert into public.product_types (category_id, name, slug, question_schema)
select id, 'Car', 'car', '{
  "fields": [
    {"key": "km_driven", "label": "Kilometers driven", "type": "number", "unit": "km", "required": true},
    {"key": "fuel_type", "label": "Fuel type", "type": "select", "required": true, "options": ["Petrol", "Diesel", "CNG", "Electric"]},
    {"key": "transmission", "label": "Transmission", "type": "select", "required": true, "options": ["Manual", "Automatic"]},
    {"key": "owner_number", "label": "Owner number", "type": "select", "required": true, "options": ["1st", "2nd", "3rd+"]},
    {"key": "registration_year", "label": "Registration year", "type": "number", "required": false},
    {"key": "condition_detail", "label": "Condition", "type": "select", "required": true,
      "options": ["Mint", "Minor scratches", "Major scratches", "Needs repair"]},
    {"key": "insurance_valid_until", "label": "Insurance valid until", "type": "date", "required": false}
  ]
}'::jsonb
from public.categories where slug = 'cars'
on conflict (slug) do nothing;

-- Bicycle
insert into public.product_types (category_id, name, slug, question_schema)
select id, 'Bicycle', 'bicycle', '{
  "fields": [
    {"key": "bicycle_type", "label": "Type", "type": "select", "required": true, "options": ["Road", "Mountain", "Hybrid", "Kids"]},
    {"key": "gear_count", "label": "Number of gears", "type": "number", "required": false},
    {"key": "condition_detail", "label": "Condition", "type": "select", "required": true,
      "options": ["Mint", "Minor scratches", "Major scratches", "Needs repair"]},
    {"key": "age_range", "label": "Age of item", "type": "select", "required": false,
      "options": ["Under 1 year", "1-2 years", "2-5 years", "5+ years"]}
  ]
}'::jsonb
from public.categories where slug = 'bicycles'
on conflict (slug) do nothing;

-- Mobile Phone — the fully detailed example from the spec
insert into public.product_types (category_id, name, slug, question_schema)
select id, 'Mobile Phone', 'mobile-phone', '{
  "fields": [
    {"key": "brand", "label": "Brand", "type": "select", "required": true,
      "options": ["Samsung", "Apple", "Xiaomi", "OnePlus", "Realme", "Vivo", "Oppo", "Google", "Other"]},
    {"key": "model", "label": "Model", "type": "text", "required": true},
    {"key": "storage", "label": "Storage", "type": "select", "required": true,
      "options": ["32GB", "64GB", "128GB", "256GB", "512GB+"]},
    {"key": "ram", "label": "RAM", "type": "select", "required": false, "options": ["3GB", "4GB", "6GB", "8GB", "12GB+"]},
    {"key": "battery_health_percent", "label": "Battery health", "type": "number", "unit": "%", "required": false},
    {"key": "condition_detail", "label": "Condition", "type": "select", "required": true,
      "options": ["Mint", "Minor scratches", "Major scratches", "Cracked screen"]},
    {"key": "box_charger_included", "label": "Box and charger included", "type": "boolean", "required": false},
    {"key": "warranty_remaining", "label": "Warranty remaining", "type": "boolean", "required": false}
  ]
}'::jsonb
from public.categories where slug = 'mobile-phones'
on conflict (slug) do nothing;

-- Laptop
insert into public.product_types (category_id, name, slug, question_schema)
select id, 'Laptop', 'laptop', '{
  "fields": [
    {"key": "brand", "label": "Brand", "type": "select", "required": true,
      "options": ["Dell", "HP", "Lenovo", "Apple", "Asus", "Acer", "Other"]},
    {"key": "processor", "label": "Processor", "type": "text", "required": false},
    {"key": "ram", "label": "RAM", "type": "select", "required": false, "options": ["4GB", "8GB", "16GB", "32GB+"]},
    {"key": "storage", "label": "Storage", "type": "select", "required": false, "options": ["128GB SSD", "256GB SSD", "512GB SSD", "1TB+"]},
    {"key": "condition_detail", "label": "Condition", "type": "select", "required": true,
      "options": ["Mint", "Minor scratches", "Major scratches", "Needs repair"]},
    {"key": "warranty_remaining", "label": "Warranty remaining", "type": "boolean", "required": false}
  ]
}'::jsonb
from public.categories where slug = 'laptops'
on conflict (slug) do nothing;

-- TV — the fully detailed example from the spec
insert into public.product_types (category_id, name, slug, question_schema)
select id, 'TV', 'tv', '{
  "fields": [
    {"key": "screen_size_inches", "label": "Screen size", "type": "number", "unit": "inches", "required": true},
    {"key": "resolution", "label": "Resolution", "type": "select", "required": true, "options": ["HD", "Full HD", "4K", "8K"]},
    {"key": "smart_tv", "label": "Smart TV", "type": "boolean", "required": false},
    {"key": "panel_type", "label": "Panel type", "type": "select", "required": false, "options": ["LED", "QLED", "OLED"]},
    {"key": "age_range", "label": "Age of TV", "type": "select", "required": false,
      "options": ["Under 1 year", "1-2 years", "2-5 years", "5+ years"]},
    {"key": "remote_included", "label": "Remote included", "type": "boolean", "required": false},
    {"key": "wall_mount_included", "label": "Wall mount included", "type": "boolean", "required": false},
    {"key": "screen_damage", "label": "Any screen damage", "type": "select", "required": false, "options": ["None", "Minor", "Major"]}
  ]
}'::jsonb
from public.categories where slug = 'tvs'
on conflict (slug) do nothing;

-- Gaming Console
insert into public.product_types (category_id, name, slug, question_schema)
select id, 'Gaming Console', 'gaming-console', '{
  "fields": [
    {"key": "brand", "label": "Brand", "type": "select", "required": true, "options": ["PlayStation", "Xbox", "Nintendo", "Other"]},
    {"key": "model", "label": "Model", "type": "text", "required": false},
    {"key": "storage", "label": "Storage", "type": "select", "required": false, "options": ["500GB", "825GB", "1TB", "2TB+"]},
    {"key": "controllers_included", "label": "Controllers included", "type": "number", "required": false},
    {"key": "condition_detail", "label": "Condition", "type": "select", "required": true,
      "options": ["Mint", "Minor scratches", "Major scratches", "Needs repair"]},
    {"key": "box_included", "label": "Original box included", "type": "boolean", "required": false}
  ]
}'::jsonb
from public.categories where slug = 'gaming-consoles'
on conflict (slug) do nothing;

-- Camera
insert into public.product_types (category_id, name, slug, question_schema)
select id, 'Camera', 'camera', '{
  "fields": [
    {"key": "camera_type", "label": "Type", "type": "select", "required": true, "options": ["DSLR", "Mirrorless", "Point & Shoot", "Action"]},
    {"key": "brand", "label": "Brand", "type": "text", "required": false},
    {"key": "megapixels", "label": "Megapixels", "type": "number", "unit": "MP", "required": false},
    {"key": "lens_included", "label": "Lens included", "type": "boolean", "required": false},
    {"key": "condition_detail", "label": "Condition", "type": "select", "required": true,
      "options": ["Mint", "Minor scratches", "Major scratches", "Needs repair"]}
  ]
}'::jsonb
from public.categories where slug = 'cameras'
on conflict (slug) do nothing;

-- Room for Rent — the fully detailed "Property/Room for Rent" example from the spec
insert into public.product_types (category_id, name, slug, question_schema)
select id, 'Room for Rent', 'room-for-rent', '{
  "fields": [
    {"key": "bhk", "label": "BHK", "type": "select", "required": true, "options": ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4+ BHK"]},
    {"key": "furnishing", "label": "Furnishing", "type": "select", "required": true, "options": ["Unfurnished", "Semi-furnished", "Fully furnished"]},
    {"key": "sqft", "label": "Area", "type": "number", "unit": "sq.ft", "required": false},
    {"key": "rent", "label": "Monthly rent", "type": "number", "required": true},
    {"key": "deposit", "label": "Security deposit", "type": "number", "required": true},
    {"key": "available_from", "label": "Available from", "type": "date", "required": false},
    {"key": "preferred_tenants", "label": "Preferred tenants", "type": "select", "required": false, "options": ["Family", "Bachelors", "Any"]},
    {"key": "parking_available", "label": "Parking available", "type": "boolean", "required": false}
  ]
}'::jsonb
from public.categories where slug = 'property-for-rent'
on conflict (slug) do nothing;

-- Furniture (generic)
insert into public.product_types (category_id, name, slug, question_schema)
select id, 'Furniture', 'furniture-item', '{
  "fields": [
    {"key": "furniture_type", "label": "Type", "type": "text", "required": true},
    {"key": "material", "label": "Material", "type": "select", "required": false, "options": ["Wood", "Metal", "Plastic", "Other"]},
    {"key": "condition_detail", "label": "Condition", "type": "select", "required": true,
      "options": ["Mint", "Minor scratches", "Major scratches", "Needs repair"]},
    {"key": "age_range", "label": "Age of item", "type": "select", "required": false,
      "options": ["Under 1 year", "1-2 years", "2-5 years", "5+ years"]}
  ]
}'::jsonb
from public.categories where slug = 'furniture'
on conflict (slug) do nothing;
