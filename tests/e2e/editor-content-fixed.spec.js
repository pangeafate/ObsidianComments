/**
 * E2E Test: Editor Content Display - Fixed Version
 * 
 * This test properly handles the user name popup that was blocking content loading.
 */

const { test, expect } = require('@playwright/test');

test.describe('Editor Content Display - Fixed', () => {
  test('should display shared note content in collaborative editor after handling username popup', async ({ page }) => {
    // Step 1: Create a note via API (simulating Obsidian plugin share)
    const testContent = `# Test Note from Plugin

This is a test note shared from Obsidian plugin.

## Section 1
Some content here.

1. Numbered list item 1
2. Numbered list item 2  
3. Numbered list item 3

## Section 2
- Bullet point 1
- Bullet point 2

Final paragraph with **bold** and *italic* text.`;

    const testTitle = 'Test Note from Plugin';
    const shareId = `playwright-fixed-${Date.now()}`;

    console.log('📝 Creating note via API...');
    const shareResponse = await fetch('https://obsidiancomments.serverado.app/api/notes/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: testTitle,
        content: testContent,
        shareId: shareId
      })
    });

    expect(shareResponse.ok).toBeTruthy();
    const shareResult = await shareResponse.json();
    console.log('✅ Note created:', shareResult.shareId);

    // Step 2: Navigate to collaborative editor
    const editorUrl = shareResult.collaborativeUrl || shareResult.editUrl;
    console.log('🌐 Navigating to editor:', editorUrl);
    
    await page.goto(editorUrl);

    // Step 3: Handle the UserNamePopup that blocks interaction
    const userNameOverlay = page.locator('[data-testid="user-name-overlay"]');
    
    // Wait for the popup to appear
    await expect(userNameOverlay).toBeVisible({ timeout: 10000 });
    console.log('👤 Username popup detected, filling it out...');

    // Fill in the username and submit
    const nameInput = page.locator('input[placeholder="Enter your name..."]');
    await nameInput.fill('Playwright Test User');
    
    // Click continue button
    const continueButton = page.locator('button:has-text("Continue")');
    await continueButton.click();

    // Wait for popup to disappear
    await expect(userNameOverlay).toBeHidden({ timeout: 5000 });
    console.log('✅ Username popup dismissed');

    // Step 4: Wait for editor to load and content to appear
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    console.log('📝 Editor loaded, waiting for content...');

    // Give some time for content to load from database
    await page.waitForTimeout(3000);

    // Step 5: Verify content is displayed in editor
    const editorContent = page.locator('.ProseMirror').first();
    
    // Check for key content pieces
    await expect(editorContent).toContainText('This is a test note shared from Obsidian plugin', { timeout: 15000 });
    await expect(editorContent).toContainText('Some content here');
    await expect(editorContent).toContainText('Numbered list item 1');
    await expect(editorContent).toContainText('Final paragraph with');
    
    console.log('✅ Content successfully displayed in editor');

    // Step 6: Verify the title is displayed correctly (should not be duplicated in content)
    const titleElement = page.locator('h1').first();
    await expect(titleElement).toContainText('Test Note from Plugin');

    // Check that there's not excessive title duplication
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeLessThanOrEqual(2); // One in header, possibly one in content
    console.log(`📊 Found ${h1Count} H1 elements (should be ≤2)`);

    // Step 7: Test that editor is functional (can edit)
    await editorContent.click();
    await page.keyboard.press('End'); // Go to end of document
    await page.keyboard.type('\n\nTest edit from Playwright');
    
    // Verify the edit was applied
    await expect(editorContent).toContainText('Test edit from Playwright');
    console.log('✅ Editor is functional - edit test passed');

    // Cleanup: Delete the test note
    try {
      await fetch(`https://obsidiancomments.serverado.app/api/notes/${shareId}`, {
        method: 'DELETE'
      });
      console.log('🧹 Test cleanup completed');
    } catch (e) {
      console.log('⚠️ Cleanup failed:', e.message);
    }
  });

  test('should handle content loading on page refresh', async ({ page }) => {
    // Create a note first
    const testContent = `# Persistence Test

This content should persist after page reload.

Important data that must not disappear.`;

    const shareId = `playwright-persist-${Date.now()}`;
    const shareResponse = await fetch('https://obsidiancomments.serverado.app/api/notes/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Persistence Test',
        content: testContent,
        shareId: shareId
      })
    });

    const shareResult = await shareResponse.json();
    const editorUrl = shareResult.collaborativeUrl || shareResult.editUrl;

    // First visit - handle username popup
    await page.goto(editorUrl);
    
    // Handle username popup
    const userNameOverlay = page.locator('[data-testid="user-name-overlay"]');
    if (await userNameOverlay.isVisible()) {
      await page.locator('input[placeholder="Enter your name..."]').fill('Test User');
      await page.locator('button:has-text("Continue")').click();
      await expect(userNameOverlay).toBeHidden();
    }

    // Wait for editor to load
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    await page.waitForTimeout(2000); // Give time for content to load

    // Verify initial content load
    const editorContent = page.locator('.ProseMirror').first();
    await expect(editorContent).toContainText('This content should persist after page reload', { timeout: 15000 });

    // Refresh the page
    await page.reload();

    // Username should be remembered, no popup this time
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Content should still be there after refresh
    await expect(editorContent).toContainText('This content should persist after page reload', { timeout: 15000 });
    await expect(editorContent).toContainText('Important data that must not disappear');

    console.log('✅ Content persisted after page refresh');

    // Cleanup
    try {
      await fetch(`https://obsidiancomments.serverado.app/api/notes/${shareId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.log('Cleanup failed:', e);
    }
  });
});