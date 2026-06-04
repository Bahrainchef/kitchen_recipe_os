'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Recipe } from '@/lib/types/database.types'

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:          { label: 'Draft',          bg: 'rgba(26,23,20,0.06)',   text: '#6E6560', dot: '#B0A89E' },
  pending_review: { label: 'Pending review', bg: 'rgba(200,151,58,0.12)', text: '#A07828', dot: '#C8973A' },
  published:      { label: 'Published',      bg: 'rgba(22,163,74,0.10)', text: '#15803d', dot: '#22c55e' },
  archived:       { label: 'Archived',       bg: 'rgba(26,23,20,0.04)',   text: '#9A9490', dot: '#C8BFB4' },
}

function costBadgeStyle(pct: number | null): { bg: string; text: string; label: string } | null {
  if (pct === null || pct <= 0) return null
  const p = pct * 100
  if (pct < 0.25)  return { bg: 'rgba(22,163,74,0.12)',  text: '#15803d', label: `${p.toFixed(1)}%` }
  if (pct <= 0.35) return { bg: 'rgba(200,151,58,0.15)', text: '#A07828', label: `${p.toFixed(1)}%` }
  return              { bg: 'rgba(220,38,38,0.12)',  text: '#dc2626', label: `${p.toFixed(1)}%` }
}

const SECTION_ICONS: Record<string, string> = {
  'breakfast':             '🍳',
  'lunch':                 '🫕',
  'dinner':                '🍽️',
  'hot kitchen':           '🔥',
  'cold kitchen':          '🥗',
  'dessert':               '🍮',
  'desserts':              '🍮',
  'plated desserts':       '🍮',
  'beverages':             '🧃',
  'coffee':                '☕',
  'tea':                   '🫖',
  'high tea':              '🫖',
  'specialty drinks':      '🧋',
  'pastries & cakes':      '🥐',
  'pastries & croissants': '🥐',
  'pastry':                '🥐',
  'sandwiches':            '🥪',
  'basic recipes':         '📋',
  'base recipes':          '📋',
  'sauces':                '🫙',
  'marinades':             '🧴',
  'sausages':              '🌿',
  'sheesha menu':          '💨',
  'specials':              '⭐',
  'prep':                  '🔪',
  'pizza':                 '🍕',
  'bread':                 '🍞',
  'bakery':                '🥖',
  'fry station':           '🍟',
  'creams & fillings':     '🍯',
  'doughs':                '🫓',
  'the box exclusives':    '📦',
  'ramadan':               '🌙',
  'christmas':             '🎄',
  '60x40':                 '📐',
}

interface Props {
  recipes: Recipe[]
  venueId: string
  sectionId: string
  sectionName: string
  themeColor: string
  countryCode?: string
  photoMap?: Record<string, string>
  sections?: { id: string; name: string }[]
}

export function SectionRecipeList({
  recipes, venueId, sectionId, sectionName, themeColor, countryCode, photoMap = {}, sections = [],
}: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pendingMove, setPendingMove] = useState<{ id: string; title: string } | null>(null)
  const [moving, setMoving] = useState(false)
  const [listToast, setListToast] = useState<string | null>(null)

  // Recipe reorder state
  const [reorderMode, setReorderMode] = useState(false)
  const [reorderItems, setReorderItems] = useState<Recipe[]>(recipes)
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const dragIdx = useRef<number>(-1)
  const [dragOverIdx, setDragOverIdx] = useState<number>(-1)

  const enterReorderMode = () => {
    setReorderItems([...recipes])
    setOrderError(null)
    setSearch('')
    setReorderMode(true)
  }

  const cancelReorder = () => {
    setReorderItems([...recipes])
    setReorderMode(false)
    setOrderError(null)
  }

  const moveUpRecipe = (idx: number) => {
    if (idx === 0) return
    setReorderItems(prev => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  const moveDownRecipe = (idx: number) => {
    setReorderItems(prev => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  const handleRecipeDrop = (toIdx: number) => {
    const fromIdx = dragIdx.current
    if (fromIdx === -1 || fromIdx === toIdx) { dragIdx.current = -1; setDragOverIdx(-1); return }
    setReorderItems(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return next
    })
    dragIdx.current = -1
    setDragOverIdx(-1)
  }

  const handleSaveOrder = async () => {
    setSavingOrder(true)
    setOrderError(null)
    const res = await fetch('/api/recipes/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: reorderItems.map((r, i) => ({ id: r.id, sort_order: i + 1 })) }),
    })
    setSavingOrder(false)
    if (res.ok) {
      setReorderMode(false)
      router.refresh()
    } else {
      setOrderError('Failed to save order — please try again')
    }
  }

  useEffect(() => {
    if (!listToast) return
    const t = setTimeout(() => setListToast(null), 3000)
    return () => clearTimeout(t)
  }, [listToast])

  const handleDeleteConfirm = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    const res = await fetch(`/api/recipes/${pendingDelete.id}`, { method: 'DELETE' })
    if (res.ok) {
      setPendingDelete(null)
      setDeleting(false)
      setListToast('Recipe deleted')
      router.refresh()
    } else {
      setDeleting(false)
      setPendingDelete(null)
      setListToast('Failed to delete recipe')
    }
  }

  const handleMoveConfirm = async (targetSectionId: string) => {
    if (!pendingMove) return
    setMoving(true)
    const res = await fetch(`/api/recipes/${pendingMove.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_id: targetSectionId }),
    })
    if (res.ok) {
      setPendingMove(null)
      setMoving(false)
      setListToast('Recipe moved')
      router.refresh()
    } else {
      setMoving(false)
      setPendingMove(null)
      setListToast('Failed to move recipe')
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(`section-view-${sectionId}`)
    if (saved === 'grid' || saved === 'list') setView(saved)
  }, [sectionId])

  const setViewMode = (mode: 'list' | 'grid') => {
    setView(mode)
    localStorage.setItem(`section-view-${sectionId}`, mode)
  }

  const filtered = search.trim()
    ? recipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase()))
    : recipes

  const currency = countryCode === 'SA' ? 'SAR' : 'BD'

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <h2 className="font-fraunces text-[20px] text-text-primary">Recipes</h2>
        </div>

        {reorderMode ? (
          /* Reorder toolbar */
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[12px] text-text-muted">Drag or use arrows to reorder</span>
            <button
              onClick={cancelReorder}
              disabled={savingOrder}
              className="px-3 py-1.5 rounded-full text-[13px] font-medium transition-all hover:bg-[rgba(26,23,20,0.06)] disabled:opacity-50"
              style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.13)', color: '#1A1714' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveOrder}
              disabled={savingOrder}
              className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all hover:opacity-85 disabled:opacity-60"
              style={{ background: themeColor, color: '#FFFFFF' }}
            >
              {savingOrder ? 'Saving…' : 'Save order'}
            </button>
          </div>
        ) : (
          /* Normal toolbar */
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <circle cx="5.5" cy="5.5" r="4" stroke="#9A9490" strokeWidth="1.2" />
                <path d="M9 9l2 2" stroke="#9A9490" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search recipes…"
                className="pl-8 pr-3 py-1.5 text-[13px] rounded-lg"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid rgba(26,23,20,0.14)',
                  color: '#1A1714',
                  width: 200,
                  outline: 'none',
                }}
              />
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(26,23,20,0.07)' }}>
              <button
                onClick={() => setViewMode('list')}
                aria-label="List view"
                className="w-8 h-7 flex items-center justify-center rounded transition-colors"
                style={{ background: view === 'list' ? '#FFFFFF' : 'transparent', color: view === 'list' ? '#1A1714' : '#9A9490', boxShadow: view === 'list' ? '0 1px 2px rgba(26,23,20,0.10)' : 'none' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
                className="w-8 h-7 flex items-center justify-center rounded transition-colors"
                style={{ background: view === 'grid' ? '#FFFFFF' : 'transparent', color: view === 'grid' ? '#1A1714' : '#9A9490', boxShadow: view === 'grid' ? '0 1px 2px rgba(26,23,20,0.10)' : 'none' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="8" y="1.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="8" y="8" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </button>
            </div>

            {/* Reorder button */}
            {recipes.length > 1 && (
              <button
                onClick={enterReorderMode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80 shrink-0"
                style={{ background: 'rgba(26,23,20,0.07)', color: '#1A1714', border: '1px solid rgba(26,23,20,0.11)' }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 3.5h8M2 6h8M2 8.5h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M9.5 1.5l1.5 2-1.5 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.5 6.5l1.5 2-1.5 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Reorder
              </button>
            )}

            {/* Import button */}
            <Link
              href={`/import?venueId=${venueId}&sectionId=${sectionId}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80 shrink-0"
              style={{ background: themeColor, color: '#FFFFFF' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v7M3 5l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Import
            </Link>
          </div>
        )}
      </div>

      {orderError && (
        <p className="text-[13px] mb-4" style={{ color: '#dc2626' }}>{orderError}</p>
      )}

      {/* Content */}
      {reorderMode ? (
        /* ── Recipe reorder list ── */
        <div className="rounded-card overflow-hidden space-y-2" style={{ background: 'transparent' }}>
          {reorderItems.map((recipe, idx) => {
            const isDragOver = dragOverIdx === idx && dragIdx.current !== idx
            const s = STATUS_STYLES[recipe.status] ?? STATUS_STYLES.draft
            return (
              <div
                key={recipe.id}
                draggable
                onDragStart={e => { dragIdx.current = idx; e.dataTransfer.effectAllowed = 'move' }}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverIdx !== idx) setDragOverIdx(idx) }}
                onDrop={e => { e.preventDefault(); handleRecipeDrop(idx) }}
                onDragEnd={() => { dragIdx.current = -1; setDragOverIdx(-1) }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl select-none"
                style={{
                  background: isDragOver ? `${themeColor}10` : '#FFFFFF',
                  border: `1.5px solid ${isDragOver ? themeColor + '55' : 'rgba(26,23,20,0.09)'}`,
                  cursor: 'grab',
                  transition: 'border-color 0.1s, background 0.1s',
                }}
              >
                {/* Drag handle */}
                <div className="shrink-0 cursor-grab" style={{ color: '#B0A89E' }}>
                  <RecipeDragHandle />
                </div>

                {/* Status dot */}
                <div className="shrink-0 w-2 h-2 rounded-full" style={{ background: s.dot }} />

                {/* Title */}
                <span className="font-fraunces text-[14px] text-text-primary flex-1 min-w-0 truncate">
                  {recipe.title}
                </span>

                {/* Status badge */}
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded shrink-0"
                  style={{ background: s.bg, color: s.text }}
                >
                  {s.label}
                </span>

                {/* ↑ ↓ buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => moveUpRecipe(idx)}
                    disabled={idx === 0}
                    draggable={false}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[15px] font-medium transition-colors hover:bg-[rgba(26,23,20,0.07)] disabled:opacity-25"
                    style={{ color: '#1A1714', lineHeight: 1 }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDownRecipe(idx)}
                    disabled={idx === reorderItems.length - 1}
                    draggable={false}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[15px] font-medium transition-colors hover:bg-[rgba(26,23,20,0.07)] disabled:opacity-25"
                    style={{ color: '#1A1714', lineHeight: 1 }}
                  >
                    ↓
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState venueId={venueId} sectionId={sectionId} themeColor={themeColor} />
      ) : filtered.length === 0 ? (
        <NoResults search={search} />
      ) : view === 'grid' ? (
        <div className="recipe-thumb-grid">
          {filtered.map((recipe, i) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              venueId={venueId}
              sectionId={sectionId}
              themeColor={themeColor}
              currency={currency}
              photoUrl={photoMap[recipe.id] ?? null}
              sectionName={sectionName}
              animIndex={i}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-card overflow-hidden" style={{ border: '1px solid rgba(26,23,20,0.09)' }}>
          {filtered.map((recipe, i) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              venueId={venueId}
              sectionId={sectionId}
              themeColor={themeColor}
              currency={currency}
              rowIndex={i}
              isLast={i === filtered.length - 1}
              onDeleteRequest={setPendingDelete}
              onMoveRequest={sections.filter(s => s.id !== sectionId).length > 0 ? setPendingMove : undefined}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-5"
          style={{ background: 'rgba(26,23,20,0.55)' }}
          onClick={() => { if (!deleting) setPendingDelete(null) }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(220,38,38,0.10)' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2.5 4.5h13M7 4.5V3h4v1.5M4.5 4.5l.5 11h8l.5-11" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7.5 8v5M10.5 8v5" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="font-fraunces text-[20px] text-text-primary mb-2">Delete recipe?</h3>
            <p className="text-text-secondary text-[14px] leading-relaxed mb-6">
              Are you sure you want to delete <strong>{pendingDelete.title}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ background: 'rgba(26,23,20,0.07)', color: '#1A1714' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
                style={{ background: '#dc2626', color: '#FFFFFF' }}
              >
                {deleting ? 'Deleting…' : 'Delete recipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move picker */}
      {pendingMove && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-5"
          style={{ background: 'rgba(26,23,20,0.55)' }}
          onClick={() => { if (!moving) setPendingMove(null) }}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(26,23,20,0.07)' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M1.5 6a1 1 0 0 1 1-1h3.5l1.5 1.5H16a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2.5a1 1 0 0 1-1-1V6z" stroke="#1A1714" strokeWidth="1.4" strokeLinejoin="round" />
                <path d="M7 10.5h4M9.5 8.5l2 2-2 2" stroke="#1A1714" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="font-fraunces text-[20px] text-text-primary mb-1">Move recipe</h3>
            <p className="text-text-secondary text-[14px] mb-4">
              Move <strong>{pendingMove.title}</strong> to:
            </p>
            <div className="rounded-xl overflow-hidden mb-5" style={{ border: '1px solid rgba(26,23,20,0.10)' }}>
              {sections.filter(s => s.id !== sectionId).map((s, i, arr) => (
                <button
                  key={s.id}
                  onClick={() => handleMoveConfirm(s.id)}
                  disabled={moving}
                  className="w-full text-left px-4 py-2.5 text-[14px] transition-colors hover:bg-[rgba(26,23,20,0.04)] disabled:opacity-50"
                  style={{
                    color: '#1A1714',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(26,23,20,0.07)' : 'none',
                  }}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setPendingMove(null)}
                disabled={moving}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ background: 'rgba(26,23,20,0.07)', color: '#1A1714' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {listToast && (
        <div
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-5 py-2.5 rounded-full text-[13px] font-semibold shadow-lg pointer-events-none"
          style={{ background: '#1A1714', color: '#FFFFFF' }}
        >
          ✓ {listToast}
        </div>
      )}
    </div>
  )
}

// ─── Grid card ────────────────────────────────────────────────────────────────

function RecipeCard({
  recipe, venueId, sectionId, photoUrl, sectionName, animIndex,
}: {
  recipe: Recipe; venueId: string; sectionId: string; themeColor: string
  currency: string; photoUrl: string | null; sectionName: string; animIndex: number
}) {
  const costBadge = costBadgeStyle(recipe.cost_percentage)
  const sectionEmoji = SECTION_ICONS[sectionName.toLowerCase()] ?? '📋'

  return (
    <Link
      href={`/venues/${venueId}/sections/${sectionId}/recipes/${recipe.id}`}
      className="block overflow-hidden anim-fade-up"
      style={{
        aspectRatio: '3/4',
        borderRadius: 10,
        background: '#1A1714',
        position: 'relative',
        animationDelay: `${animIndex * 40}ms`,
        transition: 'transform 0.2s ease, filter 0.2s ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.filter = '' }}
    >
      {/* Photo or placeholder */}
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={recipe.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #2D2A26 0%, #1A1714 100%)' }}
        >
          <span className="text-[32px] leading-none select-none" style={{ opacity: 0.45 }}>
            {sectionEmoji}
          </span>
        </div>
      )}

      {/* Bottom gradient for title legibility */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, transparent 100%)' }}
      />

      {/* Heart — 28px circle, top right */}
      <div
        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full"
        style={{ background: 'rgba(0,0,0,0.30)', backdropFilter: 'blur(4px)' }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 11S1 7.5 1 4.5a2.25 2.25 0 0 1 4.5-.5 2.25 2.25 0 0 1 4.5.5C10 7.5 6.5 11 6.5 11z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </div>

      {/* Cost badge — top left, only if cost data exists */}
      {costBadge && (
        <div className="absolute top-2 left-2">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums"
            style={{ background: costBadge.bg, color: costBadge.text, backdropFilter: 'blur(4px)' }}
          >
            {costBadge.label}
          </span>
        </div>
      )}

      {/* Title — 14px, max 2 lines */}
      <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5">
        <p className="font-fraunces text-[14px] text-white leading-snug line-clamp-2">
          {recipe.title}
        </p>
      </div>
    </Link>
  )
}

// ─── List row ────────────────────────────────────────────────────────────────

function RecipeRow({
  recipe, venueId, sectionId, themeColor, currency, rowIndex, isLast, onDeleteRequest, onMoveRequest,
}: {
  recipe: Recipe; venueId: string; sectionId: string; themeColor: string
  currency: string; rowIndex: number; isLast: boolean
  onDeleteRequest: (r: { id: string; title: string }) => void
  onMoveRequest?: (r: { id: string; title: string }) => void
}) {
  const s = STATUS_STYLES[recipe.status] ?? STATUS_STYLES.draft
  const costBadge = costBadgeStyle(recipe.cost_percentage)

  return (
    <div
      className="group flex items-center transition-colors"
      style={{
        borderBottom: isLast ? 'none' : '1px solid rgba(26,23,20,0.06)',
        background: rowIndex % 2 === 1 ? 'rgba(26,23,20,0.025)' : 'transparent',
      }}
    >
      <Link
        href={`/venues/${venueId}/sections/${sectionId}/recipes/${recipe.id}`}
        className="flex items-center justify-between px-5 py-4 flex-1 min-w-0"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="shrink-0 w-2 h-2 rounded-full mt-0.5" style={{ background: s.dot }} />
          <div className="min-w-0 flex-1">
            <span className="font-fraunces text-[15px] text-text-primary truncate block group-hover:text-black transition-colors">
              {recipe.title}
            </span>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {recipe.portion_size && (
                <Chip>{recipe.portion_size} {recipe.portion_size === 1 ? 'portion' : 'portions'}</Chip>
              )}
              {(recipe.selling_price ?? 0) > 0 && (
                <Chip>{recipe.selling_price!.toFixed(3)} {currency}</Chip>
              )}
              {(recipe.cost_per_portion ?? 0) > 0 && (
                <Chip>{recipe.cost_per_portion!.toFixed(3)} / portion</Chip>
              )}
              {recipe.version_number > 1 && (
                <span className="text-[11px] text-text-muted">v{recipe.version_number}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {costBadge && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded tabular-nums"
              style={{ background: costBadge.bg, color: costBadge.text }}
            >
              {costBadge.label}
            </span>
          )}
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded"
            style={{ background: s.bg, color: s.text }}
          >
            {s.label}
          </span>
          <svg
            width="13" height="13" viewBox="0 0 13 13" fill="none"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: themeColor }}
          >
            <path d="M2 6.5h9M7 2.5l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </Link>

      {/* Move icon — appears on row hover when other sections exist */}
      {onMoveRequest && (
        <button
          onClick={() => onMoveRequest({ id: recipe.id, title: recipe.title })}
          title="Move to section"
          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[rgba(26,23,20,0.08)]"
          style={{ color: '#6E6560' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 4.5a1 1 0 0 1 1-1h2.5l1 1H12a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M5 7.5h4M7.5 6L9 7.5 7.5 9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {/* Trash icon — appears on row hover */}
      <button
        onClick={() => onDeleteRequest({ id: recipe.id, title: recipe.title })}
        title="Delete recipe"
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mr-3 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[rgba(220,38,38,0.08)]"
        style={{ color: '#dc2626' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 3.5h10M5.5 3.5V2h3v1.5M3.5 3.5l.5 8.5h6l.5-8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 6v4M8 6v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function RecipeDragHandle() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="3"  cy="2.5"  r="1.3" />
      <circle cx="7"  cy="2.5"  r="1.3" />
      <circle cx="3"  cy="7"    r="1.3" />
      <circle cx="7"  cy="7"    r="1.3" />
      <circle cx="3"  cy="11.5" r="1.3" />
      <circle cx="7"  cy="11.5" r="1.3" />
    </svg>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded text-text-muted"
      style={{ background: 'rgba(26,23,20,0.05)', border: '1px solid rgba(26,23,20,0.07)' }}
    >
      {children}
    </span>
  )
}

function NoResults({ search }: { search: string }) {
  return (
    <div className="rounded-card px-8 py-12 text-center" style={{ border: '1px solid rgba(26,23,20,0.09)' }}>
      <p className="font-fraunces text-[16px] text-text-primary mb-1">No results for &ldquo;{search}&rdquo;</p>
      <p className="text-text-muted text-[13px]">Try a different search term.</p>
    </div>
  )
}

function EmptyState({ venueId, sectionId, themeColor }: { venueId: string; sectionId: string; themeColor: string }) {
  return (
    <div
      className="rounded-card px-8 py-16 text-center anim-fade-up"
      style={{ border: '1px dashed rgba(26,23,20,0.15)', background: 'rgba(26,23,20,0.02)' }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
        style={{ background: `${themeColor}12`, border: `1.5px dashed ${themeColor}40` }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 6v6M11 14v1" stroke={themeColor} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="11" cy="11" r="9.5" stroke={themeColor} strokeWidth="1.2" opacity="0.4" />
        </svg>
      </div>
      <p className="font-fraunces text-[18px] text-text-primary mb-1.5">No recipes yet</p>
      <p className="text-text-muted text-[13px] mb-6">Import recipes from your kitchen workbook to get started.</p>
      <Link
        href={`/import?venueId=${venueId}&sectionId=${sectionId}`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80"
        style={{ background: themeColor, color: '#FFFFFF' }}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <path d="M6.5 1v7M3.5 5l3 3 3-3M1.5 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Import Recipes
      </Link>
    </div>
  )
}
