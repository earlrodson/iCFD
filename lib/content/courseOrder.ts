'use client'

import { useEffect, useState } from 'react'
import { fetchPathBySlug } from './paths'

const COURSE_SLUG = 'basic-apologetics-course'

/** Live-fetched (topic_id -> lesson position) map for the flagship course. */
export function useCourseTopicOrder() {
  const [order, setOrder] = useState<Map<string, number> | null>(null)

  useEffect(() => {
    fetchPathBySlug(COURSE_SLUG).then((path) => {
      if (path) setOrder(new Map(path.topicIds.map((id, i) => [id, i])))
    })
  }, [])

  return order
}

/**
 * Pins course topics first, in lesson order, ahead of everything else —
 * relies on Array.prototype.sort's stability (guaranteed since ES2019) to
 * leave the existing relative order of non-course topics untouched.
 */
export function sortWithCourseFirst<T extends { id: string }>(
  topics: T[],
  order: Map<string, number> | null,
): T[] {
  if (!order) return topics
  return [...topics].sort((a, b) => {
    const ai = order.get(a.id)
    const bi = order.get(b.id)
    if (ai !== undefined && bi !== undefined) return ai - bi
    if (ai !== undefined) return -1
    if (bi !== undefined) return 1
    return 0
  })
}
