import { test, expect } from '@playwright/test'

test.describe('Topic detail page', () => {
  test.beforeEach(async ({ page }) => {
    // bible-tradition-authority is the first topic in en/handbook.json
    await page.goto('/bible-tradition-authority')
    await page.waitForLoadState('networkidle')
  })

  test('renders the topic title as h1', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('h1')).not.toBeEmpty()
  })

  test('shows the question as italic text in header', async ({ page }) => {
    // Question is rendered as an italic paragraph in the topic header (no "The Question" heading)
    await expect(page.locator('header p').first()).toBeVisible({ timeout: 10000 })
    await expect(page.locator('header p').first()).not.toBeEmpty()
  })

  test('shows Answer section heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Answer$/i })).toBeVisible({ timeout: 10000 })
  })

  test('shows Scripture References section', async ({ page }) => {
    await expect(page.getByText('Scripture', { exact: false }).first()).toBeVisible({ timeout: 10000 })
  })

  test('shows Catechism References when present', async ({ page }) => {
    // If there are catechism refs, the section should show
    const catSection = page.getByText('Catechism', { exact: false })
    const count = await catSection.count()
    if (count > 0) {
      await expect(catSection.first()).toBeVisible()
    }
  })

  test('shows difficulty or category badge', async ({ page }) => {
    await expect(
      page.getByText(/beginner|intermediate|advanced/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('favorite heart button is on the page', async ({ page }) => {
    const heartBtn = page.getByRole('button', { name: /favorite/i })
    await expect(heartBtn.first()).toBeVisible({ timeout: 10000 })
  })
})
