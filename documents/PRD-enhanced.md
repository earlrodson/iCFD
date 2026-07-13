# PRD — Catholic Faith Defender Enhanced (v2.0)

**Version:** 2.0  
**Date:** 2026-07-10  
**Status:** Proposed  
**Baseline:** PRD-current.md (Phase 1)

---

## 1. Vision

Transform iCFD from a static reference handbook into a living, personalized apologetics companion that Catholics can rely on daily — online or offline — in their native language, with content that grows through community contributions and guided learning paths.

---

## 2. Goals

| # | Goal | Success Metric |
|---|------|----------------|
| G1 | Fix all Phase 1 gaps so the app is fully functional | Zero open B-series bugs |
| G2 | Expand content to 100+ topics across all 8 categories | ≥ 100 published topics per language |
| G3 | Make every feature work in all three languages end-to-end | Language parity on all pages |
| G4 | Give users a personal space (favorites, reading history, notes) | 30-day retention ≥ 40% |
| G5 | Enable guided learning paths for different user types | 3+ curated paths published |
| G6 | Support community-driven content (Phase 3 prerequisite) | Content submission form live |

---

## 3. Users

**Primary — Lay Defender:** Filipino Catholic who needs quick, trustworthy answers during conversations, debates, or personal study. Mobile-first, often offline (e.g., in a church, on a bus).

**Secondary — Catechist / RCIA Facilitator:** Uses the app to prepare lessons, generate handouts, and assign reading. Needs bulk access, print-friendly views, and shareable links.

**Tertiary — Curious Seeker:** Non-Catholic or lapsed Catholic who found the app through a share link and is exploring Catholic teaching.

---

## 4. Feature Specifications

---

### 4.1 Bug Fixes (Phase 1 Completion)

These are prerequisites before any new feature work.

#### 4.1.1 Multilingual Topic Pages
**Problem:** `app/[topic]/page.tsx` hardcodes `language = 'en'`, breaking language parity.  
**Solution:** Make topic pages dynamic client-side components that read `currentLanguage` from `useAppStore`. Since the app is a static export, topic content for all languages must be embedded in `generateStaticParams` or fetched client-side from the JSON files. Recommended approach: render as a `'use client'` component that fetches the correct language's JSON after hydration, with the English version as the pre-rendered fallback.

**Acceptance Criteria:**
- Switching language on the home page and then navigating to a topic shows that topic in the selected language
- Direct URL visits (`/baptism-necessity`) default to the stored language preference
- All 3 language files are included in static generation

#### 4.1.2 Favorites & Share on Topic Detail
**Problem:** Both action buttons are stubs.  
**Solution:**
- Wire "Add to Favorites" to `useFavoritesStore.toggleFavorite(topic.id)`; reflect `isFavorite` state on button
- Implement Share using the Web Share API (`navigator.share`) with fallback copy-to-clipboard

#### 4.1.3 Missing Route Stubs
**Problem:** `/handbook`, `/search`, `/favorites` are in the PWA manifest but return 404.  
**Solution:** Create pages for each (see §4.2, §4.3, §4.4).

#### 4.1.4 PWA Icons
**Problem:** All icon files referenced in `manifest.json` are absent.  
**Solution:** Generate a single source SVG (shield + cross motif in `#1e40af`) and export to all 8 required PNG sizes. Add to `public/icons/`.

#### 4.1.5 Cebuano Static Params
**Problem:** `generateStaticParams` omits `ceb` language.  
**Solution:** Add `'ceb'` to the languages array in `generateStaticParams`.

---

### 4.2 Handbook / Browse Page (`/handbook`)

A dedicated browsing experience replacing the category grid on the home page.

**User story:** *As a user, I want to browse all topics by category so I can explore what's available without needing a specific search query.*

**Requirements:**
- Category sidebar (desktop) / scrollable tabs (mobile) for the 8 theological areas
- Topic list with sort options: Alphabetical, Newest, Difficulty (asc/desc)
- Difficulty filter chips: Beginner / Intermediate / Advanced
- Each topic card shows title, question excerpt, scripture count, difficulty badge
- Infinite scroll or pagination (25 topics per page)
- Empty state with a "Suggest a topic" CTA when a category has no content
- Breadcrumb navigation: Home > Handbook > [Category]
- URL reflects selected category and sort: `/handbook?category=mary&sort=difficulty`
- State persisted so Back button restores scroll position and filters

**Out of scope for this page:** Search (use global search bar in header).

---

### 4.3 Search Page (`/search`)

A full-page search experience replacing the inline header search.

**User story:** *As a user, I want a dedicated search view where I can apply multiple filters and see all results in one place.*

**Requirements:**
- Prominent search input, auto-focused on page load
- Real-time results as user types (debounced 250 ms)
- MiniSearch-powered with fields: `title` (boost 3×), `tags` (boost 2×), `question` (1×), `answer` (1×)
- Filter panel (collapsible on mobile):
  - Language (EN / TL / CEB)
  - Category (multi-select)
  - Difficulty (multi-select)
  - Has Scripture / Has Church Fathers / Has Catechism (toggle chips)
- Results count and "No results" empty state with suggested related topics
- Highlight matching terms in result snippets
- Search history (last 10 queries, stored locally, clearable)
- URL query param sync: `/search?q=baptism&category=sacraments`
- Keyboard navigation: ↑/↓ to move through results, Enter to open

---

### 4.4 Favorites Page (`/favorites`)

**User story:** *As a user, I want a dedicated page to see, organize, and access all my saved topics.*

**Requirements:**
- List of all favorited topics, sorted by date added (newest first)
- Same TopicCard component used in browse/search
- "Remove from favorites" accessible per card without opening the topic
- Sort options: Date Added, Alphabetical, Category, Difficulty
- Group-by-category toggle view
- Empty state with a CTA to Browse Handbook
- Export favorites as JSON (already implemented in store — add UI button)
- Import favorites from JSON file upload
- Favorites count shown in header / nav badge

---

### 4.5 Topic Detail — Full Feature Completion

**Enhancements on top of the Phase 1 stub:**

#### Language Switcher on Topic Page
- Language switcher displayed above the topic header
- Switching language reloads content in the new language without navigation
- If a topic ID does not exist in the target language, show a "Not available in [Language]" banner with a fallback to English

#### Share
- Web Share API (`title`, `text`, `url`) for native OS share sheet on mobile
- Fallback on desktop: copy the topic URL to clipboard with a confirmation toast

#### Print / Export
- "Print" button triggers `window.print()` with a dedicated print CSS that removes nav, shows all sections, removes interactive elements
- "Download as PDF" (Phase 3 — out of scope for v2)

#### Notes (Personal)
- Freetext note field per topic, stored locally in IndexedDB
- Notes visible only to the user; not synced in Phase 2
- Character limit: 1000

#### Reading Progress
- Mark topic as "Read" (distinct from favorited)
- Progress indicator: "X of Y topics read" shown on home page hero and handbook sidebar
- "Read" state stored in IndexedDB alongside favorites

---

### 4.6 Learning Paths

**User story:** *As a catechist, I want a guided sequence of topics so I can assign structured reading to students.*

**Requirements:**
- A `Path` content type: ordered list of topic IDs + metadata (title, description, audience, estimated time)
- 3 launch paths:
  1. **New Catholic** — 10 topics for RCIA candidates (beginner difficulty)
  2. **Defend the Faith** — 12 topics for common Protestant challenges
  3. **Marian Apologetics** — 8 topics covering all Marian doctrines
- Path overview page at `/paths/[slug]`
- Progress tracker: completed topics checked off, percentage bar
- "Next Topic" CTA at the bottom of each topic detail when accessed from a path
- Path progress stored in IndexedDB

---

### 4.7 Home Page Redesign

**Changes:**
- Replace the current stats bar (which shows placeholder ∞ values) with real dynamic data: total topics, total categories, topics favorited by user, topics read by user
- "Continue Reading" section: last 3 viewed topics (from history stored in IndexedDB)
- "Recommended" section: topics adjacent in difficulty to the user's most-read difficulty level
- "Today's Topic" — a deterministic daily featured topic (seeded by date, so it's the same for all users that day without a server)
- Move the full category grid to `/handbook`; replace on home with a compact 2-row scrollable category strip
- Remove the hero paragraph text (redundant once users are familiar with the app)

---

### 4.8 Offline Experience Improvements

**Current gaps:** Only fonts and images are cached; topic JSON and app shell caching are not explicitly configured.

**Requirements:**
- Cache all `handbook.json` files (all 3 languages) on first app load using a NetworkFirst strategy with IndexedDB fallback
- Show an "Offline — showing cached content" banner when the network is unavailable (already partially built in `OfflineBanner`)
- Pre-cache the `out/` static export shell so the app launches from cache without any network request
- Add a "Download for offline" button that explicitly triggers pre-caching all 3 language files; show download progress

---

### 4.9 Content Expansion

**Requirements:**
- Reach ≥ 100 topics in English by end of Phase 2
- All topics translated to Tagalog and Cebuano (can lag English by one release cycle)
- Minimum per category: 8 topics
- Difficulty distribution target: 40% beginner, 40% intermediate, 20% advanced
- New content validated against Zod schema via `pnpm validate` before merge
- Add `lastReviewed` field to schema (ISO date) for tracking content freshness

**Content addition workflow:**
1. Author writes topic JSON following the schema
2. `pnpm validate` checks schema conformance
3. `pnpm index` regenerates search index
4. PR reviewed for theological accuracy by a designated reviewer
5. Merged to main → static rebuild triggered

---

### 4.10 Navigation & Layout

**Current:** Single sticky header with logo, search, and language switcher. No bottom nav.

**Enhanced:**
- **Mobile bottom navigation bar** with 4 tabs: Home, Handbook, Search, Favorites
- Active tab highlighted; Favorites tab shows count badge when count > 0
- Desktop: retain top header; add left sidebar on `/handbook` for categories
- Breadcrumbs on all sub-pages for orientation
- "Back to top" floating button on long topic pages

---

### 4.11 Accessibility

**Current state:** jest-axe is configured but no explicit WCAG compliance statement.

**Requirements:**
- WCAG 2.1 AA compliance as a hard requirement for all new UI
- All interactive elements keyboard-navigable
- Screen reader labels on all icon buttons (already partially done)
- Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text
- Font size settable by user (Small / Medium / Large) — stored in `settings.fontSize` (already in schema)
- Font size setting applied as a Tailwind CSS variable on `<html>`

---

### 4.12 Dark Mode

**User story:** *As a user reading at night, I want a dark theme so the screen is easier on my eyes.*

**Requirements:**
- Toggle in the header (sun/moon icon)
- Respects `prefers-color-scheme` OS setting on first load
- Preference stored in `settings.theme` (already in Zustand schema)
- Applied via Tailwind's `dark:` variant — ensure all custom `catholic-blue` / `catholic-gold` colors have dark-mode equivalents in `tailwind.config.ts`
- No flash of wrong theme (apply class to `<html>` before first render via inline script in `layout.tsx`)

---

## 5. Technical Requirements

### 5.1 Content Loading — Language-Aware Topic Pages

Since static export cannot generate per-language URL variants (`/[lang]/[topic]`) without URL changes, topic pages use a hybrid approach:
- Build: pre-render English version via `generateStaticParams`
- Runtime: client-side re-fetch of the user's stored language on hydration
- Language switch on a topic page triggers client-side fetch only (no navigation)

### 5.2 Search Index

- MiniSearch index built at `pnpm index` time and saved to `public/data/search-index.json`
- Loaded into `lib/search/minisearch-engine.ts` on first search (lazy)
- Supports field boosting and fuzzy matching (distance 1 for words ≥ 5 chars)
- Index rebuilt per language; the active index swaps when language changes

### 5.3 New IndexedDB Stores

Add to schema (`lib/db/schema.ts`):

```typescript
notes: {
  topicId: string;      // key
  content: string;
  updatedAt: string;    // ISO date
}

readingHistory: {
  topicId: string;      // key
  visitedAt: string;    // ISO date, most recent visit
  readCount: number;
}

readingProgress: {
  topicId: string;      // key
  isRead: boolean;
  readAt: string;       // ISO date
}
```

### 5.4 New Content Schema Fields

```typescript
// Addition to TopicSchema
lastReviewed?: string;    // ISO date — when content was last verified
readingTimeMinutes?: number; // estimated read time
pathIds?: string[];       // which learning paths include this topic
```

### 5.5 Path Content Type

New file: `public/data/content/paths.json`

```typescript
interface LearningPath {
  id: string;
  slug: string;
  title: string;
  description: string;
  audience: string;
  estimatedMinutes: number;
  topicIds: string[];   // ordered
  lang: 'en' | 'tl' | 'ceb';
}
```

---

## 6. Non-Functional Requirements

| Concern | Requirement |
|---------|-------------|
| Performance | Lighthouse PWA score ≥ 90; FCP < 1.5 s on 4G |
| Bundle size | Initial JS bundle < 200 KB gzipped |
| Offline | Full read functionality available offline after first load |
| Accessibility | WCAG 2.1 AA on all pages |
| Test coverage | Maintain current thresholds: 70% global, 80% lib, 75% components |
| Content | All new topics pass `pnpm validate` before merge |

---

## 7. Phased Delivery

### Phase 2A — Foundation Fixes (Weeks 1–2)
- All B-series bugs from PRD-current.md (§4.1 above)
- PWA icons generated and committed
- Favorites page, Search page, Handbook page stubs
- Dark mode toggle

### Phase 2B — Core Features (Weeks 3–5)
- Multilingual topic detail (full language parity)
- Full Search page with filters
- Full Favorites page with sort/group
- Topic notes
- Reading progress tracking
- Mobile bottom navigation

### Phase 2C — Engagement (Weeks 6–8)
- Learning paths (3 curated paths + path progress tracking)
- Home page redesign (Continue Reading, Recommended, Today's Topic)
- Offline pre-caching UI
- Font size setting exposed in UI

### Phase 3 — Online Features (Future)
- Supabase auth + cloud sync of favorites, notes, progress
- Content submission form (community contributions)
- Native mobile apps via Capacitor
- "Download as PDF" for topics and paths
- Push notifications for daily topic

---

## 8. Out of Scope for v2

- Payments or subscriptions
- Video or audio content
- Live chat or community forums
- Content translation tooling (translators work externally, JSON files submitted via PR)
- CMS admin panel
