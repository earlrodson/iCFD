# PRD — Codex Defensoris / iCFD Enhanced (v2.0)

**Product name:** Codex Defensoris  
**Site / PWA short name:** iCFD  
**Version:** 2.9  
**Date:** 2026-07-23  
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
| G7 | Offer a structured, certificate-earning course over the primary 20-topic curriculum | ≥ 500 course starts; ≥ 20% Beginner-certificate completion rate |

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

#### 4.1.4 PWA Icons ✅
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

### 4.4 Favorites Page (`/favorites`) ✅

**User story:** *As a user, I want a dedicated page to see, organize, and access all my saved topics.*

**Delivered:**
- ✅ Favorites list using `TopicCard` component
- ✅ Sort options: Title A–Z, Category, Difficulty
- ✅ Group-by-category toggle (Rows/GridFour icon) — groups show category headings
- ✅ Empty state with heart icon and descriptive copy
- ✅ Heart button accessible per card

**Remaining:**
- ✅ Sort by Date Added (requires timestamp in `useFavoritesStore`)
- ✅ Export favorites as JSON (UI button — store already supports it)
- ✅ Import favorites from JSON file upload
- ✅ Favorites count badge on nav tab

---

### 4.5 Topic Detail — Full Feature Completion 🔄

**Enhancements on top of the Phase 1 stub:**

#### Language Switcher on Topic Page ✅
- ✅ Switching language via `useAppStore` re-derives `displayTopic` from `availableTopics`
- ✅ English SSG content is the hydration fallback
- ✅ Explicit "Not available in [Language]" banner when topic ID absent in target language

#### Share ✅
- ✅ Web Share API with clipboard fallback and visual confirmation (green check)

#### Print / Export 🔄
- ✅ "Print" button with print-specific CSS
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
- ✅ "X of Y topics read" counter on home hero and handbook sidebar

---

### 4.6 Learning Paths ✅

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
- ✅ "Next Topic" CTA at the bottom of a topic detail when it was opened from a path context
- ✅ Audience + estimated reading time fields in paths.json
- ⬜ Marian path needs more topics once content expands to 100+

---

### 4.7 Home Page Redesign ✅

**Delivered:**
- ✅ "Continue Reading" — horizontal scroll strip of last 3 visited topics (from `useReadingStore.getRecentlyViewed`)
- ✅ "Today's Topic" — single deterministic featured topic card (seeded by day-of-year mod topic count)
- ✅ Category filter strip below search bar

**Remaining:**
- ✅ Replace hero stats with real personalized data (topics read, topics favorited)
- ✅ "Recommended" section (adjacent-difficulty suggestions)
- ✅ "Today's Featured Topics" carousel — see **§4.13** for the full spec

---

### 4.13 Daily Featured Topics Image Slider (Updated)

**User story:** *As a daily user, I want to see a rich, photo-driven highlight reel of 3 topics each day — shown one at a time with smooth transitions — so the app feels alive and gives me an immediate reason to dive in.*

**Selection** ✅ Admin-curated with deterministic fallback
- If any topics have `is_recommended = true` in the database, those topics are used as the carousel pool (up to 5 slides, rotated daily through the pool)
- Falls back to the deterministic hash algorithm (3 picks, one per category, seeded by day-of-year) when no topics are marked recommended
- Admins control the carousel via the star toggle in Admin → Topics with no redeploy required

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

### 4.8 Offline Experience Improvements ✅

**Requirements:**
- ✅ `OfflineBanner` — global amber banner shown at the top of every page when offline (`components/ui/OfflineBanner.tsx`)
- ✅ `OfflineFallback` — contextual empty-state component shown inside content pages (catechism, GIRM, canon) when offline and no cached data is available (`components/ui/OfflineFallback.tsx`)
- ✅ Library content fetches (`/catechism`, `/girm`, `/canon`) now catch network errors and return `[]` instead of throwing
- ✅ Settings → "Download for offline" button with progress bar — pre-caches handbook JSON (3 languages), Sacred Texts Library API (CCC, GIRM, Canon), all topic pages, and all app shell routes
- ✅ Download pre-populates Workbox's own `pages` + `pages-rsc` caches so topic pages load offline even without a prior visit
- ✅ App shell routes (`/`, `/handbook`, `/library`, `/search`, `/favorites`, `/settings`, `/catechism`, `/girm`, `/canon`, `/bible`, `/paths`) cached during download — bottom nav works fully offline
- ✅ Progress bar computed from full total upfront (handbook + library + shell + topics) — never regresses mid-download
- ✅ Download state tracked in `localStorage` (`icfd-offline-ready-v2`) — status correctly resets to idle after Clear, even across app restarts
- ✅ Cache version bump strategy (`icfd-content-v2`) forces existing users to re-download when structure changes; old caches cleaned on next download
- ✅ Sacred Texts Library API pre-cached (CCC 4 parts, GIRM 10 chapters, Canon 7 books) via Supabase REST in `useOfflineCache`

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
- ✅ Font size setting in UI

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
- ✅ `lib/supabase/sync.ts` — push/pull functions for favorites, notes, read progress
- ✅ Google OAuth + Apple OAuth + Magic Link + Email/Password auth on `/account`
- ✅ Supabase MCP server wired to project — migrations and SQL run directly from Claude Code
- ✅ Graceful fallback — all cloud features no-op when keys missing
- ✅ **Auto-sync** — `SyncManager` component (mounted in root layout) triggers push + pull automatically:
  - On `window.online` event (device reconnects)
  - On `SIGNED_IN` / `TOKEN_REFRESHED` auth state change
  - On initial app mount when already logged in and online
- ✅ **Dirty tracking** in all three user data stores:
  - `useNotesStore` — `dirtyIds[]` + `mergeFromCloud` + `markSynced`; cloud fills gaps, local always wins
  - `useFavoritesStore` — `dirtyIds[]` + `mergeFromCloud` (union); local deletions preserved
  - `useReadingStore` — `dirtyIds[]` + `mergeFromCloud` (cloud read state fills gaps); `markSynced`

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
- ✅ App name "Codex Defensoris" always visible beside logo on all screen sizes (mobile + desktop)
- ✅ App name and badge label read from `site_config` table at runtime via `useSiteConfig` hook (falls back to `APP_CONFIG`/env vars when DB is unavailable)

### Phase 3E — Community & Admin ✅ Delivered
- ✅ `/submit` — topic suggestion form → `submissions` table (RLS: anyone can insert)
- ✅ `/admin` — site_config editor; admin management (grant/revoke by email)
- ✅ `admins` table — replaces hardcoded email list; multiple admins supported
- ✅ `submissions` table with RLS policies

### Phase 4 — Largely Delivered
- ✅ Offline pre-cache UI — Settings → "Download for offline" button with progress bar
- ✅ Per-topic offline download button on topic detail page (Cache API, localStorage tracking)
- ✅ PWA install button replaces hamburger in header when install prompt is available
- ✅ Push notifications — VAPID keys generated, Edge Function deployed, daily cron at 8 AM Manila (00:00 UTC via pg_cron + pg_net)
- ✅ Android PWA "older version" warning fixed — manifest updated with `id`, `scope`, `lang`, `dir`, `display_override`, `categories`
- ✅ `OfflineFallback` component — contextual empty-state for Library content pages when offline (§4.8)
- ⬜ PDF export for topics and paths
- ⬜ Native mobile apps via Capacitor
- ⬜ Content expansion to 100+ topics per language (currently 50 EN)
- ⬜ Professional Filipino translations for 30 new topic stubs
- ⬜ Optional `coverImage` field in topic schema
- ⬜ Pre-cache Sacred Texts Library pages for offline (see Phase 8F)

---

### Phase 5 — Admin CMS

**Goal:** Allow admins to manage all content directly from `/admin` without touching JSON files or redeploying. The `topics` Supabase table already holds all content from the seed — Phase 5 wires up CRUD on top of it.

#### 5A — Topic Editor ✅ Delivered
- ✅ Admin layout with tab navigation + shared auth guard (role-based: admin / editor)
- ✅ Topic list: searchable/filterable table (category, difficulty, lang), delete with confirm modal
- ✅ Topic editor: full CRUD — title, question, answer, scripture, catechism, church fathers, tags, related topics
- ✅ Common Objections section: add/remove `{objection, response}` pairs per topic
- ✅ RLS policies: admins can INSERT/UPDATE/DELETE topics from the browser client
- ✅ `objections` JSONB column added to topics table via migration
- ✅ Publish / unpublish toggle (`published` boolean column)
- ✅ `is_recommended` star toggle per topic — drives the home carousel when set
- ✅ Status filter pills: **All · Published · Hidden · Recommended** — each with live count scoped to current lang/category/difficulty selection; clicking an active pill deselects it
- ✅ Hidden rows visually dimmed in the table for at-a-glance identification
- ⬜ Per-language tabs (EN / TL / CEB) side by side — currently separate edit URLs

#### 5B — Submission Review Queue ✅ Delivered
- ✅ `/admin/submissions` — lists all rows from `submissions` table with status tabs (Pending / Approved / Rejected / All) and live counts
- ✅ Approve: creates topic row + marks submission approved; "Approve & Edit" redirects to topic editor
- ✅ Reject: sets status = 'rejected'; "Restore to Pending" available on rejected rows
- ✅ Status badges: pending = amber, approved = green, rejected = red
- ✅ Cards collapsed by default, click to expand full content

#### 5C — Translation Management ✅ Delivered
- ✅ `/admin/translations` — table of all EN topics with TL and CEB status columns
- ✅ Status badges: Manual (green), Machine (blue), Stub (amber), Missing (red)
- ✅ Per-cell Translate / Re-translate button calling `/api/translate`
- ✅ "Translate All Stubs" bulk button with live progress counter
- ✅ Filter by language and status
- ✅ Real-time cell state (translating spinner, success checkmark, error message)

#### 5D — Path Editor ✅ Delivered
- ✅ `/admin/paths` — lists all paths with icon, title, difficulty, topic count, audience; delete with confirmation modal
- ✅ `/admin/paths/[slug]` — PathEditor: metadata fields (title, description, audience, difficulty, minutes, icon)
- ✅ Topic list with ↑/↓ reorder and × remove buttons
- ✅ Live topic search (filters out already-added topics, shows 8 results max)
- ✅ Save upserts path row, deletes then re-inserts path_topics with position index
- ✅ New path: URL replaces to `/admin/paths/[generated-slug]` after first save

#### 5E — Media & Config 🔄
- ✅ `coverImage` URL per topic (used by DailyCarousel)
- ✅ All existing site_config rows editable
- ⬜ `/admin/config` panel UI for runtime site_config overrides (app name, colors, feature flags)

#### 5F — Analytics ✅ Delivered
- ✅ `/admin/analytics` — two-tab page: Topics and Users
- ✅ Topics tab: ranked list by view count with progress bar, filterable by user / language / category / search
- ✅ Users tab: per-user summary (total views, topics completed, last active) with "View topics" drill-down
- ✅ Backed by two SECURITY DEFINER RPCs: `get_topic_analytics(filter_user_id?)` and `get_user_activity_summary()`

#### 5G — User Management ✅ Delivered
- ✅ `/admin/users` — lists all auth users with email, role, last sign-in
- ✅ Password reset button per user (envelope icon) — calls `supabase.auth.resetPasswordForEmail()` with redirect to `/auth/reset-password`; spinner while sending
- ✅ Role management (promote/demote admin/editor)

#### 5H — Duplicate Detection ✅ Delivered
- ✅ `/admin/dedup` — one-click Claude-powered duplicate analysis
- ✅ Sends all EN topics (id, title, question, category, answer preview) to Claude Sonnet
- ✅ Claude scores each topic 0–100 on title clarity, question sharpness, answer quality, and apologetics value
- ✅ Returns duplicate groups with confidence % and reason; auto-sets `published = false` on losers
- ✅ UI shows trophy (kept) / eye-slash (hidden) per topic with score bar and confidence pill
- ✅ Hidden topics recoverable via Admin → Topics → Hidden filter
- ✅ API route `/api/dedup` — admin-only, POST, no body required

---

### Phase 6 — Content Depth & Translation Engine ✅ Delivered

**Goal:** Store one comprehensive content version per topic, derive shorter views from it, and auto-translate to TL/CEB on demand using a swappable provider controlled from the admin panel.

#### 6A — Content Depth Architecture ✅ Delivered

**Three views, two columns, zero extra storage for the Brief:**

| View | Source | Description |
|------|--------|-------------|
| **Concise** | `answer->>'summary'` (JSONB key, rendered as markdown) | 5-paragraph answer — Catholic position, biblical objection, positive evidence, key theological distinction, early Church. Authored or AI-assisted. |
| **Comprehensive** | `answer_full` (TEXT, markdown) | Full essay — historical context, theological depth, all arguments, patristic sources, CCC table, objections section. The master authored version. |
| **Brief** | existing structured columns | UI-only rendering mode. Compiles `scripture[]` + `catechism[]` + `church_fathers[]` + `objections[]` into a compact reference card. No new column needed. |

**DB changes delivered:**
```sql
ALTER TABLE public.topics ADD COLUMN answer_full TEXT;
ALTER TABLE public.topics ADD COLUMN translation_source TEXT DEFAULT 'manual';
ALTER TABLE public.topics ADD COLUMN translation_notes TEXT;
```

**Content generation workflow:**
1. Generate topic JSON using `documents/content-generation-prompt.md` with any capable AI model
2. Paste `summary` and `answer_full` into the Topic Editor; structured fields from JSON into their respective admin fields
3. `answer_full` backfill migration available for rows where `answer` JSONB contains a `full` key

**Topic detail page:** Three-tab UI (Concise / Comprehensive / Brief) — all tabs render markdown via `react-markdown` + `remark-gfm` inside Tailwind Typography `.prose` container.

**`answer_full` in admin editor:** MDEditor (`@uiw/react-md-editor`, SSR-disabled via `dynamic()`) with live split preview.

#### 6B — Translation Engine ✅ Delivered

**Architecture:** Provider abstraction layer — swap translation services from the admin Config tab without code changes or redeployment.

**Supported providers:**

| Provider | Package | TL | CEB | Notes |
|---|---|---|---|---|
| Claude (Anthropic) | `@anthropic-ai/sdk` | ✅ | ✅ | Best for theological terms |
| OpenAI | `openai` | ✅ | ✅ | Fallback option |
| Google Translate | `@google-cloud/translate` | ✅ | ⚠️ | Cheapest, weak on CEB |
| Azure Translator | `@azure/ai-translation-text` | ✅ | ✅ | Good quality |

**Admin-controlled config (site_config rows):**
```
translation_provider   →  'claude' | 'openai' | 'google' | 'azure'
translation_fallback   →  secondary provider if primary fails / out of tokens
translation_prompt     →  global base instructions for all translations (textarea in Config tab)
```

**Per-topic control:**
```sql
ALTER TABLE public.topics ADD COLUMN translation_notes TEXT;
-- Example value: "Do not translate: kecharitomene, latria, hyperdulia.
--                'grace' → 'biyaya' not 'pagpapala'."
```
`translation_notes` is shown in the topic editor. Injected into the prompt for that topic only.

**Translation lifecycle (lazy + persistent):**
```
Request topic in TL/CEB
  ↓
DB has row for (id, lang)?
  ├── YES, translation_source = 'manual'   → serve immediately ✅
  ├── YES, translation_source = 'machine'  → serve immediately ✅
  └── NO / stub
        → call active provider API (one-time)
        → save to DB with translation_source = 'machine'
        → serve result ✅

Future requests → DB read only, no API call ever again
```

**`translation_source` column:**
```sql
ALTER TABLE public.topics ADD COLUMN translation_source TEXT DEFAULT 'manual';
-- 'manual'  — human-authored, never auto-overwrite
-- 'machine' — auto-translated, admin can review/override
-- 'stub'    — placeholder, treat as missing
```

**Content change handling:** When EN topic is edited, TL/CEB machine rows are NOT silently regenerated. Admin sees a "Re-translate" button on machine-translated rows in 5C. Manual rows are never touched by automation.

**Protected terms:** Combined from global `translation_prompt` + per-topic `translation_notes`. Built into the system prompt sent to any provider:
- Latin: latria, dulia, hyperdulia, transubstantiation, ex cathedra, in persona Christi, filioque, sola scriptura
- Greek: kecharitomene, theotokos, homoousios
- References: all CCC numbers, scripture references, NABRE, RSV-CE
- Names: saint names, pope names, council names

---

---

### Phase 7 — Reference Library ✅

**Goal:** Normalize shared reference data (scripture verses, CCC paragraphs, Church Father quotes) into dedicated tables so each record is stored once and reused across topics — eliminating duplication, enabling single-point updates, and powering a searchable reference picker in the admin Topic Editor.

#### 7A — Schema: Reference Tables ✅

Three new tables replacing embedded JSONB content in `topics`:

```sql
-- Canonical scripture verse storage
CREATE TABLE scripture_verses (
  id          TEXT PRIMARY KEY,       -- e.g. 'jn-1-1-nabre'
  reference   TEXT NOT NULL,          -- 'John 1:1'
  book        TEXT NOT NULL,
  chapter     INTEGER NOT NULL,
  verse_start INTEGER NOT NULL,
  verse_end   INTEGER,                -- for ranges like Jn 1:1–3
  version     TEXT NOT NULL DEFAULT 'NABRE',
  text        TEXT NOT NULL
);

-- CCC paragraph storage
CREATE TABLE ccc_paragraphs (
  paragraph   INTEGER PRIMARY KEY,    -- e.g. 464
  text        TEXT NOT NULL,          -- full paragraph text
  summary     TEXT,                   -- one-line digest
  section     TEXT                    -- 'Part 1 › Section 2 › Chapter 2'
);

-- Shared Church Father quote library
CREATE TABLE church_father_quotes (
  id          SERIAL PRIMARY KEY,
  author      TEXT NOT NULL,          -- 'St. Athanasius of Alexandria'
  quote       TEXT NOT NULL,
  source      TEXT NOT NULL,          -- 'On the Incarnation, 54, c. AD 318'
  year_approx INTEGER                 -- for chronological sorting
);
```

#### 7B — Topics Table Migration ✅

The three JSONB arrays on `topics` change from embedded content to ID references:

| Column | Before | After |
|--------|--------|-------|
| `scripture` | `[{reference, text, version}]` | `["jn-1-1-nabre", "ex-25-18-nabre"]` |
| `catechism` | `["CCC 464", "CCC 469"]` | `[464, 469]` (integers) |
| `church_fathers` | `[{author, quote, source}]` | `[1, 5, 23]` (serial IDs) |

**Migration strategy:** Extract unique values from all existing `topics` JSONB arrays into the reference tables, then replace arrays with resolved IDs. Existing API shape preserved via resolved JOIN at read time.

#### 7C — Data Layer Update ✅

- `lib/content/database.ts`: batch-resolve reference IDs after fetching topic rows — three parallel `WHERE id IN (...)` queries against the small reference tables
- TypeScript types updated: `Topic.scripture[]`, `Topic.catechism`, `Topic.churchFathers[]` remain unchanged in shape (resolved before returning)
- RLS: public read on all three reference tables; admin write only

#### 7D — Admin: Reference Library UI ✅

- New `/admin/references` tab with sub-tabs: Scripture | CCC | Church Fathers
- Search existing entries before creating new ones
- **Topic Editor integration:** Replace manual JSONB fields with a searchable reference picker
  - "Add verse" → type "John 1" → shows matching `scripture_verses` rows → click to attach
  - "Add CCC" → type "464" → shows paragraph preview → click to attach
  - "Add quote" → search by author or keyword → shows matching `church_father_quotes` → click to attach

#### 7E — Content Shortcodes (Optional, Phase 7+) ⬜ *(deferred)*

`answer_full` markdown may embed shortcodes resolved server-side before rendering:
- `{{verse:jn-1-1-nabre}}` → inserts blockquote with verse text + reference
- `{{ccc:464}}` → inserts styled CCC paragraph callout
- `{{father:3}}` → inserts blockquote with quote + attribution

**Key benefits:**
- Edit a verse or quote once → propagates to all topics that reference it
- Cross-topic queries: "which topics cite CCC 464?" → `WHERE catechism @> '[464]'`
- Translation-ready: reference tables can grow `lang` columns for TL/CEB verse text
- Admin efficiency: Topic Editor becomes a reference picker, not a free-text JSON field

---

### Phase 8 — Sacred Texts Library ✅ Delivered

**Goal:** Give signed-in users a browseable, searchable library of the full texts of foundational Catholic documents — not just citations within topics, but the complete primary sources.

**User story:** *As a Catholic lay defender, I want to read the CCC, the GIRM, or Canon Law directly in the app — offline-ready, with chapter tabs and search — so I can look up the exact wording of a paragraph when preparing an argument.*

**Distinction from Phase 7:** Phase 7 normalizes citations *within* topics (admin data layer). Phase 8 is a user-facing reader for the full documents themselves.

#### 8A — Library Hub ✅

- `/library` — resource catalog with tiered guest access
- Grid of resource cards with icon, title, description, and category badge
- `OfflineBanner` shown globally when offline; content pages show `OfflineFallback` when data is unavailable
- **Guest access:** Bible and Catechism open to all users; GIRM and Canon Law require sign-in (cards shown dimmed with lock icon → redirect to `/account`)
- **Disclaimer banner** between free and locked resources: *"Sign in to access more documents of the Catholic Church"*
- Search scoped by auth: guests search CCC only; signed-in users search CCC + GIRM + Canon simultaneously

**Resources listed:**

| Title | Route | Badge | Guest Access | Status |
|-------|-------|-------|-------------|--------|
| Holy Bible | `/bible` | Scripture | ✅ Free | ✅ |
| Catechism of the Catholic Church | `/catechism` | Magisterium | ✅ Free | ✅ |
| General Instruction of the Roman Missal | `/girm` | Liturgy | 🔒 Members | ✅ |
| Code of Canon Law | `/canon` | Canon Law | 🔒 Members | ✅ |

#### 8B — Bible Browser (`/bible`) ✅

- 73-book NABRE + Douay-Rheims, served from `bible_verses` table
- Book selector → chapter selector → verse list
- Multi-translation toggle

#### 8C — Catechism Browser (`/catechism`) ✅

**Data:** `ccc_paragraphs` table — 2,865 paragraphs with `paragraph`, `lang`, `text`, `summary`, `section`, `part`, `chapter_title`, `article` columns. PK: `(paragraph, lang)`.

**Seeder:** `scripts/seed-ccc-full.py` — reads `documents/catechism.json`, generates batch SQL files, pipes to psql via `DATABASE_URL`.

**UI:**
- 4 part tabs (Part 1–4) with paragraph ranges
- Expandable paragraph cards — collapsed shows `summary`, expanded shows full `text`
- Paragraph number badge, search by text or paragraph number
- `OfflineFallback` shown when offline and data is empty

#### 8D — GIRM Browser (`/girm`) ✅

**Data:** `girm_articles` table — 399 articles with `article`, `lang`, `text`, `summary`, `section` columns. PK: `(article, lang)`. RLS: public read.

**Seeder:** `scripts/seed-girm.py` — reads `documents/girm.json` (399 entries, `{id, text}` format), maps articles to 10 chapters, generates 8 batch SQL files, pipes to psql.

**Chapter mapping:**

| Tab label | Articles | Chapter title |
|-----------|----------|---------------|
| Preamble | 1–15 | Preamble |
| Chapter I | 16–26 | Importance and Dignity of the Eucharistic Celebration |
| Chapter II | 27–90 | Structure, Elements, and Parts of the Mass |
| Chapter III | 91–111 | Duties and Ministries in the Mass |
| Chapter IV | 112–287 | Various Forms of Celebrating Mass |
| Chapter V | 288–318 | Arrangement and Furnishing of Churches |
| Chapter VI | 319–351 | Requisites for the Celebration of Mass |
| Chapter VII | 352–367 | Choice of the Mass and Its Parts |
| Chapter VIII | 368–385 | Masses and Prayers for Various Circumstances |
| Chapter IX | 386–399 | Adaptations within the Competence of Bishops |

**UI:** Same pattern as CCC browser — chapter tabs, article number badge (`article`), expandable cards, search, `OfflineFallback`.

#### 8E — Canon Law Browser (`/canon`) ✅

**Data:** `canons` table — 1,751 canons with `canon`, `lang`, `text`, `summary`, `book` columns. PK: `(canon, lang)`. RLS: public read.

**Seeder:** `scripts/seed-canon.py` — reads `documents/canon.json` (1,751 entries; some have a top-level `text`, others have a `sections[]` array of numbered paragraphs — seeder joins sections with `§N` prefix). Maps to 7 books.

**Book mapping:**

| Tab label | Canons | Book title |
|-----------|--------|------------|
| Book I | 1–203 | General Norms |
| Book II | 204–746 | The People of God |
| Book III | 747–833 | The Teaching Office of the Church |
| Book IV | 834–1253 | The Office of Sanctifying in the Church |
| Book V | 1254–1310 | The Temporal Goods of the Church |
| Book VI | 1311–1399 | Sanctions in the Church |
| Book VII | 1400–1752 | Processes |

**UI:** Same pattern — book tabs, canon number badge (`c.N`), expandable cards, search, `OfflineFallback`.

#### 8F — Backlog

| Item | Notes | Status |
|------|-------|--------|
| Pre-cache Sacred Texts for offline | CCC, GIRM, Canon pre-cached via `useOfflineCache` Step 2 | ✅ Delivered |
| Search across all documents | Global search bar on `/library` querying all tables | ✅ Delivered |
| Cross-link Library ↔ Topics | CCC citation on topic detail → opens CCC browser at paragraph | ✅ Delivered |
| Guest access to Bible + Catechism | Free resources visible without sign-in | ✅ Delivered |
| Additional documents | 12 council + encyclical documents seeded — see Phase 9 | ✅ Partial |
| TL / CEB translations | `lang` column exists on all tables; content not yet seeded | ⬜ Planned |
| Bible offline download | Chapter-level pre-caching from the Bible browser | ⬜ Planned |

---

---

### Phase 9 — Church Documents, Cross-linking & Auto-Sync ✅ Delivered

**Goal:** Extend the Library with primary source council and encyclical documents; cross-link those documents to apologetics topics; and make offline data sync automatically without requiring the user to tap "Sync" in Settings.

#### 9A — Church Documents Storage ✅

Two new tables in Supabase (generic enough to hold any document type):

```sql
CREATE TABLE church_document_meta (
  slug          TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  year          INTEGER,
  doc_type      TEXT,   -- 'council' | 'encyclical' | 'apostolic-constitution' | etc.
  source_url    TEXT
);

CREATE TABLE church_document_meta_sections (
  slug          TEXT REFERENCES church_document_meta(slug),
  section_num   INTEGER NOT NULL,
  section_label TEXT,
  body          TEXT NOT NULL,
  PRIMARY KEY (slug, section_num)
);
```

RLS: public SELECT, service_role-only writes (anon INSERT/UPDATE temporarily opened per seed run then dropped).

**12 documents seeded** (approx. 710 total sections):

| Slug | Title | Sections | Source |
|------|-------|----------|--------|
| `council-nicaea-i` | First Council of Nicaea (AD 325) | 20 | newadvent.org |
| `council-constantinople-i` | First Council of Constantinople (AD 381) | 5 | newadvent.org |
| `council-ephesus` | Council of Ephesus (AD 431) | 23 | newadvent.org |
| `council-chalcedon` | Council of Chalcedon (AD 451) | 30 | newadvent.org |
| `council-constantinople-ii` | Second Council of Constantinople (AD 553) | 38 | newadvent.org |
| `council-laodicea` | Council of Laodicea (c. AD 360) | 60 | newadvent.org |
| `council-of-trent` | Council of Trent (1545–1563) | 202 | papalencyclicals.net |
| `lumen-gentium` | Lumen Gentium (Vatican II, 1964) | 302 | vatican.va |
| `dei-verbum` | Dei Verbum (Vatican II, 1965) | 26 | vatican.va |
| `gaudium-et-spes` | Gaudium et Spes (Vatican II, 1965) | 93 | vatican.va |
| `humanae-vitae` | Humanae Vitae (Paul VI, 1968) | 30 | vatican.va |

**Scripts:**
- `scripts/fetch-council-doc.mjs` — scrapes newadvent.org (h2/h3/p structure) and papalencyclicals.net (25 Trent sessions, CANON detection via plain paragraph text)
- `scripts/fetch-vatican-doc.mjs` — scrapes vatican.va with title cleanup (pope-name and year regex only applied when pope appears in URL; US date format stripped)
- `scripts/seed-church-doc.mjs` — upserts via Supabase REST (legacy anon JWT from `.env.local`) in batches of 50; `?on_conflict=` for idempotent reruns
- `scripts/output/*.json` — scraped JSON committed to repo as a seeding source of truth

#### 9B — Document Viewer (`/documents/[slug]`) ✅

Generic infinite-scroll reader for any document in `church_document_meta`.

**Key behaviors:**
- Fetches `church_document_meta` on mount → displays title and doc type
- Loads sections in pages of 20 via Supabase REST range queries
- `IntersectionObserver` sentinel triggers `loadMore` near the bottom of the list
- Concurrency guard: `fetchingRef.current` (synchronous) prevents duplicate fetches from racing React state updates
- `sectionsRef` mirrors `sections` state for synchronous reads inside callbacks
- Resets all state (sections, cursor, total, fetchingRef) on slug change
- **Deep-link:** `?s=N` query param auto-expands + smooth-scrolls to `id="section-N"` after initial batch loads

#### 9C — Library Page: Church Documents Section ✅

`/library` extended with a "Church Documents" section listing the 12 documents as cards (FilePdf icon). Library search extended to include `church_documents` as a 4th search target — results link to `/documents/${slug}?s=${section_num}`.

#### 9D — Document ↔ Topic Cross-linking ✅

**Join table:**
```sql
CREATE TABLE topic_document_refs (
  id           SERIAL PRIMARY KEY,
  topic_id     TEXT NOT NULL,        -- FK → topics.id
  doc_slug     TEXT NOT NULL,        -- FK → church_document_meta.slug
  section_num  INTEGER NOT NULL,
  section_label TEXT,
  UNIQUE (topic_id, doc_slug, section_num)
);
```

**Schema extension** (`data/schema/topic.schema.ts`):
```typescript
DocumentRefSchema = z.object({
  docSlug: z.string(), docTitle: z.string(),
  sectionNum: z.number(), sectionLabel: z.string().nullable()
})
// Added to TopicSchema:
documentRefs: z.array(DocumentRefSchema).optional()
```

**Data layer** (`lib/content/database.ts`):
- `fetchDocumentRefs(topicId)` — REST query with embedded `church_document_meta(title)`
- `loadTopicFromDatabase` runs it in parallel with existing reference resolution

**Topic detail UI** (`components/topic/TopicContent.tsx`):
- "Church Documents" section in the Apologetics Brief tab (after objections)
- Each ref links to `/documents/${docSlug}?s=${sectionNum}` with BookBookmark icon

**Admin editor** (`app/admin/topics/[id]/TopicEditor.tsx`):
- `DocumentRefSection` component: search `church_documents`, click to attach, trash to remove
- API: `app/api/admin/topic-doc-refs/route.ts` — GET / POST / DELETE, admin-verified

#### 9E — Auto-Sync ✅

**Problem:** Notes, favorites, and reading progress only synced when the user manually tapped "Sync" in Settings. Data written offline was silently lost if the user forgot.

**Solution:** Dirty tracking + `SyncManager` root component.

**Dirty tracking pattern** (all three stores):
```typescript
dirtyIds: string[]          // IDs changed since last sync
mergeFromCloud(cloud)       // cloud fills gaps; local always wins (notes); union merge (favorites); read-state union (reading)
markSynced(ids: string[])   // remove from dirtyIds after confirmed push
```

**`components/SyncManager.tsx`** — `'use client'` component mounted in `app/layout.tsx`:
- Mount: pushes dirty + pulls cloud if already online and authenticated
- `window.online` event: push dirty → pull cloud
- `onAuthStateChange(SIGNED_IN | TOKEN_REFRESHED)`: push dirty → pull cloud
- `pushDirty`: only sends `dirtyIds`-scoped subsets to each sync function, then calls `markSynced`
- `pullAndMerge`: calls `fetchNotesFromCloud` + `fetchFavoritesFromCloud` + `fetchReadProgressFromCloud` in parallel via `Promise.allSettled`

**Merge strategies:**
- Notes: local always wins (dirty and non-dirty); cloud fills in topics not present locally
- Favorites: union — cloud favorites not in local are added; local deletions preserved (unfavorited IDs may reappear from cloud if the user removed them on a different device while offline — acceptable edge case for Phase 9)
- Reading: union — if cloud says a topic is read and local doesn't, mark as read; local unread state is never overridden by cloud

---

---

## 10. Priority Backlog — Ordered by Value and Impact

All ⬜ items across phases, consolidated and ranked. Ship in this order unless a specific milestone forces a different sequence.

---

### Recently Delivered

| Item | What shipped |
|------|-------------|
| Offline full-app download | Topic pages, app shell, Sacred Texts Library all pre-cached; progress bar fixed; status persisted via localStorage; cache versioning for forced re-download |
| Library guest access | Bible + Catechism free for all; GIRM + Canon locked behind sign-in with disclaimer |
| Admin-curated carousel | `is_recommended` flag wired to DailyCarousel; falls back to hash algorithm when none set |
| Admin: Analytics | `/admin/analytics` — topic view rankings + per-user activity summary |
| Admin: User management | Password reset button per user in `/admin/users` |
| Admin: Duplicate detection | `/admin/dedup` — Claude scans all EN topics, scores quality, auto-hides duplicates |
| Admin: Topic filter pills | Hidden / Recommended pills with live counts replace status dropdown |
| Church Documents Library | 12 council + encyclical documents scraped and seeded; `/documents/[slug]` infinite-scroll viewer with deep-link (`?s=N`) |
| Document ↔ Topic cross-linking | `topic_document_refs` join table; admin editor to attach doc sections to topics; "Church Documents" card in topic Apologetics Brief tab |
| Library search extended | `/library` global search now covers `church_documents` table (4th search target) |
| Auto-sync | Dirty tracking in all 3 Zustand stores; `SyncManager` auto-pushes on reconnect and login |

---

### Tier 1 — Core promise gaps (ship next)

These directly deliver the app's stated goals (G1–G4). Skipping them leaves the primary value proposition partially fulfilled.

| # | Item | Why it matters |
|---|------|----------------|
| 1 | **Theological Etymology & Key Terms** (Phase 10) | Knowing the Greek/Latin root of a term immediately reframes a debate. This is the single highest-leverage feature for the lay defender use case — no other apologetics app does this at topic level. |
| 2 | **TL/CEB translations** | Primary audience is Filipino Catholics. Tagalog and Cebuano stubs are placeholder text. Admin translation page + Claude API are ready — content just needs to be run. |
| 3 | **Guided Course, Quizzes & Certificates** (Phase 11) | Converts the 20-topic basic apologetics curriculum from passive reading into a completable, credentialed course — a strong retention and word-of-mouth driver, and the first monetizable-adjacent feature (certificates) even though payments remain out of scope. |

---

### Tier 2 — High-usability

| # | Item | Why it matters |
|---|------|----------------|
| 2 | **Per-language tabs in admin Topic Editor** | Currently editing TL and CEB requires navigating to separate URLs. Side-by-side EN/TL/CEB tabs would cut review time significantly. |
| 3 | **Push notification content strategy** | Notifications wired up but no content cadence defined. Daily featured topic push would drive re-engagement. |
| 4 | **Admin site config panel** (`/admin/config`) | App name, colors, feature flags in env vars. A UI lets non-technical admins change them without redeploy. |

---

### Tier 3 — Depth and audience expansion

| # | Item | Why it matters |
|---|------|----------------|
| 5 | **Additional Library documents** | 12 council + encyclical docs now live (Phase 9). Next: Lumen Fidei, Compendium of CCC, more Vatican II constitutions (Sacrosanctum Concilium, Ad Gentes). |
| 6 | **TL/CEB seeding for Library tables** | `lang` column exists on `girm_articles` and `canons`; source documents needed. |
| 7 | **PDF export for topics and paths** | Catechists printing handouts or preparing lesson notes. |

---

### Tier 4 — Technical / deferred / low marginal value

Do after Tier 1–3, or skip if resources are constrained.

| # | Item | Why it matters |
|---|------|----------------|
| 8 | **Marian path expansion** | 3 topics in the Marian Path is thin. Depends on Tier 1 TL/CEB completion. |
| 9 | **Content shortcodes in `answer_full`** (`{{ccc:464}}`, `{{verse:jn-1-1}}`) | Author ergonomics only; no user-visible change. Useful when content volume justifies it. |
| 10 | **Bible chapter-level offline download** | SW's NetworkFirst already covers recently-visited chapters. Marginal unless users plan to go offline mid-session. |
| 11 | **Native mobile apps via Capacitor** | PWA covers ~90% of the native use case. App Store presence adds discoverability, but high build/maintenance cost. |

---

---

### Phase 10 — Theological Etymology & Key Terms ⬜ Planned

**Goal:** Surface word-level etymology and debate notes for key theological terms directly inside topic pages, so users can immediately weaponize the original Greek, Latin, Hebrew, or Aramaic meaning in a dialogue.

**User story:** *As a lay defender in a debate, I want to know that "Catholic" comes from καθολικός (katholikos — universal) and "Church" from ἐκκλησία (ekklesia — assembly of the called-out), so I can correct misconceptions at their root before defending doctrine.*

#### 10A — Data Model

**`theological_terms` table** — global glossary, defined once, reused across topics:

```sql
CREATE TABLE theological_terms (
  slug          TEXT PRIMARY KEY,    -- 'ekklesia', 'kecharitomene', 'latria'
  term          TEXT NOT NULL,       -- display form: "Ekklesia"
  pronunciation TEXT,                -- phonetic: "ek-klee-SEE-ah"
  language      TEXT NOT NULL,       -- 'Greek' | 'Latin' | 'Hebrew' | 'Aramaic'
  root_text     TEXT,                -- original script: ἐκκλησία
  root_meaning  TEXT NOT NULL,       -- literal root: "assembly of the called-out"
  definition    TEXT NOT NULL,       -- 1–2 sentence theological definition
  debate_note   TEXT                 -- why this matters in dialogue/debate
);

-- join table: which terms are relevant to each topic
CREATE TABLE topic_terms (
  topic_id  TEXT NOT NULL,   -- FK → topics.id
  term_slug TEXT NOT NULL,   -- FK → theological_terms.slug
  PRIMARY KEY (topic_id, term_slug)
);
```

RLS: public SELECT on both tables; admin INSERT/UPDATE/DELETE.

**Schema extension** (`data/schema/topic.schema.ts`):
```typescript
TermSchema = z.object({
  slug: z.string(), term: z.string(), pronunciation: z.string().nullable(),
  language: z.string(), rootText: z.string().nullable(),
  rootMeaning: z.string(), definition: z.string(), debateNote: z.string().nullable()
})
// Added to TopicSchema:
keyTerms: z.array(TermSchema).optional()
```

#### 10B — Topic Detail: Key Terms Section (Brief Tab)

A **"Key Terms & Etymology"** card added to the Brief (Apologetics Brief) tab — same level as Scripture, CCC, Church Fathers, and Church Documents. Each term renders as an expandable card:

```
┌─────────────────────────────────────────────────────┐
│ EKKLESIA                          Greek              │
│ ἐκκλησία  /ek-klee-SEE-ah/                          │
│ "assembly of the called-out"                         │
│                                                      │
│ The NT word for Church — not a building but a        │
│ people summoned by God. [expand ▼]                   │
│                                                      │
│ ▸ Debate note: Opponents who say "I don't need a    │
│   church" are arguing against the NT community       │
│   concept itself.                                    │
└─────────────────────────────────────────────────────┘
```

- Collapsed: term name, language badge, root text, root meaning, first sentence of definition
- Expanded: full definition + debate note
- Language badge color: Greek = blue, Latin = amber, Hebrew = green, Aramaic = purple

#### 10C — Comprehensive Tab: Inline Term Tooltips

Terms that appear in `answer_full` markdown and have a glossary entry are auto-detected and wrapped with a tooltip trigger. On desktop hover / mobile tap: a small popover shows root text, root meaning, and debate note — without leaving the reading flow.

**Implementation:** Post-processing step on `resolvedFull` after shortcode expansion — scan for exact term matches (case-insensitive, word-boundary), wrap with a `<TermTooltip>` React component.

#### 10D — Admin: Term Picker in Topic Editor

Same UX pattern as Scripture/CCC/Church Fathers pickers:
- Search existing terms by name or root
- Click to attach to the current topic
- Trash to detach
- "Add new term to glossary" inline form (term, pronunciation, language, root text, root meaning, definition, debate note)

Mounted as "Key Terms" section in the Topic Editor between Church Documents and Church Fathers.

#### 10E — Seed: Initial Glossary

Seed the most debate-critical terms across all apologetics categories:

| Term | Language | Root |
|------|----------|------|
| Ekklesia | Greek | ἐκκλησία — assembly of the called-out |
| Katholikos | Greek | καθολικός — according to the whole |
| Kecharitomene | Greek | κεχαριτωμένη — perfect passive: having been and remaining graced |
| Theotokos | Greek | Θεοτόκος — God-bearer |
| Latria | Greek | λατρεία — worship due to God alone |
| Dulia | Greek | δουλεία — veneration/honor given to servants of God |
| Hyperdulia | Greek | ὑπερδουλεία — above-dulia honor given to Mary |
| Transubstantiation | Latin | trans + substantia — change of substance |
| Ex Cathedra | Latin | from the chair — with full papal authority |
| Filioque | Latin | and from the Son — procession of the Holy Spirit |
| Eucharistia | Greek | εὐχαριστία — thanksgiving |
| Baptizein | Greek | βαπτίζειν — to immerse/plunge |
| Charis | Greek | χάρις — gift, grace, divine favor |
| Paradosis | Greek | παράδοσις — that which is handed down (Tradition) |
| Apostolos | Greek | ἀπόστολος — one who is sent |
| Presbyteros | Greek | πρεσβύτερος — elder (origin of "priest") |
| Episcopos | Greek | ἐπίσκοπος — overseer (bishop) |
| Diakonos | Greek | διάκονος — servant (deacon) |
| Petros / Petra | Greek | πέτρος/πέτρα — stone/bedrock (Matt 16:18) |
| Purgare | Latin | to cleanse — root of Purgatory |

#### Acceptance Criteria

- [ ] `theological_terms` and `topic_terms` tables created with RLS
- [ ] "Key Terms" section visible in Brief tab when a topic has terms attached
- [ ] Each term card collapses to root meaning and expands to full definition + debate note
- [ ] Language badge color-coded (Greek/Latin/Hebrew/Aramaic)
- [ ] Inline tooltips on Comprehensive tab for matched terms
- [ ] Admin term picker attached to Topic Editor
- [ ] Seed: all 20 terms from the initial glossary table above
- [ ] Admin can attach/detach terms from any topic without redeploy

---

### Phase 11 — Guided Course, Quizzes & Certificates 🔄 Partial

**Goal:** Turn the 20-topic "Layman's Biblical Theology and Apologetics Course" (Cebuano source, being translated to Tagalog, with an existing English counterpart per topic) into a structured, self-paced course with tiered quizzes and a downloadable/shareable completion certificate per tier.

**User story:** *As a lay Catholic working through the basic apologetics curriculum, I want to read all 20 topics, test myself at increasing difficulty, and receive a certificate with my name on it once I've proven I know the material — without being forced to sign up just to try a quiz.*

#### 11A — Course Definition & Highlighting

The `paths` / `path_topics` tables (`drizzle/schema.ts`) already model exactly this shape (ordered topic list, difficulty, estimated time) — **reuse them rather than adding new schema**:

- Seed one `paths` row (`slug: 'basic-apologetics-course'`) with the 20 topic ids in lesson order via `path_topics.position`.
- **Fix the existing Paths gap first:** today `/paths` and `/paths/[slug]` read a static `public/data/content/paths.json` (§4.6/§5.5) instead of the DB, while the admin `PathEditor` writes to the DB — the two are disconnected. Wire the public path pages to query Supabase directly so this course (and any future path) reflects admin edits immediately.
- Homepage and Library highlighting of "the 20 topics" is served by querying `path_topics` for `basic-apologetics-course` ordered by `position` — no new `sort_order`/`featured` column needed on `topics`.

#### 11B — Data Model

```sql
CREATE TABLE quiz_settings (
  tier          TEXT PRIMARY KEY,   -- 'beginner' | 'intermediate' | 'advanced'
  item_count    INTEGER NOT NULL,   -- questions served per attempt
  bank_size     INTEGER NOT NULL,   -- questions authored per topic+tier (300% of item_count)
  pass_percent  INTEGER NOT NULL,   -- minimum score to pass
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Seed defaults:
-- beginner     | 10 | 30 | 70
-- intermediate | 20 | 60 | 80
-- advanced     | 30 | 90 | 85
-- All three columns admin-editable in /admin/quiz-settings.

CREATE TABLE quiz_questions (
  id             BIGSERIAL PRIMARY KEY,
  topic_id       TEXT NOT NULL,     -- FK -> topics.id
  tier           TEXT NOT NULL REFERENCES quiz_settings(tier),
  question       TEXT NOT NULL,
  choices        JSONB NOT NULL,    -- ["...", "...", "...", "..."]
  correct_index  INTEGER NOT NULL,
  active         BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE quiz_attempts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL,     -- no FK to auth.users (existing convention, §7 favorites)
  topic_id       TEXT NOT NULL,
  tier           TEXT NOT NULL REFERENCES quiz_settings(tier),
  question_ids   JSONB NOT NULL,    -- the rotated subset served this attempt
  answers        JSONB NOT NULL,
  score_percent  NUMERIC NOT NULL,
  passed         BOOLEAN NOT NULL,
  attempted_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE course_progress (
  user_id    UUID NOT NULL,
  topic_id   TEXT NOT NULL,
  tier       TEXT NOT NULL REFERENCES quiz_settings(tier),
  passed_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, topic_id, tier)
);

CREATE TABLE certificate_templates (
  tier            TEXT PRIMARY KEY REFERENCES quiz_settings(tier),
  base_image_url  TEXT NOT NULL,
  placeholders    JSONB NOT NULL,   -- [{ field, x, y, font_size, font_family, color, align }]
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- placeholder fields: 'name' | 'serial_code' | 'date' | 'tier'

CREATE TABLE certificates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL,
  tier         TEXT NOT NULL REFERENCES quiz_settings(tier),
  serial_code  TEXT NOT NULL UNIQUE,  -- format: {ADMIN_PREFIX}-{TIER_LETTER}-{YEAR}-{SEQUENCE}
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url      TEXT NOT NULL,
  image_url    TEXT NOT NULL,
  UNIQUE (user_id, tier)
);
```

RLS: `quiz_questions` (minus `correct_index`) and `quiz_settings` are public SELECT; `quiz_attempts`/`course_progress`/`certificates` are per-`user_id` SELECT, insert via server-side function only (never trust a client-submitted score).

#### 11C — Quiz-Taking Flow (open access, auth-gated only at submit)

- Quiz is reachable and fully playable by anonymous visitors — no sign-in wall to browse or attempt.
- Per attempt: server randomly samples `item_count` questions from that topic+tier's active bank (`bank_size` pool), records the exact `question_ids` served.
- **Weekly retake gate:** a topic+tier can be re-attempted only if `now() - max(attempted_at)` for that `(user_id, topic_id, tier)` is ≥ 7 days, or if there is no prior attempt.
- **Auth gate on submission only:** the in-progress quiz (selected answers) lives in local component/Zustand state with no network writes. On submit, call `getUser()` (never `getSession()` — matches the existing security discipline in `lib/supabase/auth.ts`); if unauthenticated, hold the answers and present a sign-in/sign-up modal; only after successful auth is the attempt scored and written to `quiz_attempts`. This is a new pattern (no existing `AuthGate` component to extend), closest in spirit to the local-first-then-sync approach already used by `useFavoritesStore`.
- A passing attempt (`score_percent >= quiz_settings.pass_percent`) upserts `course_progress (user_id, topic_id, tier, passed_at)`.

#### 11D — Certificate Generation & Admin Template Designer

- **Admin (`/admin/certificates`):** upload a background image per tier, then place `name` / `serial_code` / `date` / `tier` fields by dragging markers on a canvas overlay of the uploaded image — writes `x, y, font_size, font_family, color, align` per field to `certificate_templates.placeholders`.
- **Issuance trigger:** after each passing `quiz_attempts` insert, check whether `course_progress` now covers all 20 course topics for that `tier`. If so and no `certificates` row exists yet for `(user_id, tier)`, generate one.
- **Serial code:** `{ADMIN_PREFIX}-{TIER_LETTER}-{YEAR}-{SEQUENCE}`, e.g. `CFD-B-2026-000123` — prefix admin-configurable, tier/year automatic, sequence auto-incrementing.
- **Rendering:** composite text onto the template image server-side with `node-canvas` → PNG (for on-screen view/share), then wrap that PNG into a single-page PDF with `pdf-lib` (avoids a headless-browser/Puppeteer dependency in a serverless deploy). Both artifacts saved to Supabase Storage; URLs stored on the `certificates` row.
- **Durability:** once issued, a certificate is permanent — later quiz re-attempts (e.g. weekly practice) never revoke it.

#### 11E — Navigation & Placement

- The course does **not** get a separate nav entry — it's the first, visually distinct card on the existing `/paths` page (bigger card, progress ring, certificate badge) above the other 3 paths, rather than a competing bottom-tab item (decided over a dedicated "Course" tab to avoid maintaining two "browse a topic list" UIs).
- Homepage and Library both surface the course's 20 topics as a distinct, ordered highlight block (via `path_topics.position`, §11A) rather than folding them into the general alphabetical grid.

#### Delivered so far

- ✅ `basic-apologetics-course` path seeded (20 topics, correct lesson order) — `/paths` and `/paths/[slug]` now read live from Supabase (`lib/content/paths.ts`) instead of the static `paths.json`, closing the admin/public drift gap; stale `path_topics` rows are now cleaned up on every `db:seed` run
- ✅ All 20 course topics seeded in `ceb`, cross-linked to existing `en` topic ids where a counterpart exists
- ✅ `quiz_settings`, `quiz_questions`, `quiz_attempts`, `course_progress`, `certificate_templates`, `certificates` tables created with RLS (`drizzle/migrations/005_quiz_certificates.sql`); `quiz_settings` seeded with defaults
- ⬜ Not yet started: question bank authoring, quiz-taking UI, admin quiz-settings page, certificate designer/generation, homepage/library highlight block

#### Acceptance Criteria

- [x] `basic-apologetics-course` path seeded with 20 topics in lesson order; `/paths/[slug]` reads live from Supabase, not `paths.json`
- [ ] Homepage and Library each show a highlighted, ordered "Basic Apologetics Course" section
- [x] `quiz_settings` seeded with defaults (10/30/70, 20/60/80, 30/90/85); admin edit UI (`/admin/quiz-settings`) not yet built
- [ ] Question bank authored per topic+tier at 300% of `item_count` (3,600 questions total across 20 topics × 3 tiers)
- [ ] Quiz fully playable anonymously; sign-in modal appears only on submit, prior answers preserved through the auth flow
- [ ] Weekly retake cooldown enforced per `(user_id, topic_id, tier)`
- [ ] Passing all 20 topics at a tier auto-issues a certificate with correct serial code, name, date
- [ ] Admin can upload a certificate background image and drag-place name/serial/date/tier fields per tier
- [ ] Certificate available as both a PNG/image and a PDF download
- [ ] Certificates are immutable once issued regardless of later attempt outcomes

---

## 11. Out of Scope for v2

- Payments or subscriptions
- Video or audio content
- Live chat or community forums
