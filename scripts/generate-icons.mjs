import sharp from 'sharp'
import { mkdir } from 'fs/promises'

await mkdir('public/icons', { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

for (const size of sizes) {
  const pad = size * 0.1
  const shieldW = size - pad * 2
  const shieldH = shieldW * 1.1
  const cx = size / 2
  const cy = size / 2 - pad * 0.2

  // Shield path (top two corners rounded, pointed bottom)
  const r = shieldW * 0.15
  const left = cx - shieldW / 2
  const right = cx + shieldW / 2
  const top = cy - shieldH / 2
  const bottom = cy + shieldH / 2

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#1e40af"/>
  <!-- Shield -->
  <path d="
    M ${left + r},${top}
    L ${right - r},${top}
    Q ${right},${top} ${right},${top + r}
    L ${right},${cy + shieldH * 0.1}
    Q ${right},${cy + shieldH * 0.4} ${cx},${bottom}
    Q ${left},${cy + shieldH * 0.4} ${left},${cy + shieldH * 0.1}
    L ${left},${top + r}
    Q ${left},${top} ${left + r},${top}
    Z
  " fill="white" opacity="0.15"/>
  <!-- Cross vertical bar -->
  <rect x="${cx - size * 0.045}" y="${top + shieldH * 0.15}" width="${size * 0.09}" height="${shieldH * 0.72}" rx="${size * 0.02}" fill="white"/>
  <!-- Cross horizontal bar -->
  <rect x="${left + shieldW * 0.18}" y="${cy - size * 0.045 - shieldH * 0.08}" width="${shieldW * 0.64}" height="${size * 0.09}" rx="${size * 0.02}" fill="white"/>
</svg>`

  await sharp(Buffer.from(svg))
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`)

  console.log(`✓ icon-${size}x${size}.png`)
}

console.log('All icons generated.')
