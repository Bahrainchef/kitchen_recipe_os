'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef, useCallback } from 'react'
import type { Venue, Section } from '@/lib/types/database.types'
import { useVenueImageUpload } from '@/lib/hooks/useVenueImageUpload'

interface VenueCardProps {
  venue: Venue
  sections: Section[]
  recipeCount?: number
  animIndex?: number
}

const VENUE_GLOW: Record<string, string> = {
  'a1000000-0000-0000-0000-000000000001': '#7eb8f7',
  'a1000000-0000-0000-0000-000000000002': '#a78bfa',
  'a1000000-0000-0000-0000-000000000003': '#4ecdc4',
  'a1000000-0000-0000-0000-000000000004': '#f59e0b',
  'a1000000-0000-0000-0000-000000000005': '#f090b8',
  'a1000000-0000-0000-0000-000000000006': '#4ecdc4',
  'a1000000-0000-0000-0000-000000000007': '#a78bfa',
  'a1000000-0000-0000-0000-000000000008': '#f090b8',
  'a1000000-0000-0000-0000-000000000009': '#C8973A',
}

const VENUE_BADGE: Record<string, string> = {
  'a1000000-0000-0000-0000-000000000009': 'Personal Collection',
}

const VENUE_INITIALS: Record<string, string> = {
  'a1000000-0000-0000-0000-000000000001': 'BC',
  'a1000000-0000-0000-0000-000000000002': 'WF',
  'a1000000-0000-0000-0000-000000000003': 'S&S',
  'a1000000-0000-0000-0000-000000000004': 'RC',
  'a1000000-0000-0000-0000-000000000005': 'SSL',
  'a1000000-0000-0000-0000-000000000006': 'TFJ',
  'a1000000-0000-0000-0000-000000000007': 'V7',
  'a1000000-0000-0000-0000-000000000008': '✦',
  'a1000000-0000-0000-0000-000000000009': '🌍',
}

const LOGO_BG: Record<string, string | 'theme'> = {
  'a1000000-0000-0000-0000-000000000001': '#1A2F5E',
  'a1000000-0000-0000-0000-000000000002': '#1A2F5E',
  'a1000000-0000-0000-0000-000000000003': '#1A2F5E',
  'a1000000-0000-0000-0000-000000000004': '#FFFFFF',
  'a1000000-0000-0000-0000-000000000005': 'theme',
  'a1000000-0000-0000-0000-000000000006': '#1A2F5E',
  'a1000000-0000-0000-0000-000000000007': '#FFFFFF',
  'a1000000-0000-0000-0000-000000000008': '#1A2F5E',
}

function deriveInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => w !== '&' && w.length > 0)
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 3)
}

function monogramTextColor(hex: string): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#0B1F4A' : '#FFFFFF'
}

function LogoBadge({ venue }: { venue: Venue }) {
  const SIZE = 40
  const RADIUS = 10
  const isPastryHub = venue.venue_type === 'pastry_hub'

  if (venue.logo_url) {
    return (
      <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
        <Image
          src={venue.logo_url}
          alt={`${venue.name} logo`}
          width={64}
          height={64}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  if (isPastryHub) {
    return (
      <div
        className="shrink-0 flex items-center justify-center leading-none select-none"
        style={{
          width: SIZE, height: SIZE, borderRadius: RADIUS,
          background: 'linear-gradient(135deg, #f090b8, #4a90d9)',
          color: '#fff',
          fontSize: 18,
          boxShadow: '0 2px 12px rgba(240,144,184,0.45)',
        }}
      >
        ✦
      </div>
    )
  }

  const initials = VENUE_INITIALS[venue.id] ?? deriveInitials(venue.name)
  const textColor = monogramTextColor(venue.theme_color)
  const fontSize = initials.length <= 2 ? 13 : 10

  return (
    <div
      className="shrink-0 flex items-center justify-center font-fraunces font-semibold leading-none select-none"
      style={{
        width: SIZE, height: SIZE, borderRadius: RADIUS,
        background: venue.theme_color, color: textColor,
        fontSize,
        letterSpacing: initials.length >= 3 ? '0.03em' : '0.02em',
        boxShadow: '0 2px 12px rgba(0,0,0,0.50)',
        border: '1.5px solid rgba(255,255,255,0.18)',
      }}
    >
      {initials}
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 2h4l1.5 2H12a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h1.5L5 2z"
        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="7" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

export function VenueCard({ venue, sections, recipeCount = 0, animIndex = 0 }: VenueCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(venue.cover_image_url ?? null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onSuccess = useCallback((url: string) => setCoverUrl(url), [])
  const { progress, error, upload } = useVenueImageUpload(venue.id, onSuccess)

  const handleFile = (file: File) => upload(file)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const flag = venue.country_code === 'BH' ? '🇧🇭' : venue.country_code === 'SA' ? '🇸🇦' : null
  const isPastryHub = venue.venue_type === 'pastry_hub'
  const glowColor = VENUE_GLOW[venue.id] ?? '#f090b8'
  const hasCover = !!coverUrl

  const fallbackBg = isPastryHub
    ? 'linear-gradient(135deg, #d4608e 0%, #4a90d9 100%)'
    : `linear-gradient(145deg, ${venue.theme_color} 0%, rgba(11,31,74,0.96) 100%)`

  return (
    <Link
      href={`/venues/${venue.id}`}
      className="block anim-fade-up"
      style={{ animationDelay: `${animIndex * 70}ms` }}
    >
      <article
        className="venue-card group relative overflow-hidden rounded-card"
        style={{
          height: 'var(--card-h, 220px)',
          border: isDragOver
            ? '2px dashed rgba(255,255,255,0.70)'
            : '1px solid rgba(42,74,138,0.55)',
          '--card-glow': glowColor,
          '--theme-color': venue.theme_color,
        } as React.CSSProperties}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }}
        onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false)
        }}
        onDrop={handleDrop}
      >
        {/* ── Background ── */}
        {hasCover ? (
          <Image
            key={coverUrl}
            src={coverUrl!}
            alt={venue.name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
            priority={animIndex < 4}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: fallbackBg }}>
            {!isPastryHub && (
              <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(ellipse at 25% 40%, ${venue.theme_color}50 0%, transparent 65%)` }}
              />
            )}
          </div>
        )}

        {/* ── Gradient overlay ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.20) 50%, transparent 100%)',
          }}
        />

        {/* ── Drag-over overlay ── */}
        {isDragOver && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(4px)' }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 4v14M7 11l7-7 7 7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 22h20" stroke="rgba(255,255,255,0.50)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[12px] font-medium" style={{ color: '#fff' }}>Drop to update cover</span>
          </div>
        )}

        {/* ── Upload progress bar ── */}
        {progress !== null && (
          <div className="absolute bottom-0 left-0 right-0 z-30" style={{ height: 3, background: 'rgba(0,0,0,0.30)' }}>
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: glowColor,
                transition: 'width 0.25s ease',
                boxShadow: `0 0 6px ${glowColor}`,
              }}
            />
          </div>
        )}

        {/* ── Error toast ── */}
        {error && (
          <div
            className="absolute bottom-6 left-3 right-3 z-30 px-3 py-1.5 rounded-lg text-[11px] font-medium text-center pointer-events-none"
            style={{ background: 'rgba(220,38,38,0.90)', color: '#fff', backdropFilter: 'blur(6px)' }}
          >
            {error}
          </div>
        )}

        {/* ── Camera button (top-left, appears on hover) ── */}
        <div className="absolute top-2 left-2 z-20">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); fileInputRef.current?.click() }}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full"
            style={{
              width: 30, height: 30,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff',
            }}
            title="Upload cover image"
          >
            <CameraIcon />
          </button>
        </div>

        {/* ── Hidden file input ── */}
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

        {/* ── Accent glow line bottom ── */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ height: 2, background: glowColor, opacity: 0.65 }}
        />

        {/* ── Top row: Pastry Hub badge left · flag right ── */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-3.5 pt-3">
          <div>
            {isPastryHub && (
              <span
                className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.16)',
                  color: 'rgba(255,255,255,0.90)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.22)',
                }}
              >
                {VENUE_BADGE[venue.id] ?? 'Recipe Library'}
              </span>
            )}
          </div>
          {flag && (
            <span className="text-[22px] leading-none select-none drop-shadow-md">{flag}</span>
          )}
        </div>

        {/* ── Bottom row: name + meta left · logo right ── */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-4 pb-3.5">

          {/* Name + city/VAT */}
          <div className="min-w-0 pr-2">
            <h3
              className="font-fraunces leading-tight tracking-tight drop-shadow-md"
              style={{ color: '#ffffff', fontSize: 18 }}
            >
              {venue.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {venue.city && (
                <span className="text-[11px] drop-shadow-sm" style={{ color: 'rgba(255,255,255,0.70)' }}>
                  {venue.city}
                </span>
              )}
              {venue.vat_rate > 0 && (
                <>
                  {venue.city && <span style={{ color: 'rgba(255,255,255,0.40)' }}>·</span>}
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      color: 'rgba(255,255,255,0.80)',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    VAT {(venue.vat_rate * 100).toFixed(0)}%
                  </span>
                </>
              )}
              {recipeCount > 0 && (
                <>
                  <span style={{ color: 'rgba(255,255,255,0.40)' }}>·</span>
                  <span className="text-[10px]" style={{ color: glowColor }}>
                    {recipeCount} recipes
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Logo */}
          <div className="shrink-0">
            <LogoBadge venue={venue} />
          </div>
        </div>

      </article>
    </Link>
  )
}
