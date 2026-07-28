export interface CertificatePlaceholder {
  field: string
  x: number
  y: number
  font_size?: number
  font_family?: string
  color?: string
  align?: 'left' | 'center' | 'right'
}

/**
 * Used both as the fallback when a tier has no admin-uploaded template yet,
 * and as the starting point for a newly-created template row (see
 * app/api/admin/certificates/upload). Position is tuned for
 * public/certificates/default-template.png specifically — the blank
 * signature-line area above the description paragraph.
 */
export const DEFAULT_NAME_PLACEHOLDER: CertificatePlaceholder = {
  field: 'name',
  x: 50,
  y: 48.8,
  font_size: 34,
  font_family: 'Georgia, serif',
  color: '#1a1a1a',
  align: 'center',
}

// Placeholders are authored assuming an image roughly this wide; font size
// scales with the actual rendered width so text stays proportional.
export const REFERENCE_IMAGE_WIDTH = 1000

// Shown for any tier that has no admin-uploaded template yet.
export const DEFAULT_BASE_IMAGE_URL = '/certificates/default-template.png'

export function resolveNamePlaceholder(placeholders: CertificatePlaceholder[] | undefined): CertificatePlaceholder {
  return (
    placeholders?.find((p) => p.field === 'name' || p.field === 'full_name' || p.field === 'account_name') ??
    DEFAULT_NAME_PLACEHOLDER
  )
}
