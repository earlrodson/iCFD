import { config } from 'dotenv'
import type { Config } from 'drizzle-kit'

// drizzle-kit doesn't auto-load .env.local — load it explicitly
config({ path: '.env.local' })

export default {
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // Supabase transaction-mode pooler (port 6543).
    // Set DATABASE_URL in .env.local — see .env.example for format.
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config
