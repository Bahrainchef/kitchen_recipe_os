/**
 * Round-2 venue image upload: Pastry Hub, Sage & Sirloin BH, Brewed Cafe
 * Also corrects Wildflour cover → wildflour-hero-2.webp (card image)
 * Run: node scripts/upload-venue-images-2.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')

const SUPABASE_URL = 'https://vuxpsnjbciyowpkbgwlv.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eHBzbmpiY2l5b3dwa2Jnd2x2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk3MjIxOCwiZXhwIjoyMDk0NTQ4MjE4fQ.FSAd55gTFHxtPTRyQJvmn_juxApvImTna9hc7_qmCpM'
const BUCKET = 'venue-images'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const UPLOADS = [
  {
    local: 'baker-creating-pastries-1224x816.jpg',
    name: 'pastry-hub-hero.jpg',
    mime: 'image/jpeg',
  },
  {
    local: 'maxresdefault.jpg',
    name: 'sage-sirloin-bh-hero.jpg',
    mime: 'image/jpeg',
  },
  {
    local: 'cozy-industrial-style-cafe-interior-warm-lighting-industrial-style-cafe-interior-featuring-pendant-lights-exposed-brick-369576357.webp',
    name: 'brewed-hero.webp',
    mime: 'image/webp',
  },
]

// cover_image_url is the card-facing image for each venue
const DB_UPDATES = [
  { id: 'a1000000-0000-0000-0000-000000000008', file: 'pastry-hub-hero.jpg' },      // Pastry Hub
  { id: 'a1000000-0000-0000-0000-000000000003', file: 'sage-sirloin-bh-hero.jpg' }, // Sage & Sirloin BH
  { id: 'a1000000-0000-0000-0000-000000000001', file: 'brewed-hero.webp' },          // Brewed Cafe
  // Wildflour: swap cover to hero-2 (scones) — card image per new spec
  { id: 'a1000000-0000-0000-0000-000000000002', file: 'wildflour-hero-2.webp' },    // Wildflour card
]

async function uploadImage({ local, name, mime }) {
  const buffer = readFileSync(join(ROOT, local))
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(name, buffer, { contentType: mime, upsert: true })
  if (error) throw new Error(`Upload failed for ${name}: ${error.message}`)
  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${name}`
  console.log(`  ↑ ${local.split('/').pop()} → ${name}`)
  return url
}

async function main() {
  console.log('\n── Uploading 3 new images ─────────────────────────')
  const urlMap = {}
  for (const upload of UPLOADS) {
    const url = await uploadImage(upload)
    urlMap[upload.name] = url
  }

  console.log('\n── Updating cover_image_url in DB ─────────────────')
  for (const { id, file } of DB_UPDATES) {
    const url = file in urlMap
      ? urlMap[file]
      : `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${file}`
    const { error } = await supabase.from('venues').update({ cover_image_url: url }).eq('id', id)
    if (error) throw new Error(`DB update failed for ${id}: ${error.message}`)
    console.log(`  ✓ ${id.slice(-4)} → ${file}`)
  }

  console.log('\n── Done ────────────────────────────────────────────')
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
