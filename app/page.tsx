import Link from 'next/link'
import { SEED_VENUES, SEED_SECTIONS } from '@/lib/seed-data'
import { VenueCard } from '@/components/VenueCard'
import { DashboardHero } from '@/components/DashboardHero'
import type { Venue, Section } from '@/lib/types/database.types'

async function getVenuesAndSections(): Promise<{
  venues: Venue[]
  sections: Section[]
  totalRecipes: number
  offlineReason: string | null
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey || url.includes('your-project-ref') || serviceKey === 'your-service-role-key-here') {
    return { venues: SEED_VENUES, sections: SEED_SECTIONS, totalRecipes: 0, offlineReason: 'Supabase not configured (.env.local missing or incomplete)' }
  }

  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    const [venueRes, sectionRes, recipeCountRes] = await Promise.all([
      supabase.from('venues').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('sections').select('*').eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('recipes').select('id', { count: 'exact', head: true }),
    ])
    const err = venueRes.error ?? sectionRes.error
    if (err) {
      const reason = err.message ?? JSON.stringify(err)
      console.error(`[Kitchen OS] Supabase read failed (${err.code ?? 'unknown'}): ${reason}`)
      return { venues: SEED_VENUES, sections: SEED_SECTIONS, totalRecipes: 0, offlineReason: reason }
    }
    return {
      venues: venueRes.data ?? SEED_VENUES,
      sections: sectionRes.data ?? SEED_SECTIONS,
      totalRecipes: recipeCountRes.count ?? 0,
      offlineReason: null,
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e)
    console.error('[Kitchen OS] Supabase connection failed:', reason)
    return { venues: SEED_VENUES, sections: SEED_SECTIONS, totalRecipes: 0, offlineReason: reason }
  }
}

export default async function DashboardPage() {
  const { venues, sections, totalRecipes, offlineReason } = await getVenuesAndSections()

  const pastryHub = venues.find((v) => v.venue_type === 'pastry_hub')
  const bahrain = venues.filter((v) => v.venue_type === 'physical' && v.country_code === 'BH')
  const saudi = venues.filter((v) => v.venue_type === 'physical' && v.country_code === 'SA')
  const sectionsFor = (venueId: string) => sections.filter((s) => s.venue_id === venueId)

  const totalVenues = venues.length
  const totalSections = sections.filter((s) => venues.some((v) => v.id === s.venue_id)).length
  const countriesActive = [bahrain.length > 0, saudi.length > 0].filter(Boolean).length

  let idx = 0
  const phIdx = pastryHub ? idx++ : -1
  const bhStart = idx; idx += bahrain.length
  const saStart = idx

  return (
    <div className="min-h-screen bg-canvas relative">

      {/* ── Announcement banner ── */}

      {/* ── Ambient orbs ─────────────────────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="orb-drift absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.12]"
          style={{ background: 'radial-gradient(circle, #f090b8, transparent 70%)', filter: 'blur(70px)' }}
        />
        <div
          className="orb-drift-slow absolute top-[55%] -left-60 w-[440px] h-[440px] rounded-full opacity-[0.18]"
          style={{ background: 'radial-gradient(circle, #f090b8, transparent 70%)', filter: 'blur(80px)' }}
        />
        <div
          className="orb-drift-med absolute -bottom-20 right-[18%] w-[360px] h-[360px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #4ecdc4, transparent 70%)', filter: 'blur(90px)' }}
        />
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass-surface" style={{ borderBottom: '1px solid rgba(100,150,240,0.35)' }}>
        <div className="max-w-[1400px] mx-auto px-5 tablet:px-8 h-14 flex items-center justify-between gap-4">

          {/* Wordmark */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, #f090b8 0%, #4a90d9 100%)',
                boxShadow: '0 2px 10px rgba(240,144,184,0.35)',
              }}
            >
              <span className="font-fraunces text-[15px] font-bold leading-none text-white">K</span>
            </div>
            <span className="font-fraunces text-[17px] tracking-tight select-none" style={{ color: '#f0f4ff' }}>
              Kitchen Recipe OS
            </span>
          </div>

          {/* Search bar */}
          <div className="hidden tablet:flex flex-1 max-w-xs">
            <div
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-[13px] transition-all"
              style={{
                background: '#122347',
                border: '1px solid rgba(100,150,240,0.40)',
                color: 'rgba(240,244,255,0.40)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8.5 8.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Search recipes…
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href="/import" className="btn-pink text-[12px]" style={{ padding: '6px 14px' }}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 1v7M3.5 5l3 3 3-3M1.5 10h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Import
            </Link>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/08"
              style={{ color: 'rgba(240,244,255,0.40)' }}
              aria-label="Notifications"
            >
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <path d="M8.5 1.5a5 5 0 0 1 5 5c0 2.8 1.4 4.2 1.4 4.2H2.1S3.5 10.3 3.5 6.5a5 5 0 0 1 5-5zM6.6 13.6a1.9 1.9 0 0 0 3.8 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold select-none cursor-pointer hover:opacity-85 transition-opacity"
              style={{
                background: 'linear-gradient(135deg, #f090b8 0%, #4a90d9 100%)',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(240,144,184,0.30)',
              }}
            >
              P
            </div>
          </div>
        </div>
      </header>

      {/* ── Dashboard Hero ──────────────────────────────────────────── */}
      <DashboardHero totalVenues={totalVenues} totalSections={totalSections} totalRecipes={totalRecipes} />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main className="relative max-w-[1400px] mx-auto px-5 tablet:px-8 py-8 tablet:py-10">

        {/* Offline banner */}
        {offlineReason && (
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-xl mb-8 text-[13px]"
            style={{
              background: 'rgba(240,144,184,0.08)',
              border: '1px solid rgba(240,144,184,0.18)',
              color: '#f090b8',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
              <path d="M8 5v4M8 11v1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <div>
              <span className="font-semibold">Offline mode — </span>showing static seed data.
              <span className="block mt-0.5 opacity-70 text-[12px]">{offlineReason}</span>
            </div>
          </div>
        )}

        {/* ── Stat chips ── */}
        <div className="flex items-center gap-2.5 mb-10 flex-wrap anim-fade-up">
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-[13px]"
            style={{
              background: 'rgba(78,205,196,0.10)',
              border: '1px solid rgba(78,205,196,0.20)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span className="w-2 h-2 rounded-full status-dot-pulse shrink-0" style={{ background: '#4ecdc4' }} />
            <span className="font-bold tabular-nums" style={{ color: '#f0f4ff' }}>{totalVenues}</span>
            <span style={{ color: 'rgba(240,244,255,0.55)' }}>venues active</span>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px]"
            style={{
              background: 'rgba(126,184,247,0.08)',
              border: '1px solid rgba(126,184,247,0.16)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span className="font-bold tabular-nums" style={{ color: '#f0f4ff' }}>{totalSections}</span>
            <span style={{ color: 'rgba(240,244,255,0.55)' }}>menu sections</span>
          </div>
          <div
            className="hidden tablet:flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px]"
            style={{
              background: 'rgba(240,144,184,0.08)',
              border: '1px solid rgba(240,144,184,0.15)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span className="font-bold tabular-nums" style={{ color: '#f0f4ff' }}>{countriesActive}</span>
            <span style={{ color: 'rgba(240,244,255,0.55)' }}>countries</span>
          </div>
        </div>

        {/* ── Pastry Hub + Bahrain ── */}
        {(pastryHub || bahrain.length > 0) && (
          <section className="mb-14" aria-label="Bahrain venues">
            {pastryHub && (
              <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4 mb-10">
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
          <section className="mb-14" aria-label="Saudi Arabia venues">
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
          className="pt-6 flex items-center justify-between gap-4 text-[12px] safe-bottom"
          style={{ borderTop: '1px solid rgba(100,150,240,0.18)', color: 'rgba(240,244,255,0.30)' }}
        >
          <span>Kitchen Recipe OS · Phase 1</span>
          <span>{totalVenues} venues · {totalSections} sections · {countriesActive} countries</span>
        </footer>
      </main>
    </div>
  )
}

function CountryHeader({ flag, country, venueCount }: { flag: string; country: string; venueCount: number }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-[30px] leading-none select-none">{flag}</span>
      <h2 className="font-fraunces text-[19px] leading-none tracking-tight" style={{ color: '#f0f4ff' }}>{country}</h2>
      <div className="flex-1 h-px" style={{ background: 'rgba(100,150,240,0.22)' }} />
      <span
        className="text-[11px] px-2.5 py-1 rounded-lg font-semibold tabular-nums"
        style={{
          background: 'rgba(100,150,240,0.12)',
          border: '1px solid rgba(100,150,240,0.22)',
          color: 'rgba(240,244,255,0.55)',
        }}
      >
        {venueCount} venue{venueCount !== 1 ? 's' : ''}
      </span>
    </div>
  )
}
