const { test, expect } = require('@playwright/test');

// Helper function to handle user name overlay
async function handleUserNameOverlay(page) {
  try {
    const userNameOverlay = page.locator('[data-testid="user-name-overlay"]');
    await userNameOverlay.waitFor({ state: 'visible', timeout: 3000 });
    
    console.log('User name overlay detected, filling it out...');
    const nameInput = page.locator('input[placeholder="Enter your name..."]');
    await nameInput.fill('Test User ' + Date.now());
    
    const submitButton = page.locator('button:has-text("Continue")').first();
    await submitButton.click();
    
    await userNameOverlay.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('User name overlay dismissed');
  } catch (error) {
    console.log('No user name overlay found (this is fine)');
  }
}

test.describe('Debug Auto-save Issues', () => {
  
  test('Debug auto-save and connection status', async ({ page }) => {
    const docId = 'debug-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Capture all console logs
    const allLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      allLogs.push(text);
      console.log('BROWSER LOG:', text);
    });

    // Capture network requests
    const networkRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('/ws')) {
        networkRequests.push({
          method: request.method(),
          url: request.url(),
          timestamp: Date.now()
        });
        console.log('NETWORK REQUEST:', request.method(), request.url());
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/') || response.url().includes('/ws')) {
        console.log('NETWORK RESPONSE:', response.status(), response.url());
      }
    });

    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    
    // Wait for page to load
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Check connection status
    const connectionStatus = await page.locator('text=Connecting...').count();
    console.log('Connection status "Connecting..." elements found:', connectionStatus);

    // Check if there are any other connection statuses
    const connectedStatus = await page.locator('text=Connected').count();
    const disconnectedStatus = await page.locator('text=Disconnected').count();
    console.log('Connected status elements:', connectedStatus);
    console.log('Disconnected status elements:', disconnectedStatus);

    // Try to add content
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'Testing auto-save functionality');
    
    console.log('Content typed, waiting for auto-save...');

    // Wait longer for auto-save
    await page.waitForTimeout(5000);

    // Check final connection status
    const finalConnectionStatus = await page.locator('text=Connecting...').count();
    console.log('Final connection status "Connecting..." elements:', finalConnectionStatus);

    console.log('\n=== ALL CONSOLE LOGS ===');
    allLogs.forEach((log, i) => {
      console.log(`${i + 1}. ${log}`);
    });

    console.log('\n=== NETWORK REQUESTS ===');
    networkRequests.forEach((req, i) => {
      console.log(`${i + 1}. ${req.method} ${req.url} [${new Date(req.timestamp).toISOString()}]`);
    });

    // The test doesn't need to pass - it's just for debugging
    console.log('Debug test completed');
  });

  test('Check if editor and document service are loaded', async ({ page }) => {
    const docId = 'service-debug-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check if the editor is properly initialized
    const editorExists = await page.evaluate(() => {
      return typeof window !== 'undefined' && document.querySelector('.tiptap') !== null;
    });
    console.log('Editor exists:', editorExists);

    // Check if documentService is available
    const serviceCheck = await page.evaluate(() => {
      try {
        // Try to access the document service from the browser
        return 'documentService is loaded (this is expected to fail in browser context)';
      } catch (error) {
        return 'documentService check failed: ' + error.message;
      }
    });
    console.log('Service check:', serviceCheck);

    // Type content and see what happens
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'Service debug test');

    await page.waitForTimeout(3000);

    const finalContent = await page.locator('.tiptap').textContent();
    console.log('Final content in editor:', finalContent);
  });
});