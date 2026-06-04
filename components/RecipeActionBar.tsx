'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RecipeEditModal } from '@/components/RecipeEditModal'
import type { RecipeIngredient, RecipeStep } from '@/lib/types/database.types'

interface Props {
  backLabel: string
  backHref: string
  recipeId: string
  venueId: string
  currentSectionId: string
  sections: { id: string; name: string }[]
  themeColor: string
  recipe: {
    title: string
    description: string | null
    portion_size: number | null
    selling_price: number | null
    status: string
  }
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
}

export function RecipeActionBar({ backLabel, backHref, recipeId, venueId, currentSectionId, sections, themeColor, recipe, ingredients, steps }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const moveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moveOpen) return
    const handler = (e: MouseEvent) => {
      if (moveRef.current && !moveRef.current.contains(e.target as Node)) setMoveOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [moveOpen])

  const handleMove = async (targetSectionId: string) => {
    setMoveOpen(false)
    const res = await fetch(`/api/recipes/${recipeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_id: targetSectionId }),
    })
    if (res.ok) {
      router.push(`/venues/${venueId}/sections/${targetSectionId}`)
    } else {
      setToast('Failed to move recipe')
    }
  }

  const otherSections = sections.filter(s => s.id !== currentSectionId)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const handleSaved = () => {
    setEditOpen(false)
    setToast('Recipe saved successfully')
    router.refresh()
  }

  const handleDelete = async () => {
    setDeleting(true)
    const res = await fetch(`/api/recipes/${recipeId}`, { method: 'DELETE' })
    if (res.ok) {
      setToast('Recipe deleted')
      setTimeout(() => router.push(backHref), 600)
    } else {
      setDeleting(false)
      setDeleteConfirm(false)
      setToast('Failed to delete recipe')
    }
  }

  return (
    <>
      <div
        className="sticky top-0 z-40 flex items-center gap-2 px-5 tablet:px-8 no-print"
        style={{
          minHeight: 52,
          background: 'rgba(248,244,238,0.96)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(26,23,20,0.09)',
          boxShadow: '0 1px 3px rgba(26,23,20,0.05)',
        }}
      >
        {/* Back */}
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all hover:bg-[rgba(26,23,20,0.06)] active:scale-[0.97]"
          style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.13)', color: '#1A1714' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden tablet:inline">Back to {backLabel}</span>
          <span className="tablet:hidden">Back</span>
        </button>

        {/* Center actions */}
        <div className="flex items-center gap-1 flex-1 justify-center">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all hover:bg-[rgba(26,23,20,0.06)] active:scale-[0.97]"
            style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.13)', color: '#1A1714' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3.5 4.5v-3h7v3M3.5 10.5H2a.5.5 0 0 1-.5-.5V5.5A.5.5 0 0 1 2 5h10a.5.5 0 0 1 .5.5V10a.5.5 0 0 1-.5.5h-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <rect x="3.5" y="8" width="7" height="4.5" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span className="hidden tablet:inline">Print</span>
          </button>

          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all hover:bg-[rgba(26,23,20,0.06)] active:scale-[0.97]"
            style={{ background: '#FFFFFF', border: `1px solid ${themeColor}50`, color: themeColor }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 2.5 11.5 4.5 5 11H3V9l6.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M8 4l2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="hidden tablet:inline">Edit</span>
          </button>

          <button
            disabled
            title="Coming soon"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium opacity-35 cursor-not-allowed"
            style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.13)', color: '#1A1714' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12C7 12 1.5 8.5 1.5 5.5a2.75 2.75 0 0 1 5.5-.75 2.75 2.75 0 0 1 5.5.75C12.5 8.5 7 12 7 12z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            <span className="hidden tablet:inline">Favourite</span>
          </button>

          {/* Move to section */}
          {otherSections.length > 0 && (
            <div className="relative" ref={moveRef}>
              <button
                onClick={() => setMoveOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all hover:bg-[rgba(26,23,20,0.06)] active:scale-[0.97]"
                style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.13)', color: '#1A1714' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 4.5a1 1 0 0 1 1-1h2.5l1 1H12a1 1 0 0 1 1 1V11a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M5 7.5h4M7.5 6L9 7.5 7.5 9" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="hidden tablet:inline">Move</span>
              </button>

              {moveOpen && (
                <div
                  className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 rounded-xl shadow-xl overflow-hidden z-[50]"
                  style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.12)', minWidth: 188, maxHeight: 260, overflowY: 'auto' }}
                >
                  <p className="text-[10px] font-semibold tracking-[0.10em] uppercase px-3 pt-2.5 pb-1" style={{ color: '#9A9490' }}>
                    Move to section
                  </p>
                  {otherSections.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleMove(s.id)}
                      className="w-full text-left px-3 py-2 text-[13px] transition-colors hover:bg-[rgba(26,23,20,0.05)]"
                      style={{ color: '#1A1714' }}
                    >
                      {s.name}
                    </button>
                  ))}
                  <div className="pb-1.5" />
                </div>
              )}
            </div>
          )}

          <button
            disabled
            title="Coming soon"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium opacity-35 cursor-not-allowed"
            style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.13)', color: '#1A1714' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="1.5" width="10" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="hidden tablet:inline">Notes</span>
          </button>

          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all hover:bg-[rgba(220,38,38,0.08)] active:scale-[0.97]"
            style={{ background: '#FFFFFF', border: '1px solid rgba(220,38,38,0.28)', color: '#dc2626' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 3.5h10M5.5 3.5V2h3v1.5M3.5 3.5l.5 8.5h6l.5-8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6v4M8 6v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="hidden tablet:inline">Delete</span>
          </button>
        </div>

        {/* Home */}
        <Link
          href="/"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all hover:bg-[rgba(26,23,20,0.06)] active:scale-[0.97]"
          style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.13)', color: '#1A1714' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 6.5L7 2l5.5 4.5V12.5a.5.5 0 0 1-.5.5H9V9H5v4H2a.5.5 0 0 1-.5-.5V6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
          <span className="hidden tablet:inline">Home</span>
        </Link>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-5 py-2.5 rounded-full text-[13px] font-semibold shadow-lg no-print"
          style={{ background: '#1A1714', color: '#FFFFFF', pointerEvents: 'none' }}
        >
          ✓ {toast}
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <RecipeEditModal
          recipeId={recipeId}
          recipe={recipe}
          ingredients={ingredients}
          steps={steps}
          themeColor={themeColor}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-5 no-print"
          style={{ background: 'rgba(26,23,20,0.55)' }}
          onClick={() => { if (!deleting) setDeleteConfirm(false) }}
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
              Are you sure you want to delete <strong>{recipe.title}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ background: 'rgba(26,23,20,0.07)', color: '#1A1714' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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
    </>
  )
}
