'use client'

import { useState, useRef } from 'react'

interface Props {
  recipeId: string
  initialPhotoUrl: string | null
}

export function RecipePhotoUpload({ recipeId, initialPhotoUrl }: Props) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Only JPEG, PNG, or WebP images are supported.')
      return
    }
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.set('file', file)
    try {
      const res = await fetch(`/api/recipes/${recipeId}/photo`, { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setPhotoUrl(json.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUploading(false)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  if (photoUrl) {
    return (
      <div
        className="relative w-full overflow-hidden group cursor-pointer"
        style={{ height: 280 }}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt="Recipe hero"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
             style={{ background: 'rgba(0,0,0,0.40)' }}>
          <div className="flex flex-col items-center gap-2 text-white">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.4)' }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.4" />
                <path d="M1.5 12V13a1.5 1.5 0 0 0 1.5 1.5h12A1.5 1.5 0 0 0 16.5 13v-7A1.5 1.5 0 0 0 15 4.5H13l-1.5-2h-5L5 4.5H3A1.5 1.5 0 0 0 1.5 6v6z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[12px] font-medium">Replace photo</span>
          </div>
        </div>
        {uploading && <UploadSpinner />}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
        {error && (
          <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-lg text-[12px]"
               style={{ background: 'rgba(220,38,38,0.90)', color: 'white' }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="w-full flex flex-col items-center justify-center cursor-pointer transition-colors group"
      style={{
        height: 200,
        border: '2px dashed rgba(126,184,247,0.18)',
        borderRadius: '0',
        background: 'rgba(126,184,247,0.03)',
      }}
      onClick={() => inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={e => { e.preventDefault() }}
    >
      <div className="flex flex-col items-center gap-3 pointer-events-none select-none">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center transition-colors group-hover:scale-110"
          style={{ background: 'rgba(126,184,247,0.08)', border: '1.5px dashed rgba(126,184,247,0.20)' }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="3.5" stroke="rgba(240,244,255,0.40)" strokeWidth="1.4" />
            <path d="M2 15V16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8A2 2 0 0 0 18 6h-2.5L14 3.5H8L6.5 6H4A2 2 0 0 0 2 8v7z" stroke="rgba(240,244,255,0.40)" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-[13px] font-medium text-text-secondary">Drop photo here or click to upload</p>
          <p className="text-[11px] text-text-muted mt-0.5">JPEG, PNG, or WebP</p>
        </div>
      </div>
      {uploading && <UploadSpinner />}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
      {error && (
        <div className="absolute mt-2 px-3 py-1.5 rounded-lg text-[12px]"
             style={{ background: 'rgba(220,38,38,0.10)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.20)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function UploadSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(11,31,74,0.70)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-[rgba(126,184,247,0.20)] border-t-[#7eb8f7] animate-spin" />
    </div>
  )
}
