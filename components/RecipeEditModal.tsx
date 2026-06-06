'use client'

import { useState } from 'react'
import type { RecipeIngredient, RecipeStep } from '@/lib/types/database.types'

interface IngRow {
  _key: string
  group_name: string
  quantity: string
  unit: string
  ingredient_name: string
  preparation_note: string
}

interface StepRow {
  _key: string
  instruction: string
}

interface InitialRecipe {
  title: string
  description: string | null
  portion_size: number | null
  selling_price: number | null
  status: string
}

interface Props {
  recipeId: string
  recipe: InitialRecipe
  ingredients: RecipeIngredient[]
  steps: RecipeStep[]
  themeColor: string
  onClose: () => void
  onSaved: () => void
}

let keyCounter = 0
const nextKey = () => String(++keyCounter)

function toIngRow(ing: RecipeIngredient): IngRow {
  return {
    _key: ing.id ?? nextKey(),
    group_name: ing.group_name ?? '',
    quantity: ing.quantity != null ? String(ing.quantity) : '',
    unit: ing.unit ?? '',
    ingredient_name: ing.ingredient_name,
    preparation_note: ing.preparation_note ?? '',
  }
}

function toStepRow(step: RecipeStep): StepRow {
  return { _key: step.id, instruction: step.instruction }
}

type Tab = 'info' | 'ingredients' | 'method'

export function RecipeEditModal({ recipeId, recipe, ingredients, steps, themeColor, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('info')
  const [title, setTitle] = useState(recipe.title)
  const [description, setDescription] = useState(recipe.description ?? '')
  const [portionSize, setPortionSize] = useState(recipe.portion_size != null ? String(recipe.portion_size) : '')
  const [sellingPrice, setSellingPrice] = useState(recipe.selling_price != null ? String(recipe.selling_price) : '')
  const [status, setStatus] = useState(recipe.status)
  const [ings, setIngs] = useState<IngRow[]>(() => ingredients.map(toIngRow))
  const [stepRows, setStepRows] = useState<StepRow[]>(() => steps.map(toStepRow))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const updateIng = (key: string, field: keyof IngRow, value: string) =>
    setIngs(prev => prev.map(r => r._key === key ? { ...r, [field]: value } : r))

  const deleteIng = (key: string) =>
    setIngs(prev => prev.filter(r => r._key !== key))

  const addIng = () =>
    setIngs(prev => [...prev, { _key: nextKey(), group_name: '', quantity: '', unit: '', ingredient_name: '', preparation_note: '' }])

  const updateStep = (key: string, value: string) =>
    setStepRows(prev => prev.map(r => r._key === key ? { ...r, instruction: value } : r))

  const deleteStep = (key: string) =>
    setStepRows(prev => prev.filter(r => r._key !== key))

  const moveStep = (key: string, dir: -1 | 1) => {
    setStepRows(prev => {
      const idx = prev.findIndex(r => r._key === key)
      if (idx < 0) return prev
      const next = [...prev]
      const swapIdx = idx + dir
      if (swapIdx < 0 || swapIdx >= next.length) return prev
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      return next
    })
  }

  const addStep = () =>
    setStepRows(prev => [...prev, { _key: nextKey(), instruction: '' }])

  const save = async () => {
    if (!title.trim()) { setSaveError('Title is required'); setTab('info'); return }
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch(`/api/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          portion_size: portionSize ? parseFloat(portionSize) : null,
          selling_price: sellingPrice ? parseFloat(sellingPrice) : null,
          status,
          ingredients: ings
            .filter(r => r.ingredient_name.trim())
            .map(r => ({
              group_name: r.group_name.trim() || null,
              quantity: r.quantity ? parseFloat(r.quantity) : null,
              unit: r.unit.trim() || null,
              ingredient_name: r.ingredient_name.trim(),
              preparation_note: r.preparation_note.trim() || null,
            })),
          steps: stepRows
            .filter(r => r.instruction.trim())
            .map(r => ({ instruction: r.instruction.trim() })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      onSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e))
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-2.5 py-1.5 rounded-lg text-[13px] outline-none transition-colors'
  const inputStyle = {
    border: '1px solid rgba(126,184,247,0.16)',
    background: '#0B1F4A',
    color: '#f0f4ff',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60"
        style={{ backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
        style={{
          width: 'min(680px, 100vw)',
          background: '#122347',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.50)',
          borderLeft: '1px solid rgba(126,184,247,0.10)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(126,184,247,0.12)', background: '#1A2F5E' }}
        >
          <div>
            <h2 className="font-fraunces text-[20px] text-text-primary leading-none">Edit Recipe</h2>
            <p className="text-text-muted text-[12px] mt-0.5 truncate max-w-[400px]">{recipe.title}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
            style={{ color: 'rgba(240,244,255,0.50)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div
          className="flex gap-1 px-6 py-2.5 shrink-0"
          style={{ borderBottom: '1px solid rgba(126,184,247,0.08)', background: '#1A2F5E' }}
        >
          {(['info', 'ingredients', 'method'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3.5 py-1.5 rounded-full text-[12px] font-semibold capitalize transition-colors"
              style={tab === t
                ? { background: themeColor, color: '#FFFFFF' }
                : { background: 'rgba(126,184,247,0.08)', color: 'rgba(240,244,255,0.55)' }
              }
            >
              {t === 'info' ? 'Basic Info' : t === 'ingredients' ? `Ingredients (${ings.length})` : `Method (${stepRows.length})`}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Info tab ── */}
          {tab === 'info' && (
            <div className="space-y-4 max-w-lg">
              <FormField label="Title *">
                <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} style={inputStyle} />
              </FormField>
              <FormField label="Description">
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className={inputCls}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Portion size">
                  <input type="number" value={portionSize} onChange={e => setPortionSize(e.target.value)} className={inputCls} style={inputStyle} min={1} />
                </FormField>
                <FormField label="Selling price">
                  <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} className={inputCls} style={inputStyle} step={0.001} min={0} />
                </FormField>
              </div>
              <FormField label="Status">
                <select value={status} onChange={e => setStatus(e.target.value)} className={inputCls} style={inputStyle}>
                  <option value="draft">Draft</option>
                  <option value="pending_review">Pending review</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </FormField>
            </div>
          )}

          {/* ── Ingredients tab ── */}
          {tab === 'ingredients' && (
            <div>
              <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-text-muted mb-3">
                Qty · Unit · Ingredient name · Prep note · Group
              </div>
              <div className="space-y-1.5">
                {ings.map((row) => (
                  <div key={row._key} className="flex gap-1.5 items-start">
                    <input
                      type="number"
                      value={row.quantity}
                      onChange={e => updateIng(row._key, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="px-2 py-1.5 rounded-lg text-[12px] outline-none tabular-nums"
                      style={{ ...inputStyle, width: 64, flexShrink: 0 }}
                    />
                    <input
                      value={row.unit}
                      onChange={e => updateIng(row._key, 'unit', e.target.value)}
                      placeholder="unit"
                      className="px-2 py-1.5 rounded-lg text-[12px] outline-none"
                      style={{ ...inputStyle, width: 60, flexShrink: 0 }}
                    />
                    <input
                      value={row.ingredient_name}
                      onChange={e => updateIng(row._key, 'ingredient_name', e.target.value)}
                      placeholder="Ingredient name *"
                      className="px-2 py-1.5 rounded-lg text-[12px] outline-none flex-1 min-w-0"
                      style={inputStyle}
                    />
                    <input
                      value={row.preparation_note}
                      onChange={e => updateIng(row._key, 'preparation_note', e.target.value)}
                      placeholder="prep note"
                      className="px-2 py-1.5 rounded-lg text-[12px] outline-none"
                      style={{ ...inputStyle, width: 100, flexShrink: 0 }}
                    />
                    <input
                      value={row.group_name}
                      onChange={e => updateIng(row._key, 'group_name', e.target.value)}
                      placeholder="group"
                      className="px-2 py-1.5 rounded-lg text-[12px] outline-none"
                      style={{ ...inputStyle, width: 90, flexShrink: 0 }}
                    />
                    <button
                      onClick={() => deleteIng(row._key)}
                      className="w-7 h-7 mt-0.5 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-[rgba(220,38,38,0.12)]"
                      style={{ color: 'rgba(240,244,255,0.35)' }}
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addIng}
                className="mt-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors hover:opacity-80"
                style={{ background: 'rgba(126,184,247,0.08)', color: 'rgba(240,244,255,0.70)', border: '1px solid rgba(126,184,247,0.12)' }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add ingredient
              </button>
            </div>
          )}

          {/* ── Method tab ── */}
          {tab === 'method' && (
            <div>
              <div className="space-y-2">
                {stepRows.map((row, i) => (
                  <div key={row._key} className="flex gap-2 items-start">
                    <div
                      className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold leading-none mt-1.5"
                      style={{ background: themeColor, color: '#FFFFFF' }}
                    >
                      {i + 1}
                    </div>
                    <textarea
                      value={row.instruction}
                      onChange={e => updateStep(row._key, e.target.value)}
                      rows={2}
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-[13px] outline-none"
                      style={{ ...inputStyle, resize: 'vertical' }}
                    />
                    <div className="flex flex-col gap-0.5 shrink-0 mt-1">
                      <button
                        onClick={() => moveStep(row._key, -1)}
                        disabled={i === 0}
                        className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-white/10 disabled:opacity-25"
                        style={{ color: 'rgba(240,244,255,0.45)' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 7l3-4 3 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveStep(row._key, 1)}
                        disabled={i === stepRows.length - 1}
                        className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-white/10 disabled:opacity-25"
                        style={{ color: 'rgba(240,244,255,0.45)' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 3l3 4 3-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={() => deleteStep(row._key)}
                      className="w-6 h-6 mt-1.5 flex items-center justify-center rounded-full shrink-0 transition-colors hover:bg-[rgba(220,38,38,0.12)]"
                      style={{ color: 'rgba(240,244,255,0.35)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                ))}
                {stepRows.length === 0 && (
                  <p className="text-text-muted text-[13px] py-4">No steps yet — click below to add.</p>
                )}
              </div>
              <button
                onClick={addStep}
                className="mt-3 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors hover:opacity-80"
                style={{ background: 'rgba(126,184,247,0.08)', color: 'rgba(240,244,255,0.70)', border: '1px solid rgba(126,184,247,0.12)' }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M5.5 1v9M1 5.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add step
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 flex items-center justify-between gap-3 px-6 py-4"
          style={{ borderTop: '1px solid rgba(126,184,247,0.12)', background: '#1A2F5E' }}
        >
          <div className="flex-1 min-w-0">
            {saveError && (
              <p className="text-[12px] text-[#f87171] truncate">{saveError}</p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="btn-ghost text-[13px] font-medium disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-opacity disabled:opacity-60"
            style={{ background: themeColor, color: '#FFFFFF' }}
          >
            {saving && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            )}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold tracking-[0.08em] uppercase text-text-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}
