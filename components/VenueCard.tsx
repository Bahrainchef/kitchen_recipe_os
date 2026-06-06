'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Venue, Section } from '@/lib/types/database.types'

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
}

const VENUE_INITIALS: Record<string, string> = {
  'a1000000-0000-0000-0000-000000000001': 'BC',
  'a1000000-0000-0000-0000-000000000002': 'WF',
  'a1000000-0000-0000-0000-000000000003': 'S&S',
  'a1000000-0000-0000-0000-000000000004': 'RC',
  'a1000000-0000-0000-0000-000000000005': 'SSL',
  'a1000000-0000-0000-0000-000000000006': 'TFJ',
  'a1000000-0000-0000-0000-000000000007': 'V7',
}

const LOGO_BG: Record<string, string | 'theme'> = {
  'a1000000-0000-0000-0000-000000000001': '#1A2F5E',
  'a1000000-0000-0000-0000-000000000002': '#1A2F5E',
  'a1000000-0000-0000-0000-000000000003': '#1A2F5E',
  'a1000000-0000-0000-0000-000000000004': '#FFFFFF',
  'a1000000-0000-0000-0000-000000000005': 'theme',
  'a1000000-0000-0000-0000-000000000006': '#1A2F5E',
  'a1000000-0000-0000-0000-000000000007': '#FFFFFF',
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

function LogoBadge({ venue, size }: { venue: Venue; size: number }) {
  const isPastryHub = venue.venue_type === 'pastry_hub'

  if (venue.logo_url) {
    const bgSpec = LOGO_BG[venue.id] ?? '#1A2F5E'
    const bg = bgSpec === 'theme' ? venue.theme_color : bgSpec
    const isLight = bg === '#FFFFFF'
    const pad = isLight ? Math.round(size * 0.10) : Math.round(size * 0.07)
    return (
      <div
        className="overflow-hidden flex items-center justify-center shrink-0"
        style={{
          width: size, height: size, borderRadius: Math.round(size * 0.28),
          background: bg,
          border: isLight ? '1.5px solid rgba(255,255,255,0.70)' : '1.5px solid rgba(255,255,255,0.25)',
          padding: pad,
          boxShadow: '0 4px 20px rgba(0,0,0,0.60)',
        }}
      >
        <Image
          src={venue.logo_url}
          alt={`${venue.name} logo`}
          width={size}
          height={size}
          className="w-full h-full object-contain"
        />
      </div>
    )
  }

  if (isPastryHub) {
    return (
      <div
        className="shrink-0 flex items-center justify-center leading-none select-none"
        style={{
          width: size, height: size, borderRadius: Math.round(size * 0.28),
          background: 'linear-gradient(135deg, #f090b8, #4a90d9)',
          color: '#fff',
          fontSize: Math.round(size * 0.42),
          boxShadow: '0 4px 20px rgba(240,144,184,0.45)',
        }}
      >
        ✦
      </div>
    )
  }

  const initials = VENUE_INITIALS[venue.id] ?? deriveInitials(venue.name)
  const textColor = monogramTextColor(venue.theme_color)
  const fontSize = initials.length <= 2 ? Math.round(size * 0.32) : Math.round(size * 0.24)

  return (
    <div
      className="shrink-0 flex items-center justify-center font-fraunces font-semibold leading-none select-none"
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.28),
        background: venue.theme_color, color: textColor,
        fontSize,
        letterSpacing: initials.length >= 3 ? '0.03em' : '0.02em',
        boxShadow: '0 4px 20px rgba(0,0,0,0.55)',
        border: '1.5px solid rgba(255,255,255,0.20)',
      }}
    >
      {initials}
    </div>
  )
}

export function VenueCard({ venue, sections, recipeCount = 0, animIndex = 0 }: VenueCardProps) {
  const flag = venue.country_code === 'BH' ? '🇧🇭' : venue.country_code === 'SA' ? '🇸🇦' : null
  const activeSections = sections.filter((s) => s.is_active)
  const isPastryHub = venue.venue_type === 'pastry_hub'
  const glowColor = VENUE_GLOW[venue.id] ?? '#f090b8'
  const hasCover = !!venue.cover_image_url

  const heroBg = isPastryHub
    ? 'linear-gradient(135deg, #d4608e 0%, #4a90d9 100%)'
    : `linear-gradient(145deg, ${venue.theme_color} 0%, rgba(11,31,74,0.96) 100%)`

  return (
    <Link
      href={`/venues/${venue.id}`}
      className="block anim-fade-up"
      style={{ animationDelay: `${animIndex * 70}ms` }}
    >
      <article
        className="venue-card group relative overflow-hidden rounded-card flex flex-col"
        style={{
          height: 360,
          border: `1px solid rgba(42,74,138,0.60)`,
          '--card-glow': glowColor,
          '--theme-color': venue.theme_color,
        } as React.CSSProperties}
      >

        {/* ── Background: cover photo or gradient ── */}
        {hasCover ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={venue.cover_image_url!}
            alt={venue.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: heroBg }}>
            {!isPastryHub && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 25% 40%, ${venue.theme_color}50 0%, transparent 65%)` }}
              />
            )}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 22px), repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 22px)',
              }}
            />
          </div>
        )}

        {/* ── Dark gradient overlay (always present for text legibility) ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: hasCover
              ? 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.12) 100%)'
              : 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.10) 60%, transparent 100%)',
          }}
        />

        {/* ── Accent glow stripe at bottom ── */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{ height: 2, background: glowColor, opacity: 0.70 }}
        />

        {/* ── Top row: flag left, VAT badge right ── */}
        <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-4 pt-3.5">
          {/* Country flag */}
          <div className="flex items-center gap-1.5">
            {flag && (
              <span className="text-[26px] leading-none select-none drop-shadow-md">{flag}</span>
            )}
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
                Pastry Hub
              </span>
            )}
          </div>

          {/* VAT badge */}
          {venue.vat_rate > 0 && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md tracking-wide shrink-0"
              style={{
                background: 'rgba(0,0,0,0.45)',
                color: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              VAT {(venue.vat_rate * 100).toFixed(0)}%
            </span>
          )}
        </div>

        {/* ── Bottom overlay: name + city left, logo right ── */}
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-5 pb-5 pt-10">

          {/* Name + city */}
          <div className="min-w-0 pr-3">
            <h3
              className="font-fraunces leading-tight tracking-tight mb-0.5 drop-shadow-md"
              style={{ color: '#ffffff', fontSize: 22 }}
            >
              {venue.name}
            </h3>
            <div className="flex items-center gap-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {venue.city && <span className="drop-shadow-sm">{venue.city}</span>}
              {venue.city && activeSections.length > 0 && (
                <span className="opacity-50">·</span>
              )}
              <span className="drop-shadow-sm">{activeSections.length} section{activeSections.length !== 1 ? 's' : ''}</span>
              {recipeCount > 0 && (
                <>
                  <span className="opacity-50">·</span>
                  <span className="drop-shadow-sm">{recipeCount} recipes</span>
                </>
              )}
            </div>
          </div>

          {/* Logo */}
          <div className="shrink-0">
            <LogoBadge venue={venue} size={46} />
          </div>
        </div>

        {/* ── Hover: "Open →" pill fades in center-ish ── */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-250 pointer-events-none"
        >
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold"
            style={{
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(10px)',
              color: '#ffffff',
              border: `1px solid ${glowColor}60`,
            }}
          >
            Open venue
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

      </article>
    </Link>
  )
}
