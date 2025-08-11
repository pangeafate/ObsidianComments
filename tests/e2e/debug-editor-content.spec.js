/**
 * Debug Test: Editor Content Loading Investigation
 * 
 * This test captures browser console logs and network requests
 * to understand why shared note content isn't displaying in the editor
 */

const { test, expect } = require('@playwright/test');

test.describe('Debug Editor Content Loading', () => {
  test('investigate why editor doesn\'t load content from database', async ({ page }) => {
    const consoleMessages = [];
    const networkRequests = [];
    const networkResponses = [];

    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()
      });
    });

    // Capture network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: Object.fromEntries(Object.entries(request.headers())),
        postData: request.postData()
      });
    });

    // Capture network responses
    page.on('response', response => {
      networkResponses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: Object.fromEntries(Object.entries(response.headers()))
      });
    });

    console.log('🚀 Starting debug test...');

    // Step 1: Create a note via API (simulating plugin share)
    const testContent = `# Debug Test Note

This is a test note to debug why content doesn't appear in editor.

## Section 1
Some content here for debugging.

1. First item
2. Second item
3. Third item

**Bold text** and *italic text* for formatting test.`;

    const testTitle = 'Debug Test Note';
    const shareId = `debug-test-${Date.now()}`;

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
    console.log('✅ Note created:', shareResult);

    // Step 2: Navigate to editor and capture all browser activity
    const editorUrl = shareResult.collaborativeUrl || shareResult.editUrl;
    console.log('🌐 Navigating to editor:', editorUrl);

    await page.goto(editorUrl);
    
    // Wait for initial page load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give time for React to initialize

    console.log('📊 Browser Console Messages:');
    consoleMessages.forEach((msg, i) => {
      console.log(`${i + 1}. [${msg.type.toUpperCase()}] ${msg.text}`);
    });

    console.log('📡 Network Requests:');
    networkRequests.forEach((req, i) => {
      if (req.url.includes('obsidiancomments') || req.url.includes('localhost')) {
        console.log(`${i + 1}. ${req.method} ${req.url}`);
        if (req.postData) {
          console.log(`   Data: ${req.postData.substring(0, 100)}...`);
        }
      }
    });

    console.log('📥 Network Responses:');
    networkResponses.forEach((res, i) => {
      if (res.url.includes('obsidiancomments') || res.url.includes('localhost')) {
        console.log(`${i + 1}. ${res.status} ${res.url}`);
      }
    });

    // Step 3: Check what's in the DOM
    console.log('🔍 Checking DOM elements...');
    
    // Wait for editor to be present
    const editorPresent = await page.locator('.ProseMirror, [data-testid="tiptap-editor"]').count();
    console.log(`Editor elements found: ${editorPresent}`);

    if (editorPresent > 0) {
      const editorContent = await page.locator('.ProseMirror, [data-testid="tiptap-editor"]').first().textContent();
      console.log(`Editor text content (${editorContent.length} chars): "${editorContent.substring(0, 200)}..."`);
      
      const editorHTML = await page.locator('.ProseMirror, [data-testid="tiptap-editor"]').first().innerHTML();
      console.log(`Editor HTML (${editorHTML.length} chars): "${editorHTML.substring(0, 200)}..."`);
    }

    // Check if there's a title element
    const titleElements = await page.locator('h1').count();
    console.log(`H1 elements found: ${titleElements}`);
    
    if (titleElements > 0) {
      const titleText = await page.locator('h1').first().textContent();
      console.log(`First H1 text: "${titleText}"`);
    }

    // Step 4: Check local storage and session storage
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        items[key] = window.localStorage.getItem(key);
      }
      return items;
    });
    console.log('💾 Local Storage:', Object.keys(localStorage));

    // Step 5: Check if there are any WebSocket connections
    const wsConnections = await page.evaluate(() => {
      return window.WebSocket ? 'WebSocket available' : 'No WebSocket';
    });
    console.log('🔌 WebSocket status:', wsConnections);

    // Step 6: Try to interact with editor
    try {
      const editor = page.locator('.ProseMirror, [data-testid="tiptap-editor"]').first();
      await editor.click({ timeout: 5000 });
      await page.keyboard.type('Test typing...');
      const afterTyping = await editor.textContent();
      console.log('✏️ After typing test:', afterTyping.includes('Test typing'));
    } catch (e) {
      console.log('❌ Could not interact with editor:', e.message);
    }

    // Step 7: Check if document was actually saved to database
    console.log('🔍 Verifying document exists in database...');
    const getResponse = await fetch(`https://obsidiancomments.serverado.app/api/notes/${shareId}`);
    if (getResponse.ok) {
      const docData = await getResponse.json();
      console.log('✅ Document found in database:', {
        title: docData.title,
        contentLength: docData.content?.length || 0,
        hasYjsData: !!docData.yjsData
      });
    } else {
      console.log('❌ Document not found in database:', getResponse.status);
    }

    // Cleanup
    try {
      await fetch(`https://obsidiancomments.serverado.app/api/notes/${shareId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      console.log('Cleanup failed:', e);
    }

    // The test should fail if content is not visible in editor
    const editorElement = page.locator('.ProseMirror, [data-testid="tiptap-editor"]').first();
    await expect(editorElement).toContainText('This is a test note to debug', { timeout: 5000 });
  });
});