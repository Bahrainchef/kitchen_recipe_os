'use client'

import { useState, useRef } from 'react'

interface Props {
  recipeId: string
  initialPhotoUrl: string | null
  title: string
  sectionName?: string
  venueName: string
  themeColor: string
  portionSize: number | null
  costPct: number | null
  status: string
}

function costBadge(pct: number | null): { bg: string; label: string } | null {
  if (!pct || pct <= 0) return null
  const p = (pct * 100).toFixed(1) + '%'
  if (pct < 0.25)  return { bg: 'rgba(22,163,74,0.80)',  label: p }
  if (pct <= 0.35) return { bg: 'rgba(180,120,20,0.85)', label: p }
  return              { bg: 'rgba(220,38,38,0.80)',  label: p }
}

export function RecipeHero({
  recipeId, initialPhotoUrl, title, sectionName, venueName, themeColor,
  portionSize, costPct, status,
}: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) { setUploadErr('Only JPEG, PNG or WebP.'); return }
    setUploading(true)
    setUploadErr(null)
    const fd = new FormData()
    fd.set('file', file)
    try {
      const res = await fetch(`/api/recipes/${recipeId}/photo`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setPhotoUrl(json.url)
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  const badge = costBadge(costPct)

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden no-print"
        style={{ height: 400 }}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        {/* Background: photo or themed gradient */}
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(150deg, ${themeColor} 0%, rgba(26,23,20,0.92) 100%)` }}
          />
        )}

        {/* Dark-to-transparent gradient — always present for text legibility */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.40) 45%, rgba(0,0,0,0.08) 100%)' }}
        />

        {/* Top-left: section + venue tags */}
        <div className="absolute top-5 left-5 tablet:left-8 flex items-center gap-2 flex-wrap">
          {sectionName && (
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: `${themeColor}CC`, color: '#FFFFFF', backdropFilter: 'blur(8px)' }}
            >
              {sectionName}
            </span>
          )}
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            {venueName}
          </span>
        </div>

        {/* Top-right: camera upload button */}
        <button
          onClick={() => inputRef.current?.click()}
          className="absolute top-5 right-5 tablet:right-8 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
          aria-label="Upload or replace recipe photo"
          title="Upload photo"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="white" strokeWidth="1.3" />
            <path d="M1.5 11V12a1.5 1.5 0 0 0 1.5 1.5h10A1.5 1.5 0 0 0 14.5 12V6A1.5 1.5 0 0 0 13 4.5H11L9.5 3h-3L5 4.5H3A1.5 1.5 0 0 0 1.5 6v5z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </button>

        {/* No-photo hover prompt — full-area clickable overlay */}
        {!photoUrl && (
          <button
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 w-full flex flex-col items-center justify-center gap-3 opacity-0 hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'rgba(0,0,0,0.25)', cursor: 'pointer' }}
            tabIndex={-1}
            aria-label="Add recipe photo"
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="6" stroke="white" strokeWidth="1.5" />
              <path d="M4 25V27a3 3 0 0 0 3 3h22a3 3 0 0 0 3-3V14a3 3 0 0 0-3-3H25l-2.5-4h-9L11 11H7a3 3 0 0 0-3 3v11z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className="text-white text-[14px] font-medium tracking-wide">Add a photo</span>
          </button>
        )}

        {/* Bottom-left: title + meta badges */}
        <div className="absolute bottom-0 left-0 right-0 px-5 tablet:px-8 pb-6">
          <h1 className="font-fraunces text-[30px] tablet:text-[42px] text-white leading-tight mb-3 drop-shadow-sm">
            {title}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            {portionSize && (
              <span
                className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.90)', backdropFilter: 'blur(6px)' }}
              >
                {portionSize} {portionSize === 1 ? 'portion' : 'portions'}
              </span>
            )}
            {badge && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full text-white" style={{ background: badge.bg, backdropFilter: 'blur(6px)' }}>
                {badge.label} food cost
              </span>
            )}
            <span
              className="text-[11px] px-2.5 py-1 rounded-full capitalize"
              style={{ background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(6px)' }}
            >
              {status}
            </span>
          </div>
        </div>

        {/* Upload spinner */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.50)' }}>
            <div className="w-9 h-9 rounded-full border-2 border-white/25 border-t-white animate-spin" />
          </div>
        )}

        {/* Upload error */}
        {uploadErr && (
          <div
            className="absolute bottom-3 left-5 right-5 px-3 py-2 rounded-lg text-[12px] font-medium"
            style={{ background: 'rgba(220,38,38,0.92)', color: 'white' }}
          >
            {uploadErr}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
        />
      </div>
    </>
  )
}
