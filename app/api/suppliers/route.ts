import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try { supabase = createAdminClient() } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
  const { data, error } = await supabase.from('supplier_price_lists').select('*').order('supplier_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.supplier_name?.trim()) return NextResponse.json({ error: 'supplier_name required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try { supabase = createAdminClient() } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('supplier_price_lists')
    .insert({
      supplier_name: body.supplier_name.trim(),
      country_code: body.country_code ?? null,
      currency: body.currency ?? 'BHD',
      valid_from: body.valid_from ?? null,
      valid_until: body.valid_until ?? null,
      is_active: true,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
