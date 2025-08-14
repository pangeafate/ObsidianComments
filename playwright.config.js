module.exports = {
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html']] : 'html',
  
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.TEST_URL || 'http://obsidiancomments.serverado.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...require('@playwright/test').devices['Desktop Chrome'],
        headless: true,
        viewport: { width: 1280, height: 720 }
      },
    },
  ],

  // webServer: process.env.CI ? undefined : {
  //   command: 'npm run dev',
  //   port: 3001,
  //   reuseExistingServer: !process.env.CI,
  // },
};