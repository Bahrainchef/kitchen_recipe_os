import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getVenueById, getSectionsForVenue, getRecipesForVenue } from '@/lib/supabase/queries'
import { SectionGrid } from '@/components/SectionGrid'
import { ActionBar } from '@/components/ActionBar'

const COUNTRY_FLAG: Record<string, string> = { BH: '🇧🇭', SA: '🇸🇦' }
const COUNTRY_NAME: Record<string, string> = { BH: 'Bahrain', SA: 'Saudi Arabia' }

const STORAGE = 'https://vuxpsnjbciyowpkbgwlv.supabase.co/storage/v1/object/public/venue-images'
const VENUE_PAGE_HERO: Record<string, string> = {
  'a1000000-0000-0000-0000-000000000006': `${STORAGE}/tfj-hero-2.webp`,
  'a1000000-0000-0000-0000-000000000007': `${STORAGE}/vseven-hero-2.jpg`,
  'a1000000-0000-0000-0000-000000000002': `${STORAGE}/wildflour-hero-2.webp`,
  'a1000000-0000-0000-0000-000000000005': `${STORAGE}/sage-lounge-hero.jpg`,
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

function getInitials(name: string, id: string): string {
  if (VENUE_INITIALS[id]) return VENUE_INITIALS[id]
  return name.split(/\s+/).filter(w => w !== '&').map(w => w[0]).join('').slice(0, 3).toUpperCase()
}

function monogramTextColor(hex: string): string {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#0B1F4A' : '#FFFFFF'
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function VenuePage({ params }: Props) {
  const { id } = await params
  const [venue, sections, recipes] = await Promise.all([
    getVenueById(id),
    getSectionsForVenue(id),
    getRecipesForVenue(id),
  ])

  if (!venue) notFound()

  const flag = venue.country_code ? COUNTRY_FLAG[venue.country_code] : null
  const countryName = venue.country_code ? COUNTRY_NAME[venue.country_code] : null
  const activeSections = sections.filter(s => s.is_active)
  const isPastryHub = venue.venue_type === 'pastry_hub'
  const initials = isPastryHub ? '✦' : getInitials(venue.name, id)
  const textColor = monogramTextColor(venue.theme_color)
  const pageHeroUrl = VENUE_PAGE_HERO[id] ?? null

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Action bar ──────────────────────────────────────────────── */}
      <ActionBar backLabel="Dashboard" backHref="/" />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ borderBottom: '1px solid rgba(126,184,247,0.10)' }}>

        {/* Banner — photo or gradient */}
        <div
          className="relative overflow-hidden"
          style={{ height: pageHeroUrl ? 260 : 120 }}
        >
          {pageHeroUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pageHeroUrl}
                alt={venue.name}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(11,31,74,0.30) 0%, rgba(11,31,74,0.75) 100%)' }}
              />
            </>
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{ background: `linear-gradient(145deg, ${venue.theme_color} 0%, rgba(11,31,74,0.96) 100%)` }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 20% 50%, ${venue.theme_color}65 0%, transparent 65%)` }}
              />
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.04]"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 24px), repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 24px)',
                }}
              />
            </>
          )}
          {/* Country flag */}
          {flag && (
            <div className="absolute top-4 right-5 tablet:right-8 text-[32px] leading-none select-none drop-shadow-md">{flag}</div>
          )}
        </div>

        {/* Details row — overlaps banner bottom */}
        <div
          className="relative max-w-[1400px] mx-auto px-5 tablet:px-8"
          style={{ background: '#1A2F5E' }}
        >
          {/* Subtle colour wash */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(135deg, ${venue.theme_color}08 0%, transparent 55%)` }}
          />

          <div className="relative flex items-start gap-5 tablet:gap-6 py-6 tablet:py-8">
            {/* Logo or monogram — pulled up to overlap the banner */}
            <div className="shrink-0" style={{ marginTop: -40 }}>
              {venue.logo_url ? (() => {
                const LOGO_BG: Record<string, string> = {
                  'a1000000-0000-0000-0000-000000000001': '#1A2F5E',
                  'a1000000-0000-0000-0000-000000000002': '#1A2F5E',
                  'a1000000-0000-0000-0000-000000000003': '#1A2F5E',
                  'a1000000-0000-0000-0000-000000000004': '#FFFFFF',
                  'a1000000-0000-0000-0000-000000000006': '#1A2F5E',
                  'a1000000-0000-0000-0000-000000000007': '#FFFFFF',
                }
                const bg = id === 'a1000000-0000-0000-0000-000000000005'
                  ? venue.theme_color
                  : (LOGO_BG[id] ?? '#1A2F5E')
                const isLight = bg === '#FFFFFF'
                return (
                  <div
                    className="flex items-center justify-center overflow-hidden anim-fade-up"
                    style={{
                      width: 80, height: 80, borderRadius: 18,
                      background: bg,
                      border: isLight ? '2px solid rgba(255,255,255,0.80)' : '2px solid rgba(255,255,255,0.12)',
                      padding: isLight ? 7 : 5,
                      boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
                    }}
                  >
                    <Image
                      src={venue.logo_url}
                      alt={`${venue.name} logo`}
                      width={80}
                      height={80}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )
              })() : (
                <div
                  className="flex items-center justify-center font-fraunces font-semibold leading-none select-none anim-fade-up"
                  style={{
                    width: 80, height: 80, borderRadius: 18,
                    background: venue.theme_color, color: textColor,
                    fontSize: initials === '✦' ? 30 : initials.length <= 2 ? 26 : 18,
                    letterSpacing: initials.length >= 3 ? '0.02em' : '0',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
                    border: '2px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {initials}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="anim-fade-up flex-1 min-w-0" style={{ animationDelay: '60ms' }}>
              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                <h1 className="font-fraunces text-[28px] tablet:text-[38px] leading-tight text-text-primary tracking-tight">
                  {venue.name}
                </h1>
              </div>

              {venue.description && (
                <p className="text-text-secondary text-[14px] leading-relaxed mb-3 max-w-xl">{venue.description}</p>
              )}

              {/* Meta chips */}
              <div className="flex flex-wrap gap-2">
                {countryName && <MetaChip>{countryName}</MetaChip>}
                {venue.city && <MetaChip>{venue.city}</MetaChip>}
                {venue.vat_rate > 0
                  ? <MetaChip>VAT {(venue.vat_rate * 100).toFixed(0)}%</MetaChip>
                  : <MetaChip>Recipe Library</MetaChip>
                }
                <MetaChip accent style={{ background: `${venue.theme_color}18`, color: venue.theme_color, borderColor: `${venue.theme_color}30` }}>
                  {activeSections.length} section{activeSections.length !== 1 ? 's' : ''}
                </MetaChip>
                {recipes.length > 0 && (
                  <MetaChip>{recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</MetaChip>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections ───────────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-5 tablet:px-8 py-8 tablet:py-10 page-enter">
        <SectionGrid
          sections={activeSections}
          recipes={recipes}
          venueId={id}
          themeColor={venue.theme_color}
        />
      </main>
    </div>
  )
}

function MetaChip({
  children,
  accent,
  style,
}: {
  children: React.ReactNode
  accent?: boolean
  style?: React.CSSProperties
}) {
  return (
    <span
      className="inline-flex items-center text-[12px] px-2.5 py-1 rounded-lg font-medium"
      style={{
        background: accent ? undefined : 'rgba(126,184,247,0.08)',
        color: accent ? undefined : 'rgba(240,244,255,0.60)',
        border: '1px solid',
        borderColor: accent ? undefined : 'rgba(126,184,247,0.12)',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
