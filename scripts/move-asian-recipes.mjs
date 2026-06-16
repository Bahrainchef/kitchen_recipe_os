/**
 * Move Thai / Korean / Japanese recipes to the correct section in OTOD
 * Run: node scripts/move-asian-recipes.mjs
 */

import { createClient } from '@supabase/supabase-js'

const K = createClient(
  'https://vuxpsnjbciyowpkbgwlv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eHBzbmpiY2l5b3dwa2Jnd2x2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk3MjIxOCwiZXhwIjoyMDk0NTQ4MjE4fQ.FSAd55gTFHxtPTRyQJvmn_juxApvImTna9hc7_qmCpM'
)

const VENUE_ID = 'a1000000-0000-0000-0000-000000000009'
const SEC_ASIAN = 'd0000000-0000-0000-0000-000000000020' // Thai / Korean / Japanese

const KEYWORDS = [
  'thai', 'korean', 'japanese', 'pad thai', 'japchae', 'japchei', 'japchai',
  'sitca', 'bulgogi', 'bibimbap', 'kimchi', 'teriyaki', 'tempura', 'miso',
  'ramen', 'udon', 'soba', 'sushi', 'gyoza', 'katsu', 'tonkatsu', 'yakitori',
  'edamame', 'wasabi', 'dashi', 'matcha', 'larb', 'som tum', 'tom yum',
  'tom kha', 'green curry', 'red curry', 'yellow curry', 'massaman', 'panang',
  'pad see ew', 'pad kra pao', 'satay', 'galangal', 'lemongrass', 'nam jim',
  'gochujang', 'doenjang', 'samgyeopsal', 'tteokbokki', 'sundubu', 'banchan',
  'bibim', 'galbi', 'kalbi', 'banh', 'pho', 'laksa', 'nasi', 'mee', 'rendang',
]

function matchesKeyword(title) {
  const lower = title.toLowerCase()
  return KEYWORDS.filter(kw => lower.includes(kw))
}

async function main() {
  console.log('\n🔍  Fetching all recipes in One Team One Dream…\n')

  // Paginate to get all recipes
  const PAGE = 1000
  const allRecipes = []
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await K
      .from('recipes')
      .select('id, title, section_id')
      .eq('venue_id', VENUE_ID)
      .neq('status', 'archived')
      .range(offset, offset + PAGE - 1)
    if (error) { console.error('Fetch error:', error.message); process.exit(1) }
    if (!data || data.length === 0) break
    allRecipes.push(...data)
    if (data.length < PAGE) break
  }

  console.log(`Total recipes fetched: ${allRecipes.length}`)

  // Filter matches — exclude those already in the target section
  const matches = allRecipes
    .map(r => ({ ...r, matchedKeywords: matchesKeyword(r.title) }))
    .filter(r => r.matchedKeywords.length > 0)

  const toMove = matches.filter(r => r.section_id !== SEC_ASIAN)
  const alreadyThere = matches.filter(r => r.section_id === SEC_ASIAN)

  if (alreadyThere.length > 0) {
    console.log(`\n✓ Already in Thai / Korean / Japanese section (${alreadyThere.length}):`)
    alreadyThere.forEach(r => console.log(`    • ${r.title}  [${r.matchedKeywords.join(', ')}]`))
  }

  if (toMove.length === 0) {
    console.log('\n✅  No recipes to move — all matches already in the correct section.')
    return
  }

  console.log(`\n🚀  Moving ${toMove.length} recipe(s) to Thai / Korean / Japanese…\n`)

  let moved = 0
  const errors = []

  for (const r of toMove) {
    const { error } = await K
      .from('recipes')
      .update({ section_id: SEC_ASIAN })
      .eq('id', r.id)

    if (error) {
      console.error(`  ✗  ${r.title}: ${error.message}`)
      errors.push(`${r.title}: ${error.message}`)
    } else {
      console.log(`  ✓  ${r.title}  [matched: ${r.matchedKeywords.join(', ')}]`)
      moved++
    }
  }

  console.log('\n────────────────────────────────────────')
  console.log(`✅  Done`)
  console.log(`   Moved    : ${moved}`)
  console.log(`   Skipped  : ${alreadyThere.length} (already correct)`)
  if (errors.length) {
    console.log(`\n⚠️  ${errors.length} error(s):`)
    errors.forEach(e => console.log(`   • ${e}`))
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
