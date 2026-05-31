'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RecipeEditModal } from '@/components/RecipeEditModal'
import type { RecipeIngredient, RecipeStep } from '@/lib/types/database.types'

interface Props {
  backLabel: string
  backHref: string
  recipeId: string
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

export function RecipeActionBar({ backLabel, backHref, recipeId, themeColor, recipe, ingredients, steps }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

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
    </>
  )
}
