import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { DuplicateMatch } from '@/app/import/actions'

interface CheckItem {
  tab_name: string
  venue_id: string
  title: string
}

export async function POST(request: NextRequest) {
  let checks: CheckItem[]
  try {
    checks = await request.json()
  } catch {
    return NextResponse.json([], { status: 400 })
  }

  if (!Array.isArray(checks) || checks.length === 0) {
    return NextResponse.json([])
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try {
    supabase = createAdminClient()
  } catch {
    return NextResponse.json([])
  }

  const matches: DuplicateMatch[] = []

  // Group by venue to minimise DB queries
  const byVenue = new Map<string, CheckItem[]>()
  for (const c of checks) {
    if (!c.venue_id || !c.title?.trim()) continue
    const list = byVenue.get(c.venue_id) ?? []
    list.push(c)
    byVenue.set(c.venue_id, list)
  }

  for (const [venueId, items] of byVenue) {
    const { data } = await supabase
      .from('recipes')
      .select('id, title')
      .eq('venue_id', venueId)

    const titleMap = new Map<string, { id: string; title: string }>()
    for (const r of data ?? []) {
      titleMap.set((r.title as string).toLowerCase().trim(), { id: r.id, title: r.title })
    }

    for (const item of items) {
      const existing = titleMap.get(item.title.toLowerCase().trim())
      if (existing) {
        matches.push({ tab_name: item.tab_name, existing_id: existing.id, existing_title: existing.title })
      }
    }
  }

  return NextResponse.json(matches)
}
