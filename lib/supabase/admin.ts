import { supabase } from './client'
import type { Role } from '@/drizzle/schema'

export interface AdminUser {
  user_id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  role: Role
  created_at: string
  last_sign_in_at: string | null
}

export async function listUsers(): Promise<{ data: AdminUser[]; error: string | null }> {
  const { data, error } = await supabase.rpc('get_all_users')
  if (error) return { data: [], error: error.message }
  return { data: (data ?? []) as AdminUser[], error: null }
}

export async function setUserRole(
  targetUserId: string,
  newRole: Role
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('set_user_role', {
    target_user_id: targetUserId,
    new_role: newRole,
  })
  return { error: error?.message ?? null }
}

export interface TopicFormData {
  id: string
  lang: string
  category: string
  title: string
  question: string
  answer: string
  tags: string
  difficulty: string
}

export async function adminUpsertTopic(data: TopicFormData): Promise<{ error: string | null }> {
  const { error } = await supabase.from('topics').upsert({
    id: data.id,
    lang: data.lang,
    category: data.category,
    title: data.title,
    question: data.question,
    answer: data.answer,
    tags: data.tags.split(',').map(t => t.trim()).filter(Boolean),
    difficulty: data.difficulty,
    last_updated: new Date().toISOString(),
  })
  return { error: error?.message ?? null }
}

export async function adminDeleteTopic(
  id: string,
  lang: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('topics')
    .delete()
    .eq('id', id)
    .eq('lang', lang)
  return { error: error?.message ?? null }
}

export async function adminListTopics(lang = 'en', page = 0, pageSize = 20) {
  const from = page * pageSize
  const to = from + pageSize - 1
  const { data, error, count } = await supabase
    .from('topics')
    .select('id, lang, category, title, difficulty, last_updated', { count: 'exact' })
    .eq('lang', lang)
    .order('category')
    .order('title')
    .range(from, to)
  return { data: data ?? [], error: error?.message ?? null, count: count ?? 0 }
}

export interface PathFormData {
  slug: string
  title: string
  description: string
  audience: string
  estimated_minutes: number
  difficulty: string
  icon: string
}

export async function adminUpsertPath(data: PathFormData): Promise<{ error: string | null }> {
  const { error } = await supabase.from('paths').upsert(data)
  return { error: error?.message ?? null }
}

export async function adminDeletePath(slug: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('paths').delete().eq('slug', slug)
  return { error: error?.message ?? null }
}
