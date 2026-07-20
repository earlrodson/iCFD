import { createClient } from 'jsr:@supabase/supabase-js@2'

// Deno-compatible web-push implementation using VAPID
// Reference: https://datatracker.ietf.org/doc/html/rfc8292

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT    = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@codexdefensoris.app'

// ── VAPID JWT ────────────────────────────────────────────────────────────────

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
  const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...binary].map((c) => c.charCodeAt(0)))
}

async function buildVapidJwt(audience: string): Promise<string> {
  const header = base64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = base64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })))

  const privateKeyBytes = base64urlDecode(VAPID_PRIVATE_KEY)
  const key = await crypto.subtle.importKey(
    'raw', privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  )

  const data = new TextEncoder().encode(`${header}.${payload}`)
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data)
  return `${header}.${payload}.${base64urlEncode(sig)}`
}

// ── Send one push ─────────────────────────────────────────────────────────────

async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, body: string) {
  const origin = new URL(sub.endpoint).origin
  const jwt = await buildVapidJwt(origin)

  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
    },
    body,
  })

  return res.status
}

// ── Pick today's topic ────────────────────────────────────────────────────────

function todayIndex(total: number): number {
  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  return dayOfYear % total
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Allow manual trigger via GET (e.g. from a cron service) or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Fetch published topics — prefer is_recommended pool if any exist
  const { data: topics } = await supabase
    .from('topics')
    .select('id, title, question, is_recommended')
    .eq('lang', 'en')
    .eq('published', true)
    .order('created_at')

  if (!topics?.length) {
    return new Response(JSON.stringify({ error: 'No published topics found' }), { status: 500 })
  }

  const recommended = topics.filter((t) => t.is_recommended)
  const pool = recommended.length >= 5 ? recommended : topics
  const topic = pool[todayIndex(pool.length)]
  const notifBody = JSON.stringify({
    title: `Today's Topic: ${topic.title}`,
    body: topic.question.slice(0, 120) + (topic.question.length > 120 ? '…' : ''),
    url: `/${topic.id}`,
  })

  // Fetch all subscriptions
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (!subs?.length) {
    return new Response(JSON.stringify({ sent: 0, message: 'No subscribers' }), { status: 200 })
  }

  // Send to all — collect results
  const results = await Promise.allSettled(
    subs.map((s) => sendPush(s, notifBody))
  )

  const sent    = results.filter((r) => r.status === 'fulfilled' && r.value < 300).length
  const failed  = results.length - sent
  const expired = results.filter((r) => r.status === 'fulfilled' && (r.value === 404 || r.value === 410)).length

  // Clean up expired subscriptions (410 Gone)
  if (expired > 0) {
    const expiredEndpoints = subs
      .filter((_, i) => {
        const r = results[i]
        return r.status === 'fulfilled' && (r.value === 404 || r.value === 410)
      })
      .map((s) => s.endpoint)

    await supabase.from('push_subscriptions').delete().in('endpoint', expiredEndpoints)
  }

  return new Response(
    JSON.stringify({ sent, failed, expired, topic: topic.title }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
