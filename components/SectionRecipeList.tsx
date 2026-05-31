'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
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
  'hot kitchen':           '🍳',
  'cold kitchen':          '🥗',
  'breakfast':             '🌅',
  'lunch':                 '🍽️',
  'dessert':               '🎂',
  'desserts':              '🎂',
  'beverages':             '🍷',
  'coffee':                '☕',
  'tea':                   '🍵',
  'high tea':              '🫖',
  'specialty drinks':      '🍹',
  'specials':              '🍾',
  'pizza':                 '🍕',
  'bread':                 '🥖',
  'sauces':                '🌿',
  'marinades':             '🥩',
  'sandwiches':            '🥪',
  'basic recipes':         '⭐',
  'sausages':              '🌭',
  'pastries & cakes':      '🧁',
  'pastries & croissants': '🥐',
  'pastry':                '🥐',
  'the box exclusives':    '✦',
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
}

export function SectionRecipeList({
  recipes, venueId, sectionId, sectionName, themeColor, countryCode, photoMap = {},
}: Props) {
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'grid'>('list')

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
      </div>

      {/* Content */}
      {recipes.length === 0 ? (
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
            />
          ))}
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
  recipe, venueId, sectionId, themeColor, currency, rowIndex, isLast,
}: {
  recipe: Recipe; venueId: string; sectionId: string; themeColor: string
  currency: string; rowIndex: number; isLast: boolean
}) {
  const s = STATUS_STYLES[recipe.status] ?? STATUS_STYLES.draft
  const costBadge = costBadgeStyle(recipe.cost_percentage)

  return (
    <Link
      href={`/venues/${venueId}/sections/${sectionId}/recipes/${recipe.id}`}
      className="flex items-center justify-between px-5 py-4 group transition-colors"
      style={{
        borderBottom: isLast ? 'none' : '1px solid rgba(26,23,20,0.06)',
        background: rowIndex % 2 === 1 ? 'rgba(26,23,20,0.025)' : 'transparent',
      }}
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
