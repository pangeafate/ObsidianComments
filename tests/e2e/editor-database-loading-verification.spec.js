/**
 * E2E Test: Verify Editor Loads Content from Database
 * 
 * This test specifically verifies that when you open a link in editing mode,
 * the content is pulled from the database and displayed in the editor.
 */

const { test, expect } = require('@playwright/test');

test.describe('Editor Database Content Loading', () => {
  test('should load content from database when opening editor link', async ({ page }) => {
    const testTitle = 'Database Loading Test';
    const testContent = `This content should be loaded from the database into the editor.

## Database Content Section

This text proves the content came from the database:
- Database item 1
- Database item 2
- Database item 3

**Important:** This content must appear in the collaborative editor, not just the view mode.

### Verification Points
1. Title should appear in header
2. Content should appear in editor
3. Editor should be functional for editing

Final test paragraph to verify complete loading.`;

    const shareId = `editor-db-test-${Date.now()}`;

    // Step 1: Create document via API (simulating Obsidian plugin)
    console.log('📝 Creating document in database...');
    const createResponse = await fetch('https://obsidiancomments.serverado.app/api/notes/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: testTitle,
        content: testContent,
        shareId: shareId
      })
    });
    
    expect(createResponse.ok).toBeTruthy();
    const createResult = await createResponse.json();
    console.log('✅ Document created with shareId:', createResult.shareId);
    
    // Step 2: Verify document exists in database
    console.log('🔍 Verifying document exists in database...');
    const verifyResponse = await fetch(`https://obsidiancomments.serverado.app/api/notes/${shareId}`);
    expect(verifyResponse.ok).toBeTruthy();
    const dbDocument = await verifyResponse.json();
    
    expect(dbDocument.title).toBe(testTitle);
    expect(dbDocument.content).toContain('This content should be loaded from the database');
    console.log('✅ Document verified in database');

    // Step 3: Open the EDITOR link (not view link)
    const editorUrl = createResult.collaborativeUrl || createResult.editUrl;
    console.log('🌐 Opening editor URL:', editorUrl);
    
    await page.goto(editorUrl);

    // Step 4: Handle username popup
    const userNameOverlay = page.locator('[data-testid="user-name-overlay"]');
    if (await userNameOverlay.isVisible({ timeout: 5000 })) {
      console.log('👤 Handling username popup...');
      await page.locator('input[placeholder="Enter your name..."]').fill('Test User');
      await page.locator('button:has-text("Continue")').click();
      await expect(userNameOverlay).toBeHidden();
      console.log('✅ Username popup handled');
    }

    // Step 5: Wait for editor to load
    console.log('⏳ Waiting for editor to load...');
    await page.waitForSelector('.ProseMirror', { timeout: 15000 });
    
    // Give time for content loading
    await page.waitForTimeout(5000);

    // Step 6: Verify title appears in header
    console.log('🔍 Checking title in header...');
    const titleElement = page.locator('h1, input[value*="Database Loading Test"], [data-testid="editable-title"]');
    await expect(titleElement.first()).toContainText(testTitle, { timeout: 10000 });
    console.log('✅ Title appears correctly');

    // Step 7: Verify content appears in editor
    console.log('🔍 Checking content in editor...');
    const editorContent = page.locator('.ProseMirror').first();
    
    // Check for key content pieces that prove database loading
    await expect(editorContent).toContainText('This content should be loaded from the database into the editor', { timeout: 15000 });
    await expect(editorContent).toContainText('Database Content Section');
    await expect(editorContent).toContainText('Database item 1');
    await expect(editorContent).toContainText('This text proves the content came from the database');
    await expect(editorContent).toContainText('Final test paragraph to verify complete loading');
    
    console.log('✅ All content loaded correctly from database');

    // Step 8: Verify editor is functional (can edit)
    console.log('🔍 Testing editor functionality...');
    await editorContent.click();
    await page.keyboard.press('End');
    await page.keyboard.type('\n\n✅ EDITOR TEST: This text was added via Playwright to verify editor functionality.');
    
    await expect(editorContent).toContainText('EDITOR TEST: This text was added via Playwright', { timeout: 5000 });
    console.log('✅ Editor is functional');

    // Step 9: Verify content persistence (reload page)
    console.log('🔄 Testing content persistence...');
    await page.reload();
    
    // Handle username popup again if needed
    if (await userNameOverlay.isVisible({ timeout: 3000 })) {
      await page.locator('input[placeholder="Enter your name..."]').fill('Test User');
      await page.locator('button:has-text("Continue")').click();
      await expect(userNameOverlay).toBeHidden();
    }
    
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    // Content should still be there after reload
    const reloadedEditor = page.locator('.ProseMirror').first();
    await expect(reloadedEditor).toContainText('This content should be loaded from the database', { timeout: 10000 });
    console.log('✅ Content persists after page reload');

    // Cleanup
    try {
      await fetch(`https://obsidiancomments.serverado.app/api/notes/${shareId}`, {
        method: 'DELETE'
      });
      console.log('🧹 Cleanup completed');
    } catch (e) {
      console.log('⚠️ Cleanup failed:', e.message);
    }
  });

  test('should show empty editor when no database content exists', async ({ page }) => {
    // Test with non-existent document
    const fakeId = `non-existent-${Date.now()}`;
    
    await page.goto(`https://obsidiancomments.serverado.app/editor/${fakeId}`);
    
    // Should show error or create new document
    // This tests the fallback behavior
    await page.waitForTimeout(3000);
    
    const pageContent = await page.textContent('body');
    const hasError = pageContent.includes('not found') || pageContent.includes('error');
    const hasEditor = await page.locator('.ProseMirror').isVisible();
    
    console.log('Non-existent document behavior:', { hasError, hasEditor });
    
    // Either should show error OR create new document with editor
    expect(hasError || hasEditor).toBeTruthy();
  });
});