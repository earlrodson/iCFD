export interface CertificatePlaceholder {
  field: string
  x: number
  y: number
  font_size?: number
  font_family?: string
  color?: string
  align?: 'left' | 'center' | 'right'
}

// Placeholders are authored assuming an image roughly this wide; font size
// scales with the actual rendered width so text stays proportional.
export const REFERENCE_IMAGE_WIDTH = 1000

// Shown for any tier that has no admin-uploaded template yet.
export const DEFAULT_BASE_IMAGE_URL = '/certificates/default-template.jpeg'

/** field keys rendered onto a certificate, alongside an admin-facing label for the drag UI. */
export const CERTIFICATE_FIELDS = [
  { field: 'name', label: 'Recipient name' },
  { field: 'issue_date', label: 'Issue date' },
  { field: 'serial_code', label: 'Certificate ID' },
  { field: 'national_president', label: 'National President' },
  { field: 'national_spiritual_adviser', label: 'National Spiritual Adviser' },
] as const

/**
 * Default placeholder layout, tuned for public/certificates/default-template.jpeg
 * (the signature-line/seal area at the bottom of that image specifically). Used
 * both as the fallback when a tier has no admin-uploaded template yet, and as
 * the starting point for a newly-created template row (see
 * app/api/admin/certificates/upload) — admins fine-tune from here via the drag
 * UI on /admin/certificates.
 */
export const DEFAULT_PLACEHOLDERS: CertificatePlaceholder[] = [
  { field: 'name', x: 50, y: 48.8, font_size: 34, font_family: 'Georgia, serif', color: '#1a1a1a', align: 'center' },
  { field: 'issue_date', x: 17, y: 95.5, font_size: 14, font_family: 'Georgia, serif', color: '#1a1a1a', align: 'center' },
  { field: 'serial_code', x: 83, y: 87, font_size: 15, font_family: 'Georgia, serif', color: '#1a1a1a', align: 'left' },
  { field: 'national_president', x: 38.6, y: 86, font_size: 16, font_family: 'Georgia, serif', color: '#1a1a1a', align: 'center' },
  { field: 'national_spiritual_adviser', x: 61.3, y: 86, font_size: 16, font_family: 'Georgia, serif', color: '#1a1a1a', align: 'center' },
]

/**
 * Merges an admin-saved placeholder list with the defaults: a field the admin
 * has positioned overrides the default, any field they haven't touched yet
 * (e.g. templates saved before a new field was introduced) falls back to its
 * default position rather than disappearing.
 */
export function resolvePlaceholders(placeholders: CertificatePlaceholder[] | undefined): CertificatePlaceholder[] {
  if (!placeholders || placeholders.length === 0) return DEFAULT_PLACEHOLDERS
  const byField = new Map(placeholders.map((p) => [p.field, p]))
  return DEFAULT_PLACEHOLDERS.map((fallback) => byField.get(fallback.field) ?? fallback)
}

/** issued_at is an ISO timestamp (e.g. "2026-01-01T00:00:00Z") — the date portion is already YYYY-MM-DD. */
export function formatIssueDate(isoDate: string): string {
  return isoDate.slice(0, 10)
}
