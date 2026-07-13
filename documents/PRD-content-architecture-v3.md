# PRD — iCFD Content Architecture v3.0
# Unified Citations · Structured Answers · Three Presentation Modes

**Version:** 3.0  
**Date:** 2026-07-13  
**Status:** Approved for Implementation  
**Baseline:** PRD-enhanced.md (v2.0)

---

## 1. Problem Statement

The current content schema has three structural gaps that block the app's growth:

| Gap | Impact |
|-----|--------|
| Sources are siloed (`scripture[]`, `catechism[]`, `churchFathers[]`) | Cannot add new source types (papal docs, councils) without schema changes each time |
| Scripture text is embedded inline | No path to Bible API caching; verse text duplicated across topics |
| `answer` is an opaque string | Cannot serve three distinct presentation modes from one data model |

---

## 2. Goals

| # | Goal | Metric |
|---|------|--------|
| G1 | One extensible citation type covers all source categories | Zero new schema fields needed to add a new source type |
| G2 | Three presentation modes: Full, Concise, Guide | Toggle available on every topic detail page |
| G3 | Bible chapter caching — fetch once, reuse across topics | Cache hit rate ≥ 90% after first topic load per session |
| G4 | Backward-compatible migration — existing topics valid throughout | `pnpm validate` passes on old and new content simultaneously |

---

## 3. Users

**Lay Defender (primary):** Needs quick-reference answers during real conversations. Uses **Guide mode** for debate prep — reference + context only, no reading wall of text.

**Student / Catechist (secondary):** Wants to understand the full reasoning. Uses **Full mode** for study.

**Casual Reader:** Skims for the key point. Uses **Concise mode** — 2–3 sentence summary.

---

## 4. Feature Specifications

---

### 4.1 Unified Citation Schema

Replace the three separate source arrays with a single polymorphic `citations` array using a discriminated union on `type`.

#### Supported citation types

| type | Use case | Required fields |
|------|----------|-----------------|
| `scripture` | Bible verses | `reference`, `book`, `chapter`, `verse`, `version`, `fallbackText` |
| `catechism` | CCC paragraphs | `reference`, `text?` |
| `church-father` | Patristic quotes | `author`, `quote`, `source`, `year?` |
| `council` | Ecumenical councils | `council`, `document`, `text?`, `year?` |
| `papal` | Encyclicals, Apostolic letters | `pope`, `document`, `text?`, `year?` |
| `custom` | Original explanations, clarifications | `label`, `text` |

#### `context` field (all types)

Every citation carries an optional `context: string` — 1–2 sentences explaining *why this citation proves the apologetics point*. This is the key field powering **Guide mode**.

#### Schema definition

```typescript
// data/schema/citation.schema.ts
const ScriptureRefSchema = z.object({
  type: z.literal('scripture'),
  reference: z.string(),       // "John 3:16"
  book: z.string(),            // "John"
  chapter: z.number(),         // 3
  verse: z.string(),           // "16" or "16-18"
  version: z.string(),         // "NABRE"
  fallbackText: z.string(),    // shown offline when chapter not cached
  context: z.string().optional(),
});

const CatechismRefSchema = z.object({
  type: z.literal('catechism'),
  reference: z.string(),       // "CCC 1374"
  text: z.string().optional(),
  context: z.string().optional(),
});

const ChurchFatherSchema = z.object({
  type: z.literal('church-father'),
  author: z.string(),
  quote: z.string(),
  source: z.string(),
  year: z.string().optional(),
  context: z.string().optional(),
});

const CouncilSchema = z.object({
  type: z.literal('council'),
  council: z.string(),
  document: z.string(),
  text: z.string().optional(),
  year: z.string().optional(),
  context: z.string().optional(),
});

const PapalSchema = z.object({
  type: z.literal('papal'),
  pope: z.string(),
  document: z.string(),
  text: z.string().optional(),
  year: z.string().optional(),
  context: z.string().optional(),
});

const CustomSchema = z.object({
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
  CustomSchema,
]);

export type Citation = z.infer<typeof CitationSchema>;
```

#### Backward-compatible migration

During migration, keep `scripture`, `catechism`, and `churchFathers` as deprecated optional fields so existing content continues to pass validation. The loader maps old fields → `citations` array at runtime.

---

### 4.2 Structured Answer

Replace `answer: string` with a structured object.

```typescript
const AnswerSchema = z.object({
  summary: z.string(),                      // 2–3 sentences — Concise mode
  full: z.string(),                         // full apologetics explanation — Full mode
  keyPoints: z.array(z.string()).optional(), // bullet-point version — optional UI aid
});
```

**Migration:** Existing `answer: string` fields are treated as `answer.full`; `answer.summary` defaults to first 2 sentences of `full` until content authors add explicit summaries.

---

### 4.3 Three Presentation Modes

#### Mode definitions

| Mode | Trigger | Answer shown | Citation shown |
|------|---------|-------------|----------------|
| **Full** | Default | `answer.full` | Complete text for each citation |
| **Concise** | Reader skimming | `answer.summary` | Grouped by type; no blockquotes |
| **Guide** | Debate / dialogue prep | `answer.summary` | `reference` + `context` only — no full verse text |

#### UI

- Mode toggle: 3-button segmented control displayed at the top of the topic detail page
- Persisted per-session in Zustand (not saved across sessions — user may want different modes at different times)
- Keyboard shortcut: `1` / `2` / `3` while viewing a topic

#### Guide mode detail

In Guide mode, a scripture citation renders as:

```
John 3:16 (NABRE)
→ Shows God's unconditional love as the foundation for salvation — refutes the 
  idea that we must earn God's favor.
```

No full verse text. No blockquotes. Just the reference and the reason it matters. This is the debate-ready card format.

---

### 4.4 Bible Chapter Caching

#### New IndexedDB store

```typescript
// lib/db/schema.ts — added to DefenderDB
bibleChapters: {
  key: string;                          // "NABRE-John-3"
  book: string;                         // "John"
  chapter: number;                      // 3
  version: string;                      // "NABRE"
  verses: Record<string, string>;       // { "1": "In the beginning...", "16": "..." }
  fetchedAt: number;
  expiresAt: number;                    // 30-day TTL
};
```

#### Verse resolver (`lib/scripture/resolver.ts`)

Resolution order:
1. Check `bibleChapters` IndexedDB store by key `"{version}-{book}-{chapter}"`
2. If miss and online → fetch chapter from Bible API, store full chapter
3. If miss and offline → render `citation.fallbackText`
4. Extract the specific verse(s) from the chapter data

**Bible API:** Configurable via env var `NEXT_PUBLIC_BIBLE_API_URL`. Default target: `api.bible` (free tier, NABRE available). Deferred for Phase 2 — Phase 1 uses `fallbackText` only.

#### Why chapters, not verses

Fetching by chapter means one network request populates data for all topics citing any verse in that chapter. John 3 alone covers at least 4 different apologetics topics. Chapter-level caching gives maximum reuse per request.

---

### 4.5 Updated Topic Schema

```typescript
// data/schema/topic.schema.ts
export const TopicSchema = z.object({
  id: z.string(),
  category: z.enum([
    'sacraments', 'mary', 'papacy', 'salvation',
    'bible', 'saints', 'tradition', 'church-teaching'
  ]),
  title: z.string(),
  question: z.string(),
  answer: z.union([AnswerSchema, z.string()]),  // string = legacy, migrated at runtime
  citations: z.array(CitationSchema).optional(), // new unified field
  // Legacy fields — kept for backward compatibility, deprecated
  scripture: z.array(LegacyScriptureSchema).optional(),
  catechism: z.array(z.string()).optional(),
  churchFathers: z.array(LegacyChurchFatherSchema).optional(),
  tags: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  lang: z.enum(['en', 'tl', 'ceb']),
  relatedTopics: z.array(z.string()).optional(),
  lastUpdated: z.string(),
});
```

---

## 5. Content Migration Plan

### Step 1 — Schema update (no content change)
Update Zod to accept both old and new formats. Run `pnpm validate`. All 20 existing topics pass.

### Step 2 — Loader migration shim
`ContentLoader.loadContent()` maps legacy `scripture`/`catechism`/`churchFathers` to `citations[]` in memory. UI code reads only `citations`.

### Step 3 — Content authoring
Update `public/data/content/en/handbook.json` to use new `citations[]` and `answer` object format. Run `pnpm validate`. Run `pnpm index` to rebuild search index.

### Step 4 — Deprecate legacy fields
Once all 20 English topics are migrated, remove legacy field support from schema.

---

## 6. Technical Requirements

| Concern | Requirement |
|---------|-------------|
| Schema | Zod discriminated union — TypeScript exhaustively checks citation types |
| DB migration | IndexedDB version bump from v1 → v2; add `bibleChapters` store |
| Backward compat | `pnpm validate` passes on both old-format and new-format topics simultaneously |
| Search | MiniSearch indexes `citations[].context` in addition to current fields |
| Offline | `fallbackText` always present on scripture citations — no blank verses offline |
| Performance | Chapter cache resolved before topic page paint — no layout shift from async verse fetch |

---

## 7. Out of Scope (v3)

- Actual Bible API integration (Phase 2 — `fallbackText` covers offline use)
- Tagalog / Cebuano content migration (English first, then parallel)
- Verse-level annotation / highlighting
- Community citation submission

---

## 8. Acceptance Criteria

- [ ] `pnpm validate` passes on all 20 English topics in new format
- [ ] All three presentation modes render correctly on the topic detail page
- [ ] Mode toggle persists within a session; resets to Full on app restart
- [ ] Guide mode shows reference + context only — no full verse text visible
- [ ] Concise mode shows `answer.summary` — truncated to ≤ 3 sentences
- [ ] Full mode shows `answer.full` with all citation text
- [ ] `bibleChapters` store present in IndexedDB after DB v2 migration
- [ ] Legacy topics (old format) load and display correctly via migration shim
- [ ] `pnpm type-check` passes — no TypeScript errors
- [ ] `pnpm lint` passes
