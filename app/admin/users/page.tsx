import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ActionBar } from '@/components/ActionBar'
import { UsersClient } from './UsersClient'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createAdminClient() as any
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'owner') redirect('/')

  const [{ data: profiles }, { data: venues }] = await Promise.all([
    sb.from('profiles').select('*').order('created_at', { ascending: true }),
    sb.from('venues').select('id, name').eq('is_active', true).order('sort_order'),
  ])

  return (
    <div className="min-h-screen bg-canvas">
      <ActionBar backLabel="Dashboard" backHref="/" />
      <main className="max-w-[900px] mx-auto px-5 tablet:px-8 py-10">
        <UsersClient profiles={profiles ?? []} venues={venues ?? []} />
      </main>
    </div>
  )
}
