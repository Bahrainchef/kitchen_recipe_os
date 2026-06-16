'use client'

import { useState, useMemo, useCallback } from 'react'
import type { IngredientMaster, IngredientCategory, Venue } from '@/lib/types/database.types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngredientWithUsage extends IngredientMaster {
  recipe_count: number
  venue_ids: string[]
}

interface DuplicatePair {
  a: IngredientWithUsage
  b: IngredientWithUsage
  score: number
}

interface Props {
  ingredients: IngredientWithUsage[]
  duplicates: DuplicatePair[]
  venues: Venue[]
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_COLOR: Record<IngredientCategory, { bg: string; text: string }> = {
  dairy:             { bg: 'rgba(126,184,247,0.12)', text: '#2563eb' },
  proteins:          { bg: 'rgba(240,144,184,0.12)', text: '#be185d' },
  vegetables:        { bg: 'rgba(78,205,196,0.12)',  text: '#0f766e' },
  herbs_spices:      { bg: 'rgba(74,222,128,0.12)',  text: '#15803d' },
  oils_fats:         { bg: 'rgba(200,151,58,0.12)',  text: '#92400e' },
  dry_goods:         { bg: 'rgba(180,150,100,0.12)', text: '#78350f' },
  beverages:         { bg: 'rgba(139,92,246,0.12)',  text: '#6d28d9' },
  sauces_condiments: { bg: 'rgba(249,115,22,0.12)',  text: '#c2410c' },
  fruits:            { bg: 'rgba(236,72,153,0.12)',  text: '#9d174d' },
  bakery:            { bg: 'rgba(217,119,6,0.12)',   text: '#92400e' },
  seafood:           { bg: 'rgba(14,165,233,0.12)',  text: '#0369a1' },
  other:             { bg: 'rgba(107,114,128,0.10)', text: '#374151' },
}

const CATEGORY_LABEL: Record<IngredientCategory, string> = {
  dairy:             'Dairy',
  proteins:          'Proteins',
  vegetables:        'Vegetables',
  herbs_spices:      'Herbs & Spices',
  oils_fats:         'Oils & Fats',
  dry_goods:         'Dry Goods',
  beverages:         'Beverages',
  sauces_condiments: 'Sauces',
  fruits:            'Fruits',
  bakery:            'Bakery',
  seafood:           'Seafood',
  other:             'Other',
}

const ALL_CATEGORIES: IngredientCategory[] = [
  'dairy', 'proteins', 'vegetables', 'herbs_spices', 'oils_fats',
  'dry_goods', 'beverages', 'sauces_condiments', 'fruits', 'bakery', 'seafood', 'other',
]

// ─── Merge modal ──────────────────────────────────────────────────────────────

interface MergeModalProps {
  pair: DuplicatePair
  onClose: () => void
  onMerged: () => void
}

function MergeModal({ pair, onClose, onMerged }: MergeModalProps) {
  const [keepId, setKeepId] = useState<string>(pair.a.id)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const keepIngredient = keepId === pair.a.id ? pair.a : pair.b
  const mergeIngredient = keepId === pair.a.id ? pair.b : pair.a

  const handleMerge = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ingredients/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep_id: keepIngredient.id, merge_id: mergeIngredient.id }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `Server error ${res.status}`)
      }
      onMerged()
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [keepIngredient.id, mergeIngredient.id, onMerged])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,23,20,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[580px] rounded-card p-6"
        style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.09)' }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="font-fraunces text-[18px] text-[#1A1714] mb-0.5">Merge ingredients</h2>
            <p className="text-[13px] text-[#7A7470]">
              Choose which ingredient to keep. The other will be merged into it.
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:opacity-70"
            style={{ background: 'rgba(26,23,20,0.06)', color: '#4A4540' }}
          >
            ✕
          </button>
        </div>

        {/* Similarity badge */}
        <div className="flex items-center gap-2 mb-5">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded"
            style={{ background: 'rgba(155,90,0,0.10)', color: '#7A4500' }}
          >
            {Math.round(pair.score * 100)}% similarity
          </span>
        </div>

        {/* Two-card radio selection */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[pair.a, pair.b].map(ing => {
            const isKeep = keepId === ing.id
            const catColor = CATEGORY_COLOR[(ing.category ?? 'other') as IngredientCategory] ?? CATEGORY_COLOR['other']
            return (
              <label
                key={ing.id}
                className="flex flex-col gap-2 p-4 rounded-xl cursor-pointer transition-all"
                style={{
                  border: isKeep
                    ? '2px solid #1A1714'
                    : '2px solid rgba(26,23,20,0.12)',
                  background: isKeep ? 'rgba(26,23,20,0.03)' : '#FFFFFF',
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <input
                    type="radio"
                    name="keep"
                    value={ing.id}
                    checked={isKeep}
                    onChange={() => setKeepId(ing.id)}
                    className="mt-0.5 accent-[#1A1714]"
                  />
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={
                      isKeep
                        ? { background: 'rgba(26,23,20,0.08)', color: '#1A1714' }
                        : { background: 'rgba(26,23,20,0.04)', color: '#7A7470' }
                    }
                  >
                    {isKeep ? 'Keep this' : 'Merge away'}
                  </span>
                </div>
                <p className="text-[14px] text-[#1A1714] font-medium leading-snug">
                  {ing.canonical_name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: catColor.bg, color: catColor.text }}
                  >
                    {CATEGORY_LABEL[(ing.category ?? 'other') as IngredientCategory] ?? ing.category ?? 'Other'}
                  </span>
                  {ing.default_unit && (
                    <span
                      className="text-[11px] px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(26,23,20,0.05)', color: '#4A4540' }}
                    >
                      {ing.default_unit}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#7A7470]">
                  {ing.recipe_count} {ing.recipe_count === 1 ? 'recipe' : 'recipes'}
                  {ing.aliases.length > 0 && ` · ${ing.aliases.length} aliases`}
                </p>
              </label>
            )
          })}
        </div>

        {/* Summary line */}
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg mb-5 text-[13px]"
          style={{ background: 'rgba(26,23,20,0.04)', border: '1px solid rgba(26,23,20,0.07)' }}
        >
          <span className="text-[#1A1714] font-medium truncate">{keepIngredient.canonical_name}</span>
          <span className="text-[#7A7470] shrink-0">← absorbs →</span>
          <span className="text-[#4A4540] truncate">{mergeIngredient.canonical_name}</span>
        </div>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-[13px]"
            style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.20)' }}
          >
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-70"
            style={{ border: '1px solid rgba(26,23,20,0.18)', color: '#1A1714', background: '#FFFFFF' }}
          >
            Cancel
          </button>
          <button
            onClick={handleMerge}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: '#1A1714', color: '#FFFFFF' }}
          >
            {loading ? 'Merging…' : 'Confirm Merge'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IngredientsClient({ ingredients, duplicates, venues }: Props) {
  // Filter state
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<IngredientCategory | 'all'>('all')

  // Selection state
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  // Duplicates panel
  const [dupsOpen, setDupsOpen] = useState(true)

  // Merge modal
  const [mergePair, setMergePair] = useState<DuplicatePair | null>(null)

  // Bulk action state
  const [bulkCategory, setBulkCategory] = useState<IngredientCategory | ''>('')
  const [bulkUnit, setBulkUnit] = useState('')

  // Edit tooltip state
  const [editTooltipId, setEditTooltipId] = useState<string | null>(null)

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:      ingredients.length,
    unreviewed: ingredients.filter(i => !i.is_reviewed).length,
    duplicates: duplicates.length,
    linked:     ingredients.filter(i => i.recipe_count > 0).length,
  }), [ingredients, duplicates])

  // ── Venue lookup ──────────────────────────────────────────────────────────

  const venueById = useMemo(() => {
    const map: Record<string, Venue> = {}
    for (const v of venues) map[v.id] = v
    return map
  }, [venues])

  // ── Category counts ───────────────────────────────────────────────────────

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<IngredientCategory, number>> = {}
    for (const ing of ingredients) {
      if (!ing.category) continue
      const cat = ing.category as IngredientCategory
      counts[cat] = (counts[cat] ?? 0) + 1
    }
    return counts
  }, [ingredients])

  const activeCategories = useMemo(
    () => ALL_CATEGORIES.filter(c => (categoryCounts[c] ?? 0) > 0),
    [categoryCounts],
  )

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return ingredients.filter(ing => {
      if (categoryFilter !== 'all' && ing.category !== categoryFilter) return false
      if (q) {
        const inName = ing.canonical_name.toLowerCase().includes(q)
        const inAliases = ing.aliases.some(a => a.toLowerCase().includes(q))
        if (!inName && !inAliases) return false
      }
      return true
    })
  }, [ingredients, search, categoryFilter])

  // ── Checkbox helpers ──────────────────────────────────────────────────────

  const allChecked = filtered.length > 0 && filtered.every(i => checkedIds.has(i.id))
  const someChecked = filtered.some(i => checkedIds.has(i.id))

  const toggleAll = useCallback(() => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (allChecked) {
        for (const i of filtered) next.delete(i.id)
      } else {
        for (const i of filtered) next.add(i.id)
      }
      return next
    })
  }, [allChecked, filtered])

  const toggleOne = useCallback((id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectedIds = useMemo(
    () => [...checkedIds].filter(id => filtered.some(i => i.id === id)),
    [checkedIds, filtered],
  )

  // ── Bulk actions ──────────────────────────────────────────────────────────

  const handleMarkReviewed = useCallback(async () => {
    console.log('[bulk-review] POST /api/ingredients/bulk-review', { ids: selectedIds })
    // API route to be implemented separately
  }, [selectedIds])

  const handleMergeSelected = useCallback(() => {
    if (selectedIds.length !== 2) return
    const a = ingredients.find(i => i.id === selectedIds[0])
    const b = ingredients.find(i => i.id === selectedIds[1])
    if (a && b) setMergePair({ a, b, score: 0 })
  }, [selectedIds, ingredients])

  // ── Merge success ─────────────────────────────────────────────────────────

  const handleMerged = useCallback(() => {
    setMergePair(null)
    // Reload — parent page handles data; a hard reload is simplest
    window.location.reload()
  }, [])

  // ── Review action (per row) ───────────────────────────────────────────────

  const handleReview = useCallback(async (id: string) => {
    console.log('[review] POST /api/ingredients/bulk-review', { ids: [id] })
    // API route to be implemented separately
  }, [])

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Stats bar ── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { label: 'Total ingredients', value: stats.total },
          { label: 'Unreviewed',        value: stats.unreviewed, warn: stats.unreviewed > 0 },
          { label: 'Potential duplicates', value: stats.duplicates, warn: stats.duplicates > 0 },
          { label: 'Linked to recipes', value: stats.linked },
        ].map(stat => (
          <div
            key={stat.label}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ border: '1px solid rgba(26,23,20,0.09)', background: '#FFFFFF' }}
          >
            <span
              className="font-fraunces text-[22px] leading-none"
              style={{ color: stat.warn ? '#7A4500' : '#1A1714' }}
            >
              {stat.value}
            </span>
            <span className="text-[12px] text-[#7A7470] leading-snug max-w-[90px]">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* ── Duplicates panel ── */}
      {duplicates.length > 0 && (
        <div
          className="rounded-card mb-6 overflow-hidden"
          style={{ border: '1px solid rgba(155,90,0,0.25)', background: 'rgba(155,90,0,0.06)' }}
        >
          {/* Header row */}
          <button
            className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left"
            onClick={() => setDupsOpen(o => !o)}
          >
            <span className="text-[13px] font-semibold" style={{ color: '#7A4500' }}>
              ⚠ {duplicates.length} potential {duplicates.length === 1 ? 'duplicate' : 'duplicates'} detected
            </span>
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              style={{ color: '#7A4500', transform: dupsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {dupsOpen && (
            <div
              className="divide-y"
              style={{ borderColor: 'rgba(155,90,0,0.15)', borderTop: '1px solid rgba(155,90,0,0.15)' }}
            >
              {duplicates.map((pair, idx) => (
                <div
                  key={`${pair.a.id}-${pair.b.id}-${idx}`}
                  className="flex items-center gap-3 px-5 py-3 flex-wrap"
                >
                  <span className="text-[13px] text-[#1A1714] font-medium flex-1 min-w-[120px] truncate">
                    {pair.a.canonical_name}
                  </span>
                  <span className="text-[12px] shrink-0" style={{ color: '#7A7470' }}>↔</span>
                  <span className="text-[13px] text-[#1A1714] font-medium flex-1 min-w-[120px] truncate">
                    {pair.b.canonical_name}
                  </span>
                  <span
                    className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded"
                    style={{ background: 'rgba(155,90,0,0.12)', color: '#7A4500' }}
                  >
                    {Math.round(pair.score * 100)}% match
                  </span>
                  <button
                    onClick={() => setMergePair(pair)}
                    className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
                    style={{ background: '#1A1714', color: '#FFFFFF' }}
                  >
                    Merge →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Search + category filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14" height="14" viewBox="0 0 14 14" fill="none"
          >
            <circle cx="6" cy="6" r="4.5" stroke="#9A9490" strokeWidth="1.3" />
            <path d="M9.5 9.5L12.5 12.5" stroke="#9A9490" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search ingredients or aliases…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-4 py-2 text-[13px] rounded-lg transition-colors outline-none"
            style={{
              border: '1px solid rgba(26,23,20,0.15)',
              background: '#FFFFFF',
              color: '#1A1714',
              width: 260,
            }}
          />
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* All pill */}
          <button
            onClick={() => setCategoryFilter('all')}
            className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={
              categoryFilter === 'all'
                ? { background: '#1A1714', color: '#FFFFFF' }
                : { background: '#FFFFFF', color: '#4A4540', border: '1px solid rgba(26,23,20,0.15)' }
            }
          >
            All
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold"
              style={
                categoryFilter === 'all'
                  ? { background: 'rgba(255,255,255,0.18)', color: '#FFFFFF' }
                  : { background: 'rgba(26,23,20,0.07)', color: '#7A7470' }
              }
            >
              {ingredients.length}
            </span>
          </button>

          {activeCategories.map(cat => {
            const active = categoryFilter === cat
            const col = CATEGORY_COLOR[cat]
            const count = categoryCounts[cat] ?? 0
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(active ? 'all' : cat)}
                className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={
                  active
                    ? { background: col.text, color: '#FFFFFF' }
                    : { background: '#FFFFFF', color: col.text, border: `1px solid ${col.text}22` }
                }
              >
                {CATEGORY_LABEL[cat]}
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                  style={
                    active
                      ? { background: 'rgba(255,255,255,0.20)', color: '#FFFFFF' }
                      : { background: col.bg, color: col.text }
                  }
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selectedIds.length > 0 && (
        <div
          className="flex items-center gap-3 flex-wrap rounded-xl px-4 py-3 mb-4"
          style={{ background: 'rgba(26,23,20,0.05)', border: '1px solid rgba(26,23,20,0.10)' }}
        >
          <span className="text-[13px] text-[#1A1714] font-semibold shrink-0">
            {selectedIds.length} selected
          </span>
          <span className="text-[#7A7470] text-[12px]">—</span>

          {/* Assign category */}
          <select
            value={bulkCategory}
            onChange={e => setBulkCategory(e.target.value as IngredientCategory | '')}
            className="text-[12px] rounded-lg px-3 py-1.5 outline-none transition-colors"
            style={{ border: '1px solid rgba(26,23,20,0.18)', background: '#FFFFFF', color: bulkCategory ? '#1A1714' : '#9A9490' }}
          >
            <option value="">Assign category ▾</option>
            {ALL_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{CATEGORY_LABEL[cat]}</option>
            ))}
          </select>

          {/* Set unit */}
          <input
            type="text"
            placeholder="Set unit…"
            value={bulkUnit}
            onChange={e => setBulkUnit(e.target.value)}
            className="text-[12px] rounded-lg px-3 py-1.5 outline-none transition-colors"
            style={{
              border: '1px solid rgba(26,23,20,0.18)',
              background: '#FFFFFF',
              color: '#1A1714',
              width: 110,
            }}
          />

          {/* Mark reviewed */}
          <button
            onClick={handleMarkReviewed}
            className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: 'rgba(22,163,74,0.10)', color: '#15803d' }}
          >
            ✓ Mark Reviewed
          </button>

          {/* Merge selected (only if exactly 2) */}
          {selectedIds.length === 2 && (
            <button
              onClick={handleMergeSelected}
              className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'rgba(155,90,0,0.10)', color: '#7A4500' }}
            >
              Merge Selected
            </button>
          )}

          {/* Deselect */}
          <button
            onClick={() => setCheckedIds(new Set())}
            className="ml-auto text-[12px] text-[#7A7470] hover:text-[#4A4540] transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Ingredient table ── */}
      <div
        className="overflow-x-auto rounded-card"
        style={{ border: '1px solid rgba(26,23,20,0.09)' }}
      >
        <div style={{ minWidth: 860, background: '#FFFFFF' }}>
          {/* Header */}
          <div
            className="grid items-center text-[11px] font-semibold tracking-[0.08em] uppercase text-[#7A7470] px-5 py-2.5 gap-3"
            style={{
              background: 'rgba(26,23,20,0.03)',
              borderBottom: '1px solid rgba(26,23,20,0.07)',
              gridTemplateColumns: '28px 1fr 130px 80px 80px 160px 120px',
            }}
          >
            <input
              type="checkbox"
              checked={allChecked}
              ref={el => { if (el) el.indeterminate = someChecked && !allChecked }}
              onChange={toggleAll}
              className="w-4 h-4 cursor-pointer accent-[#1A1714]"
            />
            <span>Name</span>
            <span>Category</span>
            <span>Unit</span>
            <span>Recipes</span>
            <span>Venues</span>
            <span>Actions</span>
          </div>

          {/* Rows */}
          <div className="divide-y" style={{ borderColor: 'rgba(26,23,20,0.06)' }}>
            {filtered.length === 0 && (
              <div className="px-5 py-10 text-center text-[13px] text-[#7A7470]">
                No ingredients match your search.
              </div>
            )}

            {filtered.map(ing => {
              const isChecked = checkedIds.has(ing.id)
              const catColor = CATEGORY_COLOR[(ing.category ?? 'other') as IngredientCategory] ?? CATEGORY_COLOR['other']
              const isUnreviewed = !ing.is_reviewed
              const venuesForIng = ing.venue_ids
                .map(vid => venueById[vid])
                .filter((v): v is Venue => Boolean(v))

              return (
                <div
                  key={ing.id}
                  className="grid items-center px-5 py-3 gap-3 relative transition-colors"
                  style={{
                    gridTemplateColumns: '28px 1fr 130px 80px 80px 160px 120px',
                    background: isChecked ? 'rgba(26,23,20,0.025)' : '#FFFFFF',
                    borderLeft: isUnreviewed ? '3px solid rgba(200,151,58,0.70)' : '3px solid transparent',
                  }}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOne(ing.id)}
                    className="w-4 h-4 cursor-pointer accent-[#1A1714]"
                  />

                  {/* Name + aliases */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isUnreviewed && (
                        <span className="shrink-0 text-[11px]" style={{ color: '#C8973A' }} title="Needs review">⚠</span>
                      )}
                      <span
                        className="text-[13px] font-medium text-[#1A1714] truncate"
                        title={ing.canonical_name}
                      >
                        {ing.canonical_name}
                      </span>
                    </div>
                    {ing.aliases.length > 0 && (
                      <p className="text-[11px] text-[#7A7470] truncate mt-0.5" title={ing.aliases.join(', ')}>
                        {ing.aliases.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* Category badge */}
                  <div>
                    <span
                      className="inline-block text-[11px] font-medium px-2 py-0.5 rounded"
                      style={{ background: catColor.bg, color: catColor.text }}
                    >
                      {CATEGORY_LABEL[(ing.category ?? 'other') as IngredientCategory] ?? ing.category ?? 'Other'}
                    </span>
                  </div>

                  {/* Unit */}
                  <div className="text-[12px] text-[#4A4540] truncate">
                    {ing.default_unit ?? <span className="text-[#9A9490]">—</span>}
                  </div>

                  {/* Recipe count */}
                  <div className="text-[12px] text-[#4A4540]">
                    {ing.recipe_count > 0
                      ? ing.recipe_count
                      : <span className="text-[#9A9490]">0</span>
                    }
                  </div>

                  {/* Venues */}
                  <div className="flex flex-wrap gap-1">
                    {venuesForIng.length === 0
                      ? <span className="text-[11px] text-[#9A9490]">—</span>
                      : venuesForIng.map(v => (
                          <span
                            key={v.id}
                            className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(26,23,20,0.05)', color: '#4A4540' }}
                            title={v.name}
                          >
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: v.theme_color }}
                            />
                            {v.short_name ?? v.name}
                          </span>
                        ))
                    }
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap relative">
                    {isUnreviewed && (
                      <button
                        onClick={() => handleReview(ing.id)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
                        style={{ background: 'rgba(22,163,74,0.10)', color: '#15803d' }}
                      >
                        ✓ Review
                      </button>
                    )}
                    <div className="relative">
                      <button
                        onClick={() => setEditTooltipId(id => id === ing.id ? null : ing.id)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-70"
                        style={{ border: '1px solid rgba(26,23,20,0.18)', color: '#4A4540', background: '#FFFFFF' }}
                      >
                        Edit
                      </button>
                      {editTooltipId === ing.id && (
                        <div
                          className="absolute bottom-full left-0 mb-1.5 whitespace-nowrap text-[11px] px-2.5 py-1.5 rounded-lg z-10"
                          style={{ background: '#1A1714', color: '#FFFFFF' }}
                        >
                          Edit coming soon
                          <div
                            className="absolute top-full left-4 w-0 h-0"
                            style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #1A1714' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer count */}
          {filtered.length > 0 && (
            <div
              className="px-5 py-3 text-[11px] text-[#9A9490]"
              style={{ borderTop: '1px solid rgba(26,23,20,0.06)', background: 'rgba(26,23,20,0.015)' }}
            >
              Showing {filtered.length} of {ingredients.length} ingredients
            </div>
          )}
        </div>
      </div>

      {/* ── Merge modal ── */}
      {mergePair && (
        <MergeModal
          pair={mergePair}
          onClose={() => setMergePair(null)}
          onMerged={handleMerged}
        />
      )}
    </>
  )
}
