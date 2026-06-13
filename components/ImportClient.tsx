'use client'

import { useState, useCallback, useRef } from 'react'
import type { Venue, Section } from '@/lib/types/database.types'
import type { ParsedRecipe } from '@/lib/excel/parser'
import { shouldSkipTab } from '@/lib/excel/parser'
import type { RecipePayload, PublishResult, DuplicateMatch } from '@/app/import/actions'

type Stage = 'upload' | 'review' | 'publishing' | 'done'

const STATUS_CONFIG = {
  ok:      { label: '✓ OK',      bg: 'rgba(22,163,74,0.10)',  text: '#15803d' },
  warning: { label: '⚠ Warning', bg: 'rgba(155,90,0,0.10)',    text: '#7A4500' },
  error:   { label: '✗ Error',   bg: 'rgba(220,38,38,0.10)',  text: '#dc2626' },
}

interface Props {
  venues: Venue[]
  sections: Section[]
}

export function ImportClient({ venues, sections }: Props) {
  const [stage, setStage] = useState<Stage>('upload')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedRecipe[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // section assignments per tab_name
  const [sectionMap, setSectionMap] = useState<Record<string, string | null>>({})
  const [results, setResults] = useState<PublishResult[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [skippedTabs, setSkippedTabs] = useState<string[]>([])
  const [duplicates, setDuplicates] = useState<Record<string, DuplicateMatch>>({})
  const [dupLoading, setDupLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const sectionsFor = (venueId: string | null) =>
    venueId ? sections.filter(s => s.venue_id === venueId && s.is_active) : []

  const parseFile = useCallback(async (file: File) => {
    setParseError(null)
    setFileName(file.name)
    try {
      const xlsx = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = xlsx.read(buffer, { type: 'array', cellFormula: false })

      const { parseSheet } = await import('@/lib/excel/parser')
      const recipes: ParsedRecipe[] = []

      const skipped: string[] = []
      for (const sheetName of workbook.SheetNames) {
        if (shouldSkipTab(sheetName)) { skipped.push(sheetName); continue }
        const sheet = workbook.Sheets[sheetName]
        const recipe = parseSheet(sheet as Record<string, { v?: unknown; w?: string; t?: string }>, sheetName, venues)
        recipes.push(recipe)
      }
      setSkippedTabs(skipped)

      setParsed(recipes)
      setSelected(new Set(recipes.filter(r => r.status !== 'error').map(r => r.tab_name)))
      // Pre-fill sections: if venue matched and it has exactly one section, auto-select it
      const autoSections: Record<string, string | null> = {}
      for (const r of recipes) {
        if (r.matched_venue_id) {
          const venueSections = sections.filter(s => s.venue_id === r.matched_venue_id && s.is_active)
          autoSections[r.tab_name] = venueSections.length === 1 ? venueSections[0].id : null
        } else {
          autoSections[r.tab_name] = null
        }
      }
      setSectionMap(autoSections)
      setStage('review')

      // Async duplicate check — runs after review screen is visible
      const checks = recipes
        .filter(r => r.matched_venue_id && r.title?.trim())
        .map(r => ({ tab_name: r.tab_name, venue_id: r.matched_venue_id!, title: r.title! }))

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
          // Auto-untick any row that already exists in the database
          setSelected(prev => {
            const next = new Set(prev)
            for (const tabName of Object.keys(dupMap)) next.delete(tabName)
            return next
          })
        } catch {
          // Silent fail — duplicate detection is advisory, not blocking
        } finally {
          setDupLoading(false)
        }
      }
    } catch (e) {
      setParseError(`Failed to parse file: ${String(e)}`)
    }
  }, [venues, sections])

  const isExcelFile = (file: File) =>
    file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && isExcelFile(file)) parseFile(file)
    else setParseError('Please upload an .xlsx or .xls file.')
  }, [parseFile])

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
  }, [parseFile])

  const toggleSelect = (tabName: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(tabName)) next.delete(tabName)
      else next.add(tabName)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(parsed.map(r => r.tab_name)))
  const selectNone = () => setSelected(new Set())

  const setSection = (tabName: string, sectionId: string | null) =>
    setSectionMap(prev => ({ ...prev, [tabName]: sectionId }))

  const publish = async () => {
    setStage('publishing')
    const toPublish: RecipePayload[] = parsed
      .filter(r => selected.has(r.tab_name) && r.matched_venue_id && r.title)
      .map(r => ({
        tab_name: r.tab_name,
        venue_id: r.matched_venue_id!,
        section_id: sectionMap[r.tab_name] ?? null,
        title: r.title!,
        portion_size: r.portion_size,
        recipe_size: r.recipe_size,
        selling_price: r.selling_price,
        total_cost: r.total_cost,
        cost_per_portion: r.cost_per_portion,
        ingredients: r.ingredients,
        steps: r.steps,
        replace_recipe_id: duplicates[r.tab_name]?.existing_id,
      }))

    const response = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toPublish),
    })
    const res: PublishResult[] = await response.json()
    setResults(res)
    setStage('done')
  }

  const reset = () => {
    setStage('upload')
    setFileName(null)
    setParsed([])
    setSelected(new Set())
    setSectionMap({})
    setResults([])
    setParseError(null)
    setSkippedTabs([])
    setDuplicates({})
    setDupLoading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  // ── Upload stage ──────────────────────────────────────────────────────────
  if (stage === 'upload') {
    return (
      <div className="max-w-[600px]">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-card flex flex-col items-center justify-center gap-4 py-16 px-8 text-center transition-colors"
          style={{
            border: `2px dashed ${dragging ? '#C8973A' : 'rgba(26,23,20,0.18)'}`,
            background: dragging ? 'rgba(200,151,58,0.04)' : '#FFFFFF',
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(26,23,20,0.06)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v13M7 8l5-5 5 5M4 19h16" stroke="#9A9490" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="font-fraunces text-[17px] text-[#1A1714] mb-1">Drop your workbook here</p>
            <p className="text-[#7A7470] text-[13px]">or click to browse — .xlsx or .xls files</p>
          </div>
          <div
            className="text-[11px] text-[#7A7470] px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(26,23,20,0.04)', border: '1px solid rgba(26,23,20,0.08)' }}
          >
            Each worksheet tab = one recipe
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
        </div>

        {parseError && (
          <div
            className="mt-4 px-4 py-3 rounded-lg text-[13px]"
            style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.20)' }}
          >
            {parseError}
          </div>
        )}

        {/* Cell layout guide */}
        <div
          className="mt-6 rounded-card p-5"
          style={{ border: '1px solid rgba(26,23,20,0.09)', background: '#FFFFFF' }}
        >
          <h3 className="font-fraunces text-[15px] text-[#1A1714] mb-3">Expected cell layout</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
            {[
              ['B1', 'Outlet / venue name'],
              ['B3', 'Recipe title'],
              ['B5', 'Portion size'],
              ['B6', 'Recipe size'],
              ['A10:A35', 'Ingredient quantities'],
              ['B10:B35', 'Units'],
              ['C10:C35', 'Ingredient name, prep note'],
              ['A51:A63', 'Method steps'],
              ['E45', 'Selling price'],
              ['F38', 'Total cost'],
              ['F39', 'Cost per portion'],
            ].map(([cell, desc]) => (
              <div key={cell} className="flex items-baseline gap-2">
                <code
                  className="shrink-0 font-mono text-[11px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(26,23,20,0.06)', color: '#4A4540' }}
                >
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

  // ── Publishing stage ──────────────────────────────────────────────────────
  if (stage === 'publishing') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-[rgba(26,23,20,0.12)] border-t-[#1A1714] animate-spin" />
        <p className="font-fraunces text-[18px] text-[#1A1714]">Publishing recipes…</p>
        <p className="text-[#7A7470] text-[13px]">
          Adding {selected.size} {selected.size === 1 ? 'recipe' : 'recipes'} to the database
        </p>
      </div>
    )
  }

  // ── Done stage ────────────────────────────────────────────────────────────
  if (stage === 'done') {
    const succeeded = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    return (
      <div className="max-w-[700px]">
        <div
          className="rounded-card p-6 mb-6 flex items-start gap-4"
          style={{ border: '1px solid rgba(26,23,20,0.09)', background: '#FFFFFF' }}
        >
          <div
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: succeeded.length > 0 ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.10)' }}
          >
            {succeeded.length > 0 ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 9l4.5 4.5L15 5" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 5v5M9 12v1" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-fraunces text-[17px] text-[#1A1714] mb-0.5">
              {succeeded.length === results.length
                ? `All ${succeeded.length} recipes published`
                : `${succeeded.length} of ${results.length} recipes published`}
            </p>
            {failed.length > 0 && (
              <p className="text-[13px] text-[#4A4540]">
                {failed.length} {failed.length === 1 ? 'recipe' : 'recipes'} failed — see details below
              </p>
            )}
          </div>
        </div>

        <div
          className="rounded-card overflow-hidden mb-6"
          style={{ border: '1px solid rgba(26,23,20,0.09)' }}
        >
          <div className="divide-y" style={{ borderColor: 'rgba(26,23,20,0.06)' }}>
            {results.map(r => (
              <div key={r.tab_name} className="px-5 py-3.5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[14px] text-[#1A1714] font-medium truncate">{r.tab_name}</p>
                  {!r.success && r.error && (
                    <p className="text-[12px] text-[#dc2626] mt-0.5">{r.error}</p>
                  )}
                </div>
                <span
                  className="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded"
                  style={
                    r.success
                      ? r.replaced
                        ? { background: 'rgba(200,151,58,0.15)', color: '#7A5A00' }
                        : { background: 'rgba(22,163,74,0.10)', color: '#15803d' }
                      : { background: 'rgba(220,38,38,0.10)', color: '#dc2626' }
                  }
                >
                  {r.success ? (r.replaced ? '↺ Replaced' : 'Published') : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#1A1714', color: '#FFFFFF' }}
        >
          Import another file
        </button>
      </div>
    )
  }

  // ── Review stage ──────────────────────────────────────────────────────────
  const selectableCount = parsed.filter(r => r.status !== 'error').length

  return (
    <div className="max-w-[1100px]">
      {/* File info bar */}
      <div
        className="flex items-center justify-between gap-4 rounded-lg px-4 py-3 mb-6"
        style={{ border: '1px solid rgba(26,23,20,0.09)', background: '#FFFFFF' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M9.5 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9.5 1.5z" stroke="#9A9490" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M9.5 1.5v4H13.5" stroke="#9A9490" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
          <span className="text-[13px] text-[#1A1714] font-medium truncate">{fileName}</span>
          <span className="text-[12px] text-[#7A7470] shrink-0">
            {parsed.length} {parsed.length === 1 ? 'recipe tab' : 'recipe tabs'} found
          </span>
          {skippedTabs.length > 0 && (
            <span
              className="text-[11px] px-2 py-0.5 rounded"
              style={{ background: 'rgba(26,23,20,0.05)', color: '#9A9490' }}
              title={`Skipped: ${skippedTabs.join(', ')}`}
            >
              {skippedTabs.length} skipped ({skippedTabs.join(', ')})
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {dupLoading && (
            <span className="text-[11px] text-[#7A4500] animate-pulse">
              Checking for duplicates…
            </span>
          )}
          {!dupLoading && Object.keys(duplicates).length > 0 && (
            <span
              className="text-[11px] font-medium px-2 py-0.5 rounded"
              style={{ background: 'rgba(155,90,0,0.10)', color: '#7A4500' }}
            >
              {Object.keys(duplicates).length} duplicate{Object.keys(duplicates).length !== 1 ? 's' : ''} found
            </span>
          )}
          <button
            onClick={reset}
            className="text-[12px] text-[#7A7470] hover:text-[#4A4540] transition-colors"
          >
            Change file
          </button>
        </div>
      </div>

      {/* Selection + publish bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[#4A4540]">
            {selected.size} of {selectableCount} selected
          </span>
          <button onClick={selectAll} className="text-[12px] text-[#7A7470] hover:text-[#4A4540] transition-colors">
            Select all
          </button>
          <button onClick={selectNone} className="text-[12px] text-[#7A7470] hover:text-[#4A4540] transition-colors">
            None
          </button>
        </div>
        <button
          onClick={publish}
          disabled={selected.size === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity disabled:opacity-40"
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
      <div
        className="overflow-hidden"
        style={{ minWidth: 860, background: '#FFFFFF' }}
      >
        {/* Header */}
        <div
          className="grid text-[11px] font-semibold tracking-[0.08em] uppercase text-[#7A7470] px-5 py-2.5 gap-3"
          style={{
            background: 'rgba(26,23,20,0.03)',
            borderBottom: '1px solid rgba(26,23,20,0.07)',
            gridTemplateColumns: '28px 140px 1fr 160px 200px 100px 80px',
          }}
        >
          <span />
          <span>Tab</span>
          <span>Recipe</span>
          <span>Venue</span>
          <span>Section</span>
          <span>Notes</span>
          <span>Status</span>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: 'rgba(26,23,20,0.06)' }}>
          {parsed.map(recipe => {
            const sc = STATUS_CONFIG[recipe.status]
            const isError = recipe.status === 'error'
            const isChecked = selected.has(recipe.tab_name)
            const matchedVenue = venues.find(v => v.id === recipe.matched_venue_id)
            const venueSections = sectionsFor(recipe.matched_venue_id)
            const currentSection = sectionMap[recipe.tab_name] ?? null

            return (
              <div
                key={recipe.tab_name}
                className="grid items-center px-5 py-3 gap-3 transition-colors"
                style={{
                  gridTemplateColumns: '28px 140px 1fr 160px 200px 100px 80px',
                  background: isChecked ? 'rgba(200,151,58,0.08)' : '#FFFFFF',
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isError}
                  onChange={() => toggleSelect(recipe.tab_name)}
                  className="w-4 h-4 cursor-pointer accent-[#1A1714] disabled:opacity-30"
                />

                {/* Tab name */}
                <div className="text-[12px] text-[#7A7470] font-mono truncate" title={recipe.tab_name}>
                  {recipe.tab_name}
                </div>

                {/* Recipe title */}
                <div className="text-[13px] text-[#1A1714] font-medium truncate">
                  {recipe.title ?? <span className="text-[#dc2626] font-normal">Missing</span>}
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
                  {recipe.matched_venue_id && venueSections.length > 0 ? (
                    <select
                      value={currentSection ?? ''}
                      onChange={e => setSection(recipe.tab_name, e.target.value || null)}
                      className="w-full text-[12px] rounded px-2 py-1 transition-colors"
                      style={{
                        border: '1px solid rgba(26,23,20,0.15)',
                        background: '#FFFFFF',
                        color: currentSection ? '#1A1714' : '#9A9490',
                        outline: 'none',
                      }}
                    >
                      <option value="">— No section —</option>
                      {venueSections.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
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
                    {recipe.ingredients.filter(i => i.name).length} ingredients
                    {recipe.steps.length > 0 ? ` · ${recipe.steps.length} steps` : ''}
                    {recipe.cost_per_portion ? ` · ${recipe.cost_per_portion.toFixed(3)}/portion` : ''}
                  </p>
                  {duplicates[recipe.tab_name] && (
                    <div className="mt-1 pt-1" style={{ borderTop: '1px solid rgba(155,90,0,0.15)' }}>
                      <p className="text-[11px] leading-snug" style={{ color: '#7A4500' }}>
                        Matches: &ldquo;{duplicates[recipe.tab_name].existing_title}&rdquo;
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {isChecked ? (
                          <button
                            onClick={() => toggleSelect(recipe.tab_name)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded transition-opacity hover:opacity-70"
                            style={{ background: 'rgba(26,23,20,0.07)', color: '#4A4540' }}
                          >
                            ✗ Skip instead
                          </button>
                        ) : (
                          <button
                            onClick={() => toggleSelect(recipe.tab_name)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded transition-opacity hover:opacity-70"
                            style={{ background: 'rgba(155,90,0,0.12)', color: '#7A4500' }}
                          >
                            ↺ Replace existing
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex flex-col items-start gap-1">
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded whitespace-nowrap"
                    style={{ background: sc.bg, color: sc.text }}
                  >
                    {sc.label}
                  </span>
                  {duplicates[recipe.tab_name] && (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded whitespace-nowrap"
                      style={
                        isChecked
                          ? { background: 'rgba(200,151,58,0.15)', color: '#7A5A00' }
                          : { background: 'rgba(155,90,0,0.10)', color: '#7A4500' }
                      }
                    >
                      {isChecked ? '↺ Replace' : '⚠ Exists'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
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
