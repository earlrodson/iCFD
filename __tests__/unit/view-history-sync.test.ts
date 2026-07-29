import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

describe('useReadingStore — view history dirty tracking', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useReadingStore } = await import('@/store/useReadingStore')
    act(() => {
      useReadingStore.setState({ readProgress: {}, readingHistory: {}, dirtyIds: [], viewDirtyIds: [] })
    })
  })

  it('marks a topic as view-dirty when a visit is recorded', async () => {
    const { useReadingStore } = await import('@/store/useReadingStore')
    act(() => useReadingStore.getState().recordVisit('bible-tradition-authority'))

    expect(useReadingStore.getState().viewDirtyIds).toEqual(['bible-tradition-authority'])
  })

  it('does not duplicate an id already pending sync', async () => {
    const { useReadingStore } = await import('@/store/useReadingStore')
    act(() => {
      useReadingStore.getState().recordVisit('sacred-images')
      useReadingStore.getState().recordVisit('sacred-images')
    })

    expect(useReadingStore.getState().viewDirtyIds).toEqual(['sacred-images'])
  })

  it('clears synced ids via markViewsSynced', async () => {
    const { useReadingStore } = await import('@/store/useReadingStore')
    act(() => {
      useReadingStore.getState().recordVisit('sacred-images')
      useReadingStore.getState().recordVisit('bible-tradition-authority')
      useReadingStore.getState().markViewsSynced(['sacred-images'])
    })

    expect(useReadingStore.getState().viewDirtyIds).toEqual(['bible-tradition-authority'])
  })
})

describe('syncViewHistoryToCloud', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('upserts one row per topic id, keyed on (user_id, topic_id)', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn().mockReturnValue({ upsert })
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({ from }),
    }))

    const { syncViewHistoryToCloud } = await import('@/lib/supabase/sync')
    await syncViewHistoryToCloud('user-1', ['bible-tradition-authority', 'sacred-images'])

    expect(from).toHaveBeenCalledWith('view_history')
    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({ user_id: 'user-1', topic_id: 'bible-tradition-authority' }),
        expect.objectContaining({ user_id: 'user-1', topic_id: 'sacred-images' }),
      ],
      { onConflict: 'user_id,topic_id' },
    )
  })

  it('is a no-op for an empty id list', async () => {
    const upsert = vi.fn()
    const from = vi.fn().mockReturnValue({ upsert })
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({ from }),
    }))

    const { syncViewHistoryToCloud } = await import('@/lib/supabase/sync')
    await syncViewHistoryToCloud('user-1', [])

    expect(from).not.toHaveBeenCalled()
  })

  it('throws when the upsert fails', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: new Error('boom') })
    const from = vi.fn().mockReturnValue({ upsert })
    vi.doMock('@/lib/supabase/client', () => ({
      createClient: () => ({ from }),
    }))

    const { syncViewHistoryToCloud } = await import('@/lib/supabase/sync')
    await expect(syncViewHistoryToCloud('user-1', ['sacred-images'])).rejects.toThrow('boom')
  })
})

