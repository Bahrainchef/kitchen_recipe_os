import { notFound } from 'next/navigation'
import { getVenueById, getSectionsForVenue, getRecipesForSection, getHeroPhotosForRecipes } from '@/lib/supabase/queries'
import { SectionRecipeList } from '@/components/SectionRecipeList'
import { ActionBar } from '@/components/ActionBar'

const SECTION_ICONS: Record<string, string> = {
  'breakfast':             '🍳',
  'lunch':                 '🫕',
  'dinner':                '🍽️',
  'hot kitchen':           '🔥',
  'cold kitchen':          '🥗',
  'dessert':               '🍮',
  'desserts':              '🍮',
  'plated desserts':       '🍮',
  'beverages':             '🧃',
  'coffee':                '☕',
  'tea':                   '🫖',
  'high tea':              '🫖',
  'specialty drinks':      '🧋',
  'pastries & cakes':      '🥐',
  'pastries & croissants': '🥐',
  'pastry':                '🥐',
  'sandwiches':            '🥪',
  'basic recipes':         '📋',
  'base recipes':          '📋',
  'sauces':                '🫙',
  'marinades':             '🧴',
  'sausages':              '🌿',
  'sheesha menu':          '💨',
  'specials':              '⭐',
  'prep':                  '🔪',
  'pizza':                 '🍕',
  'bread':                 '🍞',
  'bakery':                '🥖',
  'fry station':           '🍟',
  'creams & fillings':     '🍯',
  'doughs':                '🫓',
  'the box exclusives':    '📦',
  'ramadan':               '🌙',
  'christmas':             '🎄',
  '60x40':                 '📐',
}

function getSectionIcon(name: string): string {
  return SECTION_ICONS[name.toLowerCase()] ?? '📋'
}

interface Props {
  params: Promise<{ id: string; sectionId: string }>
}

export default async function SectionPage({ params }: Props) {
  const { id, sectionId } = await params

  const [venue, sections] = await Promise.all([
    getVenueById(id),
    getSectionsForVenue(id),
  ])

  if (!venue) notFound()

  const section = sections.find(s => s.id === sectionId)
  if (!section) notFound()

  const recipes = await getRecipesForSection(sectionId)
  const photoMap = await getHeroPhotosForRecipes(recipes.map(r => r.id))
  const icon = getSectionIcon(section.name)

  return (
    <div className="min-h-screen bg-canvas">

      {/* Action bar */}
      <ActionBar backLabel={venue.name} backHref={`/venues/${id}`} />

      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background: '#1A2F5E',
          borderBottom: '1px solid rgba(126,184,247,0.10)',
        }}
      >
        <div className="h-[3px] w-full" style={{ background: venue.theme_color }} />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${venue.theme_color}0A 0%, transparent 55%)` }}
        />

        <div className="relative max-w-[1100px] mx-auto px-5 tablet:px-8 py-8 tablet:py-12">
          <div className="flex items-center gap-5 anim-fade-up">
            {/* Icon circle */}
            <div
              className="shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-[34px] leading-none"
              style={{ background: `${venue.theme_color}18`, border: `1.5px solid ${venue.theme_color}30` }}
            >
              {icon}
            </div>

            <div>
              <p
                className="text-[11px] font-semibold tracking-[0.12em] uppercase mb-1"
                style={{ color: venue.theme_color }}
              >
                {venue.name}
              </p>
              <h1 className="font-fraunces text-[28px] tablet:text-[34px] leading-none text-text-primary mb-2">
                {section.name}
              </h1>
              <div className="flex items-center gap-2">
                <span
                  className="text-[12px] font-medium px-2.5 py-1 rounded-lg"
                  style={{ background: `${venue.theme_color}18`, color: venue.theme_color, border: `1px solid ${venue.theme_color}30` }}
                >
                  {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-[1100px] mx-auto px-5 tablet:px-8 py-8 tablet:py-10 page-enter">
        <SectionRecipeList
          recipes={recipes}
          venueId={id}
          sectionId={sectionId}
          sectionName={section.name}
          themeColor={venue.theme_color}
          countryCode={venue.country_code ?? undefined}
          photoMap={photoMap}
          sections={sections}
        />
      </main>
    </div>
  )
}
