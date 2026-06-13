import sharp from 'sharp'
import path from 'path'

const SRC = path.join(process.cwd(), 'public', 'Favicon_Kitchen_Recipe_OS.png')

const sizes: { file: string; size: number }[] = [
  { file: 'favicon-16x16.png',   size: 16  },
  { file: 'favicon-32x32.png',   size: 32  },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icon512.png',          size: 512 },
]

async function run() {
  for (const { file, size } of sizes) {
    const dest = path.join(process.cwd(), 'public', file)
    await sharp(SRC).resize(size, size).png().toFile(dest)
    console.log(`✓ ${file} (${size}x${size})`)
  }
  console.log('\nAll favicons generated in /public')
}

run().catch(e => { console.error(e); process.exit(1) })
