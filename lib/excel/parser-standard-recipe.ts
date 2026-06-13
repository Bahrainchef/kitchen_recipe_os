import type { ParsedIngredient, ParsedRecipe } from './parser'

// D12 venue hashtag → venue id + display name
const VENUE_TAG_MAP: Record<string, { id: string; name: string }> = {
  '#oneteamonedream': {
    id:   'a1000000-0000-0000-0000-000000000009',
    name: 'One Team One Dream',
  },
}

// Read a cell from a 2D row array (0-indexed row and col).
function getStr(rows: unknown[][], row: number, col: number): string {
  const r = rows[row]
  if (!r) return ''
  const v = (r as unknown[])[col]
  if (v == null) return ''
  return String(v).trim()
}

function getNum(rows: unknown[][], row: number, col: number): number | null {
  const s = getStr(rows, row, col)
  if (!s) return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// Weights are stored as kg decimals (0.25 = 250 gr).
// gr/ml: ×1000 and round. each/unit: round only.
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

// Standard Recipe Card — cell map (1-based Excel → 0-based array index):
//   D3  = rows[2][3]  — Recipe name
//   D4  = rows[3][3]  — Subtitle / description
//   D5  = rows[4][3]  — Recipe size (yield/batch)
//   D6  = rows[5][3]  — Number of portions (default 1 if empty)
//   D12 = rows[11][3] — Venue hashtag, e.g. "#OneTeamOneDream"
//   B15:B39 = rows[14..38][1] — Ingredient weight as kg decimal
//   C15:C39 = rows[14..38][2] — Unit (gr, ml, each …)
//   D15:D39 = rows[14..38][3] — Ingredient name
//   E15:E39 = rows[14..38][4] — Preparation note (optional)
//   G40 = rows[39][6]         — Total recipe cost (optional)
//   B42+ = rows[41+][1]       — Method steps, stop at first empty row
//
// Receives a 2D row array from xlsx.utils.sheet_to_json(sheet, { header:1, defval:'' })
// so merged cells are resolved correctly regardless of their A1 address.
export function parseStandardRecipeSheet(
  rows: unknown[][],
  tabName: string,
): ParsedRecipe {
  // ── Venue: D12 = rows[11][3] ─────────────────────────────────────────────
  const venueTagRaw      = getStr(rows, 11, 3)
  const venueTag         = venueTagRaw.toLowerCase()
  const venueMatch       = VENUE_TAG_MAP[venueTag] ?? null
  const matched_venue_id = venueMatch?.id   ?? null
  const venue_name       = venueMatch?.name ?? (venueTagRaw || null)

  // ── Recipe metadata ───────────────────────────────────────────────────────
  const nameRaw     = getStr(rows, 2, 3)   // D3
  const subtitleRaw = getStr(rows, 3, 3)   // D4

  const combinedRaw = nameRaw && subtitleRaw
    ? `${nameRaw} — ${subtitleRaw}`
    : nameRaw
  const title       = combinedRaw ? toTitleCase(combinedRaw) : null
  const description = subtitleRaw ? toTitleCase(subtitleRaw) : null

  const recipe_size  = getNum(rows, 4, 3)        // D5
  const portion_size = getNum(rows, 5, 3) ?? 1   // D6, default 1
  const total_cost   = getNum(rows, 39, 6)        // G40

  // ── Ingredients: rows 15–39 = array indices 14–38 ───────────────────────
  const ingredients: ParsedIngredient[] = []

  for (let i = 14; i <= 38; i++) {
    const name = getStr(rows, i, 3)                   // col D
    if (!name) continue

    const weightRaw = getNum(rows, i, 1)              // col B
    if (weightRaw === null || weightRaw === 0) continue

    const unitRaw  = getStr(rows, i, 2)               // col C
    const unit     = unitRaw ? unitRaw.toLowerCase() : null
    const prepNote = getStr(rows, i, 4) || null       // col E

    ingredients.push({
      quantity:   convertQuantity(weightRaw, unit),
      unit,
      name,
      prep_note:  prepNote,
      group_name: null,
      row:        i + 1,                              // 1-based for error messages
    })
  }

  // ── Method steps: B42+ = array index 41+, stop at first empty ───────────
  const steps: string[] = []
  for (let i = 41; i < rows.length; i++) {
    const text = getStr(rows, i, 1)                   // col B
    if (!text) break
    steps.push(text)
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const errors: string[] = []
  const warnings: string[] = []

  if (!title)            errors.push('Recipe name missing (D3)')
  if (!matched_venue_id) errors.push(`Unknown venue tag in D12: "${venueTagRaw || 'empty'}"`)

  if (ingredients.length === 0) warnings.push('No ingredients found (rows 15–39)')
  if (steps.length === 0)       warnings.push('No method steps found (row 42+)')

  const status: ParsedRecipe['status'] =
    errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'

  return {
    tab_name:         tabName,
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
