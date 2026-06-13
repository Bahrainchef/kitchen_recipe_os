import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  const { ids } = await request.json().catch(() => ({}))
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: 'ids array required' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try { supabase = createAdminClient() } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }

  const { error } = await supabase
    .from('ingredient_master')
    .update({ is_reviewed: true, updated_at: new Date().toISOString() })
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: ids.length })
}
