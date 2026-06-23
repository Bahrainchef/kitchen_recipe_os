'use client'

import { useState, useRef } from 'react'

interface Props {
  venueId: string
  apiPath: string       // 'brand-guidelines' | 'menu'
  initialUrl: string | null
  themeColor: string
  label: string
  icon: 'doc' | 'menu'
}

export function VenuePdfPanel({ venueId, apiPath, initialUrl, themeColor, label, icon }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const apiBase = `/api/venues/${venueId}/${apiPath}`

  const close = () => { setIsOpen(false); setConfirmDelete(false) }

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted')
      setTimeout(() => setError(null), 4000)
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large — max 50 MB')
      setTimeout(() => setError(null), 4000)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const signedRes = await fetch(apiBase, { method: 'GET' })
      if (!signedRes.ok) {
        const d = await signedRes.json().catch(() => ({}))
        throw new Error(d.error ?? 'Could not get upload URL')
      }
      const { signedUrl } = await signedRes.json()

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf' },
      })
      if (!uploadRes.ok) throw new Error(`Storage upload failed (${uploadRes.status})`)

      const confirmRes = await fetch(apiBase, { method: 'PATCH' })
      if (!confirmRes.ok) {
        const d = await confirmRes.json().catch(() => ({}))
        throw new Error(d.error ?? 'Failed to save URL')
      }
      const { url: newUrl } = await confirmRes.json()
      setUrl(`${newUrl}?t=${Date.now()}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setTimeout(() => setError(null), 5000)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    setUploading(true)
    setError(null)
    try {
      const res = await fetch(apiBase, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setUrl(null)
      setConfirmDelete(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setUploading(false)
    }
  }

  const TriggerIcon = icon === 'menu' ? MenuIcon : DocIcon

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-opacity hover:opacity-100 opacity-80"
        style={{
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(240,244,255,0.90)',
          border: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <TriggerIcon />
        {label}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(4px)' }}
            onClick={close}
          />

          {url ? (
            /* ── Full-screen PDF viewer ── */
            <div className="fixed z-50 inset-0 flex flex-col" style={{ background: '#0A1628' }}>
              <div
                className="flex items-center justify-between px-5 py-3 shrink-0"
                style={{ borderBottom: '1px solid rgba(126,184,247,0.10)', background: '#0F1E3A' }}
              >
                <div className="flex items-center gap-2">
                  <TriggerIcon size={16} color={themeColor} />
                  <h2 className="font-fraunces text-[16px] text-text-primary">{label}</h2>
                </div>
                <div className="flex items-center gap-3">
                  {error && <span className="text-[12px]" style={{ color: '#FCA5A5' }}>{error}</span>}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-85"
                    style={{ background: themeColor, color: '#FFFFFF' }}
                  >
                    ↓ Download
                  </a>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors hover:bg-white/10 disabled:opacity-50"
                    style={{ color: 'rgba(240,244,255,0.70)', border: '1px solid rgba(126,184,247,0.16)' }}
                  >
                    {uploading ? 'Uploading…' : 'Replace'}
                  </button>
                  {confirmDelete ? (
                    <>
                      <button
                        onClick={handleDelete}
                        disabled={uploading}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-medium disabled:opacity-50"
                        style={{ background: 'rgba(220,38,38,0.20)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.30)' }}
                      >
                        {uploading ? 'Removing…' : 'Confirm remove'}
                      </button>
                      <button onClick={() => setConfirmDelete(false)} className="text-[12px] hover:text-text-secondary" style={{ color: 'rgba(240,244,255,0.35)' }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)} className="text-[12px] hover:text-red-400" style={{ color: 'rgba(240,244,255,0.30)' }}>
                      Remove
                    </button>
                  )}
                  <button
                    onClick={close}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-[15px] transition-colors hover:bg-white/10 ml-1"
                    style={{ color: 'rgba(240,244,255,0.50)' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <iframe src={url} className="flex-1 w-full" title={label} style={{ border: 'none' }} />
            </div>
          ) : (
            /* ── Small upload modal ── */
            <div
              className="fixed z-50 inset-x-4 top-1/2 -translate-y-1/2 max-w-2xl mx-auto rounded-2xl overflow-hidden flex flex-col"
              style={{
                background: '#0F1E3A',
                border: '1px solid rgba(126,184,247,0.16)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.70)',
                maxHeight: '85vh',
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: '1px solid rgba(126,184,247,0.10)' }}
              >
                <div className="flex items-center gap-2">
                  <TriggerIcon size={16} color={themeColor} />
                  <h2 className="font-fraunces text-[16px] text-text-primary">{label}</h2>
                </div>
                <button onClick={close} className="w-7 h-7 flex items-center justify-center rounded-lg text-[14px] transition-colors hover:bg-white/10" style={{ color: 'rgba(240,244,255,0.45)' }}>
                  ✕
                </button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                {error && (
                  <div className="mb-4 px-3 py-2 rounded-lg text-[12px]" style={{ background: 'rgba(220,38,38,0.15)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.25)' }}>
                    {error}
                  </div>
                )}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
                  onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className="rounded-xl flex flex-col items-center justify-center gap-3 py-16 cursor-pointer"
                  style={{
                    border: `2px dashed ${isDragOver ? themeColor : 'rgba(126,184,247,0.20)'}`,
                    background: isDragOver ? `${themeColor}0A` : 'rgba(126,184,247,0.03)',
                  }}
                >
                  <TriggerIcon size={36} color={isDragOver ? themeColor : 'rgba(240,244,255,0.20)'} />
                  <div className="text-center">
                    <p className="text-text-secondary text-[14px] font-medium">
                      {uploading ? 'Uploading…' : 'Drop PDF here or click to upload'}
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: 'rgba(240,244,255,0.30)' }}>PDF only · max 50 MB</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
    </>
  )
}

function DocIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 1.5h5.5L11 4v8a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 3 12V2a.5.5 0 0 1 0-.5z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M8.5 1.5V4H11" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 6.5h4M5 8.5h2.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function MenuIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" stroke={color} strokeWidth="1.2" />
      <path d="M4 4.5h6M4 7h6M4 9.5h3.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
