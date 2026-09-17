import { test, expect } from '@playwright/test'

// bible-tradition-authority/beginner/en has 30 active questions (same fixture
// topic __tests__/e2e/topic-detail.spec.ts already relies on) — safe to use
// for a real, unauthenticated question-load smoke test.
const QUIZ_URL = '/quiz/bible-tradition-authority/beginner'

test.describe('Quiz — time limit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(QUIZ_URL)
    await page.waitForLoadState('networkidle')
  })

  test('shows a countdown timer once questions load', async ({ page }) => {
    // First question renders once the quiz bank has loaded.
    await expect(page.locator('h1')).toContainText(/beginner quiz/i, { timeout: 10000 })
    await expect(page.getByText(/^\d+:\d{2}$/).first()).toBeVisible({ timeout: 10000 })
  })

  test('countdown ticks down over time', async ({ page }) => {
    const timer = page.getByText(/^\d+:\d{2}$/).first()
    await expect(timer).toBeVisible({ timeout: 10000 })
    const first = await timer.textContent()
    await page.waitForTimeout(2100)
    const second = await timer.textContent()
    expect(second).not.toBe(first)
  })

  test('answering every question enables submission', async ({ page }) => {
    await page.locator('article, div').filter({ hasText: '1.' }).first().waitFor({ timeout: 10000 })
    const radios = page.locator('input[type="radio"]')
    await expect(radios.first()).toBeVisible({ timeout: 10000 })

    // Pick the first choice for every question (one radio per question name group).
    const names = new Set<string>()
    const count = await radios.count()
    for (let i = 0; i < count; i++) {
      const name = await radios.nth(i).getAttribute('name')
      if (name && !names.has(name)) {
        names.add(name)
        await radios.nth(i).check()
      }
    }

    await expect(page.getByRole('button', { name: /submit quiz/i })).toHaveText(/^submit quiz$/i)
  })

  test('submitting while signed out redirects to sign-in', async ({ page }) => {
    const radios = page.locator('input[type="radio"]')
    await expect(radios.first()).toBeVisible({ timeout: 10000 })

    const names = new Set<string>()
    const count = await radios.count()
    for (let i = 0; i < count; i++) {
      const name = await radios.nth(i).getAttribute('name')
      if (name && !names.has(name)) {
        names.add(name)
        await radios.nth(i).check()
      }
    }

    await page.getByRole('button', { name: /submit quiz/i }).click()
    await page.waitForURL(/\/account/, { timeout: 10000 })
  })
})
