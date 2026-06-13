import type { Venue } from '@/lib/types/database.types'

// SheetJS cell shape — .v is the cached/calculated value, .f is the formula string
type XLSXCell = { v?: unknown; w?: string; t?: string; f?: string } | undefined
type XLSXSheet = Record<string, XLSXCell>

const SKIP_TABS = new Set(['cost percentage', 'summary', 'index', 'contents', 'template'])

export function shouldSkipTab(tabName: string): boolean {
  return SKIP_TABS.has(tabName.toLowerCase().trim())
}

export interface ParsedIngredient {
  quantity: number | null
  unit: string | null
  name: string
  prep_note: string | null
  group_name: string | null
  row: number
}

export interface ParsedRecipe {
  tab_name: string
  venue_name: string | null
  matched_venue_id: string | null
  title: string | null
  description?: string | null
  portion_size: number | null
  recipe_size: number | null
  selling_price: number | null
  total_cost: number | null
  cost_per_portion: number | null
  ingredients: ParsedIngredient[]
  steps: string[]
  status: 'ok' | 'warning' | 'error'
  errors: string[]
  warnings: string[]
}

function cellStr(sheet: XLSXSheet, addr: string): string {
  const cell = sheet[addr]
  if (!cell || cell.v == null) return ''
  return String(cell.v).trim()
}

function cellNum(sheet: XLSXSheet, addr: string): number | null {
  const cell = sheet[addr]
  if (!cell || cell.v == null) return null
  const n = parseFloat(String(cell.v))
  return isNaN(n) ? null : n
}

function cellNumAny(sheet: XLSXSheet, ...addrs: string[]): number | null {
  for (const addr of addrs) {
    const n = cellNum(sheet, addr)
    if (n !== null && n > 0) return n
  }
  return null
}

// Strip diacritics so "Brewed Café" matches "Brewed Cafe"
function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function matchVenue(name: string, venues: Venue[]): string | null {
  const q = stripAccents(name.toLowerCase().trim())
  const exact = venues.find(v => {
    const vn = stripAccents(v.name.toLowerCase())
    const vs = stripAccents((v.short_name ?? '').toLowerCase())
    return vn === q || vs === q
  })
  if (exact) return exact.id
  const partial = venues.find(v => {
    const vn = stripAccents(v.name.toLowerCase())
    return vn.includes(q) || q.includes(vn)
  })
  return partial?.id ?? null
}

// Sub-recipe heading: all alphabetic characters are uppercase
function isAllCaps(s: string): boolean {
  return /[A-Z]/.test(s) && !/[a-z]/.test(s)
}

// Quantities are stored as kg decimals in the workbook.
// "gr" units: multiply by 1000 → whole grams (0.24 → 240, 0.001 → 1)
// "each"/"unit": round to whole number, no scaling
function convertQuantity(raw: number, unit: string | null): number {
  const u = (unit ?? '').toLowerCase().trim()
  if (u === 'gr' || u === 'g') return Math.round(raw * 1000)
  if (u === 'each' || u === 'unit') return Math.round(raw)
  return raw
}

export function parseSheet(sheet: XLSXSheet, tabName: string, venues: Venue[]): ParsedRecipe {
  const venue_name   = cellStr(sheet, 'B1') || null
  const title        = cellStr(sheet, 'B3') || null
  const portion_size = cellNum(sheet, 'B5')
  const recipe_size  = cellNum(sheet, 'B6')

  const selling_price    = cellNum(sheet, 'E45')
  const total_cost       = cellNum(sheet, 'F38')
  const cost_per_portion = cellNumAny(sheet, 'F39', 'F40')

  const matched_venue_id = venue_name ? matchVenue(venue_name, venues) : null

  // ── Ingredients: rows 10–35 ─────────────────────────────────────────────
  const ingredients: ParsedIngredient[] = []
  let currentGroup: string | null = null

  for (let row = 10; row <= 35; row++) {
    const quantityRaw = cellNum(sheet, `A${row}`)
    const unitRaw     = cellStr(sheet, `B${row}`)
    const unit        = unitRaw ? unitRaw.toLowerCase() : null   // normalise: 'Each' → 'each', 'GR' → 'gr'
    const raw         = cellStr(sheet, `C${row}`)

    // Skip rows with no ingredient name — empty filler rows in the template
    if (!raw) continue

    // Sub-recipe heading: B is "unit" and C is ALL CAPS (e.g. "BREAKFAST SAUSAGE PATTY")
    if (unit === 'unit' && isAllCaps(raw)) {
      currentGroup = raw
      continue
    }

    // Group header: no quantity (or qty=0), no unit, C has text
    if ((quantityRaw === null || quantityRaw === 0) && !unit) {
      currentGroup = raw
      continue
    }

    // Skip qty=0 rows that aren't headings
    if (quantityRaw === 0) continue

    // Skip rows with no quantity value
    if (quantityRaw === null) continue

    const commaIdx = raw.indexOf(',')
    const name      = commaIdx >= 0 ? raw.slice(0, commaIdx).trim() : raw.trim()
    const prep_note = commaIdx >= 0 ? (raw.slice(commaIdx + 1).trim() || null) : null

    ingredients.push({
      quantity: convertQuantity(quantityRaw, unit),
      unit,
      name,
      prep_note,
      group_name: currentGroup,
      row,
    })
  }

  // ── Method steps: scan rows 48–65 for first text cell, collect to row 65 ─
  // Skip purely numeric cells while searching for the method start.
  const steps: string[] = []
  let methodStart: number | null = null

  for (let row = 48; row <= 65; row++) {
    const text = cellStr(sheet, `A${row}`)
    if (!text) continue

    if (methodStart === null) {
      // Still looking for first text (non-numeric) cell
      const asNum = parseFloat(text)
      if (!isNaN(asNum) && text === String(asNum)) continue
      methodStart = row
    }

    steps.push(text.replace(/^\d+[\.\)]\s*/, '').trim())
  }

  // ── Validation ──────────────────────────────────────────────────────────
  const errors: string[] = []
  const warnings: string[] = []

  if (!title)      errors.push('Recipe title missing (B3)')
  if (!venue_name) errors.push('Venue name missing (B1)')
  else if (!matched_venue_id) errors.push(`Venue "${venue_name}" not found`)

  if (ingredients.length === 0) warnings.push('No ingredients found (rows 10–35)')
  if (steps.length === 0)       warnings.push('No method steps found (rows 48–65)')

  for (const ing of ingredients) {
    if (!ing.name) warnings.push(`Row ${ing.row}: quantity without ingredient name`)
  }

  const status: ParsedRecipe['status'] =
    errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'

  return {
    tab_name: tabName,
    venue_name,
    matched_venue_id,
    title,
    portion_size,
    recipe_size,
    selling_price,
    total_cost,
    cost_per_portion,
    ingredients,
    steps,
    status,
    errors,
    warnings,
  }
}
