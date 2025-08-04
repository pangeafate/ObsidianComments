const { test, expect } = require('@playwright/test');

test.describe('Debug Tests', () => {
  test('Debug page loading and UI state', async ({ page }) => {
    const documentId = 'debug-doc-' + Date.now();
    
    console.log(`🔍 Loading: /editor/${documentId}`);
    await page.goto(`/editor/${documentId}`);
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'debug-initial-load.png', fullPage: true });
    
    // Check for user name overlay
    const userNameOverlay = page.locator('[data-testid="user-name-overlay"]');
    const hasOverlay = await userNameOverlay.isVisible();
    console.log('User name overlay visible:', hasOverlay);
    
    if (hasOverlay) {
      console.log('Found user name overlay, filling it out...');
      const nameInput = page.locator('input[placeholder="Enter your name..."]');
      await nameInput.fill('Test User');
      
      // Look for submit button
      const submitButton = page.locator('button:has-text("Continue"), button:has-text("Start"), button:has-text("OK")');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        console.log('Clicked submit button');
      }
      
      // Wait for overlay to disappear
      await userNameOverlay.waitFor({ state: 'hidden', timeout: 5000 });
      console.log('User name overlay dismissed');
    }
    
    // Check if editor is now accessible
    const editor = page.locator('.tiptap');
    await expect(editor).toBeVisible();
    
    console.log('✅ Editor is visible and should be interactive');
    
    // Try to click and type
    await editor.click();
    await editor.type('Debug test text');
    
    await expect(editor).toContainText('Debug test text');
    console.log('✅ Text editing works');
  });
});