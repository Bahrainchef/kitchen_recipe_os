import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type') as 'invite' | 'recovery' | null
  const next = url.searchParams.get('next') ?? '/'

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(list: { name: string; value: string; options?: Record<string, unknown> }[]) {
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
          )
        },
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL('/login?error=link_expired', request.url))
    }
    const redirectPath = (type === 'invite' || type === 'recovery') ? '/auth/set-password' : next
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      return NextResponse.redirect(new URL('/login?error=link_expired', request.url))
    }
    const redirectPath = (type === 'invite' || type === 'recovery') ? '/auth/set-password' : next
    return NextResponse.redirect(new URL(redirectPath, request.url))
  }

  return NextResponse.redirect(new URL('/login?error=auth_error', request.url))
}
