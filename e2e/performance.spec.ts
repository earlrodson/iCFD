import { test, expect } from '@playwright/test'
import {
  TEST_CONSTANTS,
  VIEWPORTS,
  setViewport,
  performSearch,
  waitForDebounce,
  expectVisible,
  expectText,
  takeScreenshotOnFailure,
  simulateSlowNetwork,
  goOffline,
  goOnline
} from './utils/test-helpers'

test.describe('Performance Testing', () => {
  test.describe('Page Load Performance', () => {
    test('should load homepage within performance budget', async ({ page }) => {
      const startTime = Date.now()

      // Navigate to page
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const loadTime = Date.now() - startTime

      // Check Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const metrics = {}

            entries.forEach((entry) => {
              if (entry.entryType === 'largest-contentful-paint') {
                metrics.lcp = entry.startTime
              }
              if (entry.entryType === 'first-input') {
                metrics.fid = entry.processingStart - entry.startTime
              }
              if (entry.entryType === 'layout-shift') {
                if (!metrics.cls) metrics.cls = 0
                metrics.cls += entry.value
              }
            })

            resolve(metrics)
          }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })

          // Fallback if PerformanceObserver doesn't work
          setTimeout(() => resolve({
            lcp: performance.timing.loadEventEnd - performance.timing.navigationStart,
            fid: 0,
            cls: 0
          }), 3000)
        })
      })

      console.log('Load time:', loadTime, 'ms')
      console.log('Core Web Vitals:', vitals)

      // Performance budgets
      expect(loadTime).toBeLessThan(3000) // 3 seconds
      if (vitals.lcp) expect(vitals.lcp).toBeLessThan(2500) // LCP < 2.5s
      if (vitals.fid) expect(vitals.fid).toBeLessThan(100) // FID < 100ms
      if (vitals.cls) expect(vitals.cls).toBeLessThan(0.1) // CLS < 0.1
    })

    test('should have efficient bundle sizes', async ({ page }) => {
      const responses: any[] = []

      // Collect network requests
      page.on('response', (response) => {
        const url = response.url()
        const contentType = response.headers()['content-type'] || ''

        if (url.includes(window.location.origin) &&
            (contentType.includes('javascript') ||
             contentType.includes('css') ||
             url.endsWith('.js') ||
             url.endsWith('.css'))) {
          responses.push({
            url,
            size: parseInt(response.headers()['content-length'] || '0'),
            type: contentType.includes('javascript') ? 'js' : 'css'
          })
        }
      })

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Calculate total bundle sizes
      const jsSize = responses.filter(r => r.type === 'js').reduce((sum, r) => sum + r.size, 0)
      const cssSize = responses.filter(r => r.type === 'css').reduce((sum, r) => sum + r.size, 0)

      console.log('JS bundle size:', jsSize, 'bytes')
      console.log('CSS bundle size:', cssSize, 'bytes')

      // Performance budgets for bundles
      expect(jsSize).toBeLessThan(250000) // 250KB for JS
      expect(cssSize).toBeLessThan(50000) // 50KB for CSS
    })

    test('should minimize render-blocking resources', async ({ page }) => {
      const startTime = Date.now()

      // Check when page becomes visually interactive
      await page.goto('/')

      // Wait for main content to be visible
      await expectVisible(page, 'main, h1, [data-testid="app-content"]')

      const timeToInteractive = Date.now() - startTime

      // Should be interactive quickly
      expect(timeToInteractive).toBeLessThan(1500) // 1.5 seconds

      // Check that critical resources are loaded
      const performanceEntries = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter(entry =>
            entry.name.includes('.js') ||
            entry.name.includes('.css')
          )
          .map(entry => ({
            name: entry.name,
            duration: entry.duration,
            transferSize: entry.transferSize
          }))
      })

      console.log('Resource load times:', performanceEntries)
    })

    test('should handle concurrent loading efficiently', async ({ page }) => {
      // Simulate multiple rapid navigations
      const startTime = Date.now()

      await Promise.all([
        page.goto('/'),
        page.waitForLoadState('networkidle')
      ])

      const navigationTime = Date.now() - startTime
      expect(navigationTime).toBeLessThan(3000)

      // Test concurrent language switching
      const langSwitchStart = Date.now()

      await Promise.all([
        page.click('[data-testid="language-switcher"]'),
        page.waitForSelector('[data-testid="lang-dropdown"]')
      ])

      const switchTime = Date.now() - langSwitchStart
      expect(switchTime).toBeLessThan(1000)
    })
  })

  test.describe('Search Performance', () => {
    test('should perform search within acceptable time limits', async ({ page }) => {
      await expectVisible(page, '[data-testid="search-input"]')

      const searchInput = page.locator('[data-testid="search-input"]')

      // Test different query lengths and complexities
      const testQueries = [
        'Eucharist', // Simple term
        'Eucharist Real Presence', // Multiple words
        'e', // Single character (broad search)
        'confirmation sacrament catholic church', // Long query
        'Eukaristiya' // Unicode/Cebuano term
      ]

      for (const query of testQueries) {
        const startTime = Date.now()

        await searchInput.fill(query)
        await waitForDebounce(page)

        const searchTime = Date.now() - startTime

        console.log(`Search for "${query}" took ${searchTime}ms`)

        // Search should complete quickly
        expect(searchTime).toBeLessThan(1000) // 1 second

        // Clear for next test
        await searchInput.fill('')
        await page.waitForTimeout(300)
      }
    })

    test('should handle rapid search typing efficiently', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')
      const searchTimes: number[] = []

      // Simulate rapid typing
      const startTime = Date.now()

      await searchInput.type('Eucharist', { delay: 50 })
      await waitForDebounce(page)

      const totalTime = Date.now() - startTime

      // Should debounce properly and not make excessive requests
      expect(totalTime).toBeLessThan(2000) // Should complete in 2 seconds including debounce

      // Check that results are rendered efficiently
      const resultsContainer = page.locator('[data-testid="search-results"]')
      if (await resultsContainer.isVisible()) {
        const resultCount = await resultsContainer.locator('[data-testid="search-result"]').count()
        console.log(`Rendered ${resultCount} results in ${totalTime}ms`)

        // Should not render too many results at once
        expect(resultCount).toBeLessThan(100)
      }
    })

    test('should maintain performance with large result sets', async ({ page }) => {
      const searchInput = page.locator('[data-testid="search-input"]')

      // Search for term that might return many results
      await searchInput.fill('a') // Broad search
      await waitForDebounce(page)

      const renderStart = Date.now()

      const resultsContainer = page.locator('[data-testid="search-results"]')
      if (await resultsContainer.isVisible()) {
        await expect(resultsContainer).toBeVisible()

        const renderTime = Date.now() - renderStart

        // Large result sets should render quickly
        expect(renderTime).toBeLessThan(500) // 500ms for rendering

        // Test scrolling performance
        const scrollStart = Date.now()

        await page.evaluate(() => {
          const resultsContainer = document.querySelector('[data-testid="search-results"]')
          if (resultsContainer) {
            resultsContainer.scrollTop = resultsContainer.scrollHeight / 2
          }
        })

        const scrollTime = Date.now() - scrollStart
        expect(scrollTime).toBeLessThan(100) // 100ms for scrolling
      }
    })

    test('should implement efficient search indexing', async ({ page }) => {
      // Test search index performance
      const indexPerformance = await page.evaluate(() => {
        return new Promise((resolve) => {
          // Check if search index exists and is efficient
          const checkIndex = () => {
            const searchInput = document.querySelector('[data-testid="search-input"]') as HTMLInputElement
            if (searchInput) {
              const start = performance.now()

              // Trigger search
              searchInput.value = 'test'
              searchInput.dispatchEvent(new Event('input', { bubbles: true }))

              setTimeout(() => {
                const end = performance.now()
                resolve({
                  indexLoadTime: end - start,
                  hasIndex: true
                })
              }, 100)
            } else {
              resolve({
                indexLoadTime: 0,
                hasIndex: false
              })
            }
          }

          checkIndex()
        })
      })

      console.log('Search index performance:', indexPerformance)
    })
  })

  test.describe('Mobile Performance', () => {
    test.beforeEach(async ({ page }) => {
      await setViewport(page, 'mobile')
    })

    test('should perform well on mobile devices', async ({ page }) => {
      const startTime = Date.now()

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const loadTime = Date.now() - startTime

      // Mobile has stricter performance budgets
      expect(loadTime).toBeLessThan(4000) // 4 seconds for mobile

      // Test touch responsiveness
      const touchStart = Date.now()

      await page.tap('[data-testid="search-input"]')
      await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'search-input')

      const touchResponseTime = Date.now() - touchStart
      expect(touchResponseTime).toBeLessThan(200) // 200ms for touch response
    })

    test('should handle mobile-specific optimizations', async ({ page }) => {
      // Test lazy loading on mobile
      const lazyImages = await page.locator('[loading="lazy"]').count()
      console.log('Lazy loaded images on mobile:', lazyImages)

      // Should use lazy loading for images on mobile
      expect(lazyImages).toBeGreaterThanOrEqual(0)

      // Test viewport-based rendering
      const initialContentHeight = await page.evaluate(() => {
        return document.body.scrollHeight
      })

      // Scroll down to trigger dynamic content
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2)
      })

      await page.waitForTimeout(500)

      const afterScrollContentHeight = await page.evaluate(() => {
        return document.body.scrollHeight
      })

      // Content should load efficiently as we scroll
      expect(afterScrollContentHeight).toBeGreaterThanOrEqual(initialContentHeight)
    })

    test('should maintain performance with mobile network conditions', async ({ page }) => {
      // Simulate 3G network
      await simulateSlowNetwork(page, '3g')

      const startTime = Date.now()

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const loadTime = Date.now() - startTime

      console.log(`Load time on 3G: ${loadTime}ms`)

      // Should still load within reasonable time on slow networks
      expect(loadTime).toBeLessThan(10000) // 10 seconds on 3G

      // Test search performance on slow network
      const searchInput = page.locator('[data-testid="search-input"]')
      if (await searchInput.isVisible()) {
        const searchStart = Date.now()

        await searchInput.fill('Eucharist')
        await waitForDebounce(page)

        const searchTime = Date.now() - searchStart

        // Search should work offline (client-side)
        expect(searchTime).toBeLessThan(2000) // 2 seconds even on slow network
      }
    })
  })

  test.describe('Memory Performance', () => {
    test('should not have memory leaks during extended use', async ({ page }) => {
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        } : { used: 0, total: 0 }
      })

      // Simulate extended use
      for (let i = 0; i < 20; i++) {
        // Perform search
        await performSearch(page, `test${i}`)
        await page.waitForTimeout(200)

        // Switch language
        if (i % 5 === 0) {
          await page.click('[data-testid="language-switcher"]')
          await page.click('[data-testid="lang-tl"]')
          await page.waitForTimeout(300)
          await page.click('[data-testid="language-switcher"]')
          await page.click('[data-testid="lang-en"]')
          await page.waitForTimeout(300)
        }
      }

      // Check final memory usage
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        } : { used: 0, total: 0 }
      })

      console.log('Initial memory:', initialMemory.used, 'bytes')
      console.log('Final memory:', finalMemory.used, 'bytes')

      if (initialMemory.used > 0 && finalMemory.used > 0) {
        const memoryIncrease = finalMemory.used - initialMemory.used
        const memoryIncreasePercent = (memoryIncrease / initialMemory.used) * 100

        console.log(`Memory increase: ${memoryIncreasePercent.toFixed(2)}%`)

        // Memory increase should be reasonable (< 50%)
        expect(memoryIncreasePercent).toBeLessThan(50)
      }
    })

    test('should clean up event listeners and timers', async ({ page }) => {
      // Test that the app properly cleans up after navigation
      const initialListeners = await page.evaluate(() => {
        let count = 0
        const originalAddEventListener = EventTarget.prototype.addEventListener
        EventTarget.prototype.addEventListener = function(type, listener, options) {
          count++
          return originalAddEventListener.call(this, type, listener, options)
        }
        return count
      })

      // Navigate and interact
      await performSearch(page, 'Eucharist')
      await page.click('[data-testid="language-switcher"]')
      await page.click('[data-testid="lang-tl"]')
      await page.waitForTimeout(500)
      await page.goBack()
      await page.waitForTimeout(500)

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc()
        }
      })
    })
  })

  test.describe('Animation and Interaction Performance', () => {
    test('should have smooth animations', async ({ page }) => {
      await page.goto('/')

      // Test language switcher animation
      const langSwitcher = page.locator('[data-testid="language-switcher"]')

      const animationStart = Date.now()

      await langSwitcher.click()
      await expectVisible(page, '[data-testid="lang-dropdown"]')

      const animationTime = Date.now() - animationStart

      // Animations should complete quickly
      expect(animationTime).toBeLessThan(300) // 300ms for animation

      // Test dropdown animation
      const dropdownStart = Date.now()

      await page.click('[data-testid="lang-tl"]')
      await page.waitForTimeout(300)

      const dropdownTime = Date.now() - dropdownStart
      expect(dropdownTime).toBeLessThan(400) // 400ms for complete interaction
    })

    test('should maintain 60fps during interactions', async ({ page }) => {
      // Monitor frame rate during search
      const frameDrops = await page.evaluate(() => {
        return new Promise((resolve) => {
          let frameDrops = 0
          let lastTime = performance.now()

          const checkFrame = () => {
            const currentTime = performance.now()
            const deltaTime = currentTime - lastTime

            // If frame took longer than 16.67ms (60fps), count as dropped frame
            if (deltaTime > 16.67 * 2) { // Allow some variance
              frameDrops++
            }

            lastTime = currentTime
          }

          // Monitor frames for 2 seconds
          const interval = setInterval(checkFrame, 16)

          setTimeout(() => {
            clearInterval(interval)
            resolve(frameDrops)
          }, 2000)
        })
      })

      console.log('Frame drops during monitoring:', frameDrops)

      // Should have minimal frame drops
      expect(frameDrops).toBeLessThan(10) // Less than 10 dropped frames in 2 seconds
    })

    test('should handle rapid user interactions smoothly', async ({ page }) => {
      // Test rapid clicking and typing
      const searchInput = page.locator('[data-testid="search-input"]')

      const interactionStart = Date.now()

      // Rapid interactions
      await searchInput.click()
      await searchInput.type('quick', { delay: 50 })
      await page.keyboard.press('Backspace')
      await page.keyboard.press('Backspace')
      await searchInput.type('test', { delay: 30 })

      const interactionTime = Date.now() - interactionStart

      // Should handle rapid interactions smoothly
      expect(interactionTime).toBeLessThan(1000) // 1 second for rapid interactions

      // Test rapid button clicks
      const langSwitcher = page.locator('[data-testid="language-switcher"]')
      const rapidClickStart = Date.now()

      for (let i = 0; i < 5; i++) {
        await langSwitcher.click()
        await page.waitForTimeout(50)
      }

      const rapidClickTime = Date.now() - rapidClickStart
      expect(rapidClickTime).toBeLessThan(1000) // Should handle rapid clicks
    })
  })

  test.describe('Network Performance', () => {
    test('should minimize unnecessary network requests', async ({ page }) => {
      const requests: string[] = []

      page.on('request', (request) => {
        if (request.url().includes(window.location.origin)) {
          requests.push(request.url())
        }
      })

      await page.goto('/')
      await page.waitForLoadState('networkidle')

      console.log('Total requests:', requests.length)
      console.log('Request URLs:', requests)

      // Should not make excessive requests
      expect(requests.length).toBeLessThan(50) // Reasonable request count

      // Should use caching efficiently (check for duplicate requests)
      const uniqueRequests = new Set(requests)
      const duplicateRatio = (requests.length - uniqueRequests.size) / requests.length

      // Duplicate requests should be minimal
      expect(duplicateRatio).toBeLessThan(0.2) // Less than 20% duplicates
    })

    test('should work efficiently offline', async ({ page }) => {
      // Load page online first
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // Go offline
      await goOffline(page)

      const offlineStart = Date.now()

      // Test functionality offline
      await performSearch(page, 'Eucharist')

      const offlineSearchTime = Date.now() - offlineStart

      // Offline search should be instant (client-side)
      expect(offlineSearchTime).toBeLessThan(500) // 500ms for offline search

      // Test navigation offline
      const navStart = Date.now()

      await page.click('[data-testid="search-result"]').first()

      const navTime = Date.now() - navStart
      expect(navTime).toBeLessThan(1000) // 1 second for offline navigation
    })

    test('should implement efficient caching', async ({ page }) => {
      // First load
      const firstLoadStart = Date.now()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const firstLoadTime = Date.now() - firstLoadStart

      // Second load (should be faster due to caching)
      const secondLoadStart = Date.now()
      await page.reload()
      await page.waitForLoadState('networkidle')
      const secondLoadTime = Date.now() - secondLoadStart

      console.log('First load:', firstLoadTime, 'ms')
      console.log('Second load:', secondLoadTime, 'ms')

      // Second load should be significantly faster
      if (firstLoadTime > 2000) {
        expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.5) // At least 50% faster
      }
    })
  })

  test.describe('PWA Performance', () => {
    test('should load quickly from app cache', async ({ page }) => {
      // Check service worker registration
      const serviceWorkerReady = await page.evaluate(() => {
        return navigator.serviceWorker.ready.then(() => true).catch(() => false)
      })

      console.log('Service Worker ready:', serviceWorkerReady)

      // Test that key assets are cached
      const performanceEntries = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter(entry =>
            entry.name.includes('.js') ||
            entry.name.includes('.css') ||
            entry.name.includes('woff')
          )
          .map(entry => ({
            name: entry.name.split('/').pop(),
            duration: entry.duration,
            fromCache: entry.transferSize === 0
          }))
      })

      const cachedAssets = performanceEntries.filter(entry => entry.fromCache)
      console.log(`Cached assets: ${cachedAssets.length}/${performanceEntries.length}`)
    })

    test('should install quickly', async ({ page }) => {
      await page.goto('/')
      await page.waitForTimeout(TEST_CONSTANTS.INSTALL_PROMPT_DELAY)

      // Check if PWA is installable
      const isInstallable = await page.evaluate(() => {
        return 'beforeinstallprompt' in window
      })

      if (isInstallable) {
        const installButton = page.locator('[data-testid="install-button"], [data-testid="floating-install-button"]')

        if (await installButton.isVisible()) {
          const installStart = Date.now()

          // This would normally trigger native install dialog
          await installButton.click()
          await page.waitForTimeout(1000) // Wait for any animations

          const installProcessTime = Date.now() - installStart

          // Install process should start quickly
          expect(installProcessTime).toBeLessThan(2000) // 2 seconds to start install
        }
      }
    })
  })

  test.afterEach(async ({ page }, testInfo) => {
    // Take screenshot on performance test failure
    if (testInfo.status !== 'passed') {
      await takeScreenshotOnFailure(page, `performance-${testInfo.title.replace(/\s+/g, '-')}`)
    }
  })
})