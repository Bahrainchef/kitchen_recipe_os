import type { ParsedIngredient, ParsedRecipe } from './parser'

type XLSXCell = { v?: unknown; w?: string; t?: string } | undefined
type XLSXSheet = Record<string, XLSXCell>

// D12 venue hashtag → venue id + display name
const VENUE_TAG_MAP: Record<string, { id: string; name: string }> = {
  '#oneteamonedream': {
    id:   'a1000000-0000-0000-0000-000000000009',
    name: 'One Team One Dream',
  },
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

// Weights are stored as kg decimals (0.25 = 250 gr).
// gr/ml: multiply by 1000 and round to whole number.
// each/unit: round to whole number, no scaling.
function convertQuantity(raw: number, unit: string | null): number {
  const u = (unit ?? '').toLowerCase().trim()
  if (u === 'gr' || u === 'g' || u === 'ml') return Math.round(raw * 1000)
  if (u === 'each' || u === 'unit') return Math.round(raw)
  return raw
}

// Convert ALL CAPS source data to Title Case.
// "SCHUG — ZAHAV" → "Schug — Zahav"
function toTitleCase(s: string): string {
  return s
    .split(' ')
    .map(w => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

// Standard Recipe Card format:
//   D3  = Recipe name (ALL CAPS)
//   D4  = Subtitle / description (ALL CAPS, optional)
//   D5  = Recipe size (yield/batch)
//   D6  = Number of portions (default 1 if empty)
//   D12 = Venue hashtag, e.g. "#OneTeamOneDream"
//   B15:B39 = Ingredient weight as kg decimal (0.25 = 250 gr)
//   C15:C39 = Unit (gr, ml, each …)
//   D15:D39 = Ingredient name
//   E15:E39 = Preparation note (optional)
//   G40 = Total recipe cost (optional)
//   B42+    = Method steps — one per row, stop at first empty row
export function parseStandardRecipeSheet(
  sheet: XLSXSheet,
  tabName: string,
): ParsedRecipe {
  // ── Venue: read D12 hashtag ───────────────────────────────────────────────
  const venueTag         = cellStr(sheet, 'D12').toLowerCase()
  const venueMatch       = VENUE_TAG_MAP[venueTag] ?? null
  const matched_venue_id = venueMatch?.id   ?? null
  const venue_name       = venueMatch?.name ?? (cellStr(sheet, 'D12') || null)

  // ── Recipe metadata ───────────────────────────────────────────────────────
  const nameRaw  = cellStr(sheet, 'D3')
  const subtitleRaw = cellStr(sheet, 'D4')

  // Combine D3 + D4 into title; convert from ALL CAPS to Title Case
  const combinedRaw = nameRaw && subtitleRaw
    ? `${nameRaw} — ${subtitleRaw}`
    : nameRaw
  const title = combinedRaw ? toTitleCase(combinedRaw) : null

  // D4 alone becomes the description field
  const description  = subtitleRaw ? toTitleCase(subtitleRaw) : null

  const recipe_size  = cellNum(sheet, 'D5')
  const portion_size = cellNum(sheet, 'D6') ?? 1   // default 1 if empty
  const total_cost   = cellNum(sheet, 'G40')

  // ── Ingredients: rows 15–39 ──────────────────────────────────────────────
  const ingredients: ParsedIngredient[] = []

  for (let row = 15; row <= 39; row++) {
    const name = cellStr(sheet, `D${row}`)
    if (!name) continue                                 // skip rows with no ingredient name

    const weightRaw = cellNum(sheet, `B${row}`)
    if (weightRaw === null || weightRaw === 0) continue // skip missing / zero-weight rows

    const unitRaw  = cellStr(sheet, `C${row}`)
    const unit     = unitRaw ? unitRaw.toLowerCase() : null
    const prepNote = cellStr(sheet, `E${row}`) || null

    ingredients.push({
      quantity:   convertQuantity(weightRaw, unit),   // 0.25 gr → 250
      unit,
      name,
      prep_note:  prepNote,
      group_name: null,
      row,
    })
  }

  // ── Method steps: B42 onwards, stop at first empty row ──────────────────
  const steps: string[] = []
  for (let row = 42; row <= 100; row++) {
    const text = cellStr(sheet, `B${row}`)
    if (!text) break
    steps.push(text)
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const errors: string[] = []
  const warnings: string[] = []

  if (!title)            errors.push('Recipe name missing (D3)')
  if (!matched_venue_id) errors.push(`Unknown venue tag in D12: "${cellStr(sheet, 'D12') || 'empty'}"`)

  if (ingredients.length === 0) warnings.push('No ingredients found (rows 15–39)')
  if (steps.length === 0)       warnings.push('No method steps found (row 42+)')

  const status: ParsedRecipe['status'] =
    errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'

  return {
    tab_name: tabName,
    venue_name,
    matched_venue_id,
    title,
    description,
    portion_size,
    recipe_size,
    selling_price:    null,
    total_cost,
    cost_per_portion: null,
    ingredients,
    steps,
    status,
    errors,
    warnings,
  }
}
