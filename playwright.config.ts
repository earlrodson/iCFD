import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'next dev --port 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: false,
    timeout: 60000,
    cwd: '/opt/homebrew/var/www/iCFD',
  },
})
