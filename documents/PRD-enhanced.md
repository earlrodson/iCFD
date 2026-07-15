# PRD — Codex Defensoris / iCFD Enhanced (v2.0)

**Product name:** Codex Defensoris  
**Site / PWA short name:** iCFD  
**Version:** 2.2  
**Date:** 2026-07-15  
**Status:** In Progress  
**Baseline:** PRD-current.md (Phase 1)

> **Naming convention:** The full brand name is **Codex Defensoris** (Latin: "Defender's Code"). The site URL, PWA short name, and app badge display **iCFD**. Both identifiers coexist — "iCFD" for brevity, "Codex Defensoris" in hero, installers, and formal copy.

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

### 4.13 Daily Featured Topics Image Slider (Updated)

**User story:** *As a daily user, I want to see a rich, photo-driven highlight reel of 3 topics each day — shown one at a time with smooth transitions — so the app feels alive and gives me an immediate reason to dive in.*

**Selection** (unchanged)
- 3 daily picks, each from a different category, deterministically seeded by day-of-year
- Same 3 picks for all users on the same calendar day — no server required

#### Visual Design — Image Slider
- **Full-width slider** showing **one card at a time** — no peeking, no grid
- Each card is a full-bleed **photo background** sourced from Unsplash (free CDN, no API key), with a dark-to-transparent gradient overlay for text legibility
- **Auto-advances** every 5 seconds; timer resets on manual navigation
- **Pause on hover** (desktop)
- **Touch swipe** to navigate (left swipe = next, right swipe = prev) — native touch events, no library
- **Arrow buttons** (◄ ►) overlaid on left/right edges
- **Dot indicators** overlaid at the bottom center — clickable, active dot widens to a pill

#### Card anatomy (top → bottom, image fills full card height)
```
┌──────────────────────────────────────┐
│  [Unsplash photo, object-cover]      │
│                                      │
│  ◄                              ►   │
│                                      │
│  ▓▓▓▓▓ dark gradient overlay ▓▓▓▓▓  │
│  CATEGORY LABEL  [difficulty badge]  │
│  Topic Title in Bold                 │
│  "Question excerpt, italic…"         │
│           ○ ● ○                      │
└──────────────────────────────────────┘
```

#### Category Images (Unsplash CDN)
One curated photo per category. Falls back to the category gradient if the image fails to load.

| Category | Unsplash photo ID |
|---|---|
| bible | `1504052434569-70ad5836ab65` |
| church-teaching | `1548625149-720f618c04cb` |
| mary | `1544761634-dc512f2238a3` |
| tradition | `1509023464322-41a1e1f09a50` |
| saints | `1548164557-fd01dc0e7485` |
| papacy | `1531572753322-ad063cecc140` |
| sacraments | `1547592180-85f173990554` |
| salvation | `1499209974431-9dddcece7f88` |

URL pattern: `https://images.unsplash.com/photo-{id}?w=800&auto=format&fit=crop&q=80`

#### Implementation Notes
- Component: `components/home/DailyCarousel.tsx`
- Transition: CSS opacity crossfade (`transition-opacity duration-700`) — all 3 slides stacked absolutely, only active is `opacity-100`
- Timer: `setTimeout` (not `setInterval`) — restarted after each slide change, so manual navigation resets the 5s countdown
- Gradient fallback: category gradient painted on the card container; image absolutely positioned on top — if image fails, gradient shows through
- No `next/image` — plain `<img>` with `object-cover` to avoid remote domain config

#### Acceptance Criteria
- [x] 3 picks per day, each from a different category, deterministic
- [x] One card visible at a time, full-width
- [x] Crossfade transition between slides (~700 ms)
- [x] Auto-advances every 5 s; pauses on hover
- [x] Touch swipe (≥ 50 px delta) triggers prev/next
- [x] Arrow buttons navigate prev/next
- [x] Dot indicators reflect active slide; clicking a dot jumps to that slide
- [x] Tapping the card navigates to the topic detail page
- [x] Gradient fallback shown if Unsplash image fails to load

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

### 4.14 Brand Identity & Backend-Configurable App Name ✅

**User story:** *As an admin, I want to change the app's displayed name without redeploying, so we can rebrand or localize the name as the app scales.*

**Naming decision:**
- **Full brand name:** Codex Defensoris *(Latin: "Defender's Code")*
- **Site / PWA short name:** iCFD *(displayed in logo badge, home screen icon label)*
- Both identifiers appear together — "iCFD" for navigation density; "Codex Defensoris" in hero, browser tab, manifest installer, and formal copy.

**Delivered ACs:**
- ✅ `app/layout.tsx` title = "Codex Defensoris"
- ✅ `public/manifest.json` name = "Codex Defensoris", short_name = "iCFD"
- ✅ `HeroSection` h1 reads "Codex Defensoris"
- ✅ `Header` tagline reads "Codex Defensoris"
- ✅ `lib/config.ts` — single source of truth for config values; reads from `NEXT_PUBLIC_*` env vars with hardcoded defaults as fallback
- ✅ `drizzle/schema.ts` → `siteConfig` table — key-value store for admin-managed config overrides
- ✅ `drizzle/migrations/003_site_config.sql` — migration + seed with all default config keys

**Backend config architecture:**

```
Build time:  .env.local → NEXT_PUBLIC_APP_NAME → baked into JS bundle
Runtime:     Admin updates site_config table → Phase 3 admin panel syncs changes
             → client fetches /api/config (Phase 3) → overrides APP_CONFIG at runtime
```

**Recognized config keys (site_config table):**

| key | default | description |
|-----|---------|-------------|
| `appName` | Codex Defensoris | Full name in PWA installer and browser tab |
| `appShortName` | iCFD | Home screen label (≤ 12 chars) |
| `appId` | codex-defensoris | URL-safe identifier for storage keys |
| `description` | Offline-first Catholic… | PWA install prompt description |
| `version` | 2.0.0 | Current app version |

**Phase 3 follow-up:** Build `/admin/config` panel UI that writes to `site_config` table; expose `/api/config` route returning current values (DB overrides env vars) for runtime hydration.

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
- ✅ PWA icons — all 8 sizes generated (72–512px) including maskable variant; manifest updated

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

### Phase 2D — Daily Engagement & Visual Polish ✅ Delivered
- ✅ Daily Featured Topics Image Slider (§4.13) — full-bleed Unsplash photos, crossfade, auto-advance, touch swipe
- ✅ "X of Y topics read" counter on home hero with progress bar
- ✅ "Not available in [Language]" fallback banner on topic detail
- ✅ "Next Topic" CTA at bottom of topic when accessed from a learning path
- ✅ Favorites count badge on nav tab
- ✅ App renamed to **Codex Defensoris** (§4.14) — layout, manifest, hero, header updated
- ✅ Backend-ready `site_config` table + `lib/config.ts` for admin-managed name overrides
- ⬜ Optional `coverImage` field in topic schema

### Phase 2E — Brand & Backend Config (§4.14) ✅ Delivered
See §4.14 below.

### Phase 3A — Cloud Sync & Auth ✅ Delivered
- ✅ `@supabase/supabase-js` + `@supabase/ssr` installed
- ✅ Supabase modern key pattern — Publishable key (browser) + Secret key (server/seed)
- ✅ `lib/supabase/client.ts` — factory `createBrowserClient`, `isSupabaseConfigured` guard
- ✅ `lib/supabase/auth.ts` — signIn, signUp, signOut, getUser (JWT-verified), onAuthStateChange
- ✅ `lib/supabase/sync.ts` — upload/download favorites, notes, read progress
- ✅ Google OAuth + Apple OAuth + Magic Link + Email/Password auth on `/account`
- ✅ Supabase MCP server wired to project — migrations and SQL run directly from Claude Code
- ✅ Graceful fallback — all cloud features no-op when keys missing

### Phase 3B — Content Expansion ✅ Delivered
- ✅ 30 new topics across all 8 categories (20 → 50 total in English)
- ✅ Tagalog + Cebuano stubs added (pending professional translation)
- ✅ `scripts/seed.mjs` — admin reseed via SUPABASE_SECRET_KEY (no DATABASE_URL required)
- ✅ DB: 127 topic rows (50 EN + 39 TL + 38 CEB), 3 paths, 19 path_topics, 5 site_config rows

### Phase 3C — Discovery & UX Polish ✅ Delivered
- ✅ "Recommended for You" section — surfaces unread topics at next difficulty level
- ✅ Favorites export/import (JSON round-trip)
- ✅ Hero replaced with DailyCarousel as top home element
- ✅ Badge system — neutral pill + category colour dot (uniform, light-mode readable)
- ✅ PWA icons — 10 sizes generated (72–512px incl. maskable)

### Phase 3D — Navigation & Settings ✅ Delivered
- ✅ Header simplified — logo + hamburger only
- ✅ Slide-in drawer — profile card (→ /account), General Settings, Contribute, Admin (admin-only)
- ✅ `/settings` page — language, text size, theme toggle, cloud sync
- ✅ `/account` page — auth-only (sign in/up, profile card, stats); sync moved to /settings
- ✅ Mobile nav — 5 tabs: Home, Handbook, Search, Favorites, Paths (Submit removed)

### Phase 3E — Community & Admin ✅ Delivered
- ✅ `/submit` — topic suggestion form → `submissions` table (RLS: anyone can insert)
- ✅ `/admin` — site_config editor; admin management (grant/revoke by email)
- ✅ `admins` table — replaces hardcoded email list; multiple admins supported
- ✅ `submissions` table with RLS policies

### Phase 4 — Remaining (Future)
- ⬜ Push notifications for daily topic
- ⬜ PDF export for topics and paths
- ⬜ Native mobile apps via Capacitor
- ⬜ Content expansion to 100+ topics per language (currently 50 EN)
- ⬜ Professional Filipino translations for 30 new topic stubs
- ⬜ Optional `coverImage` field in topic schema
- ⬜ Offline pre-cache UI ("Download for offline" button with progress)

---

## 8. Out of Scope for v2

- Payments or subscriptions
- Video or audio content
- Live chat or community forums
- Content translation tooling (translators work externally, JSON files submitted via PR)
- CMS admin panel (deferred to Phase 3)
