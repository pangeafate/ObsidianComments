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

// Helper function to check database content
async function checkDatabaseContent(docId) {
  try {
    const response = await fetch(`http://localhost:3001/api/notes/${docId}`);
    if (response.ok) {
      const data = await response.json();
      return {
        exists: true,
        content: data.content,
        contentLength: data.content ? data.content.length : 0
      };
    }
    return { exists: false };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

test.describe('Verify Complete Fix', () => {
  
  test('Verify CSP fix allows connections and auto-save works', async ({ page }) => {
    const docId = 'verify-fix-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Track CSP errors and auto-save logs
    const cspErrors = [];
    const autoSaveLogs = [];
    const connectionLogs = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Content Security Policy') || text.includes('Refused to connect')) {
        cspErrors.push(text);
        console.log('CSP ERROR:', text);
      }
      if (text.includes('Auto-saving') || text.includes('Document saved') || text.includes('Stripping track changes')) {
        autoSaveLogs.push(text);
        console.log('AUTO-SAVE LOG:', text);
      }
      if (text.includes('Connected') || text.includes('connection')) {
        connectionLogs.push(text);
        console.log('CONNECTION LOG:', text);
      }
    });

    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for connections to establish

    // Check connection status
    const connectingStatus = await page.locator('text=Connecting...').count();
    const connectedStatus = await page.locator('text=Connected').count();
    console.log('Connecting status count:', connectingStatus);
    console.log('Connected status count:', connectedStatus);

    // Add content to test auto-save
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    const testText = 'Final fix verification - no duplication expected';
    await page.type('.tiptap', testText);
    console.log('Typed test content:', testText);

    // Wait for auto-save
    await page.waitForTimeout(4000);

    // Check database was saved
    const dbState = await checkDatabaseContent(docId);
    console.log('Database exists:', dbState.exists);
    console.log('Database content length:', dbState.contentLength);
    if (dbState.content) {
      console.log('Database content preview:', dbState.content.substring(0, 200));
      
      // Check for track changes pollution
      const hasTrackChanges = dbState.content.includes('data-track-change="true"');
      console.log('Database has track changes markup:', hasTrackChanges);
      expect(hasTrackChanges).toBe(false);
    }

    // Test refresh to verify no duplication
    console.log('=== TESTING REFRESH FOR DUPLICATION ===');
    await page.reload();
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const finalContent = await page.locator('.tiptap').textContent();
    console.log('Content after refresh:', finalContent);

    // Count occurrences of test text
    const occurrences = (finalContent.match(/Final fix verification - no duplication expected/g) || []).length;
    console.log('Test text occurrences:', occurrences);

    // Analysis
    console.log('\n=== ANALYSIS ===');
    console.log('CSP errors found:', cspErrors.length);
    console.log('Auto-save logs found:', autoSaveLogs.length);
    console.log('Connection logs found:', connectionLogs.length);

    cspErrors.forEach((error, i) => {
      console.log(`CSP Error ${i + 1}: ${error}`);
    });

    autoSaveLogs.forEach((log, i) => {
      console.log(`Auto-save ${i + 1}: ${log}`);
    });

    // Verify fix works
    expect(cspErrors.length).toBe(0); // No CSP errors
    expect(occurrences).toBe(1); // No duplication
    expect(connectingStatus).toBe(0); // Should not be stuck connecting
    
    if (dbState.exists) {
      expect(dbState.contentLength).toBeLessThan(1000); // Content should be clean, not polluted
    }
  });

  test('Test complete workflow: type, save, refresh, verify no duplication', async ({ page }) => {
    const docId = 'complete-workflow-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Test the complete user workflow
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Phase 1: Type content
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'Complete workflow test. ');
    
    const content1 = await page.locator('.tiptap').textContent();
    console.log('Phase 1 content:', content1);

    // Phase 2: Wait for auto-save
    await page.waitForTimeout(3000);
    
    const content2 = await page.locator('.tiptap').textContent();
    console.log('Phase 2 content (after save):', content2);

    // Phase 3: Add more content
    await page.type('.tiptap', 'Second sentence. ');
    
    const content3 = await page.locator('.tiptap').textContent();
    console.log('Phase 3 content:', content3);

    // Phase 4: Another auto-save cycle
    await page.waitForTimeout(3000);
    
    const content4 = await page.locator('.tiptap').textContent();
    console.log('Phase 4 content (after second save):', content4);

    // Phase 5: Refresh and verify
    await page.reload();
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const finalContent = await page.locator('.tiptap').textContent();
    console.log('Final content after refresh:', finalContent);

    // Verify each sentence appears exactly once
    const firstSentenceCount = (finalContent.match(/Complete workflow test\./g) || []).length;
    const secondSentenceCount = (finalContent.match(/Second sentence\./g) || []).length;

    console.log('First sentence count:', firstSentenceCount);
    console.log('Second sentence count:', secondSentenceCount);

    expect(firstSentenceCount).toBe(1);
    expect(secondSentenceCount).toBe(1);

    // Content should not be excessively long (indicating no duplication/pollution)
    expect(finalContent.length).toBeLessThan(200);
  });
});