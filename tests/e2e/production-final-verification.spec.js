const { test, expect } = require('@playwright/test');

const PRODUCTION_URL = 'https://obsidiancomments.serverado.app';

// No need to ignore HTTPS errors now - we have a valid Let's Encrypt certificate

test.describe('Production Deployment Final Verification', () => {
  test('SSL certificate is valid and trusted', async ({ page }) => {
    // This test will fail if SSL is not properly configured
    await page.goto(PRODUCTION_URL);
    
    // Check that the page loads without SSL errors
    await expect(page).toHaveURL(/.*obsidiancomments\.serverado\.app/);
    
    const title = await page.title();
    expect(title).toContain('Obsidian');
  });

  test('API works with valid SSL', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_URL}/api/health`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.services).toHaveProperty('database', 'connected');
    expect(data.services).toHaveProperty('redis', 'connected');
    expect(data.services).toHaveProperty('hocuspocus', 'connected');
  });

  test('Editor functionality with secure connection', async ({ page }) => {
    const documentId = `ssl-test-${Date.now()}`;
    
    await page.goto(`${PRODUCTION_URL}/editor/${documentId}`);
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Set user name if needed
    const nameInput = page.locator('input[placeholder="Enter your name..."]');
    if (await nameInput.isVisible({ timeout: 2000 })) {
      await nameInput.fill('SSL Test User');
      await page.keyboard.press('Enter');
    }
    
    // Test title editing with deduplication
    const titleElement = page.locator('h1').first();
    await titleElement.click();
    
    const titleInput = page.locator('input[type="text"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.clear();
      await titleInput.fill('SSL Test Document');
      await titleInput.press('Enter');
      await page.waitForTimeout(2000);
    }
    
    // Add content
    const editor = page.locator('.prose');
    await editor.click();
    await page.keyboard.type('This is a test with valid SSL certificate.');
    await page.waitForTimeout(2000);
    
    // Verify connection status shows connected
    const connectionStatus = page.locator('[data-testid="connection-status"]').first();
    if (await connectionStatus.isVisible({ timeout: 5000 })) {
      await expect(connectionStatus).toContainText(/connected/i, { timeout: 10000 });
    }
  });

  test('WebSocket works over secure connection (WSS)', async ({ page }) => {
    const documentId = `wss-test-${Date.now()}`;
    
    await page.goto(`${PRODUCTION_URL}/editor/${documentId}`);
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Check for any WebSocket errors in console
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('WebSocket')) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for WebSocket connection to establish
    await page.waitForTimeout(3000);
    
    // Should not have WebSocket connection errors
    expect(consoleErrors.length).toBe(0);
  });

  test('Mixed content warnings should not exist', async ({ page }) => {
    // Listen for security state changes
    const securityWarnings = [];
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('mixed content')) {
        securityWarnings.push(msg.text());
      }
    });
    
    await page.goto(`${PRODUCTION_URL}/editor/mixed-content-test-${Date.now()}`);
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Should not have mixed content warnings
    expect(securityWarnings.length).toBe(0);
  });

  test('HTTPS redirect works properly', async ({ page }) => {
    // Try to access HTTP version - should redirect to HTTPS
    const response = await page.goto(`http://obsidiancomments.serverado.app/`, { 
      waitUntil: 'networkidle' 
    });
    
    // Should be redirected to HTTPS
    expect(page.url()).toBe(`${PRODUCTION_URL}/`);
    
    // Response should be successful after redirect
    expect(response?.ok()).toBeTruthy();
  });
});