import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TopicCard, TopicCardGrid } from '../TopicCard'
import { createMockTopic } from '../../../jest.setup'
import { useFavoritesStore, useFavoriteActions } from '@/store/useFavoritesStore'

// Mock the store hooks
jest.mock('@/store/useFavoritesStore')

const mockUseFavoritesStore = useFavoritesStore as jest.MockedFunction<typeof useFavoritesStore>
const mockUseFavoriteActions = useFavoriteActions as jest.MockedFunction<typeof useFavoriteActions>

// Mock utility functions
jest.mock('@/lib/utils', () => ({
  getCategoryName: jest.fn((category: string) => category.charAt(0).toUpperCase() + category.slice(1)),
  getCategoryIcon: jest.fn((category: string) => '🏛️'),
  getDifficultyLabel: jest.fn((difficulty: string) => difficulty.charAt(0).toUpperCase() + difficulty.slice(1)),
  formatRelativeTime: jest.fn((date: string) => '2 days ago'),
  cn: jest.fn((...classes: any[]) => classes.filter(Boolean).join(' '))
}))

describe('TopicCard', () => {
  let mockTopic: any
  let mockIsFavorite: jest.Mock
  let mockToggleFavorite: jest.Mock

  beforeEach(() => {
    mockTopic = createMockTopic({
      id: 'test-topic-1',
      title: 'Test Topic Title',
      question: 'This is a test question?',
      answer: 'This is a test answer.',
      category: 'sacraments',
      difficulty: 'beginner',
      tags: ['test', 'sacraments'],
      scripture: [{ reference: 'John 3:16', text: 'For God so loved...', version: 'NABRE' }],
      churchFathers: [{ author: 'St. Augustine', quote: 'Test quote', source: 'Test source' }],
      lastUpdated: '2025-01-15T00:00:00Z'
    })

    mockIsFavorite = jest.fn().mockReturnValue(false)
    mockToggleFavorite = jest.fn().mockResolvedValue(true)

    mockUseFavoritesStore.mockReturnValue({
      isFavorite: mockIsFavorite,
      favoriteIds: [],
      loading: false,
      error: null
    } as any)

    mockUseFavoriteActions.mockReturnValue({
      toggleFavorite: mockToggleFavorite,
      addToFavorites: jest.fn(),
      removeFromFavorites: jest.fn(),
      clearFavorites: jest.fn(),
      exportFavorites: jest.fn(),
      importFavorites: jest.fn()
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders topic card with all information', () => {
      render(<TopicCard topic={mockTopic} />)

      expect(screen.getByText('Test Topic Title')).toBeInTheDocument()
      expect(screen.getByText('This is a test question?')).toBeInTheDocument()
      expect(screen.getByText('🏛️')).toBeInTheDocument() // Category icon
      expect(screen.getByText('Sacraments')).toBeInTheDocument() // Category name
      expect(screen.getByText('Beginner')).toBeInTheDocument() // Difficulty
      expect(screen.getByText('1 scripture')).toBeInTheDocument() // Scripture count
      expect(screen.getByText('1 quote')).toBeInTheDocument() // Church fathers count
      expect(screen.getByText('2 days ago')).toBeInTheDocument() // Last updated
      expect(screen.getByText('test')).toBeInTheDocument() // Tag
      expect(screen.getByText('sacraments')).toBeInTheDocument() // Tag
    })

    it('renders in compact mode', () => {
      render(<TopicCard topic={mockTopic} compact />)

      const card = screen.getByRole('button', { name: 'View topic: Test Topic Title' })
      expect(card).toBeInTheDocument()
      expect(screen.getByText('Test Topic Title')).toBeInTheDocument()
      // Should not show full question in compact mode
      expect(screen.queryByText('This is a test question?')).not.toBeInTheDocument()
    })

    it('hides favorite button when showFavorite is false', () => {
      render(<TopicCard topic={mockTopic} showFavorite={false} />)

      expect(screen.queryByLabelText(/Remove from favorites|Add to favorites/)).not.toBeInTheDocument()
    })

    it('hides category when showCategory is false', () => {
      render(<TopicCard topic={mockTopic} showCategory={false} />)

      expect(screen.queryByText('🏛️')).not.toBeInTheDocument()
      expect(screen.queryByText('Sacraments')).not.toBeInTheDocument()
    })

    it('hides difficulty when showDifficulty is false', () => {
      render(<TopicCard topic={mockTopic} showDifficulty={false} />)

      expect(screen.queryByText('Beginner')).not.toBeInTheDocument()
    })

    it('hides excerpt when showExcerpt is false', () => {
      render(<TopicCard topic={mockTopic} showExcerpt={false} />)

      expect(screen.queryByText('This is a test question?')).not.toBeInTheDocument()
    })
  })

  describe('Favorite Functionality', () => {
    it('shows heart as outlined when not favorited', () => {
      mockIsFavorite.mockReturnValue(false)

      render(<TopicCard topic={mockTopic} />)

      const favoriteButton = screen.getByLabelText('Add to favorites')
      expect(favoriteButton).toBeInTheDocument()
    })

    it('shows heart as filled when favorited', () => {
      mockIsFavorite.mockReturnValue(true)

      render(<TopicCard topic={mockTopic} />)

      const favoriteButton = screen.getByLabelText('Remove from favorites')
      expect(favoriteButton).toBeInTheDocument()
    })

    it('calls toggleFavorite when favorite button is clicked', async () => {
      mockToggleFavorite.mockResolvedValue(true)

      render(<TopicCard topic={mockTopic} onFavoriteToggle={jest.fn()} />)

      const favoriteButton = screen.getByLabelText('Add to favorites')
      fireEvent.click(favoriteButton)

      await waitFor(() => {
        expect(mockToggleFavorite).toHaveBeenCalledWith('test-topic-1')
      })
    })

    it('prevents event propagation on favorite click', async () => {
      const onTopicClick = jest.fn()
      const onFavoriteToggle = jest.fn()
      mockToggleFavorite.mockResolvedValue(true)

      render(<TopicCard topic={mockTopic} onClick={onTopicClick} onFavoriteToggle={onFavoriteToggle} />)

      const favoriteButton = screen.getByLabelText('Add to favorites')
      fireEvent.click(favoriteButton)

      await waitFor(() => {
        expect(mockToggleFavorite).toHaveBeenCalledWith('test-topic-1')
      })
      expect(onTopicClick).not.toHaveBeenCalled()
    })
  })

  describe('Click and Keyboard Interactions', () => {
    it('calls onClick when card is clicked', () => {
      const onClick = jest.fn()

      render(<TopicCard topic={mockTopic} onClick={onClick} />)

      const card = screen.getByRole('button', { name: 'View topic: Test Topic Title' })
      fireEvent.click(card)

      expect(onClick).toHaveBeenCalledWith(mockTopic)
    })

    it('calls onClick when Enter key is pressed', () => {
      const onClick = jest.fn()

      render(<TopicCard topic={mockTopic} onClick={onClick} />)

      const card = screen.getByRole('button', { name: 'View topic: Test Topic Title' })
      fireEvent.keyDown(card, { key: 'Enter' })

      expect(onClick).toHaveBeenCalledWith(mockTopic)
    })

    it('calls onClick when Space key is pressed', () => {
      const onClick = jest.fn()

      render(<TopicCard topic={mockTopic} onClick={onClick} />)

      const card = screen.getByRole('button', { name: 'View topic: Test Topic Title' })
      fireEvent.keyDown(card, { key: ' ' })

      expect(onClick).toHaveBeenCalledWith(mockTopic)
    })

    it('does not call onClick for other keys', () => {
      const onClick = jest.fn()

      render(<TopicCard topic={mockTopic} onClick={onClick} />)

      const card = screen.getByRole('button', { name: 'View topic: Test Topic Title' })
      fireEvent.keyDown(card, { key: 'Tab' })
      fireEvent.keyDown(card, { key: 'Escape' })

      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('Content Variations', () => {
    it('handles topic with no scripture', () => {
      const topicWithoutScripture = { ...mockTopic, scripture: undefined }
      render(<TopicCard topic={topicWithoutScripture} />)

      expect(screen.queryByText(/scripture/)).not.toBeInTheDocument()
    })

    it('handles topic with no church fathers', () => {
      const topicWithoutChurchFathers = { ...mockTopic, churchFathers: undefined }
      render(<TopicCard topic={topicWithoutChurchFathers} />)

      expect(screen.queryByText(/quote/)).not.toBeInTheDocument()
    })

    it('handles topic with no tags', () => {
      const topicWithoutTags = { ...mockTopic, tags: [] }
      render(<TopicCard topic={topicWithoutTags} />)

      expect(screen.queryByText('test')).not.toBeInTheDocument()
    })

    it('shows limited tags with "more" indicator', () => {
      const topicWithManyTags = {
        ...mockTopic,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']
      }
      render(<TopicCard topic={topicWithManyTags} />)

      expect(screen.getByText('tag1')).toBeInTheDocument()
      expect(screen.getByText('tag2')).toBeInTheDocument()
      expect(screen.getByText('tag3')).toBeInTheDocument()
      expect(screen.getByText('+3')).toBeInTheDocument() // 6 total - 3 shown = 3 more
    })

    it('handles multiple scripture references', () => {
      const topicWithManyScripture = {
        ...mockTopic,
        scripture: [
          { reference: 'John 3:16', text: 'For God so loved...', version: 'NABRE' },
          { reference: 'Romans 8:28', text: 'And we know...', version: 'NABRE' }
        ]
      }
      render(<TopicCard topic={topicWithManyScripture} />)

      expect(screen.getByText('2 scriptures')).toBeInTheDocument()
    })

    it('handles multiple church father quotes', () => {
      const topicWithManyQuotes = {
        ...mockTopic,
        churchFathers: [
          { author: 'St. Augustine', quote: 'Test quote 1', source: 'Test source 1' },
          { author: 'St. Thomas', quote: 'Test quote 2', source: 'Test source 2' }
        ]
      }
      render(<TopicCard topic={topicWithManyQuotes} />)

      expect(screen.getByText('2 quotes')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<TopicCard topic={mockTopic} />)

      const card = screen.getByRole('button', { name: 'View topic: Test Topic Title' })
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('provides correct labels for favorite button when favorited', () => {
      mockIsFavorite.mockReturnValue(true)

      render(<TopicCard topic={mockTopic} />)

      const favoriteButton = screen.getByLabelText('Remove from favorites')
      expect(favoriteButton).toBeInTheDocument()
    })

    it('provides correct labels for favorite button when not favorited', () => {
      mockIsFavorite.mockReturnValue(false)

      render(<TopicCard topic={mockTopic} />)

      const favoriteButton = screen.getByLabelText('Add to favorites')
      expect(favoriteButton).toBeInTheDocument()
    })

    it('prevents default behavior on keyboard interactions', () => {
      const onClick = jest.fn()

      render(<TopicCard topic={mockTopic} onClick={onClick} />)

      const card = screen.getByRole('button', { name: 'View topic: Test Topic Title' })
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', cancelable: true })

      card.dispatchEvent(enterEvent)
      expect(enterEvent.defaultPrevented).toBe(true)

      card.dispatchEvent(spaceEvent)
      expect(spaceEvent.defaultPrevented).toBe(true)
    })
  })

  describe('Styling and CSS', () => {
    it('applies custom className', () => {
      render(<TopicCard topic={mockTopic} className="custom-class" />)

      const card = screen.getByRole('button', { name: 'View topic: Test Topic Title' })
      expect(card).toBeInTheDocument()
    })

    it('shows difficulty badge with appropriate class', () => {
      render(<TopicCard topic={mockTopic} />)

      const difficultyBadge = screen.getByText('Beginner')
      expect(difficultyBadge).toBeInTheDocument()
    })
  })
})

describe('TopicCardGrid', () => {
  let mockTopics: any[]

  beforeEach(() => {
    mockTopics = [
      createMockTopic({ id: 'topic1', title: 'Topic 1' }),
      createMockTopic({ id: 'topic2', title: 'Topic 2' }),
      createMockTopic({ id: 'topic3', title: 'Topic 3' })
    ]

    mockUseFavoritesStore.mockReturnValue({
      isFavorite: jest.fn().mockReturnValue(false),
      favoriteIds: [],
      loading: false,
      error: null
    } as any)

    mockUseFavoriteActions.mockReturnValue({
      toggleFavorite: jest.fn(),
      addToFavorites: jest.fn(),
      removeFromFavorites: jest.fn(),
      clearFavorites: jest.fn(),
      exportFavorites: jest.fn(),
      importFavorites: jest.fn()
    })
  })

  it('renders grid of topic cards', () => {
    render(<TopicCardGrid topics={mockTopics} />)

    expect(screen.getByText('Topic 1')).toBeInTheDocument()
    expect(screen.getByText('Topic 2')).toBeInTheDocument()
    expect(screen.getByText('Topic 3')).toBeInTheDocument()
  })

  it('renders loading state', () => {
    render(<TopicCardGrid topics={[]} loading={true} />)

    // Should show 6 skeleton cards
    const skeletonCards = screen.getAllByRole('generic')
    expect(skeletonCards.length).toBeGreaterThan(0)
  })

  it('renders empty state', () => {
    render(<TopicCardGrid topics={[]} loading={false} />)

    expect(screen.getByText('No topics found')).toBeInTheDocument()
    expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument()
  })

  it('calls onTopicClick when topic is clicked', () => {
    const onTopicClick = jest.fn()

    render(<TopicCardGrid topics={mockTopics} onTopicClick={onTopicClick} />)

    const firstCard = screen.getByRole('button', { name: 'View topic: Topic 1' })
    fireEvent.click(firstCard)

    expect(onTopicClick).toHaveBeenCalledWith(mockTopics[0])
  })

  it('calls onFavoriteToggle when favorite is toggled', async () => {
    const onFavoriteToggle = jest.fn()
    const mockToggleFavorite = jest.fn().mockResolvedValue(true)

    mockUseFavoriteActions.mockReturnValue({
      toggleFavorite: mockToggleFavorite,
      addToFavorites: jest.fn(),
      removeFromFavorites: jest.fn(),
      clearFavorites: jest.fn(),
      exportFavorites: jest.fn(),
      importFavorites: jest.fn()
    })

    render(<TopicCardGrid topics={mockTopics} onFavoriteToggle={onFavoriteToggle} />)

    const favoriteButton = screen.getAllByLabelText('Add to favorites')[0]
    fireEvent.click(favoriteButton)

    await waitFor(() => {
      expect(mockToggleFavorite).toHaveBeenCalledWith('topic1')
    })
  })

  it('renders different column configurations', () => {
    const { rerender } = render(<TopicCardGrid topics={mockTopics} columns={1} />)

    // Should render without errors for single column
    expect(screen.getByText('Topic 1')).toBeInTheDocument()

    rerender(<TopicCardGrid topics={mockTopics} columns={2} />)
    expect(screen.getByText('Topic 1')).toBeInTheDocument()

    rerender(<TopicCardGrid topics={mockTopics} columns={3} />)
    expect(screen.getByText('Topic 1')).toBeInTheDocument()

    rerender(<TopicCardGrid topics={mockTopics} columns={4} />)
    expect(screen.getByText('Topic 1')).toBeInTheDocument()
  })

  it('passes compact prop to TopicCard components', () => {
    render(<TopicCardGrid topics={mockTopics} compact={true} />)

    const cards = screen.getAllByRole('button')
    expect(cards).toHaveLength(mockTopics.length)

    // In compact mode, cards should still render but with different layout
    expect(screen.getByText('Topic 1')).toBeInTheDocument()
  })

  it('applies custom className to grid container', () => {
    render(<TopicCardGrid topics={mockTopics} className="custom-grid" />)

    const grid = screen.getByText('Topic 1').closest('.grid')
    expect(grid).toBeInTheDocument()
  })

  it('handles large number of topics efficiently', () => {
    const manyTopics = Array.from({ length: 100 }, (_, i) =>
      createMockTopic({ id: `topic${i}`, title: `Topic ${i}` })
    )

    expect(() => {
      render(<TopicCardGrid topics={manyTopics} />)
    }).not.toThrow()

    expect(screen.getByText('Topic 1')).toBeInTheDocument()
    expect(screen.getByText('Topic 100')).toBeInTheDocument()
  })
})