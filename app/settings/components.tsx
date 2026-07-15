'use client'

import { CheckCircle } from '@phosphor-icons/react'

export type SyncStatus = 'idle' | 'syncing' | 'done' | 'error'

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

export function SyncButton({
  status, onClick, icon, title, idleDesc, syncingDesc,
}: {
  status: SyncStatus
  onClick: () => void
  icon: React.ReactNode
  title: string
  idleDesc: string
  syncingDesc: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={status === 'syncing'}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:bg-muted transition-colors disabled:opacity-60"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        {status === 'done'
          ? <CheckCircle weight="fill" size={20} className="text-emerald-500" />
          : icon}
      </div>
      <div className="text-left">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">
          {status === 'syncing' ? syncingDesc : status === 'error' ? 'Error — try again' : idleDesc}
        </p>
      </div>
    </button>
  )
}
