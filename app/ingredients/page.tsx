import { headers } from 'next/headers'
import { getAllVenues, getIngredientMasterWithUsage, type IngredientWithUsage } from '@/lib/supabase/queries'
import { IngredientsClient } from '@/components/IngredientsClient'
import { ActionBar } from '@/components/ActionBar'

// Simple trigram similarity computed server-side
function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 3 || b.length < 3) return a === b ? 1 : 0
  const trigramsA = new Set<string>()
  const trigramsB = new Set<string>()
  for (let i = 0; i <= a.length - 3; i++) trigramsA.add(a.slice(i, i + 3))
  for (let i = 0; i <= b.length - 3; i++) trigramsB.add(b.slice(i, i + 3))
  let intersection = 0
  for (const t of trigramsA) if (trigramsB.has(t)) intersection++
  return (2 * intersection) / (trigramsA.size + trigramsB.size)
}

function detectDuplicates(ingredients: IngredientWithUsage[]) {
  const pairs: { a: IngredientWithUsage; b: IngredientWithUsage; score: number }[] = []
  for (let i = 0; i < ingredients.length; i++) {
    for (let j = i + 1; j < ingredients.length; j++) {
      const score = trigramSimilarity(
        ingredients[i].canonical_name.toLowerCase(),
        ingredients[j].canonical_name.toLowerCase(),
      )
      if (score >= 0.62) pairs.push({ a: ingredients[i], b: ingredients[j], score })
    }
  }
  return pairs.sort((a, b) => b.score - a.score).slice(0, 12)
}

export default async function IngredientsPage() {
  headers() // force dynamic — prevents any static caching by Next.js/Vercel
  const [ingredients, venues] = await Promise.all([
    getIngredientMasterWithUsage(),
    getAllVenues(),
  ])
  const duplicates = detectDuplicates(ingredients)

  return (
    <div className="min-h-screen bg-[#F8F4EE]">
      <ActionBar backLabel="Dashboard" backHref="/" />
      <main className="max-w-[1200px] mx-auto px-5 tablet:px-8 py-8 tablet:py-10">
        <div className="mb-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-1.5 text-[#7A7470]">
            Kitchen Recipe OS
          </p>
          <h1 className="font-fraunces text-[32px] tablet:text-[38px] text-[#1A1714] leading-none mb-2">
            Ingredient Master
          </h1>
          <p className="text-[#4A4540] text-[14px] leading-relaxed max-w-xl">
            Canonical ingredient library auto-populated from recipe imports. Review, merge duplicates, and assign categories.
          </p>
        </div>
        <IngredientsClient ingredients={ingredients} duplicates={duplicates} venues={venues} />
      </main>
    </div>
  )
}
