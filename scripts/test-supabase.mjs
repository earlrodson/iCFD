import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually (no dotenv needed for simple ESM script)
const envPath = resolve(process.cwd(), '.env.local')
const envLines = readFileSync(envPath, 'utf8').split('\n')
for (const line of envLines) {
  const [key, ...rest] = line.split('=')
  if (key && !key.startsWith('#') && rest.length) {
    process.env[key.trim()] = rest.join('=').trim()
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

console.log('URL:', url)
console.log('Key prefix:', key?.slice(0, 20) + '…')
console.log('')

const supabase = createClient(url, key)

// 1. Auth health — get session (should be null, not an error)
console.log('── Auth ─────────────────────────────────')
const { data: { session }, error: authErr } = await supabase.auth.getSession()
if (authErr) {
  console.error('✗ Auth error:', authErr.message)
} else {
  console.log('✓ Auth reachable — session:', session ? 'active' : 'none (expected)')
}

// 2. Public table read — site_config (RLS allows public read via publishable key)
console.log('\n── Database: site_config ────────────────')
const { data: config, error: configErr } = await supabase
  .from('site_config')
  .select('key, value')

if (configErr) {
  console.error('✗ Query error:', configErr.message, `(code: ${configErr.code})`)
} else {
  console.log(`✓ site_config rows: ${config.length}`)
  config.forEach(r => console.log(`  ${r.key} = ${r.value}`))
}

// 3. Topics table
console.log('\n── Database: topics ─────────────────────')
const { data: topics, error: topicsErr, count } = await supabase
  .from('topics')
  .select('id, lang', { count: 'exact' })
  .limit(3)

if (topicsErr) {
  console.error('✗ Query error:', topicsErr.message, `(code: ${topicsErr.code})`)
} else {
  console.log(`✓ topics table reachable — total rows: ${count}`)
  topics.forEach(t => console.log(`  ${t.id} (${t.lang})`))
}
