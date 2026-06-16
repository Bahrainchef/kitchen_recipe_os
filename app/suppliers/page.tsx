import { getAllVenues, getSupplierPriceListsWithItems, getIngredientMasterWithUsage } from '@/lib/supabase/queries'
import { SuppliersClient } from '@/components/SuppliersClient'
import { ActionBar } from '@/components/ActionBar'

export default async function SuppliersPage() {
  const [suppliers, ingredients] = await Promise.all([
    getSupplierPriceListsWithItems(),
    getIngredientMasterWithUsage(),
  ])

  // Slim down ingredients to just what supplier linking needs
  const ingredientMaster = ingredients.map(i => ({
    id: i.id,
    canonical_name: i.canonical_name,
    category: i.category ?? '',
    default_unit: i.default_unit,
  }))

  return (
    <div className="min-h-screen bg-[#F8F4EE]">
      <ActionBar backLabel="Dashboard" backHref="/" />
      <main className="max-w-[1200px] mx-auto px-5 tablet:px-8 py-8 tablet:py-10">
        <div className="mb-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-1.5 text-[#7A7470]">
            Kitchen Recipe OS
          </p>
          <h1 className="font-fraunces text-[32px] tablet:text-[38px] text-[#1A1714] leading-none mb-2">
            Supplier Prices
          </h1>
          <p className="text-[#4A4540] text-[14px] leading-relaxed max-w-xl">
            Manage supplier price lists and link ingredients to the master library for automatic food cost calculation.
          </p>
        </div>
        <SuppliersClient suppliers={suppliers} ingredientMaster={ingredientMaster} />
      </main>
    </div>
  )
}
