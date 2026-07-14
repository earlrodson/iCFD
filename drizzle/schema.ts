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
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

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

// ── User data tables (RLS-protected) ──────────────────────────────────────────

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
