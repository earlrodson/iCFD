import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ClaudeTranslationProvider } from '@/lib/translation/providers/claude'
import type { TopicTranslationInput } from '@/lib/translation/types'

const BASE_PROMPT =
  'You are a Catholic translator. Translate to {lang}. Preserve: latria, dulia, CCC numbers, scripture references. Return only valid JSON.'

const SAMPLE_INPUT: TopicTranslationInput = {
  id: 'sacred-images',
  title: 'Sacred Images and Statues',
  question: "Why do Catholics use sacred images? Isn't it idolatry?",
  answer: 'Catholics do not worship statues. We worship God alone.',
  objections: [
    { objection: 'Exodus 20 forbids images.', response: 'God also commanded images in Exodus 25.' },
  ],
  churchFathers: [
    { author: 'St. John Damascene', quote: 'I do not worship matter.', source: 'On the Divine Images' },
  ],
  translationNotes: "Do not translate: latria, dulia. Use 'birhen' for Virgin.",
}

const SAMPLE_OUTPUT = {
  title: 'Mga Sagradong Larawan at Estatuwa',
  question: 'Bakit gumagamit ang mga Katoliko ng mga sagradong larawan?',
  answer: 'Hindi sinasamba ng mga Katoliko ang mga estatuwa. Ang Diyos lamang ang aming sinasamba.',
  objections: [
    { objection: 'Ipinagbabawal ng Exodo 20 ang mga larawan.', response: 'Inutusan din ng Diyos ang mga larawan sa Exodo 25.' },
  ],
  churchFathers: [
    { author: 'St. John Damascene', quote: 'Hindi ko sinasamba ang bagay.', source: 'On the Divine Images' },
  ],
}

// ── ClaudeTranslationProvider ─────────────────────────────────────────────────

describe('ClaudeTranslationProvider', () => {
  let provider: ClaudeTranslationProvider

  beforeEach(() => {
    provider = new ClaudeTranslationProvider('sk-ant-test-key')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('calls the Anthropic API with correct headers', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(SAMPLE_OUTPUT) }],
      }),
    } as Response)

    await provider.translate(SAMPLE_INPUT, 'tl', BASE_PROMPT)

    expect(fetch).toHaveBeenCalledOnce()
    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect((options.headers as Record<string, string>)['x-api-key']).toBe('sk-ant-test-key')
    expect((options.headers as Record<string, string>)['anthropic-version']).toBe('2023-06-01')
  })

  it('replaces {lang} in the system prompt with the language name', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(SAMPLE_OUTPUT) }],
      }),
    } as Response)

    await provider.translate(SAMPLE_INPUT, 'tl', BASE_PROMPT)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.system).toContain('Filipino (Tagalog)')
    expect(body.system).not.toContain('{lang}')
  })

  it('uses correct lang name for ceb', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(SAMPLE_OUTPUT) }],
      }),
    } as Response)

    await provider.translate(SAMPLE_INPUT, 'ceb', BASE_PROMPT)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.system).toContain('Cebuano (Bisaya)')
  })

  it('injects translationNotes into the user message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(SAMPLE_OUTPUT) }],
      }),
    } as Response)

    await provider.translate(SAMPLE_INPUT, 'tl', BASE_PROMPT)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    const userContent = body.messages[0].content as string
    expect(userContent).toContain("Do not translate: latria, dulia")
  })

  it('returns parsed translation output', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(SAMPLE_OUTPUT) }],
      }),
    } as Response)

    const result = await provider.translate(SAMPLE_INPUT, 'tl', BASE_PROMPT)

    expect(result.title).toBe(SAMPLE_OUTPUT.title)
    expect(result.question).toBe(SAMPLE_OUTPUT.question)
    expect(result.answer).toBe(SAMPLE_OUTPUT.answer)
    expect(result.objections).toHaveLength(1)
  })

  it('strips markdown code fences from response', async () => {
    const fencedOutput = '```json\n' + JSON.stringify(SAMPLE_OUTPUT) + '\n```'
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: fencedOutput }],
      }),
    } as Response)

    const result = await provider.translate(SAMPLE_INPUT, 'tl', BASE_PROMPT)
    expect(result.title).toBe(SAMPLE_OUTPUT.title)
  })

  it('throws on non-ok API response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => '{"error":{"type":"invalid_request_error","message":"Your credit balance is too low"}}',
    } as Response)

    await expect(provider.translate(SAMPLE_INPUT, 'tl', BASE_PROMPT)).rejects.toThrow('400')
  })

  it('throws when response JSON is invalid', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: 'not valid json at all' }],
      }),
    } as Response)

    await expect(provider.translate(SAMPLE_INPUT, 'tl', BASE_PROMPT)).rejects.toThrow()
  })

  it('omits translationNotes from prompt when not provided', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(SAMPLE_OUTPUT) }],
      }),
    } as Response)

    const inputWithoutNotes: TopicTranslationInput = { ...SAMPLE_INPUT, translationNotes: null }
    await provider.translate(inputWithoutNotes, 'tl', BASE_PROMPT)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.messages[0].content).not.toContain('Topic-specific translator notes')
  })

  it('uses claude-haiku model', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ type: 'text', text: JSON.stringify(SAMPLE_OUTPUT) }],
      }),
    } as Response)

    await provider.translate(SAMPLE_INPUT, 'tl', BASE_PROMPT)

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.model).toContain('haiku')
  })
})
