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

test.describe('Simple Fix Test', () => {
  
  test('Check if new auto-save logs are present', async ({ page }) => {
    const docId = 'simple-fix-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Track specific log messages
    const newAutoSaveLogs = [];
    const oldAutoSaveLogs = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Stripping track changes') || text.includes('Original length') || text.includes('Cleaned length') || text.includes('Removed') || text.includes('Auto-saving CLEAN')) {
        newAutoSaveLogs.push(text);
        console.log('NEW AUTO-SAVE LOG:', text);
      }
      if (text.includes('Auto-saving document to database') && !text.includes('CLEAN')) {
        oldAutoSaveLogs.push(text);
        console.log('OLD AUTO-SAVE LOG:', text);
      }
    });

    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Add content
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'Testing new logs');

    // Wait for auto-save
    await page.waitForTimeout(3000);

    console.log('\n=== LOG ANALYSIS ===');
    console.log('New auto-save logs found:', newAutoSaveLogs.length);
    console.log('Old auto-save logs found:', oldAutoSaveLogs.length);
    
    newAutoSaveLogs.forEach((log, i) => {
      console.log(`NEW ${i + 1}: ${log}`);
    });
    
    oldAutoSaveLogs.forEach((log, i) => {
      console.log(`OLD ${i + 1}: ${log}`);
    });

    // We should see the new logs if the fix is working
    expect(newAutoSaveLogs.length).toBeGreaterThan(0);
  });
});