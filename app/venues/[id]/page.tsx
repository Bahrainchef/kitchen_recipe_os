import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getVenueById, getSectionsForVenue, getRecipesForVenue } from '@/lib/supabase/queries'
import { SectionGrid } from '@/components/SectionGrid'
import { ActionBar } from '@/components/ActionBar'

const COUNTRY_FLAG: Record<string, string> = { BH: '🇧🇭', SA: '🇸🇦' }
const COUNTRY_NAME: Record<string, string> = { BH: 'Bahrain', SA: 'Saudi Arabia' }

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
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1A1714' : '#FFFFFF'
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

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Action bar ──────────────────────────────────────────────── */}
      <ActionBar backLabel="Dashboard" backHref="/" />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom, #EAE5DC, #F2EDE4)',
          borderBottom: '1px solid rgba(26,23,20,0.10)',
        }}
      >
        {/* Coloured accent stripe */}
        <div className="h-[3px] w-full" style={{ background: venue.theme_color }} />

        {/* Faint colour wash */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${venue.theme_color}0A 0%, transparent 55%)` }}
        />

        <div className="relative max-w-[1400px] mx-auto px-5 tablet:px-8 py-10 tablet:py-14">
          <div className="flex items-start gap-5 tablet:gap-7">

            {/* Logo or monogram */}
            {venue.logo_url ? (() => {
              const LOGO_BG: Record<string, string> = {
                'a1000000-0000-0000-0000-000000000001': '#1A1714',
                'a1000000-0000-0000-0000-000000000002': '#1A1714',
                'a1000000-0000-0000-0000-000000000003': '#1A1714',
                'a1000000-0000-0000-0000-000000000004': '#FFFFFF',
                'a1000000-0000-0000-0000-000000000006': '#1A1714',
                'a1000000-0000-0000-0000-000000000007': '#FFFFFF',
              }
              const bg = id === 'a1000000-0000-0000-0000-000000000005'
                ? venue.theme_color
                : (LOGO_BG[id] ?? '#1A1714')
              const isLight = bg === '#FFFFFF'
              return (
                <div
                  className="shrink-0 flex items-center justify-center overflow-hidden anim-fade-up"
                  style={{
                    width: 72, height: 72, borderRadius: 16,
                    background: bg,
                    border: isLight ? '1px solid rgba(26,23,20,0.10)' : 'none',
                    padding: isLight ? 6 : 4,
                    boxShadow: '0 4px 16px rgba(26,23,20,0.12)',
                  }}
                >
                  <Image
                    src={venue.logo_url}
                    alt={`${venue.name} logo`}
                    width={72}
                    height={72}
                    className="w-full h-full object-contain"
                  />
                </div>
              )
            })() : (
              <div
                className="shrink-0 flex items-center justify-center font-fraunces font-semibold leading-none select-none anim-fade-up"
                style={{
                  width: 72, height: 72, borderRadius: 16,
                  background: venue.theme_color, color: textColor,
                  fontSize: initials === '✦' ? 28 : initials.length <= 2 ? 22 : 16,
                  letterSpacing: initials.length >= 3 ? '0.02em' : '0',
                  boxShadow: '0 4px 16px rgba(26,23,20,0.14)',
                }}
              >
                {initials}
              </div>
            )}

            {/* Details */}
            <div className="anim-fade-up" style={{ animationDelay: '60ms' }}>
              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                <h1 className="font-fraunces text-[28px] tablet:text-[36px] leading-none text-text-primary">
                  {venue.name}
                </h1>
                {flag && <span className="text-[22px] leading-none">{flag}</span>}
              </div>

              {venue.description && (
                <p className="text-text-secondary text-[14px] leading-relaxed mb-3 max-w-xl">{venue.description}</p>
              )}

              {/* Meta chips */}
              <div className="flex flex-wrap gap-2">
                {countryName && (
                  <MetaChip>{countryName}</MetaChip>
                )}
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
        background: accent ? undefined : 'rgba(26,23,20,0.06)',
        color: accent ? undefined : '#6E6560',
        border: '1px solid',
        borderColor: accent ? undefined : 'rgba(26,23,20,0.10)',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
