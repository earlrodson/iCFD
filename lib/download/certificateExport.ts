import { REFERENCE_IMAGE_WIDTH, type CertificatePlaceholder } from '@/lib/content/certificateTemplate'
import { triggerBlobDownload } from './libraryExport'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load certificate image: ${src}`))
    img.src = src
  })
}

/**
 * Draws the same background image + placeholder text CertificatePreview
 * renders as DOM/CSS onto an offscreen canvas instead, at the template's
 * native resolution, so the exported PNG matches what the user sees.
 * Anchors every field at its center (textAlign 'center' + textBaseline
 * 'middle'), matching CertificatePreview's `-translate-x-1/2 -translate-y-1/2`
 * box, which shrink-wraps single-line nowrap text — so `align` has no visual
 * effect there either.
 */
export async function renderCertificateImage(
  imageUrl: string,
  placeholders: CertificatePlaceholder[],
  values: Record<string, string>,
): Promise<Blob> {
  const img = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.drawImage(img, 0, 0)

  const scale = img.naturalWidth / REFERENCE_IMAGE_WIDTH
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const p of placeholders) {
    const value = values[p.field]
    if (!value) continue
    ctx.font = `${(p.font_size ?? 16) * scale}px ${p.font_family ?? 'Georgia, serif'}`
    ctx.fillStyle = p.color ?? '#1a1a1a'
    ctx.fillText(value, (p.x / 100) * canvas.width, (p.y / 100) * canvas.height)
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Failed to render certificate image'))),
      'image/png',
    )
  })
}

export async function downloadCertificate(
  filename: string,
  imageUrl: string,
  placeholders: CertificatePlaceholder[],
  values: Record<string, string>,
): Promise<void> {
  const blob = await renderCertificateImage(imageUrl, placeholders, values)
  triggerBlobDownload(filename, blob)
}
