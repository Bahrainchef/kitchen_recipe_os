import type { ParsedIngredient, ParsedRecipe } from './parser'

// SheetJS cell shape
type XLSXCell = { v?: unknown; w?: string; t?: string } | undefined
type XLSXSheet = Record<string, XLSXCell>

// D12 venue hashtag → venue id + display name
const VENUE_TAG_MAP: Record<string, { id: string; name: string }> = {
  '#oneteamonedream': {
    id:   'a1000000-0000-0000-0000-000000000009',
    name: 'One Team One Dream',
  },
}

function cellVal(sheet: XLSXSheet, addr: string): string {
  const cell = sheet[addr]
  if (!cell || cell.v == null) return ''
  return String(cell.v).trim()
}

function cellNumAt(sheet: XLSXSheet, addr: string): number | null {
  const s = cellVal(sheet, addr)
  if (!s) return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// Scan every cell in the sheet for a value that starts with "#".
// Merged cells store their value at the merge anchor (often not D12 in A1 space)
// so scanning all cells is the only reliable approach.
function findHashtagInSheet(sheet: XLSXSheet): string {
  for (const addr of Object.keys(sheet)) {
    if (addr.startsWith('!')) continue
    const v = cellVal(sheet, addr)
    if (v.startsWith('#')) return v
  }
  return ''
}

// Scan a specific Excel row for the first non-empty cell value.
// row is 1-based (row 3 = "3" in A1 notation).
function scanRow(sheet: XLSXSheet, row: number, fromCol = 1, toCol = 10): string {
  for (let c = fromCol; c <= toCol; c++) {
    const col = String.fromCharCode(64 + c)   // 1→A, 2→B … 10→J
    const v = cellVal(sheet, `${col}${row}`)
    if (v) return v
  }
  return ''
}

function scanRowNum(sheet: XLSXSheet, row: number, fromCol = 1, toCol = 10): number | null {
  for (let c = fromCol; c <= toCol; c++) {
    const col = String.fromCharCode(64 + c)
    const n = cellNumAt(sheet, `${col}${row}`)
    if (n !== null) return n
  }
  return null
}

// Weights are stored as kg decimals (0.25 = 250 gr).
// gr/ml: ×1000 and round.  each/unit: round only.
function convertQuantity(raw: number, unit: string | null): number {
  const u = (unit ?? '').toLowerCase().trim()
  if (u === 'gr' || u === 'g' || u === 'ml') return Math.round(raw * 1000)
  if (u === 'each' || u === 'unit') return Math.round(raw)
  return raw
}

// "SCHUG — ZAHAV" → "Schug — Zahav"
function toTitleCase(s: string): string {
  return s
    .split(' ')
    .map(w => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

// Standard Recipe Card format:
//   Row 3  (D/E…) = Recipe name
//   Row 4  (D/E…) = Subtitle / description
//   Row 5  (D/E…) = Recipe size (yield/batch)
//   Row 6  (D/E…) = Number of portions (default 1 if empty)
//   Row 12 (any)  = Venue hashtag "#OneTeamOneDream"  ← scanned across all cells
//   Rows 15–39, col B = ingredient weight (kg decimal → ×1000)
//   Rows 15–39, col C = unit
//   Rows 15–39, col D = ingredient name
//   Rows 15–39, col E = prep note
//   Row 40, col G     = total recipe cost
//   Row 42+, col B    = method steps (stop at first empty)
export function parseStandardRecipeSheet(
  sheet: XLSXSheet,
  tabName: string,
): ParsedRecipe {
  // ── Venue: scan all cells for hashtag (handles merged-cell anchoring) ─────
  const venueTagRaw      = findHashtagInSheet(sheet)
  const venueTag         = venueTagRaw.toLowerCase()
  const venueMatch       = VENUE_TAG_MAP[venueTag] ?? null
  const matched_venue_id = venueMatch?.id   ?? null
  const venue_name       = venueMatch?.name ?? (venueTagRaw || null)

  // ── Recipe metadata: scan each row in case cells are merged ──────────────
  const nameRaw     = scanRow(sheet, 3,  4, 8)   // row 3,  cols D–H
  const subtitleRaw = scanRow(sheet, 4,  4, 8)   // row 4,  cols D–H
  const recipe_size  = scanRowNum(sheet, 5, 4, 8) // row 5,  cols D–H
  const portion_size = scanRowNum(sheet, 6, 4, 8) ?? 1  // row 6, default 1

  const combinedRaw = nameRaw && subtitleRaw
    ? `${nameRaw} — ${subtitleRaw}`
    : nameRaw
  const title       = combinedRaw ? toTitleCase(combinedRaw) : null
  const description = subtitleRaw ? toTitleCase(subtitleRaw) : null

  // Row 40, col G = total cost
  const total_cost = cellNumAt(sheet, 'G40')

  // ── Ingredients: rows 15–39 ──────────────────────────────────────────────
  const ingredients: ParsedIngredient[] = []

  for (let row = 15; row <= 39; row++) {
    const name = cellVal(sheet, `D${row}`)
    if (!name) continue

    const weightRaw = cellNumAt(sheet, `B${row}`)
    if (weightRaw === null || weightRaw === 0) continue

    const unitRaw  = cellVal(sheet, `C${row}`)
    const unit     = unitRaw ? unitRaw.toLowerCase() : null
    const prepNote = cellVal(sheet, `E${row}`) || null

    ingredients.push({
      quantity:   convertQuantity(weightRaw, unit),
      unit,
      name,
      prep_note:  prepNote,
      group_name: null,
      row,
    })
  }

  // ── Method steps: row 42+, col B, stop at first empty ───────────────────
  const steps: string[] = []
  for (let row = 42; row <= 100; row++) {
    const text = cellVal(sheet, `B${row}`)
    if (!text) break
    steps.push(text)
  }

  // ── Validation ───────────────────────────────────────────────────────────
  const errors: string[] = []
  const warnings: string[] = []

  if (!title)            errors.push('Recipe name missing (row 3)')
  if (!matched_venue_id) errors.push(`Unknown venue tag: "${venueTagRaw || 'not found in sheet'}"`)

  if (ingredients.length === 0) warnings.push('No ingredients found (rows 15–39, col D)')
  if (steps.length === 0)       warnings.push('No method steps found (row 42+, col B)')

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
