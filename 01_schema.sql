-- =============================================================================
-- KITCHEN RECIPE OS — SUPABASE SCHEMA
-- Version: 2.1 (Production-ready)
-- Author: Generated for Paul Britton / F&B Group
-- Date: 2026
-- =============================================================================
-- EXECUTION ORDER: Run this file first, then 02_rls.sql, then 03_seed.sql
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- for fuzzy ingredient name search


-- =============================================================================
-- ENUMS
-- =============================================================================

create type user_role as enum (
  'owner',
  'super_admin',
  'operations_manager',
  'venue_manager',
  'head_chef',
  'section_manager',
  'staff'
);

create type user_status as enum (
  'active',
  'disabled'
);

create type recipe_status as enum (
  'draft',
  'pending_review',
  'published',
  'archived'
);

create type media_type as enum (
  'hero_image',
  'gallery_image',
  'step_image',
  'recipe_video',
  'step_video'
);

create type venue_type as enum (
  'physical',   -- normal restaurant/cafe
  'pastry_hub'  -- cross-venue recipe library, not a physical location
);

create type country_code as enum (
  'BH',  -- Bahrain
  'SA'   -- Saudi Arabia
);

create type notification_channel as enum (
  'in_app',
  'email',
  'telegram'
);

create type audit_event as enum (
  'recipe_created',
  'recipe_edited',
  'recipe_deleted',
  'recipe_restored',
  'recipe_published',
  'recipe_archived',
  'ingredient_changed',
  'quantity_changed',
  'unit_changed',
  'method_step_changed',
  'photo_uploaded',
  'photo_deleted',
  'video_uploaded',
  'video_deleted',
  'cost_changed',
  'selling_price_changed',
  'permission_changed',
  'user_access_removed',
  'user_disabled',
  'excel_import_completed',
  'excel_import_published',
  'ingredient_master_merged'
);

create type ingredient_category as enum (
  'dairy',
  'proteins',
  'vegetables',
  'herbs_spices',
  'oils_fats',
  'dry_goods',
  'beverages',
  'sauces_condiments',
  'fruits',
  'bakery',
  'seafood',
  'other'
);

create type import_status as enum (
  'pending',
  'ok',
  'warning',
  'error',
  'published',
  'discarded'
);

create type print_view_type as enum (
  'full_with_photo',
  'kitchen_quick',
  'training_sop',
  'cost_hidden',
  'cost_visible_manager'
);


-- =============================================================================
-- 1. PROFILES
-- Extends Supabase auth.users. Created automatically on user sign-up via trigger.
-- =============================================================================

create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  full_name         text not null,
  email             text not null,
  role              user_role not null default 'staff',
  status            user_status not null default 'active',
  avatar_url        text,
  phone             text,
  telegram_chat_id  text,          -- for direct Telegram notifications
  notes             text,          -- internal admin notes (not visible to user)
  disabled_at       timestamptz,   -- set when status = 'disabled'
  disabled_by       uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.profiles is 'User profiles extending Supabase auth. Role is for display/routing; permissions table governs actual access.';
comment on column public.profiles.role is 'Display role only. Actual access is controlled by the permissions table.';
comment on column public.profiles.telegram_chat_id is 'Used to send Telegram notifications via n8n webhook.';


-- =============================================================================
-- 2. VENUES
-- Physical venues + Pastry Hub (cross-venue library)
-- =============================================================================

create table public.venues (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,
  short_name        text,                         -- e.g. "TFJ" for display in small spaces
  description       text,
  venue_type        venue_type not null default 'physical',
  country_code      country_code,                 -- null for pastry_hub
  city              text,
  logo_url          text,
  cover_image_url   text,
  theme_color       text default '#1A1714',       -- hex, used for venue card
  vat_rate          numeric(5,4) not null default 0.10,  -- 0.10 = 10% BH, 0.15 = 15% SA
  is_active         boolean not null default true,
  sort_order        int not null default 0,       -- controls dashboard card order
  brand_group       text,                         -- e.g. 'sage_sirloin' to group BH + SA
  created_by        uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.venues is 'All venues including Pastry Hub. venue_type=pastry_hub means cross-venue recipe library.';
comment on column public.venues.vat_rate is 'Bahrain = 0.10, Saudi Arabia = 0.15. Used in recipe costing.';
comment on column public.venues.brand_group is 'Groups same-brand venues across countries. e.g. sage_sirloin links BH and SA variants.';


-- =============================================================================
-- 3. SECTIONS
-- Kitchen sections within each venue
-- =============================================================================

create table public.sections (
  id          uuid primary key default uuid_generate_v4(),
  venue_id    uuid not null references public.venues(id) on delete cascade,
  name        text not null,
  description text,
  icon        text,         -- emoji or icon identifier for UI
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique(venue_id, name)
);

comment on table public.sections is 'Kitchen sections within a venue. e.g. Hot Kitchen, Pastry, Breakfast, Sheesha Menu.';


-- =============================================================================
-- 4. INGREDIENT MASTER
-- Canonical ingredient list extracted from all recipes across all venues.
-- Foundation for Phase 3 costing and duplicate detection.
-- =============================================================================

create table public.ingredient_master (
  id                uuid primary key default uuid_generate_v4(),
  canonical_name    text not null unique,         -- the "correct" standard name
  category          ingredient_category not null default 'other',
  default_unit      text,                         -- e.g. 'gr', 'ml', 'each'
  aliases           text[] default '{}',          -- e.g. ['Greek yogurt', 'Yogurt, Greek']
  is_reviewed       boolean not null default false,  -- owner has confirmed this entry
  merged_into       uuid references public.ingredient_master(id), -- if this was a duplicate
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- GIN index for fast fuzzy name search (duplicate detection)
create index idx_ingredient_master_name_trgm
  on public.ingredient_master using gin (canonical_name gin_trgm_ops);

create index idx_ingredient_master_aliases
  on public.ingredient_master using gin (aliases);

comment on table public.ingredient_master is 'Normalised ingredient library. Auto-populated from recipe imports. Owner reviews and merges duplicates.';
comment on column public.ingredient_master.aliases is 'Array of known spelling variants for duplicate detection. e.g. Greek yogurt, Greek yoghurt, Yogurt Greek.';
comment on column public.ingredient_master.merged_into is 'If set, this entry was a duplicate and was merged into the referenced canonical ingredient.';


-- =============================================================================
-- 5. RECIPES
-- =============================================================================

create table public.recipes (
  id                        uuid primary key default uuid_generate_v4(),
  venue_id                  uuid not null references public.venues(id),
  section_id                uuid references public.sections(id),
  title                     text not null,
  description               text,
  portion_size              numeric(10,3),          -- number of portions
  recipe_size               numeric(10,3) default 1, -- multiplier from Excel B6
  total_ingredient_weight   numeric(10,3),          -- kg, from Excel A36
  total_ingredient_cost     numeric(10,4),          -- BD, from Excel F36
  misc_cost_pct             numeric(5,4),           -- e.g. 0.04 for 4%, venue VAT auto-applied
  misc_cost_amount          numeric(10,4),          -- calculated: total_ingredient_cost * misc_cost_pct
  total_cost                numeric(10,4),          -- total_ingredient_cost + misc_cost_amount
  cost_per_portion          numeric(10,4),          -- total_cost / portion_size
  selling_price             numeric(10,4),          -- from Excel E45
  cost_percentage           numeric(5,4),           -- cost_per_portion / selling_price
  status                    recipe_status not null default 'draft',
  version_number            int not null default 1,
  is_master_recipe          boolean not null default false,  -- Pastry Hub base recipes
  tags                      text[] default '{}',
  excel_source_file         text,                   -- original filename if imported
  excel_source_tab          text,                   -- which worksheet tab
  created_by                uuid references public.profiles(id),
  updated_by                uuid references public.profiles(id),
  published_by              uuid references public.profiles(id),
  published_at              timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Performance indexes
create index idx_recipes_venue_id on public.recipes(venue_id);
create index idx_recipes_section_id on public.recipes(section_id);
create index idx_recipes_status on public.recipes(status);
create index idx_recipes_title_trgm on public.recipes using gin (title gin_trgm_ops);

comment on table public.recipes is 'Core recipe records. Costing fields auto-calculated; Phase 3 will link to supplier prices.';
comment on column public.recipes.is_master_recipe is 'True for Pastry Hub base recipes that other venues reference.';
comment on column public.recipes.misc_cost_pct is 'Usually 4%. Separate from venue VAT rate — used for misc kitchen costs.';


-- =============================================================================
-- 6. RECIPE VERSIONS (snapshot on every save)
-- Full before/after state for rollback. Audit log shows what changed;
-- versions table stores the complete recipe snapshot.
-- =============================================================================

create table public.recipe_versions (
  id                    uuid primary key default uuid_generate_v4(),
  recipe_id             uuid not null references public.recipes(id) on delete cascade,
  version_number        int not null,
  title                 text not null,
  description           text,
  portion_size          numeric(10,3),
  total_ingredient_cost numeric(10,4),
  selling_price         numeric(10,4),
  ingredients_snapshot  jsonb not null,  -- full ingredient list at this version
  steps_snapshot        jsonb not null,  -- full method steps at this version
  change_summary        text,            -- human-readable summary of what changed
  changed_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),

  unique(recipe_id, version_number)
);

create index idx_recipe_versions_recipe_id on public.recipe_versions(recipe_id);

comment on table public.recipe_versions is 'Full snapshot of recipe + ingredients + steps on every save. Enables true rollback, not just change log.';


-- =============================================================================
-- 7. RECIPE INGREDIENTS
-- =============================================================================

create table public.recipe_ingredients (
  id                    uuid primary key default uuid_generate_v4(),
  recipe_id             uuid not null references public.recipes(id) on delete cascade,
  ingredient_master_id  uuid references public.ingredient_master(id),  -- nullable until reviewed
  group_name            text,               -- e.g. "Tzatziki", "Topping" — for visual grouping
  quantity              numeric(10,4),
  unit                  text,               -- gr, ml, each, kg, etc.
  ingredient_name       text not null,      -- display name (may differ from canonical)
  preparation_note      text,               -- e.g. "chopped", "shaved", "ordinary Lebanese"
  raw_ingredient_text   text,               -- original unparsed text from Excel (safety net)
  cost_per_unit         numeric(10,6),      -- populated in Phase 3 from supplier prices
  line_cost             numeric(10,4),      -- quantity * cost_per_unit
  sort_order            int not null default 0,

  constraint recipe_ingredients_recipe_id_sort_order_unique unique (recipe_id, sort_order) deferrable initially deferred
);

create index idx_recipe_ingredients_recipe_id on public.recipe_ingredients(recipe_id);
create index idx_recipe_ingredients_master_id on public.recipe_ingredients(ingredient_master_id);

comment on table public.recipe_ingredients is 'Ingredients per recipe. ingredient_master_id links to canonical list once reviewed.';
comment on column public.recipe_ingredients.group_name is 'Visual grouping header. e.g. Tzatziki, Topping. Multiple ingredients share the same group_name.';
comment on column public.recipe_ingredients.raw_ingredient_text is 'Original Excel text before parsing. Never overwritten — safety net for re-parsing.';


-- =============================================================================
-- 8. RECIPE STEPS
-- =============================================================================

create table public.recipe_steps (
  id            uuid primary key default uuid_generate_v4(),
  recipe_id     uuid not null references public.recipes(id) on delete cascade,
  step_number   int not null,     -- human-readable label shown in UI
  sort_order    int not null,     -- actual display order (handles reordering without gaps)
  instruction   text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique(recipe_id, sort_order) deferrable initially deferred
);

create index idx_recipe_steps_recipe_id on public.recipe_steps(recipe_id);


-- =============================================================================
-- 9. RECIPE MEDIA
-- Images and videos attached to recipes or individual steps
-- =============================================================================

create table public.recipe_media (
  id            uuid primary key default uuid_generate_v4(),
  recipe_id     uuid not null references public.recipes(id) on delete cascade,
  step_id       uuid references public.recipe_steps(id) on delete set null,  -- null = recipe-level
  media_type    media_type not null,
  is_external   boolean not null default false,   -- true = YouTube/Vimeo link
  file_url      text not null,                    -- Supabase Storage URL or external URL
  external_url  text,                             -- original YouTube/Vimeo URL if is_external
  file_size_kb  int,                              -- null for external
  mime_type     text,
  caption       text,
  sort_order    int not null default 0,
  uploaded_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);

create index idx_recipe_media_recipe_id on public.recipe_media(recipe_id);

comment on column public.recipe_media.is_external is 'If true, file_url is an external video link (YouTube/Vimeo). Max 2 videos per recipe, max 200MB per upload.';


-- =============================================================================
-- 10. PERMISSIONS
-- Granular checkbox-style permission matrix.
-- Applied at company / venue / section / recipe level.
-- NEVER visible to staff or head_chef roles.
-- =============================================================================

create table public.permissions (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  venue_id            uuid references public.venues(id) on delete cascade,    -- null = company-wide
  section_id          uuid references public.sections(id) on delete cascade,  -- null = whole venue
  recipe_id           uuid references public.recipes(id) on delete cascade,   -- null = whole section
  -- access
  can_view            boolean not null default false,
  can_create          boolean not null default false,
  can_edit            boolean not null default false,
  can_delete          boolean not null default false,
  -- media
  can_upload_images   boolean not null default false,
  can_upload_videos   boolean not null default false,
  can_delete_media    boolean not null default false,
  -- distribution
  can_print           boolean not null default false,
  can_share           boolean not null default false,
  can_import          boolean not null default false,
  -- costing (Phase 3)
  can_view_costs      boolean not null default false,
  can_edit_costs      boolean not null default false,
  -- admin
  can_approve_changes boolean not null default false,
  can_manage_users    boolean not null default false,
  can_view_audit_logs boolean not null default false,
  -- meta
  granted_by          uuid references public.profiles(id),
  expires_at          timestamptz,   -- optional time-limited access
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Critical composite indexes for RLS policy performance
create index idx_permissions_user_id         on public.permissions(user_id);
create index idx_permissions_user_venue      on public.permissions(user_id, venue_id);
create index idx_permissions_user_section    on public.permissions(user_id, section_id);
create index idx_permissions_user_recipe     on public.permissions(user_id, recipe_id);

comment on table public.permissions is 'Granular permission matrix. Never exposed to staff/head_chef roles. Owner role bypasses this table entirely.';
comment on column public.permissions.expires_at is 'Optional: auto-expires temporary access (e.g. guest chef, consultant).';


-- =============================================================================
-- 11. AUDIT LOGS
-- Immutable change history. Never deleted, even after user is disabled.
-- =============================================================================

create table public.audit_logs (
  id              uuid primary key default uuid_generate_v4(),
  event_type      audit_event not null,
  user_id         uuid references public.profiles(id) on delete set null,
  user_name       text not null,           -- denormalised: preserved even if user deleted
  user_role_at    user_role,               -- role at time of action
  venue_id        uuid references public.venues(id) on delete set null,
  venue_name      text,                    -- denormalised
  section_id      uuid references public.sections(id) on delete set null,
  section_name    text,                    -- denormalised
  recipe_id       uuid references public.recipes(id) on delete set null,
  recipe_title    text,                    -- denormalised
  old_value       jsonb,                   -- full before state
  new_value       jsonb,                   -- full after state
  change_summary  text not null,           -- human-readable: "Yoghurt quantity: 0.350g → 0.400g"
  ip_address      text,
  device_info     text,
  created_at      timestamptz not null default now()
);

-- Immutable: no updates or deletes allowed (enforced via RLS)
create index idx_audit_logs_user_id   on public.audit_logs(user_id);
create index idx_audit_logs_recipe_id on public.audit_logs(recipe_id);
create index idx_audit_logs_venue_id  on public.audit_logs(venue_id);
create index idx_audit_logs_created   on public.audit_logs(created_at desc);
create index idx_audit_logs_event     on public.audit_logs(event_type);

comment on table public.audit_logs is 'Immutable audit trail. Denormalised fields preserved even if related records are deleted. No RLS delete policy.';


-- =============================================================================
-- 12. NOTIFICATIONS
-- In-app, email, and Telegram notifications for owner and managers
-- =============================================================================

create table public.notifications (
  id                  uuid primary key default uuid_generate_v4(),
  recipient_user_id   uuid not null references public.profiles(id) on delete cascade,
  channel             notification_channel not null default 'in_app',
  event_type          audit_event not null,
  title               text not null,
  message             text not null,
  recipe_id           uuid references public.recipes(id) on delete set null,
  venue_id            uuid references public.venues(id) on delete set null,
  audit_log_id        uuid references public.audit_logs(id),  -- deep link to change
  is_read             boolean not null default false,
  sent_at             timestamptz,           -- null = pending delivery
  telegram_sent       boolean default false, -- tracking for n8n webhook
  created_at          timestamptz not null default now()
);

create index idx_notifications_recipient on public.notifications(recipient_user_id, is_read);
create index idx_notifications_pending   on public.notifications(telegram_sent) where telegram_sent = false;

comment on column public.notifications.telegram_sent is 'n8n polls or webhook fires when this is false. Set to true after delivery confirmation.';


-- =============================================================================
-- 13. EXCEL IMPORT BATCHES
-- Tracks each import session for review workflow
-- =============================================================================

create table public.import_batches (
  id              uuid primary key default uuid_generate_v4(),
  venue_id        uuid not null references public.venues(id),
  filename        text not null,
  file_url        text,
  total_tabs      int not null default 0,
  parsed_ok       int not null default 0,
  parsed_warnings int not null default 0,
  parsed_errors   int not null default 0,
  published_count int not null default 0,
  status          text not null default 'pending',  -- pending, in_review, published, discarded
  uploaded_by     uuid references public.profiles(id),
  reviewed_by     uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Each recipe parsed from an import batch
create table public.import_recipes (
  id              uuid primary key default uuid_generate_v4(),
  batch_id        uuid not null references public.import_batches(id) on delete cascade,
  tab_name        text not null,
  recipe_id       uuid references public.recipes(id),  -- set after publish
  parsed_data     jsonb not null,                       -- full parsed recipe before publish
  status          import_status not null default 'pending',
  warnings        text[] default '{}',
  errors          text[] default '{}',
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

create index idx_import_recipes_batch_id on public.import_recipes(batch_id);
create index idx_import_recipes_status   on public.import_recipes(status);


-- =============================================================================
-- 14. SUPPLIER PRICE LISTS (Phase 3)
-- =============================================================================

create table public.supplier_price_lists (
  id            uuid primary key default uuid_generate_v4(),
  supplier_name text not null,
  country_code  country_code,
  currency      text not null default 'BHD',
  file_url      text,
  valid_from    date,
  valid_until   date,
  is_active     boolean not null default true,
  uploaded_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.supplier_items (
  id                      uuid primary key default uuid_generate_v4(),
  supplier_price_list_id  uuid not null references public.supplier_price_lists(id) on delete cascade,
  ingredient_master_id    uuid references public.ingredient_master(id),  -- linked after matching
  raw_ingredient_name     text not null,    -- exactly as in supplier sheet
  brand                   text,
  pack_size               numeric(10,3),
  pack_unit               text,
  price_per_pack          numeric(10,4) not null,
  currency                text not null default 'BHD',
  cost_per_base_unit      numeric(12,6),    -- calculated: price / (pack_size in base unit)
  base_unit               text,             -- gr, ml, each
  is_preferred_supplier   boolean not null default false,
  last_updated            date,
  created_at              timestamptz not null default now()
);

create index idx_supplier_items_list_id    on public.supplier_items(supplier_price_list_id);
create index idx_supplier_items_master_id  on public.supplier_items(ingredient_master_id);


-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Auto-update updated_at on all tables
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at trigger to all relevant tables
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','venues','sections','recipes','recipe_steps',
    'permissions','import_batches','supplier_price_lists'
  ] loop
    execute format('
      create trigger trg_%s_updated_at
      before update on public.%s
      for each row execute function public.handle_updated_at()
    ', t, t);
  end loop;
end;
$$;


-- Auto-create profile on new Supabase auth user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- Auto-calculate recipe costing fields
create or replace function public.calculate_recipe_costs()
returns trigger language plpgsql as $$
begin
  -- misc_cost_amount = ingredient_cost * misc_cost_pct
  if new.total_ingredient_cost is not null and new.misc_cost_pct is not null then
    new.misc_cost_amount := round(new.total_ingredient_cost * new.misc_cost_pct, 4);
    new.total_cost := round(new.total_ingredient_cost + new.misc_cost_amount, 4);
  end if;

  -- cost_per_portion
  if new.total_cost is not null and new.portion_size is not null and new.portion_size > 0 then
    new.cost_per_portion := round(new.total_cost / new.portion_size, 4);
  end if;

  -- cost_percentage
  if new.cost_per_portion is not null and new.selling_price is not null and new.selling_price > 0 then
    new.cost_percentage := round(new.cost_per_portion / new.selling_price, 4);
  end if;

  return new;
end;
$$;

create trigger trg_recipe_calculate_costs
  before insert or update on public.recipes
  for each row execute function public.calculate_recipe_costs();


-- Auto-increment version_number on recipe update
create or replace function public.increment_recipe_version()
returns trigger language plpgsql as $$
begin
  if (
    old.title is distinct from new.title or
    old.description is distinct from new.description or
    old.portion_size is distinct from new.portion_size or
    old.selling_price is distinct from new.selling_price
  ) then
    new.version_number := old.version_number + 1;
  end if;
  return new;
end;
$$;

create trigger trg_recipe_version_increment
  before update on public.recipes
  for each row execute function public.increment_recipe_version();


-- =============================================================================
-- STORAGE BUCKETS (run in Supabase dashboard or via API)
-- =============================================================================

-- insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- values
--   ('recipe-images', 'recipe-images', false, 10485760,  -- 10MB max per image
--    array['image/jpeg','image/jpg','image/png','image/webp']),
--   ('recipe-videos', 'recipe-videos', false, 209715200, -- 200MB max per video
--    array['video/mp4','video/quicktime','video/webm']),
--   ('import-files',  'import-files',  false, 52428800,  -- 50MB max per Excel
--    array['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
--          'application/vnd.ms-excel']);
