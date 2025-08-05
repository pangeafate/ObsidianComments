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

test.describe('Text Duplication Bug - TDD', () => {
  
  test('Text should NOT duplicate on page refresh after auto-save', async ({ page }) => {
    const docId = 'duplication-test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Step 1: Navigate to new document
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    
    // Step 2: Wait for editor to load and initial content to be set
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for document creation and initial content
    
    // Step 3: Clear the initial content and add specific test content
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    const originalText = 'This is unique test content that should not duplicate - ' + Date.now();
    await page.type('.tiptap', originalText);
    
    console.log('Original text entered:', originalText);
    
    // Step 4: Wait for auto-save to trigger (2+ seconds)
    await page.waitForTimeout(3000);
    
    // Step 5: Get content before refresh to establish baseline
    const contentBeforeRefresh = await page.locator('.tiptap').textContent();
    console.log('Content before refresh:', contentBeforeRefresh);
    
    // Verify original text is present exactly once
    expect(contentBeforeRefresh).toContain(originalText);
    const occurrencesBefore = (contentBeforeRefresh.match(new RegExp(originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    expect(occurrencesBefore).toBe(1);
    
    // Step 6: Refresh the page
    console.log('Refreshing page...');
    await page.reload();
    
    // Step 7: Handle user name overlay again after refresh
    await handleUserNameOverlay(page);
    
    // Step 8: Wait for editor to load after refresh
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for content to load from database
    
    // Step 9: Get content after refresh
    const contentAfterRefresh = await page.locator('.tiptap').textContent();
    console.log('Content after refresh:', contentAfterRefresh);
    
    // Step 10: CRITICAL TEST - Text should appear exactly once, not duplicated
    const occurrencesAfter = (contentAfterRefresh.match(new RegExp(originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    
    console.log(`Text occurrences before refresh: ${occurrencesBefore}`);
    console.log(`Text occurrences after refresh: ${occurrencesAfter}`);
    
    // This should pass when bug is fixed
    expect(occurrencesAfter).toBe(1);
    
    // Additional validation - content should not be significantly longer (indicating duplication)
    const lengthRatio = contentAfterRefresh.length / contentBeforeRefresh.length;
    console.log(`Content length ratio (after/before): ${lengthRatio}`);
    
    // Content length should not increase significantly (allowing for minor formatting differences)
    expect(lengthRatio).toBeLessThan(1.5); // Allow up to 50% increase for formatting, but not full duplication
  });

  test('Multiple refresh cycles should not cause exponential duplication', async ({ page }) => {
    const docId = 'multi-refresh-test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Step 1: Navigate to new document
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    
    // Step 2: Wait for editor and add content
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    const testText = 'Multi-refresh test text - ' + Date.now();
    await page.type('.tiptap', testText);
    
    // Step 3: Wait for auto-save
    await page.waitForTimeout(3000);
    
    // Step 4: Perform multiple refresh cycles
    const refreshCycles = 3;
    let previousLength = 0;
    
    for (let i = 0; i < refreshCycles; i++) {
      console.log(`Refresh cycle ${i + 1}/${refreshCycles}`);
      
      await page.reload();
      await handleUserNameOverlay(page);
      await page.waitForSelector('.tiptap', { timeout: 10000 });
      await page.waitForTimeout(3000);
      
      const currentContent = await page.locator('.tiptap').textContent();
      const currentLength = currentContent.length;
      const occurrences = (currentContent.match(new RegExp(testText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      console.log(`Cycle ${i + 1}: Content length = ${currentLength}, Occurrences = ${occurrences}`);
      
      // Text should appear exactly once regardless of refresh count
      expect(occurrences).toBe(1);
      
      // Content length should not grow exponentially - allow for some header duplication but not exponential growth
      if (i > 0) {
        const growthRatio = currentLength / previousLength;
        console.log(`Growth ratio from previous cycle: ${growthRatio}`);
        expect(growthRatio).toBeLessThan(1.5); // Allow up to 50% growth but not exponential (2x would be 100% = 2.0)
      }
      
      previousLength = currentLength;
    }
  });

  test('Auto-save and manual typing should not conflict during refresh', async ({ page }) => {
    const docId = 'autosave-conflict-test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Clear and add initial content
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    const baseText = 'Base content - ' + Date.now();
    await page.type('.tiptap', baseText);
    
    // Wait for auto-save
    await page.waitForTimeout(3000);
    
    // Add more content
    await page.type('.tiptap', ' Additional content');
    
    // Refresh immediately after typing (before auto-save completes)
    await page.reload();
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    const finalContent = await page.locator('.tiptap').textContent();
    console.log('Final content after refresh:', finalContent);
    
    // Should contain base text exactly once
    const baseOccurrences = (finalContent.match(new RegExp(baseText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    expect(baseOccurrences).toBe(1);
    
    // Should not contain obvious duplicated user content (the main bug we're fixing)
    // Check that user text doesn't appear multiple times consecutively
    const userContentPattern = baseText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const duplicatedUserContent = new RegExp(`(${userContentPattern}).*\\1`, 'g');
    expect(finalContent).not.toMatch(duplicatedUserContent);
  });
});