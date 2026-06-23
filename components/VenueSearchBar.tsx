'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { RecipeStub } from '@/lib/supabase/queries'

interface Props {
  venueId: string
  recipes: RecipeStub[]
  themeColor: string
}

export function VenueSearchBar({ venueId, recipes, themeColor }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = query.trim().toLowerCase()
  const results = q.length < 1 ? [] : recipes.filter(r => r.title.toLowerCase().includes(q)).slice(0, 12)

  useEffect(() => { setHighlighted(0) }, [q])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function navigate(recipe: RecipeStub) {
    setOpen(false)
    setQuery('')
    router.push(`/venues/${venueId}/sections/${recipe.section_id}/recipes/${recipe.id}`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); navigate(results[highlighted]) }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xl mx-auto">
      <div
        className="flex items-center gap-2 px-3.5 rounded-xl"
        style={{
          background: 'rgba(126,184,247,0.06)',
          border: `1px solid ${open ? `${themeColor}50` : 'rgba(126,184,247,0.14)'}`,
          transition: 'border-color 0.15s',
        }}
      >
        <SearchIcon color="rgba(240,244,255,0.30)" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search recipes…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="flex-1 bg-transparent text-[14px] text-text-primary placeholder-[rgba(240,244,255,0.30)] outline-none py-2.5"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
            className="text-[12px] transition-opacity hover:opacity-100 opacity-50"
            style={{ color: 'rgba(240,244,255,0.60)' }}
          >
            ✕
          </button>
        )}
      </div>

      {open && q.length >= 1 && (
        <div
          className="absolute z-30 left-0 right-0 top-full mt-1.5 rounded-xl overflow-hidden"
          style={{
            background: '#0F1E3A',
            border: '1px solid rgba(126,184,247,0.16)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.60)',
          }}
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-[13px]" style={{ color: 'rgba(240,244,255,0.35)' }}>
              No recipes found
            </p>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={r.id}>
                  <button
                    onMouseEnter={() => setHighlighted(i)}
                    onMouseDown={() => navigate(r)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{
                      background: i === highlighted ? `${themeColor}18` : 'transparent',
                      borderBottom: i < results.length - 1 ? '1px solid rgba(126,184,247,0.07)' : 'none',
                    }}
                  >
                    <span className="text-[13px] text-text-primary font-medium truncate">{r.title}</span>
                    <span
                      className="text-[11px] shrink-0 px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(126,184,247,0.08)', color: 'rgba(240,244,255,0.45)' }}
                    >
                      {r.section_name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function SearchIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="shrink-0">
      <circle cx="6.5" cy="6.5" r="5" stroke={color} strokeWidth="1.4" />
      <path d="M10.5 10.5L13.5 13.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
