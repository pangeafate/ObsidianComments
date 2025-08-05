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
        contentLength: data.content ? data.content.length : 0,
        hasTrackChanges: data.content ? data.content.includes('data-track-change') : false
      };
    }
    return { exists: false };
  } catch (error) {
    return { exists: false, error: error.message };
  }
}

test.describe('Comprehensive Duplication Fix - Following Implementation Guide', () => {
  
  test('TDD: Reproduce duplication issue with detailed logging', async ({ page }) => {
    const docId = 'tdd-repro-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Capture ALL console logs for analysis
    const consoleLogs = [];
    const saveOperations = [];
    const contentChanges = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push({
        timestamp: Date.now(),
        type: msg.type(),
        text: text
      });
      
      // Track save operations
      if (text.includes('Saving content') || text.includes('Save complete') || text.includes('Save failed')) {
        saveOperations.push({
          timestamp: Date.now(),
          operation: text
        });
      }
      
      // Track content changes
      if (text.includes('originalLength') || text.includes('cleanLength') || text.includes('Sanitized')) {
        contentChanges.push({
          timestamp: Date.now(),
          change: text
        });
      }
      
      console.log(`[${msg.type().toUpperCase()}] ${text}`);
    });

    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for initial setup

    // Check if debugging functions are available
    const debugFunctionsAvailable = await page.evaluate(() => {
      return {
        editorFunctions: typeof window.editorFunctions !== 'undefined',
        stripTrackChangesMarkup: typeof window.stripTrackChangesMarkup !== 'undefined',
        editorMethods: window.editorFunctions ? Object.keys(window.editorFunctions) : []
      };
    });
    console.log('Debug functions available:', debugFunctionsAvailable);

    // Phase 1: Clear and add initial content
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    
    const testText = 'TDD Test Content - Should Not Duplicate';
    await page.type('.tiptap', testText);
    console.log('Phase 1: Typed initial content');

    // Get initial content state
    const initialContent = await page.locator('.tiptap').textContent();
    console.log('Initial editor content:', initialContent);

    // Phase 2: Wait for auto-save
    console.log('Phase 2: Waiting for auto-save (3 seconds)...');
    await page.waitForTimeout(3500);

    // Check database state after first save
    const dbState1 = await checkDatabaseContent(docId);
    console.log('Database state after first save:', dbState1);

    // Get editor content after save
    const contentAfterSave = await page.locator('.tiptap').textContent();
    console.log('Editor content after save:', contentAfterSave);

    // Phase 3: Add more content
    await page.type('.tiptap', ' - Additional text');
    console.log('Phase 3: Added additional content');

    // Phase 4: Wait for second auto-save
    console.log('Phase 4: Waiting for second auto-save...');
    await page.waitForTimeout(3500);

    // Check database state after second save
    const dbState2 = await checkDatabaseContent(docId);
    console.log('Database state after second save:', dbState2);

    // Phase 5: CRITICAL TEST - Refresh page
    console.log('Phase 5: REFRESHING PAGE TO TEST DUPLICATION');
    await page.reload();
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for content loading

    // Get content after refresh
    const contentAfterRefresh = await page.locator('.tiptap').textContent();
    console.log('Content after refresh:', contentAfterRefresh);

    // Phase 6: Wait for potential auto-save after refresh
    console.log('Phase 6: Waiting for post-refresh auto-save...');
    await page.waitForTimeout(3500);

    // Check final database state
    const dbState3 = await checkDatabaseContent(docId);
    console.log('Final database state:', dbState3);

    // Phase 7: Second refresh to test compound duplication
    console.log('Phase 7: SECOND REFRESH TO TEST COMPOUND DUPLICATION');
    await page.reload();
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const finalContent = await page.locator('.tiptap').textContent();
    console.log('Final content after second refresh:', finalContent);

    // Analysis
    console.log('\n=== ANALYSIS ===');
    
    // Count occurrences of test text
    const testTextCount = (finalContent.match(/TDD Test Content - Should Not Duplicate/g) || []).length;
    const additionalTextCount = (finalContent.match(/Additional text/g) || []).length;
    
    console.log('Test text occurrences:', testTextCount);
    console.log('Additional text occurrences:', additionalTextCount);
    
    // Database analysis
    console.log('\nDatabase progression:');
    console.log('After first save:', dbState1.contentLength, 'chars, hasTrackChanges:', dbState1.hasTrackChanges);
    console.log('After second save:', dbState2.contentLength, 'chars, hasTrackChanges:', dbState2.hasTrackChanges);
    console.log('After refresh cycles:', dbState3.contentLength, 'chars, hasTrackChanges:', dbState3.hasTrackChanges);

    // Console log analysis
    console.log('\nConsole log analysis:');
    console.log('Total console messages:', consoleLogs.length);
    console.log('Save operations:', saveOperations.length);
    console.log('Content changes:', contentChanges.length);

    const sanitizationLogs = consoleLogs.filter(log => 
      log.text.includes('Sanitizing') || log.text.includes('Sanitized') || log.text.includes('stripTrackChangesMarkup')
    );
    console.log('Sanitization operations:', sanitizationLogs.length);

    const trackChangesLogs = consoleLogs.filter(log => 
      log.text.includes('data-track-change') || log.text.includes('hasTrackChanges')
    );
    console.log('Track changes related logs:', trackChangesLogs.length);

    // Print recent save operations
    console.log('\nRecent save operations:');
    saveOperations.slice(-5).forEach((op, i) => {
      console.log(`${i + 1}. ${op.operation}`);
    });

    // Print recent content changes
    console.log('\nRecent content changes:');
    contentChanges.slice(-5).forEach((change, i) => {
      console.log(`${i + 1}. ${change.change}`);
    });
    
    // This test is designed to FAIL initially to confirm we can reproduce the issue
    // It should pass after implementing the fix
    if (testTextCount === 1 && additionalTextCount === 1 && !dbState3.hasTrackChanges) {
      console.log('✅ SUCCESS: No duplication detected');
    } else {
      console.log('❌ DUPLICATION DETECTED - This confirms the issue exists');
      console.log(`Expected: 1 occurrence each, got: ${testTextCount} and ${additionalTextCount}`);
      console.log(`Database has track changes: ${dbState3.hasTrackChanges}`);
    }

    // For TDD, we expect this to fail initially
    // The test validates our fix is working when it passes
    expect(testTextCount).toBe(1);
    expect(additionalTextCount).toBe(1);
    expect(dbState3.hasTrackChanges).toBe(false);
  });

  test('TDD: Validate sanitization function works correctly', async ({ page }) => {
    const docId = 'sanitization-test-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(2000);

    // Test the sanitization function directly in browser
    const sanitizationTest = await page.evaluate(() => {
      // Test content with track changes markup
      const pollutedContent = `
        <h1>Test Title</h1>
        <p>Start typing here...
        <span data-user-id="TestUser123" 
              data-user-name="Test User" 
              data-timestamp="1754376273557" 
              data-track-change="true" 
              title="Added by Test User" 
              style="background-color: hsl(132, 60%, 85%);">
          This is test content
        </span>
        </p>
      `;

      // Check if sanitization function exists
      if (typeof window.editorFunctions?.stripTrackChangesMarkup === 'function') {
        const cleaned = window.editorFunctions.stripTrackChangesMarkup(pollutedContent);
        
        return {
          functionExists: true,
          originalLength: pollutedContent.length,
          cleanedLength: cleaned.length,
          originalHasTrackChanges: pollutedContent.includes('data-track-change'),
          cleanedHasTrackChanges: cleaned.includes('data-track-change'),
          cleanedContent: cleaned,
          reductionPercentage: ((pollutedContent.length - cleaned.length) / pollutedContent.length * 100).toFixed(2)
        };
      } else {
        return {
          functionExists: false,
          availableFunctions: window.editorFunctions ? Object.keys(window.editorFunctions) : [],
          windowFunctions: Object.keys(window).filter(key => key.includes('editor') || key.includes('strip'))
        };
      }
    });

    console.log('Sanitization test results:', sanitizationTest);

    if (sanitizationTest.functionExists) {
      expect(sanitizationTest.cleanedHasTrackChanges).toBe(false);
      expect(sanitizationTest.cleanedLength).toBeLessThan(sanitizationTest.originalLength);
      expect(sanitizationTest.cleanedContent).toContain('This is test content');
      expect(sanitizationTest.cleanedContent).not.toContain('data-track-change');
    } else {
      console.log('❌ Sanitization function not available - implementation needed');
      // This should fail initially, prompting implementation
      expect(sanitizationTest.functionExists).toBe(true);
    }
  });

  test('TDD: Test content initialization priority (Yjs vs API)', async ({ page }) => {
    const docId = 'init-priority-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Monitor initialization sequence
    const initLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Yjs') || text.includes('API content') || text.includes('Loading content') || text.includes('initialization')) {
        initLogs.push({
          timestamp: Date.now(),
          message: text
        });
        console.log('INIT:', text);
      }
    });

    await page.goto(`/editor/${docId}`);
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Type some content and save
    await page.click('.tiptap');
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Delete');
    await page.type('.tiptap', 'Priority test content');
    
    // Wait for save
    await page.waitForTimeout(3000);

    // Refresh to test initialization
    await page.reload();
    await handleUserNameOverlay(page);
    await page.waitForSelector('.tiptap', { timeout: 10000 });
    await page.waitForTimeout(3000);

    const finalContent = await page.locator('.tiptap').textContent();
    
    console.log('\n=== INITIALIZATION ANALYSIS ===');
    console.log('Initialization logs:', initLogs.length);
    initLogs.forEach((log, i) => {
      console.log(`${i + 1}. ${log.message}`);
    });
    
    console.log('Final content:', finalContent);
    
    // Check for proper initialization (no duplication from double loading)
    const contentCount = (finalContent.match(/Priority test content/g) || []).length;
    console.log('Content occurrence count:', contentCount);
    
    expect(contentCount).toBe(1);
  });
});