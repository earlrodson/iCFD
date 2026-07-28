import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

vi.mock('@/lib/content/loader', () => ({
  contentLoader: { loadContent: vi.fn().mockResolvedValue({ topics: [] }) },
}))

vi.mock('@/lib/search/engine', () => ({
  searchEngine: { index: vi.fn() },
}))

vi.mock('@/lib/supabase/client', () => ({
  isSupabaseConfigured: vi.fn(() => true),
}))

vi.mock('@/lib/supabase/auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/supabase/sync', () => ({
  syncUserSettingsToCloud: vi.fn().mockResolvedValue(undefined),
}))

import { isSupabaseConfigured } from '@/lib/supabase/client'
import { getSession } from '@/lib/supabase/auth'
import { syncUserSettingsToCloud } from '@/lib/supabase/sync'

beforeEach(async () => {
  vi.clearAllMocks()
  vi.mocked(isSupabaseConfigured).mockReturnValue(true)
  const { useAppStore } = await import('@/store/useAppStore')
  act(() => {
    useAppStore.setState({ currentLanguage: 'en', fontSize: 'medium' })
  })
})

describe('useAppStore — cloud sync on setLanguage/setFontSize', () => {
  it('pushes the new language to the cloud when a user is signed in', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { useAppStore } = await import('@/store/useAppStore')
    const { result } = renderHook(() => useAppStore())

    await act(async () => {
      result.current.setLanguage('tl')
      await Promise.resolve()
    })

    expect(result.current.currentLanguage).toBe('tl')
    expect(syncUserSettingsToCloud).toHaveBeenCalledWith('user-1', { language: 'tl' })
  })

  it('pushes the new font size to the cloud when a user is signed in', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: { id: 'user-1' } } as never)
    const { useAppStore } = await import('@/store/useAppStore')
    const { result } = renderHook(() => useAppStore())

    await act(async () => {
      result.current.setFontSize('large')
      await Promise.resolve()
    })

    expect(result.current.fontSize).toBe('large')
    expect(syncUserSettingsToCloud).toHaveBeenCalledWith('user-1', { font_size: 'large' })
  })

  it('does not call the cloud when no user is signed in', async () => {
    vi.mocked(getSession).mockResolvedValue({ user: null } as never)
    const { useAppStore } = await import('@/store/useAppStore')
    const { result } = renderHook(() => useAppStore())

    await act(async () => {
      result.current.setLanguage('ceb')
      await Promise.resolve()
    })

    expect(syncUserSettingsToCloud).not.toHaveBeenCalled()
  })

  it('does not call getSession at all when Supabase is not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false)
    const { useAppStore } = await import('@/store/useAppStore')
    const { result } = renderHook(() => useAppStore())

    await act(async () => {
      result.current.setLanguage('tl')
      await Promise.resolve()
    })

    expect(getSession).not.toHaveBeenCalled()
    expect(syncUserSettingsToCloud).not.toHaveBeenCalled()
  })
})
