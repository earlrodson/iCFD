# Codex Defensoris (iCFD)

**Catholic Faith Defender** — an offline-first Progressive Web App for Catholic apologetics, built for Filipino Catholic laypeople.

Browse, search, and save answers to common challenges against the Catholic faith, each backed by Scripture, Catechism citations, and Church Fathers quotes. Installs on Android and iOS home screens, works completely offline after first load, and supports English, Tagalog, and Cebuano.

---

## Features

- **100+ apologetics topics** across 8 categories: Bible, Church Teaching, Mary, Tradition, Saints, Papacy, Sacraments, Salvation
- **Three depth levels** per topic — Concise summary, Comprehensive essay, Brief one-liner
- **Sacred Texts Library** — browse the Catechism of the Catholic Church (CCC), General Instruction of the Roman Missal (GIRM), Code of Canon Law, and the Bible; deep-link from topic citations directly to the relevant paragraph
- **Global Library search** — search across CCC, GIRM, Canon Law, and Bible simultaneously from the Library hub
- **Learning Paths** — curated study sequences (New Catholic, Defend the Faith, Marian Apologetics)
- **Favorites** — save topics locally for quick offline reference
- **Daily Carousel** — three deterministic daily picks from different categories
- **Offline-first PWA** — Workbox service worker, pre-cacheable handbook and library
- **Admin CMS** — topic editor with per-language tabs (EN/TL/CEB), reference pickers, submission review queue, translation management
- **Print / PDF export** — clean print CSS always shows the Concise tab regardless of active UI tab
- **Trilingual** — English, Tagalog, Cebuano; language switcher on every topic page

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS v4 + `@tailwindcss/typography` |
| Database | Supabase (PostgreSQL, Tokyo region) |
| Auth | Supabase Auth |
| PWA / SW | Workbox (via `next-pwa`) |
| Icons | Phosphor Icons |
| Package manager | pnpm |
| Testing | Vitest + Testing Library (unit), Playwright (e2e) |
| Deployment | Vercel (static export) |

---

## Project Structure

```
app/                 Next.js routes (App Router)
  [topic]/           Topic detail page
  admin/             CMS — topic editor, paths, submissions, translations
  bible/             Bible browser
  canon/             Canon Law browser
  catechism/         CCC browser
  girm/              GIRM browser
  library/           Library hub with global search
  handbook/          All-topics browse page
  search/            Full-text topic search
  paths/             Learning paths

components/
  home/              DailyCarousel, quick-access tiles
  layout/            MobileNav, AppDrawer, TopBar
  topic/             TopicContent, tab panels
  ui/                Shared primitives (Badge, etc.)

data/schema/         Zod schemas (topic, handbook, paths)
lib/
  content/           database.ts — Supabase REST fetchers + row mappers
  libraryCache.ts    Cache-first fetch helper for Library API responses
  useOfflineCache.ts Pre-cache handler for handbook + library download
  stores/            Zustand stores (favorites, search, settings)
  supabase/          Client + generated DB types

__tests__/
  unit/              Vitest unit tests (schema, DB mapping, components)
  e2e/               Playwright end-to-end tests
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- A Supabase project (see Environment Variables)

### Install

```bash
pnpm install
```

### Environment Variables

Create `.env.local` (never commit this file):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SUPABASE_SECRET_KEY=<secret-key>
```

### Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run tests

```bash
pnpm test          # Vitest unit tests
pnpm test:e2e      # Playwright e2e tests
pnpm test:all      # both
```

### Build

```bash
pnpm build
pnpm type-check    # tsc --noEmit
pnpm lint
```

---

## Database Schema (key tables)

| Table | Purpose |
|---|---|
| `topics` | Apologetics topics — `id`, `lang`, `category`, `title`, `question`, `answer` (JSONB), `answer_full`, `cover_image`, `catechism`, `scripture`, `church_fathers`, `objections`, `tags`, `difficulty` |
| `scripture_verses` | Bible verse text by reference + version |
| `ccc_paragraphs` | Catechism paragraphs with `part`, `section`, `chapter`, `article` |
| `girm_articles` | GIRM articles with chapter groupings |
| `canons` | Code of Canon Law canons with book groupings |
| `church_father_quotes` | Patristic quotes linked to topics |
| `learning_paths` | Curated topic sequences |
| `topic_submissions` | User-submitted correction queue |

---

## Content Categories

| Slug | Label |
|---|---|
| `bible` | Bible |
| `church-teaching` | Church Teaching |
| `mary` | Mary |
| `tradition` | Tradition |
| `saints` | Saints |
| `papacy` | Papacy |
| `sacraments` | Sacraments |
| `salvation` | Salvation |

---

## Security Notes

- `.env.local` is gitignored — never commit it
- All secret keys (`SUPABASE_SECRET_KEY`, `ANTHROPIC_API_KEY`, `DATABASE_URL`) live only in `.env.local`
- Admin routes are protected by Supabase Auth (role check server-side)
- The Supabase publishable key is safe to expose client-side; the secret key is used only in server-side scripts
