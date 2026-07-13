# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Catholic Faith Defender (iCFD) is an offline-first PWA for Catholic apologetics content, built with Next.js 15 App Router and static export. It supports English, Tagalog, and Cebuano.

**Stack:** Next.js 15 · TypeScript (strict) · TailwindCSS + shadcn/ui · Zustand · IndexedDB (idb) · MiniSearch · Zod · Jest · Playwright

**Package Manager:** `pnpm`

## Development Commands

```bash
pnpm dev             # Start dev server (default port 3000)
pnpm build           # Static export build → out/
pnpm type-check      # tsc --noEmit
pnpm lint            # next lint (ESLint with next/typescript preset)
pnpm validate        # Validate content JSON structure
pnpm index           # Regenerate search index from content files

# Jest unit tests
pnpm test                          # Run all unit tests
pnpm test:coverage                 # With coverage report
pnpm test -- --testPathPattern=lib/db   # Run a specific test file/dir

# Playwright E2E (dev server must be running on port 3002)
pnpm test:e2e        # All browsers
pnpm test:e2e:headed # Headed mode for debugging
```

## Architecture

### App Router pages
- `app/page.tsx` — Home: loads content, category browsing, search
- `app/[topic]/page.tsx` — Topic detail page
- `app/layout.tsx` — Root layout with PWA setup, offline banner, install prompt

### Data flow
Content is static JSON served from `public/data/content/{lang}/handbook.json` (fetched at runtime by `ContentLoader`). The fetch path is `/data/content/${language}/handbook.json`.

1. `app/page.tsx` calls `useAppStore.initialize()` on mount
2. `useAppStore` calls `contentLoader.loadContent(language)` (singleton in `lib/content/loader.ts`)
3. `ContentLoader` fetches + Zod-validates the JSON, then caches it in memory
4. Topics flow into Zustand (`availableTopics`), rendered via `TopicCard`/`TopicCardGrid`

### State management (Zustand with `persist`)
- `store/useAppStore.ts` — language, topics, settings, loading/error state
- `store/useSearchStore.ts` — search query, filters, results
- `store/useFavoritesStore.ts` — local favorites (IndexedDB-backed)

Settings are persisted to localStorage via `zustand/middleware/persist`.

### Offline storage
`lib/db/indexeddb.ts` wraps IndexedDB via `idb`. Schema defined in `lib/db/schema.ts`. Used for favorites and caching.

### Search
`lib/search/minisearch-engine.ts` wraps MiniSearch for offline full-text search across topics. `lib/search/search-index.ts` manages the index lifecycle.

### Content schema
Zod schema lives in `data/schema/topic.schema.ts`. Key types: `Topic` and `HandbookContent`.

```typescript
// Topic fields
id, category, title, question, answer,
scripture: [{reference, text, version?}],
catechism?: string[],
churchFathers?: [{author, quote, source}],
tags, difficulty: 'beginner'|'intermediate'|'advanced',
lang: 'en'|'tl'|'ceb',
relatedTopics?, lastUpdated
```

Valid categories: `sacraments | mary | papacy | salvation | bible | saints | tradition | church-teaching`

### PWA
Service worker via `@ducanh2912/next-pwa` (disabled in dev). SW is built to `public/sw.js` and `public/workbox-*.js` during build. `next.config.js` uses `output: 'export'` — no SSR/API routes, everything is client-side.

### Path aliases (tsconfig.json)
`@/*` maps to the repo root.

## Adding Content

When adding or updating apologetics content:
1. Edit `public/data/content/{lang}/handbook.json` for each language
2. Keep topic `id` values consistent across all three language files
3. Run `pnpm validate` to check schema conformance
4. Run `pnpm index` to regenerate the search index

## Testing Strategy

**Coverage thresholds:** 70% global, 80% for `lib/`, 75% for `components/`

Jest tests are co-located in `__tests__/` directories alongside source files. Integration tests live in `__tests__/integration/`. Test environment is jsdom; IndexedDB is mocked with `fake-indexeddb`.

E2E tests in `e2e/*.spec.ts` run against the dev server on port 3002 (set in `playwright.config.ts`). Run `pnpm dev` first when running E2E tests locally.

## Known Issues

- ESLint uses the deprecated `next/typescript` preset (eslint-config-next 14.2.0 pinned); some lint rules may conflict with Next.js 15
- TypeScript errors exist in some test files due to missing jest setup type exports
- Language type enforcement inconsistencies between stores and components
