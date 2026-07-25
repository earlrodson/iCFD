const QUIZ_TIERS = ['beginner', 'intermediate', 'advanced'] as const

/**
 * A topic with an authored quiz bank is "complete" once any tier is passed;
 * a topic with no quiz yet falls back to the manual read toggle.
 */
export function isTopicComplete(
  topicId: string,
  hasQuiz: boolean,
  passed: Set<string>,
  isRead: boolean,
): boolean {
  if (!hasQuiz) return isRead
  return QUIZ_TIERS.some((tier) => passed.has(`${topicId}:${tier}`))
}
