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

test.describe('Real-world Duplication Reproduction', () => {
  
  test('Reproduce exact user workflow: type, wait, type, wait', async ({ page }) => {
    const docId = 'realworld-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Track all auto-save related events
    const autoSaveEvents = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Auto-saving') || 
          text.includes('Document saved') ||
          text.includes('Skipping auto-save') ||
          text.includes('initialization')) {
        autoSaveEvents.push({
          timestamp: Date.now(),
          message: text
        });
        console.log('Auto-save event:', text);
      }
    });
    
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000); // Let initial setup complete
    
    // Simulate realistic user behavior
    console.log('Phase 1: Clear and type initial content');
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'My first sentence. ');
    
    let content1 = await page.locator('.tiptap').textContent();
    console.log('After phase 1:', content1);
    
    // Wait 3 seconds for auto-save to trigger
    console.log('Phase 2: Wait for auto-save (3s)');
    await page.waitForTimeout(3000);
    
    let content2 = await page.locator('.tiptap').textContent();
    console.log('After auto-save:', content2);
    
    // Continue typing
    console.log('Phase 3: Continue typing');
    await page.type('.tiptap', 'My second sentence. ');
    
    let content3 = await page.locator('.tiptap').textContent();
    console.log('After phase 3:', content3);
    
    // Wait another 3 seconds for another auto-save
    console.log('Phase 4: Wait for second auto-save (3s)');
    await page.waitForTimeout(3000);
    
    let content4 = await page.locator('.tiptap').textContent();
    console.log('After second auto-save:', content4);
    
    // Continue typing again
    console.log('Phase 5: Continue typing more');
    await page.type('.tiptap', 'My third sentence.');
    
    let content5 = await page.locator('.tiptap').textContent();
    console.log('After phase 5:', content5);
    
    // Final wait
    console.log('Phase 6: Final wait (3s)');
    await page.waitForTimeout(3000);
    
    let finalContent = await page.locator('.tiptap').textContent();
    console.log('Final content:', finalContent);
    
    // Analyze the results
    console.log('\n=== Auto-save Events ===');
    autoSaveEvents.forEach((event, i) => {
      console.log(`${i + 1}. [${event.timestamp}] ${event.message}`);
    });
    
    // Check for duplication
    const firstSentenceCount = (finalContent.match(/My first sentence\./g) || []).length;
    const secondSentenceCount = (finalContent.match(/My second sentence\./g) || []).length;
    const thirdSentenceCount = (finalContent.match(/My third sentence\./g) || []).length;
    
    console.log('\n=== Duplication Analysis ===');
    console.log('First sentence occurrences:', firstSentenceCount);
    console.log('Second sentence occurrences:', secondSentenceCount);
    console.log('Third sentence occurrences:', thirdSentenceCount);
    
    // These should all be 1 if no duplication occurred
    expect(firstSentenceCount).toBe(1);
    expect(secondSentenceCount).toBe(1);
    expect(thirdSentenceCount).toBe(1);
  });

  test('Test database/Yjs synchronization conflict', async ({ page }) => {
    const docId = 'dbsync-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Monitor network requests to the API
    const apiCalls = [];
    page.on('response', response => {
      if (response.url().includes('/api/notes/')) {
        apiCalls.push({
          method: response.request().method(),
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
        console.log('API call:', response.request().method(), response.url(), response.status());
      }
    });
    
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    // Type content
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'Testing DB sync conflict');
    
    // Wait for auto-save
    await page.waitForTimeout(3000);
    
    // Type more content immediately after save
    await page.type('.tiptap', ' - added after save');
    
    // Wait again
    await page.waitForTimeout(3000);
    
    const finalContent = await page.locator('.tiptap').textContent();
    console.log('Final content:', finalContent);
    
    console.log('\n=== API Calls ===');
    apiCalls.forEach((call, i) => {
      console.log(`${i + 1}. ${call.method} ${call.url} - ${call.status} [${call.timestamp}]`);
    });
    
    // Check for content duplication
    const mainTextCount = (finalContent.match(/Testing DB sync conflict/g) || []).length;
    const addedTextCount = (finalContent.match(/added after save/g) || []).length;
    
    console.log('Main text count:', mainTextCount);
    console.log('Added text count:', addedTextCount);
    
    expect(mainTextCount).toBe(1);
    expect(addedTextCount).toBe(1);
  });

  test('Simulate document state race condition', async ({ page, browser }) => {
    const docId = 'raceCondition-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Create document first
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);
    
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'Race condition test');
    
    // Wait for save
    await page.waitForTimeout(3000);
    
    // Close page and immediately reopen (simulate refresh during save)
    await page.close();
    
    const newPage = await browser.newPage();
    await newPage.goto(`/editor/${docId}`);
    await handleUserNameOverlay(newPage);
    await newPage.waitForSelector('.tiptap', { timeout: 10000 });
    
    // Wait and observe content
    await newPage.waitForTimeout(3000);
    
    const content = await newPage.locator('.tiptap').textContent();
    console.log('Content after race condition test:', content);
    
    const occurrences = (content.match(/Race condition test/g) || []).length;
    console.log('Occurrences:', occurrences);
    
    expect(occurrences).toBe(1);
    
    await newPage.close();
  });
});