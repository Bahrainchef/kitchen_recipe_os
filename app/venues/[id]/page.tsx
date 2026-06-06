import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getVenueById, getSectionsForVenue, getRecipesForVenue } from '@/lib/supabase/queries'
import { SectionGrid } from '@/components/SectionGrid'
import { ActionBar } from '@/components/ActionBar'

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

  const bgSpec = LOGO_BG[id] ?? '#1A2F5E'
  const logoBg = bgSpec === 'theme' ? venue.theme_color : bgSpec
  const logoIsLight = logoBg === '#FFFFFF'

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Action bar ── */}
      <ActionBar backLabel="Dashboard" backHref="/" />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: 280 }}>

        {/* Photo or gradient */}
        {pageHeroUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={pageHeroUrl}
            alt={venue.name}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, ${venue.theme_color} 0%, rgba(11,31,74,0.96) 100%)` }}>
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 20% 50%, ${venue.theme_color}65 0%, transparent 65%)` }} />
          </div>
        )}

        {/* Strong gradient overlay — top dark, bottom very dark for text */}
        <div
          className="absolute inset-0"
          style={{
            background: pageHeroUrl
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.68) 100%)'
              : 'linear-gradient(to bottom, rgba(11,31,74,0.40) 0%, rgba(11,31,74,0.65) 100%)',
          }}
        />

        {/* Top-right: flag + city + VAT pills */}
        <div className="absolute top-4 right-5 tablet:right-8 flex items-center gap-2 flex-wrap justify-end">
          {flag && <span className="text-[26px] leading-none select-none drop-shadow-md">{flag}</span>}
          {countryName && (
            <HeroPill>{countryName}</HeroPill>
          )}
          {venue.city && <HeroPill>{venue.city}</HeroPill>}
          {venue.vat_rate > 0
            ? <HeroPill>VAT {(venue.vat_rate * 100).toFixed(0)}%</HeroPill>
            : <HeroPill>Recipe Library</HeroPill>
          }
        </div>

        {/* Bottom-left: venue name + description */}
        <div className="absolute bottom-0 left-0 right-0 px-5 tablet:px-8 pb-5 tablet:pb-7">
          {isPastryHub && (
            <span
              className="inline-block text-[10px] font-semibold tracking-[0.14em] uppercase px-2.5 py-0.5 rounded-full mb-2"
              style={{
                background: 'rgba(255,255,255,0.16)',
                color: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.20)',
              }}
            >
              Pastry Hub
            </span>
          )}
          <h1
            className="font-fraunces leading-tight tracking-tight drop-shadow-lg"
            style={{ color: '#ffffff', fontSize: 'clamp(26px, 4vw, 40px)' }}
          >
            {venue.name}
          </h1>
          {venue.description && (
            <p className="mt-1.5 text-[13px] tablet:text-[14px] leading-relaxed line-clamp-2 max-w-xl" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {venue.description}
            </p>
          )}
        </div>
      </div>

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
              {recipes.length > 0 && (
                <MetaChip>{recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</MetaChip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
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
