'use client'

import { useState, useRef } from 'react'

interface Props {
  venueId: string
  initialUrl: string | null
  themeColor: string
}

export function BrandGuidelinesPanel({ venueId, initialUrl, themeColor }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are accepted')
      setTimeout(() => setError(null), 4000)
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('File too large — max 20 MB')
      setTimeout(() => setError(null), 4000)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch(`/api/venues/${venueId}/brand-guidelines`, { method: 'POST', body })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? `Upload failed (${res.status})`)
      }
      const { url: newUrl } = await res.json()
      setUrl(newUrl)
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
      const res = await fetch(`/api/venues/${venueId}/brand-guidelines`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setUrl(null)
      setConfirmDelete(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setIsOpen(true)}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-opacity hover:opacity-100 opacity-80"
        style={{
          background: 'rgba(255,255,255,0.08)',
          color: 'rgba(240,244,255,0.90)',
          border: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <DocIcon />
        Brand Guidelines
      </button>

      {/* ── Overlay ── */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(4px)' }}
            onClick={() => { setIsOpen(false); setConfirmDelete(false) }}
          />

          <div
            className="fixed z-50 inset-x-4 top-1/2 -translate-y-1/2 max-w-2xl mx-auto rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: '#0F1E3A',
              border: '1px solid rgba(126,184,247,0.16)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.70)',
              maxHeight: '85vh',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(126,184,247,0.10)' }}
            >
              <div className="flex items-center gap-2">
                <DocIcon size={16} color={themeColor} />
                <h2 className="font-fraunces text-[16px] text-text-primary">Brand Guidelines</h2>
              </div>
              <button
                onClick={() => { setIsOpen(false); setConfirmDelete(false) }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[14px] transition-colors hover:bg-white/10"
                style={{ color: 'rgba(240,244,255,0.45)' }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1">
              {error && (
                <div
                  className="mb-4 px-3 py-2 rounded-lg text-[12px]"
                  style={{ background: 'rgba(220,38,38,0.15)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.25)' }}
                >
                  {error}
                </div>
              )}

              {url ? (
                <div className="space-y-4">
                  {/* PDF preview */}
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid rgba(126,184,247,0.12)', height: 420 }}
                  >
                    <iframe src={url} className="w-full h-full" title="Brand Guidelines PDF" />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-85"
                      style={{ background: themeColor, color: '#FFFFFF' }}
                    >
                      ↓ Download PDF
                    </a>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 rounded-lg text-[13px] font-medium transition-colors hover:bg-white/08 disabled:opacity-50"
                      style={{ color: 'rgba(240,244,255,0.70)', border: '1px solid rgba(126,184,247,0.16)' }}
                    >
                      {uploading ? 'Uploading…' : 'Replace PDF'}
                    </button>
                    <div className="ml-auto flex items-center gap-2">
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
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="text-[12px] transition-colors hover:text-text-secondary"
                            style={{ color: 'rgba(240,244,255,0.35)' }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="text-[12px] transition-colors hover:text-red-400"
                          style={{ color: 'rgba(240,244,255,0.35)' }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Upload drop zone */
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                  onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
                  onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className="rounded-xl flex flex-col items-center justify-center gap-3 py-16 cursor-pointer transition-colors"
                  style={{
                    border: `2px dashed ${isDragOver ? themeColor : 'rgba(126,184,247,0.20)'}`,
                    background: isDragOver ? `${themeColor}0A` : 'rgba(126,184,247,0.03)',
                  }}
                >
                  <DocIcon size={36} color={isDragOver ? themeColor : 'rgba(240,244,255,0.20)'} />
                  <div className="text-center">
                    <p className="text-text-secondary text-[14px] font-medium">
                      {uploading ? 'Uploading…' : 'Drop PDF here or click to upload'}
                    </p>
                    <p className="text-[12px] mt-1" style={{ color: 'rgba(240,244,255,0.30)' }}>
                      PDF only · max 20 MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />
    </>
  )
}

function DocIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path
        d="M3 1.5h5.5L11 4v8a.5.5 0 0 1-.5.5h-7A.5.5 0 0 1 3 12V2a.5.5 0 0 1 0-.5z"
        stroke={color}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M8.5 1.5V4H11" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 6.5h4M5 8.5h2.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
