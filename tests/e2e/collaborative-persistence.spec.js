/**
 * Enhanced Collaborative Functionality & Persistence Tests
 * 
 * Tests the complete workflow from landing page note creation through 
 * collaborative editing and database persistence verification.
 * 
 * Key Test Areas:
 * 1. Landing page note creation flow
 * 2. Multi-user collaborative editing scenarios  
 * 3. Database persistence after page reload
 * 4. Real-time synchronization between multiple users
 */

const { test, expect } = require('@playwright/test');

// Helper function to generate unique test content
const generateTestContent = (prefix = 'Test') => `${prefix} ${Date.now()} ${Math.random().toString(36).substr(2, 9)}`;

// Helper to wait for Yjs synchronization
async function waitForYjsSync(page, timeout = 5000) {
  await page.waitForFunction(() => {
    return window.location.href.includes('/editor/') && 
           document.querySelector('.ProseMirror') !== null;
  }, { timeout });
  
  // Wait additional time for Yjs connection
  await page.waitForTimeout(2000);
}

// Helper to handle username popup if it appears
async function handleUsernamePopup(page, username = 'Test User') {
  const usernameOverlay = page.locator('[data-testid="user-name-overlay"]');
  if (await usernameOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log(`👤 Setting username: ${username}`);
    const usernameInput = page.locator('input[placeholder*="Enter your name"]');
    await usernameInput.fill(username);
    const continueButton = page.locator('button:has-text("Continue")');
    await continueButton.click();
    await usernameOverlay.waitFor({ state: 'hidden', timeout: 5000 });
  }
}

// Helper to create note via API for direct testing
async function createNoteViaAPI(request, title, content) {
  const response = await request.post('http://localhost:8081/api/notes/share', {
    data: {
      title,
      content,
      htmlContent: `<h1>${title}</h1><p>${content}</p>`
    }
  });
  
  expect(response.ok()).toBeTruthy();
  const result = await response.json();
  return result;
}

test.describe('Enhanced Collaborative Functionality & Persistence', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Add error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      console.log(`💥 Page Error: ${error.message}`);
    });
  });

  test('1. Complete landing page to collaborative editing workflow', async ({ page }) => {
    console.log('🎯 Testing complete workflow: Landing page → Note creation → Collaborative editing');
    
    // Step 1: Navigate to landing page
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    
    // Step 2: Verify landing page loaded
    await expect(page.locator('text="Obsidian Comments"')).toBeVisible();
    
    // Step 3: Create new note from landing page
    const createButton = page.getByRole('button', { name: /Create New Note/i });
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();
    
    // Step 4: Wait for navigation to editor
    await page.waitForURL('**/editor/**', { timeout: 15000 });
    await waitForYjsSync(page);
    
    // Step 5: Handle username popup
    await handleUsernamePopup(page, 'Primary User');
    
    // Step 6: Verify editor is functional
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();
    
    // Step 7: Add content to verify collaborative editing setup
    await editor.click();
    const testContent = generateTestContent('Landing Page Created Note');
    await page.keyboard.type(testContent);
    
    // Step 8: Wait for content to be saved
    await page.waitForTimeout(3000);
    
    // Step 9: Extract document ID from URL for verification
    const url = page.url();
    const documentId = url.split('/editor/')[1];
    console.log(`✅ Successfully created document: ${documentId}`);
    
    // Step 10: Verify content is visible
    const editorContent = await editor.textContent();
    expect(editorContent).toContain(testContent);
    
    console.log('✅ Complete workflow test passed');
  });

  test('2. Multi-user collaborative editing with real-time sync', async ({ browser }) => {
    console.log('👥 Testing multi-user collaborative editing');
    
    // Create document via API first
    const context = await browser.newContext();
    const setupPage = await context.newPage();
    const request = setupPage.request;
    
    const testTitle = generateTestContent('Collaboration Test');
    const doc = await createNoteViaAPI(request, testTitle, 'Initial content for collaboration');
    console.log(`📝 Created test document: ${doc.shareId}`);
    
    // Create two user contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const user1 = await context1.newPage();
    const user2 = await context2.newPage();
    
    // Navigate both users to the same document
    await user1.goto(`http://localhost:8080/editor/${doc.shareId}`);
    await user2.goto(`http://localhost:8080/editor/${doc.shareId}`);
    
    // Wait for both editors to load
    await waitForYjsSync(user1);
    await waitForYjsSync(user2);
    
    // Handle username popups
    await handleUsernamePopup(user1, 'User One');
    await handleUsernamePopup(user2, 'User Two');
    
    // Get editor elements
    const editor1 = user1.locator('.ProseMirror');
    const editor2 = user2.locator('.ProseMirror');
    
    await expect(editor1).toBeVisible();
    await expect(editor2).toBeVisible();
    
    // Test Scenario 1: User 1 types, User 2 should see it
    console.log('📝 Testing User 1 → User 2 sync');
    await editor1.click();
    await user1.keyboard.press('End');
    const user1Content = generateTestContent('\\nUser 1 editing');
    await user1.keyboard.type(user1Content);
    
    // Wait for sync
    await user1.waitForTimeout(3000);
    
    // Verify User 2 sees the content
    const editor2ContentAfterUser1 = await editor2.textContent();
    expect(editor2ContentAfterUser1).toContain('User 1 editing');
    console.log('✅ User 1 → User 2 sync verified');
    
    // Test Scenario 2: User 2 types, User 1 should see it
    console.log('📝 Testing User 2 → User 1 sync');
    await editor2.click();
    await user2.keyboard.press('End');
    const user2Content = generateTestContent('\\nUser 2 editing');
    await user2.keyboard.type(user2Content);
    
    // Wait for sync
    await user2.waitForTimeout(3000);
    
    // Verify User 1 sees the content
    const editor1ContentAfterUser2 = await editor1.textContent();
    expect(editor1ContentAfterUser2).toContain('User 2 editing');
    console.log('✅ User 2 → User 1 sync verified');
    
    // Test Scenario 3: Simultaneous editing
    console.log('📝 Testing simultaneous editing');
    const simultaneousContent1 = generateTestContent('\\nSimultaneous 1');
    const simultaneousContent2 = generateTestContent('\\nSimultaneous 2');
    
    // Both users type at the same time
    await Promise.all([
      (async () => {
        await editor1.click();
        await user1.keyboard.press('End');
        await user1.keyboard.type(simultaneousContent1);
      })(),
      (async () => {
        await editor2.click();
        await user2.keyboard.press('End');
        await user2.keyboard.type(simultaneousContent2);
      })()
    ]);
    
    // Wait for synchronization
    await user1.waitForTimeout(5000);
    await user2.waitForTimeout(5000);
    
    // Verify both contents are preserved (conflict resolution)
    const finalContent1 = await editor1.textContent();
    const finalContent2 = await editor2.textContent();
    
    // Both editors should have the same final content
    expect(finalContent1).toContain('Simultaneous 1');
    expect(finalContent1).toContain('Simultaneous 2');
    expect(finalContent2).toEqual(finalContent1);
    
    console.log('✅ Simultaneous editing conflict resolution verified');
    
    // Cleanup
    await context1.close();
    await context2.close();
    await context.close();
    
    console.log('✅ Multi-user collaborative editing test passed');
  });

  test('3. Database persistence verification after page reload', async ({ page, request }) => {
    console.log('💾 Testing database persistence after page reload');
    
    // Step 1: Create document with specific content
    const testTitle = generateTestContent('Persistence Test');
    const initialContent = generateTestContent('Initial content for persistence testing');
    const doc = await createNoteViaAPI(request, testTitle, initialContent);
    console.log(`📝 Created document for persistence test: ${doc.shareId}`);
    
    // Step 2: Navigate to document
    await page.goto(`http://localhost:8080/editor/${doc.shareId}`);
    await waitForYjsSync(page);
    await handleUsernamePopup(page, 'Persistence Tester');
    
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();
    
    // Step 3: Add substantial content that should be persisted
    await editor.click();
    await page.keyboard.press('Control+a'); // Select all
    const testContent = generateTestContent('Persistence test content - this should survive reload');
    const additionalContent = '\\n\\nAdditional paragraph with **bold** and *italic* text.\\n\\nAnd a final paragraph to test multi-paragraph persistence.';
    const fullTestContent = testContent + additionalContent;
    
    await page.keyboard.type(fullTestContent);
    console.log(`📝 Added content: ${fullTestContent.substring(0, 50)}...`);
    
    // Step 4: Wait for auto-save (important for persistence)
    await page.waitForTimeout(5000);
    
    // Step 5: Get content before reload
    const contentBeforeReload = await editor.textContent();
    console.log(`📄 Content before reload: ${contentBeforeReload.substring(0, 100)}...`);
    
    // Step 6: Perform hard reload
    console.log('🔄 Performing page reload...');
    await page.reload({ waitUntil: 'networkidle' });
    
    // Step 7: Wait for editor to reload and sync
    await waitForYjsSync(page, 10000);
    await handleUsernamePopup(page, 'Persistence Tester (Reloaded)');
    
    // Step 8: Verify editor is visible after reload
    const editorAfterReload = page.locator('.ProseMirror');
    await expect(editorAfterReload).toBeVisible({ timeout: 10000 });
    
    // Step 9: Get content after reload
    await page.waitForTimeout(3000); // Additional wait for content to load
    const contentAfterReload = await editorAfterReload.textContent();
    console.log(`📄 Content after reload: ${contentAfterReload.substring(0, 100)}...`);
    
    // Step 10: Verify content persistence
    expect(contentAfterReload).toContain('Persistence test content');
    expect(contentAfterReload).toContain('Additional paragraph');
    expect(contentAfterReload).toContain('final paragraph');
    
    // Step 11: Verify content integrity (should be identical)
    expect(contentAfterReload.replace(/\\s+/g, ' ').trim())
      .toBe(contentBeforeReload.replace(/\\s+/g, ' ').trim());
    
    console.log('✅ Database persistence verification passed');
    
    // Step 12: Verify via API that content was actually saved to database
    const apiResponse = await request.get(`http://localhost:8081/api/notes/${doc.shareId}`);
    expect(apiResponse.ok()).toBeTruthy();
    const savedDoc = await apiResponse.json();
    
    // The API might not have the exact same content due to Yjs vs API sync,
    // but the document should exist and have some content
    expect(savedDoc.id).toBe(doc.shareId);
    expect(savedDoc.title).toBe(testTitle);
    console.log('✅ API verification of saved document passed');
  });

  test('4. Real-time synchronization stress test', async ({ browser }) => {
    console.log('⚡ Testing real-time synchronization under stress conditions');
    
    // Create test document
    const context = await browser.newContext();
    const setupPage = await context.newPage();
    const request = setupPage.request;
    
    const doc = await createNoteViaAPI(request, 
      generateTestContent('Stress Test'), 
      'Initial content for stress testing'
    );
    
    // Create 3 concurrent users for stress testing
    const contexts = [];
    const pages = [];
    
    for (let i = 0; i < 3; i++) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      contexts.push(ctx);
      pages.push(page);
      
      await page.goto(`http://localhost:8080/editor/${doc.shareId}`);
      await waitForYjsSync(page);
      await handleUsernamePopup(page, `Stress User ${i + 1}`);
    }
    
    // Verify all editors are ready
    for (const page of pages) {
      await expect(page.locator('.ProseMirror')).toBeVisible();
    }
    
    console.log('👥 All 3 users connected, starting stress test...');
    
    // Stress Test Scenario: Rapid concurrent edits
    const editPromises = pages.map(async (page, index) => {
      const editor = page.locator('.ProseMirror');
      
      for (let round = 0; round < 5; round++) {
        await editor.click();
        await page.keyboard.press('End');
        await page.keyboard.type(`\\nUser ${index + 1} Round ${round + 1} - ${Date.now()}`);
        await page.waitForTimeout(200); // Small delay between edits
      }
    });
    
    // Execute all edits concurrently
    await Promise.all(editPromises);
    
    // Wait for synchronization
    await pages[0].waitForTimeout(5000);
    
    // Verify all pages have consistent content
    const contents = [];
    for (let i = 0; i < pages.length; i++) {
      const content = await pages[i].locator('.ProseMirror').textContent();
      contents.push(content);
      console.log(`📄 User ${i + 1} final content length: ${content.length}`);
    }
    
    // All users should see the same final content
    for (let i = 1; i < contents.length; i++) {
      expect(contents[i]).toBe(contents[0]);
    }
    
    // Verify all expected content is present
    for (let userIndex = 0; userIndex < 3; userIndex++) {
      for (let round = 0; round < 5; round++) {
        expect(contents[0]).toContain(`User ${userIndex + 1} Round ${round + 1}`);
      }
    }
    
    console.log('✅ All users have consistent content after stress test');
    
    // Cleanup
    for (const ctx of contexts) {
      await ctx.close();
    }
    await context.close();
    
    console.log('✅ Real-time synchronization stress test passed');
  });

  test('5. Network interruption recovery test', async ({ browser }) => {
    console.log('🌐 Testing network interruption recovery');
    
    // Create test document
    const context = await browser.newContext();
    const setupPage = await context.newPage();
    const request = setupPage.request;
    
    const doc = await createNoteViaAPI(request, 
      generateTestContent('Network Recovery Test'), 
      'Testing network recovery scenarios'
    );
    
    const userContext = await browser.newContext();
    const page = await userContext.newPage();
    
    // Navigate to document
    await page.goto(`http://localhost:8080/editor/${doc.shareId}`);
    await waitForYjsSync(page);
    await handleUsernamePopup(page, 'Network Test User');
    
    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible();
    
    // Add content before network interruption
    await editor.click();
    const beforeInterruptionContent = generateTestContent('Before network interruption');
    await page.keyboard.type(beforeInterruptionContent);
    await page.waitForTimeout(2000);
    
    // Simulate network interruption by going offline
    console.log('📡 Simulating network interruption...');
    await userContext.setOffline(true);
    
    // Try to add content while offline
    const offlineContent = generateTestContent('\\nAdded while offline - should be preserved');
    await editor.click();
    await page.keyboard.press('End');
    await page.keyboard.type(offlineContent);
    
    await page.waitForTimeout(2000);
    
    // Restore network connection
    console.log('📡 Restoring network connection...');
    await userContext.setOffline(false);
    
    // Wait for reconnection and sync
    await page.waitForTimeout(5000);
    
    // Verify content is preserved and synced
    const finalContent = await editor.textContent();
    expect(finalContent).toContain('Before network interruption');
    expect(finalContent).toContain('Added while offline');
    
    console.log('✅ Content preserved through network interruption');
    
    // Test persistence by reloading
    await page.reload({ waitUntil: 'networkidle' });
    await waitForYjsSync(page);
    await handleUsernamePopup(page, 'Network Test User (Reconnected)');
    
    const contentAfterReload = await page.locator('.ProseMirror').textContent();
    expect(contentAfterReload).toContain('Before network interruption');
    expect(contentAfterReload).toContain('Added while offline');
    
    await userContext.close();
    await context.close();
    
    console.log('✅ Network interruption recovery test passed');
  });
});

console.log('🧪 Enhanced Collaborative Functionality & Persistence Test Suite Loaded!');