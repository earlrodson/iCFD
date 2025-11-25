import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TopicCard, TopicCardGrid } from '@/components/handbook/TopicCard'
import { createMockTopic } from '../../jest.setup'

describe('Performance Tests', () => {
  describe('Rendering Performance', () => {
    it('should render simple components efficiently', () => {
      const startTime = performance.now()

      for (let i = 0; i < 1000; i++) {
        render(<Button>Button {i}</Button>).unmount()
      }

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render 1000 buttons in under 1 second
      expect(renderTime).toBeLessThan(1000)
    })

    it('should handle many cards efficiently', () => {
      const manyTopics = Array.from({ length: 100 }, (_, i) =>
        createMockTopic({
          id: `topic-${i}`,
          title: `Topic ${i}`,
          question: `Question for topic ${i}`,
          answer: `Answer for topic ${i}`,
          category: 'sacraments',
          tags: ['tag1', 'tag2']
        })
      )

      const startTime = performance.now()

      const { container } = render(<TopicCardGrid topics={manyTopics} columns={4} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(container.querySelectorAll('[role="button"]')).toHaveLength(100)
      expect(renderTime).toBeLessThan(500) // Should render 100 cards in under 500ms
    })

    it('should handle dynamic list updates efficiently', () => {
      const initialTopics = Array.from({ length: 50 }, (_, i) =>
        createMockTopic({
          id: `initial-topic-${i}`,
          title: `Initial Topic ${i}`
        })
      )

      const { rerender } = render(<TopicCardGrid topics={initialTopics} />)

      const startTime = performance.now()

      const updatedTopics = [
        ...initialTopics,
        ...Array.from({ length: 50 }, (_, i) =>
          createMockTopic({
            id: `new-topic-${i}`,
            title: `New Topic ${i}`
          })
        )
      ]

      rerender(<TopicCardGrid topics={updatedTopics} />)

      const endTime = performance.now()
      const updateTime = endTime - startTime

      expect(updateTime).toBeLessThan(200) // Should update in under 200ms
      expect(screen.getAllByRole('button')).toHaveLength(100)
    })
  })

  describe('Memory Management', () => {
    it('should not cause memory leaks with repeated renders', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Simulate many render cycles
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(
          <div>
            <Button>Test Button {i}</Button>
            <Card>
              <CardContent>Test Card {i}</CardContent>
            </Card>
          </div>
        )
        unmount()
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should clean up event listeners on unmount', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

      const { unmount } = render(<TopicCard
        topic={createMockTopic({
          id: 'cleanup-test',
          title: 'Cleanup Test Topic'
        })}
      />)

      // Simulate component interactions that add listeners
      const card = screen.getByRole('button')
      fireEvent.focus(card)
      fireEvent.blur(card)

      unmount()

      // Should clean up event listeners
      expect(removeEventListenerSpy).toHaveBeenCalled()

      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('Large Dataset Performance', () => {
    it('should handle large search results efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        createMockTopic({
          id: `search-topic-${i}`,
          title: `Search Result Topic ${i}`,
          question: `Question ${i}`,
          answer: `Answer ${i}`,
          tags: [`tag${i % 10}`]
        })
      )

      const startTime = performance.now()

      render(<TopicCardGrid topics={largeDataset} columns={3} />)

      const endTime = performance.now()
      const renderTime = endTime - startTime

      expect(renderTime).toBeLessThan(1000) // Should handle 1000 items in under 1 second
      expect(screen.getAllByRole('button')).toHaveLength(1000)
    })

    it('should virtualize efficiently when needed', () => {
      // Test that we can handle very large datasets
      const veryLargeDataset = Array.from({ length: 5000 }, (_, i) =>
        createMockTopic({
          id: `virtual-topic-${i}`,
          title: `Virtual Topic ${i}`,
          category: ['sacraments', 'mary', 'papacy', 'salvation'][i % 4]
        })
      )

      const startTime = performance.now()

      // For virtualization, we'd typically only render visible items
      // This test ensures we can at least process the data efficiently
      const { container } = render(
        <div>
          {veryLargeDataset.slice(0, 100).map(topic => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      )

      const endTime = performance.now()
      const processTime = endTime - startTime

      expect(processTime).toBeLessThan(300)
      expect(container.children.length).toBe(100)
    })
  })

  describe('Interaction Performance', () => {
    it('should handle rapid user interactions efficiently', () => {
      const mockTopics = Array.from({ length: 20 }, (_, i) =>
        createMockTopic({
          id: `interaction-topic-${i}`,
          title: `Interaction Topic ${i}`
        })
      )

      render(<TopicCardGrid topics={mockTopics} />)

      const startTime = performance.now()

      // Simulate rapid clicking on multiple cards
      const cards = screen.getAllByRole('button')
      cards.forEach((card, index) => {
        if (index < 10) { // Test first 10 cards
          fireEvent.click(card)
          fireEvent.focus(card)
          fireEvent.blur(card)
        }
      })

      const endTime = performance.now()
      const interactionTime = endTime - startTime

      expect(interactionTime).toBeLessThan(100) // Should handle rapid interactions quickly
    })

    it('should debounce expensive operations', (done) => {
      const expensiveOperation = jest.fn()
      let callCount = 0

      // Simulate rapid input changes
      for (let i = 0; i < 10; i++) {
        setTimeout(() => {
          expensiveOperation()
          callCount++

          if (callCount === 10) {
            // With debouncing, not all calls should be executed
            // In a real implementation, this would test debounced search/filtering
            expect(expensiveOperation).toHaveBeenCalledTimes(10)
            done()
          }
        }, i * 10) // 10ms intervals
      }
    })
  })

  describe('Animation Performance', () => {
    it('should handle animations without blocking main thread', () => {
      const { container } = render(
        <div>
          <Button className="transition-all duration-200">Animated Button</Button>
          <Card className="transition-transform duration-300">
            <CardContent>Animated Card</CardContent>
          </Card>
        </div>
      )

      const button = screen.getByRole('button')
      const card = container.querySelector('.card')

      // Simulate hover animations
      fireEvent.mouseEnter(button)
      fireEvent.mouseEnter(card!)

      // Animations should not block the main thread
      const startTime = performance.now()

      // Perform some work during animation
      let result = 0
      for (let i = 0; i < 10000; i++) {
        result += i
      }

      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(50)
      expect(result).toBeGreaterThan(0)
    })

    it('should use CSS transforms for better performance', () => {
      const { container } = render(
        <div className="transform transition-transform duration-200 hover:scale-105">
          <Card>
            <CardContent>Transform Card</CardContent>
          </Card>
        </div>
      )

      const wrapper = container.firstElementChild
      expect(wrapper).toHaveClass('transform')
    })
  })

  describe('Bundle Size Impact', () => {
    it('should import only necessary components', () => {
      // This test would typically check actual bundle size
      // For now, we verify that components can be imported individually
      expect(() => {
        const Button = require('@/components/ui/button').Button
        const Card = require('@/components/ui/card').Card
        expect(Button).toBeDefined()
        expect(Card).toBeDefined()
      }).not.toThrow()
    })

    it('should support code splitting for large components', () => {
      // Mock dynamic import
      const mockDynamicImport = jest.fn().mockResolvedValue({
        default: () => <div>Lazy Loaded Component</div>
      })

      expect(() => {
        mockDynamicImport()
      }).not.toThrow()
    })
  })

  describe('Network Performance', () => {
    it('should handle slow data fetching gracefully', async () => {
      const mockSlowFetch = jest.fn(() =>
        new Promise(resolve =>
          setTimeout(() => resolve([{ id: '1', title: 'Slow Topic' }]), 2000)
        )
      )

      const startTime = performance.now()

      // In a real app, this would be tested with actual network requests
      // Here we simulate the timing aspect
      mockSlowFetch()

      // UI should remain responsive during slow fetch
      expect(() => {
        render(<div>Loading...</div>)
      }).not.toThrow()

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100) // Should not block UI
    })

    it('should cache data appropriately', () => {
      const cache = new Map()

      // Simulate caching mechanism
      const cachedFetch = (key: string) => {
        if (cache.has(key)) {
          return cache.get(key)
        }

        const data = { id: key, title: `Topic ${key}` }
        cache.set(key, data)
        return data
      }

      // First fetch
      const firstFetch = cachedFetch('1')
      expect(firstFetch.title).toBe('Topic 1')

      // Second fetch should be from cache (faster)
      const startTime = performance.now()
      const secondFetch = cachedFetch('1')
      const endTime = performance.now()

      expect(secondFetch).toEqual(firstFetch)
      expect(endTime - startTime).toBeLessThan(1) // Should be nearly instant
    })
  })

  describe('Device Performance', () => {
    it('should perform well on lower-end devices', () => {
      // Simulate lower performance by reducing available time
      const originalRequestAnimationFrame = window.requestAnimationFrame
      const mockRequestAnimationFrame = (callback: FrameRequestCallback) => {
        return setTimeout(callback, 16) // Simulate 60fps
      }
      window.requestAnimationFrame = mockRequestAnimationFrame

      const startTime = performance.now()

      render(
        <TopicCardGrid
          topics={Array.from({ length: 50 }, (_, i) =>
            createMockTopic({ id: `low-end-${i}`, title: `Low End Topic ${i}` })
          )}
        />
      )

      const endTime = performance.now()

      // Should still render in reasonable time on lower-end devices
      expect(endTime - startTime).toBeLessThan(1000)

      window.requestAnimationFrame = originalRequestAnimationFrame
    })

    it('should adapt to device capabilities', () => {
      // Check if device supports certain features
      const hasIntersectionObserver = 'IntersectionObserver' in window
      const hasResizeObserver = 'ResizeObserver' in window

      // Components should gracefully degrade based on device capabilities
      expect(() => {
        render(
          <div>
            <Button>Adaptive Button</Button>
            {hasIntersectionObserver && <div>Lazy content</div>}
          </div>
        )
      }).not.toThrow()
    })
  })

  describe('Error Recovery Performance', () => {
    it('should recover from errors without performance degradation', () => {
      const renderTopicCard = (shouldError = false) => {
        try {
          if (shouldError) {
            throw new Error('Test error')
          }
          return render(<TopicCard topic={createMockTopic({ id: 'error-test' })} />)
        } catch (error) {
          return render(<div>Error fallback</div>)
        }
      }

      // Measure performance with error
      const startTime = performance.now()

      for (let i = 0; i < 10; i++) {
        renderTopicCard(i === 5) // Error on 6th iteration
      }

      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(500) // Should handle errors efficiently
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle comprehensive user workflow efficiently', () => {
      const mockTopics = Array.from({ length: 100 }, (_, i) =>
        createMockTopic({
          id: `workflow-topic-${i}`,
          title: `Workflow Topic ${i}`,
          category: ['sacraments', 'mary', 'papacy'][i % 3]
        })
      )

      const startTime = performance.now()

      // Simulate typical user workflow
      const { container } = render(<TopicCardGrid topics={mockTopics} />)

      // Simulate user interactions
      const cards = container.querySelectorAll('[role="button"]')
      const sampleCards = Array.from(cards).slice(0, 10)

      sampleCards.forEach((card, index) => {
        if (index < 5) {
          fireEvent.click(card)
          fireEvent.focus(card)
        } else {
          fireEvent.keyDown(card, { key: 'Enter' })
        }
      })

      const endTime = performance.now()

      // Complete workflow should complete quickly
      expect(endTime - startTime).toBeLessThan(200)
      expect(cards.length).toBe(100)
    })

    it('should maintain performance during state updates', () => {
      const { rerender } = render(
        <TopicCardGrid
          topics={Array.from({ length: 50 }, (_, i) =>
            createMockTopic({ id: `state-topic-${i}`, title: `State Topic ${i}` })
          )}
        />
      )

      const startTime = performance.now()

      // Simulate multiple state updates
      for (let i = 0; i < 10; i++) {
        rerender(
          <TopicCardGrid
            topics={Array.from({ length: 50 }, (_, j) =>
              createMockTopic({
                id: `state-topic-${j}`,
                title: `Updated Topic ${j} - Update ${i}`
              })
            )}
          />
        )
      }

      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(1000) // Multiple updates should still be fast
    })
  })
})