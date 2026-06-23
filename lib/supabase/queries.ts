import type { Venue, Section, Recipe, RecipeIngredient, RecipeStep, IngredientMaster, SupplierPriceList, SupplierItem } from '@/lib/types/database.types'
import { SEED_VENUES, SEED_SECTIONS } from '@/lib/seed-data'
import { createAdminClient } from '@/lib/supabase/admin'

function isSupabaseReady(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return !!(url && key && !url.includes('your-project-ref') && key !== 'your-service-role-key-here')
}

// All reads use the service-role (admin) client so they bypass the recursive
// RLS policy on the permissions table. This is safe because these functions
// only run in Server Components / API routes — never in the browser.
function db() {
  return createAdminClient()
}

export async function getAllVenues(): Promise<Venue[]> {
  if (!isSupabaseReady()) return SEED_VENUES
  try {
    const supabase = db()
    const { data, error } = await supabase.from('venues').select('*').eq('is_active', true).order('sort_order')
    if (error) { console.error('[queries] getAllVenues:', error.message); return SEED_VENUES }
    return data ?? SEED_VENUES
  } catch (e) { console.error('[queries] getAllVenues exception:', e); return SEED_VENUES }
}

export async function getAllSections(): Promise<Section[]> {
  if (!isSupabaseReady()) return SEED_SECTIONS
  try {
    const supabase = db()
    const { data, error } = await supabase.from('sections').select('*').eq('is_active', true).order('sort_order')
    if (error) { console.error('[queries] getAllSections:', error.message); return SEED_SECTIONS }
    return data ?? SEED_SECTIONS
  } catch (e) { console.error('[queries] getAllSections exception:', e); return SEED_SECTIONS }
}

export async function getVenueById(id: string): Promise<Venue | null> {
  const seedMatch = SEED_VENUES.find(v => v.id === id) ?? null
  if (!isSupabaseReady()) return seedMatch
  try {
    const supabase = db()
    const { data, error } = await supabase.from('venues').select('*').eq('id', id).single()
    if (error) { console.error('[queries] getVenueById:', error.message); return seedMatch }
    return data ?? seedMatch
  } catch (e) { console.error('[queries] getVenueById exception:', e); return seedMatch }
}

export async function getSectionsForVenue(venueId: string): Promise<Section[]> {
  const seedMatch = SEED_SECTIONS.filter(s => s.venue_id === venueId)
  if (!isSupabaseReady()) return seedMatch
  try {
    const supabase = db()
    const { data, error } = await supabase
      .from('sections').select('*')
      .eq('venue_id', venueId).eq('is_active', true).order('sort_order')
    if (error) { console.error('[queries] getSectionsForVenue:', error.message); return seedMatch }
    return data ?? seedMatch
  } catch (e) { console.error('[queries] getSectionsForVenue exception:', e); return seedMatch }
}

export async function getRecipesForSection(sectionId: string): Promise<Recipe[]> {
  if (!isSupabaseReady()) return []
  try {
    const supabase = db()
    const { data, error } = await supabase
      .from('recipes').select('*')
      .eq('section_id', sectionId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('title')
    if (error) { console.error('[queries] getRecipesForSection:', error.message); return [] }
    return data ?? []
  } catch (e) { console.error('[queries] getRecipesForSection exception:', e); return [] }
}

export async function getRecipesForVenue(venueId: string): Promise<Recipe[]> {
  if (!isSupabaseReady()) return []
  try {
    const supabase = db()
    const { data, error } = await supabase
      .from('recipes').select('*')
      .eq('venue_id', venueId).order('title')
    if (error) { console.error('[queries] getRecipesForVenue:', error.message); return [] }
    return data ?? []
  } catch (e) { console.error('[queries] getRecipesForVenue exception:', e); return [] }
}

export async function getRecipeCountsForVenue(venueId: string): Promise<{ total: number; bySectionId: Record<string, number> }> {
  const empty = { total: 0, bySectionId: {} }
  if (!isSupabaseReady()) return empty
  try {
    const supabase = db()
    // PostgREST has a default page cap of 1000 rows. Paginate until we get
    // fewer rows than the page size so every recipe in large venues is counted.
    const PAGE = 1000
    const bySectionId: Record<string, number> = {}
    let total = 0

    for (let offset = 0; ; offset += PAGE) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('recipes')
        .select('section_id')
        .eq('venue_id', venueId)
        .not('section_id', 'is', null)
        .range(offset, offset + PAGE - 1)

      if (error) { console.error('[queries] getRecipeCountsForVenue:', error.message); break }
      if (!data || data.length === 0) break

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const r of data as any[]) {
        if (r.section_id) {
          bySectionId[r.section_id] = (bySectionId[r.section_id] ?? 0) + 1
          total++
        }
      }

      if (data.length < PAGE) break
    }

    return { total, bySectionId }
  } catch (e) { console.error('[queries] getRecipeCountsForVenue exception:', e); return empty }
}

export async function getRecipeWithDetails(recipeId: string): Promise<{
  recipe: Recipe
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  heroPhotoUrl: string | null
} | null> {
  if (!isSupabaseReady()) return null
  try {
    const supabase = db()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [{ data: recipe, error: rErr }, { data: ingredients }, { data: steps }, { data: media }] = await Promise.all([
      supabase.from('recipes').select('*').eq('id', recipeId).single(),
      supabase.from('recipe_ingredients').select('*').eq('recipe_id', recipeId).order('sort_order'),
      supabase.from('recipe_steps').select('*').eq('recipe_id', recipeId).order('sort_order'),
      sb.from('recipe_media').select('file_url').eq('recipe_id', recipeId).eq('media_type', 'hero_image').order('sort_order').limit(1),
    ])
    if (rErr) { console.error('[queries] getRecipeWithDetails:', rErr.message); return null }
    if (!recipe) return null
    return { recipe, ingredients: ingredients ?? [], steps: steps ?? [], heroPhotoUrl: media?.[0]?.file_url ?? null }
  } catch (e) { console.error('[queries] getRecipeWithDetails exception:', e); return null }
}

export async function getHeroPhotosForRecipes(recipeIds: string[]): Promise<Record<string, string>> {
  if (!isSupabaseReady() || recipeIds.length === 0) return {}
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (db() as any)
      .from('recipe_media')
      .select('recipe_id, file_url')
      .in('recipe_id', recipeIds)
      .eq('media_type', 'hero_image')
      .order('sort_order')
    const map: Record<string, string> = {}
    for (const m of data ?? []) {
      if (m.recipe_id && !map[m.recipe_id]) map[m.recipe_id] = m.file_url
    }
    return map
  } catch (e) { console.error('[queries] getHeroPhotosForRecipes exception:', e); return {} }
}

export interface RecipeStub {
  id: string
  title: string
  section_id: string
  section_name: string
}

export async function getRecipeStubsForVenue(venueId: string): Promise<RecipeStub[]> {
  if (!isSupabaseReady()) return []
  try {
    const sb = db() as any
    const [{ data: recipes }, { data: sections }] = await Promise.all([
      sb.from('recipes').select('id, title, section_id').eq('venue_id', venueId).neq('status', 'archived').order('title'),
      sb.from('sections').select('id, name').eq('venue_id', venueId).eq('is_active', true),
    ])
    const sectionMap = new Map<string, string>((sections ?? []).map((s: any) => [s.id, s.name]))
    return (recipes ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      section_id: r.section_id ?? '',
      section_name: sectionMap.get(r.section_id ?? '') ?? 'Unknown',
    }))
  } catch (e) { console.error('[queries] getRecipeStubsForVenue exception:', e); return [] }
}

// ─── Ingredient Master ────────────────────────────────────────────────────────

export interface IngredientWithUsage extends IngredientMaster {
  recipe_count: number
  venue_ids: string[]
}

export async function getIngredientMasterWithUsage(): Promise<IngredientWithUsage[]> {
  if (!isSupabaseReady()) return []
  try {
    const supabase = db()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    // Paginate ingredient_master — library will grow beyond 1000 rows
    const allIngredients: any[] = []
    for (let offset = 0; ; offset += 1000) {
      const { data: page, error: pageErr } = await sb
        .from('ingredient_master')
        .select('*')
        .is('merged_into', null)
        .order('canonical_name')
        .range(offset, offset + 999)
      if (pageErr) { console.error('[queries] getIngredientMasterWithUsage:', pageErr.message); return [] }
      if (!page || page.length === 0) break
      allIngredients.push(...page)
      if (page.length < 1000) break
    }

    const [{ data: riRows }, { data: recipeRows }] = await Promise.all([
      sb.from('recipe_ingredients').select('ingredient_master_id, recipe_id').not('ingredient_master_id', 'is', null),
      sb.from('recipes').select('id, venue_id').neq('status', 'archived'),
    ])
    const venueByRecipe = new Map<string, string>()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (recipeRows ?? []) as any[]) venueByRecipe.set(r.id, r.venue_id)

    const usageMap = new Map<string, { recipes: Set<string>; venues: Set<string> }>()
    for (const ri of riRows ?? []) {
      if (!ri.ingredient_master_id) continue
      const entry = usageMap.get(ri.ingredient_master_id) ?? { recipes: new Set(), venues: new Set() }
      entry.recipes.add(ri.recipe_id)
      const vid = venueByRecipe.get(ri.recipe_id)
      if (vid) entry.venues.add(vid)
      usageMap.set(ri.ingredient_master_id, entry)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (allIngredients ?? [] as any[]).map((ing: any) => {
      const u = usageMap.get(ing.id)
      return { ...ing, recipe_count: u?.recipes.size ?? 0, venue_ids: u ? [...u.venues] : [] } as IngredientWithUsage
    })
  } catch (e) { console.error('[queries] getIngredientMasterWithUsage exception:', e); return [] }
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export interface SupplierWithItems extends SupplierPriceList {
  items: SupplierItem[]
}

export async function getSupplierPriceListsWithItems(): Promise<SupplierWithItems[]> {
  if (!isSupabaseReady()) return []
  try {
    const supabase = db()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any
    const [{ data: lists, error }, { data: items }] = await Promise.all([
      sb.from('supplier_price_lists').select('*').order('supplier_name'),
      sb.from('supplier_items').select('*').order('raw_ingredient_name'),
    ])
    if (error) { console.error('[queries] getSupplierPriceListsWithItems:', error.message); return [] }
    const itemsByList = new Map<string, SupplierItem[]>()
    for (const item of items ?? []) {
      const list = itemsByList.get(item.supplier_price_list_id) ?? []
      list.push(item)
      itemsByList.set(item.supplier_price_list_id, list)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (lists ?? [] as any[]).map((l: any) => ({ ...l, items: itemsByList.get(l.id) ?? [] } as SupplierWithItems))
  } catch (e) { console.error('[queries] getSupplierPriceListsWithItems exception:', e); return [] }
}

// ─── Costs ────────────────────────────────────────────────────────────────────

export interface RecipeWithCost {
  id: string
  venue_id: string
  title: string
  cost_percentage: number | null
  cost_per_portion: number | null
  selling_price: number | null
  total_cost: number | null
  status: string
}

export async function getRecipeCostData(): Promise<RecipeWithCost[]> {
  if (!isSupabaseReady()) return []
  try {
    const supabase = db()
    const { data, error } = await supabase
      .from('recipes')
      .select('id, venue_id, title, cost_percentage, cost_per_portion, selling_price, total_cost, status')
      .neq('status', 'archived')
      .order('cost_percentage', { ascending: false })
    if (error) { console.error('[queries] getRecipeCostData:', error.message); return [] }
    return data ?? []
  } catch (e) { console.error('[queries] getRecipeCostData exception:', e); return [] }
}
