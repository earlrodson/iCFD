import { z } from 'zod'

export const ScriptureSchema = z.object({
  reference: z.string(),
  text: z.string(),
  version: z.string().optional(),
})

export const ChurchFatherSchema = z.object({
  author: z.string(),
  quote: z.string(),
  source: z.string(),
})

export const CategorySchema = z.enum([
  'sacraments',
  'mary',
  'papacy',
  'salvation',
  'bible',
  'saints',
  'tradition',
  'church-teaching',
])

export const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced'])

export const LanguageSchema = z.enum(['en', 'tl', 'ceb'])

export const ObjectionSchema = z.object({
  objection: z.string(),
  response: z.string(),
})

export const DocumentRefSchema = z.object({
  docSlug:      z.string(),
  docTitle:     z.string(),
  sectionNum:   z.number(),
  sectionLabel: z.string().nullable(),
})

export const TopicSchema = z.object({
  id: z.string(),
  category: CategorySchema,
  title: z.string(),
  question: z.string(),
  answer: z.string(),
  answerFull: z.string().optional(),
  coverImage: z.string().url().optional(),
  scripture: z.array(ScriptureSchema),
  catechism: z.array(z.string()).optional(),
  churchFathers: z.array(ChurchFatherSchema).optional(),
  objections: z.array(ObjectionSchema).optional(),
  tags: z.array(z.string()),
  difficulty: DifficultySchema,
  lang: LanguageSchema,
  relatedTopics: z.array(z.string()).optional(),
  documentRefs: z.array(DocumentRefSchema).optional(),
  lastUpdated: z.string(),
})

export const HandbookContentSchema = z.object({
  topics: z.array(TopicSchema),
})

export type Scripture = z.infer<typeof ScriptureSchema>
export type ChurchFather = z.infer<typeof ChurchFatherSchema>
export type Objection = z.infer<typeof ObjectionSchema>
export type Category = z.infer<typeof CategorySchema>
export type Difficulty = z.infer<typeof DifficultySchema>
export type Language = z.infer<typeof LanguageSchema>
export type DocumentRef = z.infer<typeof DocumentRefSchema>
export type Topic = z.infer<typeof TopicSchema>
export type HandbookContent = z.infer<typeof HandbookContentSchema>
