import { test, expect } from '@playwright/test'

test.describe('PWA manifest', () => {
  test('manifest.json is accessible', async ({ page }) => {
    const res = await page.request.get('/manifest.json')
    expect(res.status()).toBe(200)
  })

  test('manifest.json has required PWA fields', async ({ page }) => {
    const res = await page.request.get('/manifest.json')
    const body = await res.json()
    expect(body.name).toBeTruthy()
    expect(body.short_name).toBeTruthy()
    expect(body.start_url).toBeTruthy()
    expect(body.display).toBeTruthy()
    expect(Array.isArray(body.icons)).toBe(true)
    expect(body.icons.length).toBeGreaterThan(0)
  })

  test('page links to manifest.json in head', async ({ page }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toMatch(/manifest\.json/)
  })
})

test.describe('Routes return 200', () => {
  for (const route of ['/', '/handbook', '/search', '/favorites']) {
    test(`${route} returns 200`, async ({ page }) => {
      const res = await page.goto(route)
      expect(res?.status()).toBeLessThan(400)
    })
  }
})
