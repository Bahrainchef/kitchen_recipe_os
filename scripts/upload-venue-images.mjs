/**
 * Uploads venue hero images to Supabase Storage and updates cover_image_url.
 * Run: node scripts/upload-venue-images.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')

const SUPABASE_URL = 'https://vuxpsnjbciyowpkbgwlv.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eHBzbmpiY2l5b3dwa2Jnd2x2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk3MjIxOCwiZXhwIjoyMDk0NTQ4MjE4fQ.FSAd55gTFHxtPTRyQJvmn_juxApvImTna9hc7_qmCpM'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const BUCKET = 'venue-images'

// localFile → storageName, mimeType
const UPLOADS = [
  {
    local: '1741807641307_I6IuisV8BP.webp',
    name: 'tfj-hero-1.webp',
    mime: 'image/webp',
  },
  {
    local: 'kitchen-staff-rapidly-puts-together-burgers-busy-fast-food-restaurant-atmosphere-lively-trays-buns-vegetables-445568587.webp',
    name: 'tfj-hero-2.webp',
    mime: 'image/webp',
  },
  {
    local: 'italian-restaurant-kitchen-design.webp',
    name: 'vseven-hero-1.webp',
    mime: 'image/webp',
  },
  {
    local: 'modern-tropical-italian-food-buffet-highlighting-cleanliness-refined-arrangement_641503-85657.jpg',
    name: 'vseven-hero-2.jpg',
    mime: 'image/jpeg',
  },
  {
    local: 'commercial-kitchen-interior-stockcake.webp',
    name: 'wildflour-hero-1.webp',
    mime: 'image/webp',
  },
  {
    local: 'white-chocolate-scones-with-french-style-strawberry-conserve-13648-1.webp',
    name: 'wildflour-hero-2.webp',
    mime: 'image/webp',
  },
  {
    local: 'Logos/busy-restaurant-kitchen-staff-cooking-food-photo.jpg',
    name: 'sage-lounge-hero.jpg',
    mime: 'image/jpeg',
  },
  {
    local: 'English-Rose-Tearoom-7.jpg',
    name: 'app-hero-bg.jpg',
    mime: 'image/jpeg',
  },
]

// venueId → storageName for cover_image_url
const DB_UPDATES = [
  { id: 'a1000000-0000-0000-0000-000000000006', file: 'tfj-hero-1.webp' },       // TFJ
  { id: 'a1000000-0000-0000-0000-000000000007', file: 'vseven-hero-1.webp' },    // V Seven
  { id: 'a1000000-0000-0000-0000-000000000002', file: 'wildflour-hero-1.webp' }, // Wildflour
  { id: 'a1000000-0000-0000-0000-000000000005', file: 'sage-lounge-hero.jpg' },  // Sage & Sirloin
]

async function ensureBucket() {
  const { data: buckets } = await supabase.storage.listBuckets()
  const exists = buckets?.some(b => b.name === BUCKET)
  if (!exists) {
    const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (error) throw new Error(`Failed to create bucket: ${error.message}`)
    console.log(`✓ Created bucket "${BUCKET}"`)
  } else {
    console.log(`✓ Bucket "${BUCKET}" already exists`)
  }
}

async function uploadImage({ local, name, mime }) {
  const buffer = readFileSync(join(ROOT, local))
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(name, buffer, { contentType: mime, upsert: true })
  if (error) throw new Error(`Upload failed for ${name}: ${error.message}`)
  console.log(`  ↑ ${local.split('/').pop()} → ${name}`)
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${name}`
}

async function updateDb(venueId, url) {
  const { error } = await supabase
    .from('venues')
    .update({ cover_image_url: url })
    .eq('id', venueId)
  if (error) throw new Error(`DB update failed for ${venueId}: ${error.message}`)
}

async function main() {
  console.log('\n── Step 1: Ensure bucket ──────────────────────────')
  await ensureBucket()

  console.log('\n── Step 2: Upload images ──────────────────────────')
  const urlMap = {}
  for (const upload of UPLOADS) {
    const url = await uploadImage(upload)
    urlMap[upload.name] = url
  }

  console.log('\n── Step 3: Update cover_image_url in DB ───────────')
  for (const { id, file } of DB_UPDATES) {
    const url = urlMap[file]
    await updateDb(id, url)
    console.log(`  ✓ ${id} → ${file}`)
  }

  console.log('\n── Done ────────────────────────────────────────────')
  console.log('\nPublic URLs:')
  for (const [name, url] of Object.entries(urlMap)) {
    console.log(`  ${name}: ${url}`)
  }
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
