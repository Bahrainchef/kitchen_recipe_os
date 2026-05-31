import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ recipeId: string }> }
) {
  const { recipeId } = await params

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images are supported' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let supabase: any
  try {
    supabase = createAdminClient()
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }

  const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
  const path = `recipes/${recipeId}/hero.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await supabase.storage
    .from('recipe-images')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('recipe-images').getPublicUrl(path)

  // Replace existing hero image record
  await supabase.from('recipe_media')
    .delete()
    .eq('recipe_id', recipeId)
    .eq('media_type', 'hero_image')

  await supabase.from('recipe_media').insert({
    recipe_id: recipeId,
    media_type: 'hero_image',
    is_external: false,
    file_url: publicUrl,
    external_url: null,
    file_size_kb: Math.round(file.size / 1024),
    mime_type: file.type,
    caption: null,
    sort_order: 0,
    uploaded_by: null,
  })

  return NextResponse.json({ url: publicUrl })
}
