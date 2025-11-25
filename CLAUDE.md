# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Catholic Faith Defender is a Progressive Web Application (PWA) built with Next.js 15 for Catholic apologetics content. It's designed as an offline-first mobile-capable application supporting multiple languages (English, Tagalog, Cebuano).

**Key Technologies:**
- Next.js 15 with App Router and static export
- TypeScript with strict mode
- TailwindCSS + shadcn/ui for styling
- Zustand for state management
- IndexedDB (via idb) for offline storage
- MiniSearch for full-text search functionality
- Zod for schema validation
- Jest for testing with coverage thresholds

## Development Commands

**Package Manager:** Use `pnpm` (not npm)

```bash
# Development
pnpm dev                # Start development server
pnpm build              # Build for production
pnpm start              # Start production server

# Code Quality
pnpm type-check         # Run TypeScript compiler without emitting files
pnpm lint               # Run ESLint (currently has configuration issues)
pnpm validate           # Validate content structure

# Testing
pnpm test               # Run all tests
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Run tests with coverage report
pnpm test:ci            # Run tests for CI (no watch, with coverage)

# Content Management
pnpm index              # Generate search index
```

## Architecture

### Offline-First Data Management
- **IndexedDB Schema** (`lib/db/`): Core offline database with topic storage, favorites, and search indexes
- **Content Loader** (`lib/content/`): Loads and validates JSON content from `data/content/`
- **Search Engine** (`lib/search/`): MiniSearch implementation for offline full-text search

### State Management (Zustand)
- **useAppStore**: Global app state, language/theme settings, PWA functionality
- **useSearchStore**: Search state, filters, and results management
- **useFavoritesStore**: Local favorites management with future cloud sync capability

### Multi-Language Support
Content structure in `data/content/{lang}/handbook.json`:
- Each language contains identical topic structures with different content
- Topics are categorized by theological areas (sacraments, mary, papacy, etc.)
- Zod schemas ensure content consistency across languages

### Component Architecture
- **shadcn/ui components** in `components/ui/`: Reusable UI primitives
- **Feature components**: SearchBar, TopicCard, OfflineBanner, PWAInstallPrompt
- **Layout components**: LanguageSwitcher, responsive navigation

### PWA Implementation
- Service worker via `@ducanh2912/next-pwa`
- Static export configuration (`output: 'export'`)
- Offline caching strategies for fonts and images
- Install prompt functionality

## Data Schemas

### Topic Schema (Zod validation)
```typescript
{
  id: string;
  category: 'sacraments' | 'mary' | 'papacy' | 'salvation' | 'bible' | 'saints' | 'tradition' | 'church-teaching';
  title: string;
  question: string;
  answer: string;
  scripture: Array<{reference: string; text: string; version?: string}>;
  catechism?: string[];
  churchFathers?: Array<{author: string; quote: string; source: string}>;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lang: 'en' | 'tl' | 'ceb';
  relatedTopics?: string[];
  lastUpdated: string; // ISO date
}
```

## Testing Strategy

- **Unit Tests**: Components, stores, and utilities with Jest
- **Integration Tests**: User workflows (search, favorites)
- **Accessibility Tests**: jest-axe for compliance checking
- **Coverage Requirements**: 70% global, 80% for lib/, 75% for components/
- **Test Structure**: Co-located `__tests__/` directories

## Known Issues & TODOs

### TypeScript Issues
- Multiple type errors in test files due to missing jest setup exports
- ESLint configuration incompatible with current Next.js version
- Missing type declarations for jest-axe and other testing utilities
- Language type enforcement issues in stores and components

### Linting Configuration
- Current ESLint config uses deprecated `next/typescript` preset
- Needs migration to standalone ESLint CLI as recommended by Next.js 15

### Missing Dependencies
- `@types/jest-axe` for accessibility testing
- Missing `useDebounce` hook referenced in SearchBar component
- PWA utilities referenced but not implemented

## File Structure Patterns

### Path Aliases (configured in tsconfig.json)
- `@/*` → root directory
- `@/components/*` → components directory
- `@/lib/*` → lib directory
- `@/store/*` → store directory
- `@/data/*` → data directory

### Test Organization
- Tests co-located in `__tests__/` directories
- Integration tests in `__tests__/integration/`
- Performance tests in `__tests__/performance/`
- Mock data and utilities in `jest.setup.js`

## Content Development

When adding new apologetics content:
1. Follow the Zod schema structure exactly
2. Maintain consistency across all languages
3. Run `pnpm validate` to check content integrity
4. Regenerate search index with `pnpm index`
5. Test search functionality across all supported languages

## Static Export Considerations

The app uses Next.js static export for PWA functionality:
- All dynamic functionality must work client-side
- No server-side API routes in current architecture
- Image optimization disabled (`unoptimized: true`)
- Service worker handles all offline functionality

## Future Development Path

**Phase 2**: Online features with Supabase integration for authentication and cloud sync
**Phase 3**: Native mobile apps via Capacitor wrapper

Current codebase is structured to accommodate these phases without major architectural changes.