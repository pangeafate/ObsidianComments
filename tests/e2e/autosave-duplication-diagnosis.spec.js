const { test, expect } = require('@playwright/test');

// Helper function to handle user name overlay
async function handleUserNameOverlay(page) {
  try {
    const userNameOverlay = page.locator('[data-testid="user-name-overlay"]');
    await userNameOverlay.waitFor({ state: 'visible', timeout: 3000 });
    
    console.log('User name overlay detected, filling it out...');
    const nameInput = page.locator('input[placeholder="Enter your name..."]');
    await nameInput.fill('Test User ' + Date.now());
    
    const submitButton = page.locator('button:has-text("Continue")').first();
    await submitButton.click();
    
    await userNameOverlay.waitFor({ state: 'hidden', timeout: 5000 });
    console.log('User name overlay dismissed');
  } catch (error) {
    console.log('No user name overlay found (this is fine)');
  }
}

test.describe('Auto-save Duplication Diagnosis - TDD', () => {
  
  test('Diagnose: Text should NOT duplicate every 2 seconds during auto-save', async ({ page }) => {
    const docId = 'autosave-diagnosis-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Enable console logging to track what's happening
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      // Capture relevant logs
      if (text.includes('Auto-saving') || 
          text.includes('content initialization') || 
          text.includes('Yjs document') ||
          text.includes('API content') ||
          text.includes('Document saved')) {
        logs.push(`[${new Date().toISOString()}] ${text}`);
        console.log('Browser log:', text);
      }
    });

    // Navigate to new document
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    
    // Wait for editor to load
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for initial setup
    
    // Clear and add unique content
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    const uniqueText = `UNIQUE-${Date.now()}-END`;
    await page.type('.tiptap', uniqueText);
    
    // Record content at different intervals
    const contentSnapshots = [];
    
    // Take snapshots every second for 10 seconds to observe the duplication pattern
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      
      const content = await page.locator('.tiptap').textContent();
      const occurrences = (content.match(new RegExp(uniqueText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      contentSnapshots.push({
        time: i + 1,
        contentLength: content.length,
        occurrences: occurrences,
        content: content.substring(0, 200) + (content.length > 200 ? '...' : '')
      });
      
      console.log(`Snapshot ${i + 1}s: Length=${content.length}, Occurrences=${occurrences}`);
      
      // Fail fast if duplication detected
      if (occurrences > 1) {
        console.error('DUPLICATION DETECTED at second', i + 1);
        console.log('Content:', content);
        break;
      }
    }
    
    // Analyze the pattern
    console.log('\n=== Content Snapshot Analysis ===');
    contentSnapshots.forEach(snapshot => {
      console.log(`${snapshot.time}s: Length=${snapshot.contentLength}, Occurrences=${snapshot.occurrences}`);
      console.log(`   Content: ${snapshot.content}`);
    });
    
    console.log('\n=== Browser Logs ===');
    logs.forEach(log => console.log(log));
    
    // Check for duplication pattern
    const finalOccurrences = contentSnapshots[contentSnapshots.length - 1].occurrences;
    expect(finalOccurrences).toBe(1);
    
    // Check for exponential growth
    const growthPattern = contentSnapshots.map(s => s.contentLength);
    const hasExponentialGrowth = growthPattern.some((length, i) => {
      if (i === 0) return false;
      return length > growthPattern[i - 1] * 1.5; // 50% growth indicates duplication
    });
    
    expect(hasExponentialGrowth).toBe(false);
  });

  test('Hypothesis 1: Component re-initialization triggers duplication', async ({ page }) => {
    const docId = 'hypothesis1-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Track component lifecycle
    const componentEvents = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Initializing') || text.includes('useEffect')) {
        componentEvents.push(`[${new Date().toISOString()}] ${text}`);
      }
    });
    
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Add content and trigger save
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'Test content for hypothesis 1');
    
    // Wait for auto-save and observe
    await page.waitForTimeout(4000);
    
    console.log('\n=== Component Events ===');
    componentEvents.forEach(event => console.log(event));
    
    // Check if initialization happened multiple times
    const initCount = componentEvents.filter(e => e.includes('Initializing')).length;
    console.log('Initialization count:', initCount);
    
    // Get final content
    const finalContent = await page.locator('.tiptap').textContent();
    const occurrences = (finalContent.match(/Test content for hypothesis 1/g) || []).length;
    
    expect(occurrences).toBe(1);
  });

  test('Hypothesis 2: WebSocket broadcast causes duplication', async ({ page, browser }) => {
    const docId = 'hypothesis2-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Open two pages to simulate WebSocket broadcast
    const page1 = page;
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    // Track WebSocket messages
    const wsMessages = [];
    page1.on('console', msg => {
      if (msg.text().includes('WebSocket') || msg.text().includes('broadcast')) {
        wsMessages.push(`Page1: ${msg.text()}`);
      }
    });
    
    // Navigate both pages
    await page1.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page1);
    
    await page2.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page2);
    
    await page1.waitForSelector('.tiptap', { timeout: 10000 });
    await page2.waitForSelector('.tiptap', { timeout: 10000 });
    await page1.waitForTimeout(2000);
    
    // Add content in page1
    await page1.click('.tiptap');
    await page1.keyboard.press('Control+a');
    await page1.keyboard.press('Delete');
    await page1.type('.tiptap', 'WebSocket test content');
    
    // Wait for sync and auto-save
    await page1.waitForTimeout(4000);
    
    // Check content in both pages
    const content1 = await page1.locator('.tiptap').textContent();
    const content2 = await page2.locator('.tiptap').textContent();
    
    console.log('Page 1 content:', content1);
    console.log('Page 2 content:', content2);
    console.log('WebSocket messages:', wsMessages);
    
    const occurrences1 = (content1.match(/WebSocket test content/g) || []).length;
    const occurrences2 = (content2.match(/WebSocket test content/g) || []).length;
    
    expect(occurrences1).toBe(1);
    expect(occurrences2).toBe(1);
    
    await context2.close();
  });

  test('Hypothesis 3: Stale closure in auto-save effect', async ({ page }) => {
    const docId = 'hypothesis3-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Add content in rapid succession to test closure issues
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    // Type content in bursts
    for (let i = 0; i < 3; i++) {
      await page.type('.tiptap', `Burst ${i} `);
      await page.waitForTimeout(500); // Less than auto-save timeout
    }
    
    // Wait for auto-save to complete
    await page.waitForTimeout(3000);
    
    // Add more content
    await page.type('.tiptap', 'Final content');
    await page.waitForTimeout(3000);
    
    const finalContent = await page.locator('.tiptap').textContent();
    console.log('Final content:', finalContent);
    
    // Check for duplicate bursts
    const burst0Count = (finalContent.match(/Burst 0/g) || []).length;
    const burst1Count = (finalContent.match(/Burst 1/g) || []).length;
    const burst2Count = (finalContent.match(/Burst 2/g) || []).length;
    
    console.log('Burst counts:', { burst0Count, burst1Count, burst2Count });
    
    expect(burst0Count).toBe(1);
    expect(burst1Count).toBe(1);
    expect(burst2Count).toBe(1);
  });
});