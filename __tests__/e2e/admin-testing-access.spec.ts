import { test, expect } from '@playwright/test'

// No auth fixture exists in this e2e suite yet (all specs are anonymous), so
// these checks cover the credential-free half of the admin surface: that the
// gate itself holds. The authenticated admin flows (time-limit edit, the
// testing tool's mark/clear actions) are covered by the unit tests in
// __tests__/unit/admin-quiz-settings-route.test.ts and
// __tests__/unit/admin-progress-route.test.ts instead.
test.describe('Admin access gating', () => {
  test('/admin/testing requires admin access when signed out', async ({ page }) => {
    const res = await page.goto('/admin/testing')
    expect(res?.status()).toBeLessThan(400)
    await expect(page.getByText(/admin access required/i)).toBeVisible({ timeout: 10000 })
  })

  test('/admin/quiz requires admin access when signed out', async ({ page }) => {
    const res = await page.goto('/admin/quiz')
    expect(res?.status()).toBeLessThan(400)
    await expect(page.getByText(/admin access required/i)).toBeVisible({ timeout: 10000 })
  })
})
