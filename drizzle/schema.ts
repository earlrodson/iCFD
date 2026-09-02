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
  date,
  doublePrecision,
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
    // Full markdown essay — comprehensive content for the Comprehensive tab
    answer_full: text('answer_full'),
    // New unified citations (discriminated union array)
    citations: jsonb('citations').default(sql`'[]'::jsonb`),
    // Legacy source fields — kept for backward compatibility
    scripture: jsonb('scripture').default(sql`'[]'::jsonb`),
    catechism: jsonb('catechism').default(sql`'[]'::jsonb`),
    church_fathers: jsonb('church_fathers').default(sql`'[]'::jsonb`),
    objections: jsonb('objections').default(sql`'[]'::jsonb`),
    tags: jsonb('tags').default(sql`'[]'::jsonb`).notNull(),
    difficulty: text('difficulty').notNull().$type<typeof DIFFICULTIES[number]>(),
    related_topics: jsonb('related_topics').default(sql`'[]'::jsonb`),
    published: boolean('published').default(true).notNull(),
    is_recommended: boolean('is_recommended').default(false).notNull(),
    cover_image: text('cover_image'),
    video_url: text('video_url'),
    // manual | machine | stub — controls auto-translate behaviour
    translation_source: text('translation_source').default('manual').notNull(),
    // Per-topic translator instructions injected into the AI prompt
    translation_notes: text('translation_notes'),
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
    lang: text('lang').default('en').notNull().$type<typeof LANGUAGES[number]>(),
    question: text('question').notNull(),
    choices: jsonb('choices').notNull(),
    correct_index: integer('correct_index').notNull(),
    active: boolean('active').default(true).notNull(),
    // NULL = generic/reusable by any path that includes this topic (the
    // default for every question authored so far). Set = scoped to just
    // that path's quiz, alongside the generic pool.
    path_slug: text('path_slug').references(() => paths.slug, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [index('quiz_questions_topic_tier_lang_path_idx').on(t.topic_id, t.tier, t.lang, t.path_slug)]
)

/**
 * Admin-uploaded certificate background image per (path, tier) + drag-placed
 * field coordinates ({ field, x, y, font_size, font_family, color, align }[]).
 */
export const certificateTemplates = pgTable(
  'certificate_templates',
  {
    path_slug: text('path_slug')
      .notNull()
      .references(() => paths.slug),
    tier: text('tier').notNull().$type<Tier>(),
    base_image_url: text('base_image_url').notNull(),
    placeholders: jsonb('placeholders').notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.path_slug, t.tier] })]
)

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
    duration_ms: integer('duration_ms'),
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
 * Issued once course_progress covers every topic in a path at a tier.
 * One certificate per (user, path, tier) — a user can earn the same tier
 * separately on each path they complete. Permanent once issued — later
 * quiz re-attempts never revoke it.
 */
export const certificates = pgTable(
  'certificates',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    user_id: uuid('user_id').notNull(),
    path_slug: text('path_slug')
      .notNull()
      .references(() => paths.slug),
    tier: text('tier').notNull().$type<Tier>(),
    serial_code: text('serial_code').notNull().unique(),
    issued_at: timestamp('issued_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    // Rendered on demand (base template + overlaid name), not pre-generated —
    // kept for a possible future static export/download feature.
    pdf_url: text('pdf_url'),
    image_url: text('image_url'),
  },
  (t) => [unique('certificates_user_path_tier_key').on(t.user_id, t.path_slug, t.tier)]
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
 * One row per pageview, keyed by a client-generated `visitor_id` (persisted
 * in localStorage) that stays stable whether or not the visitor is signed
 * in. Powers /admin/analytics: per-page (micro) stats, path→path navigation
 * flow, coarse geo (country/region resolved server-side, never raw IP), and
 * guest-vs-account visitor counts. No client-side access — RLS enabled with
 * zero policies; written via /api/analytics/* routes (service role) and read
 * via SECURITY DEFINER RPCs (admin-only).
 */
export const pageViews = pgTable(
  'page_views',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    visitor_id: uuid('visitor_id').notNull(),
    user_id: uuid('user_id'),
    path: text('path').notNull(),
    referrer_path: text('referrer_path'),
    country: text('country'),
    region: text('region'),
    device_type: text('device_type').$type<'mobile' | 'tablet' | 'desktop'>(),
    duration_ms: integer('duration_ms'),
    created_at: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    index('page_views_path_idx').on(t.path),
    index('page_views_created_at_idx').on(t.created_at),
    index('page_views_visitor_created_idx').on(t.visitor_id, t.created_at),
    index('page_views_country_idx').on(t.country),
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
  // ── Profile — every user ──
  first_name: text('first_name'),
  last_name: text('last_name'),
  age: integer('age'),
  location: text('location'),
  certifications: text('certifications').array().default(sql`'{}'::text[]`),
  mobile_number: text('mobile_number'),
  // ── CFD membership — only shown in the UI when is_cfd_member is true ──
  is_cfd_member: boolean('is_cfd_member').default(false).notNull(),
  chapter: text('chapter'),
  diocese: text('diocese'),
  chapter_id: uuid('chapter_id'),
  cfd_id_image_path: text('cfd_id_image_path'),
  membership_date: date('membership_date'),
  membership_expiration: date('membership_expiration'),
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

// ── Reference & library tables ──────────────────────────────────────────────────

/**
 * Full Bible text, one row per (reference, version). Linked into topics via
 * integer IDs resolved at content-authoring time.
 */
export const scriptureVerses = pgTable('scripture_verses', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  reference: text('reference').notNull(),
  version: text('version').default('NABRE').notNull(),
  text: text('text').notNull(),
  book: text('book'),
  chapter: integer('chapter'),
  verse_start: integer('verse_start'),
  verse_end: integer('verse_end'),
  book_code: text('book_code'),
})

/**
 * Catechism of the Catholic Church, one row per (paragraph, lang).
 */
export const cccParagraphs = pgTable(
  'ccc_paragraphs',
  {
    paragraph: integer('paragraph').notNull(),
    text: text('text'),
    summary: text('summary'),
    section: text('section'),
    lang: text('lang').default('en').notNull(),
    part: text('part'),
    chapter_title: text('chapter_title'),
    article: text('article'),
  },
  (t) => [primaryKey({ columns: [t.paragraph, t.lang] })]
)

/**
 * Patristic and conciliar quote library. Linked into topics via integer IDs.
 */
export const churchFatherQuotes = pgTable('church_father_quotes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  author: text('author').notNull(),
  quote: text('quote').notNull(),
  source: text('source').notNull(),
  year_approx: integer('year_approx'),
})

/**
 * General Instruction of the Roman Missal, one row per (article, lang).
 */
export const girmArticles = pgTable(
  'girm_articles',
  {
    article: integer('article').notNull(),
    lang: text('lang').default('en').notNull(),
    text: text('text').notNull(),
    summary: text('summary'),
    section: text('section'),
  },
  (t) => [primaryKey({ columns: [t.article, t.lang] })]
)

/**
 * Code of Canon Law, one row per (canon, lang).
 */
export const canons = pgTable(
  'canons',
  {
    canon: integer('canon').notNull(),
    lang: text('lang').default('en').notNull(),
    text: text('text').notNull(),
    summary: text('summary'),
    book: text('book'),
  },
  (t) => [primaryKey({ columns: [t.canon, t.lang] })]
)

/**
 * Metadata for each church document (encyclical, council, etc.) shown in the Library.
 */
export const churchDocumentMeta = pgTable('church_document_meta', {
  slug: text('slug').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  author: text('author'),
  year: integer('year'),
  description: text('description'),
  free_access: boolean('free_access').default(true),
  sort_order: integer('sort_order').default(100),
})

/**
 * Sectioned full text of each church document, keyed to church_document_meta.
 */
export const churchDocuments = pgTable(
  'church_documents',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    slug: text('slug')
      .notNull()
      .references(() => churchDocumentMeta.slug),
    section_num: integer('section_num').notNull(),
    section_label: text('section_label'),
    text: text('text'),
    summary: text('summary'),
    created_at: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  },
)

/**
 * Cross-references from a topic to a specific church-document section.
 */
export const topicDocumentRefs = pgTable('topic_document_refs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  topic_id: text('topic_id').notNull(),
  doc_slug: text('doc_slug')
    .notNull()
    .references(() => churchDocumentMeta.slug),
  section_num: integer('section_num').notNull(),
  section_label: text('section_label'),
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
})

/**
 * Shared theological-term glossary, linked into topics via topic_terms.
 */
export const theologicalTerms = pgTable('theological_terms', {
  slug: text('slug').primaryKey(),
  term: text('term').notNull(),
  pronunciation: text('pronunciation'),
  language: text('language').default('Greek').notNull(),
  root_text: text('root_text'),
  root_meaning: text('root_meaning').notNull(),
  definition: text('definition').notNull(),
  debate_note: text('debate_note'),
  keywords: text('keywords'),
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
})

/**
 * Join table linking topics to glossary terms they reference.
 */
export const topicTerms = pgTable(
  'topic_terms',
  {
    topic_id: text('topic_id').notNull(),
    term_slug: text('term_slug')
      .notNull()
      .references(() => theologicalTerms.slug),
  },
  (t) => [primaryKey({ columns: [t.topic_id, t.term_slug] })]
)

// ── Admin & moderation tables ─────────────────────────────────────────────────

/**
 * Grants admin/editor access to /admin/*. references auth.users — not a FK
 * to avoid schema coupling, matching the convention used by other user_id columns.
 */
export const admins = pgTable('admins', {
  user_id: uuid('user_id').primaryKey(),
  email: text('email').notNull(),
  granted_by: uuid('granted_by'),
  role: text('role').default('admin').notNull().$type<'admin' | 'editor' | 'presenter'>(),
  created_at: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

// ── Org structure: National -> Diocese -> Chapter, boards & officers ────────

/**
 * A diocese. Direct parent of chapters; the single National level is
 * implicit (not a row here).
 */
export const dioceses = pgTable('dioceses', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

/** A Parish or School chapter, belonging to exactly one diocese. */
export const chapters = pgTable('chapters', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  type: text('type').notNull().$type<'parish' | 'school'>(),
  diocese_id: uuid('diocese_id').notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  created_at: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const BOARD_LEVELS = ['national', 'diocese', 'chapter'] as const
export type BoardLevel = typeof BOARD_LEVELS[number]

/** Admin-configurable max board seats per level (not per org-unit instance). */
export const boardSeatLimits = pgTable('board_seat_limits', {
  level: text('level').primaryKey().$type<BoardLevel>(),
  max_seats: integer('max_seats').notNull(),
})

export const OFFICES = [
  'spiritual_adviser', 'theological_adviser', 'adviser', 'president',
  'internal_vice_president', 'external_vice_president', 'secretary',
  'treasurer', 'auditor', 'pio',
] as const
export type Office = typeof OFFICES[number]

/**
 * Board membership at a given level/org unit, with an optional officer
 * title on the same row — assigning an office requires the row (i.e. board
 * membership) to already exist.
 */
export const boardMembers = pgTable('board_members', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  level: text('level').notNull().$type<BoardLevel>(),
  diocese_id: uuid('diocese_id'),
  chapter_id: uuid('chapter_id'),
  user_id: uuid('user_id').notNull(),
  office: text('office').$type<Office | null>(),
  created_at: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

// ── Admin & moderation tables ─────────────────────────────────────────────────

/**
 * Per-topic slide decks, generated offline and rendered dynamically by a
 * client-side viewer. Viewing is restricted to CFD members via RLS; writes
 * are restricted to admins/presenters via the admin API.
 */
export const presentations = pgTable('presentations', {
  topic_id: text('topic_id').primaryKey(),
  slides: jsonb('slides').notNull(),
  published: boolean('published').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  last_updated: timestamp('last_updated', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

/**
 * Public "suggest a topic" submissions, reviewed by admins before becoming a topic.
 */
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  title: text('title').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull(),
  scripture_refs: text('scripture_refs'),
  submitter_notes: text('submitter_notes'),
  submitted_by: uuid('submitted_by'),
  status: text('status').default('pending').notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

/**
 * Public "Our History" timeline entries, admin-managed, rendered on /history.
 */
export const historyTimeline = pgTable('history_timeline', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  year: text('year').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  icon: text('icon').default('users').notNull(),
  sort_order: integer('sort_order').default(0).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

/**
 * National presidents table shown alongside the /history timeline.
 */
export const historyPresidents = pgTable('history_presidents', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  years: text('years').notNull(),
  sort_order: integer('sort_order').default(0).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

/**
 * Web Push subscriptions for browser notifications.
 */
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid('user_id'),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
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
export type PageViewRow = typeof pageViews.$inferSelect
export type PageViewInsert = typeof pageViews.$inferInsert
export type ScriptureVerseRow = typeof scriptureVerses.$inferSelect
export type CccParagraphRow = typeof cccParagraphs.$inferSelect
export type ChurchFatherQuoteRow = typeof churchFatherQuotes.$inferSelect
export type GirmArticleRow = typeof girmArticles.$inferSelect
export type CanonRow = typeof canons.$inferSelect
export type ChurchDocumentMetaRow = typeof churchDocumentMeta.$inferSelect
export type ChurchDocumentRow = typeof churchDocuments.$inferSelect
export type TopicDocumentRefRow = typeof topicDocumentRefs.$inferSelect
export type TheologicalTermRow = typeof theologicalTerms.$inferSelect
export type TopicTermRow = typeof topicTerms.$inferSelect
export type AdminRow = typeof admins.$inferSelect
export type DioceseRow = typeof dioceses.$inferSelect
export type ChapterRow = typeof chapters.$inferSelect
export type BoardSeatLimitRow = typeof boardSeatLimits.$inferSelect
export type BoardMemberRow = typeof boardMembers.$inferSelect
export type PresentationRow = typeof presentations.$inferSelect
export type PresentationInsert = typeof presentations.$inferInsert
export type SubmissionRow = typeof submissions.$inferSelect
export type HistoryTimelineRow = typeof historyTimeline.$inferSelect
export type HistoryPresidentRow = typeof historyPresidents.$inferSelect
export type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect
