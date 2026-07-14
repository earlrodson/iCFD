import { test, expect } from '@playwright/test'

test.describe('Favorites', () => {
  test('favorites page loads without 404', async ({ page }) => {
    const res = await page.goto('/favorites')
    expect(res?.status()).toBeLessThan(400)
    await expect(page.locator('body')).not.toContainText('404')
  })

  test('toggling favorite heart on a topic card updates its aria-label', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Wait for topic cards to appear
    await page.locator('article').first().waitFor({ timeout: 10000 })

    const heartBtn = page.getByRole('button', { name: 'Add to favorites' }).first()
    await expect(heartBtn).toBeVisible()
    await heartBtn.click()

    // After click, aria-label changes to "Remove from favorites"
    await expect(page.getByRole('button', { name: 'Remove from favorites' }).first()).toBeVisible()
  })

  test('favoriting from topic detail page is reflected immediately', async ({ page }) => {
    await page.goto('/bible-tradition-authority')
    await page.waitForLoadState('networkidle')

    const heartBtn = page.getByRole('button', { name: /favorite/i }).first()
    await expect(heartBtn).toBeVisible({ timeout: 10000 })
    await heartBtn.click()

    // Button should now indicate it's favorited (Remove from favorites)
    await expect(page.getByRole('button', { name: /remove from favorites/i })).toBeVisible({ timeout: 3000 })
  })
})
