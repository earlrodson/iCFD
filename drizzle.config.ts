import type { Config } from 'drizzle-kit'

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Use the DIRECT connection URL (not pooler) for migrations.
    // Format: postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config
