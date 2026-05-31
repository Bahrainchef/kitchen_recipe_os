// Shared types used by ImportClient and the /api/import route.
// The actual database writes happen in app/api/import/route.ts using the
// service role key so they bypass RLS.

import type { ParsedIngredient } from '@/lib/excel/parser'

export interface RecipePayload {
  tab_name: string
  venue_id: string
  section_id: string | null
  title: string
  portion_size: number | null
  recipe_size: number | null
  selling_price: number | null
  total_cost: number | null
  cost_per_portion: number | null
  ingredients: ParsedIngredient[]
  steps: string[]
}

export interface PublishResult {
  tab_name: string
  success: boolean
  recipe_id?: string
  error?: string
}
