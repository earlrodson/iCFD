import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { CertificatePlaceholder } from '@/lib/content/certificateTemplate'
import { renderCertificateImage, downloadCertificate } from '@/lib/download/certificateExport'
import * as libraryExport from '@/lib/download/libraryExport'

const PLACEHOLDERS: CertificatePlaceholder[] = [
  { field: 'name', x: 50, y: 48.8, font_size: 34, font_family: 'Georgia, serif', color: '#1a1a1a', align: 'center' },
  { field: 'serial_code', x: 83, y: 87, font_size: 15, font_family: 'Georgia, serif', color: '#1a1a1a', align: 'left' },
]

const VALUES = { name: 'Juan dela Cruz', serial_code: 'ICFD-0001' }

const FAKE_BLOB = new Blob(['fake-png'], { type: 'image/png' })

function mockCanvas(fillText: ReturnType<typeof vi.fn>) {
  const ctx = {
    drawImage: vi.fn(),
    fillText,
    set font(_v: string) {},
    set fillStyle(_v: string) {},
    set textAlign(_v: string) {},
    set textBaseline(_v: string) {},
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    cb: BlobCallback,
  ) {
    cb(FAKE_BLOB)
  })
  return ctx
}

beforeEach(() => {
  // jsdom's Image never fires load/error on its own — resolve on next tick,
  // like a real image load would, once `src` is assigned.
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      naturalWidth = 1000
      naturalHeight = 700
      crossOrigin = ''
      set src(_v: string) {
        queueMicrotask(() => this.onload?.())
      }
    },
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('renderCertificateImage', () => {
  it('draws the background image and fills text for every placeholder with a value', async () => {
    const fillText = vi.fn()
    mockCanvas(fillText)

    const blob = await renderCertificateImage('/certificates/default-template.jpeg', PLACEHOLDERS, VALUES)

    expect(blob).toBe(FAKE_BLOB)
    expect(fillText).toHaveBeenCalledTimes(2)
    expect(fillText).toHaveBeenCalledWith('Juan dela Cruz', 500, (48.8 / 100) * 700)
    expect(fillText).toHaveBeenCalledWith('ICFD-0001', 830, 609)
  })

  it('skips placeholders with no matching value', async () => {
    const fillText = vi.fn()
    mockCanvas(fillText)

    await renderCertificateImage('/certificates/default-template.jpeg', PLACEHOLDERS, { name: 'Juan dela Cruz' })

    expect(fillText).toHaveBeenCalledTimes(1)
    expect(fillText).toHaveBeenCalledWith('Juan dela Cruz', 500, (48.8 / 100) * 700)
  })

  it('rejects when the image fails to load', async () => {
    vi.stubGlobal(
      'Image',
      class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        set src(_v: string) {
          queueMicrotask(() => this.onerror?.())
        }
      },
    )

    await expect(renderCertificateImage('/broken.jpeg', PLACEHOLDERS, VALUES)).rejects.toThrow(
      'Failed to load certificate image',
    )
  })
})

describe('downloadCertificate', () => {
  it('renders the image and triggers a blob download with the given filename', async () => {
    mockCanvas(vi.fn())
    const trigger = vi.spyOn(libraryExport, 'triggerBlobDownload').mockImplementation(() => {})

    await downloadCertificate('my-cert.png', '/certificates/default-template.jpeg', PLACEHOLDERS, VALUES)

    expect(trigger).toHaveBeenCalledWith('my-cert.png', FAKE_BLOB)
  })
})
