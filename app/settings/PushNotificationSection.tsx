'use client'

import { Bell, BellSlash, BellRinging } from '@phosphor-icons/react'
import { usePushNotifications } from '@/lib/usePushNotifications'
import { SectionLabel } from './components'
import { cn } from '@/lib/utils'

export function PushNotificationSection() {
  const { status, subscribe, unsubscribe } = usePushNotifications()

  if (status === 'unsupported') return null

  const isSubscribed  = status === 'subscribed'
  const isDenied      = status === 'denied'
  const isLoading     = status === 'loading'

  return (
    <section className="space-y-3">
      <SectionLabel>Notifications</SectionLabel>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 p-4">
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            isSubscribed ? 'bg-primary/10' : isDenied ? 'bg-muted' : 'bg-muted',
          )}>
            {isSubscribed
              ? <BellRinging weight="fill" size={20} className="text-primary" />
              : isDenied
              ? <BellSlash weight="light" size={20} className="text-muted-foreground" />
              : <Bell weight="light" size={20} className="text-muted-foreground" />}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Daily Topic Reminder</p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed
                ? 'You\'ll get a daily apologetics topic notification'
                : isDenied
                ? 'Notifications blocked — enable in browser settings'
                : isLoading
                ? 'Checking…'
                : 'Get a new topic delivered every day'}
            </p>
          </div>

          {!isDenied && (
            <button
              onClick={isSubscribed ? unsubscribe : subscribe}
              disabled={isLoading}
              className={cn(
                'shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50',
                isSubscribed
                  ? 'border border-border bg-card text-muted-foreground hover:text-rose-500 hover:border-rose-300'
                  : 'bg-primary text-primary-foreground hover:opacity-90',
              )}
            >
              {isLoading ? '…' : isSubscribed ? 'Turn off' : 'Enable'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
