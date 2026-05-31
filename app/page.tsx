import Link from 'next/link'
import { SEED_VENUES, SEED_SECTIONS } from '@/lib/seed-data'
import { VenueCard } from '@/components/VenueCard'
import type { Venue, Section } from '@/lib/types/database.types'

async function getVenuesAndSections(): Promise<{
  venues: Venue[]
  sections: Section[]
  offlineReason: string | null
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || url.includes('your-project-ref') || serviceKey === 'your-service-role-key-here') {
    return { venues: SEED_VENUES, sections: SEED_SECTIONS, offlineReason: 'Supabase not configured (.env.local missing or incomplete)' }
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    const [venueRes, sectionRes] = await Promise.all([
      supabase.from('venues').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('sections').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
    ])
    const err = venueRes.error ?? sectionRes.error
    if (err) {
      const reason = err.message ?? JSON.stringify(err)
      console.error(`[Kitchen OS] Supabase read failed (${err.code ?? 'unknown'}): ${reason}`)
      return { venues: SEED_VENUES, sections: SEED_SECTIONS, offlineReason: reason }
    }
    return { venues: venueRes.data ?? SEED_VENUES, sections: sectionRes.data ?? SEED_SECTIONS, offlineReason: null }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error('[Kitchen OS] Supabase connection failed:', reason)
    return { venues: SEED_VENUES, sections: SEED_SECTIONS, offlineReason: reason }
  }
}

export default async function DashboardPage() {
  const { venues, sections, offlineReason } = await getVenuesAndSections()

  const pastryHub = venues.find((v) => v.venue_type === 'pastry_hub')
  const bahrain = venues.filter((v) => v.venue_type === 'physical' && v.country_code === 'BH')
  const saudi = venues.filter((v) => v.venue_type === 'physical' && v.country_code === 'SA')
  const sectionsFor = (venueId: string) => sections.filter((s) => s.venue_id === venueId)

  const totalVenues = bahrain.length + saudi.length
  const totalSections = sections.filter((s) => venues.some((v) => v.id === s.venue_id)).length

  // Compute staggered anim indices across all cards
  let idx = 0
  const phIdx = pastryHub ? idx++ : -1
  const bhStart = idx; idx += bahrain.length
  const saStart = idx

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40"
        style={{ background: 'rgba(248,244,238,0.94)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(26,23,20,0.09)' }}
      >
        <div className="max-w-[1400px] mx-auto px-5 tablet:px-8 h-14 flex items-center justify-between gap-4">
          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #C8973A, #A07828)' }}>
              <span className="font-fraunces text-[15px] font-bold leading-none text-white">K</span>
            </div>
            <span className="font-fraunces text-[17px] tracking-tight text-text-primary">Kitchen Recipe OS</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/import"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#1A1714', color: '#C8973A' }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v7M3.5 5l3 3 3-3M1.5 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Import Recipes
            </Link>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-secondary hover:bg-[rgba(26,23,20,0.05)] transition-colors" aria-label="Notifications">
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <path d="M8.5 1.5a5 5 0 0 1 5 5c0 2.8 1.4 4.2 1.4 4.2H2.1S3.5 10.3 3.5 6.5a5 5 0 0 1 5-5zM6.6 13.6a1.9 1.9 0 0 0 3.8 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold" style={{ background: '#1A1714', color: '#C8973A' }}>P</div>
          </div>
        </div>
      </header>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-5 tablet:px-8 py-8 tablet:py-12">

        {/* Offline banner */}
        {offlineReason && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-lg mb-8 text-[13px]"
            style={{ background: 'rgba(200,151,58,0.10)', border: '1px solid rgba(200,151,58,0.30)', color: '#7A5C1E' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
              <path d="M8 5v4M8 11v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <div>
              <span className="font-semibold">Running in offline mode — </span>
              showing static seed data.
              <span className="block mt-0.5 opacity-70 text-[12px]">{offlineReason}</span>
            </div>
          </div>
        )}

        {/* Page heading */}
        <div className="mb-10 tablet:mb-12">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-2 text-text-muted">F&amp;B Group</p>
              <h1 className="font-fraunces text-[34px] tablet:text-[44px] text-text-primary leading-none">
                Venue Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-text-secondary"
                style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.09)', boxShadow: '0 1px 2px rgba(26,23,20,0.04)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {totalVenues} venues active
              </div>
              <div
                className="flex items-center px-3 py-1.5 rounded-lg text-[12px] text-text-secondary"
                style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.09)', boxShadow: '0 1px 2px rgba(26,23,20,0.04)' }}
              >
                {totalSections} sections
              </div>
            </div>
          </div>
        </div>

        {/* ── Pastry Hub + Bahrain ── */}
        {(pastryHub || bahrain.length > 0) && (
          <section className="mb-12" aria-label="Bahrain venues">
            {pastryHub && (
              <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 mb-8">
                <VenueCard venue={pastryHub} sections={sectionsFor(pastryHub.id)} recipeCount={0} animIndex={phIdx} />
              </div>
            )}
            {bahrain.length > 0 && <CountryHeader flag="🇧🇭" country="Bahrain" venueCount={bahrain.length} />}
            {bahrain.length > 0 && (
              <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
                {bahrain.map((venue, i) => (
                  <VenueCard key={venue.id} venue={venue} sections={sectionsFor(venue.id)} recipeCount={0} animIndex={bhStart + i} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Saudi Arabia ── */}
        {saudi.length > 0 && (
          <section className="mb-12" aria-label="Saudi Arabia venues">
            <CountryHeader flag="🇸🇦" country="Saudi Arabia" venueCount={saudi.length} />
            <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-4">
              {saudi.map((venue, i) => (
                <VenueCard key={venue.id} venue={venue} sections={sectionsFor(venue.id)} recipeCount={0} animIndex={saStart + i} />
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer
          className="pt-6 flex items-center justify-between gap-4 text-[12px] text-text-muted safe-bottom"
          style={{ borderTop: '1px solid rgba(26,23,20,0.09)' }}
        >
          <span>Kitchen Recipe OS · Phase 1</span>
          <span>{totalVenues} venues · {totalSections} sections</span>
        </footer>
      </main>
    </div>
  )
}

function CountryHeader({ flag, country, venueCount }: { flag: string; country: string; venueCount: number }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xl leading-none">{flag}</span>
      <h2 className="font-fraunces text-[18px] text-text-primary">{country}</h2>
      <div className="flex-1 h-px" style={{ background: 'rgba(26,23,20,0.09)' }} />
      <span
        className="text-[11px] px-2 py-0.5 rounded font-medium text-text-muted"
        style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.09)' }}
      >
        {venueCount} venue{venueCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
