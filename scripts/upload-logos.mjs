import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LOGOS_DIR = path.join(__dirname, '..', 'logos')

const SUPABASE_URL = 'https://vuxpsnjbciyowpkbgwlv.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eHBzbmpiY2l5b3dwa2Jnd2x2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODk3MjIxOCwiZXhwIjoyMDk0NTQ4MjE4fQ.FSAd55gTFHxtPTRyQJvmn_juxApvImTna9hc7_qmCpM'

const LOGOS = [
  { file: 'Brewed Logo.webp',           venueId: 'a1000000-0000-0000-0000-000000000001', storagePath: 'brewed.webp' },
  { file: 'Wildflour Logo.webp',         venueId: 'a1000000-0000-0000-0000-000000000002', storagePath: 'wildflour.webp' },
  { file: 'Sage and Sirloin Logo.webp',  venueId: 'a1000000-0000-0000-0000-000000000003', storagePath: 'sage-sirloin-bh.webp' },
  { file: 'The Royal Chippy Logo.webp',  venueId: 'a1000000-0000-0000-0000-000000000004', storagePath: 'royal-chippy.webp' },
  { file: 'Sage & Sirloin Logo.webp',    venueId: 'a1000000-0000-0000-0000-000000000005', storagePath: 'sage-sirloin-ksa.webp' },
  { file: 'TFJ Logo.webp',              venueId: 'a1000000-0000-0000-0000-000000000006', storagePath: 'tfj.webp' },
  { file: 'V Seven Logo.webp',           venueId: 'a1000000-0000-0000-0000-000000000007', storagePath: 'v-seven.webp' },
]

const authHeaders = {
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'apikey': SERVICE_ROLE_KEY,
}

async function createBucket() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'logos', name: 'logos', public: true }),
  })
  const data = await res.json()
  if (res.ok) {
    console.log('✓ Bucket "logos" created')
  } else if (data.error === 'Duplicate' || data.message?.includes('already exists')) {
    console.log('✓ Bucket "logos" already exists')
  } else {
    console.error('✗ Bucket create failed:', data)
    process.exit(1)
  }
}

async function uploadLogo(logo) {
  const filePath = path.join(LOGOS_DIR, logo.file)
  if (!fs.existsSync(filePath)) {
    console.error(`  ✗ File not found: ${logo.file}`)
    return null
  }
  const buffer = fs.readFileSync(filePath)

  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/logos/${logo.storagePath}`, {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'image/webp', 'x-upsert': 'true' },
    body: buffer,
  })
  const data = await res.json()
  if (!res.ok) {
    console.error(`  ✗ Upload failed for ${logo.file}:`, data)
    return null
  }
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/logos/${logo.storagePath}`
  console.log(`  ✓ Uploaded → ${publicUrl}`)
  return publicUrl
}

async function updateVenue(venueId, logoUrl) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/venues?id=eq.${venueId}`, {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ logo_url: logoUrl }),
  })
  if (res.ok || res.status === 204) {
    console.log(`  ✓ Updated venue ${venueId}`)
  } else {
    const text = await res.text()
    console.error(`  ✗ Update failed for ${venueId}:`, text)
  }
}

async function main() {
  console.log('\n1. Creating "logos" bucket...')
  await createBucket()

  console.log('\n2. Uploading logos & updating venues...')
  for (const logo of LOGOS) {
    console.log(`\n  ${logo.file}`)
    const url = await uploadLogo(logo)
    if (url) await updateVenue(logo.venueId, url)
  }

  console.log('\nDone.\n')
}

main().catch(console.error)
