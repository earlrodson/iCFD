import { z } from 'zod';

export const TopicSchema = z.object({
  id: z.string(),
  category: z.enum([
    'sacraments',
    'mary',
    'papacy',
    'salvation',
    'bible',
    'saints',
    'tradition',
    'church-teaching'
  ]),
  title: z.string(),
  question: z.string(),
  answer: z.string(),
  scripture: z.array(z.object({
    reference: z.string(),
    text: z.string(),
    version: z.string().optional()
  })),
  catechism: z.array(z.string()).optional(),
  churchFathers: z.array(z.object({
    author: z.string(),
    quote: z.string(),
    source: z.string()
  })).optional(),
  tags: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  lang: z.enum(['en', 'tl', 'ceb']),
  relatedTopics: z.array(z.string()).optional(),
  lastUpdated: z.string()
});

export const HandbookContentSchema = z.object({
  topics: z.array(TopicSchema),
  metadata: z.object({
    version: z.string(),
    lastUpdated: z.string(),
    totalTopics: z.number()
  })
});

export type Topic = z.infer<typeof TopicSchema>;
export type HandbookContent = z.infer<typeof HandbookContentSchema>;