import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Module mocks (hoisted) ────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}))

// next/dynamic returns a no-op component in tests (replaces MDEditor)
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/client'
import { TopicEditor } from '@/app/admin/topics/[id]/TopicEditor'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const EN_TOPIC = {
  id: 'papal-infallibility',
  lang: 'en',
  category: 'papacy',
  title: 'Papal Infallibility',
  question: 'What is papal infallibility?',
  answer: 'The pope cannot err on faith and morals.',
  answer_full: null,
  cover_image: null,
  difficulty: 'intermediate',
  tags: ['papacy', 'infallibility'],
  related_topics: [],
  scripture: null,
  catechism: null,
  church_fathers: null,
  objections: [],
  translation_notes: null,
  published: true,
}

const TL_TOPIC = {
  ...EN_TOPIC,
  lang: 'tl',
  title: 'Kawalan ng Pagkakamali ng Papa',
  question: 'Ano ang kawalan ng pagkakamali ng papa?',
  answer: 'Hindi nagkakamali ang Papa sa usapin ng pananampalataya.',
}

// ── Supabase mock helpers ─────────────────────────────────────────────────────

let mockMaybySingle: ReturnType<typeof vi.fn>
let mockUpsert: ReturnType<typeof vi.fn>

function setupClient() {
  vi.mocked(createClient).mockReturnValue({
    from: (table: string) => {
      if (table === 'topics') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: mockMaybySingle }),
            }),
          }),
          upsert: mockUpsert,
        }
      }
      // Reference tables: scripture_verses, church_father_quotes, ccc_paragraphs
      const refChain: Record<string, unknown> = {}
      refChain.select = () => refChain
      refChain.eq = () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) })
      refChain.in = () => ({ then: (cb: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(cb) })
      refChain.ilike = () => ({ limit: () => Promise.resolve({ data: [], error: null }) })
      refChain.or = () => ({ limit: () => Promise.resolve({ data: [], error: null }) })
      return refChain
    },
  } as unknown as ReturnType<typeof createClient>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockMaybySingle = vi.fn()
  mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
  setupClient()
})

// ── Tab bar rendering ─────────────────────────────────────────────────────────

describe('TopicEditor — language tab bar', () => {
  it('renders EN, TL, CEB tabs for an existing topic after load', async () => {
    mockMaybySingle.mockResolvedValue({ data: EN_TOPIC, error: null })

    render(<TopicEditor topicId="papal-infallibility" lang="en" />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'TL' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'CEB' })).toBeInTheDocument()
    })
  })

  it('does NOT render the tab bar when creating a new topic', async () => {
    render(<TopicEditor topicId="new" lang="en" />)

    // No loading phase for new topic — form renders immediately
    expect(screen.queryByRole('button', { name: 'EN' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'TL' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'CEB' })).not.toBeInTheDocument()
  })

  it('marks the initial lang tab as active', async () => {
    mockMaybySingle.mockResolvedValue({ data: EN_TOPIC, error: null })

    render(<TopicEditor topicId="papal-infallibility" lang="en" />)

    const enBtn = await screen.findByRole('button', { name: 'EN' })
    const tlBtn = await screen.findByRole('button', { name: 'TL' })

    // Active tab has bg-card; inactive has text-muted-foreground
    expect(enBtn.className).toContain('bg-card')
    expect(tlBtn.className).not.toContain('bg-card')
  })

  it('starts on TL tab when lang prop is "tl"', async () => {
    mockMaybySingle.mockResolvedValue({ data: TL_TOPIC, error: null })

    render(<TopicEditor topicId="papal-infallibility" lang="tl" />)

    const tlBtn = await screen.findByRole('button', { name: 'TL' })
    const enBtn = await screen.findByRole('button', { name: 'EN' })

    expect(tlBtn.className).toContain('bg-card')
    expect(enBtn.className).not.toContain('bg-card')
  })
})

// ── Tab switching — loading ───────────────────────────────────────────────────

describe('TopicEditor — switching language tabs', () => {
  it('loads TL topic data when TL tab is clicked', async () => {
    mockMaybySingle
      .mockResolvedValueOnce({ data: EN_TOPIC, error: null }) // initial EN load
      .mockResolvedValueOnce({ data: TL_TOPIC, error: null }) // after clicking TL

    render(<TopicEditor topicId="papal-infallibility" lang="en" />)

    // Wait for EN to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Papal Infallibility')).toBeInTheDocument()
    })

    // Click TL tab
    await userEvent.click(screen.getByRole('button', { name: 'TL' }))

    // Wait for TL content to appear
    await waitFor(() => {
      expect(screen.getByDisplayValue('Kawalan ng Pagkakamali ng Papa')).toBeInTheDocument()
    })
  })

  it('marks TL tab as active after switching', async () => {
    mockMaybySingle
      .mockResolvedValueOnce({ data: EN_TOPIC, error: null })
      .mockResolvedValueOnce({ data: TL_TOPIC, error: null })

    render(<TopicEditor topicId="papal-infallibility" lang="en" />)
    await screen.findByDisplayValue('Papal Infallibility')

    await userEvent.click(screen.getByRole('button', { name: 'TL' }))

    await waitFor(() => {
      const tlBtn = screen.getByRole('button', { name: 'TL' })
      const enBtn = screen.getByRole('button', { name: 'EN' })
      expect(tlBtn.className).toContain('bg-card')
      expect(enBtn.className).not.toContain('bg-card')
    })
  })

  it('keeps current tab selected when clicking the already-active tab', async () => {
    mockMaybySingle.mockResolvedValue({ data: EN_TOPIC, error: null })

    render(<TopicEditor topicId="papal-infallibility" lang="en" />)
    await screen.findByDisplayValue('Papal Infallibility')

    await userEvent.click(screen.getByRole('button', { name: 'EN' }))

    // Only one Supabase call (initial load, not a re-fetch)
    expect(mockMaybySingle).toHaveBeenCalledTimes(1)
  })
})

// ── Missing translation row ───────────────────────────────────────────────────

describe('TopicEditor — missing translation row', () => {
  it('clears title/question/answer when the target lang has no row', async () => {
    mockMaybySingle
      .mockResolvedValueOnce({ data: EN_TOPIC, error: null }) // EN found
      .mockResolvedValueOnce({ data: null, error: null })     // TL not yet created

    render(<TopicEditor topicId="papal-infallibility" lang="en" />)
    await screen.findByDisplayValue('Papal Infallibility')

    await userEvent.click(screen.getByRole('button', { name: 'TL' }))

    await waitFor(() => {
      // Title input should be empty (content field cleared)
      const titleInput = screen.getByPlaceholderText('The Immaculate Conception of Mary')
      expect((titleInput as HTMLInputElement).value).toBe('')
    })
  })

  it('preserves category and difficulty when the target lang has no row', async () => {
    mockMaybySingle
      .mockResolvedValueOnce({ data: EN_TOPIC, error: null })
      .mockResolvedValueOnce({ data: null, error: null })

    render(<TopicEditor topicId="papal-infallibility" lang="en" />)
    await screen.findByDisplayValue('Papal Infallibility')

    await userEvent.click(screen.getByRole('button', { name: 'TL' }))

    await waitFor(() => {
      // Category and difficulty are shared — should remain from EN
      const categorySelect = screen.getByDisplayValue('papacy')
      expect(categorySelect).toBeInTheDocument()
    })
  })
})

// ── Auto-save before tab switch ───────────────────────────────────────────────

describe('TopicEditor — auto-save on tab switch', () => {
  it('calls upsert with current lang data before loading the new lang', async () => {
    mockMaybySingle
      .mockResolvedValueOnce({ data: EN_TOPIC, error: null })
      .mockResolvedValueOnce({ data: TL_TOPIC, error: null })

    render(<TopicEditor topicId="papal-infallibility" lang="en" />)
    await screen.findByDisplayValue('Papal Infallibility')

    // Dirty the form by changing the title
    const titleInput = screen.getByDisplayValue('Papal Infallibility')
    fireEvent.change(titleInput, { target: { value: 'Papal Infallibility (edited)' } })

    await userEvent.click(screen.getByRole('button', { name: 'TL' }))

    await waitFor(() => {
      // upsert should have been called with the modified EN data
      expect(mockUpsert).toHaveBeenCalledOnce()
      const savedRow = mockUpsert.mock.calls[0][0]
      expect(savedRow.lang).toBe('en')
      expect(savedRow.title).toBe('Papal Infallibility (edited)')
    })
  })

  it('does NOT auto-save if the form is clean (no edits made)', async () => {
    mockMaybySingle
      .mockResolvedValueOnce({ data: EN_TOPIC, error: null })
      .mockResolvedValueOnce({ data: TL_TOPIC, error: null })

    render(<TopicEditor topicId="papal-infallibility" lang="en" />)
    await screen.findByDisplayValue('Papal Infallibility')

    // Switch without making any edits
    await userEvent.click(screen.getByRole('button', { name: 'TL' }))

    await waitFor(() => screen.findByDisplayValue('Kawalan ng Pagkakamali ng Papa'))

    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('save button uses selectedLang not form.lang for the DB row', async () => {
    mockMaybySingle
      .mockResolvedValueOnce({ data: EN_TOPIC, error: null })
      .mockResolvedValueOnce({ data: TL_TOPIC, error: null })

    render(<TopicEditor topicId="papal-infallibility" lang="en" />)
    await screen.findByDisplayValue('Papal Infallibility')

    // Switch to TL
    await userEvent.click(screen.getByRole('button', { name: 'TL' }))
    await screen.findByDisplayValue('Kawalan ng Pagkakamali ng Papa')

    // Click Save while on TL tab
    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled()
      const savedRow = mockUpsert.mock.calls[mockUpsert.mock.calls.length - 1][0]
      expect(savedRow.lang).toBe('tl')
    })
  })
})

// ── New topic: no tab bar, no DB fetch ───────────────────────────────────────

describe('TopicEditor — new topic mode', () => {
  it('renders the form immediately without a loading phase', () => {
    render(<TopicEditor topicId="new" lang="en" />)
    // ID input should be present immediately
    expect(screen.getByPlaceholderText('e.g. papal-infallibility')).toBeInTheDocument()
  })

  it('does not query the topics table for a new topic', () => {
    render(<TopicEditor topicId="new" lang="en" />)
    // Picker subcomponents call createClient for search, but the topic itself
    // should never be fetched from the DB for a new-topic form
    expect(mockMaybySingle).not.toHaveBeenCalled()
  })

  it('shows validation error when saving without an ID', async () => {
    render(<TopicEditor topicId="new" lang="en" />)

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(screen.getByText('ID and Title are required.')).toBeInTheDocument()
    })
  })
})

// ── Cover image field ─────────────────────────────────────────────────────────

describe('TopicEditor — cover image field', () => {
  it('renders the Cover Image URL input', async () => {
    mockMaybySingle.mockResolvedValue({ data: EN_TOPIC, error: null })
    render(<TopicEditor topicId="papal-infallibility" lang="en" />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/https:\/\/images\.unsplash/i)).toBeInTheDocument()
    })
  })

  it('populates the cover image field from the DB row', async () => {
    mockMaybySingle.mockResolvedValue({
      data: { ...EN_TOPIC, cover_image: 'https://example.com/hero.jpg' },
      error: null,
    })
    render(<TopicEditor topicId="papal-infallibility" lang="en" />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('https://example.com/hero.jpg')).toBeInTheDocument()
    })
  })

  it('saves cover_image in the upsert row when a URL is entered', async () => {
    mockMaybySingle.mockResolvedValue({ data: EN_TOPIC, error: null })
    render(<TopicEditor topicId="papal-infallibility" lang="en" />)
    await screen.findByDisplayValue('Papal Infallibility')

    const imgInput = screen.getByPlaceholderText(/https:\/\/images\.unsplash/i)
    fireEvent.change(imgInput, { target: { value: 'https://example.com/new.jpg' } })

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled()
      const savedRow = mockUpsert.mock.calls[mockUpsert.mock.calls.length - 1][0]
      expect(savedRow.cover_image).toBe('https://example.com/new.jpg')
    })
  })

  it('saves cover_image as null when the field is cleared', async () => {
    mockMaybySingle.mockResolvedValue({
      data: { ...EN_TOPIC, cover_image: 'https://example.com/old.jpg' },
      error: null,
    })
    render(<TopicEditor topicId="papal-infallibility" lang="en" />)
    await screen.findByDisplayValue('https://example.com/old.jpg')

    const imgInput = screen.getByDisplayValue('https://example.com/old.jpg')
    fireEvent.change(imgInput, { target: { value: '' } })

    await userEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalled()
      const savedRow = mockUpsert.mock.calls[mockUpsert.mock.calls.length - 1][0]
      expect(savedRow.cover_image).toBeNull()
    })
  })
})
