'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, PaperPlaneTilt, Users, ArrowClockwise, CheckCircle, Warning, Star } from '@phosphor-icons/react'

interface NotifStatus {
  subscribers: number
  todayTopic: { id: string; title: string; question: string; is_recommended: boolean } | null
  pool: number
  usingRecommended: boolean
}

interface SendResult {
  sent: number
  failed: number
  expired: number
  topic: string
}

type SendState = 'idle' | 'sending' | 'sent' | 'error'

export default function NotificationsPage() {
  const [status, setStatus]       = useState<NotifStatus | null>(null)
  const [loading, setLoading]     = useState(true)
  const [sendState, setSendState] = useState<SendState>('idle')
  const [result, setResult]       = useState<SendResult | null>(null)
  const [sendError, setSendError] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/notifications')
    if (res.ok) setStatus(await res.json() as NotifStatus)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function sendNow() {
    setSendState('sending')
    setResult(null)
    setSendError('')
    const res = await fetch('/api/admin/notifications', { method: 'POST' })
    const data = await res.json() as SendResult & { error?: unknown }
    if (!res.ok) {
      setSendError(String(data.error ?? `Error ${res.status}`))
      setSendState('error')
    } else {
      setResult(data)
      setSendState('sent')
    }
  }

  return (
    <div className="pb-24">
      <div className="mx-auto max-w-2xl px-4 pt-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Bell weight="light" size={22} />
              Push Notifications
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Daily topic notifications sent at 8 AM Manila time via pg_cron.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <ArrowClockwise weight="light" size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Subscriber count */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Users weight="light" size={24} className="text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {loading ? '—' : (status?.subscribers ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Active subscribers</p>
          </div>
        </div>

        {/* Today's topic */}
        {status?.todayTopic && (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today&apos;s Topic</p>
              {status.usingRecommended && (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                  <Star weight="fill" size={10} /> Recommended pool
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground leading-snug">{status.todayTopic.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{status.todayTopic.question}</p>
            <div className="flex items-center gap-3 pt-1">
              <Link
                href={`/admin/topics/${status.todayTopic.id}`}
                className="text-xs text-primary hover:underline"
              >
                Edit topic →
              </Link>
              <span className="text-xs text-muted-foreground">
                Pool: {status.pool} {status.usingRecommended ? 'recommended' : 'published'} topics
              </span>
            </div>
          </div>
        )}

        {/* Send result */}
        {sendState === 'sent' && result && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-4 flex items-start gap-3">
            <CheckCircle weight="fill" size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                Sent to {result.sent} subscriber{result.sent !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                Topic: &ldquo;{result.topic}&rdquo;
                {result.failed > 0 && ` · ${result.failed} failed`}
                {result.expired > 0 && ` · ${result.expired} expired cleaned up`}
              </p>
            </div>
          </div>
        )}

        {sendState === 'error' && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-800 p-4 flex items-start gap-3">
            <Warning weight="fill" size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-rose-700 dark:text-rose-400">Send failed</p>
              <p className="text-xs text-rose-600 dark:text-rose-500 mt-0.5">{sendError}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Manual Send</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sends today&apos;s topic notification to all subscribers right now. Use to test or re-trigger if the cron missed.
            </p>
          </div>
          <button
            onClick={sendNow}
            disabled={sendState === 'sending' || (status?.subscribers ?? 0) === 0}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {sendState === 'sending'
              ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Sending…</>
              : <><PaperPlaneTilt weight="fill" size={16} /> Send Now</>
            }
          </button>
          {(status?.subscribers ?? 0) === 0 && !loading && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              No subscribers yet. Users must enable notifications in Settings first.
            </p>
          )}
        </div>

        {/* Cron info */}
        <div className="rounded-2xl border border-dashed border-border p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Automatic Schedule</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The Supabase Edge Function <code className="font-mono bg-muted px-1 rounded text-[11px]">send-daily-notification</code> runs
            daily at <strong>8:00 AM Asia/Manila</strong> via pg_cron (UTC 00:00).
            It picks today&apos;s topic from the recommended pool (if ≥ 5 topics marked recommended), otherwise cycles through all published topics.
          </p>
          <p className="text-xs text-muted-foreground">
            To mark topics as recommended, edit them in{' '}
            <Link href="/admin/topics" className="text-primary hover:underline">Admin → Topics</Link>{' '}
            and toggle the Recommended star.
          </p>
        </div>
      </div>
    </div>
  )
}
