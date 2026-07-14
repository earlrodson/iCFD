import { supabase } from './client'
import type { Role } from '@/drizzle/schema'

export interface UserProfile {
  user_id: string
  role: Role
  display_name: string | null
  avatar_url: string | null
  language: string
  theme: string
  font_size: string
  updated_at: string
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) return null
  return data as UserProfile
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'display_name' | 'avatar_url' | 'language' | 'theme' | 'font_size'>>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    })

  return { error: error?.message ?? null }
}
