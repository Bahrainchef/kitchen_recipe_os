import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!body?.raw_ingredient_name?.trim()) return NextResponse.json({ error: 'raw_ingredient_name required' }, { status: 400 })
  if (body.price_per_pack == null) return NextResponse.json({ error: 'price_per_pack required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try { supabase = createAdminClient() } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }

  const packSize = body.pack_size ? Number(body.pack_size) : null
  const costPerBase = packSize && packSize > 0 ? Number(body.price_per_pack) / packSize : null

  const { data, error } = await supabase
    .from('supplier_items')
    .insert({
      supplier_price_list_id: id,
      raw_ingredient_name: body.raw_ingredient_name.trim(),
      brand: body.brand?.trim() ?? null,
      pack_size: packSize,
      pack_unit: body.pack_unit?.trim() ?? null,
      price_per_pack: Number(body.price_per_pack),
      currency: body.currency ?? 'BHD',
      cost_per_base_unit: costPerBase,
      base_unit: body.base_unit?.trim() ?? null,
      ingredient_master_id: body.ingredient_master_id ?? null,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try { supabase = createAdminClient() } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }

  const updates: Record<string, unknown> = {}
  if (body.ingredient_master_id !== undefined) updates.ingredient_master_id = body.ingredient_master_id

  const { data, error } = await supabase
    .from('supplier_items')
    .update(updates)
    .eq('id', body.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
