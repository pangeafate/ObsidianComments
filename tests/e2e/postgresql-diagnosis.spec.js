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

// Helper function to check database state
async function checkDatabaseState(docId) {
  try {
    const response = await fetch(`http://localhost:3001/api/notes/${docId}`);
    if (response.ok) {
      const data = await response.json();
      return {
        exists: true,
        content: data.content,
        contentLength: data.content ? data.content.length : 0,
        yjsState: data.yjsState ? data.yjsState.length : 0,
        updatedAt: data.updatedAt
      };
    }
    return { exists: false };
  } catch (error) {
    console.error('Database check failed:', error);
    return { exists: false, error: error.message };
  }
}

test.describe('PostgreSQL Data Storage Diagnosis - Single User Issue', () => {
  
  test('Monitor database writes during single-user auto-save cycle', async ({ page }) => {
    const docId = 'db-monitor-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Track all API calls to the database
    const apiCalls = [];
    page.on('response', response => {
      if (response.url().includes('/api/notes/') && response.url().includes(docId)) {
        apiCalls.push({
          method: response.request().method(),
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
        console.log(`API: ${response.request().method()} ${response.url()} - Status: ${response.status()}`);
      }
    });

    // Track console logs for auto-save events
    const autoSaveLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Auto-saving') || text.includes('Document saved') || text.includes('content initialization')) {
        autoSaveLogs.push({
          timestamp: Date.now(),
          message: text
        });
        console.log('Auto-save:', text);
      }
    });

    // Step 1: Load document
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Step 2: Check initial database state 
    let dbState1 = await checkDatabaseState(docId);
    console.log('Initial DB state:', dbState1);

    // Step 3: Clear and add unique content
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    const uniqueText = `SINGLE-USER-TEST-${Date.now()}`;
    await page.type('.tiptap', uniqueText);
    
    console.log('Typed content:', uniqueText);

    // Step 4: Wait for first auto-save and check database
    await page.waitForTimeout(3000);
    let dbState2 = await checkDatabaseState(docId);
    console.log('After first auto-save DB state:', dbState2);

    // Step 5: Add more content
    await page.type('.tiptap', ' - ADDITIONAL CONTENT');
    
    // Step 6: Wait for second auto-save and check database
    await page.waitForTimeout(3000);
    let dbState3 = await checkDatabaseState(docId);
    console.log('After second auto-save DB state:', dbState3);

    // Step 7: Check current editor content
    const editorContent = await page.locator('.tiptap').textContent();
    console.log('Current editor content:', editorContent);

    // Step 8: Force a refresh to trigger content reload from database
    console.log('=== REFRESHING PAGE TO TEST DATABASE RELOAD ===');
    await page.reload();
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for content initialization

    // Step 9: Check content after reload
    const contentAfterReload = await page.locator('.tiptap').textContent();
    console.log('Content after reload:', contentAfterReload);

    // Step 10: Check database state after reload
    let dbState4 = await checkDatabaseState(docId);
    console.log('DB state after reload:', dbState4);

    // Step 11: Wait for any additional auto-saves after reload
    await page.waitForTimeout(3000);
    let dbState5 = await checkDatabaseState(docId);
    console.log('DB state after post-reload wait:', dbState5);

    const finalEditorContent = await page.locator('.tiptap').textContent();
    console.log('Final editor content:', finalEditorContent);

    // Analysis
    console.log('\n=== API CALLS ANALYSIS ===');
    apiCalls.forEach((call, i) => {
      console.log(`${i + 1}. ${call.method} ${call.url} - ${call.status} [${new Date(call.timestamp).toISOString()}]`);
    });

    console.log('\n=== AUTO-SAVE LOGS ===');
    autoSaveLogs.forEach((log, i) => {
      console.log(`${i + 1}. [${new Date(log.timestamp).toISOString()}] ${log.message}`);
    });

    console.log('\n=== DATABASE STATE PROGRESSION ===');
    console.log('1. Initial:', JSON.stringify(dbState1, null, 2));
    console.log('2. After first save:', JSON.stringify(dbState2, null, 2));
    console.log('3. After second save:', JSON.stringify(dbState3, null, 2)); 
    console.log('4. After reload:', JSON.stringify(dbState4, null, 2));
    console.log('5. After post-reload wait:', JSON.stringify(dbState5, null, 2));

    // Critical checks
    const originalTextCount = (finalEditorContent.match(new RegExp(uniqueText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    console.log(`\n=== DUPLICATION CHECK ===`);
    console.log(`Original text "${uniqueText}" appears ${originalTextCount} times`);
    
    // This should be 1 if no duplication
    expect(originalTextCount).toBe(1);

    // Check if database content matches editor content
    if (dbState5.exists && dbState5.content) {
      const dbTextCount = (dbState5.content.match(new RegExp(uniqueText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      console.log(`Database content has ${dbTextCount} occurrences of original text`);
      
      // Database should also have only 1 occurrence
      expect(dbTextCount).toBe(1);
    }
  });

  test('Compare single-user vs multi-user database behavior', async ({ page, browser }) => {
    const docId = 'compare-users-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    console.log('=== PHASE 1: SINGLE USER TEST ===');
    
    // Single user test
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);

    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'SINGLE USER CONTENT');
    
    await page.waitForTimeout(3000); // Auto-save
    
    // Check database state after single user
    let singleUserDbState = await checkDatabaseState(docId);
    console.log('Single user DB state:', singleUserDbState);
    
    // Refresh and check for duplication
    await page.reload();
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);
    
    const singleUserContent = await page.locator('.tiptap').textContent();
    const singleUserDuplication = (singleUserContent.match(/SINGLE USER CONTENT/g) || []).length;
    console.log(`Single user - content appears ${singleUserDuplication} times`);
    console.log('Single user final content:', singleUserContent);

    console.log('\n=== PHASE 2: MULTI USER TEST ===');
    
    // Multi-user test - open second browser
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    
    // Both users join
    await page2.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page2);
    await page2.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);
    await page2.waitForTimeout(2000);
    
    // User 1 adds content
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'MULTI USER CONTENT FROM USER1');
    
    // Wait for sync
    await page.waitForTimeout(2000);
    await page2.waitForTimeout(2000);
    
    // User 2 adds content
    await page2.click('.tiptap');
    await page2.keyboard.press('End');
    await page2.type('.tiptap', ' AND USER2');
    
    // Wait for auto-save
    await page.waitForTimeout(3000);
    await page2.waitForTimeout(3000);
    
    // Check database state after multi-user
    let multiUserDbState = await checkDatabaseState(docId);
    console.log('Multi user DB state:', multiUserDbState);
    
    // Refresh both pages
    await page.reload();
    await page2.reload();
    await handleUserNameOverlay(page);
    await handleUserNameOverlay(page2);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page2.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);
    await page2.waitForTimeout(3000);
    
    const multiUser1Content = await page.locator('.tiptap').textContent();
    const multiUser2Content = await page2.locator('.tiptap').textContent();
    
    const multiUser1Duplication = (multiUser1Content.match(/MULTI USER CONTENT FROM USER1/g) || []).length;
    const multiUser2Duplication = (multiUser2Content.match(/MULTI USER CONTENT FROM USER1/g) || []).length;
    
    console.log(`Multi user - User 1 content appears ${multiUser1Duplication} times`);
    console.log(`Multi user - User 2 content appears ${multiUser2Duplication} times`);
    console.log('Multi user final content (User 1):', multiUser1Content);
    console.log('Multi user final content (User 2):', multiUser2Content);

    console.log('\n=== COMPARISON ANALYSIS ===');
    console.log('Single user duplication count:', singleUserDuplication);
    console.log('Multi user duplication count (User 1):', multiUser1Duplication);
    console.log('Multi user duplication count (User 2):', multiUser2Duplication);
    
    // If user's hypothesis is correct, single user should have duplication but multi-user should not
    console.log('Single user DB content length:', singleUserDbState.contentLength);
    console.log('Multi user DB content length:', multiUserDbState.contentLength);
    
    await context2.close();
    
    // For now, expect both to work correctly (when bug is fixed)
    expect(singleUserDuplication).toBe(1);
    expect(multiUser1Duplication).toBe(1);
    expect(multiUser2Duplication).toBe(1);
  });

  test('Examine yjsState binary data storage patterns', async ({ page }) => {
    const docId = 'yjs-state-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Helper to get detailed database info including binary data
    async function getDetailedDbState(docId) {
      try {
        const response = await fetch(`http://localhost:3001/api/notes/${docId}`);
        if (response.ok) {
          const data = await response.json();
          return {
            exists: true,
            content: data.content,
            contentLength: data.content ? data.content.length : 0,
            yjsStateExists: !!data.yjsState,
            yjsStateLength: data.yjsState ? data.yjsState.length : 0,
            yjsStateType: data.yjsState ? typeof data.yjsState : 'undefined',
            updatedAt: data.updatedAt,
            createdAt: data.createdAt
          };
        }
        return { exists: false };
      } catch (error) {
        return { exists: false, error: error.message };
      }
    }

    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Check initial state
    let state1 = await getDetailedDbState(docId);
    console.log('Initial YJS state:', state1);

    // Add content and track YJS state changes
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'Testing YJS state storage');

    await page.waitForTimeout(3000); // Auto-save
    let state2 = await getDetailedDbState(docId);
    console.log('After first save YJS state:', state2);

    // Add more content
    await page.type('.tiptap', ' - More content added');
    await page.waitForTimeout(3000); // Auto-save
    let state3 = await getDetailedDbState(docId);
    console.log('After second save YJS state:', state3);

    // Refresh and observe state
    await page.reload();
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);

    let state4 = await getDetailedDbState(docId);
    console.log('After reload YJS state:', state4);

    const finalContent = await page.locator('.tiptap').textContent();
    console.log('Final editor content:', finalContent);

    // Analysis
    console.log('\n=== YJS STATE ANALYSIS ===');
    console.log('1. Initial YJS state exists:', state1.yjsStateExists, 'Length:', state1.yjsStateLength);
    console.log('2. After first save YJS state exists:', state2.yjsStateExists, 'Length:', state2.yjsStateLength);
    console.log('3. After second save YJS state exists:', state3.yjsStateExists, 'Length:', state3.yjsStateLength);
    console.log('4. After reload YJS state exists:', state4.yjsStateExists, 'Length:', state4.yjsStateLength);

    // Check content duplication
    const duplicateCount = (finalContent.match(/Testing YJS state storage/g) || []).length;
    console.log('Content duplication count:', duplicateCount);

    expect(duplicateCount).toBe(1);
  });
});