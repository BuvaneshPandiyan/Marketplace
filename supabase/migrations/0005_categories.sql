-- Migration: 0005_categories.sql
-- Purpose: create the categories table (with optional parent/child nesting for sub-categories)
-- and seed it with the marketplace's initial verticals.

-- Create the categories table if it doesn't already exist
create table if not exists public.categories (
  -- A unique ID for this category, auto-generated
  id uuid primary key default gen_random_uuid(),
  -- The display name, e.g., "Vehicles" or "Bikes"
  name text not null,
  -- A URL-friendly unique identifier, e.g., "vehicles" or "bikes" — used in links/filters
  slug text not null unique,
  -- A reference to this category's PARENT category, null for top-level categories like "Vehicles"
  parent_id uuid references public.categories (id) on delete cascade,
  -- An emoji or icon identifier shown next to the category in the UI, e.g., "🚗"
  icon text
);

-- Index parent_id since we'll frequently query "give me all sub-categories of X"
create index if not exists categories_parent_id_idx on public.categories (parent_id);

-- Turn on Row Level Security so the policy below actually gets enforced
alter table public.categories enable row level security;

-- Categories are reference data anyone should be able to browse, logged in or not
drop policy if exists "Categories are publicly readable" on public.categories;
create policy "Categories are publicly readable"
  on public.categories
  for select
  using (true);

-- NOTE: there are intentionally no insert/update/delete policies for regular users —
-- categories are managed by admins directly in the Supabase dashboard/SQL editor for now;
-- an admin UI for this can be added later if the category list needs to change often.

-- Seed the top-level categories. Using "on conflict (slug) do nothing" makes this safe to re-run.
insert into public.categories (name, slug, icon) values
  ('Electronics & Mobiles', 'electronics-mobiles', '📱'),
  ('Vehicles', 'vehicles', '🚗'),
  ('Property & Rentals', 'property-rentals', '🏠'),
  ('Furniture & Home', 'furniture-home', '🛋️'),
  ('Fashion', 'fashion', '👕'),
  ('Jobs', 'jobs', '💼'),
  ('Services', 'services', '🛠️')
-- If a category with this slug already exists (e.g., migration re-run), skip it instead of erroring
on conflict (slug) do nothing;

-- Seed sub-categories under "Electronics & Mobiles" — each parent_id is looked up by the parent's slug
insert into public.categories (name, slug, parent_id, icon)
select sub.name, sub.slug, parent.id, sub.icon
-- A small inline table of the sub-categories we want to insert under this parent
from (values
  ('Mobile Phones', 'mobile-phones', '📱'),
  ('Laptops', 'laptops', '💻'),
  ('TVs', 'tvs', '📺'),
  ('Gaming Consoles', 'gaming-consoles', '🎮'),
  ('Cameras', 'cameras', '📷'),
  ('Accessories', 'electronics-accessories', '🎧')
) as sub(name, slug, icon)
-- Look up the parent category's ID by its known slug
cross join (select id from public.categories where slug = 'electronics-mobiles') as parent
on conflict (slug) do nothing;

-- Seed sub-categories under "Vehicles"
insert into public.categories (name, slug, parent_id, icon)
select sub.name, sub.slug, parent.id, sub.icon
from (values
  ('Bikes', 'bikes', '🏍️'),
  ('Cars', 'cars', '🚙'),
  ('Scooters', 'scooters', '🛵'),
  ('Bicycles', 'bicycles', '🚲')
) as sub(name, slug, icon)
cross join (select id from public.categories where slug = 'vehicles') as parent
on conflict (slug) do nothing;

-- Seed sub-categories under "Property & Rentals"
insert into public.categories (name, slug, parent_id, icon)
select sub.name, sub.slug, parent.id, sub.icon
from (values
  ('For Rent', 'property-for-rent', '🔑'),
  ('For Resale', 'property-for-resale', '🏷️'),
  ('PG / Hostel', 'pg-hostel', '🛏️')
) as sub(name, slug, icon)
cross join (select id from public.categories where slug = 'property-rentals') as parent
on conflict (slug) do nothing;

-- Seed sub-categories under "Furniture & Home"
insert into public.categories (name, slug, parent_id, icon)
select sub.name, sub.slug, parent.id, sub.icon
from (values
  ('Furniture', 'furniture', '🪑'),
  ('Home Decor', 'home-decor', '🖼️'),
  ('Kitchen & Appliances', 'kitchen-appliances', '🍳')
) as sub(name, slug, icon)
cross join (select id from public.categories where slug = 'furniture-home') as parent
on conflict (slug) do nothing;

-- Seed sub-categories under "Fashion"
insert into public.categories (name, slug, parent_id, icon)
select sub.name, sub.slug, parent.id, sub.icon
from (values
  ('Men''s Fashion', 'mens-fashion', '👔'),
  ('Women''s Fashion', 'womens-fashion', '👗'),
  ('Kids'' Fashion', 'kids-fashion', '🧸')
) as sub(name, slug, icon)
cross join (select id from public.categories where slug = 'fashion') as parent
on conflict (slug) do nothing;

-- Seed sub-categories under "Jobs"
insert into public.categories (name, slug, parent_id, icon)
select sub.name, sub.slug, parent.id, sub.icon
from (values
  ('Full-time', 'jobs-full-time', '🗂️'),
  ('Part-time', 'jobs-part-time', '🕑')
) as sub(name, slug, icon)
cross join (select id from public.categories where slug = 'jobs') as parent
on conflict (slug) do nothing;

-- Seed sub-categories under "Services"
insert into public.categories (name, slug, parent_id, icon)
select sub.name, sub.slug, parent.id, sub.icon
from (values
  ('Tutoring', 'tutoring', '📚'),
  ('Repair & Maintenance', 'repair-maintenance', '🔧'),
  ('Other Services', 'other-services', '🧰')
) as sub(name, slug, icon)
cross join (select id from public.categories where slug = 'services') as parent
on conflict (slug) do nothing;
