import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
  primaryKey,
  unique,
  index,
  bigserial,
  boolean,
  numeric,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const TIERS = ['beginner', 'intermediate', 'advanced'] as const
export type Tier = typeof TIERS[number]

// ── Enums ──────────────────────────────────────────────────────────────────────

export const LANGUAGES = ['en', 'tl', 'ceb'] as const
export const CATEGORIES = [
  'sacraments', 'mary', 'papacy', 'salvation',
  'bible', 'saints', 'tradition', 'church-teaching',
] as const
export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const
export const THEMES = ['light', 'dark', 'system'] as const
export const FONT_SIZES = ['small', 'medium', 'large'] as const
export const ROLES = ['user', 'editor', 'admin'] as const
export type Role = typeof ROLES[number]

// ── Public content tables ──────────────────────────────────────────────────────

/**
 * All apologetics topics. One row per (topic_slug, language) pair.
 * Content is public-readable; writes restricted to service role.
 */
export const topics = pgTable(
  'topics',
  {
    id: text('id').notNull(),
    lang: text('lang').notNull().$type<typeof LANGUAGES[number]>(),
    category: text('category').notNull().$type<typeof CATEGORIES[number]>(),
    title: text('title').notNull(),
    question: text('question').notNull(),
    // Either a plain string or { summary, full, keyPoints? }
    answer: jsonb('answer').notNull(),
    // New unified citations (discriminated union array)
    citations: jsonb('citations').default(sql`'[]'::jsonb`),
    // Legacy source fields — kept for backward compatibility
    scripture: jsonb('scripture').default(sql`'[]'::jsonb`),
    catechism: jsonb('catechism').default(sql`'[]'::jsonb`),
    church_fathers: jsonb('church_fathers').default(sql`'[]'::jsonb`),
    tags: jsonb('tags').default(sql`'[]'::jsonb`).notNull(),
    difficulty: text('difficulty').notNull().$type<typeof DIFFICULTIES[number]>(),
    related_topics: jsonb('related_topics').default(sql`'[]'::jsonb`),
    last_updated: timestamp('last_updated', { withTimezone: true }).notNull(),
    last_reviewed: timestamp('last_reviewed', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.id, t.lang] }),
    index('topics_category_idx').on(t.category),
    index('topics_lang_idx').on(t.lang),
    index('topics_difficulty_idx').on(t.difficulty),
  ]
)

/**
 * Curated learning paths (e.g. "New Catholic", "Defend the Faith").
 */
export const paths = pgTable('paths', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  audience: text('audience').notNull(),
  estimated_minutes: integer('estimated_minutes').notNull(),
  difficulty: text('difficulty').notNull().$type<typeof DIFFICULTIES[number]>(),
  icon: text('icon').notNull(),
  // Admin can pin a path above the rest on /paths regardless of created_at.
  pinned: boolean('pinned').default(false).notNull(),
  // 'sequential': a topic's quiz locks until the previous topic in the path
  // has been passed at the same tier. 'agnostic': any order.
  quiz_mode: text('quiz_mode').default('sequential').notNull().$type<'sequential' | 'agnostic'>(),
  // Soft delete — set instead of removing the row, so /admin/paths can list
  // and restore deleted paths. Public read excludes non-null rows.
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

/**
 * Ordered list of topics within each path.
 */
export const pathTopics = pgTable(
  'path_topics',
  {
    path_slug: text('path_slug')
      .notNull()
      .references(() => paths.slug, { onDelete: 'cascade' }),
    topic_id: text('topic_id').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.path_slug, t.topic_id] }),
    index('path_topics_slug_pos_idx').on(t.path_slug, t.position),
  ]
)

// ── Course quizzes & certificates (Phase 11) ────────────────────────────────

/**
 * Per-tier quiz configuration (item count, bank size, pass threshold).
 * Admin-editable via /admin/quiz-settings. Public read.
 */
export const quizSettings = pgTable('quiz_settings', {
  tier: text('tier').primaryKey().$type<Tier>(),
  item_count: integer('item_count').notNull(),
  bank_size: integer('bank_size').notNull(),
  pass_percent: integer('pass_percent').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

/**
 * Authored question bank per (topic_id, tier). An attempt samples a random
 * item_count subset — correct_index must never be selected out to a client
 * taking the quiz.
 */
export const quizQuestions = pgTable(
  'quiz_questions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    topic_id: text('topic_id').notNull(),
    tier: text('tier').notNull().$type<Tier>(),
    question: text('question').notNull(),
    choices: jsonb('choices').notNull(),
    correct_index: integer('correct_index').notNull(),
    active: boolean('active').default(true).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [index('quiz_questions_topic_tier_idx').on(t.topic_id, t.tier)]
)

/**
 * Admin-uploaded certificate background image per tier + drag-placed field
 * coordinates ({ field, x, y, font_size, font_family, color, align }[]).
 */
export const certificateTemplates = pgTable('certificate_templates', {
  tier: text('tier').primaryKey().$type<Tier>(),
  base_image_url: text('base_image_url').notNull(),
  placeholders: jsonb('placeholders').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

// ── User data tables (RLS-protected) ──────────────────────────────────────────

/**
 * One row per submitted quiz attempt. question_ids records exactly which
 * rotated subset was served, so rotation is auditable, not just
 * random-at-render. Never client-writable — scoring happens server-side.
 */
export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id').notNull(),
    topic_id: text('topic_id').notNull(),
    tier: text('tier').notNull().$type<Tier>(),
    question_ids: jsonb('question_ids').notNull(),
    answers: jsonb('answers').notNull(),
    score_percent: numeric('score_percent').notNull(),
    passed: boolean('passed').notNull(),
    attempted_at: timestamp('attempted_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    index('quiz_attempts_user_topic_tier_idx').on(t.user_id, t.topic_id, t.tier, t.attempted_at),
  ]
)

/**
 * The "done" ledger: one row per (user, topic, tier) the user has passed.
 */
export const courseProgress = pgTable(
  'course_progress',
  {
    user_id: uuid('user_id').notNull(),
    topic_id: text('topic_id').notNull(),
    tier: text('tier').notNull().$type<Tier>(),
    passed_at: timestamp('passed_at', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.topic_id, t.tier] })]
)

/**
 * Issued once course_progress covers all course topics for a tier.
 * Permanent once issued — later quiz re-attempts never revoke it.
 */
export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id').notNull(),
    tier: text('tier').notNull().$type<Tier>(),
    serial_code: text('serial_code').notNull().unique(),
    issued_at: timestamp('issued_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    pdf_url: text('pdf_url').notNull(),
    image_url: text('image_url').notNull(),
  },
  (t) => [unique('certificates_user_tier_key').on(t.user_id, t.tier)]
)

/**
 * Saved topics per user. Synced from IndexedDB on sign-in.
 * RLS: users can only read/write their own rows.
 */
export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    // references auth.users — not a FK to avoid schema coupling
    user_id: uuid('user_id').notNull(),
    topic_id: text('topic_id').notNull(),
    added_at: timestamp('added_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    unique('favorites_user_topic_unique').on(t.user_id, t.topic_id),
    index('favorites_user_id_idx').on(t.user_id),
  ]
)

/**
 * Personal notes per topic per user.
 */
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id').notNull(),
    topic_id: text('topic_id').notNull(),
    text: text('text').notNull().default(''),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    unique('notes_user_topic_unique').on(t.user_id, t.topic_id),
    index('notes_user_id_idx').on(t.user_id),
  ]
)

/**
 * Tracks which topics a user has marked as read.
 */
export const readProgress = pgTable(
  'read_progress',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id').notNull(),
    topic_id: text('topic_id').notNull(),
    read_at: timestamp('read_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    unique('read_progress_user_topic_unique').on(t.user_id, t.topic_id),
    index('read_progress_user_id_idx').on(t.user_id),
  ]
)

/**
 * Topic view history per user (deduplicated — upsert on viewed_at).
 * Used for "Continue Reading" on the home page.
 */
export const viewHistory = pgTable(
  'view_history',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id').notNull(),
    topic_id: text('topic_id').notNull(),
    viewed_at: timestamp('viewed_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    unique('view_history_user_topic_unique').on(t.user_id, t.topic_id),
    index('view_history_user_viewed_at_idx').on(t.user_id, t.viewed_at),
  ]
)

/**
 * Per-user settings (language, theme, font size).
 * Synced from localStorage on sign-in.
 */
export const userSettings = pgTable('user_settings', {
  user_id: uuid('user_id').primaryKey(),
  role: text('role').notNull().default('user').$type<Role>(),
  display_name: text('display_name'),
  avatar_url: text('avatar_url'),
  language: text('language')
    .default('en')
    .notNull()
    .$type<typeof LANGUAGES[number]>(),
  theme: text('theme')
    .default('system')
    .notNull()
    .$type<typeof THEMES[number]>(),
  font_size: text('font_size')
    .default('medium')
    .notNull()
    .$type<typeof FONT_SIZES[number]>(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

/**
 * Key-value store for backend-managed app configuration.
 * Allows admins to override build-time env vars (e.g. appName) without redeploying.
 * Client reads NEXT_PUBLIC_* env vars; the admin panel syncs changes to this table.
 * See lib/config.ts for the full list of recognized keys.
 */
export const siteConfig = pgTable('site_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export type SiteConfigRow = typeof siteConfig.$inferSelect

// ── Inferred types ─────────────────────────────────────────────────────────────

export type TopicRow = typeof topics.$inferSelect
export type TopicInsert = typeof topics.$inferInsert
export type PathRow = typeof paths.$inferSelect
export type PathInsert = typeof paths.$inferInsert
export type PathTopicRow = typeof pathTopics.$inferSelect
export type FavoriteRow = typeof favorites.$inferSelect
export type NoteRow = typeof notes.$inferSelect
export type ReadProgressRow = typeof readProgress.$inferSelect
export type ViewHistoryRow = typeof viewHistory.$inferSelect
export type UserSettingsRow = typeof userSettings.$inferSelect
