export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getVenueById, getSectionsForVenue, getRecipeCountsForVenue } from '@/lib/supabase/queries'
import { SectionGrid } from '@/components/SectionGrid'
import { ActionBar } from '@/components/ActionBar'
import { VenueHero } from '@/components/VenueHero'

const COUNTRY_FLAG: Record<string, string> = { BH: '🇧🇭', SA: '🇸🇦' }
const COUNTRY_NAME: Record<string, string> = { BH: 'Bahrain', SA: 'Saudi Arabia' }

const STORAGE = 'https://vuxpsnjbciyowpkbgwlv.supabase.co/storage/v1/object/public/venue-images'

// hero image shown on the venue detail page (may differ from cover_image_url on cards)
const VENUE_PAGE_HERO: Record<string, string> = {
  'a1000000-0000-0000-0000-000000000001': `${STORAGE}/brewed-hero.webp`,
  'a1000000-0000-0000-0000-000000000002': `${STORAGE}/wildflour-hero-2.webp`,
  'a1000000-0000-0000-0000-000000000003': `${STORAGE}/sage-sirloin-bh-hero.jpg`,
  'a1000000-0000-0000-0000-000000000004': `${STORAGE}/royal-chippy-hero.jpg`,
  'a1000000-0000-0000-0000-000000000005': `${STORAGE}/sage-lounge-hero.jpg`,
  'a1000000-0000-0000-0000-000000000006': `${STORAGE}/tfj-hero-2.webp`,
  'a1000000-0000-0000-0000-000000000007': `${STORAGE}/vseven-hero-2.jpg`,
  'a1000000-0000-0000-0000-000000000008': `${STORAGE}/pastry-hub-hero.jpg`,
  'a1000000-0000-0000-0000-000000000009': `${STORAGE}/otod-hero.jpg`,
}

const COLLECTION_LABEL: Record<string, string> = {
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
  'a1000000-0000-0000-0000-000000000009': 'theme',
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
  const [venue, sections, recipeCounts] = await Promise.all([
    getVenueById(id),
    getSectionsForVenue(id),
    getRecipeCountsForVenue(id),
  ])

  if (!venue) notFound()

  const flag = venue.country_code ? COUNTRY_FLAG[venue.country_code] : null
  const countryName = venue.country_code ? COUNTRY_NAME[venue.country_code] : null
  const activeSections = sections.filter(s => s.is_active)
  const isPastryHub = venue.venue_type === 'pastry_hub'
  const initials = isPastryHub ? '✦' : getInitials(venue.name, id)
  const textColor = monogramTextColor(venue.theme_color)
  const pageHeroUrl = VENUE_PAGE_HERO[id] ?? venue.cover_image_url ?? null

  const bgSpec = LOGO_BG[id] ?? '#1A2F5E'
  const logoBg = bgSpec === 'theme' ? venue.theme_color : bgSpec
  const logoIsLight = logoBg === '#FFFFFF'

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Action bar ── */}
      <ActionBar backLabel="Dashboard" backHref="/" />

      {/* ── Hero ── */}
      <VenueHero
        venueId={id}
        venueName={venue.name}
        venueDescription={venue.description ?? null}
        themeColor={venue.theme_color}
        initialHeroUrl={pageHeroUrl}
        flag={flag}
        countryName={countryName}
        city={venue.city ?? null}
        vatRate={venue.vat_rate}
        isPastryHub={isPastryHub}
        collectionLabel={COLLECTION_LABEL[id] ?? null}
      />

      {/* ── Details strip below hero ─────────────────────────────────────── */}
      <div style={{ background: '#1A2F5E', borderBottom: '1px solid rgba(42,74,138,0.50)' }}>
        <div className="max-w-[1400px] mx-auto px-5 tablet:px-8">
          <div className="relative flex items-center gap-4 tablet:gap-5 py-4">

            {/* Logo — pulled up to overlap hero */}
            <div className="shrink-0" style={{ marginTop: -40 }}>
              {venue.logo_url ? (
                <div
                  className="flex items-center justify-center overflow-hidden anim-fade-up"
                  style={{
                    width: 72, height: 72, borderRadius: 16,
                    background: logoBg,
                    border: logoIsLight ? '2px solid rgba(255,255,255,0.80)' : '2px solid rgba(255,255,255,0.14)',
                    padding: logoIsLight ? 6 : 4,
                    boxShadow: '0 6px 24px rgba(0,0,0,0.50)',
                  }}
                >
                  <Image
                    src={venue.logo_url}
                    alt={`${venue.name} logo`}
                    width={72}
                    height={72}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
              ) : (
                <div
                  className="flex items-center justify-center font-fraunces font-semibold leading-none select-none anim-fade-up"
                  style={{
                    width: 72, height: 72, borderRadius: 16,
                    background: venue.theme_color, color: textColor,
                    fontSize: initials === '✦' ? 28 : initials.length <= 2 ? 24 : 17,
                    boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
                    border: '2px solid rgba(255,255,255,0.15)',
                  }}
                >
                  {initials}
                </div>
              )}
            </div>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2 anim-fade-up" style={{ animationDelay: '60ms' }}>
              <MetaChip accent style={{ background: `${venue.theme_color}18`, color: venue.theme_color, borderColor: `${venue.theme_color}30` }}>
                {activeSections.length} section{activeSections.length !== 1 ? 's' : ''}
              </MetaChip>
              {recipeCounts.total > 0 && (
                <MetaChip>{recipeCounts.total} recipe{recipeCounts.total !== 1 ? 's' : ''}</MetaChip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <main className="max-w-[1400px] mx-auto px-5 tablet:px-8 py-8 tablet:py-10 page-enter">
        <SectionGrid
          sections={activeSections}
          recipeCounts={recipeCounts.bySectionId}
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
