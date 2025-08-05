const { test, expect } = require('@playwright/test');

// TDD: Collaboration Functionality Tests
// These tests should fail initially, then we implement code to make them pass

test.describe('Real-time Collaboration - TDD Implementation', () => {
  let documentId;

  test.beforeEach(async ({ page }) => {
    // Create unique document ID for each test
    documentId = 'collab-test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Set up error monitoring
    page.on('pageerror', error => {
      console.error('❌ Page error:', error.message);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('❌ Console error:', msg.text());
      } else if (msg.text().includes('WebSocket') || msg.text().includes('Y.Doc')) {
        console.log('🔗 WebSocket/Y.js log:', msg.text());
      }
    });
  });

  test('WebSocket connection should establish successfully', async ({ page }) => {
    let wsConnected = false;
    let wsError = null;

    // Monitor WebSocket connections
    page.on('websocket', ws => {
      console.log('🔗 WebSocket created:', ws.url());
      
      ws.on('open', () => {
        console.log('✅ WebSocket opened');
        wsConnected = true;
      });
      
      ws.on('close', () => {
        console.log('❌ WebSocket closed');
      });
      
      ws.on('socketerror', error => {
        console.error('❌ WebSocket error:', error);
        wsError = error;
      });
    });

    await page.goto(`/editor/${documentId}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    
    // Wait for WebSocket connection
    await page.waitForTimeout(3000);
    
    expect(wsConnected).toBe(true);
    expect(wsError).toBeNull();
  });

  test('Y.js document should initialize without conflicts', async ({ page }) => {
    const yjsErrors = [];
    const yjsWarnings = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Y.Doc') || text.includes('Yjs') || text.includes('awareness')) {
        if (msg.type() === 'error') {
          yjsErrors.push(text);
        } else if (msg.type() === 'warning' || text.includes('conflict')) {
          yjsWarnings.push(text);
        } else {
          console.log('📄 Y.js log:', text);
        }
      }
    });

    await page.goto(`/editor/${documentId}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    
    // Wait for Y.js initialization
    await page.waitForTimeout(5000);
    
    expect(yjsErrors).toHaveLength(0);
    expect(yjsWarnings).toHaveLength(0);
  });

  test('Two users should see each other in awareness', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Set up awareness monitoring
    let user1Visible = false;
    let user2Visible = false;

    page1.on('console', msg => {
      if (msg.text().includes('awareness') && msg.text().includes('user')) {
        console.log('👤 Page1 awareness:', msg.text());
        if (msg.text().includes('added') || msg.text().includes('updated')) {
          user2Visible = true;
        }
      }
    });

    page2.on('console', msg => {
      if (msg.text().includes('awareness') && msg.text().includes('user')) {
        console.log('👤 Page2 awareness:', msg.text());
        if (msg.text().includes('added') || msg.text().includes('updated')) {
          user1Visible = true;
        }
      }
    });

    // Open same document in both pages
    await Promise.all([
      page1.goto(`/editor/${documentId}`),
      page2.goto(`/editor/${documentId}`)
    ]);

    // Wait for editors to be ready
    await Promise.all([
      page1.waitForSelector('.tiptap', { timeout: 10000 }),
      page2.waitForSelector('.tiptap', { timeout: 10000 })
    ]);

    // Wait for awareness to sync
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    // Check for user awareness indicators (cursors, names, etc.)
    const awarenessElements1 = await page1.locator('[data-testid*="user"], .user-cursor, .collaboration-cursor').count();
    const awarenessElements2 = await page2.locator('[data-testid*="user"], .user-cursor, .collaboration-cursor').count();

    console.log('👥 Awareness elements - Page1:', awarenessElements1, 'Page2:', awarenessElements2);

    // At minimum, each page should detect the other user's presence
    expect(awarenessElements1 + awarenessElements2).toBeGreaterThan(0);

    await context1.close();
    await context2.close();
  });

  test('Text typed in one editor should appear in another in real-time', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    console.log(`🔍 Testing real-time sync: /editor/${documentId}`);
    
    // Open same document in both pages
    await Promise.all([
      page1.goto(`/editor/${documentId}`),
      page2.goto(`/editor/${documentId}`)
    ]);

    // Wait for editors to be ready
    await Promise.all([
      page1.waitForSelector('.tiptap', { timeout: 10000 }),
      page2.waitForSelector('.tiptap', { timeout: 10000 })
    ]);

    // Wait for WebSocket connections
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    // Type in page 1
    await page1.click('.tiptap');
    const testText = 'Real-time collaboration test ' + Date.now();
    await page1.type('.tiptap', testText, { delay: 100 });

    console.log('⌨️  Typed in page1:', testText);

    // Check it appears in page 2 within reasonable time
    await expect(page2.locator('.tiptap')).toContainText(testText, {
      timeout: 10000
    });

    console.log('✅ Text synced to page2');

    // Verify bidirectional sync - type in page 2
    const testText2 = '\n\nBidirectional sync test ' + Date.now();
    await page2.click('.tiptap');
    await page2.type('.tiptap', testText2, { delay: 100 });

    console.log('⌨️  Typed in page2:', testText2);

    // Check it appears in page 1
    await expect(page1.locator('.tiptap')).toContainText(testText2, {
      timeout: 10000
    });

    console.log('✅ Bidirectional sync working');

    await context1.close();
    await context2.close();
  });

  test('Document changes should persist after reconnection', async ({ browser }) => {
    const testText = 'Persistence and reconnection test ' + Date.now();
    
    // First session: add content
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    await page1.goto(`/editor/${documentId}`);
    await page1.waitForSelector('.tiptap', { timeout: 10000 });
    
    await page1.click('.tiptap');
    await page1.type('.tiptap', testText);
    
    // Wait for sync
    await page1.waitForTimeout(3000);
    await context1.close();
    
    // Second session: verify content persisted
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    await page2.goto(`/editor/${documentId}`);
    await page2.waitForSelector('.tiptap', { timeout: 10000 });
    
    // Wait for content to load
    await page2.waitForTimeout(3000);
    
    // Verify text persisted
    await expect(page2.locator('.tiptap')).toContainText(testText, {
      timeout: 5000
    });

    console.log('✅ Content persisted across sessions');
    
    await context2.close();
  });

  test('Simultaneous editing should resolve without conflicts', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Open same document in both pages
    await Promise.all([
      page1.goto(`/editor/${documentId}`),
      page2.goto(`/editor/${documentId}`)
    ]);

    // Wait for editors to be ready
    await Promise.all([
      page1.waitForSelector('.tiptap', { timeout: 10000 }),
      page2.waitForSelector('.tiptap', { timeout: 10000 })
    ]);

    // Wait for WebSocket connections
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    // Type simultaneously in both editors
    const text1 = 'User 1 typing simultaneously ';
    const text2 = 'User 2 typing simultaneously ';

    await Promise.all([
      (async () => {
        await page1.click('.tiptap');
        await page1.type('.tiptap', text1, { delay: 50 });
      })(),
      (async () => {
        await page2.click('.tiptap');
        await page2.type('.tiptap', text2, { delay: 50 });
      })()
    ]);

    // Wait for synchronization
    await page1.waitForTimeout(3000);
    await page2.waitForTimeout(3000);

    // Both editors should contain both texts (order may vary due to OT)
    const content1 = await page1.locator('.tiptap').textContent();
    const content2 = await page2.locator('.tiptap').textContent();

    console.log('📝 Final content page1:', content1);
    console.log('📝 Final content page2:', content2);

    // Both pages should have the same final content
    expect(content1).toBe(content2);
    
    // Both texts should be present
    expect(content1).toContain('User 1 typing');
    expect(content1).toContain('User 2 typing');

    await context1.close();
    await context2.close();
  });

  test('WebSocket reconnection should work after connection loss', async ({ page }) => {
    let wsConnections = 0;
    let wsReconnections = 0;

    page.on('websocket', ws => {
      wsConnections++;
      console.log(`🔗 WebSocket connection #${wsConnections}:`, ws.url());
      
      ws.on('close', () => {
        if (wsConnections > 1) {
          wsReconnections++;
          console.log(`🔄 WebSocket reconnection detected (#${wsReconnections})`);
        }
      });
    });

    await page.goto(`/editor/${documentId}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    
    // Wait for initial connection
    await page.waitForTimeout(2000);
    expect(wsConnections).toBeGreaterThan(0);

    // Simulate network interruption by navigating away and back
    await page.goto('about:blank');
    await page.waitForTimeout(1000);
    await page.goto(`/editor/${documentId}`);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    
    // Wait for reconnection
    await page.waitForTimeout(3000);
    
    // Should have established new connection
    expect(wsConnections).toBeGreaterThan(1);
    
    console.log(`✅ WebSocket reconnection working (${wsConnections} total connections)`);
  });

  test('Large document changes should sync efficiently', async ({ browser }) => {
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

    await page1.waitForTimeout(3000);

    // Insert large content in page 1
    const largeContent = '# Large Document Test\n\n' + 
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100) +
      '\n\n## Section 2\n\n' +
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. '.repeat(50);

    await page1.click('.tiptap');
    await page1.evaluate((content) => {
      const editor = document.querySelector('.tiptap');
      editor.innerHTML = content;
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    }, largeContent);

    // Wait for sync with timeout
    const startTime = Date.now();
    await expect(page2.locator('.tiptap')).toContainText('Large Document Test', {
      timeout: 15000
    });
    const syncTime = Date.now() - startTime;

    console.log(`📊 Large document synced in ${syncTime}ms`);
    
    // Sync should complete within reasonable time (15 seconds max)
    expect(syncTime).toBeLessThan(15000);

    await context1.close();
    await context2.close();
  });
});