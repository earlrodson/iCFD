export type TranslationLang = 'tl' | 'ceb'

export type TranslationProvider = 'claude' | 'openai' | 'google' | 'azure'

export interface TopicTranslationInput {
  id: string
  title: string
  question: string
  answer: string
  objections?: Array<{ objection: string; response: string }>
  churchFathers?: Array<{ author: string; quote: string; source: string }>
  translationNotes?: string | null
}

export interface TopicTranslationOutput {
  title: string
  question: string
  answer: string
  objections?: Array<{ objection: string; response: string }>
  churchFathers?: Array<{ author: string; quote: string; source: string }>
}

export interface TranslationProviderAdapter {
  translate(
    input: TopicTranslationInput,
    targetLang: TranslationLang,
    basePrompt: string,
  ): Promise<TopicTranslationOutput>
}
