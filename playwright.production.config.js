const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://obsidiancomments.serverado.app',
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    navigationTimeout: 30000,
    actionTimeout: 15000,
    headless: true,
    launchOptions: {
      args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});