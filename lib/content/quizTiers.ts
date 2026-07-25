export const QUIZ_TIERS = ['beginner', 'intermediate', 'advanced'] as const
export type QuizTier = (typeof QUIZ_TIERS)[number]

export function isQuizTier(v: unknown): v is QuizTier {
  return typeof v === 'string' && (QUIZ_TIERS as readonly string[]).includes(v)
}

/** The tier that must be passed before `tier` unlocks, or null for the first tier. */
export function previousTier(tier: QuizTier): QuizTier | null {
  const idx = QUIZ_TIERS.indexOf(tier)
  return idx > 0 ? QUIZ_TIERS[idx - 1] : null
}
