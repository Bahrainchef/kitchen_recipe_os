'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Venue, Section } from '@/lib/types/database.types'
import type { ParsedRecipe } from '@/lib/excel/parser'
import { shouldSkipTab } from '@/lib/excel/parser'
import type { RecipePayload, PublishResult, DuplicateMatch } from '@/app/import/actions'

type Stage = 'upload' | 'review' | 'publishing' | 'done'
type ImportFormat = 'venue-cost-sheet' | 'standard-recipe-card'

// ParsedRecipe extended with which file it came from
type ParsedRecipeWithSource = ParsedRecipe & { source_file: string }

// Unique key per recipe — handles same tab name across multiple files
const uid = (r: ParsedRecipeWithSource) => `${r.source_file}::${r.tab_name}`

const STATUS_CONFIG = {
  ok:      { label: '✓ OK',      bg: 'rgba(22,163,74,0.10)',  text: '#15803d' },
  warning: { label: '⚠ Warning', bg: 'rgba(155,90,0,0.10)',   text: '#7A4500' },
  error:   { label: '✗ Error',   bg: 'rgba(220,38,38,0.10)', text: '#dc2626' },
}

const FORMAT_LABELS: Record<ImportFormat, string> = {
  'venue-cost-sheet':     'Venue Cost Sheet',
  'standard-recipe-card': 'Standard Recipe Card',
}

interface Props {
  venues: Venue[]
  sections: Section[]
}

export function ImportClient({ venues, sections }: Props) {
  const [stage, setStage] = useState<Stage>('upload')
  const [format, setFormat] = useState<ImportFormat>('venue-cost-sheet')
  const [dragging, setDragging] = useState(false)
  const [parsed, setParsed] = useState<ParsedRecipeWithSource[]>([])
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sectionMap, setSectionMap] = useState<Record<string, string | null>>({})
  const [globalSection, setGlobalSection] = useState<string | null>(null)
  const [results, setResults] = useState<(PublishResult & { source_file: string })[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [skippedCount, setSkippedCount] = useState(0)
  const [duplicates, setDuplicates] = useState<Record<string, DuplicateMatch>>({})
  const [dupLoading, setDupLoading] = useState(false)
  const [publishProgress, setPublishProgress] = useState<{ done: number; total: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // webkitdirectory is non-standard — set via DOM after mount
  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '')
  }, [])

  const sectionsFor = (venueId: string | null) =>
    venueId ? sections.filter(s => s.venue_id === venueId && s.is_active) : []

  const isExcelFile = (f: File) => f.name.endsWith('.xlsx') || f.name.endsWith('.xls')

  // ── Core parser ────────────────────────────────────────────────────────────
  const parseFiles = useCallback(async (files: File[]) => {
    setParseError(null)
    try {
      const xlsx = await import('xlsx')
      const allRecipes: ParsedRecipeWithSource[] = []
      let totalSkipped = 0

      await Promise.all(files.map(async (file) => {
        const source_file = file.name

        // Per-file error isolation — one corrupt file must not crash the whole batch
        let workbook: Awaited<ReturnType<typeof xlsx.read>>
        try {
          const buffer = await file.arrayBuffer()
          // First attempt: standard options
          try {
            workbook = xlsx.read(buffer, { type: 'array', cellFormula: false })
          } catch {
            // Fallback: some xlsx files from Google Sheets / LibreOffice use non-standard
            // ZIP compression headers — try without cellFormula flag
            workbook = xlsx.read(buffer, { type: 'array' })
          }
        } catch (e) {
          // File is unreadable — add a single error row so it appears in the review table
          allRecipes.push({
            source_file,
            tab_name: source_file,
            venue_name: null,
            matched_venue_id: null,
            title: source_file,
            portion_size: null,
            recipe_size: null,
            selling_price: null,
            total_cost: null,
            cost_per_portion: null,
            ingredients: [],
            steps: [],
            status: 'error',
            errors: [`Cannot read file: ${String(e)}`],
            warnings: [],
          })
          return
        }

        const fileRecipes: ParsedRecipeWithSource[] = []

        if (format === 'standard-recipe-card') {
          const { parseStandardRecipeSheet } = await import('@/lib/excel/parser-standard-recipe')
          for (const sheetName of workbook.SheetNames) {
            if (shouldSkipTab(sheetName)) { totalSkipped++; continue }
            const sheet = workbook.Sheets[sheetName]
            const recipe = parseStandardRecipeSheet(
              sheet as Record<string, { v?: unknown; w?: string; t?: string }>,
              sheetName,
            )
            fileRecipes.push({ ...recipe, source_file })
          }
        } else {
          const { parseSheet } = await import('@/lib/excel/parser')
          for (const sheetName of workbook.SheetNames) {
            if (shouldSkipTab(sheetName)) { totalSkipped++; continue }
            const sheet = workbook.Sheets[sheetName]
            const recipe = parseSheet(
              sheet as Record<string, { v?: unknown; w?: string; t?: string }>,
              sheetName,
              venues,
            )
            fileRecipes.push({ ...recipe, source_file })
          }
        }

        allRecipes.push(...fileRecipes)
      }))

      setSkippedCount(totalSkipped)
      setParsed(allRecipes)
      setSelected(new Set(allRecipes.filter(r => r.status !== 'error').map(uid)))

      const autoSections: Record<string, string | null> = {}
      for (const r of allRecipes) {
        if (r.matched_venue_id) {
          const vs = sections.filter(s => s.venue_id === r.matched_venue_id && s.is_active)
          autoSections[uid(r)] = vs.length === 1 ? vs[0].id : null
        } else {
          autoSections[uid(r)] = null
        }
      }
      setSectionMap(autoSections)
      setStage('review')

      // Async duplicate check — uses uid as key so it works across multiple files
      const checks = allRecipes
        .filter(r => r.matched_venue_id && r.title?.trim())
        .map(r => ({ tab_name: uid(r), venue_id: r.matched_venue_id!, title: r.title! }))

      if (checks.length > 0) {
        setDupLoading(true)
        try {
          const res = await fetch('/api/import/check-duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(checks),
          })
          const matches: DuplicateMatch[] = await res.json()
          const dupMap: Record<string, DuplicateMatch> = {}
          for (const m of matches) dupMap[m.tab_name] = m
          setDuplicates(dupMap)
          setSelected(prev => {
            const next = new Set(prev)
            for (const key of Object.keys(dupMap)) next.delete(key)
            return next
          })
        } catch { /* advisory */ }
        finally { setDupLoading(false) }
      }
    } catch (e) {
      setParseError(`Failed to parse: ${String(e)}`)
    }
  }, [venues, sections, format])

  // Drop zone: accepts multiple individual .xlsx files dragged together.
  // Folder drag-and-drop is blocked by browsers — use the folder picker button instead.
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(isExcelFile)
    if (files.length === 0) {
      setParseError('No .xlsx or .xls files found. Drag individual Excel files, not a folder.')
      return
    }
    parseFiles(files)
  }, [parseFiles])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter(isExcelFile)
    if (files.length > 0) parseFiles(files)
  }, [parseFiles])

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleSelect = (key: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const selectAllOk  = () => setSelected(new Set(parsed.filter(r => r.status !== 'error').map(uid)))
  const deselectErrors = () => setSelected(prev => {
    const n = new Set(prev)
    parsed.filter(r => r.status === 'error').forEach(r => n.delete(uid(r)))
    return n
  })
  const selectNone = () => setSelected(new Set())

  const setSection = (key: string, sectionId: string | null) =>
    setSectionMap(prev => ({ ...prev, [key]: sectionId }))

  const applyGlobalSection = (sectionId: string | null) => {
    setGlobalSection(sectionId)
    if (!sectionId) return
    setSectionMap(prev => {
      const next = { ...prev }
      parsed.forEach(r => { next[uid(r)] = sectionId })
      return next
    })
  }

  // ── Publish in batches of 10 with live progress ────────────────────────────
  const publish = async () => {
    setStage('publishing')

    const toPublish = parsed
      .filter(r => selected.has(uid(r)) && r.matched_venue_id && r.title)
      .map(r => ({
        source_file: r.source_file,
        payload: {
          tab_name:         r.tab_name,
          venue_id:         r.matched_venue_id!,
          section_id:       sectionMap[uid(r)] ?? null,
          title:            r.title!,
          description:      r.description ?? null,
          portion_size:     r.portion_size,
          recipe_size:      r.recipe_size,
          selling_price:    r.selling_price,
          total_cost:       r.total_cost,
          cost_per_portion: r.cost_per_portion,
          ingredients:      r.ingredients,
          steps:            r.steps,
          replace_recipe_id: duplicates[uid(r)]?.existing_id,
        } as RecipePayload,
      }))

    setPublishProgress({ done: 0, total: toPublish.length })

    const BATCH = 10
    const allResults: (PublishResult & { source_file: string })[] = []

    for (let i = 0; i < toPublish.length; i += BATCH) {
      const batch = toPublish.slice(i, i + BATCH)
      try {
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch.map(b => b.payload)),
        })
        const batchResults: PublishResult[] = await res.json()
        batchResults.forEach((r, idx) =>
          allResults.push({ ...r, source_file: batch[idx].source_file })
        )
      } catch (e) {
        batch.forEach(b =>
          allResults.push({ tab_name: b.payload.tab_name, success: false, error: String(e), source_file: b.source_file })
        )
      }
      setPublishProgress({ done: Math.min(i + BATCH, toPublish.length), total: toPublish.length })
    }

    setResults(allResults)
    setStage('done')
  }

  const reset = () => {
    setStage('upload')
    setParsed([])
    setCollapsedFiles(new Set())
    setSelected(new Set())
    setSectionMap({})
    setGlobalSection(null)
    setResults([])
    setParseError(null)
    setSkippedCount(0)
    setDuplicates({})
    setDupLoading(false)
    setPublishProgress(null)
    if (fileInputRef.current)   fileInputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  // ── UPLOAD STAGE ───────────────────────────────────────────────────────────
  if (stage === 'upload') {
    const isSRC = format === 'standard-recipe-card'

    const venueSheetCells = [
      ['B1', 'Outlet / venue name'], ['B3', 'Recipe title'], ['B5', 'Portion size'],
      ['B6', 'Recipe size'], ['A10:A35', 'Ingredient quantities'], ['B10:B35', 'Units'],
      ['C10:C35', 'Ingredient name, prep note'], ['A48:A65', 'Method steps'],
      ['E45', 'Selling price'], ['F38', 'Total cost'], ['F39', 'Cost per portion'],
    ]
    const srcCells = [
      ['D3', 'Recipe name'], ['D4', 'Description'], ['D5', 'Recipe size (yield)'],
      ['D6', 'Number of portions'], ['D12', 'Venue hashtag (#OneTeamOneDream)'],
      ['B15:B39', 'Ingredient weights (kg decimal → ×1000)'], ['C15:C39', 'Unit'],
      ['D15:D39', 'Ingredient name'], ['E15:E39', 'Preparation note'],
      ['G40', 'Total recipe cost'], ['B42+', 'Method steps'],
    ]

    return (
      <div className="max-w-[600px]">
        {/* Format selector */}
        <div className="flex rounded-lg overflow-hidden mb-5" style={{ border: '1px solid rgba(26,23,20,0.12)' }}>
          {(['venue-cost-sheet', 'standard-recipe-card'] as ImportFormat[]).map(f => (
            <button
              key={f}
              onClick={() => { setFormat(f); setParseError(null) }}
              className="flex-1 px-4 py-2.5 text-[13px] font-semibold transition-colors"
              style={format === f ? { background: '#1A1714', color: '#FFFFFF' } : { background: '#FFFFFF', color: '#7A7470' }}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>

        {/* SRC venue badge */}
        {isSRC && (
          <div
            className="rounded-lg px-4 py-3 mb-5 flex items-center justify-between"
            style={{ border: '1px solid rgba(22,163,74,0.25)', background: 'rgba(22,163,74,0.05)' }}
          >
            <div>
              <p className="text-[11px] font-semibold text-[#4A4540] uppercase tracking-wide mb-0.5">Destination venue</p>
              <p className="text-[14px] font-medium text-[#1A1714]">One Team One Dream</p>
            </div>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: 'rgba(22,163,74,0.12)', color: '#15803d' }}>
              Auto-detected from D12
            </span>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className="rounded-card flex flex-col items-center justify-center gap-5 py-14 px-8 text-center transition-colors"
          style={{
            border: `2px dashed ${dragging ? '#C8973A' : 'rgba(26,23,20,0.18)'}`,
            background: dragging ? 'rgba(200,151,58,0.04)' : '#FFFFFF',
          }}
        >
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(26,23,20,0.06)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v13M7 8l5-5 5 5M4 19h16" stroke="#9A9490" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-75"
              style={{ background: '#1A1714', color: '#FFFFFF' }}
            >
              Select Files
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="text-[13px] font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-75"
              style={{ background: 'rgba(26,23,20,0.08)', color: '#1A1714', border: '1px solid rgba(26,23,20,0.12)' }}
            >
              Select Folder
            </button>
          </div>

          <p className="text-[#9A9490] text-[12px]">or drag multiple .xlsx files here</p>

          <input ref={fileInputRef}   type="file" multiple accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
          <input ref={folderInputRef} type="file" multiple                      className="hidden" onChange={onFileChange} />
        </div>

        {parseError && (
          <div className="mt-4 px-4 py-3 rounded-lg text-[13px]" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.20)' }}>
            {parseError}
          </div>
        )}

        {/* Cell layout guide */}
        <div className="mt-6 rounded-card p-5" style={{ border: '1px solid rgba(26,23,20,0.09)', background: '#FFFFFF' }}>
          <h3 className="font-fraunces text-[15px] text-[#1A1714] mb-3">Expected cell layout — {FORMAT_LABELS[format]}</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
            {(isSRC ? srcCells : venueSheetCells).map(([cell, desc]) => (
              <div key={cell} className="flex items-baseline gap-2">
                <code className="shrink-0 font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(26,23,20,0.06)', color: '#4A4540' }}>
                  {cell}
                </code>
                <span className="text-[#7A7470]">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── PUBLISHING STAGE ───────────────────────────────────────────────────────
  if (stage === 'publishing') {
    const prog = publishProgress
    const pct  = prog ? Math.round((prog.done / prog.total) * 100) : 0
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 max-w-[400px] mx-auto">
        <p className="font-fraunces text-[20px] text-[#1A1714]">Publishing recipes…</p>
        <div className="w-full rounded-full overflow-hidden" style={{ background: 'rgba(26,23,20,0.08)', height: 6 }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: '#1A1714' }}
          />
        </div>
        <p className="text-[13px] text-[#7A7470]">
          {prog ? `${prog.done} of ${prog.total} recipes` : 'Starting…'}
        </p>
      </div>
    )
  }

  // ── DONE STAGE ─────────────────────────────────────────────────────────────
  if (stage === 'done') {
    const succeeded = results.filter(r => r.success)
    const failed    = results.filter(r => !r.success)
    // Group results by file
    const byFile = new Map<string, typeof results>()
    for (const r of results) {
      const list = byFile.get(r.source_file) ?? []
      list.push(r)
      byFile.set(r.source_file, list)
    }

    return (
      <div className="max-w-[700px]">
        <div className="rounded-card p-6 mb-6 flex items-start gap-4" style={{ border: '1px solid rgba(26,23,20,0.09)', background: '#FFFFFF' }}>
          <div
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: succeeded.length > 0 ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.10)' }}
          >
            {succeeded.length > 0
              ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 9l4.5 4.5L15 5" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              : <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 5v5M9 12v1" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" /></svg>
            }
          </div>
          <div>
            <p className="font-fraunces text-[17px] text-[#1A1714] mb-0.5">
              {succeeded.length === results.length
                ? `All ${succeeded.length} recipes published`
                : `${succeeded.length} of ${results.length} recipes published`}
            </p>
            <p className="text-[13px] text-[#7A7470]">
              {byFile.size} {byFile.size === 1 ? 'file' : 'files'}
              {failed.length > 0 ? ` · ${failed.length} failed` : ''}
            </p>
          </div>
        </div>

        <div className="rounded-card overflow-hidden mb-6" style={{ border: '1px solid rgba(26,23,20,0.09)' }}>
          {Array.from(byFile.entries()).map(([fileName, fileResults]) => (
            <div key={fileName}>
              <div className="px-5 py-2 text-[11px] font-semibold text-[#7A7470] uppercase tracking-wide" style={{ background: 'rgba(26,23,20,0.03)', borderBottom: '1px solid rgba(26,23,20,0.06)' }}>
                {fileName}
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(26,23,20,0.06)' }}>
                {fileResults.map(r => (
                  <div key={r.tab_name} className="px-5 py-3 flex items-center justify-between gap-4">
                    <p className="text-[13px] text-[#1A1714] font-medium truncate">{r.tab_name}</p>
                    {!r.success && r.error && <p className="text-[11px] text-[#dc2626]">{r.error}</p>}
                    <span
                      className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded"
                      style={r.success
                        ? r.replaced ? { background: 'rgba(200,151,58,0.15)', color: '#7A5A00' } : { background: 'rgba(22,163,74,0.10)', color: '#15803d' }
                        : { background: 'rgba(220,38,38,0.10)', color: '#dc2626' }}
                    >
                      {r.success ? (r.replaced ? '↺ Replaced' : 'Published') : 'Failed'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button onClick={reset} className="px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80" style={{ background: '#1A1714', color: '#FFFFFF' }}>
          Import more files
        </button>
      </div>
    )
  }

  // ── REVIEW STAGE ───────────────────────────────────────────────────────────
  const fileGroups = Array.from(
    parsed.reduce((map, r) => {
      const list = map.get(r.source_file) ?? []
      list.push(r)
      map.set(r.source_file, list)
      return map
    }, new Map<string, ParsedRecipeWithSource[]>())
  )

  const totalFiles    = fileGroups.length
  const totalRecipes  = parsed.length
  const totalErrors   = parsed.filter(r => r.status === 'error').length
  const selectableCount = parsed.filter(r => r.status !== 'error').length
  const isSRCReview   = format === 'standard-recipe-card'

  // For "set section for all" — derive from first recipe's venue
  const firstVenueId = parsed.find(r => r.matched_venue_id)?.matched_venue_id ?? null
  const globalSections = sectionsFor(firstVenueId)

  const toggleFile = (fileName: string) =>
    setCollapsedFiles(prev => { const n = new Set(prev); n.has(fileName) ? n.delete(fileName) : n.add(fileName); return n })

  const COLS = '28px 140px 1fr 150px 190px 90px 80px'

  return (
    <div className="max-w-[1100px]">
      {/* Running total bar */}
      <div
        className="flex items-center justify-between gap-4 rounded-lg px-4 py-3 mb-4"
        style={{ border: '1px solid rgba(26,23,20,0.09)', background: '#FFFFFF' }}
      >
        <div className="flex items-center gap-4 min-w-0 flex-wrap">
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded shrink-0"
            style={{ background: 'rgba(26,23,20,0.06)', color: '#4A4540' }}
          >
            {FORMAT_LABELS[format]}
          </span>
          <span className="text-[13px] text-[#1A1714] font-medium">
            {totalFiles} {totalFiles === 1 ? 'file' : 'files'}
          </span>
          <span className="text-[13px] text-[#4A4540]">
            {totalRecipes} {totalRecipes === 1 ? 'recipe' : 'recipes'}
          </span>
          {totalErrors > 0 && (
            <span className="text-[13px] font-medium" style={{ color: '#dc2626' }}>
              {totalErrors} {totalErrors === 1 ? 'error' : 'errors'}
            </span>
          )}
          {skippedCount > 0 && (
            <span className="text-[12px] text-[#9A9490]">{skippedCount} tabs skipped</span>
          )}
          {dupLoading && <span className="text-[11px] text-[#7A4500] animate-pulse">Checking duplicates…</span>}
          {!dupLoading && Object.keys(duplicates).length > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: 'rgba(155,90,0,0.10)', color: '#7A4500' }}>
              {Object.keys(duplicates).length} duplicate{Object.keys(duplicates).length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button onClick={reset} className="text-[12px] text-[#7A7470] hover:text-[#4A4540] transition-colors shrink-0">
          Change files
        </button>
      </div>

      {/* Bulk action bar */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-[13px] text-[#4A4540]">{selected.size} of {selectableCount} selected</span>
        <button onClick={selectAllOk}    className="text-[12px] text-[#7A7470] hover:text-[#4A4540] transition-colors">Select all OK</button>
        <button onClick={deselectErrors} className="text-[12px] text-[#7A7470] hover:text-[#4A4540] transition-colors">Deselect errors</button>
        <button onClick={selectNone}     className="text-[12px] text-[#7A7470] hover:text-[#4A4540] transition-colors">None</button>

        {/* Set section for all — shown when recipes share a venue */}
        {globalSections.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[12px] text-[#7A7470]">Set section for all:</span>
            <select
              value={globalSection ?? ''}
              onChange={e => applyGlobalSection(e.target.value || null)}
              className="text-[12px] rounded px-2 py-1"
              style={{ border: '1px solid rgba(26,23,20,0.15)', background: '#FFFFFF', color: globalSection ? '#1A1714' : '#9A9490', outline: 'none' }}
            >
              <option value="">— Choose section —</option>
              {globalSections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <button
          onClick={publish}
          disabled={selected.size === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity disabled:opacity-40 ml-auto"
          style={{ background: '#1A1714', color: '#FFFFFF' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 9V2M3.5 5l3-3 3 3M1.5 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Publish {selected.size > 0 ? selected.size : ''} {selected.size === 1 ? 'recipe' : 'recipes'}
        </button>
      </div>

      {/* Review table */}
      <div className="overflow-x-auto rounded-card" style={{ border: '1px solid rgba(26,23,20,0.09)' }}>
        <div style={{ minWidth: 860, background: '#FFFFFF' }}>
          {/* Column header */}
          <div
            className="grid text-[11px] font-semibold tracking-[0.08em] uppercase text-[#7A7470] px-5 py-2.5 gap-3"
            style={{ background: 'rgba(26,23,20,0.03)', borderBottom: '1px solid rgba(26,23,20,0.07)', gridTemplateColumns: COLS }}
          >
            <span /><span>Tab</span><span>Recipe</span><span>Venue</span><span>Section</span><span>Notes</span><span>Status</span>
          </div>

          {/* File groups */}
          {fileGroups.map(([fileName, recipes]) => {
            const isCollapsed = collapsedFiles.has(fileName)
            const fileOk      = recipes.filter(r => r.status !== 'error').length
            const fileErrors  = recipes.filter(r => r.status === 'error').length
            const fileSelected = recipes.filter(r => selected.has(uid(r))).length

            return (
              <div key={fileName}>
                {/* File section header */}
                <button
                  onClick={() => toggleFile(fileName)}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-[rgba(26,23,20,0.02)]"
                  style={{ background: 'rgba(26,23,20,0.025)', borderBottom: '1px solid rgba(26,23,20,0.07)', borderTop: '1px solid rgba(26,23,20,0.05)' }}
                >
                  <svg
                    width="10" height="10" viewBox="0 0 10 10" fill="none"
                    className="shrink-0 transition-transform"
                    style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                  >
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="#9A9490" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M1.5 3.5h4l1 1.5H11.5v6H1.5z" stroke="#9A9490" strokeWidth="1.1" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[12px] font-medium text-[#1A1714] truncate">{fileName}</span>
                  <span className="text-[11px] text-[#7A7470] shrink-0">
                    {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
                    {fileSelected > 0 ? ` · ${fileSelected} selected` : ''}
                    {fileErrors > 0 ? ` · ${fileErrors} error${fileErrors !== 1 ? 's' : ''}` : ''}
                  </span>
                </button>

                {/* Recipe rows */}
                {!isCollapsed && (
                  <div className="divide-y" style={{ borderColor: 'rgba(26,23,20,0.06)' }}>
                    {recipes.map(recipe => {
                      const sc           = STATUS_CONFIG[recipe.status]
                      const isError      = recipe.status === 'error'
                      const key          = uid(recipe)
                      const isChecked    = selected.has(key)
                      const matchedVenue = venues.find(v => v.id === recipe.matched_venue_id)
                      const venueSects   = sectionsFor(recipe.matched_venue_id)
                      const curSection   = sectionMap[key] ?? null
                      const dup          = duplicates[key]

                      return (
                        <div
                          key={key}
                          className="grid items-center px-5 py-3 gap-3 transition-colors"
                          style={{ gridTemplateColumns: COLS, background: isChecked ? 'rgba(200,151,58,0.07)' : '#FFFFFF' }}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isError}
                            onChange={() => toggleSelect(key)}
                            className="w-4 h-4 cursor-pointer accent-[#1A1714] disabled:opacity-30"
                          />

                          {/* Tab */}
                          <div className="text-[12px] text-[#7A7470] font-mono truncate" title={recipe.tab_name}>
                            {recipe.tab_name}
                          </div>

                          {/* Recipe title + description */}
                          <div>
                            <div className="text-[13px] text-[#1A1714] font-medium truncate">
                              {recipe.title ?? <span className="text-[#dc2626] font-normal">Missing</span>}
                            </div>
                            {isSRCReview && recipe.description && (
                              <div className="text-[11px] text-[#7A7470] truncate mt-0.5">{recipe.description}</div>
                            )}
                          </div>

                          {/* Venue */}
                          <div className="text-[12px] truncate">
                            {matchedVenue
                              ? <span className="text-[#4A4540]">{matchedVenue.name}</span>
                              : recipe.venue_name
                                ? <span className="text-[#dc2626]">{recipe.venue_name} (no match)</span>
                                : <span className="text-[#dc2626]">Missing</span>
                            }
                          </div>

                          {/* Section dropdown */}
                          <div>
                            {recipe.matched_venue_id && venueSects.length > 0 ? (
                              <select
                                value={curSection ?? ''}
                                onChange={e => setSection(key, e.target.value || null)}
                                className="w-full text-[12px] rounded px-2 py-1"
                                style={{ border: '1px solid rgba(26,23,20,0.15)', background: '#FFFFFF', color: curSection ? '#1A1714' : '#9A9490', outline: 'none' }}
                              >
                                <option value="">— No section —</option>
                                {venueSects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            ) : (
                              <span className="text-[12px] text-[#7A7470]">—</span>
                            )}
                          </div>

                          {/* Notes */}
                          <div className="space-y-0.5">
                            {recipe.errors.map((e, i) => (
                              <p key={i} className="text-[11px] text-[#dc2626] leading-snug">{e}</p>
                            ))}
                            {recipe.warnings.map((w, i) => (
                              <p key={i} className="text-[11px] leading-snug" style={{ color: '#7A4500' }}>{w}</p>
                            ))}
                            <p className="text-[11px] text-[#7A7470]">
                              {recipe.ingredients.filter(i => i.name).length} ing
                              {recipe.steps.length > 0 ? ` · ${recipe.steps.length} steps` : ''}
                            </p>
                            {dup && (
                              <div className="mt-1 pt-1" style={{ borderTop: '1px solid rgba(155,90,0,0.15)' }}>
                                <p className="text-[11px]" style={{ color: '#7A4500' }}>Matches: &ldquo;{dup.existing_title}&rdquo;</p>
                                <button
                                  onClick={() => toggleSelect(key)}
                                  className="mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded transition-opacity hover:opacity-70"
                                  style={isChecked
                                    ? { background: 'rgba(26,23,20,0.07)', color: '#4A4540' }
                                    : { background: 'rgba(155,90,0,0.12)', color: '#7A4500' }}
                                >
                                  {isChecked ? '✗ Skip instead' : '↺ Replace existing'}
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Status */}
                          <div className="flex flex-col items-start gap-1">
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded whitespace-nowrap" style={{ background: sc.bg, color: sc.text }}>
                              {sc.label}
                            </span>
                            {dup && (
                              <span
                                className="text-[11px] font-semibold px-2 py-0.5 rounded whitespace-nowrap"
                                style={isChecked
                                  ? { background: 'rgba(200,151,58,0.15)', color: '#7A5A00' }
                                  : { background: 'rgba(155,90,0,0.10)', color: '#7A4500' }}
                              >
                                {isChecked ? '↺ Replace' : '⚠ Exists'}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Sticky publish footer */}
      {selected.size > 0 && (
        <div
          className="mt-5 flex items-center justify-between gap-4 rounded-card px-5 py-4"
          style={{ border: '1px solid rgba(200,151,58,0.30)', background: 'rgba(200,151,58,0.05)' }}
        >
          <p className="text-[13px] text-[#4A4540]">
            Ready to publish <strong className="text-[#1A1714]">{selected.size}</strong>{' '}
            {selected.size === 1 ? 'recipe' : 'recipes'} as drafts
          </p>
          <button
            onClick={publish}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#1A1714', color: '#FFFFFF' }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 9V2M3.5 5l3-3 3 3M1.5 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Publish {selected.size} {selected.size === 1 ? 'recipe' : 'recipes'}
          </button>
        </div>
      )}
    </div>
  )
}
