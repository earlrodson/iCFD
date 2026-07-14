import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for React hydration and content fetch to complete
    await page.waitForLoadState('networkidle')
  })

  test('renders h1 with app name', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Catholic Faith')
  })

  test('displays category filter with All button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
  })

  test('displays Bible and Papacy category buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Bible/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Papacy/i })).toBeVisible()
  })

  test('topic cards render after content loads', async ({ page }) => {
    // Content loads via fetch; articles appear once hydrated
    await expect(page.locator('article').first()).toBeVisible({ timeout: 10000 })
  })

  test('search input is present and accepts text', async ({ page }) => {
    const input = page.locator('input[type="search"]')
    await expect(input).toBeVisible()
    await input.fill('baptism')
    await expect(input).toHaveValue('baptism')
  })

  test('language switcher has EN, TL, CEB buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'EN' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'TL' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'CEB' }).first()).toBeVisible()
  })

  test('dark mode toggle button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /toggle dark mode/i })).toBeVisible()
  })
})
