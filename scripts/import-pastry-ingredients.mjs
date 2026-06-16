/**
 * Import PastryHub_Master_Reference.xlsx → ingredient_master
 * Run AFTER applying scripts/pastry-migration.sql in the Supabase SQL editor.
 * Usage: node scripts/import-pastry-ingredients.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import XLSX from 'xlsx'

const __dir = dirname(fileURLToPath(import.meta.url))

const K = createClient(
  'https://vuxpsnjbciyowpkbgwlv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eHBzbmpiY2l5b3dwa2Jnd2x2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk3MjIxOCwiZXhwIjoyMDk0NTQ4MjE4fQ.FSAd55gTFHxtPTRyQJvmn_juxApvImTna9hc7_qmCpM'
)

const PASTRY_HUB_VENUE_ID = 'a1000000-0000-0000-0000-000000000008'
const BATCH = 80

function normalise(name) {
  return (name ?? '').toLowerCase().trim()
}

async function main() {
  // ── 1. Verify new columns exist ───────────────────────────────────────────
  console.log('\n🔍  Checking schema…')
  const { error: colCheck } = await K
    .from('ingredient_master')
    .select('kcal_per_100g, pastry_notes, default_unit_size, venue_id')
    .limit(1)
  if (colCheck) {
    console.error('\n❌  New columns not found. Please run scripts/pastry-migration.sql in the Supabase SQL editor first.\n')
    console.error('    SQL editor: https://supabase.com/dashboard/project/vuxpsnjbciyowpkbgwlv/sql/new\n')
    process.exit(1)
  }
  console.log('    ✓ Schema OK')

  // ── 2. Load Excel ─────────────────────────────────────────────────────────
  console.log('\n📖  Reading PastryHub_Master_Reference.xlsx…')
  const wb = XLSX.readFile(join(__dir, '..', 'PastryHub_Master_Reference.xlsx'))
  const ws = wb.Sheets['MASTER LIST']
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  // Rows: 0=title, 1=header, 2+=data (skip section-header rows where col[0] is not a number)
  const excelRows = raw.slice(2).filter(r => typeof r[0] === 'number' && r[1])
  console.log(`    ${excelRows.length} ingredient rows found`)

  // ── 3. Fetch existing ingredient_master rows ───────────────────────────────
  console.log('\n🗄️   Fetching existing ingredient_master rows…')
  const { data: existing, error: fetchErr } = await K
    .from('ingredient_master')
    .select('id, canonical_name')
  if (fetchErr) { console.error('Fatal: could not fetch existing rows:', fetchErr.message); process.exit(1) }

  // Build normalised-name → id lookup
  const existingMap = new Map()
  for (const row of existing ?? []) {
    existingMap.set(normalise(row.canonical_name), row.id)
  }
  console.log(`    ${existingMap.size} existing rows loaded`)

  // ── 4. Classify rows ──────────────────────────────────────────────────────
  const toInsert = []
  const toUpdate = []

  for (const r of excelRows) {
    const name      = String(r[1]).trim()
    const category  = r[3] ? String(r[3]).trim() : null
    const packSize  = typeof r[4] === 'number' ? r[4] : null
    const kcal      = typeof r[5] === 'number' ? Math.round(r[5]) : null
    const notes     = r[6] ? String(r[6]).trim() : null
    const key       = normalise(name)

    const payload = {
      // category omitted on first pass — column is still an enum; run ALTER TABLE first
      kcal_per_100g:    kcal,
      pastry_notes:     notes,
      default_unit_size: packSize,
      venue_id:         PASTRY_HUB_VENUE_ID,
    }

    if (existingMap.has(key)) {
      toUpdate.push({ id: existingMap.get(key), ...payload })
    } else {
      toInsert.push({ canonical_name: name, ...payload })
    }
  }

  console.log(`\n    New rows to insert : ${toInsert.length}`)
  console.log(`    Existing to update : ${toUpdate.length}`)

  // ── 5. Batch INSERT ───────────────────────────────────────────────────────
  let inserted = 0, insertFailed = 0
  if (toInsert.length > 0) {
    console.log('\n🚀  Inserting new rows…')
    for (let i = 0; i < toInsert.length; i += BATCH) {
      const chunk = toInsert.slice(i, i + BATCH)
      const { error } = await K.from('ingredient_master').insert(chunk)
      if (error) {
        console.error(`  ✗ Insert batch ${i}–${i + chunk.length - 1}: ${error.message}`)
        insertFailed += chunk.length
      } else {
        inserted += chunk.length
        process.stdout.write(`  ✓ ${inserted}/${toInsert.length} inserted\r`)
      }
    }
    console.log(`\n  Done: ${inserted} inserted, ${insertFailed} failed`)
  }

  // ── 6. Batch UPDATE (parallel, capped at BATCH concurrent) ────────────────
  let updated = 0, updateFailed = 0
  const updateErrors = []
  if (toUpdate.length > 0) {
    console.log('\n🔄  Updating existing rows…')
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const chunk = toUpdate.slice(i, i + BATCH)
      await Promise.all(chunk.map(async ({ id, ...fields }) => {
        const { error } = await K
          .from('ingredient_master')
          .update(fields)
          .eq('id', id)
        if (error) {
          updateErrors.push(`id=${id}: ${error.message}`)
          updateFailed++
        } else {
          updated++
        }
      }))
      process.stdout.write(`  ✓ ${updated}/${toUpdate.length} updated\r`)
    }
    console.log(`\n  Done: ${updated} updated, ${updateFailed} failed`)
  }

  // ── 7. Summary ────────────────────────────────────────────────────────────
  const total = inserted + updated
  const failed = insertFailed + updateFailed
  console.log('\n────────────────────────────────────────')
  console.log(`✅  Import complete`)
  console.log(`   Inserted : ${inserted}`)
  console.log(`   Updated  : ${updated}`)
  console.log(`   Total    : ${total}`)
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} failed`)
    updateErrors.forEach(e => console.log(`   • ${e}`))
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
