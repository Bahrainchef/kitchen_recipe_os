import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { keep_id, merge_id } = await request.json().catch(() => ({}))
  if (!keep_id || !merge_id) return NextResponse.json({ error: 'keep_id and merge_id required' }, { status: 400 })
  if (keep_id === merge_id) return NextResponse.json({ error: 'Cannot merge an ingredient into itself' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try { supabase = createAdminClient() } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }

  // 1. Fetch both to get the merge_id aliases
  const [{ data: keep }, { data: merge }] = await Promise.all([
    supabase.from('ingredient_master').select('aliases').eq('id', keep_id).single(),
    supabase.from('ingredient_master').select('canonical_name, aliases').eq('id', merge_id).single(),
  ])
  if (!keep || !merge) return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })

  // 2. Re-point all recipe_ingredients from merge_id to keep_id
  await supabase.from('recipe_ingredients').update({ ingredient_master_id: keep_id }).eq('ingredient_master_id', merge_id)

  // 3. Re-point all supplier_items from merge_id to keep_id
  await supabase.from('supplier_items').update({ ingredient_master_id: keep_id }).eq('ingredient_master_id', merge_id)

  // 4. Merge aliases: keep.aliases + merge.canonical_name + merge.aliases (deduplicated)
  const mergedAliases = [...new Set([...(keep.aliases ?? []), merge.canonical_name, ...(merge.aliases ?? [])])]
  await supabase.from('ingredient_master').update({ aliases: mergedAliases, updated_at: new Date().toISOString() }).eq('id', keep_id)

  // 5. Mark merge_id as merged
  await supabase.from('ingredient_master').update({ merged_into: keep_id, updated_at: new Date().toISOString() }).eq('id', merge_id)

  return NextResponse.json({ ok: true })
}
