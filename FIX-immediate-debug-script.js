// Run this test immediately to get detailed error information
// Save as: tests/e2e/debug-initialization-error.spec.js

import { test, expect } from '@playwright/test';

test('Debug initialization error with full details', async ({ page }) => {
  console.log('\n🔍 DEBUGGING INITIALIZATION ERROR\n');
  
  // Capture ALL errors and logs
  const errors = [];
  const consoleLogs = [];
  const networkErrors = [];
  
  page.on('pageerror', err => {
    errors.push({
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleLogs.push({
        type: 'error',
        text: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  page.on('response', response => {
    if (!response.ok() && response.status() !== 304) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });
  
  // Navigate to editor
  console.log('Loading editor...');
  const testId = 'debug-' + Date.now();
  
  try {
    await page.goto(`http://localhost:3001/editor/${testId}`, {
      waitUntil: 'networkidle',
      timeout: 15000
    });
  } catch (e) {
    console.log('Navigation error:', e.message);
  }
  
  // Wait a bit for all errors to be captured
  await page.waitForTimeout(2000);
  
  // Check what scripts loaded
  const scriptInfo = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    return {
      total: scripts.length,
      sources: scripts.map(s => ({
        src: s.src || 'inline',
        async: s.async,
        defer: s.defer,
        type: s.type || 'text/javascript'
      })),
      // Try to find the problematic variable
      windowKeys: Object.keys(window).filter(k => k.length === 1).sort()
    };
  });
  
  // Try to get the actual bundled JS content around the error
  const bundleInfo = await page.evaluate(() => {
    const mainScript = document.querySelector('script[src*="index"]');
    return {
      mainScriptSrc: mainScript?.src,
      bodyClasses: document.body.className,
      documentReadyState: document.readyState
    };
  });
  
  // Print comprehensive report
  console.log('\n=== ERROR REPORT ===\n');
  
  console.log('Page Errors:', errors.length);
  errors.forEach((err, i) => {
    console.log(`\nError ${i + 1}:`);
    console.log('Message:', err.message);
    console.log('Stack trace preview:');
    const stackLines = err.stack?.split('\n') || [];
    stackLines.slice(0, 5).forEach(line => console.log('  ', line));
  });
  
  console.log('\n\nConsole Errors:', consoleLogs.length);
  consoleLogs.forEach((log, i) => {
    console.log(`\nConsole Error ${i + 1}:`);
    console.log('Text:', log.text);
    console.log('Location:', log.location);
  });
  
  console.log('\n\nNetwork Errors:', networkErrors.length);
  networkErrors.forEach(err => {
    console.log(`- ${err.status} ${err.statusText}: ${err.url}`);
  });
  
  console.log('\n\nScript Information:');
  console.log('Total scripts:', scriptInfo.total);
  console.log('Single-letter window variables:', scriptInfo.windowKeys.join(', '));
  
  console.log('\n\nBundle Information:');
  console.log('Main script:', bundleInfo.mainScriptSrc);
  console.log('Document ready state:', bundleInfo.documentReadyState);
  
  // Try to identify which specific code is failing
  if (errors.length > 0 && errors[0].message.includes('Cannot access')) {
    const variable = errors[0].message.match(/Cannot access '(\w+)'/)?.[1];
    console.log(`\n\n⚠️  PROBLEMATIC VARIABLE: '${variable}'`);
    
    if (variable === 'B') {
      console.log('\nLikely causes for "B" error:');
      console.log('1. Minified documentService has circular dependency');
      console.log('2. Import order issue in the bundled code');
      console.log('3. Webpack/Vite hoisting problem with class methods');
      
      console.log('\nRecommended fix:');
      console.log('1. Move documentService methods to separate file');
      console.log('2. Or use default exports instead of named exports');
      console.log('3. Or disable minification temporarily');
    }
  }
  
  // Check if editor ever initializes
  const editorState = await page.evaluate(() => {
    return {
      editorElement: !!document.querySelector('.ProseMirror'),
      tiptapElement: !!document.querySelector('.tiptap'),
      contentEditable: !!document.querySelector('[contenteditable="true"]'),
      // Check if our debug functions loaded
      hasEditorFunctions: typeof (window as any).editorFunctions !== 'undefined',
      // Check if React loaded
      hasReact: typeof (window as any).React !== 'undefined',
      // Check document service
      fetchDefined: typeof window.fetch !== 'undefined'
    };
  });
  
  console.log('\n\nEditor State:');
  Object.entries(editorState).forEach(([key, value]) => {
    console.log(`${key}: ${value}`);
  });
  
  // Save a screenshot for visual debugging
  await page.screenshot({ 
    path: `test-results/init-error-${testId}.png`,
    fullPage: true 
  });
  console.log(`\n📸 Screenshot saved to: test-results/init-error-${testId}.png`);
  
  // Final check
  expect(errors.length).toBe(0);
});

// Also run a comparison test with minimal modifications
test('Compare with minimal Editor.tsx', async ({ page }) => {
  console.log('\n🔄 TESTING MINIMAL CONFIGURATION\n');
  
  // This helps identify if the error is in Editor.tsx or elsewhere
  // You'll need to temporarily comment out most of Editor.tsx 
  // Keep only the basic editor setup without:
  // - stripTrackChangesMarkup
  // - auto-save logic  
  // - document loading logic
  
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('/editor/minimal-' + Date.now());
  await page.waitForTimeout(2000);
  
  console.log('Errors with minimal config:', errors.length);
  errors.forEach(err => console.log('-', err));
  
  const hasEditor = await page.evaluate(() => !!document.querySelector('.ProseMirror'));
  console.log('Editor loaded:', hasEditor);
});

// Test to identify the exact line causing issues
test('Binary search for error source', async ({ page }) => {
  console.log('\n🔎 BINARY SEARCH FOR ERROR SOURCE\n');
  
  // Instructions for manual binary search:
  console.log('Manual steps to isolate the error:');
  console.log('1. Comment out the bottom half of Editor.tsx');
  console.log('2. Build and test - if error persists, problem is in top half');
  console.log('3. Uncomment and comment out top half instead');
  console.log('4. Repeat, narrowing down to the exact function/line');
  console.log('5. Common culprits:');
  console.log('   - Import statements (circular dependencies)');
  console.log('   - Class instantiations');
  console.log('   - Function calls at module level');
  console.log('   - Regex with $ replacements');
});