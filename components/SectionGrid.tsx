'use client'

import Link from 'next/link'
import type { Section, Recipe } from '@/lib/types/database.types'

interface Props {
  sections: Section[]
  recipes: Recipe[]
  venueId: string
  themeColor: string
}

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
  'christmas':             '🎄',
  '60x40':                 '📐',
}

function getSectionIcon(name: string): string {
  return SECTION_ICONS[name.toLowerCase()] ?? '📋'
}

export function SectionGrid({ sections, recipes, venueId, themeColor }: Props) {
  const recipeCount = (sectionId: string) => recipes.filter(r => r.section_id === sectionId).length

  if (sections.length === 0) {
    return (
      <div
        className="rounded-card px-8 py-16 text-center"
        style={{ border: '1px dashed rgba(26,23,20,0.15)', background: 'rgba(26,23,20,0.02)' }}
      >
        <p className="font-fraunces text-[18px] text-text-primary mb-1">No sections yet</p>
        <p className="text-text-muted text-[14px]">Configure sections for this venue in the database.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="font-fraunces text-[20px] text-text-primary">Sections</h2>
        <div className="flex-1 h-px" style={{ background: 'rgba(26,23,20,0.09)' }} />
        <span className="text-[12px] text-text-muted">{sections.length} total</span>
      </div>

      <div className="grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-4">
        {sections.map((section, i) => {
          const count = recipeCount(section.id)
          const icon = getSectionIcon(section.name)

          return (
            <Link
              key={section.id}
              href={`/venues/${venueId}/sections/${section.id}`}
              className="section-card group relative overflow-hidden rounded-card bg-white text-left anim-fade-up block"
              style={{
                border: '1px solid rgba(26,23,20,0.09)',
                animationDelay: `${i * 50}ms`,
                minHeight: 160,
              }}
            >
              {/* Coloured top stripe — widens on hover */}
              <div
                className="w-full transition-all duration-300 group-hover:h-[4px]"
                style={{ height: 3, background: themeColor }}
              />

              {/* Hover tint */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ background: `linear-gradient(160deg, ${themeColor}09 0%, transparent 65%)` }}
              />

              {/* Recipe count badge — top right */}
              <div className="absolute top-3 right-3">
                <span
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${themeColor}18`, color: themeColor, border: `1px solid ${themeColor}28` }}
                >
                  {count}
                </span>
              </div>

              {/* Card content */}
              <div className="relative flex flex-col items-center justify-center text-center px-4 pt-6 pb-7 gap-3">
                {/* Large emoji */}
                <span
                  className="text-[48px] leading-none transition-transform duration-300 group-hover:scale-110 select-none"
                  style={{ display: 'inline-block' }}
                >
                  {icon}
                </span>

                {/* Section name */}
                <h3
                  className="font-fraunces leading-tight text-text-primary"
                  style={{ fontSize: section.name.length > 14 ? 13 : 14 }}
                >
                  {section.name}
                </h3>

                {/* Recipe count label */}
                <span className="text-[11px] text-text-muted">
                  {count} {count === 1 ? 'recipe' : 'recipes'}
                </span>
              </div>

              {/* Arrow — appears on hover, bottom right */}
              <div
                className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0"
                style={{ color: themeColor }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
