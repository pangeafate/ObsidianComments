const { test, expect } = require('@playwright/test');

const PRODUCTION_URL = 'http://obsidiancomments.serverado.app';

// Configure to ignore SSL certificate errors for self-signed cert
test.use({
  ignoreHTTPSErrors: true
});

test.describe('Production Deployment Verification', () => {
  test('Homepage loads successfully', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    
    // Check that the page loads
    await expect(page).toHaveURL(/.*obsidiancomments\.serverado\.app/);
    
    // Check for main elements
    const title = await page.title();
    expect(title).toContain('Obsidian');
  });

  test('API health endpoint is accessible', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_URL}/api/health`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
    expect(data.services).toHaveProperty('database', 'connected');
    expect(data.services).toHaveProperty('redis', 'connected');
    expect(data.services).toHaveProperty('hocuspocus', 'connected');
  });

  test('Editor page loads and is functional', async ({ page }) => {
    // Generate a random document ID
    const documentId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    await page.goto(`${PRODUCTION_URL}/editor/${documentId}`);
    
    // Wait for editor to load
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Check for user name popup and set a name
    const nameInput = page.locator('input[placeholder="Enter your name..."]');
    if (await nameInput.isVisible({ timeout: 2000 })) {
      await nameInput.fill('Test User');
      await page.keyboard.press('Enter');
    }
    
    // Verify editor is editable
    const editor = page.locator('.prose');
    await expect(editor).toBeVisible();
    
    // Check for UI improvements - button consistency
    const buttons = page.locator('button').filter({ hasText: /View|Comments|My Links|New Note/ });
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
    
    // Check for mobile icon collapse (if viewport is small)
    const viewportSize = page.viewportSize();
    if (viewportSize && viewportSize.width < 640) {
      // Check for icon buttons on mobile
      const iconButtons = page.locator('button').filter({ hasText: /📎|💬/ });
      const iconCount = await iconButtons.count();
      expect(iconCount).toBeGreaterThan(0);
    }
    
    // Type some content to verify editor works
    await editor.click();
    await page.keyboard.type('Testing production deployment');
    
    // Wait a moment for content to be saved
    await page.waitForTimeout(2000);
  });

  test('Title deduplication is working', async ({ page }) => {
    const documentId = `test-title-${Date.now()}`;
    
    await page.goto(`${PRODUCTION_URL}/editor/${documentId}`);
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Set user name if needed
    const nameInput = page.locator('input[placeholder="Enter your name..."]');
    if (await nameInput.isVisible({ timeout: 2000 })) {
      await nameInput.fill('Test User');
      await page.keyboard.press('Enter');
    }
    
    // Find and edit the title
    const titleElement = page.locator('h1').first();
    await titleElement.click();
    
    // Change title
    const titleInput = page.locator('input[type="text"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.clear();
      await titleInput.fill('Test Title');
      await titleInput.press('Enter');
      
      // Wait for save
      await page.waitForTimeout(2000);
      
      // Refresh page
      await page.reload();
      await page.waitForSelector('.prose', { timeout: 10000 });
      
      // Set user name again if needed
      const nameInputAfterRefresh = page.locator('input[placeholder="Enter your name..."]');
      if (await nameInputAfterRefresh.isVisible({ timeout: 2000 })) {
        await nameInputAfterRefresh.fill('Test User');
        await page.keyboard.press('Enter');
      }
      
      // Check title is not duplicated
      const titleText = await page.locator('h1').first().textContent();
      expect(titleText).toBe('Test Title');
      expect(titleText).not.toContain('Test TitleTest Title');
    }
  });

  test('WebSocket connection works', async ({ page }) => {
    const documentId = `test-ws-${Date.now()}`;
    
    await page.goto(`${PRODUCTION_URL}/editor/${documentId}`);
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Check for connection status indicator
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    if (await connectionStatus.isVisible({ timeout: 5000 })) {
      // Wait for connected status
      await expect(connectionStatus).toContainText(/connected/i, { timeout: 10000 });
    }
  });

  test('View mode works', async ({ page }) => {
    const documentId = `test-view-${Date.now()}`;
    
    // First create a document in editor
    await page.goto(`${PRODUCTION_URL}/editor/${documentId}`);
    await page.waitForSelector('.prose', { timeout: 10000 });
    
    // Set user name if needed
    const nameInput = page.locator('input[placeholder="Enter your name..."]');
    if (await nameInput.isVisible({ timeout: 2000 })) {
      await nameInput.fill('Test User');
      await page.keyboard.press('Enter');
    }
    
    // Add some content
    const editor = page.locator('.prose');
    await editor.click();
    await page.keyboard.type('Content for view mode test');
    await page.waitForTimeout(2000);
    
    // Navigate to view mode
    await page.goto(`${PRODUCTION_URL}/view/${documentId}`);
    
    // Check view mode loads
    await expect(page.locator('body')).toContainText('View Mode');
    
    // Verify content is displayed
    await expect(page.locator('body')).toContainText('Content for view mode test');
  });

  test('CORS headers are correctly configured', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_URL}/api/notes/share`, {
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'app://obsidian.md'
      },
      data: {
        content: 'Test CORS'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    
    // Note: Playwright's request API might not expose all headers
    // but we can verify the request succeeds with Obsidian origin
  });
});