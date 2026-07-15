'use client'

/**
 * Cloud sync — push/pull Zustand store data to/from Supabase.
 * Each function creates its own client instance (factory pattern).
 * All operations are protected by RLS (auth.uid() = user_id).
 */

import { createClient } from './client'
import type { TablesInsert } from './database.types'

// ── Favorites ─────────────────────────────────────────────────────────────────

export async function syncFavoritesToCloud(
  userId: string,
  favorites: { id: string; addedAt: string | null }[],
) {
  if (!favorites.length) return

  const rows: TablesInsert<'favorites'>[] = favorites.map(({ id, addedAt }) => ({
    user_id: userId,
    topic_id: id,
    added_at: addedAt ?? new Date().toISOString(),
  }))

  const { error } = await createClient()
    .from('favorites')
    .upsert(rows, { onConflict: 'user_id,topic_id', ignoreDuplicates: false })

  if (error) throw error
}

export async function fetchFavoritesFromCloud(
  userId: string,
): Promise<{ id: string; addedAt: string }[] | null> {
  const { data, error } = await createClient()
    .from('favorites')
    .select('topic_id, added_at')
    .eq('user_id', userId)

  if (error) throw error
  return data.map((r) => ({ id: r.topic_id, addedAt: r.added_at }))
}

export async function removeFavoriteFromCloud(userId: string, topicId: string) {
  const { error } = await createClient()
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('topic_id', topicId)

  if (error) throw error
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function syncNotesToCloud(userId: string, notes: Record<string, string>) {
  const entries = Object.entries(notes).filter(([, text]) => text.trim())
  if (!entries.length) return

  const rows: TablesInsert<'notes'>[] = entries.map(([topicId, text]) => ({
    user_id: userId,
    topic_id: topicId,
    text,
  }))

  const { error } = await createClient()
    .from('notes')
    .upsert(rows, { onConflict: 'user_id,topic_id' })

  if (error) throw error
}

export async function fetchNotesFromCloud(
  userId: string,
): Promise<Record<string, string> | null> {
  const { data, error } = await createClient()
    .from('notes')
    .select('topic_id, text')
    .eq('user_id', userId)

  if (error) throw error
  return Object.fromEntries(data.map((r) => [r.topic_id, r.text]))
}

// ── Read Progress ─────────────────────────────────────────────────────────────

export async function syncReadProgressToCloud(
  userId: string,
  progress: Record<string, { isRead: boolean; readAt: string | null }>,
) {
  const read = Object.entries(progress).filter(([, p]) => p.isRead)
  if (!read.length) return

  const rows: TablesInsert<'read_progress'>[] = read.map(([topicId, p]) => ({
    user_id: userId,
    topic_id: topicId,
    read_at: p.readAt ?? new Date().toISOString(),
  }))

  const { error } = await createClient()
    .from('read_progress')
    .upsert(rows, { onConflict: 'user_id,topic_id' })

  if (error) throw error
}

export async function fetchReadProgressFromCloud(
  userId: string,
): Promise<Record<string, { isRead: boolean; readAt: string }> | null> {
  const { data, error } = await createClient()
    .from('read_progress')
    .select('topic_id, read_at')
    .eq('user_id', userId)

  if (error) throw error
  return Object.fromEntries(
    data.map((r) => [r.topic_id, { isRead: true, readAt: r.read_at }]),
  )
}

// ── User Settings ─────────────────────────────────────────────────────────────

export async function syncUserSettingsToCloud(
  userId: string,
  settings: { language: 'en' | 'tl' | 'ceb'; theme: 'light' | 'dark' | 'system'; font_size: 'small' | 'medium' | 'large' },
) {
  const { error } = await createClient()
    .from('user_settings')
    .upsert({ user_id: userId, ...settings })

  if (error) throw error
}

export async function fetchUserSettingsFromCloud(userId: string) {
  const { data, error } = await createClient()
    .from('user_settings')
    .select('language, theme, font_size')
    .eq('user_id', userId)
    .single()

  if (error) return null
  return data
}
