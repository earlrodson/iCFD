import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUser } from '@/lib/supabase/auth'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export type PushStatus = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('loading')

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'subscribed' : 'unsubscribed')
    })
  }, [])

  const subscribe = useCallback(async () => {
    if (!VAPID_PUBLIC_KEY) return
    setStatus('loading')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setStatus('denied'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const json = sub.toJSON()
      const keys = json.keys as { p256dh: string; auth: string }
      const user = await getUser()

      await createClient().from('push_subscriptions').upsert({
        user_id: user?.id ?? null,
        endpoint: json.endpoint!,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }, { onConflict: 'endpoint' })

      setStatus('subscribed')
    } catch {
      setStatus('unsubscribed')
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setStatus('loading')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await createClient().from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        await sub.unsubscribe()
      }
      setStatus('unsubscribed')
    } catch {
      setStatus('subscribed')
    }
  }, [])

  return { status, subscribe, unsubscribe }
}
