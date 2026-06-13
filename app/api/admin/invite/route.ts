import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const OWNER_EMAIL = 'thebahrainchef@gmail.com'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createAdminClient() as any
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => null)
  const { email, full_name, role, venue_ids } = body ?? {}

  if (!email || !role) return NextResponse.json({ error: 'email and role are required' }, { status: 400 })
  if (!['manager', 'chef', 'staff'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { data, error } = await sb.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: full_name ?? email.split('@')[0],
      role,
      venue_ids: venue_ids ?? null,
      invited_by: user.id,
    },
    redirectTo: `${siteUrl}/auth/callback`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, user: data?.user })
}
