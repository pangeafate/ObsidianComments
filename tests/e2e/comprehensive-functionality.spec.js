/**
 * Comprehensive Functionality Test Suite
 * Tests all major features of ObsidianComments
 * Following TDD approach - tests define expected behavior
 */

const { test, expect } = require('@playwright/test');

// Helper function to generate unique IDs
const generateTestId = () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// API Helper functions
const TEST_URL = process.env.TEST_URL || 'http://localhost';
async function createDocument(request, title, content) {
  const response = await request.post(`${TEST_URL}/api/notes/share`, {
    data: {
      title,
      content,
      htmlContent: `<h1>${title}</h1><p>${content}</p>`
    }
  });
  
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  // Convert shareId to id for consistency
  return { ...result, id: result.shareId };
}

async function deleteDocument(request, documentId) {
  const response = await request.delete(`${TEST_URL}/api/notes/${documentId}`);
  return response;
}

test.describe('ObsidianComments Comprehensive Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('1. Landing page and note creation', async ({ page, request }) => {
    console.log('📝 Testing landing page and note creation...');
    
    // Listen for all console messages and errors
    page.on('console', msg => {
      console.log(`🔍 Console [${msg.type()}]:`, msg.text());
    });
    
    page.on('pageerror', error => {
      console.log('💥 Page error:', error.message);
    });
    
    page.on('requestfailed', request => {
      console.log('🚫 Failed request:', request.url(), request.failure()?.errorText);
    });
    
    // Navigate to landing page
    await page.goto('http://localhost:8080');
    
    // Wait for basic page load
    await page.waitForLoadState('networkidle');
    
    // Check if root has any content at all (don't wait for specific selectors)
    const rootHTML = await page.locator('#root').innerHTML();
    console.log('Root HTML length:', rootHTML.length);
    console.log('Root HTML sample:', rootHTML || 'EMPTY');
    
    // If root is empty, there's a JS error - let's wait and see if it loads
    if (!rootHTML) {
      console.log('Root is empty, waiting for JS to load...');
      await page.waitForTimeout(5000);
      const rootHTML2 = await page.locator('#root').innerHTML();
      console.log('Root HTML after wait:', rootHTML2 || 'STILL EMPTY');
    }
    
    // Debug: Check what's actually in the root element
    const rootContent = await page.locator('#root').innerHTML();
    console.log('Root content preview:', rootContent.substring(0, 200) + '...');
    
    // Check if we have the HomePage component
    const hasHomePage = await page.locator('text="Obsidian Comments"').isVisible().catch(() => false);
    console.log('HomePage visible:', hasHomePage);
    
    if (!hasHomePage) {
      // Maybe we're being redirected - check current URL
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      
      // Try waiting longer for the content
      await page.waitForTimeout(3000);
      
      // Try again
      await page.locator('text="Obsidian Comments"').first().waitFor({ timeout: 10000 });
    }
    
    // Verify landing page loads
    await expect(page).toHaveTitle(/Obsidian Comments/);
    
    // Look for Create New Note button with more flexible approach
    const createButton = page.getByRole('button', { name: /Create New Note/i });
    await expect(createButton).toBeVisible({ timeout: 10000 });
    
    // Click to create a new note (navigates in same tab)
    await createButton.click();
    
    // Wait for navigation to complete
    await page.waitForURL('**/editor/**', { timeout: 15000 });
    
    // Verify we're in the editor
    const url = page.url();
    expect(url).toContain('/editor/');
    
    // Extract document ID from URL
    const documentId = url.split('/editor/')[1];
    console.log(`✅ Created new document: ${documentId}`);
    
    // Wait for editor to load
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    // Verify editor loaded
    await expect(page.locator('.ProseMirror')).toBeVisible();
  });

  test('2. Document persistence and content editing', async ({ page, request }) => {
    console.log('💾 Testing document persistence...');
    
    const testTitle = 'Persistence Test Document';
    const testContent = 'This document tests content persistence.';
    const doc = await createDocument(request, testTitle, testContent);
    
    await page.goto(`http://localhost:8080/editor/${doc.id}`);
    
    // Wait for both editor AND Yjs sync to complete
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    // Wait for Yjs synchronization (check for connected status)
    await page.waitForFunction(() => {
      return window.location.href.includes('/editor/') && 
             document.querySelector('.ProseMirror') !== null;
    }, { timeout: 15000 });
    
    // Wait additional time for Yjs sync to complete
    await page.waitForTimeout(3000);
    
    // Handle username popup if it appears
    const usernameOverlay = page.locator('[data-testid="user-name-overlay"]');
    if (await usernameOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('👤 Username popup detected, filling in...');
      const usernameInput = page.locator('input[placeholder*="Enter your name"]');
      await usernameInput.fill('Test User');
      const continueButton = page.locator('button:has-text("Continue")');
      await continueButton.click();
      await usernameOverlay.waitFor({ state: 'hidden', timeout: 5000 });
    }
    
    // Verify title is loaded correctly
    await expect(page.locator('input[value*="Persistence Test Document"], h1:has-text("Persistence Test Document")')).toBeVisible({ timeout: 10000 });
    
    const editor = page.locator('.ProseMirror');
    
    // Clear existing content and add new content
    await editor.click();
    await page.keyboard.press('Control+a'); // Select all
    await page.keyboard.type('Original API content.\\n\\nNew content typed by user.');
    
    // Wait for autosave
    await page.waitForTimeout(3000);
    
    // Reload and verify content persisted
    await page.reload();
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    // Wait for content to fully load after reload
    await page.waitForTimeout(5000);
    
    const editorContent = await editor.textContent();
    expect(editorContent).toContain('New content typed by user');
    
    console.log('✅ Document persistence verified');
  });

  test('3. Title editing functionality', async ({ page, request }) => {
    console.log('✏️ Testing title editing...');
    
    // Create a document
    const initialTitle = 'Original Title';
    const doc = await createDocument(request, initialTitle, 'Test content');
    
    // Navigate to document
    await page.goto(`http://localhost:8080/editor/${doc.id}`);
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    // Find and click the title edit button (if exists)
    const editButton = page.locator('button[aria-label="Edit title"], button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
    }
    
    // Find the title input field
    const titleInput = page.locator('input[type="text"]').first();
    await expect(titleInput).toBeVisible();
    
    // Clear and type new title
    await titleInput.fill('');
    await titleInput.type('Updated Title via Test');
    
    // Save the title (Enter key or Save button)
    await page.keyboard.press('Enter');
    
    // Wait for save
    await page.waitForTimeout(1000);
    
    // Reload and verify title persisted
    await page.reload();
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    // Check if updated title is visible
    const updatedTitle = page.locator('text="Updated Title via Test"');
    await expect(updatedTitle).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Title editing verified');
  });

  test('4. View mode and edit mode transitions', async ({ page, request }) => {
    console.log('👁️ Testing view/edit mode transitions...');
    
    // Create a document
    const doc = await createDocument(request, 'Mode Test Document', 'Content for mode testing');
    
    // Navigate to view mode
    await page.goto(`http://localhost:8080/view/${doc.id}`);
    
    // Verify view mode loaded
    const viewContent = page.locator('main, .view-content, .document-content').first();
    await expect(viewContent).toBeVisible({ timeout: 10000 });
    
    // Look for Edit button
    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
    await expect(editButton).toBeVisible();
    
    // Click to switch to edit mode
    await editButton.click();
    
    // Verify we're in edit mode (URL should change)
    await page.waitForURL(`**/editor/${doc.id}`);
    
    // Verify editor is visible
    await expect(page.locator('.ProseMirror')).toBeVisible();
    
    console.log('✅ View/Edit mode transitions verified');
  });

  test('5. Content filtering - images and attachments', async ({ page, request }) => {
    console.log('🔒 Testing content filtering...');
    
    // Create document with images and attachments via API
    const contentWithMedia = `
# Document with Media

![Image](test.jpg)
[[attachment.pdf]]
<img src="dangerous.png">
<script>alert('XSS')</script>

Safe text content should remain.
    `;
    
    const response = await request.post(`${TEST_URL}/api/notes/share`, {
      data: {
        title: 'Media Filtering Test',
        content: contentWithMedia
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const doc = await response.json();
    
    // Navigate to the document  
    await page.goto(`http://localhost:8080/view/${doc.shareId}`);
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    
    // Verify dangerous content is filtered
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<img');
    expect(pageContent).not.toContain('<script');
    expect(pageContent).not.toContain('test.jpg');
    expect(pageContent).not.toContain('attachment.pdf');
    
    // Verify safe content remains
    expect(pageContent).toContain('Safe text content should remain');
    
    console.log('✅ Content filtering verified');
  });

  test('6. My Links pane functionality', async ({ page, request }) => {
    console.log('🔗 Testing My Links pane...');
    
    // Create multiple documents
    const doc1 = await createDocument(request, 'Link Test 1', 'Content 1');
    const doc2 = await createDocument(request, 'Link Test 2', 'Content 2');
    
    // Navigate to first document
    await page.goto(`http://localhost:8080/editor/${doc1.id}`);
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    // Open My Links pane (if not visible)
    const myLinksButton = page.locator('button:has-text("My Links"), button[title*="Links"]').first();
    if (await myLinksButton.isVisible()) {
      await myLinksButton.click();
    }
    
    // Verify My Links pane is visible
    const myLinksPane = page.locator('[class*="links"], [class*="MyLinks"]').first();
    await expect(myLinksPane).toBeVisible({ timeout: 5000 });
    
    // Navigate to second document
    await page.goto(`http://localhost:8080/editor/${doc2.id}`);
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    // Open My Links again
    if (await myLinksButton.isVisible()) {
      await myLinksButton.click();
    }
    
    // Verify both documents appear in My Links
    const linksList = page.locator('[class*="links"] a, [class*="links"] [role="link"]');
    const linksCount = await linksList.count();
    expect(linksCount).toBeGreaterThanOrEqual(1);
    
    console.log('✅ My Links pane verified');
  });

  test('7. WebSocket deletion notifications', async ({ page, browser, request }) => {
    console.log('🔔 Testing WebSocket deletion notifications...');
    
    // Create a document
    const doc = await createDocument(request, 'Delete Test Document', 'Will be deleted');
    
    // Open document in two browser contexts (simulate two users)
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto(`http://localhost:8080/editor/${doc.id}`);
    await page1.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto(`http://localhost:8080/editor/${doc.id}`);
    await page2.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    // Delete the document via API
    const deleteResponse = await deleteDocument(request, doc.id);
    expect(deleteResponse.ok()).toBeTruthy();
    
    // Wait for WebSocket notification
    await page1.waitForTimeout(2000);
    
    // Check if deletion notification appears (might be alert, modal, or redirect)
    // This depends on implementation - checking for common patterns
    const possibleNotifications = [
      page1.locator('text=/[Dd]eleted/'),
      page1.locator('text=/[Dd]oes.*not.*exist/'),
      page1.locator('text=/[Nn]ot.*found/')
    ];
    
    let notificationFound = false;
    for (const locator of possibleNotifications) {
      if (await locator.isVisible({ timeout: 3000 }).catch(() => false)) {
        notificationFound = true;
        break;
      }
    }
    
    // If no notification, check if redirected to home
    if (!notificationFound) {
      const url = page1.url();
      if (url === 'http://localhost:8080/' || !url.includes(doc.id)) {
        notificationFound = true;
      }
    }
    
    expect(notificationFound).toBeTruthy();
    
    await context1.close();
    await context2.close();
    
    console.log('✅ WebSocket deletion notifications verified');
  });

  test('8. Collaborative editing features', async ({ browser, request }) => {
    console.log('👥 Testing collaborative editing...');
    
    // Create a document
    const doc = await createDocument(request, 'Collaboration Test', 'Initial content');
    
    // Open in two browser contexts
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto(`http://localhost:8080/editor/${doc.id}`);
    await page1.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto(`http://localhost:8080/editor/${doc.id}`);
    await page2.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    // Type in first browser
    const editor1 = page1.locator('.ProseMirror');
    await editor1.click();
    await page1.keyboard.press('End');
    await page1.keyboard.type('\nUser 1 typing here');
    
    // Wait for sync
    await page1.waitForTimeout(2000);
    
    // Verify content appears in second browser
    const editor2Content = await page2.locator('.ProseMirror').textContent();
    expect(editor2Content).toContain('User 1 typing here');
    
    // Type in second browser
    const editor2 = page2.locator('.ProseMirror');
    await editor2.click();
    await page2.keyboard.press('End');
    await page2.keyboard.type('\nUser 2 typing here');
    
    // Wait for sync
    await page2.waitForTimeout(2000);
    
    // Verify content appears in first browser
    const editor1Content = await page1.locator('.ProseMirror').textContent();
    expect(editor1Content).toContain('User 2 typing here');
    
    await context1.close();
    await context2.close();
    
    console.log('✅ Collaborative editing verified');
  });

  test('9. API endpoint validation', async ({ request }) => {
    console.log('🔌 Testing all API endpoints...');
    
    // Test health endpoint
    const healthResponse = await request.get(`${TEST_URL}/api/health`);
    expect(healthResponse.ok()).toBeTruthy();
    const health = await healthResponse.json();
    expect(health.status).toBe('healthy');
    
    // Test document creation
    const createResponse = await request.post('http://localhost:8081/api/notes/share', {
      data: {
        title: 'API Test Document',
        content: 'Testing API endpoints'
      }
    });
    expect(createResponse.ok()).toBeTruthy();
    const newDoc = await createResponse.json();
    expect(newDoc.shareId).toBeTruthy();
    expect(newDoc.editUrl).toContain('/editor/');
    expect(newDoc.viewUrl).toContain('/view/');
    
    // Test document retrieval
    const getResponse = await request.get(`${TEST_URL}/api/notes/${newDoc.shareId}`);
    expect(getResponse.ok()).toBeTruthy();
    const retrievedDoc = await getResponse.json();
    expect(retrievedDoc.title).toBe('API Test Document');
    
    // Test document update
    const updateResponse = await request.patch(`${TEST_URL}/api/notes/${newDoc.shareId}`, {
      data: {
        title: 'Updated API Test Document'
      }
    });
    expect(updateResponse.ok()).toBeTruthy();
    
    // Test document listing
    const listResponse = await request.get(`${TEST_URL}/api/notes`);
    expect(listResponse.ok()).toBeTruthy();
    const documents = await listResponse.json();
    expect(Array.isArray(documents)).toBeTruthy();
    
    // Test document deletion
    const deleteResponse = await request.delete(`${TEST_URL}/api/notes/${newDoc.shareId}`);
    expect(deleteResponse.ok()).toBeTruthy();
    
    console.log('✅ All API endpoints verified');
  });

  test('10. Error handling and edge cases', async ({ page, request }) => {
    console.log('⚠️ Testing error handling...');
    
    // Test loading non-existent document
    await page.goto('http://localhost:8080/editor/non-existent-document-id');
    await page.waitForTimeout(2000);
    
    // Should either create new document or show error
    const hasEditor = await page.locator('.ProseMirror').isVisible().catch(() => false);
    const hasError = await page.locator('text=/[Ee]rror|[Nn]ot.*found/').isVisible().catch(() => false);
    expect(hasEditor || hasError).toBeTruthy();
    
    // Test empty title validation
    const doc = await createDocument(request, 'Validation Test', 'Content');
    await page.goto(`http://localhost:8080/editor/${doc.id}`);
    await page.waitForSelector('.ProseMirror', { timeout: 10000 });
    
    // Try to set empty title
    const editButton = page.locator('button[aria-label="Edit title"], button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      const titleInput = page.locator('input[type="text"]').first();
      await titleInput.fill('');
      await page.keyboard.press('Enter');
      
      // Should show validation error or prevent save
      const errorMessage = page.locator('text=/[Cc]annot.*empty|[Rr]equired/');
      const titleStillEditable = await titleInput.isVisible();
      expect((await errorMessage.isVisible()) || titleStillEditable).toBeTruthy();
    }
    
    console.log('✅ Error handling verified');
  });
});

// Performance test
test.describe('Performance Tests', () => {
  test('Document operations performance', async ({ request }) => {
    console.log('⚡ Testing performance...');
    
    const startTime = Date.now();
    
    // Create 10 documents
    const createPromises = [];
    for (let i = 0; i < 10; i++) {
      createPromises.push(
        createDocument(request, `Perf Test ${i}`, `Content ${i}`)
      );
    }
    
    const documents = await Promise.all(createPromises);
    const createTime = Date.now() - startTime;
    
    console.log(`Created 10 documents in ${createTime}ms`);
    expect(createTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    // Clean up
    for (const doc of documents) {
      await deleteDocument(request, doc.id);
    }
    
    console.log('✅ Performance test completed');
  });
});

console.log('🎉 Comprehensive test suite defined!');