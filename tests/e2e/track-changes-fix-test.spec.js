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

// Helper function to check database content
async function checkDatabaseContent(docId) {
  try {
    const response = await fetch(`http://localhost:3001/api/notes/${docId}`);
    if (response.ok) {
      const data = await response.json();
      return {
        exists: true,
        content: data.content,
        contentLength: data.content ? data.content.length : 0
      };
    }
    return { exists: false };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

test.describe('Track Changes Fix Test', () => {
  
  test('Verify track changes markup is stripped from database saves', async ({ page }) => {
    const docId = 'track-changes-fix-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Monitor auto-save logs
    const autoSaveLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Auto-save check') || 
          text.includes('Auto-saving CLEAN') || 
          text.includes('Raw HTML length') ||
          text.includes('Clean HTML length')) {
        autoSaveLogs.push(text);
        console.log('Auto-save log:', text);
      }
    });

    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Add content that will trigger track changes
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    const testText = 'Clean content test - no duplication expected';
    await page.type('.tiptap', testText);
    
    console.log('Typed:', testText);

    // Wait for auto-save
    await page.waitForTimeout(3000);
    
    // Check database content is clean
    const dbState = await checkDatabaseContent(docId);
    console.log('Database content length:', dbState.contentLength);
    console.log('Database content preview:', dbState.content ? dbState.content.substring(0, 300) : 'N/A');
    
    // Verify database content doesn't contain track changes markup
    const hasTrackChangesMarkup = dbState.content && dbState.content.includes('data-track-change="true"');
    console.log('Database contains track changes markup:', hasTrackChangesMarkup);
    
    // Database should NOT contain track changes markup
    expect(hasTrackChangesMarkup).toBe(false);
    
    // Content length should be reasonable (not thousands of characters for simple text)
    expect(dbState.contentLength).toBeLessThan(500);

    // Refresh page to test duplication
    console.log('=== REFRESHING TO TEST DUPLICATION ===');
    await page.reload();
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const contentAfterReload = await page.locator('.tiptap').textContent();
    console.log('Content after reload:', contentAfterReload);

    // Check for duplication
    const occurrences = (contentAfterReload.match(/Clean content test - no duplication expected/g) || []).length;
    console.log('Text occurrences after reload:', occurrences);

    // Should appear exactly once
    expect(occurrences).toBe(1);

    console.log('\n=== Auto-save Logs ===');
    autoSaveLogs.forEach((log, i) => {
      console.log(`${i + 1}. ${log}`);
    });
  });

  test('Verify multiple auto-save cycles with clean content', async ({ page }) => {
    const docId = 'multiple-saves-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Clear and add initial content
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'Initial content');

    // Wait for first save
    await page.waitForTimeout(3000);
    let dbState1 = await checkDatabaseContent(docId);
    console.log('After first save - DB length:', dbState1.contentLength);

    // Add more content
    await page.type('.tiptap', ' - Second addition');
    
    // Wait for second save
    await page.waitForTimeout(3000);
    let dbState2 = await checkDatabaseContent(docId);
    console.log('After second save - DB length:', dbState2.contentLength);

    // Add more content
    await page.type('.tiptap', ' - Third addition');
    
    // Wait for third save
    await page.waitForTimeout(3000);
    let dbState3 = await checkDatabaseContent(docId);
    console.log('After third save - DB length:', dbState3.contentLength);

    // Check that database content length grows reasonably, not exponentially
    const growthRatio1to2 = dbState2.contentLength / dbState1.contentLength;
    const growthRatio2to3 = dbState3.contentLength / dbState2.contentLength;
    
    console.log('Growth ratio 1->2:', growthRatio1to2);
    console.log('Growth ratio 2->3:', growthRatio2to3);
    
    // Growth should be reasonable (not exponential)
    expect(growthRatio1to2).toBeLessThan(2);
    expect(growthRatio2to3).toBeLessThan(2);

    // Final content should not contain track changes markup
    const hasTrackChanges = dbState3.content && dbState3.content.includes('data-track-change="true"');
    expect(hasTrackChanges).toBe(false);

    // Test reload behavior
    await page.reload();
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const finalContent = await page.locator('.tiptap').textContent();
    console.log('Final content after reload:', finalContent);

    // Should contain each addition exactly once
    const initialCount = (finalContent.match(/Initial content/g) || []).length;
    const secondCount = (finalContent.match(/Second addition/g) || []).length;
    const thirdCount = (finalContent.match(/Third addition/g) || []).length;

    expect(initialCount).toBe(1);
    expect(secondCount).toBe(1);
    expect(thirdCount).toBe(1);
  });
});