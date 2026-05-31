import type { Venue, Section, Recipe, RecipeIngredient, RecipeStep } from '@/lib/types/database.types'
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
      .eq('section_id', sectionId).order('title')
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
