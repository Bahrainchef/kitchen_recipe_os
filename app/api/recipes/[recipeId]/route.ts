import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface IngredientPayload {
  group_name: string | null
  quantity: number | null
  unit: string | null
  ingredient_name: string
  preparation_note: string | null
}

interface StepPayload {
  instruction: string
}

interface RecipePatch {
  title?: string
  description?: string | null
  portion_size?: number | null
  selling_price?: number | null
  status?: string
  ingredients?: IngredientPayload[]
  steps?: StepPayload[]
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const { recipeId } = await params

  let body: RecipePatch
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createAdminClient() as any

  // Update recipe row
  const recipeUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title        !== undefined) recipeUpdate.title         = body.title
  if (body.description  !== undefined) recipeUpdate.description   = body.description
  if (body.portion_size !== undefined) recipeUpdate.portion_size  = body.portion_size
  if (body.selling_price !== undefined) recipeUpdate.selling_price = body.selling_price
  if (body.status       !== undefined) recipeUpdate.status        = body.status

  const { data: recipe, error: rErr } = await sb
    .from('recipes').update(recipeUpdate).eq('id', recipeId).select().single()
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  // Replace ingredients
  if (body.ingredients !== undefined) {
    await sb.from('recipe_ingredients').delete().eq('recipe_id', recipeId)
    if (body.ingredients.length > 0) {
      const { error: iErr } = await sb.from('recipe_ingredients').insert(
        body.ingredients.map((ing, idx) => ({
          recipe_id: recipeId,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit || null,
          preparation_note: ing.preparation_note || null,
          group_name: ing.group_name || null,
          sort_order: idx,
        }))
      )
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 })
    }
  }

  // Replace steps
  if (body.steps !== undefined) {
    await sb.from('recipe_steps').delete().eq('recipe_id', recipeId)
    if (body.steps.length > 0) {
      const { error: sErr } = await sb.from('recipe_steps').insert(
        body.steps.map((step, idx) => ({
          recipe_id: recipeId,
          step_number: idx + 1,
          sort_order: idx,
          instruction: step.instruction,
        }))
      )
      if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ recipe })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const { recipeId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createAdminClient() as any

  // Remove storage files (best-effort — ignore errors)
  const { data: files } = await sb.storage.from('recipe-images').list(`recipes/${recipeId}`)
  if (files?.length) {
    const paths = files.map((f: { name: string }) => `recipes/${recipeId}/${f.name}`)
    await sb.storage.from('recipe-images').remove(paths)
  }

  // Delete child records first
  await sb.from('recipe_media').delete().eq('recipe_id', recipeId)
  await sb.from('recipe_steps').delete().eq('recipe_id', recipeId)
  await sb.from('recipe_ingredients').delete().eq('recipe_id', recipeId)

  const { error } = await sb.from('recipes').delete().eq('id', recipeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
