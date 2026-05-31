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

const VENUE_INITIALS: Record<string, string> = {
  'a1000000-0000-0000-0000-000000000001': 'BC',
  'a1000000-0000-0000-0000-000000000002': 'WF',
  'a1000000-0000-0000-0000-000000000003': 'S&S',
  'a1000000-0000-0000-0000-000000000004': 'RC',
  'a1000000-0000-0000-0000-000000000005': 'SSL',
  'a1000000-0000-0000-0000-000000000006': 'TFJ',
  'a1000000-0000-0000-0000-000000000007': 'V7',
}

// Per-venue logo background: logos with black fills need a dark container so they blend in.
// 'theme' = use venue.theme_color (for logos that match their own brand colour).
const LOGO_BG: Record<string, string | 'theme'> = {
  'a1000000-0000-0000-0000-000000000001': '#1A1714', // Brewed — dark bg
  'a1000000-0000-0000-0000-000000000002': '#1A1714', // Wildflour — dark bg
  'a1000000-0000-0000-0000-000000000003': '#1A1714', // Sage & Sirloin BH — dark bg
  'a1000000-0000-0000-0000-000000000004': '#FFFFFF', // Royal Chippy — has white circle
  'a1000000-0000-0000-0000-000000000005': 'theme',   // S&S Lounge KSA — dark green (own theme)
  'a1000000-0000-0000-0000-000000000006': '#1A1714', // TFJ — dark bg
  'a1000000-0000-0000-0000-000000000007': '#FFFFFF', // V Seven — white bg
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
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1A1714' : '#FFFFFF'
}

function Monogram({ venue, size, radius = 10 }: { venue: Venue; size: number; radius?: number }) {
  const isPastryHub = venue.venue_type === 'pastry_hub'
  const textColor = monogramTextColor(venue.theme_color)

  if (venue.logo_url) {
    const bgSpec = LOGO_BG[venue.id] ?? '#1A1714'
    const bg = bgSpec === 'theme' ? venue.theme_color : bgSpec
    const isLight = bg === '#FFFFFF'
    const pad = isLight ? Math.round(size * 0.08) : Math.round(size * 0.06)
    return (
      <div
        className="shrink-0 overflow-hidden flex items-center justify-center"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          background: bg,
          border: isLight ? '1px solid rgba(26,23,20,0.10)' : 'none',
          padding: pad,
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
        style={{ width: size, height: size, borderRadius: radius, background: venue.theme_color, color: textColor, fontSize: Math.round(size * 0.4) }}
      >
        ✦
      </div>
    )
  }

  const initials = VENUE_INITIALS[venue.id] ?? deriveInitials(venue.name)
  const fontSize = initials.length <= 2 ? 14 : 11

  return (
    <div
      className="shrink-0 flex items-center justify-center font-fraunces font-semibold leading-none select-none"
      style={{ width: size, height: size, borderRadius: radius, background: venue.theme_color, color: textColor, fontSize, letterSpacing: initials.length >= 3 ? '0.03em' : '0.02em' }}
    >
      {initials}
    </div>
  )
}

export function VenueCard({ venue, sections, recipeCount = 0, animIndex = 0 }: VenueCardProps) {
  const flag = venue.country_code === 'BH' ? '🇧🇭' : venue.country_code === 'SA' ? '🇸🇦' : null
  const activeSections = sections.filter((s) => s.is_active)

  return (
    <Link href={`/venues/${venue.id}`} className="block anim-fade-up" style={{ animationDelay: `${animIndex * 75}ms` }}>
      <article className="venue-card group relative overflow-hidden rounded-card bg-surface" style={{ border: '1px solid rgba(26,23,20,0.09)' }}>

        {/* Coloured top stripe — expands on hover */}
        <div
          className="w-full transition-all duration-300 group-hover:h-[5px]"
          style={{ height: 3, background: venue.theme_color }}
        />

        {/* Subtle colour wash on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: `linear-gradient(160deg, ${venue.theme_color}06 0%, transparent 55%)` }}
        />

        <div className="relative p-5 tablet:p-6">
          {/* Header */}
          <div className="flex items-start gap-3.5 mb-4">
            <Monogram venue={venue} size={46} radius={10} />
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-fraunces text-[19px] leading-tight text-text-primary truncate">{venue.name}</h3>
                {flag && (
                  <span className="text-[15px] leading-none shrink-0" title={venue.country_code === 'BH' ? 'Bahrain' : 'Saudi Arabia'}>
                    {flag}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[12px] text-text-muted">
                {venue.city && <span>{venue.city}</span>}
                {venue.city && <span className="opacity-40">·</span>}
                {venue.vat_rate > 0
                  ? <span>VAT {(venue.vat_rate * 100).toFixed(0)}%</span>
                  : <span>Recipe Library</span>
                }
              </div>
            </div>
          </div>

          {/* Description */}
          {venue.description && (
            <p className="text-text-secondary text-[13px] leading-relaxed mb-4 line-clamp-2">{venue.description}</p>
          )}

          {/* Divider */}
          <div className="h-px mb-4" style={{ background: 'rgba(26,23,20,0.07)' }} />

          {/* Section pills */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold tracking-[0.10em] uppercase text-text-muted">Sections</span>
              <span className="text-[11px] font-semibold" style={{ color: venue.theme_color }}>{activeSections.length}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeSections.slice(0, 5).map((section) => (
                <span
                  key={section.id}
                  className="text-[11px] px-2 py-0.5 rounded text-text-secondary"
                  style={{ background: 'rgba(26,23,20,0.05)', border: '1px solid rgba(26,23,20,0.08)' }}
                >
                  {section.name}
                </span>
              ))}
              {activeSections.length > 5 && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded font-medium"
                  style={{ background: 'rgba(26,23,20,0.05)', border: '1px solid rgba(26,23,20,0.08)', color: venue.theme_color }}
                >
                  +{activeSections.length - 5}
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1.5 text-text-muted">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1.5 2h9M1.5 5h9M1.5 8h5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="text-[12px]">{recipeCount > 0 ? `${recipeCount} recipes` : 'No recipes yet'}</span>
            </div>
            <div
              className="flex items-center gap-1 text-[12px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{ color: venue.theme_color }}
            >
              Open
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
