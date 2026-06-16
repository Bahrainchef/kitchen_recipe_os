/**
 * Migrate recipes from Recipem8 → Kitchen Recipe OS
 * Run: node scripts/migrate-recipem8.mjs
 */

import { createClient } from '@supabase/supabase-js'

// ── Clients ───────────────────────────────────────────────────────────────────
const R = createClient(
  'https://jodiqledxememlrbqitd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGlxbGVkeGVtZW1scmJxaXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTE0MjUsImV4cCI6MjA5MzIyNzQyNX0.pYRkM5xTuTdX9XGcvXOcR133HN3_pXHhpqEfQ11r6GQ'
)

const K = createClient(
  'https://vuxpsnjbciyowpkbgwlv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eHBzbmpiY2l5b3dwa2Jnd2x2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk3MjIxOCwiZXhwIjoyMDk0NTQ4MjE4fQ.FSAd55gTFHxtPTRyQJvmn_juxApvImTna9hc7_qmCpM'
)

// ── Target assignments ────────────────────────────────────────────────────────
const VENUE_ID    = 'a1000000-0000-0000-0000-000000000009' // One Team One Dream
const SEC_INDIAN  = 'd0000000-0000-0000-0000-000000000005'
const SEC_LEB_IR  = 'd0000000-0000-0000-0000-000000000003'
const SEC_SALADS  = 'd0000000-0000-0000-0000-000000000010'

// ── Ingredient parser ─────────────────────────────────────────────────────────
// Handles: "350gr red onions, sliced"  "2 each bay leaves"  "[Section Header]"
function parseIngredient(raw, idx) {
  const s = raw.trim()
  if (!s) return null

  // Section headers like "[Biriyani Rice]" → use as group_name marker (skip as ingredient)
  if (s.startsWith('[') && s.endsWith(']')) {
    return { _group: s.slice(1, -1), _isGroup: true }
  }

  // Match: optional leading number+unit, then name, optional comma+prep
  // e.g. "350gr red onions, sliced" or "2 each bay leaves" or "60gr saffron water to sprinkle on rice"
  const m = s.match(/^([\d.,/]+)\s*([a-zA-Z]+)?\s+(.+)$/)
  if (m) {
    const qty    = parseFloat(m[1].replace(',', '.'))
    const unit   = m[2] ? m[2].toLowerCase().trim() : null
    const rest   = m[3].trim()
    // Split on first comma for prep note
    const comma  = rest.indexOf(',')
    const name   = comma > -1 ? rest.slice(0, comma).trim() : rest
    const prep   = comma > -1 ? rest.slice(comma + 1).trim() : null

    return {
      ingredient_name:  name,
      quantity:         isNaN(qty) ? null : qty,
      unit,
      preparation_note: prep || null,
      raw_ingredient_text: s,
      sort_order: idx,
      _isGroup: false,
    }
  }

  // Couldn't parse — store as name only
  return {
    ingredient_name:  s,
    quantity:         null,
    unit:             null,
    preparation_note: null,
    raw_ingredient_text: s,
    sort_order: idx,
    _isGroup: false,
  }
}

function buildIngredients(rawList) {
  let currentGroup = null
  const out = []
  let sortIdx = 0

  for (const raw of rawList) {
    if (!raw.trim()) continue
    const parsed = parseIngredient(raw, sortIdx)
    if (!parsed) continue

    if (parsed._isGroup) {
      currentGroup = parsed._group
      continue
    }

    out.push({ ...parsed, group_name: currentGroup, sort_order: sortIdx++ })
  }
  return out
}

// ── Fetch from Recipem8 ───────────────────────────────────────────────────────
async function fetchRecipem8(query) {
  const { data, error } = await R
    .from('recipes')
    .select('id,title,tags,ingredients,instructions,photo,yield,notes')
    .or(query)
    .limit(300)
  if (error) throw new Error(`Recipem8 fetch failed: ${error.message}`)
  return data ?? []
}

// ── Insert one recipe into KROS ───────────────────────────────────────────────
async function insertRecipe({ title, description, sectionId, ingredients, steps, photoUrl, tags, yieldText }) {
  // Parse portion_size from yield string "50 pieces = 900gr" or "2500gr"
  let portion_size = null
  if (yieldText) {
    const nums = yieldText.match(/^(\d+)/)
    if (nums) portion_size = parseInt(nums[1], 10)
  }

  // Insert recipe row
  const { data: recipe, error: rErr } = await K
    .from('recipes')
    .insert({
      venue_id:    VENUE_ID,
      section_id:  sectionId,
      title,
      description: description || null,
      portion_size,
      recipe_size: 1,
      status:      'pending_review',
      tags:        tags ?? [],
    })
    .select('id')
    .single()

  if (rErr || !recipe) throw new Error(`Recipe insert failed for "${title}": ${rErr?.message}`)
  const recipeId = recipe.id

  // Insert ingredients
  if (ingredients.length > 0) {
    const { error: iErr } = await K.from('recipe_ingredients').insert(
      ingredients.map(ing => ({
        recipe_id:        recipeId,
        ingredient_name:  ing.ingredient_name,
        quantity:         ing.quantity,
        unit:             ing.unit,
        preparation_note: ing.preparation_note,
        group_name:       ing.group_name,
        raw_ingredient_text: ing.raw_ingredient_text,
        sort_order:       ing.sort_order,
      }))
    )
    if (iErr) throw new Error(`Ingredients insert failed for "${title}": ${iErr.message}`)
  }

  // Insert steps
  const validSteps = (steps ?? []).filter(s => s.trim() && !s.startsWith('['))
  if (validSteps.length > 0) {
    const { error: sErr } = await K.from('recipe_steps').insert(
      validSteps.map((instruction, idx) => ({
        recipe_id:    recipeId,
        step_number:  idx + 1,
        sort_order:   idx,
        instruction,
      }))
    )
    if (sErr) throw new Error(`Steps insert failed for "${title}": ${sErr.message}`)
  }

  // Insert hero photo
  if (photoUrl) {
    await K.from('recipe_media').insert({
      recipe_id:  recipeId,
      file_url:   photoUrl,
      media_type: 'hero_image',
      sort_order: 0,
    })
    // not fatal if this fails
  }

  return recipeId
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📥  Fetching from Recipem8…\n')

  // 1. Biryani / Nawab
  const biriyani = await fetchRecipem8('title.ilike.*biryani*,title.ilike.*biriyani*')
  const nawab    = await fetchRecipem8('title.ilike.*nawab*')

  // 2. Umbread
  const umbread  = await fetchRecipem8('title.ilike.*umbread*')

  // 3. Salads — by title OR tags
  const saladTitle = await fetchRecipem8('title.ilike.*salad*')
  const { data: saladTags } = await R
    .from('recipes')
    .select('id,title,tags,ingredients,instructions,photo,yield,notes')
    .contains('tags', ['salad'])
    .limit(300)

  // Deduplicate salads
  const saladMap = new Map()
  for (const r of [...(saladTitle ?? []), ...(saladTags ?? [])]) saladMap.set(r.id, r)
  const salads = [...saladMap.values()]

  // Deduplicate biryani+nawab by id
  const indianMap = new Map()
  for (const r of [...biriyani, ...nawab]) indianMap.set(r.id, r)
  const indianRecipes = [...indianMap.values()]

  console.log(`Found:`)
  console.log(`  Biryani/Nawab : ${indianRecipes.length} recipe(s)`)
  indianRecipes.forEach(r => console.log(`    • ${r.title}  [${(r.tags??[]).join(', ')}]`))

  console.log(`  Umbread       : ${umbread.length} recipe(s)`)
  umbread.forEach(r => console.log(`    • ${r.title}  [${(r.tags??[]).join(', ')}]`))

  console.log(`  Salads        : ${salads.length} recipe(s)`)
  salads.forEach(r => console.log(`    • ${r.title}  [${(r.tags??[]).join(', ')}]`))

  console.log('\n🚀  Migrating to Kitchen Recipe OS…\n')

  let indianDone = 0, umbreadDone = 0, saladDone = 0
  const errors = []

  // Migrate Indian (Biryani / Nawab)
  for (const r of indianRecipes) {
    try {
      await insertRecipe({
        title:       r.title,
        description: r.notes || null,
        sectionId:   SEC_INDIAN,
        ingredients: buildIngredients(r.ingredients ?? []),
        steps:       r.instructions ?? [],
        photoUrl:    r.photo || null,
        tags:        r.tags ?? [],
        yieldText:   r.yield || '',
      })
      console.log(`  ✓ [Indian]  ${r.title}`)
      indianDone++
    } catch (e) {
      console.error(`  ✗ [Indian]  ${r.title}: ${e.message}`)
      errors.push(e.message)
    }
  }

  // Migrate Umbread (Lebanese & Iranian)
  for (const r of umbread) {
    try {
      await insertRecipe({
        title:       r.title,
        description: r.notes || null,
        sectionId:   SEC_LEB_IR,
        ingredients: buildIngredients(r.ingredients ?? []),
        steps:       r.instructions ?? [],
        photoUrl:    r.photo || null,
        tags:        r.tags ?? [],
        yieldText:   r.yield || '',
      })
      console.log(`  ✓ [Lebanese & Iranian]  ${r.title}`)
      umbreadDone++
    } catch (e) {
      console.error(`  ✗ [Lebanese & Iranian]  ${r.title}: ${e.message}`)
      errors.push(e.message)
    }
  }

  // Migrate Salads
  for (const r of salads) {
    try {
      await insertRecipe({
        title:       r.title,
        description: r.notes || null,
        sectionId:   SEC_SALADS,
        ingredients: buildIngredients(r.ingredients ?? []),
        steps:       r.instructions ?? [],
        photoUrl:    r.photo || null,
        tags:        r.tags ?? [],
        yieldText:   r.yield || '',
      })
      console.log(`  ✓ [Salads]  ${r.title}`)
      saladDone++
    } catch (e) {
      console.error(`  ✗ [Salads]  ${r.title}: ${e.message}`)
      errors.push(e.message)
    }
  }

  console.log('\n────────────────────────────────────────')
  console.log(`✅  Migration complete`)
  console.log(`   Indian (Biryani/Nawab) : ${indianDone} migrated`)
  console.log(`   Lebanese & Iranian     : ${umbreadDone} migrated`)
  console.log(`   Salads                 : ${saladDone} migrated`)
  console.log(`   Total                  : ${indianDone + umbreadDone + saladDone} recipes`)
  if (errors.length) {
    console.log(`\n⚠️  ${errors.length} error(s):`)
    errors.forEach(e => console.log(`   • ${e}`))
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
