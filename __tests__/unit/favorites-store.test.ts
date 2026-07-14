import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Reset module between tests so store state doesn't bleed
beforeEach(async () => {
  const { useFavoritesStore } = await import('@/store/useFavoritesStore')
  act(() => {
    useFavoritesStore.setState({ favoriteIds: [] })
  })
})

describe('useFavoritesStore', () => {
  it('starts with no favorites', async () => {
    const { useFavoritesStore } = await import('@/store/useFavoritesStore')
    const { result } = renderHook(() => useFavoritesStore())
    expect(result.current.favoriteIds).toHaveLength(0)
  })

  it('toggleFavorite adds a topic id', async () => {
    const { useFavoritesStore } = await import('@/store/useFavoritesStore')
    const { result } = renderHook(() => useFavoritesStore())
    act(() => result.current.toggleFavorite('baptism-necessity'))
    expect(result.current.favoriteIds).toContain('baptism-necessity')
  })

  it('toggleFavorite removes an already-favorited topic', async () => {
    const { useFavoritesStore } = await import('@/store/useFavoritesStore')
    const { result } = renderHook(() => useFavoritesStore())
    act(() => result.current.toggleFavorite('papacy'))
    act(() => result.current.toggleFavorite('papacy'))
    expect(result.current.favoriteIds).not.toContain('papacy')
  })

  it('isFavorite returns true after adding', async () => {
    const { useFavoritesStore } = await import('@/store/useFavoritesStore')
    const { result } = renderHook(() => useFavoritesStore())
    act(() => result.current.toggleFavorite('saints-intercession'))
    expect(result.current.isFavorite('saints-intercession')).toBe(true)
  })

  it('isFavorite returns false for unknown id', async () => {
    const { useFavoritesStore } = await import('@/store/useFavoritesStore')
    const { result } = renderHook(() => useFavoritesStore())
    expect(result.current.isFavorite('nonexistent')).toBe(false)
  })

  it('can hold multiple favorites independently', async () => {
    const { useFavoritesStore } = await import('@/store/useFavoritesStore')
    const { result } = renderHook(() => useFavoritesStore())
    act(() => {
      result.current.toggleFavorite('a')
      result.current.toggleFavorite('b')
      result.current.toggleFavorite('c')
    })
    expect(result.current.favoriteIds).toHaveLength(3)
    act(() => result.current.toggleFavorite('b'))
    expect(result.current.favoriteIds).toHaveLength(2)
    expect(result.current.isFavorite('b')).toBe(false)
  })
})
