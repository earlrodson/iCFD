/**
 * Promote a user to admin role.
 * Run with: pnpm db:admin <email>
 *
 * Example:
 *   pnpm db:admin earlrodson@gmail.com
 *
 * The user must have signed in at least once (so a user_settings row exists).
 * If they haven't signed in yet the row will be created automatically.
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import postgres from 'postgres'

const VALID_ROLES = ['user', 'editor', 'admin'] as const
type Role = typeof VALID_ROLES[number]

async function main() {
  const email = process.argv[2]
  const role  = (process.argv[3] ?? 'admin') as Role

  if (!email) {
    console.error('Usage: pnpm db:admin <email> [role]')
    console.error('       role defaults to "admin". Options: user | editor | admin')
    process.exit(1)
  }

  if (!VALID_ROLES.includes(role)) {
    console.error(`Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`)
    process.exit(1)
  }

  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('ERROR: DATABASE_URL is not set in .env.local')
    process.exit(1)
  }

  const client = postgres(url, { prepare: false, max: 1 })

  try {
    // Look up auth.users by email (requires postgres superuser — available via Supabase connection string)
    const users = await client`
      SELECT id, email FROM auth.users WHERE email = ${email} LIMIT 1
    `

    if (users.length === 0) {
      console.error(`No user found with email: ${email}`)
      console.error('Make sure the user has signed up / signed in at least once.')
      process.exit(1)
    }

    const userId = users[0].id as string

    // Upsert into user_settings — creates row if the user hasn't signed in yet
    await client`
      INSERT INTO user_settings (user_id, role)
      VALUES (${userId}, ${role})
      ON CONFLICT (user_id)
      DO UPDATE SET role = ${role}, updated_at = now()
    `

    console.log(`✓ ${email} (${userId}) is now "${role}".`)
  } finally {
    await client.end()
  }
}

main().catch(e => {
  console.error('Failed:', e.message ?? e)
  process.exit(1)
})
