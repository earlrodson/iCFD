/**
 * Cloud sync — pushes local IndexedDB data to Supabase on login,
 * then pulls any cloud-only data back into local stores.
 * Uses the anon key + RLS (each row is scoped to auth.uid()).
 */
import { supabase } from './client'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { useNotesStore } from '@/store/useNotesStore'
import { useProgressStore } from '@/store/useProgressStore'
import { db } from '@/lib/db/indexeddb'

export async function pushLocalToCloud(userId: string): Promise<void> {
  // Favorites
  const favoriteIds = useFavoritesStore.getState().favoriteIds
  if (favoriteIds.length > 0) {
    await supabase
      .from('favorites')
      .upsert(
        favoriteIds.map(topicId => ({ user_id: userId, topic_id: topicId })),
        { onConflict: 'user_id,topic_id', ignoreDuplicates: true }
      )
  }

  // Notes
  const notes = useNotesStore.getState().notes
  const noteEntries = Object.entries(notes).filter(([, text]) => text.trim().length > 0)
  if (noteEntries.length > 0) {
    await supabase
      .from('notes')
      .upsert(
        noteEntries.map(([topicId, text]) => ({ user_id: userId, topic_id: topicId, text })),
        { onConflict: 'user_id,topic_id' }
      )
  }

  // Read progress
  const { readTopicIds, readTimestamps } = useProgressStore.getState()
  if (readTopicIds.length > 0) {
    await supabase
      .from('read_progress')
      .upsert(
        readTopicIds.map(topicId => ({
          user_id: userId,
          topic_id: topicId,
          read_at: new Date(readTimestamps[topicId] ?? Date.now()).toISOString(),
        })),
        { onConflict: 'user_id,topic_id', ignoreDuplicates: true }
      )
  }
}

export async function pullCloudToLocal(userId: string): Promise<void> {
  // Favorites
  const { data: cloudFavs } = await supabase
    .from('favorites')
    .select('topic_id')
    .eq('user_id', userId)

  if (cloudFavs && cloudFavs.length > 0) {
    const localIds = useFavoritesStore.getState().favoriteIds
    const newIds: string[] = []

    for (const { topic_id } of cloudFavs) {
      if (!localIds.includes(topic_id as string)) {
        await db.favorites.add(topic_id as string)
        newIds.push(topic_id as string)
      }
    }

    if (newIds.length > 0) {
      useFavoritesStore.setState(s => ({
        favoriteIds: [...s.favoriteIds, ...newIds],
      }))
    }
  }

  // Notes
  const { data: cloudNotes } = await supabase
    .from('notes')
    .select('topic_id, text')
    .eq('user_id', userId)

  if (cloudNotes && cloudNotes.length > 0) {
    const localNotes = useNotesStore.getState().notes
    const merged: Record<string, string> = { ...localNotes }

    for (const { topic_id, text } of cloudNotes) {
      if (!localNotes[topic_id as string]) {
        await db.notes.set(topic_id as string, text as string)
        merged[topic_id as string] = text as string
      }
    }

    useNotesStore.setState({ notes: merged })
  }

  // Read progress
  const { data: cloudProgress } = await supabase
    .from('read_progress')
    .select('topic_id, read_at')
    .eq('user_id', userId)

  if (cloudProgress && cloudProgress.length > 0) {
    const localIds = useProgressStore.getState().readTopicIds
    const newIds: string[] = []
    const newTimestamps: Record<string, number> = {}

    for (const { topic_id, read_at } of cloudProgress) {
      if (!localIds.includes(topic_id as string)) {
        const ts = new Date(read_at as string).getTime()
        await db.readProgress.set(topic_id as string, ts)
        newIds.push(topic_id as string)
        newTimestamps[topic_id as string] = ts
      }
    }

    if (newIds.length > 0) {
      useProgressStore.setState(s => ({
        readTopicIds: [...s.readTopicIds, ...newIds],
        readTimestamps: { ...s.readTimestamps, ...newTimestamps },
      }))
    }
  }
}

export async function syncAll(userId: string): Promise<void> {
  await pushLocalToCloud(userId)
  await pullCloudToLocal(userId)
}
