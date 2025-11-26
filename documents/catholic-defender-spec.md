# Catholic Faith Defender App - Technical Specification

## Project Overview

A progressive web application (PWA) with mobile capabilities for Catholic apologetics, designed to work offline-first with multi-language support (English, Tagalog, Cebuano).

---

## Technology Stack

### MVP Phase (Offline-First)
- **Framework**: Next.js 15 (App Router, Static Export)
- **Styling**: TailwindCSS + shadcn/ui
- **Package Manager**: pnpm
- **State Management**: Zustand
- **Database**: IndexedDB (via idb library)
- **PWA**: @ducanh2912/next-pwa
- **Search**: MiniSearch (offline full-text search)
- **Validation**: Zod
- **Service Worker**: Workbox (via next-pwa)

### Phase 2 (Online Features)
- **Backend**: Supabase
  - Authentication
  - Favorites sync across devices
  - Content update system
  - Cloud storage for user data
  - Edge Functions (optional)

### Phase 3 (Native Mobile)
- **Mobile Wrapper**: Capacitor
- **Platforms**: iOS & Android (same codebase)

---

## Project Structure

```
catholic-defender/
├── app/
│   ├── (main)/
│   │   ├── page.tsx                    # Home page
│   │   ├── layout.tsx                  # Main layout
│   │   ├── handbook/
│   │   │   ├── page.tsx                # All topics list
│   │   │   └── [topic]/
│   │   │       └── page.tsx            # Individual topic detail
│   │   ├── search/
│   │   │   └── page.tsx                # Search interface
│   │   ├── favorites/
│   │   │   └── page.tsx                # Saved favorites
│   │   ├── settings/
│   │   │   └── page.tsx                # Language, theme settings
│   │   └── about/
│   │       └── page.tsx                # About & credits
│   └── globals.css                     # Global styles
│
├── components/
│   ├── ui/                             # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   └── tabs.tsx
│   ├── search/
│   │   ├── SearchBar.tsx               # Search input component
│   │   ├── SearchResults.tsx           # Display search results
│   │   └── SearchFilters.tsx           # Category/difficulty filters
│   ├── handbook/
│   │   ├── TopicCard.tsx               # Topic preview card
│   │   ├── TopicDetail.tsx             # Full topic view
│   │   ├── CategoryNav.tsx             # Category navigation
│   │   └── ScriptureReference.tsx      # Bible verse display
│   ├── shared/
│   │   ├── Header.tsx                  # App header with nav
│   │   ├── Footer.tsx                  # App footer
│   │   ├── OfflineBanner.tsx           # Offline status indicator
│   │   ├── SyncStatus.tsx              # Content sync indicator
│   │   ├── LanguageSwitcher.tsx        # Language selector
│   │   └── ThemeToggle.tsx             # Light/dark mode
│   └── favorites/
│       ├── FavoriteButton.tsx          # Toggle favorite
│       └── FavoritesList.tsx           # List of favorites
│
├── lib/
│   ├── db/
│   │   ├── indexeddb.ts                # IndexedDB initialization
│   │   ├── schema.ts                   # Database schema definition
│   │   └── queries.ts                  # CRUD operations
│   ├── search/
│   │   ├── minisearch-engine.ts        # MiniSearch setup
│   │   └── search-index.ts             # Index generation
│   ├── sync/
│   │   ├── supabase.ts                 # Supabase client (Phase 2)
│   │   ├── content-sync.ts             # Content update logic
│   │   └── favorites-sync.ts           # Favorites cloud sync
│   ├── content/
│   │   ├── loader.ts                   # JSON content loader
│   │   └── parser.ts                   # Content transformation
│   └── utils/
│       ├── validation.ts               # Zod schemas
│       ├── date-formatter.ts           # Date utilities
│       └── constants.ts                # App constants
│
├── store/
│   ├── useAppStore.ts                  # Global app state
│   ├── useFavoritesStore.ts            # Favorites management
│   ├── useSearchStore.ts               # Search state
│   └── useSettingsStore.ts             # User preferences
│
├── data/
│   ├── content/
│   │   ├── en/
│   │   │   ├── handbook.json           # English apologetics content
│   │   │   └── metadata.json           # Content version info
│   │   ├── tl/
│   │   │   ├── handbook.json           # Tagalog content
│   │   │   └── metadata.json
│   │   └── ceb/
│   │       ├── handbook.json           # Cebuano content
│   │       └── metadata.json
│   └── schema/
│       ├── topic.schema.ts             # Topic data structure
│       └── content.schema.ts           # Content validation
│
├── public/
│   ├── manifest.json                   # PWA manifest
│   ├── sw.js                           # Service worker (generated)
│   ├── icons/
│   │   ├── icon-192x192.png
│   │   ├── icon-512x512.png
│   │   └── favicon.ico
│   └── images/
│       └── (app images)
│
├── scripts/
│   ├── generate-search-index.ts        # Pre-build search index
│   └── validate-content.ts             # Content validation script
│
├── capacitor.config.ts                 # Capacitor configuration
├── next.config.js                      # Next.js configuration
├── tailwind.config.ts                  # Tailwind configuration
├── tsconfig.json                       # TypeScript configuration
└── package.json                        # Dependencies
```

---

## Data Schema

### Topic Schema (Zod)

```typescript
import { z } from 'zod';

export const TopicSchema = z.object({
  id: z.string(),
  category: z.enum([
    'sacraments',
    'mary',
    'papacy',
    'salvation',
    'bible',
    'saints',
    'tradition',
    'church-teaching'
  ]),
  title: z.string(),
  question: z.string(),
  answer: z.string(),
  scripture: z.array(z.object({
    reference: z.string(),    // e.g., "John 6:53-56"
    text: z.string(),
    version: z.string().optional() // e.g., "RSVCE"
  })),
  catechism: z.array(z.string()).optional(), // CCC references
  churchFathers: z.array(z.object({
    author: z.string(),
    quote: z.string(),
    source: z.string()
  })).optional(),
  tags: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  lang: z.enum(['en', 'tl', 'ceb']),
  relatedTopics: z.array(z.string()).optional(),
  lastUpdated: z.string() // ISO date
});

export type Topic = z.infer<typeof TopicSchema>;
```

### IndexedDB Schema

```typescript
interface DefenderDB extends DBSchema {
  topics: {
    key: string; // topic ID
    value: Topic;
    indexes: { 
      'by-category': string;
      'by-lang': string;
      'by-tags': string;
      'by-difficulty': string;
    };
  };
  favorites: {
    key: string; // topic ID
    value: {
      topicId: string;
      addedAt: number; // timestamp
      syncedToCloud: boolean;
    };
  };
  settings: {
    key: string;
    value: any;
  };
  searchIndex: {
    key: string;
    value: {
      lang: string;
      index: any; // MiniSearch serialized index
      version: string;
    };
  };
}
```

---

## Key Features

### MVP (Phase 1)
1. **Offline-First Architecture**
   - All content cached in IndexedDB
   - Service Worker for offline functionality
   - Static site generation for instant loading

2. **Multi-Language Support**
   - English, Tagalog, Cebuano
   - Language switcher in settings
   - Content loaded based on preference

3. **Search Functionality**
   - Full-text search using MiniSearch
   - Filter by category, difficulty
   - Search across titles, questions, answers, scripture

4. **Favorites System**
   - Save topics locally
   - Quick access to saved content
   - Export favorites (JSON)

5. **Topic Browsing**
   - Browse by category
   - Filter by difficulty level
   - Related topics navigation

6. **Responsive Design**
   - Mobile-first approach
   - Dark/light mode
   - Touch-optimized UI

### Phase 2 (Online Features)
1. **User Authentication**
   - Email/password login
   - Google OAuth
   - Anonymous mode (local only)

2. **Cloud Sync**
   - Sync favorites across devices
   - Backup user preferences
   - Conflict resolution

3. **Content Updates**
   - Check for new content on app launch
   - Download updates in background
   - Version management

4. **Community Features (Optional)**
   - Submit questions
   - Rate topic helpfulness
   - Share topics

### Phase 3 (Native Mobile)
1. **iOS & Android Apps**
   - Capacitor wrapper
   - Native splash screen
   - App store deployment

2. **Native Features**
   - Push notifications (for new content)
   - Share to other apps
   - Native file system access

---

## Configuration Files

### next.config.js

```javascript
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
        }
      }
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        }
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static export for offline-first
  images: {
    unoptimized: true // Required for static export
  },
  eslint: {
    ignoreDuringBuilds: false
  }
};

module.exports = withPWA(nextConfig);
```

### capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.catholicdefender.app',
  appName: 'Catholic Faith Defender',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1e40af",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1e40af'
    }
  }
};

export default config;
```

### manifest.json

```json
{
  "name": "Catholic Faith Defender",
  "short_name": "Faith Defender",
  "description": "Catholic apologetics handbook for defending the faith",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1e40af",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["education", "reference"],
  "screenshots": []
}
```

---

## Dependencies

### package.json

```json
{
  "name": "catholic-faith-defender",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "validate": "node scripts/validate-content.js",
    "index": "node scripts/generate-search-index.js"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@ducanh2912/next-pwa": "^10.0.0",
    "idb": "^8.0.0",
    "minisearch": "^7.0.0",
    "zustand": "^4.5.0",
    "zod": "^3.22.0",
    "@supabase/supabase-js": "^2.39.0",
    "lucide-react": "^0.263.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@capacitor/cli": "^6.0.0",
    "@capacitor/core": "^6.0.0",
    "@capacitor/ios": "^6.0.0",
    "@capacitor/android": "^6.0.0",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.17",
    "eslint": "^8",
    "eslint-config-next": "^15.0.0",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}
```

---

## Implementation Checklist

### Phase 1: MVP (Week 1-3)

**Week 1: Setup & Infrastructure**
- [ ] Initialize Next.js 15 project with TypeScript
- [ ] Install and configure TailwindCSS + shadcn/ui
- [ ] Set up pnpm workspace
- [ ] Configure PWA with @ducanh2912/next-pwa
- [ ] Create IndexedDB schema and initialization
- [ ] Set up Zustand stores
- [ ] Define Zod schemas for content validation

**Week 2: Core Features**
- [ ] Create content JSON structure (en/tl/ceb)
- [ ] Build topic loading system from JSON
- [ ] Implement IndexedDB queries (CRUD)
- [ ] Set up MiniSearch indexing
- [ ] Build search functionality
- [ ] Create favorites system (local storage)
- [ ] Implement language switcher

**Week 3: UI Development**
- [ ] Build home page with categories
- [ ] Create topic listing page
- [ ] Build topic detail page with scripture references
- [ ] Implement search interface with filters
- [ ] Create favorites page
- [ ] Add settings page (language, theme)
- [ ] Build offline indicator
- [ ] Responsive design testing

### Phase 2: Online Features (Week 4-5)

**Week 4: Supabase Integration**
- [ ] Set up Supabase project
- [ ] Configure authentication (email, Google OAuth)
- [ ] Create database schema for user data
- [ ] Build login/signup flows
- [ ] Implement favorites cloud sync
- [ ] Add content version checking

**Week 5: Sync & Updates**
- [ ] Build content update system
- [ ] Implement conflict resolution for favorites
- [ ] Add background sync for offline changes
- [ ] Create user profile page
- [ ] Add export/import functionality
- [ ] Testing and bug fixes

### Phase 3: Native Apps (Week 6-7)

**Week 6: Capacitor Setup**
- [ ] Install Capacitor CLI
- [ ] Configure iOS project
- [ ] Configure Android project
- [ ] Test core functionality on iOS
- [ ] Test core functionality on Android
- [ ] Implement native splash screen

**Week 7: Native Polish & Launch**
- [ ] Add push notification setup (optional)
- [ ] Test offline functionality on devices
- [ ] App store assets (screenshots, descriptions)
- [ ] Submit to Apple App Store
- [ ] Submit to Google Play Store
- [ ] Deploy web version to Vercel/Cloudflare

---

## Content Structure Example

### Sample Topic (en/handbook.json)

```json
{
  "topics": [
    {
      "id": "eucharist-real-presence",
      "category": "sacraments",
      "title": "The Real Presence of Christ in the Eucharist",
      "question": "Why do Catholics believe that the bread and wine become the actual Body and Blood of Christ?",
      "answer": "Catholics believe in the Real Presence because Jesus explicitly stated 'This is my body' and 'This is my blood' at the Last Supper. This is not symbolic language—the Greek word used is 'sarx' meaning actual flesh. Early Christians consistently understood this literally, as evidenced by writings from the Church Fathers. The Eucharist is the source and summit of Christian life, making Christ truly present among us.",
      "scripture": [
        {
          "reference": "John 6:53-56",
          "text": "Jesus said to them, 'Amen, amen, I say to you, unless you eat the flesh of the Son of Man and drink his blood, you do not have life within you. Whoever eats my flesh and drinks my blood has eternal life, and I will raise him on the last day. For my flesh is true food, and my blood is true drink. Whoever eats my flesh and drinks my blood remains in me and I in him.'",
          "version": "NABRE"
        },
        {
          "reference": "1 Corinthians 11:27-29",
          "text": "Therefore whoever eats the bread or drinks the cup of the Lord unworthily will have to answer for the body and blood of the Lord. A person should examine himself, and so eat the bread and drink the cup. For anyone who eats and drinks without discerning the body, eats and drinks judgment on himself.",
          "version": "NABRE"
        }
      ],
      "catechism": ["CCC 1374", "CCC 1375", "CCC 1413"],
      "churchFathers": [
        {
          "author": "St. Ignatius of Antioch",
          "quote": "They abstain from the Eucharist and from prayer because they do not confess that the Eucharist is the flesh of our Savior Jesus Christ.",
          "source": "Letter to the Smyrnaeans, 107 AD"
        }
      ],
      "tags": ["eucharist", "transubstantiation", "sacraments", "mass"],
      "difficulty": "intermediate",
      "lang": "en",
      "relatedTopics": ["mass-sacrifice", "communion-hand-tongue"],
      "lastUpdated": "2025-01-15T00:00:00Z"
    }
  ],
  "metadata": {
    "version": "1.0.0",
    "lastUpdated": "2025-01-15T00:00:00Z",
    "totalTopics": 50
  }
}
```

---

## Deployment Strategy

### Web (MVP)
- **Hosting**: Vercel or Cloudflare Pages
- **Domain**: catholicdefender.app (or similar)
- **SSL**: Automatic via hosting provider
- **CDN**: Global edge network

### Mobile (Phase 3)
- **iOS**: Apple App Store
- **Android**: Google Play Store
- **Updates**: Over-the-air via Capacitor Live Updates (optional)

---

## Performance Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse PWA Score**: 90+
- **Offline Functionality**: 100% of core features
- **App Size**: < 5MB initial download
- **IndexedDB Load Time**: < 500ms for full content

---

## Maintenance & Updates

### Content Updates
- Quarterly content reviews
- Community feedback integration
- Theological review process before publishing
- Version control for all content changes

### Technical Debt
- Monthly dependency updates
- Security audit every 6 months
- Performance monitoring via Vercel Analytics
- Bug tracking via GitHub Issues

---

## Future Enhancements (Post-Launch)

1. **Study Plans**
   - Guided learning paths
   - Daily topic recommendations
   - Progress tracking

2. **Note-Taking**
   - Add personal notes to topics
   - Highlight scripture passages
   - Export study notes

3. **Audio Support**
   - Text-to-speech for topics
   - Audio prayers
   - Podcast integration

4. **Community**
   - Discussion forums
   - Ask an apologist feature
   - Share testimonies

5. **Advanced Search**
   - AI-powered semantic search
   - Scripture cross-referencing
   - Topic relationships graph

---

## Security Considerations

1. **Data Privacy**
   - All user data encrypted at rest
   - No tracking without consent
   - GDPR compliant

2. **Content Integrity**
   - Content signing for authenticity
   - Version verification
   - Rollback mechanism for bad updates

3. **Authentication**
   - JWT tokens with short expiry
   - Refresh token rotation
   - Rate limiting on API calls

---

## License & Credits

- **Code License**: MIT or Apache 2.0
- **Content License**: Creative Commons BY-NC-SA 4.0
- **Scripture**: Use approved Catholic translations (NABRE, RSVCE)
- **Catechism**: Official Vatican text

---

## Contact & Support

- **Developer**: [Your Name/Team]
- **Email**: support@catholicdefender.app
- **GitHub**: https://github.com/yourusername/catholic-defender
- **Feedback**: In-app feedback form + GitHub Issues

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-25  
**Status**: Ready for Development