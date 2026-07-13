import { z } from 'zod'

export const PathSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  audience: z.string(),
  estimatedMinutes: z.number(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  icon: z.string(),
  topics: z.array(z.string()),
})

export type Path = z.infer<typeof PathSchema>

export const PathsSchema = z.array(PathSchema)
