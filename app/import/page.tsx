import { getAllVenues } from '@/lib/supabase/queries'
import { ImportClient } from '@/components/ImportClient'
import { ActionBar } from '@/components/ActionBar'

export default async function ImportPage() {
  const venues = await getAllVenues()

  return (
    <div className="min-h-screen bg-[#F8F4EE]">
      <ActionBar backLabel="Dashboard" backHref="/" />

      <main className="max-w-[1100px] mx-auto px-5 tablet:px-8 py-8 tablet:py-10">
        {/* Heading */}
        <div className="mb-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-1.5 text-[#7A7470]">
            Kitchen Recipe OS
          </p>
          <h1 className="font-fraunces text-[32px] tablet:text-[38px] text-[#1A1714] leading-none mb-2">
            Import Recipes
          </h1>
          <p className="text-[#4A4540] text-[14px] leading-relaxed max-w-xl">
            Upload your kitchen workbook (.xlsx). Each worksheet tab becomes one recipe.
            Review the parsed recipes before publishing to the database.
          </p>
        </div>

        <ImportClient venues={venues} />
      </main>
    </div>
  )
}
