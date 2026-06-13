'use client'

import { useState, useMemo, useCallback } from 'react'
import type { SupplierPriceList, SupplierItem } from '@/lib/types/database.types'

interface IngredientMasterSlim {
  id: string
  canonical_name: string
  category: string
  default_unit: string | null
}

interface SupplierWithItems extends SupplierPriceList {
  items: SupplierItem[]
}

interface Props {
  suppliers: SupplierWithItems[]
  ingredientMaster: IngredientMasterSlim[]
}

const COUNTRY_FLAG: Record<string, string> = { BH: '🇧🇭', SA: '🇸🇦' }
const CURRENCIES = ['BHD', 'SAR', 'USD', 'EUR']

function fmt(n: number | null | undefined, dp = 3) {
  return n == null ? '—' : n.toFixed(dp)
}

// ─── Add Supplier Form ────────────────────────────────────────────────────────

interface AddSupplierFormProps {
  onSaved: (supplier: SupplierWithItems) => void
  onCancel: () => void
}

function AddSupplierForm({ onSaved, onCancel }: AddSupplierFormProps) {
  const [name, setName] = useState('')
  const [country, setCountry] = useState<'BH' | 'SA' | ''>('')
  const [currency, setCurrency] = useState('BHD')
  const [validFrom, setValidFrom] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(async () => {
    if (!name.trim()) { setError('Supplier name is required'); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_name: name.trim(), country_code: country || null, currency, valid_from: validFrom || null, valid_until: validUntil || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      onSaved({ ...data, items: [] })
    } catch (e) { setError(String(e)) } finally { setSaving(false) }
  }, [name, country, currency, validFrom, validUntil, onSaved])

  const inputStyle = { border: '1px solid rgba(26,23,20,0.15)', background: '#FFFFFF', color: '#1A1714', outline: 'none', borderRadius: 8 }

  return (
    <div className="rounded-card p-5 mb-6" style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.09)' }}>
      <h3 className="font-fraunces text-[15px] text-[#1A1714] mb-4">Add Supplier</h3>
      <div className="grid grid-cols-1 tablet:grid-cols-3 gap-3 mb-3">
        <div className="tablet:col-span-3 flex flex-col gap-1">
          <label className="text-[11px] font-semibold tracking-wide uppercase text-[#7A7470]">Supplier Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mubarak Foods" className="px-3 py-2 text-[13px]" style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold tracking-wide uppercase text-[#7A7470]">Country</label>
          <select value={country} onChange={e => setCountry(e.target.value as 'BH' | 'SA' | '')} className="px-3 py-2 text-[13px]" style={inputStyle}>
            <option value="">— Any —</option>
            <option value="BH">🇧🇭 Bahrain</option>
            <option value="SA">🇸🇦 Saudi Arabia</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold tracking-wide uppercase text-[#7A7470]">Currency</label>
          <select value={currency} onChange={e => setCurrency(e.target.value)} className="px-3 py-2 text-[13px]" style={inputStyle}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold tracking-wide uppercase text-[#7A7470]">Valid From</label>
          <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className="px-3 py-2 text-[13px]" style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold tracking-wide uppercase text-[#7A7470]">Valid Until</label>
          <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="px-3 py-2 text-[13px]" style={inputStyle} />
        </div>
      </div>
      {error && <p className="text-[12px] text-[#dc2626] mb-3">{error}</p>}
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-40" style={{ background: '#1A1714', color: '#FFFFFF' }}>
          {saving ? 'Saving…' : 'Save Supplier'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-70" style={{ background: 'rgba(26,23,20,0.06)', color: '#4A4540' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Items panel ──────────────────────────────────────────────────────────────

interface ItemsPanelProps {
  supplier: SupplierWithItems
  ingredientMaster: IngredientMasterSlim[]
  onBack: () => void
  onItemAdded: (item: SupplierItem) => void
  onItemLinked: (item: SupplierItem) => void
}

function ItemsPanel({ supplier, ingredientMaster, onBack, onItemAdded, onItemLinked }: ItemsPanelProps) {
  const [search, setSearch] = useState('')
  const [showAddRow, setShowAddRow] = useState(false)
  const [newRow, setNewRow] = useState({ name: '', brand: '', pack_size: '', pack_unit: '', price: '' })
  const [addingRow, setAddingRow] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [linkValue, setLinkValue] = useState('')

  const masterByName = useMemo(() => {
    const m = new Map<string, IngredientMasterSlim>()
    for (const ing of ingredientMaster) m.set(ing.id, ing)
    return m
  }, [ingredientMaster])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return supplier.items.filter(i => !q || i.raw_ingredient_name.toLowerCase().includes(q) || (i.brand ?? '').toLowerCase().includes(q))
  }, [supplier.items, search])

  const unlinked = supplier.items.filter(i => !i.ingredient_master_id).length
  const linked = supplier.items.length - unlinked

  const addItem = useCallback(async () => {
    if (!newRow.name.trim()) { setAddError('Ingredient name required'); return }
    if (!newRow.price) { setAddError('Price required'); return }
    setAddingRow(true); setAddError(null)
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_ingredient_name: newRow.name.trim(), brand: newRow.brand || null, pack_size: newRow.pack_size ? Number(newRow.pack_size) : null, pack_unit: newRow.pack_unit || null, price_per_pack: Number(newRow.price), currency: supplier.currency }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      onItemAdded(data)
      setNewRow({ name: '', brand: '', pack_size: '', pack_unit: '', price: '' })
      setShowAddRow(false)
    } catch (e) { setAddError(String(e)) } finally { setAddingRow(false) }
  }, [newRow, supplier.id, supplier.currency, onItemAdded])

  const linkItem = useCallback(async (itemId: string, masterId: string) => {
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, ingredient_master_id: masterId || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      onItemLinked(data)
      setLinkingId(null)
      setLinkValue('')
    } catch (e) { console.error(e) }
  }, [supplier.id, onItemLinked])

  const inputStyle = { border: '1px solid rgba(26,23,20,0.15)', background: '#FFFFFF', color: '#1A1714', outline: 'none', borderRadius: 6 }
  const colGrid = '1fr 100px 80px 80px 90px 110px 200px 90px'

  return (
    <div className="mt-6">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] transition-opacity hover:opacity-70" style={{ color: '#4A4540' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L4 7l5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            All suppliers
          </button>
          <span style={{ color: 'rgba(26,23,20,0.20)' }}>·</span>
          <h2 className="font-fraunces text-[17px] text-[#1A1714]">{supplier.supplier_name}</h2>
          <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'rgba(26,23,20,0.05)', color: '#7A7470' }}>{supplier.currency}</span>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#7A7470]">
          <span className="font-medium" style={{ color: '#15803d' }}>{linked} linked</span>
          <span>·</span>
          {unlinked > 0 && <span style={{ color: '#7A4500' }}>{unlinked} unlinked</span>}
          {unlinked === 0 && <span>all linked</span>}
        </div>
      </div>

      {/* Search + Add button */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 max-w-sm flex items-center gap-2 px-3 py-2 rounded-lg text-[13px]" style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.12)' }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="#9A9490" strokeWidth="1.3" /><path d="M8.5 8.5l3 3" stroke="#9A9490" strokeWidth="1.3" strokeLinecap="round" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="flex-1 bg-transparent outline-none text-[#1A1714] placeholder-[#9A9490]" />
        </div>
        <button onClick={() => setShowAddRow(v => !v)} className="px-3 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80" style={{ background: '#1A1714', color: '#FFFFFF' }}>
          + Add Item
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-card" style={{ border: '1px solid rgba(26,23,20,0.09)' }}>
        <div style={{ minWidth: 900, background: '#FFFFFF' }}>
          {/* Header */}
          <div className="grid text-[11px] font-semibold tracking-[0.08em] uppercase text-[#7A7470] px-5 py-2.5 gap-3" style={{ background: 'rgba(26,23,20,0.03)', borderBottom: '1px solid rgba(26,23,20,0.07)', gridTemplateColumns: colGrid }}>
            <span>Ingredient</span><span>Brand</span><span>Pack Size</span><span>Unit</span>
            <span className="text-right">Price/Pack</span><span className="text-right">Cost/Base</span>
            <span>Linked To</span><span>Actions</span>
          </div>

          {/* Add row */}
          {showAddRow && (
            <div className="grid items-center px-5 py-3 gap-3" style={{ gridTemplateColumns: colGrid, background: 'rgba(200,151,58,0.04)', borderBottom: '1px solid rgba(26,23,20,0.07)' }}>
              <input value={newRow.name} onChange={e => setNewRow(p => ({ ...p, name: e.target.value }))} placeholder="Ingredient name *" className="px-2 py-1.5 text-[12px]" style={inputStyle} />
              <input value={newRow.brand} onChange={e => setNewRow(p => ({ ...p, brand: e.target.value }))} placeholder="Brand" className="px-2 py-1.5 text-[12px]" style={inputStyle} />
              <input value={newRow.pack_size} onChange={e => setNewRow(p => ({ ...p, pack_size: e.target.value }))} placeholder="e.g. 1000" type="number" className="px-2 py-1.5 text-[12px]" style={inputStyle} />
              <input value={newRow.pack_unit} onChange={e => setNewRow(p => ({ ...p, pack_unit: e.target.value }))} placeholder="gr / ml" className="px-2 py-1.5 text-[12px]" style={inputStyle} />
              <input value={newRow.price} onChange={e => setNewRow(p => ({ ...p, price: e.target.value }))} placeholder="0.000 *" type="number" step="0.001" className="px-2 py-1.5 text-[12px] text-right" style={inputStyle} />
              <span className="text-[12px] text-[#7A7470] text-right">
                {newRow.pack_size && newRow.price ? (Number(newRow.price) / Number(newRow.pack_size)).toFixed(5) : '—'}
              </span>
              <span className="text-[12px] text-[#7A7470]">—</span>
              <div className="flex gap-1.5">
                <button onClick={addItem} disabled={addingRow} className="text-[11px] font-semibold px-2 py-1 rounded transition-opacity hover:opacity-80 disabled:opacity-40" style={{ background: '#1A1714', color: '#FFFFFF' }}>
                  {addingRow ? '…' : 'Save'}
                </button>
                <button onClick={() => { setShowAddRow(false); setAddError(null) }} className="text-[11px] px-2 py-1 rounded" style={{ background: 'rgba(26,23,20,0.06)', color: '#4A4540' }}>✕</button>
              </div>
            </div>
          )}
          {addError && <div className="px-5 py-2 text-[12px] text-[#dc2626]" style={{ borderBottom: '1px solid rgba(26,23,20,0.06)' }}>{addError}</div>}

          {/* Rows */}
          <div className="divide-y" style={{ borderColor: 'rgba(26,23,20,0.06)' }}>
            {filtered.length === 0 && (
              <div className="px-5 py-8 text-center text-[13px] text-[#7A7470]">
                {search ? 'No items match your search.' : 'No items yet. Use "+ Add Item" to start.'}
              </div>
            )}
            {filtered.map(item => {
              const master = item.ingredient_master_id ? masterByName.get(item.ingredient_master_id) : null
              const isLinking = linkingId === item.id
              return (
                <div key={item.id} className="grid items-center px-5 py-3 gap-3" style={{ gridTemplateColumns: colGrid, background: '#FFFFFF' }}>
                  <div className="text-[13px] text-[#1A1714] font-medium truncate" title={item.raw_ingredient_name}>{item.raw_ingredient_name}</div>
                  <div className="text-[12px] text-[#7A7470] truncate">{item.brand ?? '—'}</div>
                  <div className="text-[12px] text-[#4A4540]">{item.pack_size ?? '—'}</div>
                  <div className="text-[12px] text-[#4A4540]">{item.pack_unit ?? '—'}</div>
                  <div className="text-[12px] text-[#1A1714] text-right font-mono">{fmt(item.price_per_pack)}</div>
                  <div className="text-[12px] text-[#4A4540] text-right font-mono">{fmt(item.cost_per_base_unit, 5)}</div>

                  {/* Linked To */}
                  <div>
                    {isLinking ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={linkValue}
                          onChange={e => setLinkValue(e.target.value)}
                          className="flex-1 text-[11px] px-2 py-1 rounded"
                          style={{ border: '1px solid rgba(26,23,20,0.15)', background: '#FFFFFF', color: '#1A1714', outline: 'none' }}
                        >
                          <option value="">— Unlink —</option>
                          {ingredientMaster.map(m => (
                            <option key={m.id} value={m.id}>{m.canonical_name}</option>
                          ))}
                        </select>
                        <button onClick={() => linkItem(item.id, linkValue)} className="text-[10px] font-semibold px-1.5 py-1 rounded" style={{ background: '#1A1714', color: '#FFFFFF' }}>✓</button>
                        <button onClick={() => { setLinkingId(null); setLinkValue('') }} className="text-[10px] px-1.5 py-1 rounded" style={{ background: 'rgba(26,23,20,0.06)', color: '#4A4540' }}>✕</button>
                      </div>
                    ) : master ? (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded truncate block max-w-full" style={{ background: 'rgba(22,163,74,0.10)', color: '#15803d' }} title={master.canonical_name}>
                        {master.canonical_name}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ background: 'rgba(155,90,0,0.10)', color: '#7A4500' }}>
                        ⚠ Not linked
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => { setLinkingId(item.id); setLinkValue(item.ingredient_master_id ?? '') }}
                    className="text-[11px] font-medium px-2 py-1 rounded transition-opacity hover:opacity-70"
                    style={{ background: 'rgba(26,23,20,0.06)', color: '#4A4540' }}
                  >
                    {master ? 'Re-link' : 'Link'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Supplier card ────────────────────────────────────────────────────────────

interface SupplierCardProps {
  supplier: SupplierWithItems
  onViewItems: () => void
}

function SupplierCard({ supplier, onViewItems }: SupplierCardProps) {
  const total = supplier.items.length
  const linked = supplier.items.filter(i => i.ingredient_master_id).length
  const linkedPct = total > 0 ? Math.round((linked / total) * 100) : 0
  const isExpired = supplier.valid_until ? new Date(supplier.valid_until) < new Date() : false

  return (
    <div className="rounded-card p-5 flex flex-col gap-3" style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.09)' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-fraunces text-[16px] text-[#1A1714]">{supplier.supplier_name}</h3>
            {supplier.country_code && (
              <span className="text-[18px] leading-none">{COUNTRY_FLAG[supplier.country_code] ?? '🌍'}</span>
            )}
            {isExpired && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(155,90,0,0.10)', color: '#7A4500' }}>⚠ Expired</span>
            )}
            {!supplier.is_active && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(107,114,128,0.10)', color: '#374151' }}>Inactive</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(26,23,20,0.06)', color: '#4A4540' }}>{supplier.currency}</span>
            {supplier.valid_from && <span className="text-[11px] text-[#7A7470]">from {supplier.valid_from}</span>}
            {supplier.valid_until && <span className="text-[11px] text-[#7A7470]">until {supplier.valid_until}</span>}
          </div>
        </div>
        <div
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold"
          style={{ background: 'rgba(26,23,20,0.06)', color: '#1A1714' }}
        >
          {supplier.supplier_name[0].toUpperCase()}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-[13px]">
        <span><strong className="text-[#1A1714]">{total}</strong> <span className="text-[#7A7470]">items</span></span>
        <span><strong style={{ color: '#15803d' }}>{linked}</strong> <span className="text-[#7A7470]">linked</span></span>
        {total - linked > 0 && (
          <span><strong style={{ color: '#7A4500' }}>{total - linked}</strong> <span className="text-[#7A7470]">unlinked</span></span>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div>
          <div className="flex justify-between text-[11px] text-[#7A7470] mb-1">
            <span>Linked to ingredient master</span>
            <span>{linkedPct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(26,23,20,0.08)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${linkedPct}%`, background: '#4ecdc4' }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onViewItems}
          className="flex-1 px-3 py-2 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#1A1714', color: '#FFFFFF' }}
        >
          View {total} items →
        </button>
        <button
          disabled
          title="CSV upload coming soon"
          className="px-3 py-2 rounded-lg text-[13px] font-semibold opacity-35 cursor-not-allowed"
          style={{ background: 'rgba(26,23,20,0.06)', color: '#4A4540', border: '1px solid rgba(26,23,20,0.10)' }}
        >
          Upload CSV
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SuppliersClient({ suppliers: initialSuppliers, ingredientMaster }: Props) {
  const [suppliers, setSuppliers] = useState<SupplierWithItems[]>(initialSuppliers)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedSupplier = useMemo(() => suppliers.find(s => s.id === selectedId) ?? null, [suppliers, selectedId])

  const totalItems = suppliers.reduce((s, v) => s + v.items.length, 0)
  const unlinkedItems = suppliers.reduce((s, v) => s + v.items.filter(i => !i.ingredient_master_id).length, 0)

  const onSupplierSaved = useCallback((s: SupplierWithItems) => {
    setSuppliers(prev => [...prev, s])
    setShowAddForm(false)
  }, [])

  const onItemAdded = useCallback((supplierId: string, item: SupplierItem) => {
    setSuppliers(prev => prev.map(s => s.id === supplierId ? { ...s, items: [...s.items, item] } : s))
  }, [])

  const onItemLinked = useCallback((supplierId: string, item: SupplierItem) => {
    setSuppliers(prev => prev.map(s => s.id === supplierId
      ? { ...s, items: s.items.map(i => i.id === item.id ? item : i) }
      : s
    ))
  }, [])

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-3 flex-wrap mb-6">
        {[
          { label: 'suppliers', value: suppliers.length, color: '#1A1714' },
          { label: 'total items', value: totalItems, color: '#1A1714' },
          { label: 'unlinked', value: unlinkedItems, color: unlinkedItems > 0 ? '#7A4500' : '#15803d' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px]" style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.09)' }}>
            <span className="font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
            <span className="text-[#7A7470]">{s.label}</span>
          </div>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowAddForm(v => !v)}
          className="px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-opacity hover:opacity-80"
          style={{ background: '#1A1714', color: '#FFFFFF' }}
        >
          + Add Supplier
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddSupplierForm onSaved={onSupplierSaved} onCancel={() => setShowAddForm(false)} />
      )}

      {/* Items panel or supplier grid */}
      {selectedSupplier ? (
        <ItemsPanel
          supplier={selectedSupplier}
          ingredientMaster={ingredientMaster}
          onBack={() => setSelectedId(null)}
          onItemAdded={item => onItemAdded(selectedSupplier.id, item)}
          onItemLinked={item => onItemLinked(selectedSupplier.id, item)}
        />
      ) : (
        <>
          {suppliers.length === 0 ? (
            <div className="rounded-card p-10 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(26,23,20,0.09)' }}>
              <p className="font-fraunces text-[17px] text-[#1A1714] mb-2">No suppliers yet</p>
              <p className="text-[13px] text-[#7A7470]">Add your first supplier to start building price lists.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
              {suppliers.map(s => (
                <SupplierCard key={s.id} supplier={s} onViewItems={() => setSelectedId(s.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
