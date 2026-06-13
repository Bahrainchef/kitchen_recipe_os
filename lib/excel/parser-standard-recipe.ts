import type { ParsedIngredient, ParsedRecipe } from './parser'

type XLSXCell = { v?: unknown; w?: string; t?: string } | undefined
type XLSXSheet = Record<string, XLSXCell>

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

// Standard Recipe Card format:
//   D3  = Recipe name
//   D4  = Description
//   D5  = Recipe size (yield/batch)
//   D6  = Number of portions
//   B15:B39 = Ingredient weight in grams (stored as-is, no conversion)
//   C15:C39 = Unit (gr, ml, each …)
//   D15:D39 = Ingredient name
//   E15:E39 = Preparation note (optional)
//   G40 = Total recipe cost (optional)
//   B42+    = Method steps — one per row, stop at first empty row
//
// Venue is supplied externally (user selects before upload).
export function parseStandardRecipeSheet(
  sheet: XLSXSheet,
  tabName: string,
  venueId: string | null,
  venueName: string | null,
): ParsedRecipe {
  const title       = cellStr(sheet, 'D3') || null
  const description = cellStr(sheet, 'D4') || null
  const recipe_size = cellNum(sheet, 'D5')
  const portion_size = cellNum(sheet, 'D6')
  const total_cost  = cellNum(sheet, 'G40')

  // ── Ingredients: rows 15–39 ──────────────────────────────────────────────
  const ingredients: ParsedIngredient[] = []

  for (let row = 15; row <= 39; row++) {
    const name     = cellStr(sheet, `D${row}`)
    if (!name) continue                         // skip rows with no ingredient name

    const weightRaw = cellNum(sheet, `B${row}`)
    if (weightRaw === 0 || weightRaw === null) continue  // skip zero-weight rows

    const unitRaw  = cellStr(sheet, `C${row}`)
    const prepNote = cellStr(sheet, `E${row}`) || null

    ingredients.push({
      quantity:   weightRaw,                    // already in grams — store as-is
      unit:       unitRaw ? unitRaw.toLowerCase() : null,
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

  if (!title)   errors.push('Recipe name missing (D3)')
  if (!venueId) errors.push('No venue selected')

  if (ingredients.length === 0) warnings.push('No ingredients found (rows 15–39)')
  if (steps.length === 0)       warnings.push('No method steps found (row 42+)')

  const status: ParsedRecipe['status'] =
    errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'

  return {
    tab_name:         tabName,
    venue_name:       venueName,
    matched_venue_id: venueId,
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
