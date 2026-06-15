'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Section } from '@/lib/types/database.types'

interface Props {
  sections: Section[]
  recipeCounts: Record<string, number>
  venueId: string
  themeColor: string
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
  'mezza':                 '🫙',
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

function getSectionIcon(name: string, icon?: string | null): string {
  if (icon) return icon
  return SECTION_ICONS[name.toLowerCase()] ?? '📋'
}

function DragHandle() {
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

export function SectionGrid({ sections, recipeCounts, venueId, themeColor }: Props) {
  const router = useRouter()
  const recipeCount = (sectionId: string) => recipeCounts[sectionId] ?? 0

  const [reorderMode, setReorderMode] = useState(false)
  const [reorderItems, setReorderItems] = useState<Section[]>(sections)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const dragIdx = useRef<number>(-1)
  const [dragOverIdx, setDragOverIdx] = useState<number>(-1)

  const enterReorderMode = () => {
    setReorderItems([...sections])
    setSaveError(null)
    setReorderMode(true)
  }

  const cancelReorder = () => {
    setReorderItems([...sections])
    setReorderMode(false)
    setSaveError(null)
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    setReorderItems(prev => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }

  const moveDown = (idx: number) => {
    setReorderItems(prev => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  const handleDrop = (toIdx: number) => {
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

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    const res = await fetch('/api/sections/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: reorderItems.map((s, i) => ({ id: s.id, sort_order: i + 1 })) }),
    })
    setSaving(false)
    if (res.ok) {
      setReorderMode(false)
      router.refresh()
    } else {
      setSaveError('Failed to save order — please try again')
    }
  }

  if (sections.length === 0) {
    return (
      <div
        className="rounded-card px-8 py-16 text-center"
        style={{ border: '1px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}
      >
        <p className="font-fraunces text-[18px] text-text-primary mb-1">No sections yet</p>
        <p className="text-text-muted text-[14px]">Configure sections for this venue in the database.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <h2 className="font-fraunces text-[20px] text-text-primary">Sections</h2>
        <div className="flex-1 h-px" style={{ background: 'rgba(126,184,247,0.08)' }} />

        {reorderMode ? (
          <>
            <span className="text-[12px] text-text-muted">Drag or use arrows to reorder</span>
            <button
              onClick={cancelReorder}
              disabled={saving}
              className="btn-ghost text-[13px] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all hover:opacity-85 disabled:opacity-60"
              style={{ background: themeColor, color: '#FFFFFF' }}
            >
              {saving ? 'Saving…' : 'Save order'}
            </button>
          </>
        ) : (
          <>
            <span className="text-[12px] text-text-muted">{sections.length} total</span>
            <button
              onClick={enterReorderMode}
              className="btn-ghost flex items-center gap-1.5 text-[13px]"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 4h9M2 6.5h9M2 9h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M10.5 2.5l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10.5 7.5l1.5 1.5-1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Reorder sections
            </button>
          </>
        )}
      </div>

      {saveError && (
        <p className="text-[13px] mb-4" style={{ color: '#F59E0B' }}>{saveError}</p>
      )}

      {reorderMode ? (
        /* ── Reorder list ── */
        <div className="space-y-2">
          {reorderItems.map((section, idx) => {
            const count = recipeCount(section.id)
            const isDragOver = dragOverIdx === idx && dragIdx.current !== idx

            return (
              <div
                key={section.id}
                draggable
                onDragStart={e => {
                  dragIdx.current = idx
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragOver={e => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  if (dragOverIdx !== idx) setDragOverIdx(idx)
                }}
                onDrop={e => { e.preventDefault(); handleDrop(idx) }}
                onDragEnd={() => { dragIdx.current = -1; setDragOverIdx(-1) }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl select-none"
                style={{
                  background: isDragOver ? `${themeColor}18` : '#122347',
                  border: `1.5px solid ${isDragOver ? themeColor + '66' : 'rgba(126,184,247,0.10)'}`,
                  cursor: 'grab',
                  transition: 'border-color 0.1s, background 0.1s',
                }}
              >
                {/* Drag handle */}
                <div className="shrink-0 cursor-grab" style={{ color: 'rgba(255,255,255,0.28)' }}>
                  <DragHandle />
                </div>

                {/* Emoji */}
                <span className="text-[26px] leading-none shrink-0 select-none">
                  {getSectionIcon(section.name, section.icon)}
                </span>

                {/* Name + count */}
                <div className="flex-1 min-w-0">
                  <span className="font-fraunces text-[14px] text-text-primary">{section.name}</span>
                  <span className="text-[12px] text-text-muted ml-2">{count} {count === 1 ? 'recipe' : 'recipes'}</span>
                </div>

                {/* ↑ ↓ buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    draggable={false}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[15px] font-medium transition-colors hover:bg-white/10 disabled:opacity-25"
                    style={{ color: 'rgba(255,255,255,0.70)', lineHeight: 1 }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === reorderItems.length - 1}
                    draggable={false}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[15px] font-medium transition-colors hover:bg-white/10 disabled:opacity-25"
                    style={{ color: 'rgba(255,255,255,0.70)', lineHeight: 1 }}
                  >
                    ↓
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── Normal section grid ── */
        <div className="grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-4">
          {sections.map((section, i) => {
            const count = recipeCount(section.id)
            const icon = getSectionIcon(section.name, section.icon)

            return (
              <Link
                key={section.id}
                href={`/venues/${venueId}/sections/${section.id}`}
                className="section-card group relative overflow-hidden rounded-card text-left anim-fade-up block"
                style={{
                  background: '#1A2F5E',
                  border: '1px solid rgba(126,184,247,0.10)',
                  animationDelay: `${i * 45}ms`,
                  minHeight: 185,
                  '--theme-color': themeColor,
                } as React.CSSProperties}
              >
                {/* Gradient background wash — subtle on default, richer on hover */}
                <div
                  className="absolute inset-0 transition-opacity duration-300 pointer-events-none opacity-100"
                  style={{
                    background: `linear-gradient(145deg, ${themeColor}0B 0%, transparent 60%)`,
                  }}
                />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `linear-gradient(145deg, ${themeColor}18 0%, transparent 65%)`,
                  }}
                />

                {/* Coloured top stripe */}
                <div
                  className="w-full transition-all duration-300 group-hover:h-[4px]"
                  style={{ height: 3, background: themeColor }}
                />


                {/* Card content */}
                <div className="relative flex flex-col items-center justify-center text-center px-4 pt-7 pb-8 gap-3">
                  <span
                    className="text-[52px] leading-none transition-transform duration-300 group-hover:scale-110 select-none"
                    style={{ display: 'inline-block', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.45))' }}
                  >
                    {icon}
                  </span>
                  <div>
                    <h3
                      className="font-fraunces leading-tight text-text-primary mb-1"
                      style={{ fontSize: section.name.length > 16 ? 12 : section.name.length > 12 ? 13 : 14 }}
                    >
                      {section.name}
                    </h3>
                    <span className="text-[11px]" style={{ color: '#FFFFFF' }}>
                      {count} {count === 1 ? 'recipe' : 'recipes'}
                    </span>
                  </div>
                </div>

                {/* Arrow — slides in on hover */}
                <div
                  className="absolute bottom-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1.5 group-hover:translate-x-0"
                  style={{ color: themeColor }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
