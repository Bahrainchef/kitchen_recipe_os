import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RecipePayload, PublishResult } from '@/app/import/actions'

export async function POST(request: NextRequest) {
  let recipes: RecipePayload[]
  try {
    recipes = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!Array.isArray(recipes) || recipes.length === 0) {
    return NextResponse.json({ error: 'No recipes provided' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try {
    supabase = createAdminClient()
  } catch (e) {
    return NextResponse.json(
      recipes.map((r): PublishResult => ({
        tab_name: r.tab_name,
        success: false,
        error: String(e),
      })),
      { status: 500 }
    )
  }

  const results: PublishResult[] = []

  for (const r of recipes) {
    try {
      let recipeId: string

      if (r.replace_recipe_id) {
        // ── Replace mode: update the existing recipe row in-place ───────────
        const { error: uErr } = await supabase
          .from('recipes')
          .update({
            section_id: r.section_id,
            title: r.title,
            portion_size: r.portion_size,
            recipe_size: r.recipe_size ?? 1,
            selling_price: r.selling_price,
            total_cost: r.total_cost,
            cost_per_portion: r.cost_per_portion,
            status: 'draft',
            excel_source_tab: r.tab_name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', r.replace_recipe_id)
        if (uErr) throw new Error(uErr.message)

        // Clear old ingredients and steps before re-inserting
        const [{ error: diErr }, { error: dsErr }] = await Promise.all([
          supabase.from('recipe_ingredients').delete().eq('recipe_id', r.replace_recipe_id),
          supabase.from('recipe_steps').delete().eq('recipe_id', r.replace_recipe_id),
        ])
        if (diErr) throw new Error(`Clear ingredients: ${diErr.message}`)
        if (dsErr) throw new Error(`Clear steps: ${dsErr.message}`)

        recipeId = r.replace_recipe_id
      } else {
        // ── Insert mode: create a new recipe row ────────────────────────────
        const { data: recipe, error: rErr } = await supabase
          .from('recipes')
          .insert({
            venue_id: r.venue_id,
            section_id: r.section_id,
            title: r.title,
            portion_size: r.portion_size,
            recipe_size: r.recipe_size ?? 1,
            selling_price: r.selling_price,
            total_cost: r.total_cost,
            cost_per_portion: r.cost_per_portion,
            status: 'draft',
            excel_source_tab: r.tab_name,
          })
          .select('id')
          .single()

        if (rErr || !recipe) throw new Error(rErr?.message ?? 'Recipe insert failed')
        recipeId = recipe.id
      }

      // 2. Insert ingredients (skip rows with no name)
      const validIngredients = r.ingredients.filter(i => i.name.trim())
      if (validIngredients.length > 0) {
        const { error: iErr } = await supabase.from('recipe_ingredients').insert(
          validIngredients.map((ing, idx) => ({
            recipe_id: recipeId,
            ingredient_name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            preparation_note: ing.prep_note ?? null,
            group_name: ing.group_name ?? null,
            sort_order: idx,
          }))
        )
        if (iErr) throw new Error(`Ingredients: ${iErr.message}`)
      }

      // 3. Insert method steps (skip blank lines)
      const validSteps = r.steps.filter(s => s.trim())
      if (validSteps.length > 0) {
        const { error: sErr } = await supabase.from('recipe_steps').insert(
          validSteps.map((instruction, idx) => ({
            recipe_id: recipeId,
            step_number: idx + 1,
            sort_order: idx,
            instruction,
          }))
        )
        if (sErr) throw new Error(`Steps: ${sErr.message}`)
      }

      results.push({ tab_name: r.tab_name, success: true, recipe_id: recipeId, replaced: !!r.replace_recipe_id })
    } catch (e) {
      results.push({ tab_name: r.tab_name, success: false, error: String(e) })
    }
  }

  return NextResponse.json(results)
}
