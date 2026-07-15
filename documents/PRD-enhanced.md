# PRD — Catholic Faith Defender Enhanced (v2.0)

**Version:** 2.1  
**Date:** 2026-07-15  
**Status:** In Progress  
**Baseline:** PRD-current.md (Phase 1)

### Implementation Status Legend
- ✅ **Delivered** — shipped and verified
- 🔄 **Partial** — shipped but not all ACs met
- ⬜ **Planned** — not yet started

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

### 4.1 Bug Fixes (Phase 1 Completion) ✅

These are prerequisites before any new feature work.

#### 4.1.1 Multilingual Topic Pages ✅
**Problem:** `app/[topic]/page.tsx` hardcoded `language = 'en'`.  
**Solution (delivered):** `TopicContent` watches `useAppStore.availableTopics`; on mount it looks up the topic in the current-language topic list and swaps to it. English SSR content is the pre-render fallback. If language changes after hydration the display topic re-derives automatically.

**Delivered ACs:**
- ✅ Switching language and navigating to a topic shows it in the selected language
- ✅ Direct URL visits default to the persisted language preference
- ✅ All 3 language files included in static generation

#### 4.1.2 Favorites & Share on Topic Detail ✅
**Delivered:**
- Heart button wired to `useFavoritesStore.toggleFavorite`; fill state reflects `isFavorite`
- Share button uses `navigator.share` with clipboard fallback and green-check confirmation animation

#### 4.1.3 Missing Route Stubs ✅
All routes (`/handbook`, `/search`, `/favorites`, `/paths`) are live.

#### 4.1.4 PWA Icons ⬜
Icons folder exists at `public/icons/` but production-ready PNGs for all 8 manifest sizes are not yet generated.

#### 4.1.5 Cebuano Static Params ✅
`generateStaticParams` now iterates `['en', 'tl', 'ceb']` and de-duplicates topic IDs. Missing language files are silently skipped.

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

### 4.4 Favorites Page (`/favorites`) 🔄

**User story:** *As a user, I want a dedicated page to see, organize, and access all my saved topics.*

**Delivered:**
- ✅ Favorites list using `TopicCard` component
- ✅ Sort options: Title A–Z, Category, Difficulty
- ✅ Group-by-category toggle (Rows/GridFour icon) — groups show category headings
- ✅ Empty state with heart icon and descriptive copy
- ✅ Heart button accessible per card

**Remaining:**
- ⬜ Sort by Date Added (requires timestamp in `useFavoritesStore`)
- ⬜ Export favorites as JSON (UI button — store already supports it)
- ⬜ Import favorites from JSON file upload
- ⬜ Favorites count badge on nav tab

---

### 4.5 Topic Detail — Full Feature Completion 🔄

**Enhancements on top of the Phase 1 stub:**

#### Language Switcher on Topic Page ✅
- ✅ Switching language via `useAppStore` re-derives `displayTopic` from `availableTopics`
- ✅ English SSG content is the hydration fallback
- ⬜ Explicit "Not available in [Language]" banner when topic ID absent in target language

#### Share ✅
- ✅ Web Share API with clipboard fallback and visual confirmation (green check)

#### Print / Export ⬜
- ⬜ "Print" button with print-specific CSS
- ⬜ "Download as PDF" (Phase 3)

#### Notes (Personal) ✅
- ✅ Freetext textarea per topic in `TopicContent`, auto-saves on every keystroke
- ✅ Stored in `useNotesStore` (Zustand persist → localStorage)
- ✅ Character limit: 1000 with live counter
- *Note: implemented with localStorage (Zustand persist) rather than IndexedDB — sufficient for Phase 2 data volumes*

#### Reading Progress ✅
- ✅ "Mark as read" / "Mark as unread" toggle per topic in `TopicContent`
- ✅ `useReadingStore` with `markAsRead`, `markAsUnread`, `isRead`, `recordVisit`, `getRecentlyViewed`
- ✅ Visit recorded on every topic page mount (powers "Continue Reading")
- ✅ Progress available to Learning Paths pages via `readProgress` map
- ⬜ "X of Y topics read" counter on home hero and handbook sidebar

---

### 4.6 Learning Paths 🔄

**User story:** *As a catechist, I want a guided sequence of topics so I can assign structured reading to students.*

**Delivered:**
- ✅ `public/data/content/paths.json` with 3 curated paths
- ✅ `/paths` list page with per-path progress bars
- ✅ `/paths/[slug]` detail page: numbered steps, per-topic read toggles, overall progress bar
- ✅ Path detail uses `useReadingStore.readProgress` for live completion state
- ✅ "Paths" tab in mobile bottom nav (Ladder icon)
- ✅ `generateStaticParams` on path detail page (required for `output: export`)

**Paths launched:**
  1. **New Catholic** — 8 topics (Trinity → Eucharist, beginner focus)
  2. **Defend the Faith** — 8 topics (Bible authority, Papacy, Purgatory, Saints, Indulgences)
  3. **Marian Apologetics** — 3 topics (Immaculate Conception, Perpetual Virginity, Prayer to Saints)

**Remaining:**
- ⬜ "Next Topic" CTA at the bottom of a topic detail when it was opened from a path context
- ⬜ Audience + estimated reading time fields in paths.json
- ⬜ Marian path needs more topics once content expands to 100+

---

### 4.7 Home Page Redesign 🔄

**Delivered:**
- ✅ "Continue Reading" — horizontal scroll strip of last 3 visited topics (from `useReadingStore.getRecentlyViewed`)
- ✅ "Today's Topic" — single deterministic featured topic card (seeded by day-of-year mod topic count)
- ✅ Category filter strip below search bar

**Remaining:**
- ⬜ Replace hero stats with real personalized data (topics read, topics favorited)
- ⬜ "Recommended" section (adjacent-difficulty suggestions)
- ⬜ "Today's Featured Topics" carousel — see **§4.13** for the full spec

---

### 4.13 Daily Featured Topics Carousel (New)

**User story:** *As a daily user, I want to see 3 visually distinct highlighted topics each day so I have a clear starting point and discover content I might have missed.*

**Background:** The current "Today's Topic" shows a single text card with no imagery, which provides minimal visual engagement. Elevating this to a branded carousel with category visuals will increase daily active use and surface the breadth of the app's content.

**Requirements:**

#### Selection
- Display **3 daily picks** instead of 1 — each from a **different category**, deterministically seeded by the current date
- Algorithm: for each of the 3 slots, compute `hash(date + slot_index)` to pick a category, then pick a topic within it using `hash(date + category)` as the offset — guarantees variety without repeating categories
- The same 3 picks are shown to all users on the same calendar day (no server required)

#### Visual Design
- Full-width **swipeable horizontal carousel** on mobile; shows 1 card at a time with peek of next card
- Desktop: show all 3 cards side-by-side in a 3-column grid
- Each card has:
  - A **category cover banner** — a full-bleed gradient or illustration background unique to each of the 8 categories (see Category Visuals below)
  - Category icon (Phosphor) centered in the banner
  - Topic title and truncated question below the banner
  - Difficulty badge in the bottom corner
- Dot indicators below carousel on mobile showing position (1/2/3)
- Swipe gesture support (touch events or a lightweight library)

#### Category Visuals
Each category gets a fixed gradient pair (light/dark) and its Phosphor icon displayed at 48px:

| Category | Light gradient | Dark gradient |
|---|---|---|
| bible | `#1e3a5f → #2563eb` | `#0f2040 → #1d4ed8` |
| church-teaching | `#1e3a5f → #7c3aed` | `#120d2e → #5b21b6` |
| mary | `#701a75 → #c026d3` | `#3b0764 → #86198f` |
| tradition | `#713f12 → #d97706` | `#3b1f07 → #b45309` |
| saints | `#14532d → #16a34a` | `#052e16 → #15803d` |
| papacy | `#1e3a5f → #0891b2` | `#0a1628 → #0e7490` |
| sacraments | `#0c4a6e → #06b6d4` | `#062030 → #0891b2` |
| salvation | `#7f1d1d → #dc2626` | `#3b0a0a → #b91c1c` |

#### Optional Topic Cover Image
- Add optional `coverImage?: string` field to `TopicSchema` (relative path under `public/images/topics/`)
- When present, the carousel card uses the image as the banner background (cover fit) with a dark overlay for text readability
- When absent, falls back to the category gradient + icon
- No topic images required for launch — all cards use gradient fallback by default

#### Implementation Notes
- Component: `components/home/DailyCarousel.tsx` (client component)
- Uses CSS scroll-snap for swipe on mobile (`scroll-snap-type: x mandatory`)
- No external carousel library — native CSS + touch events only
- Category gradient map lives in `lib/categoryVisuals.ts`
- Carousel replaces the current single "Today's Topic" card in `app/page.tsx`

#### Acceptance Criteria
- [ ] 3 cards shown each day, each from a different category
- [ ] Same 3 picks on page reload (deterministic)
- [ ] Swipeable on mobile; 3-column grid on ≥ md breakpoint
- [ ] Each card uses the correct category gradient when no `coverImage` is set
- [ ] Tapping/clicking a card navigates to the topic detail page
- [ ] Dot indicators update on swipe
- [ ] Works offline (no external images required for gradient fallback)

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

### 5.3 Stores — Delivered Implementation ✅

Notes and reading stores were implemented using **Zustand persist → localStorage** rather than IndexedDB. This is sufficient for Phase 2 data volumes (notes are plain strings, reading progress is a flat map of booleans).

**`store/useReadingStore.ts`**
```typescript
readProgress: Record<string, { isRead: boolean; readAt: string | null }>
readingHistory: Record<string, { visitedAt: string; readCount: number }>
// Methods: markAsRead, markAsUnread, recordVisit, isRead, getRecentlyViewed
```

**`store/useNotesStore.ts`**
```typescript
notes: Record<string, string>  // topicId → note text (max 1000 chars)
// Methods: setNote, deleteNote
```

Migration to IndexedDB (`idb` package) is deferred to Phase 3 when cloud sync requires a more robust local store. The Zustand store shape is designed to be drop-in replaceable.

### 5.4 Content Schema Fields (Planned Additions)

```typescript
// Additions to TopicSchema (data/schema/topic.schema.ts)
lastReviewed?: string;         // ISO date — when content was last verified
readingTimeMinutes?: number;   // estimated read time
pathIds?: string[];            // which learning paths include this topic
coverImage?: string;           // relative path: /images/topics/[id].jpg
                               // Powers carousel card banner (§4.13)
                               // Falls back to category gradient when absent
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

### Phase 2A — Foundation Fixes ✅ Delivered
- ✅ Multilingual topic pages (language parity via client-side re-fetch)
- ✅ Cebuano added to `generateStaticParams`
- ✅ Share button (Web Share API + clipboard fallback)
- ✅ `public/sw.js` dev stub (fixes 500 on `/sw.js` in dev mode)
- 🔄 PWA icons folder exists; production-ready PNGs not yet generated

### Phase 2B — Core Features ✅ Delivered
- ✅ `useReadingStore` — mark as read, reading history, recently viewed
- ✅ `useNotesStore` — per-topic notes, 1000-char limit, auto-save
- ✅ Topic detail: Mark as Read toggle + Notes textarea + Share button
- ✅ Favorites page: sort + group-by-category toggle
- ✅ Mobile bottom nav with 5 tabs (Home, Handbook, Search, Favorites, Paths)

### Phase 2C — Engagement ✅ Delivered
- ✅ Learning paths (3 curated paths, progress bars, step-by-step detail)
- ✅ Home page: "Continue Reading" strip + "Today's Topic" card
- 🔄 Offline banner present; pre-caching UI and explicit "Download for offline" button not yet built
- ⬜ Font size setting in UI

### Phase 2D — Daily Engagement & Visual Polish (Next)
- ⬜ Daily Featured Topics Carousel (§4.13) — 3 cards, category gradients, swipeable
- ⬜ Optional `coverImage` field in topic schema
- ⬜ "X of Y topics read" counter on home hero
- ⬜ "Not available in [Language]" fallback banner on topic detail
- ⬜ "Next Topic" CTA at bottom of topic when accessed from a path
- ⬜ Favorites count badge on nav tab
- ⬜ PWA icons (all 8 PNG sizes)

### Phase 3 — Online Features (Future)
- ⬜ Supabase auth + cloud sync of favorites, notes, progress
- ⬜ Content submission form (community contributions)
- ⬜ Native mobile apps via Capacitor
- ⬜ "Download as PDF" for topics and paths
- ⬜ Push notifications for daily topic
- ⬜ Content expansion to 100+ topics per language

---

## 8. Out of Scope for v2

- Payments or subscriptions
- Video or audio content
- Live chat or community forums
- Content translation tooling (translators work externally, JSON files submitted via PR)
- CMS admin panel
