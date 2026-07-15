/**
 * Central app configuration.
 *
 * Values are read from NEXT_PUBLIC_* env vars at build time.
 * At runtime, admins can override them via the `site_config` database table
 * (see drizzle/schema.ts → siteConfig). The admin panel (Phase 3) will
 * expose a UI to edit these without requiring a redeploy.
 *
 * Adding a new config key:
 * 1. Add NEXT_PUBLIC_* var to .env.local (and production env)
 * 2. Add the key here with its env var + default
 * 3. Add a matching row in the site_config table migration
 */

export const APP_CONFIG = {
  /** Full product name shown in hero, browser tab, and PWA installer. */
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Codex Defensoris',

  /** Short name shown on home screen icon label. Max 12 chars. */
  appShortName: process.env.NEXT_PUBLIC_APP_SHORT_NAME ?? 'iCFD',

  /** Slug used internally as app identifier (safe for URLs and storage keys). */
  appId: process.env.NEXT_PUBLIC_APP_ID ?? 'codex-defensoris',

  /** Human-readable description for meta tags and PWA install prompt. */
  description:
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ??
    'Offline-first Catholic apologetics app with Scripture, Tradition, and Catechism',

  version: process.env.NEXT_PUBLIC_APP_VERSION ?? '2.0.0',
} as const

export type AppConfig = typeof APP_CONFIG
