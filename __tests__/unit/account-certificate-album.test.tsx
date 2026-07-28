import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Module mocks (hoisted) ────────────────────────────────────────────────────

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
  isSupabaseConfigured: () => true,
}))

vi.mock('@/lib/supabase/auth', () => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(() => () => {}),
  signOut: vi.fn(),
  signInWithEmail: vi.fn(),
  signUpWithEmail: vi.fn(),
  signInWithMagicLink: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
}))

vi.mock('@/lib/supabase/sync', () => ({
  fetchUserSettingsFromCloud: vi.fn().mockResolvedValue(null),
  fetchProfileFromCloud: vi.fn().mockResolvedValue(null),
  saveProfileToCloud: vi.fn(),
}))

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/client'
import { getUser, type User as SupabaseUser } from '@/lib/supabase/auth'
import AccountPage from '@/app/account/page'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER = { id: 'user-1', email: 'reader@example.com', user_metadata: {} } as SupabaseUser

interface CertRow {
  path_slug: string
  tier: string
  serial_code: string
  issued_at: string
  paths: { title: string } | null
}

interface TemplateRow {
  path_slug: string
  tier: string
  base_image_url: string
  placeholders: unknown
}

function setupSupabase(certificates: CertRow[], templates: TemplateRow[]) {
  vi.mocked(createClient).mockReturnValue({
    from: (table: string) => {
      if (table === 'certificates') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: certificates, error: null }),
            }),
          }),
        }
      }
      if (table === 'certificate_templates') {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: templates, error: null }),
          }),
        }
      }
      throw new Error(`unexpected table in test: ${table}`)
    },
  } as unknown as ReturnType<typeof createClient>)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUser).mockResolvedValue(USER)
})

// ── Certificate album ───────────────────────────────────────────────────────

describe('AccountPage — certificate album', () => {
  it('renders a thumbnail per earned certificate using its own uploaded template', async () => {
    setupSupabase(
      [
        {
          path_slug: 'apologetics-101',
          tier: 'beginner',
          serial_code: 'ABC123',
          issued_at: '2026-01-01T00:00:00Z',
          paths: { title: 'Apologetics 101' },
        },
      ],
      [
        {
          path_slug: 'apologetics-101',
          tier: 'beginner',
          base_image_url: '/certificates/apologetics-101.png',
          placeholders: [{ field: 'name', x: 50, y: 40 }],
        },
      ],
    )

    render(<AccountPage />)

    const img = await screen.findByAltText('Apologetics 101 — Beginner Certificate')
    expect(img).toHaveAttribute('src', '/certificates/apologetics-101.png')
    expect(screen.getByText('Apologetics 101 — Beginner')).toBeInTheDocument()
  })

  it('falls back to the default template when no admin template exists for that tier', async () => {
    setupSupabase(
      [
        {
          path_slug: 'apologetics-101',
          tier: 'advanced',
          serial_code: 'XYZ789',
          issued_at: '2026-02-01T00:00:00Z',
          paths: { title: 'Apologetics 101' },
        },
      ],
      [],
    )

    render(<AccountPage />)

    const img = await screen.findByAltText('Apologetics 101 — Advanced Certificate')
    expect(img).toHaveAttribute('src', '/certificates/default-template.png')
  })

  it('renders no album when the user has no certificates', async () => {
    setupSupabase([], [])

    render(<AccountPage />)

    await screen.findByText('Sign Out')
    expect(screen.queryByText('Certificates')).not.toBeInTheDocument()
  })
})
