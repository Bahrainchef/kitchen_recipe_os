'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { logout } from '@/app/login/actions'
import { useTransition } from 'react'

interface Profile {
  full_name: string
  email: string
  role: string
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  chef: 'Chef',
  staff: 'Staff',
}

export function UserNav({ profile }: { profile: Profile | null }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const initials = profile?.full_name?.trim()
    ? profile.full_name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (profile?.email?.[0] ?? 'U').toUpperCase()

  const displayName = profile?.full_name?.split(' ')[0] ?? profile?.email?.split('@')[0] ?? 'User'
  const role = ROLE_LABEL[profile?.role ?? ''] ?? ''

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 group"
        aria-label="User menu"
      >
        {/* Name + role — visible on tablet+ */}
        <div className="hidden tablet:block text-right">
          <p className="text-[12px] font-medium leading-tight" style={{ color: 'rgba(240,244,255,0.85)' }}>
            {displayName}
          </p>
          {role && (
            <p className="text-[10px] leading-tight" style={{ color: 'rgba(240,144,184,0.70)' }}>
              {role}
            </p>
          )}
        </div>
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold select-none transition-opacity group-hover:opacity-85"
          style={{
            background: 'linear-gradient(135deg, #f090b8 0%, #4a90d9 100%)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(240,144,184,0.30)',
          }}
        >
          {initials}
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 rounded-xl overflow-hidden z-50"
          style={{
            background: '#0d2147',
            border: '1px solid rgba(126,184,247,0.18)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.60)',
          }}
        >
          {/* User info header */}
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(126,184,247,0.10)' }}>
            <p className="text-[13px] font-medium truncate" style={{ color: '#f0f4ff' }}>
              {profile?.full_name || displayName}
            </p>
            <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(240,244,255,0.40)' }}>
              {profile?.email}
            </p>
            {role && (
              <span
                className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(240,144,184,0.15)', color: '#f090b8', border: '1px solid rgba(240,144,184,0.22)' }}
              >
                {role}
              </span>
            )}
          </div>

          {/* Links */}
          <div className="py-1.5">
            {profile?.role === 'owner' && (
              <Link
                href="/admin/users"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors hover:bg-white/05"
                style={{ color: 'rgba(240,244,255,0.70)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M1.5 12c0-2.5 2.46-4.5 5.5-4.5s5.5 2 5.5 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Manage users
              </Link>
            )}

            <button
              onClick={() => { setOpen(false); startTransition(() => logout()) }}
              disabled={isPending}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors hover:bg-white/05 disabled:opacity-50"
              style={{ color: 'rgba(240,144,184,0.80)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9.5 5V3a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6.5a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                <path d="M6 7h7M11 5l2 2-2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
