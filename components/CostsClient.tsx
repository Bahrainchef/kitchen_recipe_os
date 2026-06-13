'use client'

import { useState, useMemo } from 'react'

interface RecipeWithCost {
  id: string
  venue_id: string
  title: string
  cost_percentage: number | null
  cost_per_portion: number | null
  selling_price: number | null
  total_cost: number | null
  status: string
}

interface VenueCostSummary {
  venue_id: string
  venue_name: string
  venue_short_name: string | null
  theme_color: string
  recipe_count: number
  costed_count: number
  avg_cost_pct: number | null
  green_count: number
  amber_count: number
  red_count: number
}

interface Props {
  venues: VenueCostSummary[]
  recipes: RecipeWithCost[]
}

function trafficLight(pct: number | null): { color: string; bg: string; label: string } {
  if (pct == null) return { color: '#9A9490', bg: 'rgba(26,23,20,0.06)', label: '—' }
  if (pct < 0.25) return { color: '#15803d', bg: 'rgba(22,163,74,0.10)', label: `${(pct * 100).toFixed(1)}%` }
  if (pct <= 0.35) return { color: '#92400e', bg: 'rgba(155,90,0,0.10)', label: `${(pct * 100).toFixed(1)}%` }
  return { color: '#dc2626', bg: 'rgba(220,38,38,0.10)', label: `${(pct * 100).toFixed(1)}%` }
}

function fmt(n: number | null | undefined, dp = 3) {
  return n == null ? '—' : n.toFixed(dp)
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft:          { bg: 'rgba(26,23,20,0.07)', text: '#4A4540' },
  pending_review: { bg: 'rgba(139,92,246,0.10)', text: '#6d28d9' },
  published:      { bg: 'rgba(22,163,74,0.10)', text: '#15803d' },
  archived:       { bg: 'rgba(107,114,128,0.08)', text: '#6b7280' },
}

// ─── Venue cost card ──────────────────────────────────────────────────────────

function VenueCostCard({ venue, onSelect, selected }: { venue: VenueCostSummary; onSelect: () => void; selected: boolean }) {
  const tl = trafficLight(venue.avg_cost_pct)
  const coveragePct = venue.recipe_count > 0 ? Math.round((venue.costed_count / venue.recipe_count) * 100) : 0

  return (
    <div
      className="rounded-card p-5 flex flex-col gap-3 cursor-pointer transition-all"
      style={{
        background: '#FFFFFF',
        border: selected ? `2px solid ${venue.theme_color}` : '1px solid rgba(26,23,20,0.09)',
        boxShadow: selected ? `0 0 0 3px ${venue.theme_color}20` : 'none',
      }}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: venue.theme_color }} />
          <h3 className="font-fraunces text-[15px] text-[#1A1714]">{venue.venue_name}</h3>
        </div>
        <span className="text-[11px] text-[#7A7470]">{venue.recipe_count} recipes</span>
      </div>

      {/* Big cost number */}
      <div className="flex items-end gap-2">
        <span className="font-fraunces text-[34px] leading-none" style={{ color: tl.color }}>
          {venue.avg_cost_pct != null ? `${(venue.avg_cost_pct * 100).toFixed(1)}%` : '—'}
        </span>
        <span className="text-[12px] text-[#7A7470] pb-1">avg food cost</span>
      </div>

      {/* Traffic light counts */}
      <div className="flex gap-2">
        {[
          { emoji: '🟢', count: venue.green_count, label: 'under 25%' },
          { emoji: '🟡', count: venue.amber_count, label: '25–35%' },
          { emoji: '🔴', count: venue.red_count, label: 'over 35%' },
        ].map(({ emoji, count, label }) => (
          <div key={label} className="flex-1 rounded-lg px-2.5 py-2 text-center" style={{ background: 'rgba(26,23,20,0.03)' }}>
            <div className="text-[15px]">{emoji}</div>
            <div className="text-[13px] font-bold text-[#1A1714]">{count}</div>
            <div className="text-[10px] text-[#7A7470] leading-tight">{label}</div>
          </div>
        ))}
      </div>

      {/* Coverage bar */}
      <div>
        <div className="flex justify-between text-[11px] text-[#7A7470] mb-1">
          <span>{venue.costed_count} of {venue.recipe_count} recipes costed</span>
          <span>{coveragePct}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(26,23,20,0.08)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${coveragePct}%`, background: '#4ecdc4' }} />
        </div>
      </div>

      <button className="text-[12px] font-semibold transition-opacity hover:opacity-70" style={{ color: venue.theme_color, textAlign: 'left' }}>
        View recipes →
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CostsClient({ venues, recipes }: Props) {
  const [filterVenueId, setFilterVenueId] = useState<string | null>(null)

  const allCosted = useMemo(() => recipes.filter(r => r.cost_percentage != null), [recipes])
  const avgGroupCost = useMemo(() => {
    if (allCosted.length === 0) return null
    return allCosted.reduce((s, r) => s + (r.cost_percentage ?? 0), 0) / allCosted.length
  }, [allCosted])

  const overThreshold = allCosted.filter(r => (r.cost_percentage ?? 0) > 0.35).length
  const missingCost = recipes.filter(r => r.cost_percentage == null).length

  const venueNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const v of venues) m.set(v.venue_id, v.venue_name)
    return m
  }, [venues])

  const filteredRecipes = useMemo(() => {
    const base = filterVenueId ? recipes.filter(r => r.venue_id === filterVenueId) : recipes
    return [...base].sort((a, b) => {
      if (a.cost_percentage == null && b.cost_percentage == null) return 0
      if (a.cost_percentage == null) return 1
      if (b.cost_percentage == null) return -1
      return b.cost_percentage - a.cost_percentage
    })
  }, [recipes, filterVenueId])

  const colGrid = '24px 1fr 140px 80px 90px 100px 90px 80px'

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        {[
          { label: 'avg food cost', value: avgGroupCost != null ? `${(avgGroupCost * 100).toFixed(1)}%` : '—', color: avgGroupCost != null ? trafficLight(avgGroupCost).color : '#7A7470' },
          { label: 'recipes costed', value: allCosted.length, color: '#1A1714' },
          { label: 'missing cost data', value: missingCost, color: missingCost > 0 ? '#7A4500' : '#15803d' },
          { label: 'over 35% threshold', value: overThreshold, color: overThreshold > 0 ? '#dc2626' : '#15803d' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px]" style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.09)' }}>
            <span className="font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
            <span className="text-[#7A7470]">{s.label}</span>
          </div>
        ))}
        <div className="flex-1" />
        <button
          disabled
          title="PDF/Excel export coming in next release"
          className="px-4 py-2.5 rounded-lg text-[13px] font-semibold opacity-35 cursor-not-allowed"
          style={{ background: 'rgba(26,23,20,0.06)', color: '#4A4540', border: '1px solid rgba(26,23,20,0.10)' }}
        >
          Export Report
        </button>
      </div>

      {/* Phase 3 note */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-6 text-[13px]" style={{ background: 'rgba(200,151,58,0.06)', border: '1px solid rgba(200,151,58,0.20)' }}>
        <span className="text-[16px] shrink-0 mt-0.5">💡</span>
        <p className="text-[#4A4540]">
          <strong className="text-[#1A1714]">Supplier prices not yet linked.</strong> Cost data shown is from recipe imports.
          Phase 3 will auto-calculate costs from live supplier prices and flag when ingredient prices change.
        </p>
      </div>

      {/* Venue grid */}
      {venues.filter(v => v.recipe_count > 0).length > 0 && (
        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4 mb-8">
          {venues.filter(v => v.recipe_count > 0).map(v => (
            <VenueCostCard
              key={v.venue_id}
              venue={v}
              selected={filterVenueId === v.venue_id}
              onSelect={() => setFilterVenueId(prev => prev === v.venue_id ? null : v.venue_id)}
            />
          ))}
        </div>
      )}

      {/* Recipe table */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="font-fraunces text-[17px] text-[#1A1714]">
          {filterVenueId ? `${venueNameById.get(filterVenueId)} recipes` : 'All recipes'}
          <span className="ml-2 text-[14px] text-[#7A7470] font-normal">({filteredRecipes.length})</span>
        </h2>
        {filterVenueId && (
          <button onClick={() => setFilterVenueId(null)} className="text-[12px] text-[#7A7470] hover:text-[#4A4540] transition-colors">
            ✕ Clear filter
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-card" style={{ border: '1px solid rgba(26,23,20,0.09)' }}>
        <div style={{ minWidth: 860, background: '#FFFFFF' }}>
          {/* Table header */}
          <div className="grid text-[11px] font-semibold tracking-[0.08em] uppercase text-[#7A7470] px-5 py-2.5 gap-3" style={{ background: 'rgba(26,23,20,0.03)', borderBottom: '1px solid rgba(26,23,20,0.07)', gridTemplateColumns: colGrid }}>
            <span />
            <span>Recipe</span>
            <span>Venue</span>
            <span className="text-right">Cost %</span>
            <span className="text-right">Cost/portion</span>
            <span className="text-right">Selling price</span>
            <span className="text-right">Total cost</span>
            <span>Status</span>
          </div>

          {/* Rows */}
          <div className="divide-y" style={{ borderColor: 'rgba(26,23,20,0.06)' }}>
            {filteredRecipes.length === 0 && (
              <div className="px-5 py-10 text-center text-[13px] text-[#7A7470]">No recipes found.</div>
            )}
            {filteredRecipes.map(recipe => {
              const tl = trafficLight(recipe.cost_percentage)
              const missingData = recipe.cost_percentage == null
              const sc = STATUS_COLORS[recipe.status] ?? STATUS_COLORS.draft
              return (
                <div
                  key={recipe.id}
                  className="grid items-center px-5 py-3 gap-3"
                  style={{
                    gridTemplateColumns: colGrid,
                    background: '#FFFFFF',
                    borderLeft: missingData ? '3px solid rgba(155,90,0,0.25)' : '3px solid transparent',
                  }}
                >
                  {/* Traffic light dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: tl.color }}
                    title={tl.label}
                  />
                  {/* Recipe name */}
                  <div className="text-[13px] text-[#1A1714] font-medium truncate" title={recipe.title}>{recipe.title}</div>
                  {/* Venue */}
                  <div className="text-[12px] text-[#4A4540] truncate">{venueNameById.get(recipe.venue_id) ?? '—'}</div>
                  {/* Cost % */}
                  <div className="text-right">
                    <span className="text-[12px] font-semibold px-2 py-0.5 rounded" style={{ background: tl.bg, color: tl.color }}>
                      {tl.label}
                    </span>
                  </div>
                  {/* Prices */}
                  <div className="text-[12px] text-[#4A4540] text-right font-mono">{fmt(recipe.cost_per_portion)}</div>
                  <div className="text-[12px] text-[#4A4540] text-right font-mono">{fmt(recipe.selling_price)}</div>
                  <div className="text-[12px] text-[#4A4540] text-right font-mono">{fmt(recipe.total_cost)}</div>
                  {/* Status */}
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={{ background: sc.bg, color: sc.text }}>
                    {recipe.status.replace('_', ' ')}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
