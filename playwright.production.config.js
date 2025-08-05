const { devices } = require('@playwright/test');

module.exports = {
  testDir: './tests/production',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'test-results/production-report' }],
    ['json', { outputFile: 'test-results/production-results.json' }],
    ['list']
  ],
  use: {
    baseURL: 'https://obsidiancomments.serverado.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
    extraHTTPHeaders: {
      'User-Agent': 'ObsidianComments-ProductionTests/1.0.0'
    }
  },
  projects: [
    {
      name: 'production-api',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*api-integration\.test\.js/,
    },
  ],
  timeout: 60000,
  expect: {
    timeout: 10000
  }
};