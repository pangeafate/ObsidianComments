/**
 * My Links Delete Functionality TDD Test Suite
 * 
 * Testing:
 * 1. Delete button appears on each link
 * 2. Clicking delete removes link from localStorage
 * 3. Delete doesn't affect database/documents
 * 4. UI updates correctly after deletion
 * 5. Confirmation dialog (if implemented)
 * 6. Delete works with multiple links
 */

const { test, expect } = require('@playwright/test');

// Helper function to create unique document ID
function generateDocumentId() {
  return `delete-test-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Helper to clear localStorage before tests
async function clearMyLinks(page) {
  await page.goto('http://localhost:3001/editor/clear-links-test');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    localStorage.removeItem('obsidian-comments-links');
  });
}

// Helper to create test links
async function createTestLinks(page, count = 3) {
  const documentIds = [];
  const testTitles = [];
  
  for (let i = 0; i < count; i++) {
    const docId = generateDocumentId();
    const title = `Test Document ${i + 1} Title`;
    
    documentIds.push(docId);
    testTitles.push(title);
    
    console.log(`📝 Creating test link ${i + 1}: ${docId}`);
    
    await page.goto(`http://localhost:3001/editor/${docId}`);
    await page.waitForLoadState('networkidle');
    
    // Set user name (only once)
    if (i === 0) {
      const nameInput = page.locator('input[placeholder="Enter your name"]');
      if (await nameInput.isVisible()) {
        await nameInput.fill('DeleteTestUser');
        await page.locator('text=Set Name').click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Add content to create the link
    const editor = page.locator('.ProseMirror');
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill(`${title}\n\nTest content for document ${i + 1}.`);
      await page.waitForTimeout(2000); // Wait for link tracking
    }
  }
  
  return { documentIds, testTitles };
}

test.describe('My Links Delete Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear existing links before each test
    await clearMyLinks(page);
    
    // Set up error logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🚨 BROWSER ERROR:', msg.text());
      }
    });
  });

  test('should display delete button for each link', async ({ page }) => {
    console.log('🗑️ Test: Delete buttons should appear for each link');
    
    // Create test links
    const { testTitles } = await createTestLinks(page, 2);
    
    // Navigate to any document and open My Links pane
    await page.goto('http://localhost:3001/editor/view-links-test');
    await page.waitForLoadState('networkidle');
    
    // Open My Links pane
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    const myLinksPane = page.locator('[data-testid="my-links-pane"]');
    await expect(myLinksPane).toBeVisible();
    
    // Check that delete buttons exist
    const deleteButtons = myLinksPane.locator('button[title*="Delete"], button[aria-label*="Delete"], .delete-link-btn');
    const deleteButtonCount = await deleteButtons.count();
    
    console.log(`🔍 Found ${deleteButtonCount} delete buttons`);
    
    // Should have at least some delete buttons (this will initially fail - that's expected in TDD)
    expect(deleteButtonCount).toBeGreaterThan(0);
    
    // Each link should have a delete button
    expect(deleteButtonCount).toBe(2); // We created 2 test links
    
    console.log('✅ Delete buttons present for all links');
  });

  test('should remove link from localStorage when delete is clicked', async ({ page }) => {
    console.log('🗑️ Test: Clicking delete should remove link from localStorage');
    
    // Create test links
    const { documentIds, testTitles } = await createTestLinks(page, 3);
    
    // Navigate and open My Links
    await page.goto('http://localhost:3001/editor/delete-test');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    // Check initial state
    const initialLinks = await page.evaluate(() => {
      const links = localStorage.getItem('obsidian-comments-links');
      return links ? JSON.parse(links) : [];
    });
    
    console.log(`📊 Initial links count: ${initialLinks.length}`);
    expect(initialLinks.length).toBe(3);
    
    // Find and click the first delete button
    const myLinksPane = page.locator('[data-testid="my-links-pane"]');
    const firstDeleteButton = myLinksPane.locator('button[title*="Delete"], button[aria-label*="Delete"], .delete-link-btn').first();
    
    await expect(firstDeleteButton).toBeVisible();
    await firstDeleteButton.click();
    
    // Wait for deletion to process
    await page.waitForTimeout(500);
    
    // Check links after deletion
    const finalLinks = await page.evaluate(() => {
      const links = localStorage.getItem('obsidian-comments-links');
      return links ? JSON.parse(links) : [];
    });
    
    console.log(`📊 Final links count: ${finalLinks.length}`);
    
    // Should have one less link
    expect(finalLinks.length).toBe(2);
    
    console.log('✅ Link successfully removed from localStorage');
  });

  test('should update UI immediately after deletion', async ({ page }) => {
    console.log('🔄 Test: UI should update immediately when link is deleted');
    
    // Create test links
    await createTestLinks(page, 2);
    
    // Navigate and open My Links
    await page.goto('http://localhost:3001/editor/ui-update-test');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    const myLinksPane = page.locator('[data-testid="my-links-pane"]');
    
    // Count initial links in UI
    const initialLinkElements = myLinksPane.locator('.space-y-3 > div');
    const initialCount = await initialLinkElements.count();
    console.log(`🔍 Initial UI links: ${initialCount}`);
    
    // Delete one link
    const deleteButton = myLinksPane.locator('button[title*="Delete"], button[aria-label*="Delete"], .delete-link-btn').first();
    await deleteButton.click();
    await page.waitForTimeout(500);
    
    // Count links after deletion
    const finalLinkElements = myLinksPane.locator('.space-y-3 > div');
    const finalCount = await finalLinkElements.count();
    console.log(`🔍 Final UI links: ${finalCount}`);
    
    // UI should reflect the deletion
    expect(finalCount).toBe(initialCount - 1);
    
    console.log('✅ UI updates correctly after deletion');
  });

  test('should not affect database or document content', async ({ page }) => {
    console.log('🔒 Test: Delete should only affect localStorage, not database');
    
    // Create a test document with content
    const testDocId = generateDocumentId();
    const testTitle = 'Database Test Document';
    const testContent = `${testTitle}\n\nThis content should remain in database after link deletion.`;
    
    await page.goto(`http://localhost:3001/editor/${testDocId}`);
    await page.waitForLoadState('networkidle');
    
    // Set user name
    const nameInput = page.locator('input[placeholder="Enter your name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('DbTestUser');
      await page.locator('text=Set Name').click();
      await page.waitForTimeout(1000);
    }
    
    // Add content (this will save to database via auto-save)
    const editor = page.locator('.ProseMirror');
    if (await editor.isVisible()) {
      await editor.click();
      await editor.fill(testContent);
      await page.waitForTimeout(3000); // Wait for auto-save
    }
    
    // Open My Links and delete the link
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    const myLinksPane = page.locator('[data-testid="my-links-pane"]');
    const deleteButton = myLinksPane.locator('button[title*="Delete"], button[aria-label*="Delete"], .delete-link-btn').first();
    
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForTimeout(500);
    }
    
    // Navigate away and back to the same document
    await page.goto('http://localhost:3001/editor/temp-doc');
    await page.waitForTimeout(1000);
    await page.goto(`http://localhost:3001/editor/${testDocId}`);
    await page.waitForLoadState('networkidle');
    
    // Check if document content is still there
    await page.waitForTimeout(2000);
    const editorContent = await editor.textContent();
    
    console.log(`📄 Document content after link deletion: "${editorContent.substring(0, 50)}..."`);
    
    // Document content should still exist
    expect(editorContent).toContain(testTitle);
    
    // But the link should be gone from localStorage
    const remainingLinks = await page.evaluate((docId) => {
      const links = localStorage.getItem('obsidian-comments-links');
      const parsedLinks = links ? JSON.parse(links) : [];
      return parsedLinks.find(link => link.id === docId);
    }, testDocId);
    
    expect(remainingLinks).toBeFalsy();
    
    console.log('✅ Document content preserved, only link removed from localStorage');
  });

  test('should handle deleting all links gracefully', async ({ page }) => {
    console.log('🧹 Test: Should handle deleting all links without errors');
    
    // Create test links
    await createTestLinks(page, 2);
    
    // Navigate and open My Links
    await page.goto('http://localhost:3001/editor/delete-all-test');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    const myLinksPane = page.locator('[data-testid="my-links-pane"]');
    
    // Delete all links one by one
    let deleteButton = myLinksPane.locator('button[title*="Delete"], button[aria-label*="Delete"], .delete-link-btn').first();
    
    while (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForTimeout(500);
      deleteButton = myLinksPane.locator('button[title*="Delete"], button[aria-label*="Delete"], .delete-link-btn').first();
    }
    
    // Should show empty state
    const emptyMessage = myLinksPane.locator('text="No links yet"');
    await expect(emptyMessage).toBeVisible();
    
    // localStorage should be empty or have empty array
    const finalLinks = await page.evaluate(() => {
      const links = localStorage.getItem('obsidian-comments-links');
      return links ? JSON.parse(links) : [];
    });
    
    expect(finalLinks.length).toBe(0);
    
    console.log('✅ All links deleted gracefully, empty state shown');
  });

  test('should work with keyboard navigation and accessibility', async ({ page }) => {
    console.log('♿ Test: Delete buttons should be accessible via keyboard');
    
    // Create test links
    await createTestLinks(page, 2);
    
    // Navigate and open My Links
    await page.goto('http://localhost:3001/editor/accessibility-test');
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("My Links")').click();
    await page.waitForTimeout(1000);
    
    const myLinksPane = page.locator('[data-testid="my-links-pane"]');
    const firstDeleteButton = myLinksPane.locator('button[title*="Delete"], button[aria-label*="Delete"], .delete-link-btn').first();
    
    // Check accessibility attributes
    const hasAriaLabel = await firstDeleteButton.getAttribute('aria-label');
    const hasTitle = await firstDeleteButton.getAttribute('title');
    
    console.log(`🔍 Accessibility: aria-label="${hasAriaLabel}", title="${hasTitle}"`);
    
    // Should have proper accessibility attributes
    expect(hasAriaLabel || hasTitle).toBeTruthy();
    
    // Test keyboard navigation (Tab to focus, Enter to activate)
    await firstDeleteButton.focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // Check if deletion worked via keyboard
    const linksAfterKeyboard = await page.evaluate(() => {
      const links = localStorage.getItem('obsidian-comments-links');
      return links ? JSON.parse(links) : [];
    });
    
    expect(linksAfterKeyboard.length).toBe(1);
    
    console.log('✅ Delete buttons are keyboard accessible');
  });
});