import type { TopicTranslationInput, TopicTranslationOutput, TranslationLang, TranslationProviderAdapter } from '../types'

const LANG_NAMES: Record<TranslationLang, string> = {
  tl: 'Filipino (Tagalog)',
  ceb: 'Cebuano (Bisaya)',
}

export class ClaudeTranslationProvider implements TranslationProviderAdapter {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async translate(
    input: TopicTranslationInput,
    targetLang: TranslationLang,
    basePrompt: string,
  ): Promise<TopicTranslationOutput> {
    const langName = LANG_NAMES[targetLang]
    const systemPrompt = basePrompt.replace('{lang}', langName)

    const topicNotes = input.translationNotes
      ? `\n\nTopic-specific translator notes:\n${input.translationNotes}`
      : ''

    const userContent = `Translate the following Catholic apologetics topic to ${langName}.
Return ONLY valid JSON matching the exact structure of the input. Do not add any explanation.${topicNotes}

Input JSON:
${JSON.stringify(
  {
    title: input.title,
    question: input.question,
    answer: input.answer,
    ...(input.objections?.length ? { objections: input.objections } : {}),
    ...(input.churchFathers?.length ? { churchFathers: input.churchFathers } : {}),
  },
  null,
  2,
)}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Claude API error ${response.status}: ${err}`)
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>
    }
    const text = data.content.find((b) => b.type === 'text')?.text ?? ''

    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()

    return JSON.parse(jsonText) as TopicTranslationOutput
  }
}
