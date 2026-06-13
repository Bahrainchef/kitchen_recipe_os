'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) {
        setError(err.message)
      } else {
        router.replace('/')
      }
    })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#060f24' }}
    >
      <div
        className="w-full max-w-sm mx-5 rounded-2xl p-8"
        style={{
          background: 'rgba(11,31,74,0.80)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(126,184,247,0.18)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.60)',
        }}
      >
        <div className="flex items-center gap-2.5 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #f090b8 0%, #4a90d9 100%)' }}
          >
            <span className="font-fraunces text-[18px] font-bold leading-none text-white">K</span>
          </div>
          <p className="font-fraunces text-[16px] tracking-tight" style={{ color: '#f0f4ff' }}>
            Kitchen Recipe OS
          </p>
        </div>

        <h1 className="font-fraunces text-[22px] mb-2" style={{ color: '#f0f4ff' }}>
          Set your password
        </h1>
        <p className="text-[13px] mb-6" style={{ color: 'rgba(240,244,255,0.50)' }}>
          Choose a strong password for your account.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(['password', 'confirm'] as const).map((field) => (
            <div key={field} className="space-y-1.5">
              <label className="block text-[12px] font-medium" style={{ color: 'rgba(240,244,255,0.60)' }}>
                {field === 'password' ? 'New password' : 'Confirm password'}
              </label>
              <input
                type="password"
                value={field === 'password' ? password : confirm}
                onChange={e => field === 'password' ? setPassword(e.target.value) : setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl text-[14px] outline-none"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(126,184,247,0.20)',
                  color: '#f0f4ff',
                }}
              />
            </div>
          ))}

          {error && (
            <div
              className="px-3.5 py-2.5 rounded-xl text-[13px]"
              style={{ background: 'rgba(220,38,38,0.14)', border: '1px solid rgba(220,38,38,0.25)', color: '#fca5a5' }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-xl text-[14px] font-semibold transition-all hover:opacity-90 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #f090b8 0%, #4a90d9 100%)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(240,144,184,0.35)',
            }}
          >
            {isPending ? 'Saving…' : 'Set password & continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
