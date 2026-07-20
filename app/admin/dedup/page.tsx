'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  GitFork, Robot, CheckCircle, Warning, Trophy, EyeSlash, ArrowClockwise,
} from '@phosphor-icons/react'

interface DedupTopic {
  id: string
  title: string
  score: number
  notes: string
}

interface DedupGroup {
  confidence: number
  reason: string
  winner: string
  topics: DedupTopic[]
}

interface RunResult {
  groups: DedupGroup[]
  hidden: number
  message?: string
}

type RunState = 'idle' | 'running' | 'done' | 'error'

function ConfidencePill({ value }: { value: number }) {
  const color =
    value >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
    : value >= 70 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {value}% confident
    </span>
  )
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-6 text-right">{score}</span>
    </div>
  )
}

export default function DedupPage() {
  const [state, setState] = useState<RunState>('idle')
  const [result, setResult] = useState<RunResult | null>(null)
  const [error, setError] = useState('')

  async function runAnalysis() {
    setState('running')
    setResult(null)
    setError('')

    try {
      const res = await fetch('/api/dedup', { method: 'POST' })
      const data = await res.json() as RunResult & { error?: string }
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setResult(data)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setState('error')
    }
  }

  const totalDuplicates = result?.groups.reduce((n, g) => n + g.topics.length - 1, 0) ?? 0

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <GitFork weight="light" size={22} />
              Duplicate Detection
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Claude scans all EN topics, scores quality, keeps the best, and hides the rest.
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={state === 'running'}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
          >
            {state === 'running'
              ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Analyzing…</>
              : <><Robot weight="fill" size={15} /> {state === 'done' ? 'Re-run' : 'Run Analysis'}</>
            }
          </button>
        </div>

        {/* Running state */}
        {state === 'running' && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
            <p className="text-sm text-muted-foreground">
              Sending all EN topics to Claude for duplicate analysis…
            </p>
            <p className="text-xs text-muted-foreground">This takes 15–30 seconds.</p>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 p-4 flex items-start gap-3">
            <Warning weight="fill" size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Analysis failed</p>
              <p className="text-xs text-rose-600 dark:text-rose-500 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {state === 'done' && result && (
          <>
            {/* Summary banner */}
            <div className={`rounded-2xl border p-4 flex items-center gap-4 ${
              totalDuplicates > 0
                ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'
                : 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800'
            }`}>
              {totalDuplicates > 0
                ? <Warning weight="fill" size={22} className="text-amber-600 shrink-0" />
                : <CheckCircle weight="fill" size={22} className="text-emerald-600 shrink-0" />
              }
              <div className="flex-1">
                {result.message ? (
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{result.message}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      {result.groups.length} duplicate {result.groups.length === 1 ? 'group' : 'groups'} found
                      {' · '}
                      <span className="text-rose-600">{result.hidden} topics hidden</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Winners kept published. Losers set to hidden — restore anytime in Topics.
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={runAnalysis}
                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Re-run"
              >
                <ArrowClockwise weight="light" size={16} />
              </button>
            </div>

            {/* Duplicate groups */}
            {result.groups.length > 0 && (
              <div className="space-y-4">
                {result.groups.map((group, gi) => (
                  <div key={gi} className="rounded-2xl border border-border bg-card overflow-hidden">
                    {/* Group header */}
                    <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
                      <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                        <span className="font-semibold text-foreground">Group {gi + 1}:</span>{' '}
                        {group.reason}
                      </p>
                      <ConfidencePill value={group.confidence} />
                    </div>

                    {/* Topic rows */}
                    <div className="divide-y divide-border">
                      {group.topics
                        .slice()
                        .sort((a, b) => b.score - a.score)
                        .map((t) => {
                          const isWinner = t.id === group.winner
                          return (
                            <div
                              key={t.id}
                              className={`px-4 py-3 flex items-start gap-3 ${
                                isWinner ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'opacity-60'
                              }`}
                            >
                              <div className="shrink-0 mt-0.5">
                                {isWinner
                                  ? <Trophy weight="fill" size={16} className="text-amber-500" />
                                  : <EyeSlash weight="light" size={16} className="text-rose-400" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                  <Link
                                    href={`/admin/topics/${t.id}`}
                                    className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate"
                                  >
                                    {t.title}
                                  </Link>
                                  {isWinner && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                      Kept
                                    </span>
                                  )}
                                  {!isWinner && (
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                      Hidden
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{t.notes}</p>
                                <ScoreBar score={t.score} />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Idle hint */}
        {state === 'idle' && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
            <Robot weight="light" size={32} className="mx-auto text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">No analysis run yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Click <strong>Run Analysis</strong> to scan all EN topics for duplicates.
              Claude will score each one and automatically hide the weaker copies.
            </p>
            <p className="text-xs text-muted-foreground">
              Restore hidden topics anytime via{' '}
              <Link href="/admin/topics" className="text-primary hover:underline">Admin → Topics</Link>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
