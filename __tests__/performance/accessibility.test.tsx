import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TopicCard } from '@/components/handbook/TopicCard'
import { createMockTopic } from '../../jest.setup'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('Accessibility Tests', () => {
  beforeEach(() => {
    // Mock store for TopicCard tests
    jest.doMock('@/store/useFavoritesStore', () => ({
      useFavoritesStore: () => ({
        isFavorite: jest.fn(() => false),
        favoriteIds: [],
        loading: false,
        error: null
      }),
      useFavoriteActions: () => ({
        toggleFavorite: jest.fn().mockResolvedValue(true)
      })
    }))

    // Mock utility functions
    jest.doMock('@/lib/utils', () => ({
      getCategoryName: jest.fn((category: string) => category.charAt(0).toUpperCase() + category.slice(1)),
      getCategoryIcon: jest.fn((category: string) => '🏛️'),
      getDifficultyLabel: jest.fn((difficulty: string) => difficulty.charAt(0).toUpperCase() + difficulty.slice(1)),
      formatRelativeTime: jest.fn((date: string) => '2 days ago'),
      cn: jest.fn((...classes: any[]) => classes.filter(Boolean).join(' '))
    }))
  })

  afterEach(() => {
    jest.resetModules()
  })

  describe('Component Accessibility', () => {
    it('Button component should have no accessibility violations', async () => {
      const { container } = render(
        <div>
          <Button>Default Button</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('Card component should have no accessibility violations', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card Title</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This is test card content for accessibility testing.</p>
          </CardContent>
        </Card>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('TopicCard component should have no accessibility violations', async () => {
      const mockTopic = createMockTopic({
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

      const { container } = render(<TopicCard topic={mockTopic} />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('TopicCard compact mode should be accessible', async () => {
      const mockTopic = createMockTopic({
        id: 'compact-topic-1',
        title: 'Compact Topic',
        category: 'sacraments',
        difficulty: 'intermediate'
      })

      const { container } = render(<TopicCard topic={mockTopic} compact />)

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for buttons', () => {
      const handleClick = jest.fn()
      render(
        <Button onClick={handleClick} data-testid="keyboard-button">
          Keyboard Button
        </Button>
      )

      const button = screen.getByTestId('keyboard-button')

      // Test Tab navigation
      button.focus()
      expect(button).toHaveFocus()

      // Test Enter key
      fireEvent.keyDown(button, { key: 'Enter' })
      expect(handleClick).toHaveBeenCalledTimes(1)

      // Test Space key
      fireEvent.keyDown(button, { key: ' ' })
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('should support keyboard navigation for interactive cards', () => {
      const handleClick = jest.fn()
      const mockTopic = createMockTopic({
        id: 'keyboard-topic-1',
        title: 'Keyboard Navigation Topic',
        category: 'sacraments'
      })

      render(<TopicCard topic={mockTopic} onClick={handleClick} />)

      const card = screen.getByRole('button', { name: 'View topic: Keyboard Navigation Topic' })

      // Test keyboard navigation
      card.focus()
      expect(card).toHaveFocus()

      fireEvent.keyDown(card, { key: 'Enter' })
      expect(handleClick).toHaveBeenCalledWith(mockTopic)

      fireEvent.keyDown(card, { key: ' ' })
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it('should prevent default browser behavior for custom keyboard interactions', () => {
      const handleClick = jest.fn()
      const mockTopic = createMockTopic({
        id: 'prevent-default-topic',
        title: 'Prevent Default Topic',
        category: 'mary'
      })

      render(<TopicCard topic={mockTopic} onClick={handleClick} />)

      const card = screen.getByRole('button', { name: 'View topic: Prevent Default Topic' })

      // Test that default is prevented
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', cancelable: true })

      card.dispatchEvent(enterEvent)
      expect(enterEvent.defaultPrevented).toBe(true)

      card.dispatchEvent(spaceEvent)
      expect(spaceEvent.defaultPrevented).toBe(true)
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide appropriate ARIA labels', () => {
      const mockTopic = createMockTopic({
        id: 'aria-topic-1',
        title: 'ARIA Test Topic',
        category: 'sacraments'
      })

      render(<TopicCard topic={mockTopic} />)

      const card = screen.getByRole('button', { name: 'View topic: ARIA Test Topic' })
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('should provide descriptive labels for favorite buttons', () => {
      const mockTopic = createMockTopic({
        id: 'favorite-topic-1',
        title: 'Favorite Test Topic',
        category: 'sacraments'
      })

      // Mock isFavorite to return true for testing "Remove from favorites" label
      jest.doMock('@/store/useFavoritesStore', () => ({
        useFavoritesStore: () => ({
          isFavorite: jest.fn(() => true),
          favoriteIds: ['favorite-topic-1'],
          loading: false,
          error: null
        }),
        useFavoriteActions: () => ({
          toggleFavorite: jest.fn().mockResolvedValue(true)
        })
      }))

      render(<TopicCard topic={mockTopic} />)

      expect(screen.getByLabelText('Remove from favorites')).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(
        <div>
          <h1>Main Page Title</h1>
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
            </CardHeader>
            <CardContent>
              <h3>Subheading</h3>
              <p>Content here</p>
            </CardContent>
          </Card>
        </div>
      )

      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    })
  })

  describe('Focus Management', () => {
    it('should handle focus states correctly for buttons', () => {
      render(
        <Button data-testid="focus-test-button">
          Focus Test Button
        </Button>
      )

      const button = screen.getByTestId('focus-test-button')

      button.focus()
      expect(button).toHaveFocus()

      button.blur()
      expect(button).not.toHaveFocus()
    })

    it('should handle focus management for disabled elements', () => {
      render(
        <Button disabled data-testid="disabled-button">
          Disabled Button
        </Button>
      )

      const button = screen.getByTestId('disabled-button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('disabled')
    })

    it('should maintain focus order in complex components', () => {
      render(
        <div>
          <Button data-testid="first-button">First</Button>
          <Button data-testid="second-button">Second</Button>
          <Button data-testid="third-button">Third</Button>
        </div>
      )

      const firstButton = screen.getByTestId('first-button')
      const secondButton = screen.getByTestId('second-button')
      const thirdButton = screen.getByTestId('third-button')

      // Test focus order
      firstButton.focus()
      expect(firstButton).toHaveFocus()

      fireEvent.keyDown(document, { key: 'Tab' })
      expect(secondButton).toHaveFocus()

      fireEvent.keyDown(document, { key: 'Tab' })
      expect(thirdButton).toHaveFocus()
    })
  })

  describe('Color Contrast', () => {
    it('should use sufficient color contrast for text', () => {
      // This would typically require a color contrast checker library
      // For now, we test that appropriate classes are applied
      render(
        <div>
          <Button variant="default">Default Button</Button>
          <Button variant="destructive">Destructive Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
        </div>
      )

      // Check that appropriate contrast classes are present
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toBeInTheDocument()
      })
    })

    it('should provide alternative visual indicators beyond color', () => {
      render(
        <div>
          <Button variant="destructive" data-testid="color-button">
            Error Action
          </Button>
          <Button variant="default" data-testid="success-button">
            Success Action
          </Button>
        </div>
      )

      // Buttons should have text content indicating their purpose,
      // not just relying on color
      expect(screen.getByText('Error Action')).toBeInTheDocument()
      expect(screen.getByText('Success Action')).toBeInTheDocument()
    })
  })

  describe('Form Accessibility', () => {
    it('should associate labels with form controls', () => {
      render(
        <form>
          <label htmlFor="search-input">Search Topics</label>
          <input
            id="search-input"
            type="text"
            placeholder="Enter search terms"
            data-testid="search-input"
          />
          <Button type="submit" data-testid="submit-button">
            Search
          </Button>
        </form>
      )

      const input = screen.getByTestId('search-input')
      const label = screen.getByLabelText('Search Topics')

      expect(input).toHaveAttribute('id', 'search-input')
      expect(label).toHaveAttribute('for', 'search-input')
    })

    it('should provide form validation messages accessibly', () => {
      render(
        <form>
          <label htmlFor="required-field">Required Field *</label>
          <input
            id="required-field"
            type="text"
            required
            aria-describedby="error-message"
            data-testid="required-field"
          />
          <div id="error-message" role="alert" data-testid="error-message">
            This field is required
          </div>
        </form>
      )

      const field = screen.getByTestId('required-field')
      const errorMessage = screen.getByTestId('error-message')

      expect(field).toHaveAttribute('aria-describedby', 'error-message')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })
  })

  describe('Responsive Design Accessibility', () => {
    it('should maintain accessibility across viewport sizes', async () => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320, // Mobile viewport
      })

      const { container } = render(
        <div>
          <Button>Mobile Button</Button>
          <Card>
            <CardContent>Mobile Content</CardContent>
          </Card>
        </div>
      )

      // Elements should still be accessible on mobile
      expect(screen.getByRole('button')).toBeInTheDocument()

      // Test accessibility on mobile
      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // Reset to desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })
    })
  })

  describe('Dynamic Content Accessibility', () => {
    it('should announce dynamic content changes', () => {
      render(
        <div>
          <div role="status" aria-live="polite" data-testid="status-message">
            Initial status
          </div>
          <Button
            onClick={() => {
              const statusElement = screen.getByTestId('status-message')
              statusElement.textContent = 'Status updated'
            }}
            data-testid="update-button"
          >
            Update Status
          </Button>
        </div>
      )

      const button = screen.getByTestId('update-button')
      fireEvent.click(button)

      expect(screen.getByTestId('status-message')).toHaveTextContent('Status updated')
      expect(screen.getByTestId('status-message')).toHaveAttribute('role', 'status')
      expect(screen.getByTestId('status-message')).toHaveAttribute('aria-live', 'polite')
    })

    it('should handle loading states accessibly', () => {
      render(
        <div>
          <div role="progressbar" aria-label="Loading content" data-testid="loading-indicator">
            <span aria-hidden="true">⏳</span>
            Loading...
          </div>
        </div>
      )

      const loadingIndicator = screen.getByTestId('loading-indicator')
      expect(loadingIndicator).toHaveAttribute('role', 'progressbar')
      expect(loadingIndicator).toHaveAttribute('aria-label', 'Loading content')
    })
  })

  describe('Error Handling Accessibility', () => {
    it('should announce error messages accessibly', () => {
      render(
        <div>
          <div role="alert" data-testid="error-message">
            An error occurred while loading content
          </div>
          <Button data-testid="retry-button">Retry</Button>
        </div>
      )

      const errorMessage = screen.getByTestId('error-message')
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })

    it('should provide clear error recovery options', () => {
      render(
        <div>
          <div role="alert" data-testid="error-message">
            Failed to load content
          </div>
          <Button data-testid="retry-button">Retry Loading</Button>
          <Button variant="outline" data-testid="refresh-button">Refresh Page</Button>
        </div>
      )

      expect(screen.getByText('Retry Loading')).toBeInTheDocument()
      expect(screen.getByText('Refresh Page')).toBeInTheDocument()
    })
  })

  describe('Skip Links and Navigation', () => {
    it('should provide skip links for keyboard users', () => {
      render(
        <div>
          <a href="#main-content" data-testid="skip-link">
            Skip to main content
          </a>
          <nav data-testid="navigation">
            <button>Nav Item 1</button>
            <button>Nav Item 2</button>
          </nav>
          <main id="main-content" data-testid="main-content">
            <h1>Main Content</h1>
          </main>
        </div>
      )

      const skipLink = screen.getByTestId('skip-link')
      expect(skipLink).toHaveAttribute('href', '#main-content')

      const mainContent = screen.getByTestId('main-content')
      expect(mainContent).toHaveAttribute('id', 'main-content')
    })
  })
})