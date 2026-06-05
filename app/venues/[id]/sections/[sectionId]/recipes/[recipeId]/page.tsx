import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getVenueById, getSectionsForVenue, getRecipeWithDetails } from '@/lib/supabase/queries'
import { RecipeHero } from '@/components/RecipeHero'
import { RecipeActionBar } from '@/components/RecipeActionBar'
import type { RecipeIngredient } from '@/lib/types/database.types'

interface Props {
  params: Promise<{ id: string; sectionId: string; recipeId: string }>
}

export default async function RecipePage({ params }: Props) {
  const { id, sectionId, recipeId } = await params
  const [venue, sections, detail] = await Promise.all([
    getVenueById(id),
    getSectionsForVenue(id),
    getRecipeWithDetails(recipeId),
  ])

  if (!venue) notFound()

  const section = sections.find(s => s.id === sectionId)

  if (!detail) {
    return (
      <NoSupabasePlaceholder
        venueName={venue.name}
        venueId={id}
        sectionId={sectionId}
        sectionName={section?.name}
      />
    )
  }

  const { recipe, ingredients, steps, heroPhotoUrl } = detail

  const grouped = new Map<string, RecipeIngredient[]>()
  for (const ing of ingredients) {
    const key = ing.group_name ?? ''
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(ing)
  }
  const hasGroups = [...grouped.keys()].some(k => k !== '')

  const hasCosts = (recipe.total_cost ?? 0) > 0
  const currency = venue.country_code === 'SA' ? 'SAR' : 'BD'
  const fmt = (n: number | null) => n != null ? `${n.toFixed(3)} ${currency}` : '—'
  const fmtPct = (n: number | null) => n != null ? `${(n * 100).toFixed(1)}%` : '—'

  const publishedDate = recipe.published_at
    ? new Date(recipe.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const backHref = `/venues/${id}/sections/${sectionId}`
  const backLabel = section?.name ?? venue.name

  // Precalculate which group names are "first named" to suppress top divider
  const groupKeys = [...grouped.keys()]

  return (
    <div className="min-h-screen bg-canvas">
      <RecipeActionBar
        backLabel={backLabel}
        backHref={backHref}
        recipeId={recipeId}
        venueId={id}
        currentSectionId={sectionId}
        sections={sections}
        themeColor={venue.theme_color}
        recipe={{
          title: recipe.title,
          description: recipe.description,
          portion_size: recipe.portion_size,
          selling_price: recipe.selling_price,
          status: recipe.status,
        }}
        ingredients={ingredients}
        steps={steps}
      />
      <main className="max-w-[900px] mx-auto recipe-print-area page-enter">

        {/* Hero */}
        <RecipeHero
          recipeId={recipeId}
          initialPhotoUrl={heroPhotoUrl}
          title={recipe.title}
          sectionName={section?.name}
          venueName={venue.name}
          themeColor={venue.theme_color}
          portionSize={recipe.portion_size}
          costPct={recipe.cost_percentage}
          status={recipe.status}
        />

        {/* Body */}
        <div className="px-5 tablet:px-8 py-8 tablet:py-10">

          {/* Description + meta */}
          {(recipe.description || recipe.recipe_size > 1 || publishedDate) && (
            <div className="mb-8">
              {recipe.description && (
                <p className="text-text-secondary text-[15px] leading-relaxed mb-3">{recipe.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-text-muted">
                {recipe.recipe_size && recipe.recipe_size !== 1 && (
                  <span>Recipe size: {recipe.recipe_size}</span>
                )}
                <span>v{recipe.version_number}</span>
                {publishedDate && <span>Published {publishedDate}</span>}
              </div>
            </div>
          )}

          <div className="h-px mb-8" style={{ background: 'rgba(26,23,20,0.09)' }} />

          <div className="grid tablet:grid-cols-[1fr_260px] gap-8 tablet:gap-12">

            {/* Left: ingredients + method */}
            <div>

              {/* Ingredients */}
              {ingredients.length > 0 && (
                <section className="mb-10">
                  <SectionHeading color={venue.theme_color}>Ingredients</SectionHeading>
                  {Array.from(grouped.entries()).map(([group, ings], i) => {
                    const prevHasNamedGroup = groupKeys.slice(0, i).some(k => k !== '')
                    const showHeader = hasGroups && !!group
                    return (
                      <div key={group || '__ungrouped__'} className="mb-5">
                        {showHeader && (
                          <>
                            {prevHasNamedGroup && (
                              <div className="h-px mb-3 mt-1" style={{ background: 'rgba(26,23,20,0.10)' }} />
                            )}
                            <div
                              className="text-[11px] font-bold tracking-[0.12em] uppercase mb-2"
                              style={{ color: venue.theme_color }}
                            >
                              {group}
                            </div>
                          </>
                        )}
                        <table className="w-full">
                          <tbody>
                            {ings.map(ing => (
                              <tr key={ing.id} className="border-b" style={{ borderColor: 'rgba(26,23,20,0.05)' }}>
                                <td className="py-2.5 pr-2 text-[14px] text-text-muted tabular-nums w-14 text-right align-top">
                                  {ing.quantity != null ? formatQty(ing.quantity, ing.unit) : '—'}
                                </td>
                                <td className="py-2.5 pr-4 text-[13px] text-text-muted w-8 align-top">
                                  {ing.quantity != null ? displayUnit(ing.unit) : ''}
                                </td>
                                <td className="py-2.5 text-[15px] text-text-primary align-top">
                                  {ing.ingredient_name}
                                  {ing.preparation_note && (
                                    <span className="text-text-muted text-[14px]">, {ing.preparation_note}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </section>
              )}

              {/* Method — always shown */}
              <section>
                <SectionHeading color={venue.theme_color}>Method</SectionHeading>
                {steps.length > 0 ? (
                  <ol className="space-y-4">
                    {steps.map((step, i) => (
                      <li key={step.id} className="flex gap-4">
                        <span
                          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold leading-none mt-0.5"
                          style={{ background: venue.theme_color, color: '#FFFFFF' }}
                        >
                          {i + 1}
                        </span>
                        <p className="text-[15px] text-text-primary leading-relaxed pt-0.5">{step.instruction}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-text-muted text-[14px]">No method added yet.</p>
                )}
              </section>

            </div>

            {/* Right: cost + details */}
            <div>
              {hasCosts && (
                <div
                  className="rounded-card p-5 sticky top-6 mb-4"
                  style={{ border: '1px solid rgba(26,23,20,0.09)', background: '#FFFFFF' }}
                >
                  <SectionHeading color={venue.theme_color}>Cost</SectionHeading>
                  <div className="space-y-2 text-[13px]">
                    <CostRow label="Ingredients" value={fmt(recipe.total_ingredient_cost)} />
                    {recipe.misc_cost_pct && (
                      <CostRow label={`Misc (${(recipe.misc_cost_pct * 100).toFixed(0)}%)`} value={fmt(recipe.misc_cost_amount)} />
                    )}
                    <div className="h-px my-2" style={{ background: 'rgba(26,23,20,0.09)' }} />
                    <CostRow label="Total cost" value={fmt(recipe.total_cost)} bold />
                    {recipe.portion_size && <CostRow label="Portions" value={String(recipe.portion_size)} />}
                    <CostRow label="Per portion" value={fmt(recipe.cost_per_portion)} />
                    <div className="h-px my-2" style={{ background: 'rgba(26,23,20,0.09)' }} />
                    <CostRow label="Selling price" value={fmt(recipe.selling_price)} />
                    <CostRow
                      label="Food cost %"
                      value={fmtPct(recipe.cost_percentage)}
                      valueStyle={{ color: costColor(recipe.cost_percentage) }}
                      bold
                    />
                  </div>
                </div>
              )}

              <div
                className="rounded-card p-5"
                style={{ border: '1px solid rgba(26,23,20,0.09)', background: '#FFFFFF' }}
              >
                <SectionHeading color={venue.theme_color}>Details</SectionHeading>
                <div className="space-y-2 text-[13px]">
                  <CostRow label="Venue" value={venue.name} />
                  {section && <CostRow label="Section" value={section.name} />}
                  {recipe.recipe_size && recipe.recipe_size !== 1 && (
                    <CostRow label="Recipe size" value={String(recipe.recipe_size)} />
                  )}
                  {recipe.excel_source_tab && (
                    <CostRow label="Source tab" value={recipe.excel_source_tab} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <h2
      className="font-fraunces text-[17px] mb-4"
      style={{ color: '#1A1714', borderBottom: `2px solid ${color}`, paddingBottom: 6, display: 'inline-block' }}
    >
      {children}
    </h2>
  )
}

function CostRow({ label, value, bold, valueStyle }: {
  label: string; value: string; bold?: boolean; valueStyle?: React.CSSProperties
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={`text-text-muted ${bold ? 'font-semibold' : ''}`}>{label}</span>
      <span className={`tabular-nums ${bold ? 'font-semibold text-text-primary' : 'text-text-secondary'}`} style={valueStyle}>
        {value}
      </span>
    </div>
  )
}

function NoSupabasePlaceholder({ venueName, venueId, sectionId, sectionName }: {
  venueName: string; venueId: string; sectionId: string; sectionName?: string
}) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-full bg-[rgba(26,23,20,0.06)] flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2zm0 4v5m0 2v1" stroke="#9A9490" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="font-fraunces text-[22px] text-text-primary mb-2">Recipe not found</h2>
        <p className="text-text-secondary text-[14px] leading-relaxed mb-6">
          This recipe requires a live database connection.
        </p>
        <Link
          href={sectionId ? `/venues/${venueId}/sections/${sectionId}` : `/venues/${venueId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-semibold"
          style={{ background: '#1A1714', color: '#FFFFFF' }}
        >
          ← Back to {sectionName ?? venueName}
        </Link>
      </div>
    </div>
  )
}

function formatQty(qty: number, unit: string | null): string {
  const u = (unit ?? '').toLowerCase().trim()
  // ml is stored as decimal litres (0.015 L → display 15 ml)
  // gr is already stored as whole grams by the import parser — no scaling needed here
  // all other units (each, pc, piece, portion, …) are whole numbers
  if (u === 'ml') return String(Math.round(qty * 1000))
  return String(Math.round(qty))
}

function displayUnit(unit: string | null): string {
  // Show exactly what is stored — no fallback to 'gr'
  return unit?.trim() ?? ''
}

function costColor(pct: number | null): string {
  if (pct === null) return '#1A1714'
  if (pct < 0.25)  return '#15803d'
  if (pct <= 0.35) return '#A07828'
  return '#dc2626'
}
