'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Plus, PencilSimple, Trash, ArrowClockwise, ArrowCounterClockwise,
  Cross, Shield, Star, Ladder, Clock, User, PushPin,
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

interface PathRow {
  slug: string
  title: string
  description: string
  difficulty: string
  audience: string
  estimated_minutes: number
  icon: string
  created_at: string
  pinned: boolean
  quiz_mode: string
  deleted_at: string | null
  topicCount?: number
}

const ICON_MAP: Record<string, React.ElementType> = {
  cross: Cross, shield: Shield, star: Star, ladder: Ladder,
}

const DIFF_COLORS: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  advanced: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
}

export default function PathsAdminPage() {
  const [paths, setPaths] = useState<PathRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<PathRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    // Admin RLS policy sees every row regardless of deleted_at — order so
    // active pinned-first paths come before the deleted ones at the bottom.
    const { data: pathRows } = await supabase
      .from('paths')
      .select('*')
      .order('deleted_at', { ascending: true, nullsFirst: true })
      .order('pinned', { ascending: false })
      .order('created_at')

    const { data: ptRows } = await supabase
      .from('path_topics')
      .select('path_slug')

    const countMap: Record<string, number> = {}
    for (const r of ptRows ?? []) {
      countMap[r.path_slug] = (countMap[r.path_slug] ?? 0) + 1
    }

    setPaths((pathRows ?? []).map((p) => ({ ...p, topicCount: countMap[p.slug] ?? 0 })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function deletePath() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    // Soft delete — path_topics is left intact so restoring brings back the
    // exact same topic list, not an empty path.
    await supabase.from('paths').update({ deleted_at: new Date().toISOString() }).eq('slug', deleteTarget.slug)
    setDeleteTarget(null)
    setDeleting(false)
    load()
  }

  async function restorePath(slug: string) {
    const supabase = createClient()
    await supabase.from('paths').update({ deleted_at: null }).eq('slug', slug)
    load()
  }

  async function togglePinned(path: PathRow) {
    const supabase = createClient()
    await supabase.from('paths').update({ pinned: !path.pinned }).eq('slug', path.slug)
    load()
  }

  const activePaths = paths.filter((p) => !p.deleted_at)
  const deletedPaths = paths.filter((p) => p.deleted_at)

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Learning Paths</h1>
            <p className="text-xs text-muted-foreground mt-1">{activePaths.length} path{activePaths.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Reload">
              <ArrowClockwise weight="light" size={16} />
            </button>
            <Link
              href="/admin/paths/new"
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <Plus weight="bold" size={14} />
              New Path
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : activePaths.length === 0 ? (
          <div className="py-16 text-center">
            <Ladder weight="light" size={40} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">No paths yet.</p>
            <Link href="/admin/paths/new" className="text-sm text-primary hover:underline">Create the first path</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activePaths.map((path) => {
              const IconComp = ICON_MAP[path.icon] ?? Ladder
              return (
                <div key={path.slug} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <IconComp weight="light" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="font-semibold text-foreground text-sm">{path.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${DIFF_COLORS[path.difficulty] ?? 'bg-muted text-muted-foreground'}`}>
                          {path.difficulty}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                          {path.quiz_mode}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{path.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Ladder size={10} /> {path.topicCount} topics</span>
                        <span className="flex items-center gap-1"><Clock size={10} /> {path.estimated_minutes} min</span>
                        <span className="flex items-center gap-1"><User size={10} /> {path.audience.slice(0, 40)}{path.audience.length > 40 ? '…' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => togglePinned(path)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${path.pinned ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                        aria-label={path.pinned ? 'Unpin' : 'Pin to top'}
                        title={path.pinned ? 'Unpin' : 'Pin to top'}
                      >
                        <PushPin weight={path.pinned ? 'fill' : 'light'} size={16} />
                      </button>
                      <Link
                        href={`/admin/paths/${path.slug}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Edit"
                      >
                        <PencilSimple weight="light" size={16} />
                      </Link>
                      <button
                        onClick={() => setDeleteTarget(path)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash weight="light" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Deleted paths */}
        {deletedPaths.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              Deleted Paths <span className="font-normal">({deletedPaths.length})</span>
            </h2>
            <div className="space-y-2">
              {deletedPaths.map((path) => (
                <div key={path.slug} className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-4 opacity-70">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground text-sm truncate">{path.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {path.topicCount} topics · deleted {new Date(path.deleted_at!).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => restorePath(path.slug)}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-card transition-colors shrink-0"
                  >
                    <ArrowCounterClockwise weight="light" size={13} />
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Delete modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-foreground mb-1">Delete path?</h2>
            <p className="text-sm text-muted-foreground mb-5">
              <span className="font-medium text-foreground">&ldquo;{deleteTarget.title}&rdquo;</span> will be hidden from the app. You can restore it later from the Deleted Paths list below — its {deleteTarget.topicCount} topic links are kept, not removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
              <button
                onClick={deletePath}
                disabled={deleting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
