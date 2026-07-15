'use client'

/**
 * Cloud sync helpers — push local Zustand store data to Supabase.
 * All functions are no-ops when the user is not signed in or Supabase is not configured.
 * Called after sign-in and whenever local state changes (debounced by callers).
 */

import { getSupabaseBrowserClient } from './client'

// ── Favorites ────────────────────────────────────────────────────────────────

export async function syncFavoritesToCloud(
  userId: string,
  favorites: { id: string; addedAt: string | null }[],
) {
  const sb = getSupabaseBrowserClient()
  if (!sb) return

  if (favorites.length === 0) return

  const rows = favorites.map(({ id, addedAt }) => ({
    user_id: userId,
    topic_id: id,
    added_at: addedAt ?? new Date().toISOString(),
  }))

  await sb.from('favorites').upsert(rows, { onConflict: 'user_id,topic_id', ignoreDuplicates: false })
}

export async function fetchFavoritesFromCloud(userId: string) {
  const sb = getSupabaseBrowserClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('favorites')
    .select('topic_id, added_at')
    .eq('user_id', userId)

  if (error || !data) return null
  return data.map((r) => ({ id: r.topic_id as string, addedAt: r.added_at as string }))
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function syncNotesToCloud(
  userId: string,
  notes: Record<string, string>,
) {
  const sb = getSupabaseBrowserClient()
  if (!sb) return

  const entries = Object.entries(notes).filter(([, text]) => text.trim())
  if (entries.length === 0) return

  const rows = entries.map(([topicId, text]) => ({
    user_id: userId,
    topic_id: topicId,
    text,
    updated_at: new Date().toISOString(),
  }))

  await sb.from('notes').upsert(rows, { onConflict: 'user_id,topic_id' })
}

export async function fetchNotesFromCloud(userId: string) {
  const sb = getSupabaseBrowserClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('notes')
    .select('topic_id, text')
    .eq('user_id', userId)

  if (error || !data) return null
  return Object.fromEntries(data.map((r) => [r.topic_id as string, r.text as string]))
}

// ── Read Progress ─────────────────────────────────────────────────────────────

export async function syncReadProgressToCloud(
  userId: string,
  progress: Record<string, { isRead: boolean; readAt: string | null }>,
) {
  const sb = getSupabaseBrowserClient()
  if (!sb) return

  const read = Object.entries(progress)
    .filter(([, p]) => p.isRead)
    .map(([topicId, p]) => ({
      user_id: userId,
      topic_id: topicId,
      read_at: p.readAt ?? new Date().toISOString(),
    }))

  if (read.length === 0) return
  await sb.from('read_progress').upsert(read, { onConflict: 'user_id,topic_id' })
}

export async function fetchReadProgressFromCloud(userId: string) {
  const sb = getSupabaseBrowserClient()
  if (!sb) return null

  const { data, error } = await sb
    .from('read_progress')
    .select('topic_id, read_at')
    .eq('user_id', userId)

  if (error || !data) return null
  return Object.fromEntries(
    data.map((r) => [r.topic_id as string, { isRead: true, readAt: r.read_at as string }]),
  )
}
