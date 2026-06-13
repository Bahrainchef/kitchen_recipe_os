'use client'

import { useState, useRef, useCallback } from 'react'
import { useVenueImageUpload } from '@/lib/hooks/useVenueImageUpload'

interface Props {
  venueId: string
  venueName: string
  venueDescription: string | null
  themeColor: string
  initialHeroUrl: string | null
  flag: string | null
  countryName: string | null
  city: string | null
  vatRate: number
  isPastryHub: boolean
  collectionLabel: string | null
}

function HeroPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-[11px] font-medium px-2.5 py-1 rounded-full"
      style={{
        background: 'rgba(0,0,0,0.40)',
        color: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.18)',
      }}
    >
      {children}
    </span>
  )
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 2.5h4l1.5 2.5H14a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2.5L6 2.5z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="8" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

export function VenueHero({
  venueId,
  venueName,
  venueDescription,
  themeColor,
  initialHeroUrl,
  flag,
  countryName,
  city,
  vatRate,
  isPastryHub,
  collectionLabel,
}: Props) {
  const [heroUrl, setHeroUrl] = useState<string | null>(initialHeroUrl)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onSuccess = useCallback((url: string) => setHeroUrl(url), [])
  const { progress, error, upload } = useVenueImageUpload(venueId, onSuccess)

  const handleFile = (file: File) => upload(file)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: 280 }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false)
      }}
      onDrop={handleDrop}
    >
      {/* Photo or gradient */}
      {heroUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={heroUrl}
          src={heroUrl}
          alt={venueName}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(145deg, ${themeColor} 0%, rgba(11,31,74,0.96) 100%)` }}
        >
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at 20% 50%, ${themeColor}65 0%, transparent 65%)` }}
          />
        </div>
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: heroUrl
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.68) 100%)'
            : 'linear-gradient(to bottom, rgba(11,31,74,0.40) 0%, rgba(11,31,74,0.65) 100%)',
        }}
      />

      {/* Drag-over overlay */}
      {isDragOver && (
        <div
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 4v18M8 12l8-8 8 8" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 26h24" stroke="rgba(255,255,255,0.50)" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <span className="text-[13px] font-medium" style={{ color: '#fff' }}>Drop to replace hero image</span>
        </div>
      )}

      {/* Upload progress bar */}
      {progress !== null && (
        <div className="absolute bottom-0 left-0 right-0 z-30" style={{ height: 3, background: 'rgba(0,0,0,0.30)' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: themeColor,
              transition: 'width 0.25s ease',
              boxShadow: `0 0 8px ${themeColor}`,
            }}
          />
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl text-[12px] font-medium whitespace-nowrap pointer-events-none"
          style={{ background: 'rgba(220,38,38,0.92)', color: '#fff', backdropFilter: 'blur(8px)' }}
        >
          {error}
        </div>
      )}

      {/* Camera / edit button — top-right of hero */}
      <div className="absolute top-3 right-4 tablet:right-8 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-opacity opacity-60 hover:opacity-100"
          style={{
            background: 'rgba(0,0,0,0.50)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.22)',
            color: '#fff',
          }}
          title="Upload hero image"
        >
          <CameraIcon />
          <span>Change photo</span>
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          e.target.value = ''
        }}
      />

      {/* Top-right: flag + city + VAT pills — shifted left to avoid camera button */}
      <div className="absolute top-14 right-5 tablet:right-8 flex items-center gap-2 flex-wrap justify-end">
        {flag && <span className="text-[26px] leading-none select-none drop-shadow-md">{flag}</span>}
        {countryName && <HeroPill>{countryName}</HeroPill>}
        {city && <HeroPill>{city}</HeroPill>}
        {vatRate > 0
          ? <HeroPill>VAT {(vatRate * 100).toFixed(0)}%</HeroPill>
          : <HeroPill>Recipe Library</HeroPill>
        }
      </div>

      {/* Bottom-left: venue name + description */}
      <div className="absolute bottom-0 left-0 right-0 px-5 tablet:px-8 pb-5 tablet:pb-7">
        {isPastryHub && collectionLabel && (
          <span
            className="inline-block text-[10px] font-semibold tracking-[0.14em] uppercase px-2.5 py-0.5 rounded-full mb-2"
            style={{
              background: 'rgba(255,255,255,0.16)',
              color: 'rgba(255,255,255,0.85)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.20)',
            }}
          >
            {collectionLabel}
          </span>
        )}
        <h1
          className="font-fraunces leading-tight tracking-tight drop-shadow-lg"
          style={{ color: '#ffffff', fontSize: 'clamp(26px, 4vw, 40px)' }}
        >
          {venueName}
        </h1>
        {venueDescription && (
          <p
            className="mt-1.5 text-[13px] tablet:text-[14px] leading-relaxed line-clamp-2 max-w-xl"
            style={{ color: 'rgba(255,255,255,0.65)' }}
          >
            {venueDescription}
          </p>
        )}
      </div>
    </div>
  )
}
