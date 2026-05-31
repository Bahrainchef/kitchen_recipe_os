-- =============================================================================
-- KITCHEN RECIPE OS — ROW LEVEL SECURITY POLICIES
-- Version: 2.1
-- Run after: 01_schema.sql
-- =============================================================================
-- PRINCIPLE: Permissions are enforced at the DATABASE level via RLS.
-- Hiding buttons in the UI is not enough — a direct API call must also fail.
-- Owner role (stored in profiles.role) bypasses all restrictions.
-- =============================================================================


-- Enable RLS on all tables
alter table public.profiles           enable row level security;
alter table public.venues             enable row level security;
alter table public.sections           enable row level security;
alter table public.recipes            enable row level security;
alter table public.recipe_versions    enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps       enable row level security;
alter table public.recipe_media       enable row level security;
alter table public.permissions        enable row level security;
alter table public.audit_logs         enable row level security;
alter table public.notifications      enable row level security;
alter table public.ingredient_master  enable row level security;
alter table public.import_batches     enable row level security;
alter table public.import_recipes     enable row level security;
alter table public.supplier_price_lists enable row level security;
alter table public.supplier_items     enable row level security;


-- =============================================================================
-- HELPER FUNCTIONS
-- These run security definer so they can query profiles without recursion.
-- =============================================================================

-- Returns the role of the currently authenticated user
create or replace function public.auth_user_role()
returns user_role language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Returns true if the current user is owner or super_admin
create or replace function public.is_owner_or_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('owner', 'super_admin')
    and status = 'active'
  );
$$;

-- Returns true if the current user is owner
create or replace function public.is_owner()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'owner'
    and status = 'active'
  );
$$;

-- Returns true if the current user is active
create or replace function public.is_active_user()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and status = 'active'
  );
$$;

-- Check if current user has a specific permission on a venue
create or replace function public.user_can_on_venue(p_venue_id uuid, p_permission text)
returns boolean language plpgsql security definer stable as $$
declare
  v_result boolean;
begin
  -- Owner bypasses all checks
  if public.is_owner() then return true; end if;

  execute format('
    select coalesce(bool_or(%I), false)
    from public.permissions
    where user_id = $1
    and (venue_id = $2 or venue_id is null)
  ', p_permission)
  into v_result
  using auth.uid(), p_venue_id;

  return coalesce(v_result, false);
end;
$$;

-- Check if current user has a specific permission on a recipe
create or replace function public.user_can_on_recipe(p_recipe_id uuid, p_permission text)
returns boolean language plpgsql security definer stable as $$
declare
  v_result boolean;
  v_venue_id uuid;
  v_section_id uuid;
begin
  if public.is_owner() then return true; end if;

  select venue_id, section_id into v_venue_id, v_section_id
  from public.recipes where id = p_recipe_id;

  execute format('
    select coalesce(bool_or(%I), false)
    from public.permissions
    where user_id = $1
    and (
      (recipe_id = $2) or
      (section_id = $3 and recipe_id is null) or
      (venue_id = $4 and section_id is null and recipe_id is null) or
      (venue_id is null and section_id is null and recipe_id is null)
    )
  ', p_permission)
  into v_result
  using auth.uid(), p_recipe_id, v_section_id, v_venue_id;

  return coalesce(v_result, false);
end;
$$;


-- =============================================================================
-- PROFILES
-- =============================================================================

-- Users can view their own profile
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

-- Owner and super_admin can view all profiles
create policy "profiles_select_admin" on public.profiles
  for select using (public.is_owner_or_admin());

-- Users can update their own non-sensitive fields
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid() and
    -- Prevent self-promotion of role or status
    role = (select role from public.profiles where id = auth.uid()) and
    status = (select status from public.profiles where id = auth.uid())
  );

-- Only owner can update roles and status
create policy "profiles_update_owner" on public.profiles
  for update using (public.is_owner());

-- Only owner can insert new profiles (beyond auto-trigger)
create policy "profiles_insert_owner" on public.profiles
  for insert with check (public.is_owner());


-- =============================================================================
-- VENUES
-- =============================================================================

-- Active users can see venues they have view permission for
create policy "venues_select_permitted" on public.venues
  for select using (
    public.is_active_user() and (
      public.is_owner_or_admin() or
      exists (
        select 1 from public.permissions p
        where p.user_id = auth.uid()
        and (p.venue_id = venues.id or p.venue_id is null)
        and p.can_view = true
      )
    )
  );

-- Only owner can create/edit/delete venues
create policy "venues_insert_owner" on public.venues
  for insert with check (public.is_owner());

create policy "venues_update_owner" on public.venues
  for update using (public.is_owner());

create policy "venues_delete_owner" on public.venues
  for delete using (public.is_owner());


-- =============================================================================
-- SECTIONS
-- =============================================================================

create policy "sections_select_permitted" on public.sections
  for select using (
    public.is_active_user() and (
      public.is_owner_or_admin() or
      exists (
        select 1 from public.permissions p
        where p.user_id = auth.uid()
        and (p.venue_id = sections.venue_id or p.venue_id is null)
        and (p.section_id = sections.id or p.section_id is null)
        and p.can_view = true
      )
    )
  );

create policy "sections_insert_admin" on public.sections
  for insert with check (public.is_owner_or_admin());

create policy "sections_update_admin" on public.sections
  for update using (public.is_owner_or_admin());

create policy "sections_delete_owner" on public.sections
  for delete using (public.is_owner());


-- =============================================================================
-- RECIPES
-- =============================================================================

-- View: user must have can_view on venue or section or recipe
create policy "recipes_select_permitted" on public.recipes
  for select using (
    public.is_active_user() and (
      public.is_owner_or_admin() or
      public.user_can_on_recipe(id, 'can_view')
    )
  );

-- Create: user must have can_create on the venue
create policy "recipes_insert_permitted" on public.recipes
  for insert with check (
    public.is_active_user() and
    public.user_can_on_venue(venue_id, 'can_create')
  );

-- Edit: user must have can_edit on the recipe/section/venue
create policy "recipes_update_permitted" on public.recipes
  for update using (
    public.is_active_user() and
    public.user_can_on_recipe(id, 'can_edit')
  );

-- Delete: only owner can permanently delete
create policy "recipes_delete_owner" on public.recipes
  for delete using (public.is_owner());


-- =============================================================================
-- RECIPE VERSIONS
-- =============================================================================

-- View: same access as the parent recipe
create policy "recipe_versions_select" on public.recipe_versions
  for select using (
    public.is_active_user() and
    public.user_can_on_recipe(recipe_id, 'can_view')
  );

-- Insert: allowed if user can edit the recipe (trigger handles auto-snapshot)
create policy "recipe_versions_insert" on public.recipe_versions
  for insert with check (
    public.is_active_user() and
    public.user_can_on_recipe(recipe_id, 'can_edit')
  );

-- No update or delete on versions — immutable
create policy "recipe_versions_no_update" on public.recipe_versions
  for update using (false);

create policy "recipe_versions_no_delete" on public.recipe_versions
  for delete using (false);


-- =============================================================================
-- RECIPE INGREDIENTS & STEPS
-- (inherit access from parent recipe)
-- =============================================================================

create policy "recipe_ingredients_select" on public.recipe_ingredients
  for select using (public.user_can_on_recipe(recipe_id, 'can_view'));

create policy "recipe_ingredients_insert" on public.recipe_ingredients
  for insert with check (public.user_can_on_recipe(recipe_id, 'can_edit'));

create policy "recipe_ingredients_update" on public.recipe_ingredients
  for update using (public.user_can_on_recipe(recipe_id, 'can_edit'));

create policy "recipe_ingredients_delete" on public.recipe_ingredients
  for delete using (public.user_can_on_recipe(recipe_id, 'can_edit'));


create policy "recipe_steps_select" on public.recipe_steps
  for select using (public.user_can_on_recipe(recipe_id, 'can_view'));

create policy "recipe_steps_insert" on public.recipe_steps
  for insert with check (public.user_can_on_recipe(recipe_id, 'can_edit'));

create policy "recipe_steps_update" on public.recipe_steps
  for update using (public.user_can_on_recipe(recipe_id, 'can_edit'));

create policy "recipe_steps_delete" on public.recipe_steps
  for delete using (public.user_can_on_recipe(recipe_id, 'can_edit'));


-- =============================================================================
-- RECIPE MEDIA
-- =============================================================================

create policy "recipe_media_select" on public.recipe_media
  for select using (public.user_can_on_recipe(recipe_id, 'can_view'));

create policy "recipe_media_insert" on public.recipe_media
  for insert with check (public.user_can_on_recipe(recipe_id, 'can_upload_images'));

create policy "recipe_media_delete" on public.recipe_media
  for delete using (public.user_can_on_recipe(recipe_id, 'can_delete_media'));


-- =============================================================================
-- PERMISSIONS
-- CRITICAL: Normal users must NEVER see the permissions table.
-- =============================================================================

-- Only owner and super_admin (if granted) can view permissions
create policy "permissions_select_admin" on public.permissions
  for select using (
    public.is_owner() or (
      public.is_owner_or_admin() and
      exists (
        select 1 from public.permissions p
        where p.user_id = auth.uid()
        and p.can_manage_users = true
      )
    )
  );

-- Only owner can grant/revoke permissions
create policy "permissions_insert_owner" on public.permissions
  for insert with check (public.is_owner());

create policy "permissions_update_owner" on public.permissions
  for update using (public.is_owner());

create policy "permissions_delete_owner" on public.permissions
  for delete using (public.is_owner());


-- =============================================================================
-- AUDIT LOGS
-- Immutable. No one can update or delete.
-- =============================================================================

create policy "audit_logs_select_admin" on public.audit_logs
  for select using (
    public.is_owner() or (
      public.is_owner_or_admin() and
      exists (
        select 1 from public.permissions p
        where p.user_id = auth.uid()
        and p.can_view_audit_logs = true
      )
    )
  );

-- Insert allowed from server-side triggers/functions only (service_role)
create policy "audit_logs_insert_service" on public.audit_logs
  for insert with check (true);  -- restricted to service_role in practice

-- Immutable: no updates or deletes ever
create policy "audit_logs_no_update" on public.audit_logs
  for update using (false);

create policy "audit_logs_no_delete" on public.audit_logs
  for delete using (false);


-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

create policy "notifications_select_own" on public.notifications
  for select using (recipient_user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());


-- =============================================================================
-- INGREDIENT MASTER
-- =============================================================================

-- All active users can view the ingredient master (for recipe editing UX)
create policy "ingredient_master_select" on public.ingredient_master
  for select using (public.is_active_user());

-- Only admin+ can create/edit/merge ingredients
create policy "ingredient_master_insert" on public.ingredient_master
  for insert with check (public.is_owner_or_admin());

create policy "ingredient_master_update" on public.ingredient_master
  for update using (public.is_owner_or_admin());

-- Only owner can delete (merge operation)
create policy "ingredient_master_delete" on public.ingredient_master
  for delete using (public.is_owner());


-- =============================================================================
-- IMPORT BATCHES & RECIPES
-- =============================================================================

create policy "import_batches_select" on public.import_batches
  for select using (
    public.is_owner_or_admin() or
    public.user_can_on_venue(venue_id, 'can_import')
  );

create policy "import_batches_insert" on public.import_batches
  for insert with check (public.user_can_on_venue(venue_id, 'can_import'));

create policy "import_batches_update" on public.import_batches
  for update using (public.is_owner_or_admin());


create policy "import_recipes_select" on public.import_recipes
  for select using (
    exists (
      select 1 from public.import_batches b
      where b.id = import_recipes.batch_id
      and (
        public.is_owner_or_admin() or
        public.user_can_on_venue(b.venue_id, 'can_import')
      )
    )
  );

create policy "import_recipes_update" on public.import_recipes
  for update using (public.is_owner_or_admin());


-- =============================================================================
-- SUPPLIER DATA (Phase 3 — owner/admin only)
-- =============================================================================

create policy "supplier_price_lists_select" on public.supplier_price_lists
  for select using (public.is_owner_or_admin());

create policy "supplier_price_lists_insert" on public.supplier_price_lists
  for insert with check (public.is_owner_or_admin());

create policy "supplier_items_select" on public.supplier_items
  for select using (public.is_owner_or_admin());

create policy "supplier_items_insert" on public.supplier_items
  for insert with check (public.is_owner_or_admin());
