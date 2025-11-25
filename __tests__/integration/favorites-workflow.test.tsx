import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useFavoritesStore, useFavoriteActions } from '@/store/useFavoritesStore'
import { createMockTopic } from '../jest.setup'
import type { Topic } from '@/data/schema/topic.schema'

// Mock component for testing favorites workflow
function TestFavoritesComponent() {
  const {
    favoriteIds,
    loading,
    error,
    isFavorite,
    getFavoriteTopics,
    getFavoritesCount,
    clearFavorites
  } = useFavoritesStore()

  const { toggleFavorite, addToFavorites, removeFromFavorites, exportFavorites, importFavorites } =
    useFavoriteActions()

  const [importData, setImportData] = React.useState('')

  // Mock topics for testing
  const mockTopics: Topic[] = [
    createMockTopic({
      id: 'eucharist-1',
      title: 'Understanding the Eucharist',
      category: 'sacraments'
    }),
    createMockTopic({
      id: 'mary-1',
      title: 'Mary Mother of God',
      category: 'mary'
    }),
    createMockTopic({
      id: 'papacy-1',
      title: 'Papal Authority',
      category: 'papacy'
    })
  ]

  const favoriteTopics = getFavoriteTopics(mockTopics)
  const favoritesCount = getFavoritesCount()

  const handleToggleFavorite = async (topicId: string) => {
    const newState = await toggleFavorite(topicId)
    console.log(`Topic ${topicId} is now ${newState ? 'favorited' : 'not favorited'}`)
  }

  const handleImport = async () => {
    try {
      await importFavorites(importData)
      setImportData('')
    } catch (error) {
      console.error('Import failed:', error)
    }
  }

  const handleExport = async () => {
    try {
      const exported = await exportFavorites()
      setImportData(exported)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  return (
    <div data-testid="favorites-component">
      <div data-testid="favorites-status">
        <span data-testid="favorites-count">{favoritesCount}</span>
        {loading && <span data-testid="loading-indicator">Loading...</span>}
        {error && <span data-testid="error-message">{error}</span>}
      </div>

      <div data-testid="topic-list">
        {mockTopics.map((topic) => (
          <div key={topic.id} data-testid={`topic-${topic.id}`}>
            <h3>{topic.title}</h3>
            <p>Category: {topic.category}</p>
            <button
              onClick={() => handleToggleFavorite(topic.id)}
              data-testid={`toggle-${topic.id}`}
              aria-label={isFavorite(topic.id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite(topic.id) ? '❤️ Favorited' : '🤍 Add to Favorite'}
            </button>
          </div>
        ))}
      </div>

      <div data-testid="favorites-display">
        <h4>Favorite Topics ({favoriteTopics.length})</h4>
        {favoriteTopics.map((topic) => (
          <div key={topic.id} data-testid={`favorite-${topic.id}`}>
            <h5>{topic.title}</h5>
            <button
              onClick={() => handleToggleFavorite(topic.id)}
              data-testid={`remove-favorite-${topic.id}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div data-testid="favorites-actions">
        <button onClick={() => addToFavorites('eucharist-1')} data-testid="add-favorite">
          Add Eucharist to Favorites
        </button>
        <button onClick={() => removeFromFavorites('mary-1')} data-testid="remove-favorite-direct">
          Remove Mary from Favorites
        </button>
        <button onClick={clearFavorites} data-testid="clear-all-favorites">
          Clear All Favorites
        </button>
        <button onClick={handleExport} data-testid="export-favorites">
          Export Favorites
        </button>
        <button onClick={handleImport} data-testid="import-favorites">
          Import Favorites
        </button>
      </div>

      <div data-testid="import-export">
        <textarea
          value={importData}
          onChange={(e) => setImportData(e.target.value)}
          placeholder="Paste JSON data here"
          data-testid="import-textarea"
          rows={5}
          cols={50}
        />
      </div>

      <div data-testid="favorite-ids-display">
        {favoriteIds.join(', ')}
      </div>
    </div>
  )
}

describe('Favorites Workflow Integration Tests', () => {
  beforeEach(() => {
    // Reset the favorites store state before each test
    useFavoritesStore.setState({
      favoriteIds: [],
      loading: false,
      error: null
    })
  })

  describe('Adding and Removing Favorites', () => {
    it('should add topic to favorites', async () => {
      render(<TestFavoritesComponent />)

      const addButton = screen.getByTestId('add-favorite')
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('1')
        expect(screen.getByTestId('toggle-eucharist-1')).toHaveTextContent('❤️ Favorited')
        expect(screen.getByTestId('favorite-eucharist-1')).toBeInTheDocument()
      })
    })

    it('should toggle favorite status', async () => {
      render(<TestFavoritesComponent />)

      const toggleButton = screen.getByTestId('toggle-mary-1')

      // Add to favorites
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('1')
        expect(toggleButton).toHaveTextContent('❤️ Favorited')
      })

      // Remove from favorites
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('0')
        expect(toggleButton).toHaveTextContent('🤍 Add to Favorite')
      })
    })

    it('should remove topic from favorites directly', async () => {
      // First add to favorites
      const state = useFavoritesStore.getState()
      state.favoriteIds = ['mary-1']

      render(<TestFavoritesComponent />)

      const removeButton = screen.getByTestId('remove-favorite-direct')
      fireEvent.click(removeButton)

      await waitFor(() => {
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('0')
        expect(screen.queryByTestId('favorite-mary-1')).not.toBeInTheDocument()
      })
    })

    it('should clear all favorites', async () => {
      // Setup multiple favorites
      const state = useFavoritesStore.getState()
      state.favoriteIds = ['eucharist-1', 'mary-1', 'papacy-1']

      render(<TestFavoritesComponent />)

      expect(screen.getByTestId('favorites-count')).toHaveTextContent('3')

      const clearButton = screen.getByTestId('clear-all-favorites')
      fireEvent.click(clearButton)

      await waitFor(() => {
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('0')
        expect(screen.queryByTestId('favorite-eucharist-1')).not.toBeInTheDocument()
        expect(screen.queryByTestId('favorite-mary-1')).not.toBeInTheDocument()
        expect(screen.queryByTestId('favorite-papacy-1')).not.toBeInTheDocument()
      })
    })
  })

  describe('Favorites Display', () => {
    it('should display only favorite topics', async () => {
      // Setup favorites
      const state = useFavoritesStore.getState()
      state.favoriteIds = ['eucharist-1', 'papacy-1']

      render(<TestFavoritesComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('2')
        expect(screen.getByTestId('favorite-eucharist-1')).toBeInTheDocument()
        expect(screen.getByTestId('favorite-papacy-1')).toBeInTheDocument()
        expect(screen.queryByTestId('favorite-mary-1')).not.toBeInTheDocument()
      })
    })

    it('should show empty state when no favorites', async () => {
      render(<TestFavoritesComponent />)

      expect(screen.getByTestId('favorites-count')).toHaveTextContent('0')
      expect(screen.queryByTestId('favorite-eucharist-1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('favorite-mary-1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('favorite-papacy-1')).not.toBeInTheDocument()
    })

    it('should update favorites display when favorites change', async () => {
      render(<TestFavoritesComponent />)

      // Add first favorite
      const addMaryButton = screen.getByTestId('toggle-mary-1')
      fireEvent.click(addMaryButton)

      await waitFor(() => {
        expect(screen.getByTestId('favorite-mary-1')).toBeInTheDocument()
      })

      // Add second favorite
      const addEucharistButton = screen.getByTestId('toggle-eucharist-1')
      fireEvent.click(addEucharistButton)

      await waitFor(() => {
        expect(screen.getByTestId('favorite-eucharist-1')).toBeInTheDocument()
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('2')
      })
    })
  })

  describe('Import/Export Functionality', () => {
    it('should export favorites to JSON', async () => {
      // Setup some favorites
      const state = useFavoritesStore.getState()
      state.favoriteIds = ['eucharist-1', 'mary-1']

      render(<TestFavoritesComponent />)

      const exportButton = screen.getByTestId('export-favorites')
      fireEvent.click(exportButton)

      await waitFor(() => {
        const textarea = screen.getByTestId('import-textarea')
        const exportedData = textarea.value

        // Should contain valid JSON
        expect(() => JSON.parse(exportedData)).not.toThrow()

        const parsed = JSON.parse(exportedData)
        expect(parsed.version).toBe('1.0.0')
        expect(parsed.exportDate).toBeDefined()
        expect(parsed.favorites).toHaveLength(2)
      })
    })

    it('should import favorites from JSON', async () => {
      const importData = JSON.stringify({
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        favorites: [
          { topicId: 'eucharist-1', addedAt: new Date().toISOString() },
          { topicId: 'papacy-1', addedAt: new Date().toISOString() }
        ]
      })

      render(<TestFavoritesComponent />)

      const textarea = screen.getByTestId('import-textarea')
      fireEvent.change(textarea, { target: { value: importData } })

      const importButton = screen.getByTestId('import-favorites')
      fireEvent.click(importButton)

      await waitFor(() => {
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('2')
        expect(screen.getByTestId('favorite-eucharist-1')).toBeInTheDocument()
        expect(screen.getByTestId('favorite-papacy-1')).toBeInTheDocument()
      })
    })

    it('should handle invalid import data', async () => {
      render(<TestFavoritesComponent />)

      const textarea = screen.getByTestId('import-textarea')
      fireEvent.change(textarea, { target: { value: 'invalid json' } })

      const importButton = screen.getByTestId('import-favorites')
      fireEvent.click(importButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })
    })

    it('should handle import data with missing favorites array', async () => {
      const invalidData = JSON.stringify({
        version: '1.0.0',
        exportDate: new Date().toISOString()
        // Missing favorites array
      })

      render(<TestFavoritesComponent />)

      const textarea = screen.getByTestId('import-textarea')
      fireEvent.change(textarea, { target: { value: invalidData } })

      const importButton = screen.getByTestId('import-favorites')
      fireEvent.click(importButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle favorite toggle errors gracefully', async () => {
      // Mock database error
      const mockToggleFavorite = jest.fn().mockRejectedValue(new Error('Database error'))
      jest.spyOn(useFavoriteActions(), 'toggleFavorite').mockImplementation(mockToggleFavorite)

      render(<TestFavoritesComponent />)

      const toggleButton = screen.getByTestId('toggle-mary-1')
      fireEvent.click(toggleButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })
    })

    it('should handle import/export errors gracefully', async () => {
      // Mock export error
      const mockExportFavorites = jest.fn().mockRejectedValue(new Error('Export failed'))
      jest.spyOn(useFavoriteActions(), 'exportFavorites').mockImplementation(mockExportFavorites)

      render(<TestFavoritesComponent />)

      const exportButton = screen.getByTestId('export-favorites')
      fireEvent.click(exportButton)

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })
    })
  })

  describe('State Management', () => {
    it('should maintain favorite IDs correctly', async () => {
      render(<TestFavoritesComponent />)

      // Add multiple favorites
      fireEvent.click(screen.getByTestId('toggle-eucharist-1'))
      fireEvent.click(screen.getByTestId('toggle-mary-1'))
      fireEvent.click(screen.getByTestId('toggle-papacy-1'))

      await waitFor(() => {
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('3')
      })

      const state = useFavoritesStore.getState()
      expect(state.favoriteIds).toContain('eucharist-1')
      expect(state.favoriteIds).toContain('mary-1')
      expect(state.favoriteIds).toContain('papacy-1')
    })

    it('should handle duplicate favorite additions', async () => {
      render(<TestFavoritesComponent />)

      // Add same favorite twice
      const addButton = screen.getByTestId('add-favorite')
      fireEvent.click(addButton)
      fireEvent.click(addButton)

      await waitFor(() => {
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('1')
      })
    })

    it('should handle removing non-existent favorites gracefully', async () => {
      render(<TestFavoritesComponent />)

      // Try to remove topic that's not favorited
      const removeButton = screen.getByTestId('remove-favorite-direct')
      fireEvent.click(removeButton)

      // Should not cause errors
      expect(screen.getByTestId('favorites-count')).toHaveTextContent('0')
    })
  })

  describe('Loading States', () => {
    it('should show loading indicator during operations', async () => {
      // Mock slow operation
      const mockToggleFavorite = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      )
      jest.spyOn(useFavoriteActions(), 'toggleFavorite').mockImplementation(mockToggleFavorite)

      render(<TestFavoritesComponent />)

      const toggleButton = screen.getByTestId('toggle-mary-1')
      fireEvent.click(toggleButton)

      // Should show loading immediately
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByTestId('loading-indicator')).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('Performance', () => {
    it('should handle large favorite lists efficiently', async () => {
      // Create many favorites
      const manyIds = Array.from({ length: 1000 }, (_, i) => `topic-${i}`)
      const state = useFavoritesStore.getState()
      state.favoriteIds = manyIds

      render(<TestFavoritesComponent />)

      expect(() => {
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('1000')
      }).not.toThrow()
    })

    it('should handle rapid favorite operations efficiently', async () => {
      render(<TestFavoritesComponent />)

      // Rapid fire operations
      fireEvent.click(screen.getByTestId('toggle-eucharist-1'))
      fireEvent.click(screen.getByTestId('toggle-mary-1'))
      fireEvent.click(screen.getByTestId('toggle-papacy-1'))
      fireEvent.click(screen.getByTestId('toggle-eucharist-1')) // Remove
      fireEvent.click(screen.getByTestId('toggle-mary-1')) // Remove

      await waitFor(() => {
        expect(screen.getByTestId('favorites-count')).toHaveTextContent('1')
      })
    })
  })
})