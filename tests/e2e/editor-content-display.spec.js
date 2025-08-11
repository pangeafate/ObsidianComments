/**
 * E2E Test: Editor Content Display Issue
 * 
 * FAILING TEST: "Why when I share the note it is not displayed in the editor, 
 * while it is being displayed in the HTML view?"
 * 
 * This test should FAIL initially, demonstrating the actual problem.
 */

const { test, expect } = require('@playwright/test');

test.describe('Editor Content Display Issue', () => {
  test('should display shared note content in collaborative editor', async ({ page }) => {
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

    // Share note via API (like the plugin does)
    const shareResponse = await fetch('https://obsidiancomments.serverado.app/api/notes/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: testTitle,
        content: testContent,
        shareId: `playwright-test-${Date.now()}`
      })
    });

    expect(shareResponse.ok).toBeTruthy();
    const shareResult = await shareResponse.json();
    
    console.log('Share result:', shareResult);
    expect(shareResult.shareId).toBeDefined();
    expect(shareResult.collaborativeUrl || shareResult.editUrl).toBeDefined();

    // Step 2: Navigate to HTML view first (this should work)
    const viewUrl = shareResult.viewUrl;
    await page.goto(viewUrl);
    
    // Verify HTML view displays content correctly
    await expect(page.locator('h1')).toContainText('Test Note from Plugin');
    await expect(page.locator('body')).toContainText('This is a test note shared from Obsidian plugin');
    await expect(page.locator('body')).toContainText('Some content here');
    
    console.log('✅ HTML view displays content correctly');

    // Step 3: Navigate to collaborative editor (THIS SHOULD FAIL)
    const editorUrl = shareResult.collaborativeUrl || shareResult.editUrl;
    console.log('Navigating to editor:', editorUrl);
    
    await page.goto(editorUrl);
    
    // Wait for editor to load
    await page.waitForSelector('[data-testid="tiptap-editor"], .ProseMirror', { timeout: 10000 });
    
    // THE FAILING ASSERTION: Content should be visible in editor but isn't
    const editorContent = await page.locator('.ProseMirror, [data-testid="tiptap-editor"]').first();
    
    // Check if content is visible in the editor
    await expect(editorContent).toContainText('This is a test note shared from Obsidian plugin', { timeout: 15000 });
    await expect(editorContent).toContainText('Some content here');
    await expect(editorContent).toContainText('Numbered list item 1');
    
    // Check for title in editor (should be in content, not just header)
    await expect(editorContent).toContainText('Test Note from Plugin');
    
    console.log('✅ Editor displays content correctly');
    
    // Step 4: Verify editor is actually functional (can edit)
    await editorContent.click();
    await page.keyboard.press('End');
    await page.keyboard.type('\n\nAdded via Playwright test');
    
    // Content should be editable
    await expect(editorContent).toContainText('Added via Playwright test');
    
    // Cleanup: Delete the test note
    try {
      await fetch(`https://obsidiancomments.serverado.app/api/notes/${shareResult.shareId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.log('Cleanup failed:', e);
    }
  });

  test('should load existing shared note content in editor on page refresh', async ({ page }) => {
    // Create a note first
    const testContent = `# Persistence Test

This content should persist after page reload.

Important data that must not disappear.`;

    const shareResponse = await fetch('https://obsidiancomments.serverado.app/api/notes/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Persistence Test',
        content: testContent,
        shareId: `playwright-persist-${Date.now()}`
      })
    });

    const shareResult = await shareResponse.json();
    const editorUrl = shareResult.collaborativeUrl || shareResult.editUrl;

    // Navigate to editor
    await page.goto(editorUrl);
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });

    // Verify initial content load
    const editorContent = page.locator('.ProseMirror').first();
    await expect(editorContent).toContainText('This content should persist after page reload', { timeout: 15000 });

    // Refresh the page
    await page.reload();
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });

    // Content should still be there after refresh
    await expect(editorContent).toContainText('This content should persist after page reload', { timeout: 15000 });
    await expect(editorContent).toContainText('Important data that must not disappear');

    // Cleanup
    try {
      await fetch(`https://obsidiancomments.serverado.app/api/notes/${shareResult.shareId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.log('Cleanup failed:', e);
    }
  });

  test('should show clear error message when editor fails to load content', async ({ page }) => {
    // Navigate to editor with invalid document ID
    await page.goto('https://obsidiancomments.serverado.app/editor/invalid-document-id');
    
    // Should show error message, not blank editor
    await expect(page.locator('body')).toContainText(/error|not found|failed to load/i, { timeout: 10000 });
    
    // Should NOT show blank editor
    const editorElement = page.locator('.ProseMirror');
    const editorExists = await editorElement.count() > 0;
    
    if (editorExists) {
      // If editor exists, it should show error content, not be empty
      const editorContent = await editorElement.textContent();
      expect(editorContent.trim().length).toBeGreaterThan(0);
    }
  });

  test('should handle plugin-created documents differently from user-created ones', async ({ page }) => {
    // Create a document with obsidian- prefix (like plugin does)
    const pluginContent = `# Plugin Created Note

This note was created by the Obsidian plugin.

It should not have duplicate titles.`;

    const shareResponse = await fetch('https://obsidiancomments.serverado.app/api/notes/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Plugin Created Note',
        content: pluginContent,
        shareId: `obsidian-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })
    });

    const shareResult = await shareResponse.json();
    const editorUrl = shareResult.collaborativeUrl || shareResult.editUrl;

    await page.goto(editorUrl);
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });

    const editorContent = page.locator('.ProseMirror').first();
    
    // Should display the plugin content exactly as provided
    await expect(editorContent).toContainText('This note was created by the Obsidian plugin', { timeout: 15000 });
    
    // Should not have duplicate titles
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeLessThanOrEqual(2); // One in header, one in content max

    // Cleanup
    try {
      await fetch(`https://obsidiancomments.serverado.app/api/notes/${shareResult.shareId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.log('Cleanup failed:', e);
    }
  });
});