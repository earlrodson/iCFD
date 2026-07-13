import { z } from 'zod';

// ─── Citation Schemas ──────────────────────────────────────────────────────────

export const ScriptureRefSchema = z.object({
  type: z.literal('scripture'),
  reference: z.string(),        // "John 3:16"
  text: z.string().optional(),  // full verse text (from cache or fallback)
  version: z.string().optional(),
  context: z.string().optional(), // why this verse matters for the argument
});

export const CatechismRefSchema = z.object({
  type: z.literal('catechism'),
  reference: z.string(),        // "CCC 1374"
  text: z.string().optional(),  // paragraph text
  context: z.string().optional(),
});

export const ChurchFatherSchema = z.object({
  type: z.literal('church-father'),
  author: z.string(),
  quote: z.string(),
  source: z.string(),
  year: z.string().optional(),
  context: z.string().optional(),
});

export const CouncilSchema = z.object({
  type: z.literal('council'),
  council: z.string(),          // "Council of Trent"
  document: z.string(),         // "Session 13, Canon 1"
  text: z.string().optional(),
  year: z.string().optional(),
  context: z.string().optional(),
});

export const PapalSchema = z.object({
  type: z.literal('papal'),
  pope: z.string(),
  document: z.string(),         // "Humanae Vitae §11"
  text: z.string().optional(),
  year: z.string().optional(),
  context: z.string().optional(),
});

export const CustomCitationSchema = z.object({
  type: z.literal('custom'),
  label: z.string(),
  text: z.string(),
  context: z.string().optional(),
});

export const CitationSchema = z.discriminatedUnion('type', [
  ScriptureRefSchema,
  CatechismRefSchema,
  ChurchFatherSchema,
  CouncilSchema,
  PapalSchema,
  CustomCitationSchema,
]);

// ─── Answer Schema ─────────────────────────────────────────────────────────────

export const AnswerSchema = z.object({
  summary: z.string(),                       // 2–3 sentences — Concise & Guide mode
  full: z.string(),                          // complete explanation — Full mode
  keyPoints: z.array(z.string()).optional(), // bullet-point aid (optional)
});

// ─── Legacy field schemas (backward compatibility) ─────────────────────────────

const LegacyScriptureSchema = z.object({
  reference: z.string(),
  text: z.string(),
  version: z.string().optional(),
});

const LegacyChurchFatherSchema = z.object({
  author: z.string(),
  quote: z.string(),
  source: z.string(),
});

// ─── Topic Schema ──────────────────────────────────────────────────────────────

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
  // answer accepts both legacy string and new structured object
  answer: z.union([AnswerSchema, z.string()]),
  // New unified citations field
  citations: z.array(CitationSchema).optional(),
  // Legacy source fields — kept for backward compatibility
  scripture: z.array(LegacyScriptureSchema).optional(),
  catechism: z.array(z.string()).optional(),
  churchFathers: z.array(LegacyChurchFatherSchema).optional(),
  tags: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  lang: z.enum(['en', 'tl', 'ceb']),
  relatedTopics: z.array(z.string()).optional(),
  lastUpdated: z.string(),
});

export const HandbookContentSchema = z.object({
  topics: z.array(TopicSchema),
  metadata: z.object({
    version: z.string(),
    lastUpdated: z.string(),
    totalTopics: z.number()
  })
});

export type Citation = z.infer<typeof CitationSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type HandbookContent = z.infer<typeof HandbookContentSchema>;
