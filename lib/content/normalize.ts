import type { Topic, Citation, Answer } from '@/data/schema/topic.schema'

export type PresentationMode = 'full' | 'concise' | 'guide'

/**
 * Returns the answer text appropriate for the given presentation mode.
 * Handles both legacy string answers and new structured Answer objects.
 */
export function getAnswerText(topic: Topic, mode: PresentationMode): string {
  const answer = topic.answer

  if (typeof answer === 'string') {
    if (mode === 'full') return answer
    return extractSummary(answer)
  }

  const structured = answer as Answer
  if (mode === 'full') return structured.full
  return structured.summary
}

/**
 * Returns a normalized citations array from a topic, mapping legacy fields
 * (scripture, catechism, churchFathers) to the unified Citation type when
 * the new citations field is not present.
 */
export function getCitations(topic: Topic): Citation[] {
  if (topic.citations && topic.citations.length > 0) return topic.citations

  const citations: Citation[] = []

  for (const s of topic.scripture ?? []) {
    citations.push({
      type: 'scripture',
      reference: s.reference,
      text: s.text,
      version: s.version,
    })
  }

  for (const c of topic.catechism ?? []) {
    citations.push({
      type: 'catechism',
      reference: c,
    })
  }

  for (const f of topic.churchFathers ?? []) {
    citations.push({
      type: 'church-father',
      author: f.author,
      quote: f.quote,
      source: f.source,
    })
  }

  return citations
}

/**
 * Extracts a 2–3 sentence summary from an answer string.
 * Used as a fallback when a structured summary is not provided.
 */
export function extractSummary(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? []
  return sentences
    .slice(0, 3)
    .join('')
    .trim()
}

/**
 * Returns citations grouped by type for rendering in different modes.
 */
export function groupCitationsByType(citations: Citation[]) {
  return {
    scripture: citations.filter((c): c is Extract<Citation, { type: 'scripture' }> => c.type === 'scripture'),
    catechism: citations.filter((c): c is Extract<Citation, { type: 'catechism' }> => c.type === 'catechism'),
    churchFathers: citations.filter((c): c is Extract<Citation, { type: 'church-father' }> => c.type === 'church-father'),
    council: citations.filter((c): c is Extract<Citation, { type: 'council' }> => c.type === 'council'),
    papal: citations.filter((c): c is Extract<Citation, { type: 'papal' }> => c.type === 'papal'),
    custom: citations.filter((c): c is Extract<Citation, { type: 'custom' }> => c.type === 'custom'),
  }
}

/**
 * Returns the display label and icon name for a citation type.
 */
export const CITATION_META: Record<Citation['type'], { label: string; icon: string }> = {
  scripture: { label: 'Scripture', icon: 'BookOpen' },
  catechism: { label: 'Catechism', icon: 'BookMarked' },
  'church-father': { label: 'Church Fathers', icon: 'User' },
  council: { label: 'Church Councils', icon: 'Landmark' },
  papal: { label: 'Papal Documents', icon: 'Crown' },
  custom: { label: 'Notes', icon: 'FileText' },
}
