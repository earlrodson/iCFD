import { describe, it, expect } from 'vitest'
import { issueCertificatesForCompletedPaths } from '@/lib/quiz/certificates'
import type { createAdminClient } from '@/lib/supabase/admin'

type Db = ReturnType<typeof createAdminClient>

interface Tables {
  path_topics: { path_slug: string; topic_id: string }[]
  paths: { slug: string; deleted_at: string | null }[]
  course_progress: { user_id: string; topic_id: string; tier: string }[]
  certificates: { id: string; user_id: string; path_slug: string; tier: string }[]
}

// Minimal row-filtering fake of the chainable supabase-js query builder —
// enough to exercise the real filter sequence issueCertificatesForCompletedPaths
// issues against path_topics/paths/course_progress/certificates.
function mockDb(tables: Tables) {
  function chain<T extends Record<string, unknown>>(rows: T[]) {
    return {
      eq: (col: string, val: unknown) => chain(rows.filter((r) => r[col] === val)),
      in: (col: string, vals: unknown[]) => chain(rows.filter((r) => vals.includes(r[col]))),
      is: (col: string, val: unknown) => chain(rows.filter((r) => r[col] === val)),
      maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve),
    }
  }
  return {
    from: (table: keyof Tables) => ({
      select: () => chain(tables[table] as unknown as Record<string, unknown>[]),
      insert: (row: Record<string, unknown>) => {
        tables.certificates.push(row as Tables['certificates'][number])
        return Promise.resolve({ error: null })
      },
    }),
  }
}

describe('issueCertificatesForCompletedPaths', () => {
  it('issues a certificate once every topic in the path is passed', async () => {
    const tables: Tables = {
      path_topics: [{ path_slug: 'p1', topic_id: 't1' }, { path_slug: 'p1', topic_id: 't2' }],
      paths: [{ slug: 'p1', deleted_at: null }],
      course_progress: [{ user_id: 'u1', topic_id: 't1', tier: 'beginner' }, { user_id: 'u1', topic_id: 't2', tier: 'beginner' }],
      certificates: [],
    }
    const db = mockDb(tables)

    const issued = await issueCertificatesForCompletedPaths(db as unknown as Db, 'u1', 'beginner', 't1')

    expect(issued).toEqual(['p1'])
    expect(tables.certificates).toHaveLength(1)
    expect(tables.certificates[0]).toMatchObject({ user_id: 'u1', path_slug: 'p1', tier: 'beginner' })
  })

  it('does not issue when another topic in the path is not yet passed', async () => {
    const tables: Tables = {
      path_topics: [{ path_slug: 'p1', topic_id: 't1' }, { path_slug: 'p1', topic_id: 't2' }],
      paths: [{ slug: 'p1', deleted_at: null }],
      course_progress: [{ user_id: 'u1', topic_id: 't1', tier: 'beginner' }],
      certificates: [],
    }
    const db = mockDb(tables)

    const issued = await issueCertificatesForCompletedPaths(db as unknown as Db, 'u1', 'beginner', 't1')

    expect(issued).toEqual([])
    expect(tables.certificates).toHaveLength(0)
  })

  it('does not re-issue when a certificate already exists for this user/path/tier', async () => {
    const tables: Tables = {
      path_topics: [{ path_slug: 'p1', topic_id: 't1' }],
      paths: [{ slug: 'p1', deleted_at: null }],
      course_progress: [{ user_id: 'u1', topic_id: 't1', tier: 'beginner' }],
      certificates: [{ id: 'c1', user_id: 'u1', path_slug: 'p1', tier: 'beginner' }],
    }
    const db = mockDb(tables)

    const issued = await issueCertificatesForCompletedPaths(db as unknown as Db, 'u1', 'beginner', 't1')

    expect(issued).toEqual([])
    expect(tables.certificates).toHaveLength(1)
  })

  it('issues certificates for every completed path a topic belongs to', async () => {
    const tables: Tables = {
      path_topics: [{ path_slug: 'p1', topic_id: 't1' }, { path_slug: 'p2', topic_id: 't1' }],
      paths: [{ slug: 'p1', deleted_at: null }, { slug: 'p2', deleted_at: null }],
      course_progress: [{ user_id: 'u1', topic_id: 't1', tier: 'beginner' }],
      certificates: [],
    }
    const db = mockDb(tables)

    const issued = await issueCertificatesForCompletedPaths(db as unknown as Db, 'u1', 'beginner', 't1')

    expect(issued.sort()).toEqual(['p1', 'p2'])
  })
})
