// Auto-generated TypeScript types from Kitchen Recipe OS schema v2.1
// Mirrors: 01_schema.sql enums and table definitions

export type UserRole =
  | 'owner'
  | 'super_admin'
  | 'operations_manager'
  | 'venue_manager'
  | 'head_chef'
  | 'section_manager'
  | 'staff'

export type UserStatus = 'active' | 'disabled'

export type RecipeStatus = 'draft' | 'pending_review' | 'published' | 'archived'

export type MediaType =
  | 'hero_image'
  | 'gallery_image'
  | 'step_image'
  | 'recipe_video'
  | 'step_video'

export type VenueType = 'physical' | 'pastry_hub'

export type CountryCode = 'BH' | 'SA'

export type NotificationChannel = 'in_app' | 'email' | 'telegram'

export type AuditEvent =
  | 'recipe_created'
  | 'recipe_edited'
  | 'recipe_deleted'
  | 'recipe_restored'
  | 'recipe_published'
  | 'recipe_archived'
  | 'ingredient_changed'
  | 'quantity_changed'
  | 'unit_changed'
  | 'method_step_changed'
  | 'photo_uploaded'
  | 'photo_deleted'
  | 'video_uploaded'
  | 'video_deleted'
  | 'cost_changed'
  | 'selling_price_changed'
  | 'permission_changed'
  | 'user_access_removed'
  | 'user_disabled'
  | 'excel_import_completed'
  | 'excel_import_published'
  | 'ingredient_master_merged'

export type IngredientCategory =
  | 'dairy'
  | 'proteins'
  | 'vegetables'
  | 'herbs_spices'
  | 'oils_fats'
  | 'dry_goods'
  | 'beverages'
  | 'sauces_condiments'
  | 'fruits'
  | 'bakery'
  | 'seafood'
  | 'other'

export type ImportStatus =
  | 'pending'
  | 'ok'
  | 'warning'
  | 'error'
  | 'published'
  | 'discarded'

export type PrintViewType =
  | 'full_with_photo'
  | 'kitchen_quick'
  | 'training_sop'
  | 'cost_hidden'
  | 'cost_visible_manager'

// ─── Table row types ────────────────────────────────────────────────────────

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  status: UserStatus
  avatar_url: string | null
  phone: string | null
  telegram_chat_id: string | null
  notes: string | null
  disabled_at: string | null
  disabled_by: string | null
  created_at: string
  updated_at: string
}

export interface Venue {
  id: string
  name: string
  short_name: string | null
  description: string | null
  venue_type: VenueType
  country_code: CountryCode | null
  city: string | null
  logo_url: string | null
  cover_image_url: string | null
  brand_guidelines_url: string | null
  menu_url: string | null
  theme_color: string
  vat_rate: number
  is_active: boolean
  sort_order: number
  brand_group: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  venue_id: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface IngredientMaster {
  id: string
  canonical_name: string
  category: string | null
  default_unit: string | null
  default_unit_size: number | null
  aliases: string[]
  is_reviewed: boolean
  merged_into: string | null
  notes: string | null
  kcal_per_100g: number | null
  pastry_notes: string | null
  venue_id: string | null
  created_at: string
  updated_at: string
}

export interface Recipe {
  id: string
  venue_id: string
  section_id: string | null
  title: string
  sort_order?: number
  description: string | null
  portion_size: number | null
  recipe_size: number
  total_ingredient_weight: number | null
  total_ingredient_cost: number | null
  misc_cost_pct: number | null
  misc_cost_amount: number | null
  total_cost: number | null
  cost_per_portion: number | null
  selling_price: number | null
  cost_percentage: number | null
  status: RecipeStatus
  version_number: number
  is_master_recipe: boolean
  tags: string[]
  excel_source_file: string | null
  excel_source_tab: string | null
  created_by: string | null
  updated_by: string | null
  published_by: string | null
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface RecipeVersion {
  id: string
  recipe_id: string
  version_number: number
  title: string
  description: string | null
  portion_size: number | null
  total_ingredient_cost: number | null
  selling_price: number | null
  ingredients_snapshot: Record<string, unknown>
  steps_snapshot: Record<string, unknown>
  change_summary: string | null
  changed_by: string | null
  created_at: string
}

export interface RecipeIngredient {
  id: string
  recipe_id: string
  ingredient_master_id: string | null
  group_name: string | null
  quantity: number | null
  unit: string | null
  ingredient_name: string
  preparation_note: string | null
  raw_ingredient_text: string | null
  cost_per_unit: number | null
  line_cost: number | null
  sort_order: number
}

export interface RecipeStep {
  id: string
  recipe_id: string
  step_number: number
  sort_order: number
  instruction: string
  created_at: string
  updated_at: string
}

export interface RecipeMedia {
  id: string
  recipe_id: string
  step_id: string | null
  media_type: MediaType
  is_external: boolean
  file_url: string
  external_url: string | null
  file_size_kb: number | null
  mime_type: string | null
  caption: string | null
  sort_order: number
  uploaded_by: string | null
  created_at: string
}

export interface Permission {
  id: string
  user_id: string
  venue_id: string | null
  section_id: string | null
  recipe_id: string | null
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  can_upload_images: boolean
  can_upload_videos: boolean
  can_delete_media: boolean
  can_print: boolean
  can_share: boolean
  can_import: boolean
  can_view_costs: boolean
  can_edit_costs: boolean
  can_approve_changes: boolean
  can_manage_users: boolean
  can_view_audit_logs: boolean
  granted_by: string | null
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  event_type: AuditEvent
  user_id: string | null
  user_name: string
  user_role_at: UserRole | null
  venue_id: string | null
  venue_name: string | null
  section_id: string | null
  section_name: string | null
  recipe_id: string | null
  recipe_title: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  change_summary: string
  ip_address: string | null
  device_info: string | null
  created_at: string
}

export interface Notification {
  id: string
  recipient_user_id: string
  channel: NotificationChannel
  event_type: AuditEvent
  title: string
  message: string
  recipe_id: string | null
  venue_id: string | null
  audit_log_id: string | null
  is_read: boolean
  sent_at: string | null
  telegram_sent: boolean
  created_at: string
}

export interface ImportBatch {
  id: string
  venue_id: string
  filename: string
  file_url: string | null
  total_tabs: number
  parsed_ok: number
  parsed_warnings: number
  parsed_errors: number
  published_count: number
  status: string
  uploaded_by: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

export interface ImportRecipe {
  id: string
  batch_id: string
  tab_name: string
  recipe_id: string | null
  parsed_data: Record<string, unknown>
  status: ImportStatus
  warnings: string[]
  errors: string[]
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface SupplierPriceList {
  id: string
  supplier_name: string
  country_code: CountryCode | null
  currency: string
  file_url: string | null
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  uploaded_by: string | null
  created_at: string
  updated_at: string
}

export interface SupplierItem {
  id: string
  supplier_price_list_id: string
  ingredient_master_id: string | null
  raw_ingredient_name: string
  brand: string | null
  pack_size: number | null
  pack_unit: string | null
  price_per_pack: number
  currency: string
  cost_per_base_unit: number | null
  base_unit: string | null
  is_preferred_supplier: boolean
  last_updated: string | null
  created_at: string
}

// ─── Database helper type ────────────────────────────────────────────────────
// Matches @supabase/supabase-js v2 GenericSchema: Tables need Relationships[],
// schema needs Views and Functions.
//
// Insert types use Partial<> for fields that have DB-level defaults (status,
// version_number, is_master_recipe, tags) so callers don't need to provide them.

type RecipeInsert = {
  venue_id: string
  title: string
  section_id?: string | null
  description?: string | null
  portion_size?: number | null
  recipe_size?: number
  total_ingredient_weight?: number | null
  total_ingredient_cost?: number | null
  misc_cost_pct?: number | null
  misc_cost_amount?: number | null
  total_cost?: number | null
  cost_per_portion?: number | null
  selling_price?: number | null
  cost_percentage?: number | null
  status?: RecipeStatus
  version_number?: number
  is_master_recipe?: boolean
  tags?: string[]
  excel_source_file?: string | null
  excel_source_tab?: string | null
  created_by?: string | null
  updated_by?: string | null
  published_by?: string | null
  published_at?: string | null
}

type RecipeIngredientInsert = {
  recipe_id: string
  ingredient_name: string
  ingredient_master_id?: string | null
  group_name?: string | null
  quantity?: number | null
  unit?: string | null
  preparation_note?: string | null
  raw_ingredient_text?: string | null
  cost_per_unit?: number | null
  line_cost?: number | null
  sort_order?: number
}

type RecipeStepInsert = {
  recipe_id: string
  step_number: number
  sort_order?: number
  instruction: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Profile>
        Relationships: []
      }
      venues: {
        Row: Venue
        Insert: Omit<Venue, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Venue>
        Relationships: []
      }
      sections: {
        Row: Section
        Insert: Omit<Section, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Section>
        Relationships: []
      }
      ingredient_master: {
        Row: IngredientMaster
        Insert: Omit<IngredientMaster, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<IngredientMaster>
        Relationships: []
      }
      recipes: {
        Row: Recipe
        Insert: RecipeInsert
        Update: Partial<Recipe>
        Relationships: []
      }
      recipe_versions: {
        Row: RecipeVersion
        Insert: Omit<RecipeVersion, 'id' | 'created_at'>
        Update: never
        Relationships: []
      }
      recipe_ingredients: {
        Row: RecipeIngredient
        Insert: RecipeIngredientInsert
        Update: Partial<RecipeIngredient>
        Relationships: []
      }
      recipe_steps: {
        Row: RecipeStep
        Insert: RecipeStepInsert
        Update: Partial<RecipeStep>
        Relationships: []
      }
      recipe_media: {
        Row: RecipeMedia
        Insert: Omit<RecipeMedia, 'id' | 'created_at'>
        Update: Partial<RecipeMedia>
        Relationships: []
      }
      permissions: {
        Row: Permission
        Insert: Omit<Permission, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Permission>
        Relationships: []
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: never
        Relationships: []
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Notification>
        Relationships: []
      }
      import_batches: {
        Row: ImportBatch
        Insert: Omit<ImportBatch, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<ImportBatch>
        Relationships: []
      }
      import_recipes: {
        Row: ImportRecipe
        Insert: Omit<ImportRecipe, 'id' | 'created_at'>
        Update: Partial<ImportRecipe>
        Relationships: []
      }
      supplier_price_lists: {
        Row: SupplierPriceList
        Insert: Omit<SupplierPriceList, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<SupplierPriceList>
        Relationships: []
      }
      supplier_items: {
        Row: SupplierItem
        Insert: Omit<SupplierItem, 'id' | 'created_at'>
        Update: Partial<SupplierItem>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      user_role: UserRole
      user_status: UserStatus
      recipe_status: RecipeStatus
      media_type: MediaType
      venue_type: VenueType
      country_code: CountryCode
      notification_channel: NotificationChannel
      audit_event: AuditEvent
      ingredient_category: IngredientCategory
      import_status: ImportStatus
      print_view_type: PrintViewType
    }
    CompositeTypes: { [_ in never]: never }
  }
}
