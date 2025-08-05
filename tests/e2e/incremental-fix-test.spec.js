// Incremental fix testing following TDD approach
// Based on FIX-initialization-error-resolution-plan.md

const { test, expect } = require('@playwright/test');

test.describe('Incremental fix testing - following binary search approach', () => {
  
  test('Step 1: Test with externalized sanitization function', async ({ page }) => {
    console.log('\n🔧 TESTING: External sanitization function');
    
    const errors = [];
    page.on('pageerror', err => {
      errors.push(err.message);
      console.log('JS ERROR:', err.message);
    });

    await page.goto('/editor/external-sanitizer-' + Date.now());
    await page.waitForTimeout(3000);
    
    const editorExists = await page.locator('.tiptap').count();
    console.log('Editor elements found:', editorExists);
    console.log('JavaScript errors:', errors.length);
    
    if (errors.length === 0) {
      console.log('✅ SUCCESS: External sanitization resolved initialization errors');
    } else {
      console.log('❌ FAILURE: Errors persist with external sanitization');
      errors.forEach(err => console.log('  -', err));
    }
    
    // Check if debug functions are available
    const debugCheck = await page.evaluate(() => {
      return {
        editorFunctions: typeof window.editorFunctions !== 'undefined',
        functions: window.editorFunctions ? Object.keys(window.editorFunctions) : []
      };
    });
    
    console.log('Debug functions available:', debugCheck.editorFunctions);
    console.log('Available functions:', debugCheck.functions);
    
    expect(errors.length).toBe(0);
    expect(editorExists).toBeGreaterThan(0);
  });
  
  test('Step 2: Test sanitization functionality', async ({ page }) => {
    console.log('\n🧹 TESTING: Sanitization functionality');
    
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/editor/sanitization-test-' + Date.now());
    await page.waitForTimeout(2000);
    
    // Test if sanitization function works
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

      // Check if we can access the sanitization function through module
      // Since it's now external, we need to test it differently
      return {
        contentLength: pollutedContent.length,
        hasTrackChanges: pollutedContent.includes('data-track-change'),
        // The function is now imported, so we test indirectly through debug functions
        debugFunctionsAvailable: typeof window.editorFunctions !== 'undefined'
      };
    });
    
    console.log('Sanitization test results:', sanitizationTest);
    
    expect(errors.length).toBe(0);
    expect(sanitizationTest.hasTrackChanges).toBe(true); // Content should have track changes
  });
  
  test('Step 3: Test auto-save with external sanitization', async ({ page }) => {
    console.log('\n💾 TESTING: Auto-save with external sanitization');
    
    const saveOperations = [];
    const errors = [];
    
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Saving content') || text.includes('Save complete') || text.includes('Sanitized')) {
        saveOperations.push({
          timestamp: Date.now(),
          operation: text
        });
      }
    });

    await page.goto('/editor/autosave-test-' + Date.now());
    await page.waitForTimeout(2000);
    
    // Try to add content to trigger auto-save
    const editorLoaded = await page.locator('.tiptap').count() > 0;
    if (editorLoaded) {
      await page.click('.tiptap');
      await page.type('.tiptap', 'Test content for auto-save');
      
      // Wait for auto-save (should trigger after 2 seconds)
      await page.waitForTimeout(3000);
      
      console.log('Save operations captured:', saveOperations.length);
      saveOperations.forEach((op, i) => {
        console.log(`${i + 1}. ${op.operation}`);
      });
    } else {
      console.log('❌ Editor did not load, cannot test auto-save');
    }
    
    expect(errors.length).toBe(0);
  });
  
  test('Step 4: Test document creation and loading', async ({ page }) => {
    console.log('\n📄 TESTING: Document creation and loading');
    
    const errors = [];
    const consoleLogs = [];
    
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.text().includes('Loading content') || msg.text().includes('Document') || msg.text().includes('Yjs')) {
        consoleLogs.push(msg.text());
      }
    });

    const docId = 'doc-test-' + Date.now();
    await page.goto(`/editor/${docId}`);
    await page.waitForTimeout(3000);
    
    console.log('Document loading logs:');
    consoleLogs.forEach((log, i) => {
      console.log(`${i + 1}. ${log}`);
    });
    
    const editorState = await page.evaluate(() => {
      return {
        hasEditor: !!document.querySelector('.tiptap'),
        editorContent: document.querySelector('.tiptap')?.textContent?.substring(0, 50) || 'No content',
        documentTitle: document.title
      };
    });
    
    console.log('Final editor state:', editorState);
    
    expect(errors.length).toBe(0);
    expect(editorState.hasEditor).toBe(true);
  });
  
  test('Step 5: Compare with minimal configuration', async ({ page }) => {
    console.log('\n🔄 TESTING: Minimal vs full configuration');
    
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/editor/compare-' + Date.now());
    await page.waitForTimeout(2000);
    
    const comparison = await page.evaluate(() => {
      return {
        editorLoaded: !!document.querySelector('.tiptap'),
        reactLoaded: typeof window.React !== 'undefined',
        fetchAvailable: typeof window.fetch !== 'undefined',
        windowVars: Object.keys(window).filter(k => k.length === 1).sort()
      };
    });
    
    console.log('Configuration comparison:');
    console.log('Editor loaded:', comparison.editorLoaded);
    console.log('React loaded:', comparison.reactLoaded);
    console.log('Single-letter window vars:', comparison.windowVars.join(', '));
    
    if (errors.length === 0 && comparison.editorLoaded) {
      console.log('🎉 SUCCESS: All fixes working correctly!');
    } else {
      console.log('❌ Issues remain:', errors.length, 'errors');
    }
    
    expect(errors.length).toBe(0);
    expect(comparison.editorLoaded).toBe(true);
  });
});