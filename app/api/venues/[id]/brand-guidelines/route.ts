// Large file uploads bypass Vercel's 4.5MB body limit by using signed upload URLs:
// GET  → server generates a signed URL; client uploads the file directly to Supabase Storage
// PATCH → client calls after upload to save the public URL to the DB (tiny JSON payload)
// DELETE → removes the file from storage and clears brand_guidelines_url

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'brand-guidelines'

function storagePath(id: string) {
  return `venue-${id}/guidelines.pdf`
}

function publicUrl(id: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath(id)}`
}

// GET — issue a signed upload URL (no file passes through Vercel)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createAdminClient() as any

  const { data, error } = await sb.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath(id), { upsert: true })

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ signedUrl: data.signedUrl })
}

// PATCH — save public URL to DB after client has finished uploading to storage
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createAdminClient() as any
  const url = publicUrl(id)

  const { error } = await sb
    .from('venues')
    .update({ brand_guidelines_url: url })
    .eq('id', id)

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ url })
}

// DELETE — remove file from storage and clear DB column
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createAdminClient() as any

  await sb.storage.from(BUCKET).remove([storagePath(id)])

  const { error } = await sb
    .from('venues')
    .update({ brand_guidelines_url: null })
    .eq('id', id)

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
