import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const OWNER_EMAIL = 'thebahrainchef@gmail.com'

async function requireOwner() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createAdminClient() as any
  const { data: profile } = await sb.from('profiles').select('role, email').eq('id', user.id).single()
  return profile?.role === 'owner' ? sb : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = await requireOwner()
  if (!sb) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Protect permanent owner account
  const { data: target } = await sb.from('profiles').select('email, role').eq('id', id).single()
  if (target?.email === OWNER_EMAIL) {
    return NextResponse.json({ error: 'The owner account cannot be modified.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const { status, role, full_name, venue_ids } = body ?? {}

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status) updates.status = status
  if (role && ['manager', 'chef', 'staff'].includes(role)) updates.role = role
  if (full_name) updates.full_name = full_name
  if (venue_ids !== undefined) updates.venue_ids = venue_ids

  const { error } = await sb.from('profiles').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = await requireOwner()
  if (!sb) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: target } = await sb.from('profiles').select('email').eq('id', id).single()
  if (target?.email === OWNER_EMAIL) {
    return NextResponse.json({ error: 'The owner account cannot be deleted.' }, { status: 403 })
  }

  const { error: authErr } = await sb.auth.admin.deleteUser(id)
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
