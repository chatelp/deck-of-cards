import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour les tests visuels
 * Précondition 2.5 : Tests déterministes et exhaustifs
 */
export default defineConfig({
  testDir: __dirname,
  fullyParallel: false, // Sérialiser pour éviter les conflits d'état
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'pnpm dev:web',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120 * 1000
  }
});
