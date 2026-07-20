'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useNotesStore } from '@/store/useNotesStore'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { useReadingStore } from '@/store/useReadingStore'
import {
  syncNotesToCloud,
  fetchNotesFromCloud,
  syncFavoritesToCloud,
  fetchFavoritesFromCloud,
  syncReadProgressToCloud,
  fetchReadProgressFromCloud,
} from '@/lib/supabase/sync'

async function pushDirty(userId: string) {
  const { notes, dirtyIds: notesDirty, markSynced: notesSynced } = useNotesStore.getState()
  const { favoriteIds, addedAt, dirtyIds: favDirty, markSynced: favsSynced } = useFavoritesStore.getState()
  const { readProgress, dirtyIds: readDirty, markSynced: readSynced } = useReadingStore.getState()

  const ps: Promise<void>[] = []

  if (notesDirty.length) {
    const dirtyNotes = Object.fromEntries(
      notesDirty.filter((id) => id in notes).map((id) => [id, notes[id]])
    )
    ps.push(
      syncNotesToCloud(userId, dirtyNotes).then(() => notesSynced(notesDirty))
    )
  }

  if (favDirty.length) {
    const dirtyFavs = favDirty
      .filter((id) => favoriteIds.includes(id))
      .map((id) => ({ id, addedAt: addedAt[id] ?? new Date().toISOString() }))
    if (dirtyFavs.length) {
      ps.push(
        syncFavoritesToCloud(userId, dirtyFavs).then(() => favsSynced(favDirty))
      )
    } else {
      favsSynced(favDirty)
    }
  }

  if (readDirty.length) {
    const dirtyRead = Object.fromEntries(
      readDirty.filter((id) => id in readProgress).map((id) => [id, readProgress[id]])
    )
    ps.push(
      syncReadProgressToCloud(userId, dirtyRead).then(() => readSynced(readDirty))
    )
  }

  await Promise.allSettled(ps)
}

async function pullAndMerge(userId: string) {
  const [cloudNotes, cloudFavs, cloudRead] = await Promise.allSettled([
    fetchNotesFromCloud(userId),
    fetchFavoritesFromCloud(userId),
    fetchReadProgressFromCloud(userId),
  ])

  if (cloudNotes.status === 'fulfilled' && cloudNotes.value) {
    useNotesStore.getState().mergeFromCloud(cloudNotes.value)
  }
  if (cloudFavs.status === 'fulfilled' && cloudFavs.value) {
    useFavoritesStore.getState().mergeFromCloud(cloudFavs.value)
  }
  if (cloudRead.status === 'fulfilled' && cloudRead.value) {
    useReadingStore.getState().mergeFromCloud(cloudRead.value)
  }
}

async function syncAll(userId: string) {
  await pushDirty(userId)
  await pullAndMerge(userId)
}

export function SyncManager() {
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        await syncAll(session.user.id)
      }
    })

    const handleOnline = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        await syncAll(session.user.id)
      }
    }

    window.addEventListener('online', handleOnline)

    // Sync on mount if already online and logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && navigator.onLine) {
        syncAll(session.user.id).catch(() => {})
      }
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return null
}
