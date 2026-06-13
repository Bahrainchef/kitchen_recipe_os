'use client'

import { useActionState, useState } from 'react'
import { login, forgotPassword } from './actions'

const STORAGE = 'https://vuxpsnjbciyowpkbgwlv.supabase.co/storage/v1/object/public/venue-images'

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 rounded-xl text-[14px] font-semibold transition-all hover:opacity-90 disabled:opacity-60"
      style={{
        background: 'linear-gradient(135deg, #f090b8 0%, #4a90d9 100%)',
        color: '#fff',
        boxShadow: '0 4px 20px rgba(240,144,184,0.35)',
      }}
    >
      {pending ? 'Please wait…' : label}
    </button>
  )
}

function InputField({
  id, label, type, placeholder, required,
}: {
  id: string; label: string; type: string; placeholder: string; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[12px] font-medium" style={{ color: 'rgba(240,244,255,0.60)' }}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(126,184,247,0.20)',
          color: '#f0f4ff',
          caretColor: '#f090b8',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(240,144,184,0.50)'; e.target.style.boxShadow = '0 0 0 3px rgba(240,144,184,0.10)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(126,184,247,0.20)'; e.target.style.boxShadow = 'none' }}
      />
    </div>
  )
}

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [loginState, loginAction, loginPending] = useActionState(login, null)
  const [forgotState, forgotAction, forgotPending] = useActionState(forgotPassword, null)

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: '#060f24' }}
    >
      {/* Background hero image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${STORAGE}/pastry-hub-hero.jpg`}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.18 }}
      />

      {/* Ambient orbs */}
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #f090b8, transparent 70%)', filter: 'blur(80px)', opacity: 0.15 }} />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4a90d9, transparent 70%)', filter: 'blur(80px)', opacity: 0.12 }} />

      {/* Card */}
      <div
        className="relative w-full max-w-sm mx-5 rounded-2xl p-8"
        style={{
          background: 'rgba(11,31,74,0.75)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(126,184,247,0.18)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.60)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #f090b8 0%, #4a90d9 100%)',
              boxShadow: '0 4px 16px rgba(240,144,184,0.40)',
            }}
          >
            <span className="font-fraunces text-[18px] font-bold leading-none text-white">K</span>
          </div>
          <div>
            <p className="font-fraunces text-[16px] tracking-tight leading-tight" style={{ color: '#f0f4ff' }}>
              Kitchen Recipe OS
            </p>
            <p className="text-[11px]" style={{ color: 'rgba(240,244,255,0.40)' }}>
              Team portal — authorised access only
            </p>
          </div>
        </div>

        {/* ── LOGIN FORM ── */}
        {mode === 'login' && (
          <>
            <h1 className="font-fraunces text-[22px] mb-6" style={{ color: '#f0f4ff' }}>
              Sign in
            </h1>

            <form action={loginAction} className="space-y-4">
              <InputField id="email" label="Email address" type="email" placeholder="you@example.com" required />
              <InputField id="password" label="Password" type="password" placeholder="••••••••" required />

              {loginState?.error && (
                <div
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13px]"
                  style={{ background: 'rgba(220,38,38,0.14)', border: '1px solid rgba(220,38,38,0.25)', color: '#fca5a5' }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  {loginState.error}
                </div>
              )}

              <SubmitButton label="Sign in" pending={loginPending} />
            </form>

            <button
              onClick={() => setMode('forgot')}
              className="mt-4 w-full text-center text-[12px] transition-colors hover:opacity-80"
              style={{ color: 'rgba(240,144,184,0.80)' }}
            >
              Forgot password?
            </button>
          </>
        )}

        {/* ── FORGOT PASSWORD ── */}
        {mode === 'forgot' && (
          <>
            <h1 className="font-fraunces text-[22px] mb-2" style={{ color: '#f0f4ff' }}>
              Reset password
            </h1>
            <p className="text-[13px] mb-6" style={{ color: 'rgba(240,244,255,0.50)' }}>
              Enter your email and we&apos;ll send a reset link.
            </p>

            {forgotState?.success ? (
              <div
                className="px-4 py-3 rounded-xl text-[13px] text-center mb-4"
                style={{ background: 'rgba(74,144,217,0.14)', border: '1px solid rgba(74,144,217,0.25)', color: '#93c5fd' }}
              >
                {forgotState.success}
              </div>
            ) : (
              <form action={forgotAction} className="space-y-4">
                <InputField id="email" label="Email address" type="email" placeholder="you@example.com" required />

                {forgotState?.error && (
                  <div
                    className="px-3.5 py-2.5 rounded-xl text-[13px]"
                    style={{ background: 'rgba(220,38,38,0.14)', border: '1px solid rgba(220,38,38,0.25)', color: '#fca5a5' }}
                  >
                    {forgotState.error}
                  </div>
                )}

                <SubmitButton label="Send reset link" pending={forgotPending} />
              </form>
            )}

            <button
              onClick={() => setMode('login')}
              className="mt-4 w-full text-center text-[12px] transition-colors hover:opacity-80"
              style={{ color: 'rgba(240,244,255,0.45)' }}
            >
              ← Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  )
}
