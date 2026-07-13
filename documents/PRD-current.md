# PRD — Catholic Faith Defender (Current Implementation)

**Version:** 1.0  
**Date:** 2026-07-10  
**Status:** Shipping (Phase 1 baseline)

---

## 1. Product Summary

Catholic Faith Defender (iCFD) is a Progressive Web Application for Catholic apologetics. It lets users browse, search, and save answers to common challenges against the Catholic faith, each backed by Scripture, Catechism citations, and Church Fathers quotes. The app is designed to work completely offline after the first load and is primarily aimed at Filipino Catholic laypeople who speak English, Tagalog, or Cebuano.

---

## 2. Goals

| # | Goal |
|---|------|
| G1 | Provide structured apologetics content accessible without an internet connection |
| G2 | Support three languages: English (EN), Tagalog (TL), Cebuano (CEB) |
| G3 | Allow users to save favorite topics locally for quick reference |
| G4 | Be installable on Android and iOS home screens as a PWA |

---

## 3. Users

**Primary:** Filipino Catholic laypeople (age 20–50) who want to respond to religious questions or objections from family, colleagues, or online debates. Low-to-moderate technical proficiency; primarily mobile users.

**Secondary:** Catechists, RCIA teachers, and parish volunteers preparing materials.

---

## 4. Current Feature Inventory

### 4.1 Home Page (`/`)

- **Hero section** — headline, app description, topic/language badges
- **Quick stats bar** — total topic count, language count, search and favorites (static counts)
- **Category pills** — filter bar for 8 theological categories (All, Sacraments, Mary, Papacy, Salvation, Bible, Saints, Tradition, Church Teaching)
- **Category grid** — 4-column grid showing one featured topic per category with a "View All" button
- **Search-filtered results** — full topic grid appears when a search query or category filter is active
- **Sticky header** — app logo, inline search bar, language switcher

### 4.2 Topic Detail Page (`/[topic]`)

- Topic metadata header: category badge, difficulty badge, language badge, last-updated date, scripture count, Church Fathers count
- Tags list
- Action buttons: Add to Favorites (stub — not connected to store), Share (stub — no implementation)
- The Question card
- The Answer card (multi-paragraph)
- Scripture References card (blockquote style)
- Catechism References card (CCC citation list)
- Church Fathers card (blockquote with attribution)
- Related Topics grid (links to sibling topic pages)
- Static-rendered at build time from `public/data/content/en/handbook.json` only (language is hardcoded to `'en'`)

### 4.3 Search

- Debounced inline search (300 ms) using `useDebounce` hook
- Client-side full-text match across `title`, `question`, `answer`, and `tags`
- Autocomplete suggestion dropdown (up to 5 suggestions, activates at ≥ 2 characters)
- Results update the topic grid on the home page
- Powered by `lib/search/minisearch-engine.ts` (MiniSearch) + `ContentLoader`

### 4.4 Language Switching

- Dropdown selector (EN / TL / CEB) in the sticky header
- Switching re-fetches and Zod-validates the corresponding `handbook.json` at runtime
- Language preference persisted to localStorage via Zustand `persist` middleware
- Topic detail page does **not** respect language selection (always renders English)

### 4.5 Favorites

- Heart button on each `TopicCard` toggles favorite state
- `favoriteIds` stored in IndexedDB via `idb` + Zustand
- Persisted to localStorage as a fallback via Zustand `persist`
- Export/import favorites as JSON (store methods exist; no UI surface)
- No dedicated Favorites page/route

### 4.6 PWA & Offline

- Service worker registered via `@ducanh2912/next-pwa` (disabled in dev)
- CacheFirst strategy for Google Fonts (1-year TTL) and static images (24-hour TTL)
- StaleWhileRevalidate for font files (7-day TTL)
- App is a full static export (`next build` → `out/`) — no server required at runtime
- `manifest.json` declares installability with 8 icon sizes, 3 shortcuts (`/handbook`, `/search`, `/favorites`), and 2 screenshot placeholders
- **Gap:** PWA shortcut URLs (`/handbook`, `/search`, `/favorites`) do not exist as routes; icons referenced in manifest are missing from `public/icons/`

### 4.7 Content

- 9 topics in English, mirrored in Tagalog and Cebuano
- 8 theological categories, not all populated (most have 1 topic)
- Zod schema in `data/schema/topic.schema.ts`; build-time validation via `pnpm validate`
- Content served as static JSON from `public/data/content/{lang}/handbook.json`
- `ContentLoader` singleton caches loaded content in memory per language

### 4.8 Technical Foundation

| Concern | Implementation |
|---|---|
| Framework | Next.js 15 App Router, static export |
| Styling | TailwindCSS 3 + shadcn/ui (Radix primitives) |
| State | Zustand with `persist` middleware |
| Offline DB | IndexedDB via `idb` |
| Search | MiniSearch 7 |
| Schema | Zod 3 |
| Unit tests | Jest 29 + Testing Library + jest-axe |
| E2E tests | Playwright (Chromium, Firefox, WebKit) |
| Package mgr | pnpm |
| Type-check | TypeScript strict mode |

---

## 5. Known Gaps & Bugs

| ID | Area | Description |
|----|------|-------------|
| B1 | Topic Detail | Language is hardcoded to `'en'`; switching language has no effect on topic pages |
| B2 | Topic Detail | "Add to Favorites" and "Share" buttons are stubs with no implementation |
| B3 | Routes | PWA manifest shortcuts `/handbook`, `/search`, `/favorites` have no corresponding pages |
| B4 | PWA | All icon files referenced in `manifest.json` are missing from `public/icons/` |
| B5 | Static params | `generateStaticParams` generates pages for `en` and `tl` only, not `ceb` |
| B6 | Content | Only 9 topics across all categories; most categories have 1 topic |
| B7 | Linting | ESLint config uses deprecated `next/typescript` preset (eslint-config-next pinned at 14.2.0) |
| B8 | TypeScript | Type errors in test files due to missing jest setup type exports |
| B9 | Favorites UI | No route or view to list all saved favorites |
| B10 | Search | Search only runs on the home page; topic detail has no search access |

---

## 6. Out of Scope (Phase 1)

- User authentication or accounts
- Cloud sync (Supabase)
- Native mobile apps (Capacitor)
- Content management system or editor UI
- Push notifications
- Dark mode toggle
- Reading progress / streaks
