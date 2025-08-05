const { test, expect } = require('@playwright/test');

// TDD: New Note Creation and Persistence Tests
// These tests should fail initially, then we implement code to make them pass

test.describe('New Note Creation and Persistence - TDD', () => {
  let apiBase;

  test.beforeEach(async ({ page }) => {
    apiBase = process.env.TEST_URL ? 
      process.env.TEST_URL.replace(/\/$/, '') + '/api' : 
      'https://obsidiancomments.serverado.app/api';
    
    console.log(`🔗 API Base: ${apiBase}`);
    
    // Set up error monitoring
    page.on('pageerror', error => {
      console.error('❌ Page error:', error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console error:', msg.text());
      }
    });
  });

  // Helper function to handle user name overlay
  async function handleUserNameOverlay(page) {
    try {
      const userNameOverlay = page.locator('[data-testid="user-name-overlay"]');
      await userNameOverlay.waitFor({ state: 'visible', timeout: 3000 });
      
      console.log('👤 User name overlay detected, filling it out...');
      const nameInput = page.locator('input[placeholder="Enter your name..."]');
      await nameInput.fill('Test User ' + Date.now());
      
      const submitButton = page.locator('button:has-text("Continue"), button:has-text("Start"), button:has-text("OK"), button[type="submit"]').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await userNameOverlay.waitFor({ state: 'hidden', timeout: 10000 });
        console.log('✅ User name overlay dismissed');
      }
    } catch (error) {
      console.log('ℹ️  No user name overlay (this is fine)');
    }
  }

  test('New note should be created in database immediately upon opening', async ({ page, request }) => {
    // Start from a document list or main page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Create a new note using the button
    const newNoteButton = page.locator('button:has-text("New Note"), [data-testid="new-note-button"]');
    
    // If no new note button on main page, navigate to an existing document first
    if (await newNoteButton.count() === 0) {
      const testDocId = 'test-parent-' + Date.now();
      await page.goto(`/editor/${testDocId}`);
      await page.waitForSelector('.tiptap', { timeout: 10000 });
      await handleUserNameOverlay(page);
    }
    
    // Now click the New Note button
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),  // Wait for new tab to open
      page.click('button:has-text("New Note")')
    ]);
    
    // Wait for new page to load
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForSelector('.tiptap', { timeout: 10000 });
    await handleUserNameOverlay(newPage);
    
    // Extract document ID from URL
    const url = newPage.url();
    const documentId = url.split('/editor/')[1];
    console.log(`📝 New document ID: ${documentId}`);
    
    // TEST: The document should exist in database immediately (even without typing)
    // This should initially FAIL because new notes aren't created in DB until content is saved
    await newPage.waitForTimeout(3000);  // Give some time for any auto-creation
    
    const apiResponse = await request.get(`${apiBase}/notes/${documentId}`);
    console.log(`📊 API Response Status: ${apiResponse.status()}`);
    
    if (apiResponse.status() === 200) {
      const document = await apiResponse.json();
      console.log(`✅ Document found in database:`, document);
      
      // Document should have default title and content
      expect(document).toHaveProperty('shareId', documentId);
      expect(document).toHaveProperty('title');
      expect(document).toHaveProperty('content');
      expect(document).toHaveProperty('createdAt');
      expect(document).toHaveProperty('updatedAt');
    } else if (apiResponse.status() === 404) {
      // This is the current bug - new documents don't exist in DB until content is typed
      console.error('❌ NEW NOTE BUG: Document not found in database immediately after creation');
      throw new Error('New note was not created in database - this is the bug we need to fix');
    } else {
      throw new Error(`Unexpected API response status: ${apiResponse.status()}`);
    }
    
    await newPage.close();
  });

  test('New note should persist across browser refresh without typing', async ({ page, request }) => {
    // Create new note
    const testDocId = 'refresh-test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    await page.goto(`/editor/${testDocId}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await handleUserNameOverlay(page);
    
    console.log(`📝 Opened new document: ${testDocId}`);
    
    // Don't type anything - just wait
    await page.waitForTimeout(5000);
    
    // Document should exist in database
    let apiResponse = await request.get(`${apiBase}/notes/${testDocId}`);
    
    if (apiResponse.status() === 404) {
      console.error('❌ NEW NOTE BUG: Empty document not persisted to database');
      // This test should fail initially - showing the bug
      throw new Error('New empty note was not persisted to database');
    }
    
    expect(apiResponse.status()).toBe(200);
    const document = await apiResponse.json();
    console.log(`📄 Document before refresh:`, document);
    
    // Refresh the page
    await page.reload();
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await handleUserNameOverlay(page);
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Check that document still exists and page loads correctly
    apiResponse = await request.get(`${apiBase}/notes/${testDocId}`);
    expect(apiResponse.status()).toBe(200);
    
    const refreshedDocument = await apiResponse.json();
    console.log(`📄 Document after refresh:`, refreshedDocument);
    
    // Document should maintain its properties
    expect(refreshedDocument.shareId).toBe(testDocId);
    expect(refreshedDocument.title).toBe(document.title);
    expect(refreshedDocument.createdAt).toBe(document.createdAt);
  });

  test('New note should have default title and content structure', async ({ page, request }) => {
    const testDocId = 'default-content-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    await page.goto(`/editor/${testDocId}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await handleUserNameOverlay(page);
    
    // Wait for any auto-creation
    await page.waitForTimeout(5000);
    
    // Check document in database
    const apiResponse = await request.get(`${apiBase}/notes/${testDocId}`);
    
    if (apiResponse.status() === 404) {
      console.error('❌ NEW NOTE BUG: New document not auto-created with default content');
      throw new Error('New note should be auto-created with default content');
    }
    
    expect(apiResponse.status()).toBe(200);
    const document = await apiResponse.json();
    
    console.log(`📄 Default document structure:`, document);
    
    // Should have meaningful default title
    expect(document.title).toBeTruthy();
    expect(document.title).not.toBe('');
    expect(document.title).not.toBe('undefined');
    
    // Should have some default content structure
    expect(document.content).toBeTruthy();
    expect(document.content.length).toBeGreaterThan(0);
    
    // Timestamps should be set
    expect(document.createdAt).toBeTruthy();
    expect(document.updatedAt).toBeTruthy();
    
    // Should have proper permissions
    expect(document.permissions).toBeTruthy();
  });

  test('Multiple new notes should each get unique documents in database', async ({ browser, request }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    // Create two different new notes
    const docId1 = 'multi-test-1-' + Date.now();
    const docId2 = 'multi-test-2-' + Date.now();
    
    await Promise.all([
      page1.goto(`/editor/${docId1}`),
      page2.goto(`/editor/${docId2}`)
    ]);
    
    await Promise.all([
      page1.waitForSelector('.tiptap', { timeout: 10000 }),
      page2.waitForSelector('.tiptap', { timeout: 10000 })
    ]);
    
    await Promise.all([
      handleUserNameOverlay(page1),
      handleUserNameOverlay(page2)
    ]);
    
    // Wait for any auto-creation
    await page1.waitForTimeout(5000);
    await page2.waitForTimeout(5000);
    
    // Both documents should exist in database
    const [response1, response2] = await Promise.all([
      request.get(`${apiBase}/notes/${docId1}`),
      request.get(`${apiBase}/notes/${docId2}`)
    ]);
    
    if (response1.status() === 404 || response2.status() === 404) {
      console.error('❌ NEW NOTE BUG: One or more new documents not auto-created');
      throw new Error('New notes should be auto-created in database');
    }
    
    expect(response1.status()).toBe(200);
    expect(response2.status()).toBe(200);
    
    const [doc1, doc2] = await Promise.all([
      response1.json(),
      response2.json()
    ]);
    
    console.log(`📄 Document 1:`, doc1);
    console.log(`📄 Document 2:`, doc2);
    
    // Documents should be different
    expect(doc1.shareId).toBe(docId1);
    expect(doc2.shareId).toBe(docId2);
    expect(doc1.shareId).not.toBe(doc2.shareId);
    
    // Both should have valid structure
    expect(doc1.title).toBeTruthy();
    expect(doc2.title).toBeTruthy();
    expect(doc1.content).toBeTruthy();
    expect(doc2.content).toBeTruthy();
    
    await context1.close();
    await context2.close();
  });

  test('New note should support immediate collaboration without prior content', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    const sharedDocId = 'collab-empty-' + Date.now();
    
    // Both users open the same new document
    await Promise.all([
      page1.goto(`/editor/${sharedDocId}`),
      page2.goto(`/editor/${sharedDocId}`)
    ]);
    
    await Promise.all([
      page1.waitForSelector('.tiptap', { timeout: 10000 }),
      page2.waitForSelector('.tiptap', { timeout: 10000 })
    ]);
    
    await Promise.all([
      handleUserNameOverlay(page1),
      handleUserNameOverlay(page2)
    ]);
    
    // Wait for WebSocket connections and document initialization
    await page1.waitForTimeout(5000);
    await page2.waitForTimeout(5000);
    
    // User 1 types something
    const testContent = 'Hello from new document collaboration test!';
    await page1.click('.tiptap');
    await page1.type('.tiptap', testContent, { delay: 100 });
    
    console.log(`👤 User 1 typed: ${testContent}`);
    
    // Content should appear in User 2's editor through collaboration
    await expect(page2.locator('.tiptap')).toContainText(testContent, {
      timeout: 15000
    });
    
    console.log('✅ Real-time collaboration working on new document');
    
    // Both users should see the same content
    const content1 = await page1.locator('.tiptap').textContent();
    const content2 = await page2.locator('.tiptap').textContent();
    
    expect(content1.trim()).toBe(content2.trim());
    expect(content1).toContain(testContent);
    
    await context1.close();
    await context2.close();
  });
});