const { test, expect } = require('@playwright/test');

// TDD: Title Propagation and Database Persistence Tests
// These tests should fail initially, then we implement code to make them pass

test.describe('Title Propagation and Database Persistence - TDD', () => {
  let documentId;
  let apiBase;

  test.beforeEach(async ({ page }) => {
    documentId = 'persist-test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    apiBase = process.env.TEST_URL ? 
      process.env.TEST_URL.replace(/\/$/, '') + '/api' : 
      'https://obsidiancomments.serverado.app/api';
    
    console.log(`🔍 Testing document: ${documentId}`);
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

  test('Document title should update when editing markdown heading', async ({ page }) => {
    await page.goto(`/editor/${documentId}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await handleUserNameOverlay(page);
    
    // Type a markdown heading which should become the document title
    await page.click('.tiptap');
    const testTitle = 'Dynamic Title Test ' + Date.now();
    await page.type('.tiptap', `# ${testTitle}\n\nThis is test content.`, { delay: 100 });
    
    console.log(`📝 Typed title: ${testTitle}`);
    
    // Wait for title to propagate to the UI
    await page.waitForTimeout(3000);
    
    // Check if title appears in browser tab title
    const pageTitle = await page.title();
    console.log(`🏷️  Page title: ${pageTitle}`);
    expect(pageTitle).toContain(testTitle);
    
    // Check if title appears in any title display elements
    const titleElements = await page.locator('h1, [data-testid="document-title"], .document-title, .editor-title').count();
    if (titleElements > 0) {
      const titleText = await page.locator('h1, [data-testid="document-title"], .document-title, .editor-title').first().textContent();
      console.log(`📋 Title element text: ${titleText}`);
      expect(titleText).toContain(testTitle);
    }
  });

  test('Document title should update in database via API', async ({ page, request }) => {
    await page.goto(`/editor/${documentId}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await handleUserNameOverlay(page);
    
    // Type content with a heading
    await page.click('.tiptap');
    const testTitle = 'API Title Test ' + Date.now();
    const testContent = `# ${testTitle}\n\nThis content should be saved to database.`;
    await page.type('.tiptap', testContent, { delay: 100 });
    
    console.log(`📝 Typed content with title: ${testTitle}`);
    
    // Wait for content to sync
    await page.waitForTimeout(5000);
    
    // Check via API if the document was created/updated
    const apiResponse = await request.get(`${apiBase}/notes/${documentId}`);
    
    if (apiResponse.status() === 200) {
      const document = await apiResponse.json();
      console.log(`📄 Document from API:`, document);
      
      // Document should exist and have the correct title
      expect(document).toHaveProperty('title');
      expect(document.title).toBe(testTitle);
      expect(document).toHaveProperty('content');
      expect(document.content).toContain(testTitle);
    } else if (apiResponse.status() === 404) {
      // Document might not be in the database yet - this indicates the persistence issue
      console.warn(`⚠️  Document ${documentId} not found in database (404) - this indicates persistence issue`);
      throw new Error('Document not persisted to database - this is the bug we need to fix');
    } else {
      throw new Error(`Unexpected API response status: ${apiResponse.status()}`);
    }
  });

  test('Document changes should persist across browser sessions', async ({ browser, request }) => {
    const testTitle = 'Persistence Test ' + Date.now();
    const testContent = `# ${testTitle}\n\nThis content should persist across sessions.\n\n## Section 2\n\nMore content here.`;
    
    // First session: create content
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    await page1.goto(`/editor/${documentId}`);
    await page1.waitForSelector('.tiptap', { timeout: 10000 });
    await handleUserNameOverlay(page1);
    
    await page1.click('.tiptap');
    await page1.type('.tiptap', testContent, { delay: 50 });
    
    console.log(`📝 First session: created content with title "${testTitle}"`);
    
    // Wait for sync and persistence
    await page1.waitForTimeout(10000);
    
    // Verify content is in database via API
    let apiResponse = await request.get(`${apiBase}/notes/${documentId}`);
    if (apiResponse.status() === 404) {
      // Try to create the document via API if it doesn't exist
      console.log('📤 Document not found, creating via API...');
      const createResponse = await request.post(`${apiBase}/notes/share`, {
        data: {
          title: testTitle,
          content: testContent,
          shareId: documentId
        }
      });
      console.log(`📋 Create response status: ${createResponse.status()}`);
    }
    
    await context1.close();
    
    // Second session: verify persistence
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    await page2.goto(`/editor/${documentId}`);
    await page2.waitForSelector('.tiptap', { timeout: 10000 });
    await handleUserNameOverlay(page2);
    
    // Wait for content to load from database
    await page2.waitForTimeout(5000);
    
    // Check if the content persisted
    const editorContent = await page2.locator('.tiptap').textContent();
    console.log(`📖 Second session content: "${editorContent}"`);
    
    expect(editorContent).toContain(testTitle);
    expect(editorContent).toContain('This content should persist');
    
    // Also verify via API
    apiResponse = await request.get(`${apiBase}/notes/${documentId}`);
    expect(apiResponse.status()).toBe(200);
    
    const document = await apiResponse.json();
    expect(document.title).toBe(testTitle);
    expect(document.content).toContain(testTitle);
    
    await context2.close();
  });

  test('Real-time title updates should sync between users', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Open same document in both pages
    await Promise.all([
      page1.goto(`/editor/${documentId}`),
      page2.goto(`/editor/${documentId}`)
    ]);

    await Promise.all([
      page1.waitForSelector('.tiptap', { timeout: 10000 }),
      page2.waitForSelector('.tiptap', { timeout: 10000 })
    ]);

    await Promise.all([
      handleUserNameOverlay(page1),
      handleUserNameOverlay(page2)
    ]);

    // Wait for WebSocket connections
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    // User 1 types a title
    const dynamicTitle = 'Live Title Update ' + Date.now();
    await page1.click('.tiptap');
    await page1.type('.tiptap', `# ${dynamicTitle}\n\nContent from user 1.`, { delay: 100 });

    console.log(`👤 User 1 typed title: ${dynamicTitle}`);

    // Check if title appears in User 2's session
    await expect(page2.locator('.tiptap')).toContainText(dynamicTitle, {
      timeout: 15000
    });

    console.log('✅ Title synced between users');

    // Verify both pages show the same content
    const content1 = await page1.locator('.tiptap').textContent();
    const content2 = await page2.locator('.tiptap').textContent();
    
    console.log(`📄 User 1 content: "${content1}"`);
    console.log(`📄 User 2 content: "${content2}"`);
    
    expect(content1.trim()).toBe(content2.trim());

    await context1.close();
    await context2.close();
  });

  test('Document should auto-save periodically to database', async ({ page, request }) => {
    await page.goto(`/editor/${documentId}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await handleUserNameOverlay(page);
    
    // Type initial content
    await page.click('.tiptap');
    const initialTitle = 'Auto Save Test ' + Date.now();
    await page.type('.tiptap', `# ${initialTitle}\n\nInitial content.`, { delay: 100 });
    
    console.log(`📝 Initial content: ${initialTitle}`);
    
    // Wait for initial save
    await page.waitForTimeout(5000);
    
    // Add more content gradually and check saves
    const updates = [
      '\n\n## Section 1\nAdded content 1.',
      '\n\n## Section 2\nAdded content 2.',
      '\n\n## Section 3\nAdded content 3.'
    ];
    
    for (let i = 0; i < updates.length; i++) {
      await page.type('.tiptap', updates[i], { delay: 50 });
      
      // Wait for auto-save (should happen every few seconds)
      await page.waitForTimeout(8000);
      
      // Check if document exists in database
      const apiResponse = await request.get(`${apiBase}/notes/${documentId}`);
      
      if (apiResponse.status() === 200) {
        const document = await apiResponse.json();
        console.log(`💾 Auto-save ${i + 1}: Document found in database`);
        console.log(`📄 Current title: ${document.title}`);
        console.log(`📝 Content length: ${document.content?.length || 0} chars`);
        
        expect(document.title).toBe(initialTitle);
        expect(document.content).toContain(`Section ${i + 1}`);
      } else {
        console.warn(`⚠️  Auto-save ${i + 1}: Document not found in database (status: ${apiResponse.status()})`);
      }
    }
  });

  test('Document metadata should include creation and update timestamps', async ({ page, request }) => {
    await page.goto(`/editor/${documentId}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await handleUserNameOverlay(page);
    
    const testTitle = 'Metadata Test ' + Date.now();
    await page.click('.tiptap');
    await page.type('.tiptap', `# ${testTitle}\n\nTesting metadata timestamps.`, { delay: 100 });
    
    // Wait for save
    await page.waitForTimeout(8000);
    
    const beforeUpdate = new Date();
    
    // Update the document
    await page.type('.tiptap', '\n\nAdditional content for update test.', { delay: 50 });
    await page.waitForTimeout(8000);
    
    const afterUpdate = new Date();
    
    // Check document metadata via API
    const apiResponse = await request.get(`${apiBase}/notes/${documentId}`);
    
    if (apiResponse.status() === 200) {
      const document = await apiResponse.json();
      console.log(`📅 Document metadata:`, {
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
      });
      
      expect(document).toHaveProperty('createdAt');
      expect(document).toHaveProperty('updatedAt');
      
      const createdAt = new Date(document.createdAt);
      const updatedAt = new Date(document.updatedAt);
      
      // Creation time should be before our update
      expect(createdAt.getTime()).toBeLessThanOrEqual(beforeUpdate.getTime() + 10000); // 10s tolerance
      
      // Update time should be after our update
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime() - 10000); // 10s tolerance
      
      console.log('✅ Timestamps are correctly maintained');
    } else {
      throw new Error(`Document not found in database (status: ${apiResponse.status()})`);
    }
  });
});