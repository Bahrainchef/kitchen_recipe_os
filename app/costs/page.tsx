import { getAllVenues, getRecipeCostData } from '@/lib/supabase/queries'
import { CostsClient } from '@/components/CostsClient'
import { ActionBar } from '@/components/ActionBar'

export default async function CostsPage() {
  const [venues, recipes] = await Promise.all([getAllVenues(), getRecipeCostData()])

  const venueSummaries = venues.map(v => {
    const vRecipes = recipes.filter(r => r.venue_id === v.id)
    const costed = vRecipes.filter(r => r.cost_percentage != null)
    const avgCostPct = costed.length > 0
      ? costed.reduce((sum, r) => sum + (r.cost_percentage ?? 0), 0) / costed.length
      : null
    return {
      venue_id: v.id,
      venue_name: v.name,
      venue_short_name: v.short_name,
      theme_color: v.theme_color,
      recipe_count: vRecipes.length,
      costed_count: costed.length,
      avg_cost_pct: avgCostPct,
      green_count: costed.filter(r => (r.cost_percentage ?? 0) < 0.25).length,
      amber_count: costed.filter(r => { const p = r.cost_percentage ?? 0; return p >= 0.25 && p <= 0.35 }).length,
      red_count: costed.filter(r => (r.cost_percentage ?? 0) > 0.35).length,
    }
  })

  return (
    <div className="min-h-screen bg-[#F8F4EE]">
      <ActionBar backLabel="Dashboard" backHref="/" />
      <main className="max-w-[1200px] mx-auto px-5 tablet:px-8 py-8 tablet:py-10">
        <div className="mb-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-1.5 text-[#7A7470]">
            Kitchen Recipe OS
          </p>
          <h1 className="font-fraunces text-[32px] tablet:text-[38px] text-[#1A1714] leading-none mb-2">
            Food Cost Dashboard
          </h1>
          <p className="text-[#4A4540] text-[14px] leading-relaxed max-w-xl">
            Food cost percentage by venue and recipe. Green under 25%, amber 25–35%, red above 35%.
          </p>
        </div>
        <CostsClient venues={venueSummaries} recipes={recipes} />
      </main>
    </div>
  )
}
