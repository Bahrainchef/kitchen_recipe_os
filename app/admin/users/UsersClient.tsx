'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  email: string
  full_name: string
  role: 'owner' | 'manager' | 'chef' | 'staff'
  status: 'pending' | 'active' | 'disabled'
  venue_ids: string[] | null
  created_at: string
}

interface Venue { id: string; name: string }

const ROLE_COLOR: Record<string, string> = {
  owner:   'rgba(196,92,112,0.20)',
  manager: 'rgba(74,144,217,0.18)',
  chef:    'rgba(78,205,196,0.18)',
  staff:   'rgba(240,244,255,0.08)',
}
const ROLE_TEXT: Record<string, string> = {
  owner:   '#e88fa3',
  manager: '#93c5fd',
  chef:    '#5eead4',
  staff:   'rgba(240,244,255,0.55)',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
      style={{ background: ROLE_COLOR[role] ?? ROLE_COLOR.staff, color: ROLE_TEXT[role] ?? ROLE_TEXT.staff, border: '1px solid currentColor' }}
    >
      {role}
    </span>
  )
}

function Avatar({ name, email }: { name: string; email: string }) {
  const initials = name?.trim()
    ? name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : email[0].toUpperCase()
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center font-fraunces font-semibold text-[13px] shrink-0"
      style={{ background: 'rgba(240,144,184,0.20)', color: '#f090b8', border: '1px solid rgba(240,144,184,0.25)' }}
    >
      {initials}
    </div>
  )
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-fraunces text-[16px]" style={{ color: '#f0f4ff' }}>{title}</h2>
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full tabular-nums"
          style={{ background: 'rgba(126,184,247,0.10)', color: 'rgba(240,244,255,0.50)', border: '1px solid rgba(126,184,247,0.12)' }}
        >
          {count}
        </span>
        <div className="flex-1 h-px" style={{ background: 'rgba(126,184,247,0.08)' }} />
      </div>
      {count === 0 ? (
        <p className="text-[13px]" style={{ color: 'rgba(240,244,255,0.30)' }}>None</p>
      ) : children}
    </div>
  )
}

function ActionBtn({ onClick, label, danger, disabled }: { onClick: () => void; label: string; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all hover:opacity-80 disabled:opacity-30"
      style={{
        background: danger ? 'rgba(220,38,38,0.15)' : 'rgba(126,184,247,0.10)',
        color: danger ? '#fca5a5' : 'rgba(240,244,255,0.65)',
        border: danger ? '1px solid rgba(220,38,38,0.20)' : '1px solid rgba(126,184,247,0.14)',
      }}
    >
      {label}
    </button>
  )
}

function InviteModal({ venues, onClose, onSent }: { venues: Venue[]; onClose: () => void; onSent: () => void }) {
  const [form, setForm] = useState({ email: '', full_name: '', role: 'chef', venue_ids: [] as string[] })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const send = () => {
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed'); return }
      setSuccess(true)
      setTimeout(() => { onSent(); onClose() }, 1500)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.70)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl p-7"
        style={{ background: '#0d2147', border: '1px solid rgba(126,184,247,0.22)', boxShadow: '0 32px 64px rgba(0,0,0,0.70)' }}
      >
        <h3 className="font-fraunces text-[20px] mb-6" style={{ color: '#f0f4ff' }}>Invite team member</h3>

        {success ? (
          <div className="text-center py-6">
            <div className="text-[32px] mb-2">✉️</div>
            <p style={{ color: '#93c5fd' }}>Invite sent to {form.email}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[
              { key: 'email', label: 'Email address', type: 'email', placeholder: 'chef@venue.com' },
              { key: 'full_name', label: 'Full name', type: 'text', placeholder: 'Jane Smith' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(240,244,255,0.55)' }}>{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key as 'email' | 'full_name']}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[14px] outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(126,184,247,0.18)', color: '#f0f4ff' }}
                />
              </div>
            ))}

            <div>
              <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(240,244,255,0.55)' }}>Role</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl text-[14px] outline-none"
                style={{ background: '#0d2147', border: '1px solid rgba(126,184,247,0.18)', color: '#f0f4ff' }}
              >
                <option value="manager">Manager — view + edit recipes</option>
                <option value="chef">Chef — view recipes only</option>
                <option value="staff">Staff — view assigned venue only</option>
              </select>
            </div>

            {form.role === 'staff' && venues.length > 0 && (
              <div>
                <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'rgba(240,244,255,0.55)' }}>
                  Venue access (staff only)
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {venues.map(v => (
                    <label key={v.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.venue_ids.includes(v.id)}
                        onChange={e => setForm(p => ({
                          ...p,
                          venue_ids: e.target.checked ? [...p.venue_ids, v.id] : p.venue_ids.filter(x => x !== v.id)
                        }))}
                        className="rounded"
                      />
                      <span className="text-[13px]" style={{ color: 'rgba(240,244,255,0.70)' }}>{v.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="px-3.5 py-2.5 rounded-xl text-[13px]"
                style={{ background: 'rgba(220,38,38,0.14)', border: '1px solid rgba(220,38,38,0.25)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-medium"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(240,244,255,0.60)' }}
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={isPending || !form.email}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f090b8, #4a90d9)', color: '#fff' }}
              >
                {isPending ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function UsersClient({ profiles, venues }: { profiles: Profile[]; venues: Venue[] }) {
  const router = useRouter()
  const [showInvite, setShowInvite] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const action = (id: string, method: 'PATCH' | 'DELETE', body?: object) =>
    startTransition(async () => {
      const opts: RequestInit = { method }
      if (body) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(body) }
      const res = await fetch(`/api/admin/users/${id}`, opts)
      const data = await res.json()
      if (!res.ok) { showToast(data.error ?? 'Error'); return }
      router.refresh()
    })

  const pending = profiles.filter(p => p.status === 'pending')
  const active = profiles.filter(p => p.status === 'active')
  const disabled = profiles.filter(p => p.status === 'disabled')

  const UserRow = ({ p }: { p: Profile }) => (
    <div
      className="flex items-center gap-4 px-5 py-3.5 rounded-xl"
      style={{ background: '#122347', border: '1px solid rgba(126,184,247,0.08)' }}
    >
      <Avatar name={p.full_name} email={p.email} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-fraunces text-[14px]" style={{ color: '#f0f4ff' }}>{p.full_name || p.email}</span>
          <RoleBadge role={p.role} />
        </div>
        <p className="text-[12px] mt-0.5" style={{ color: 'rgba(240,244,255,0.40)' }}>{p.email}</p>
      </div>
      {p.role !== 'owner' && (
        <div className="flex items-center gap-1.5 shrink-0">
          {p.status === 'pending' && (
            <ActionBtn label="Approve" onClick={() => action(p.id, 'PATCH', { status: 'active' })} disabled={isPending} />
          )}
          {p.status === 'active' && (
            <ActionBtn label="Disable" onClick={() => action(p.id, 'PATCH', { status: 'disabled' })} disabled={isPending} />
          )}
          {p.status === 'disabled' && (
            <ActionBtn label="Reactivate" onClick={() => action(p.id, 'PATCH', { status: 'active' })} disabled={isPending} />
          )}
          <ActionBtn label="Delete" danger onClick={() => {
            if (confirm(`Delete ${p.email}? This cannot be undone.`)) action(p.id, 'DELETE')
          }} disabled={isPending} />
        </div>
      )}
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="font-fraunces text-[28px] tracking-tight" style={{ color: '#f0f4ff' }}>User Management</h1>
          <p className="text-[13px] mt-1" style={{ color: 'rgba(240,244,255,0.45)' }}>
            Invite and manage team access to Kitchen Recipe OS
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #f090b8, #4a90d9)', color: '#fff', boxShadow: '0 4px 16px rgba(240,144,184,0.30)' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Invite team member
        </button>
      </div>

      <Section title="Pending approval" count={pending.length}>
        <div className="space-y-2">{pending.map(p => <UserRow key={p.id} p={p} />)}</div>
      </Section>

      <Section title="Active" count={active.length}>
        <div className="space-y-2">{active.map(p => <UserRow key={p.id} p={p} />)}</div>
      </Section>

      <Section title="Disabled" count={disabled.length}>
        <div className="space-y-2">{disabled.map(p => <UserRow key={p.id} p={p} />)}</div>
      </Section>

      {showInvite && (
        <InviteModal
          venues={venues}
          onClose={() => setShowInvite(false)}
          onSent={() => { router.refresh(); showToast('Invite sent!') }}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-[13px] font-medium"
          style={{ background: '#1a3a6e', border: '1px solid rgba(126,184,247,0.25)', color: '#f0f4ff', boxShadow: '0 8px 32px rgba(0,0,0,0.50)' }}
        >
          {toast}
        </div>
      )}
    </div>
  )
}
